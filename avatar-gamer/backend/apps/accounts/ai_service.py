import requests
import json
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Configuración de la API de Literatus
API_URL = 'https://www.triskeledu.cl/litserver/literatus/api/'

# Mapeo de longitudes de respuesta
RESPONSE_LENGTH_MAP = {
    'very_brief': 'USER_CHAT_TEXT_VERY_BRIEF',
    'brief': 'USER_CHAT_TEXT_BRIEF',
    'normal': 'USER_CHAT_TEXT_NORMAL',
    'complete': 'USER_CHAT_TEXT_COMPLETE',
    'very_complete': 'USER_CHAT_TEXT_VERY_COMPLETE'
}

class AIServiceError(Exception):
    """Excepción personalizada para errores del servicio de IA"""
    def __init__(self, message, status_code=None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

def send_message_to_ai(text, context=None, response_length='normal', character_name='sinclair', language='es'):
    """
    Envía un mensaje a la API de IA y devuelve la respuesta
    
    Args:
        text (str): Texto a enviar a la IA
        context (str, optional): Contexto para la IA (personalización del asistente)
        response_length (str, optional): Longitud de la respuesta ('very_brief', 'brief', 'normal', 'complete', 'very_complete')
        character_name (str, optional): Nombre del personaje/asistente a usar
        language (str, optional): Idioma de la respuesta ('es', 'en')
        
    Returns:
        dict: Respuesta de la IA con formato {"reply": str, "context": str, ...}
        
    Raises:
        AIServiceError: Si hay un error en la comunicación con la API
    """
    try:
        # Validar longitud de respuesta
        if response_length not in RESPONSE_LENGTH_MAP:
            response_length = 'normal'
            
        # Preparar el payload
        payload = {
            'command': RESPONSE_LENGTH_MAP[response_length],
            'user_text': text,
            'character_name': character_name,
            'language': language
        }
        
        # Añadir contexto si se proporciona
        if context:
            payload['context'] = context
            
        logger.info(f"Enviando mensaje a la IA: {text[:50]}...")
        
        # Realizar la solicitud a la API
        response = requests.post(
            f"{API_URL}ask",
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=30  # Timeout de 30 segundos
        )
        
        # Manejar errores de HTTP
        if not response.ok:
            error_message = f"Error del servidor ({response.status_code})"
            try:
                error_data = response.json()
                if 'error' in error_data:
                    error_message = error_data['error']
            except:
                pass
                
            logger.error(f"Error en la API de IA: {error_message}")
            raise AIServiceError(error_message, response.status_code)
        
        # Procesar respuesta
        data = response.json()
        
        if not data or 'reply' not in data or not isinstance(data['reply'], str):
            raise AIServiceError('Respuesta inválida del servidor')
            
        logger.info(f"Respuesta recibida de la IA: {data['reply'][:50]}...")
        return data
        
    except requests.RequestException as e:
        logger.error(f"Error de conexión con la API de IA: {str(e)}")
        raise AIServiceError('Error de conexión con el servidor')
    except json.JSONDecodeError:
        logger.error("Error al decodificar la respuesta JSON")
        raise AIServiceError('Respuesta inválida del servidor')
    except Exception as e:
        logger.error(f"Error inesperado al comunicarse con la API de IA: {str(e)}")
        raise AIServiceError('Error inesperado en el servicio de IA')