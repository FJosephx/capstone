from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from apps.accounts.models import Role


class ChatMessage(models.Model):
    """
    Persist a message exchanged between two participants so the conversation
    history can be restored when new sockets join the room.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation_id = models.CharField(max_length=255, db_index=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='outgoing_chat_messages',
        on_delete=models.CASCADE,
    )
    sender_role = models.CharField(max_length=16, choices=Role.choices)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='incoming_chat_messages',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    text = models.TextField()
    client_message_id = models.CharField(max_length=128, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation_id', 'created_at']),
        ]

    def __str__(self) -> str:
        return f'{self.conversation_id} :: {self.sender_id} -> {self.recipient_id}'
