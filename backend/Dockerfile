FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copier requirements et installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copier le code
COPY . .

# Créer un répertoire pour les fichiers statiques et médias
RUN mkdir -p /app/staticfiles /app/media

# Expose le port
EXPOSE 8000

CMD ["gunicorn", "civicsense.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
