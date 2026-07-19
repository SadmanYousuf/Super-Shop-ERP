# Backend Scaffold (Flask)

This folder contains a minimal Flask backend scaffold for the Super ERP project.

Quick start (from repository root):

1. (optional) create a virtualenv and activate it

```powershell
python -m venv .venv-backend
.\.venv-backend\Scripts\Activate.ps1
```

2. Install dependencies

```powershell
pip install -r requirements-backend.txt
```

3. Run the backend

```powershell
python -m backend.app
```

The server will start on port 5000 and create a SQLite database at `backend/erp.db`.

Routes provided (minimal):
- `POST /api/auth/register` - create user (username, password, role)
- `POST /api/auth/login` - login returns JWT
- `GET /api/users` - list users (requires admin/superadmin JWT)
- `GET /api/products` - list products

Next steps:
- Add more CRUD endpoints for products, purchases, sales
- Add RBAC middleware and role-enforced endpoints
- Add seed script and CI test suite
