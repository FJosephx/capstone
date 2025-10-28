#### Cambios Tras python-socketio

La forma de arrancar el backend ahora es desde la ruta ruta avatar-gamer/backend/ con el comando:

- uvicorn config.asgi:application --host 0.0.0.0 --port 8000
- El host 0.0.0.0 puerto 8000 es para que permita cualquier conexión desde un dispositivo local. En este caso, es útil porque estoy haciendo pruebas con mi celular Android.