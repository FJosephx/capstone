from django.apps import AppConfig

class ControlConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.control'  # 👈 esta línea es clave
