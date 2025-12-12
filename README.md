Digital Menu — simplified scaffold (Django + DRF backend, React + Vite frontend)

Quick start (backend):
  cd backend
  python -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py createsuperuser
  python manage.py runserver

Quick start (frontend):
  cd frontend
  npm install
  npx tailwindcss -i ./src/styles.css -o ./src/tailwind-output.css --watch
  npm run dev

Notes:
- This scaffold uses sqlite for quick testing.
- MPesa endpoint is mocked in backend; replace with Daraja integration and add credentials in env.
- For production, configure static/media storage and secure SECRET_KEY.
