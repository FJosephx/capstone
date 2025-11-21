from django.urls import path
from . import views

urlpatterns = [
    path('set_command/', views.set_command, name='set_command'),
    path('get_command/', views.get_command, name='get_command'),
]
