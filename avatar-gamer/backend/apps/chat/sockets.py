from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import parse_qs

import socketio
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken, TokenError

from apps.accounts.models import Profile, Role
from .models import ChatMessage

logger = logging.getLogger(__name__)

User = get_user_model()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
jwt_auth = JWTAuthentication()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _participant_key(participant: Dict[str, Any]) -> Optional[str]:
    try:
        identifier = participant.get('id')
        role = participant.get('role')
    except AttributeError:
        return None

    if identifier is None or role not in {'admin', 'operator', 'user'}:
        return None

    return f'{role}-{identifier}'


def _build_conversation_id(participants: Iterable[Dict[str, Any]]) -> Optional[str]:
    keys = [_participant_key(item) for item in participants]
    filtered = [key for key in keys if key]

    if len(filtered) < 2:
        return None

    filtered.sort()
    return f'conversation:{filtered[0]}:{filtered[1]}'


def _serialize_message(message: ChatMessage) -> Dict[str, Any]:
    return {
        'id': str(message.id),
        'clientMessageId': message.client_message_id or None,
        'conversationId': message.conversation_id,
        'text': message.text,
        'senderId': message.sender_id,
        'senderRole': message.sender_role,
        'recipientId': message.recipient_id,
        'timestamp': message.created_at.isoformat(),
    }


async def _set_user_online(user_id: int, online: bool) -> None:
    def _update() -> None:
        profile, _ = Profile.objects.get_or_create(
            user_id=user_id,
            defaults={'role': Role.USER, 'bio': ''},
        )
        if profile.is_online != online:
            profile.is_online = online
            profile.save(update_fields=['is_online'])

    await sync_to_async(_update)()


async def _fetch_user(user_id: int) -> Optional[User]:
    try:
        return await sync_to_async(User.objects.select_related('profile').get)(id=user_id)
    except User.DoesNotExist:
        return None


async def _ensure_recipient(user_id: Optional[int]) -> Optional[User]:
    if user_id is None:
        return None
    return await _fetch_user(user_id)


async def _ensure_profile(user: User) -> Optional[Profile]:
    def _get() -> Profile:
        profile, _ = Profile.objects.get_or_create(
            user=user,
            defaults={'role': Role.USER, 'bio': ''},
        )
        return profile

    try:
        return await sync_to_async(_get)()
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.warning('Unable to ensure profile for user %s: %s', user.id, exc)
        return None


async def _store_message(
    *,
    conversation_id: str,
    sender_id: int,
    sender_role: str,
    recipient_id: Optional[int],
    text: str,
    client_message_id: Optional[str],
) -> ChatMessage:
    def _create() -> ChatMessage:
        return ChatMessage.objects.create(
            conversation_id=conversation_id,
            sender_id=sender_id,
            sender_role=sender_role,
            recipient_id=recipient_id,
            text=text,
            client_message_id=client_message_id or None,
        )

    return await sync_to_async(_create)()


async def _load_history(conversation_id: str, limit: int = 200) -> List[Dict[str, Any]]:
    def _query() -> List[Dict[str, Any]]:
        qs: QuerySet[ChatMessage] = ChatMessage.objects.filter(
            conversation_id=conversation_id
        ).order_by('created_at')[:limit]
        return [_serialize_message(message) for message in qs]

    return await sync_to_async(_query)()


async def _resolve_user_from_token(token: str) -> Tuple[int, str]:
    validated = jwt_auth.get_validated_token(token)
    user = await sync_to_async(jwt_auth.get_user)(validated)
    profile = await _ensure_profile(user)
    role = profile.role if profile else Role.USER
    return user.id, role


def _extract_token(auth_payload: Any, environ: Dict[str, Any]) -> Optional[str]:
    if isinstance(auth_payload, dict):
        token = auth_payload.get('token')
        if token:
            return token

    headers = environ.get('headers') or []
    for header_key, header_value in headers:
        key = header_key.decode() if isinstance(header_key, bytes) else header_key
        if key.lower() == 'authorization':
            value = header_value.decode() if isinstance(header_value, bytes) else header_value
            if value.lower().startswith('bearer '):
                return value[7:]

    return None


