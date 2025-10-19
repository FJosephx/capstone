import os

from django.core.asgi import get_asgi_application
from socketio import ASGIApp

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

# Import after Django is ready so the ORM can be used inside socket handlers.
from apps.chat.sockets import sio  # noqa: E402

application = ASGIApp(sio, django_asgi_app)
