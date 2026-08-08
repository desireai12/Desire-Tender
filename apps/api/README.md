# Desire Tender Intelligence System — Python FastAPI Backend

This is the standalone Python FastAPI Backend server for the Desire Tender Intelligence System.

---

## 🚀 How to Run the Backend Server

### Option 1: One-Click Windows Batch Launcher (Recommended)
Double-click `start_backend.bat` or run in Command Prompt:
```cmd
cd "apps\api"
start_backend.bat
```

### Option 2: Standard Terminal Command
Open Command Prompt / PowerShell and run:
```powershell
cd "apps/api"
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

---

## 🌐 Endpoints & API Documentation

Once started, access the server at:
* **Base URL**: `http://localhost:8000`
* **Interactive Swagger API Portal**: [`http://localhost:8000/docs`](http://localhost:8000/docs)
* **OpenAPI Schema**: `http://localhost:8000/api/v1/openapi.json`

---

## 🔐 Key API Modules

* **`/api/v1/auth`**: User registration (`employee_id`, `password`), authentication, JWT session token generation, Admin login & forced password reset.
* **`/api/v1/admin`**: Admin User Directory management, role/permission assignment matrix, Project creation, AI System instructions, Encrypted API Key Vault, and Security Audit Logs.
* **`/api/v1/tender`**: Tender document PDF parsing, Step 1 Eligibility evaluation, Step 2 AI Clause analysis, Step 3 Costing BOQs, and Stage 4-6 lifecycle updates.
