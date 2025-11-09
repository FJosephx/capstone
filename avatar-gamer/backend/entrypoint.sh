#!/usr/bin/env bash
set -e

# Espera que la base de datos esté lista
python - <<'PY'
import os, time, psycopg2
host = os.environ.get("DB_HOST", "db")
port = int(os.environ.get("POSTGRES_PORT", "5432"))
user = os.environ.get("POSTGRES_USER", "postgres")
pwd  = os.environ.get("POSTGRES_PASSWORD", "postgres")
db   = os.environ.get("POSTGRES_DB", "avatargamer")
while True:
    try:
        psycopg2.connect(host=host, port=port, user=user, password=pwd, dbname=db).close()
        print("Base de datos lista.")
        break
    except Exception as e:
        print("Esperando DB...", e)
        time.sleep(1)
PY

# Espera también que Redis esté disponible
python - <<'PY'
import os, time, redis
host = os.environ.get("REDIS_HOST", "redis")
port = int(os.environ.get("REDIS_PORT", "6379"))
while True:
    try:
        r = redis.Redis(host=host, port=port)
        r.ping()
        print("Redis está disponible.")
        break
    except Exception as e:
        print("Esperando Redis...", e)
        time.sleep(1)
PY

# Ejecuta migraciones
python manage.py migrate --noinput

# Levanta el servidor ASGI con uvicorn
uvicorn config.asgi:application --host 0.0.0.0 --port 8000