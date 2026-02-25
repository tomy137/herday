# HerDay

Calendrier de suivi du cycle menstruel destiné aux hommes qui souhaitent mieux comprendre et accompagner leur compagne au quotidien.

HerDay calcule les phases du cycle (règles, phase folliculaire, ovulation, phase lutéale) à partir des dates de début de règles saisies, et propose des conseils adaptés à chaque phase.

## Stack technique

| Composant | Technologie |
|-----------|------------|
| Backend | Python 3.12+, FastAPI, SQLModel, Alembic, SQLite |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Auth | Magic link par email (SMTP) |
| i18n | FR, EN, DE via react-i18next |
| Déploiement | Docker Compose (backend uvicorn + frontend nginx) |

## Développement local

### Prérequis

- Python 3.12+
- Node.js 22+
- [uv](https://docs.astral.sh/uv/) (gestionnaire de paquets Python)

### Backend

```bash
cd backend
cp ../.env.example .env
# Éditer .env avec vos valeurs (SECRET_KEY, SMTP, etc.)

uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Le backend est accessible sur `http://localhost:8000`. Documentation API interactive sur `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend est accessible sur `http://localhost:5173`.

### Variables d'environnement

Copier `.env.example` et renseigner les valeurs :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SECRET_KEY` | Clé secrète pour les JWT | `change-me-in-production` |
| `DATABASE_URL` | URL de la base SQLite | `sqlite:///./herday.db` |
| `SMTP_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Utilisateur SMTP | `you@gmail.com` |
| `SMTP_PASSWORD` | Mot de passe SMTP | `app-password` |
| `SMTP_FROM` | Adresse d'expédition | `noreply@herday.app` |
| `FRONTEND_URL` | URL du frontend | `http://localhost:5173` |
| `CORS_ORIGINS` | Origines CORS autorisées | `http://localhost:5173` |

## Docker

### Build et lancement

```bash
docker compose up --build -d
```

Services :

| Service | Port | Description |
|---------|------|-------------|
| `backend` | 8000 | API FastAPI (uvicorn) |
| `frontend` | 3000 | App React (nginx) |

Le frontend nginx sert les fichiers statiques et proxifie `/api` vers le backend.

### Volumes

- `db-data` : persistance de la base SQLite

### Arrêt

```bash
docker compose down
```

## Reverse proxy (production)

En production, un reverse proxy se place devant les deux conteneurs Docker pour gérer le HTTPS et router le trafic.

### Nginx

```nginx
server {
    listen 80;
    server_name herday.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name herday.example.com;

    ssl_certificate     /etc/ssl/certs/herday.pem;
    ssl_certificate_key /etc/ssl/private/herday.key;

    # API → backend
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend → conteneur nginx interne
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy

```caddy
herday.example.com {
    # API → backend
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    # Frontend → conteneur nginx interne
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

Caddy gère automatiquement les certificats HTTPS via Let's Encrypt.

## Structure du projet

```
herday/
├── backend/
│   ├── app/
│   │   ├── api/            # Routes FastAPI
│   │   ├── models/         # Modèles SQLModel
│   │   ├── services/       # Logique métier (cycle_engine, etc.)
│   │   └── main.py         # Point d'entrée
│   ├── alembic/            # Migrations de base de données
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/            # Client API
│   │   ├── components/     # Composants UI (AppShell, BottomSheet, Toast…)
│   │   ├── constants/      # Types d'événements
│   │   ├── contexts/       # AuthContext
│   │   ├── i18n/           # Traductions FR/EN/DE
│   │   ├── lib/            # Utilitaires
│   │   └── pages/          # Home, Calendar, Settings, Login, Verify, Info
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
├── .env.example
└── LICENSE
```

## Fonctionnalités

- **Dashboard** : phase actuelle, jour du cycle, conseils contextuels
- **Calendrier** : vue mensuelle avec code couleur par phase et icônes d'événements
- **Saisie d'événements** : début/fin de règles, humeurs, observations
- **Calcul des phases** : méthode Ogino avec moyenne glissante des cycles
- **Niveaux de confiance** : indicateur de fiabilité selon le nombre de cycles enregistrés
- **PWA** : installable sur mobile
- **Multilingue** : français, anglais, allemand

## Licence

[AGPL-3.0](LICENSE)
