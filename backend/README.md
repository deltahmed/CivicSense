# Backend

La procédure de setup locale est maintenant centralisée dans le README racine et dans le script unique `setup.py`.

## Installation rapide

Depuis la racine du projet:

```bash
python setup.py
```

## Utilitaire utile

Si tu veux relancer uniquement le seed après installation:

```bash
python manage.py seed_all
```

En local, les emails partent vers la console quand `DEBUG=True`.
