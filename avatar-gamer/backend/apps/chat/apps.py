from django.apps import AppConfig


class ChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.chat'

    def ready(self) -> None:  # pragma: no cover - import side effects
        # Import socket handlers when Django starts so events are registered.
        from . import sockets  # noqa: F401
