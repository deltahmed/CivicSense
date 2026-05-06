# Backend Setup & Configuration

## 📧 Email: Simple Switch

**Mailtrap → LWS:** Édite `.env` et décommente la section LWS, commente Mailtrap.  
Redémarre Django. C'est tout.

---

## 🚀 Getting Started

1. **Python env:**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Config:**
   ```bash
   cp .env.example .env
   # Édite .env pour ta DB et email
   ```

3. **Migrations:**
   ```bash
   python manage.py migrate
   ```
   Le seed lance aussi les migrations automatiquement si besoin, et crée la base PostgreSQL si elle n'existe pas encore.

4. **Admin user:**
   ```bash
   python manage.py create_admin --email admin@example.com --password 'Password123'
   ```

5. **Données de test:**
   ```bash
   python manage.py seed --clear
   ```
   Utilise `--clear` pour repartir d'une base propre.

   Pour tout générer d'un coup:
   ```bash
   python manage.py seed_all --clear
   ```
   Cette commande lance le seed principal puis le seed des services additionnels.

6. **Run:**
   ```bash
   python manage.py runserver
   ```
python3 manage.py create_admin --email admin@deltahmed.fr --password 'VotreMotDePasse' --username adminarmed