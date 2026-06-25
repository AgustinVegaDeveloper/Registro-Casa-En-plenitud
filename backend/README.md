# CasaEnPlenitudApp Backend

## Quick start

1. Create `.env` from `.env.example`.
2. Install dependencies:
   `pip install -r requirements.txt`
3. Run migrations:
   `alembic upgrade head`
4. Seed initial data:
   `python -m scripts.seed_initial_data`
5. Run API:
   `uvicorn app.main:app --reload`

## Authentication flow

- Open `http://127.0.0.1:8000/docs`
- Use `POST /api/v1/auth/login` with:
  - `username`
  - `password`
- Click `Authorize` and paste the received bearer token.
- Validate the session with `GET /api/v1/auth/me`

## Default admin user

- Username: from `INITIAL_ADMIN_USERNAME`
- Password: from `INITIAL_ADMIN_PASSWORD`
