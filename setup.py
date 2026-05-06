#!/usr/bin/env python3
from __future__ import annotations

import os
import secrets
import shutil
import subprocess
import sys
from getpass import getpass
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / 'backend'
FRONTEND = ROOT / 'frontend'
BACKEND_ENV = BACKEND / '.env'
BACKEND_VENV = BACKEND / '.venv'


def log(message: str) -> None:
    print(f'==> {message}')


def ok(message: str) -> None:
    print(f'    {message}')


def run(command: list[str], *, cwd: Path | None = None) -> None:
    subprocess.run(command, cwd=cwd, check=True)


def venv_python() -> Path:
    if os.name == 'nt':
        return BACKEND_VENV / 'Scripts' / 'python.exe'
    return BACKEND_VENV / 'bin' / 'python'


def prompt_postgres_user() -> str:
    env_user = os.getenv('POSTGRES_USER') or os.getenv('DB_USER')
    if env_user:
        return env_user.strip()
    if sys.stdin.isatty():
        user = input("Utilisateur PostgreSQL [postgres]: ").strip()
        return user or 'postgres'
    return 'postgres'


def prompt_postgres_password(user: str) -> str:
    env_password = os.getenv('POSTGRES_PASSWORD') or os.getenv('DB_PASSWORD')
    if env_password is not None:
        return env_password.strip()
    if sys.stdin.isatty():
        password = getpass(f"Mot de passe PostgreSQL pour l'utilisateur {user} (laisser vide si aucun): ")
        return password.strip()
    return ''


def ensure_prerequisites() -> None:
    missing = [tool for tool in ('node', 'npm') if shutil.which(tool) is None]
    if missing:
        raise SystemExit('Outils manquants: ' + ', '.join(missing) + '. Installe Node.js 18+ puis relance.')


def write_env(db_user: str, db_password: str) -> None:
    secret_key = secrets.token_urlsafe(48)
    jwt_key = secrets.token_urlsafe(48)
    env_content = f'''SECRET_KEY={secret_key}
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=smartresi
DB_USER={db_user}
DB_PASSWORD={db_password}
DB_HOST=localhost
DB_PORT=5432

CORS_ORIGIN=http://localhost:5173
JWT_SIGNING_KEY={jwt_key}
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
'''
    BACKEND_ENV.write_text(env_content, encoding='utf-8')


def main() -> int:
    ensure_prerequisites()

    if not BACKEND.exists() or not FRONTEND.exists():
        raise SystemExit('Le script doit etre lance depuis la racine du projet SmartResi.')

    log('Configuration PostgreSQL')
    db_user = prompt_postgres_user()
    db_password = prompt_postgres_password(db_user)

    log('Creation du venv backend')
    run([sys.executable, '-m', 'venv', str(BACKEND_VENV)], cwd=BACKEND)
    backend_python = venv_python()

    log('Installation des dependances Python')
    run([str(backend_python), '-m', 'pip', 'install', '-r', 'requirements.txt'], cwd=BACKEND)

    log('Generation de backend/.env')
    write_env(db_user, db_password)

    log('Initialisation de la base et des donnees')
    run([str(backend_python), 'manage.py', 'seed_all'], cwd=BACKEND)

    log('Installation des dependances frontend')
    run(['npm', 'install'], cwd=FRONTEND)

    print()
    print('Setup termine avec succes.')
    if os.name == 'nt':
        print('Backend: cd backend && .venv\\Scripts\\activate && python manage.py runserver')
    else:
        print('Backend: cd backend && source .venv/bin/activate && python manage.py runserver')
    print('Frontend: cd frontend && npm run dev')
    print('API: http://localhost:8000/api/')
    print('Admin: http://localhost:8000/admin/')
    print('Frontend: http://localhost:5173/')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())