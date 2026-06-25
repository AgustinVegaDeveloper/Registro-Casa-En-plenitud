# CasaEnPlenitudApp

CasaEnPlenitudApp is a web-based church management system focused on attendance tracking, member follow-up, cell structure administration, and reporting for a Christian church context.

The project is being developed in phases. The current public state includes the backend foundation, database schema, migrations, authentication base, and project structure for the frontend.

## Current Status

Phase 1 completed:

- Backend project structure with FastAPI
- MySQL schema design
- SQLAlchemy models and relationships
- Alembic migrations
- JWT authentication base
- Initial authorization foundations
- Seed scripts and local setup

Next phases will cover:

- Networks and cells management
- Members and cell transfer history
- Attendance registration workflows
- Dashboard and reports
- PDF and Excel exports
- Frontend implementation with React and Material UI

## Tech Stack

### Backend

- Python 3.12+
- FastAPI
- SQLAlchemy
- Alembic
- JWT authentication
- Pillow

### Database

- MySQL 8

### Frontend

- React
- TypeScript
- Vite
- Material UI

### Deployment Target

- Ubuntu Server on Oracle Cloud Always Free
- Nginx as reverse proxy

## Project Structure

```text
CasaEnPlenitudApp/
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── uploads/
│   │   └── utils/
│   ├── scripts/
│   ├── .env.example
│   └── README.md
└── frontend/
    └── src/
        ├── api/
        ├── components/
        ├── context/
        ├── hooks/
        ├── pages/
        ├── routes/
        ├── types/
        └── utils/
```

## Local Setup

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Update the values in `.env` before running the application.

Run migrations:

```bash
alembic upgrade head
```

Seed initial data:

```bash
python -m scripts.seed_initial_data
```

Start the API:

```bash
uvicorn app.main:app --reload
```

Open in your browser:

- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/v1/health`

## Notes

- All source code is written in English.
- User-facing interface text is intended to be in Spanish.
- Example environment values in `.env.example` are placeholders and must be replaced for real usage.

## Backend Details

More backend-specific setup details are available in [backend/README.md](./backend/README.md).
