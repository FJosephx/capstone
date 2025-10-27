from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

# Variable global (se guarda el último comando enviado por el operador)
LAST_COMMAND = {"command": ""}

@csrf_exempt
def set_command(request):
    """
    Recibe un comando desde el teléfono A (operador)
    Ejemplo:
      POST /api/v1/set_command/
      Body: { "command": "1" }
    """
    global LAST_COMMAND
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            comando = data.get("command", "")
            LAST_COMMAND["command"] = comando
            print(f"✅ Comando recibido del operador: {comando}")
            return JsonResponse({"status": "ok", "command": comando})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Método no permitido"}, status=405)


def get_command(request):
    """
    Devuelve el último comando guardado (para el teléfono B / robot)
    Ejemplo:
      GET /api/v1/get_command/
      Respuesta: { "command": "1" }
    """
    global LAST_COMMAND
    return JsonResponse(LAST_COMMAND)
