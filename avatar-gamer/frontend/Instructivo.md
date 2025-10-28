#### Ejecucion frontend

La forma de arrancar el frontend tiene varias opciones, desde la ruta desde la ruta ruta avatar-gamer/frontend/avatargamer-app/:

Ejecutamos los siguientes comandos:
- ionic build            # o: ionic build --configuration=production
- npx cap copy android
- npx cap sync android
- adb reverse --remove-all
- adb reverse tcp:8100 tcp:8100 (para trabajar con el puerto 8100 en las opciones 1 y 2)
- adb reverse tcp:8000 tcp:8000 (para que reconozca el puerto 8000 del backend)

opcion 1
- npx ionic cap run android -l --external --host=192.168.1.X(ipv4) --port=8100 
Actualmente utilizando esta para ver los cambios con live reload en mi Android.

opcion 2
- npx ionic cap run android -l --host=localhost --port=8100 opcion2

opcion 3
- npx ionic serve (para trabajar viendo los cambios en el navegador web)