def _extract_query_params(environ: Dict[str, Any]) -> Dict[str, Any]:
    query_string = environ.get('QUERY_STRING') or ''
    parsed = parse_qs(query_string)
    return {key: values[0] if values else None for key, values in parsed.items()}


# ---------------------------------------------------------------------------
# Socket.IO event handlers
# ---------------------------------------------------------------------------


@sio.event
async def connect(sid: str, environ: Dict[str, Any], auth: Any) -> bool:
    token = _extract_token(auth, environ)
    if not token:
        logger.warning('Socket connection rejected: missing auth token.')
        return False

    try:
        user_id, role = await _resolve_user_from_token(token)
    except (AuthenticationFailed, InvalidToken, TokenError) as exc:
        logger.warning('Socket connection rejected: invalid token. %s', exc)
        return False

    query_params = _extract_query_params(environ)
    requested_user_id = query_params.get('userId')
    requested_role = query_params.get('role')

    if requested_user_id and str(requested_user_id) != str(user_id):
        logger.warning(
            'Socket connection rejected: token user %s mismatches query user %s.',
            user_id,
            requested_user_id,
        )
        return False

    if requested_role and requested_role != role:
        logger.info(
            'Socket connect role mismatch; using profile role %s instead of requested %s.',
            role,
            requested_role,
        )

    await sio.save_session(sid, {'user_id': user_id, 'user_role': role})
    await _set_user_online(user_id, True)

    logger.debug('Socket connected: sid=%s user=%s role=%s', sid, user_id, role)
    return True


@sio.event
async def disconnect(sid: str) -> None:
    session = await sio.get_session(sid)
    user_id = session.get('user_id')
    if user_id:
        await _set_user_online(user_id, False)
    logger.debug('Socket disconnected: sid=%s user=%s', sid, user_id)


@sio.on('chat:join')
async def chat_join(sid: str, payload: Dict[str, Any]) -> None:
    session = await sio.get_session(sid)
    user_id = session.get('user_id')
    if not user_id:
        logger.warning('chat:join ignored because session has no user.')
        return

    conversation_id = payload.get('conversationId')
    if not conversation_id:
        conversation_id = _build_conversation_id(payload.get('participants') or [])
    if not conversation_id:
        logger.warning('chat:join ignored due to missing conversation id. payload=%s', payload)
        return

    await sio.enter_room(sid, conversation_id)
    history = await _load_history(conversation_id)
    await sio.emit('chat:history', history, to=sid)
    logger.debug('User %s joined conversation %s', user_id, conversation_id)


@sio.on('chat:leave')
async def chat_leave(sid: str, payload: Dict[str, Any]) -> None:
    conversation_id = payload.get('conversationId')
    if conversation_id:
        await sio.leave_room(sid, conversation_id)
        logger.debug('Socket %s left conversation %s', sid, conversation_id)


@sio.on('chat:message')
async def chat_message(sid: str, payload: Dict[str, Any]) -> None:
    session = await sio.get_session(sid)
    user_id = session.get('user_id')
    sender_role = session.get('user_role', Role.USER)

    if not user_id:
        logger.warning('chat:message ignored because session has no user.')
        return

    text = (payload.get('text') or '').strip()
    if not text:
        logger.debug('chat:message ignored because text is empty.')
        return

    conversation_id = payload.get('conversationId')
    if not conversation_id:
        participants = payload.get('participants') or []
        conversation_id = _build_conversation_id(participants)
    if not conversation_id:
        logger.warning('chat:message ignored: missing conversation id. payload=%s', payload)
        return

    recipient_id = payload.get('recipientId')
    recipient = await _ensure_recipient(recipient_id)
    if recipient_id and not recipient:
        logger.warning('chat:message recipient %s not found; continuing without link.', recipient_id)
        recipient_id = None

    message = await _store_message(
        conversation_id=conversation_id,
        sender_id=user_id,
        sender_role=sender_role,
        recipient_id=recipient_id,
        text=text,
        client_message_id=payload.get('clientMessageId'),
    )

    serialized = _serialize_message(message)
    await sio.emit('chat:message', serialized, room=conversation_id)
    logger.debug('Stored chat message %s in %s from user %s', message.id, conversation_id, user_id)
