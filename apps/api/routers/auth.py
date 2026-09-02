import time
import re
import json
import hashlib
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.db import fetch_one, fetch_all, execute_write

router = APIRouter(prefix="/auth", tags=["Production Authentication & RBAC"])

def hash_password(plain_password: str) -> str:
    """Secure SHA-256 password hash generator."""
    return hashlib.sha256(plain_password.strip().encode("utf-8")).hexdigest()

# Initial Dev Admin Credentials
ADMIN_ACCOUNT = {
    "admin_id": "admin",
    "password_hash": hash_password("AquaAdmin@2026#DES"),
    "must_change_password": True,
    "last_login": "Never"
}

# --- Models ---
class RegisterPayload(BaseModel):
    employee_id: str = Field(..., description="Employee / User ID e.g. EMP005")
    full_name: str
    phone: str
    email: str
    password: str

class UserLoginPayload(BaseModel):
    employee_id: str
    password: str

class AdminLoginPayload(BaseModel):
    admin_id: str
    password: str

class AdminChangePasswordPayload(BaseModel):
    admin_id: str
    old_password: str
    new_password: str


# --- Routes ---

@router.post("/register")
async def register_account(payload: RegisterPayload):
    """Create a new employee account and persist to Supabase users table."""
    emp_id = payload.employee_id.strip().upper()
    email_clean = payload.email.strip().lower()
    phone_clean = payload.phone.strip()
    full_name = payload.full_name.strip()
    password_clean = payload.password.strip()

    if not emp_id:
        raise HTTPException(status_code=400, detail="Employee / User ID is required.")
    if not full_name:
        raise HTTPException(status_code=400, detail="Full Name is required.")
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email_clean):
        raise HTTPException(status_code=400, detail="Invalid email format.")
    if not re.match(r"^\d{10}$", phone_clean):
        raise HTTPException(status_code=400, detail="Mobile number must be exactly 10 digits.")
    if len(password_clean) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # Check existing Employee ID or Email in DB
    existing_emp = fetch_one("SELECT id FROM public.users WHERE UPPER(employee_id) = %s", (emp_id,))
    if existing_emp:
        raise HTTPException(status_code=400, detail=f"Employee ID '{emp_id}' is already registered.")

    existing_email = fetch_one("SELECT id FROM public.users WHERE LOWER(email) = %s", (email_clean,))
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Email '{email_clean}' is already registered.")

    usr_id = str(uuid.uuid4())
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    pass_hash = hash_password(password_clean)
    perms = json.dumps(["eligibility"])
    assigned_projs = json.dumps(["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"])

    sql = """
    INSERT INTO public.users (id, employee_id, full_name, email, phone, password_hash, role, department, status, permissions, assigned_projects, registered_at, last_login)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s);
    """

    execute_write(
        sql,
        (usr_id, emp_id, full_name, email_clean, phone_clean, pass_hash, "User", "Unassigned", "Pending", perms, assigned_projs, "Never")
    )

    new_user = {
        "id": usr_id,
        "employee_id": emp_id,
        "full_name": full_name,
        "email": email_clean,
        "phone": phone_clean,
        "role": "User",
        "department": "Unassigned",
        "status": "Pending",
        "permissions": ["eligibility"],
        "assigned_projects": ["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"],
        "registered_at": timestamp
    }

    return {
        "status": "success",
        "message": "Your account has been created successfully. You can currently access Eligibility Checking. Additional modules will become available after Admin approval.",
        "user": new_user
    }


@router.post("/login")
async def user_login(payload: UserLoginPayload):
    """Authenticate User using Employee ID and Password from Supabase DB."""
    emp_id = payload.employee_id.strip().upper()
    password_clean = payload.password.strip()

    if not emp_id or not password_clean:
        raise HTTPException(status_code=400, detail="Employee ID and Password are required.")

    user = fetch_one("SELECT * FROM public.users WHERE UPPER(employee_id) = %s", (emp_id,))
    if not user:
        raise HTTPException(status_code=401, detail="Access Denied: Invalid Employee ID or password.")

    if user["password_hash"] != hash_password(password_clean):
        raise HTTPException(status_code=401, detail="Access Denied: Incorrect password.")

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    execute_write("UPDATE public.users SET last_login = %s WHERE id = %s;", (timestamp, user["id"]))

    user["last_login"] = timestamp
    if isinstance(user.get("permissions"), str):
        user["permissions"] = json.loads(user["permissions"])
    if isinstance(user.get("assigned_projects"), str):
        user["assigned_projects"] = json.loads(user["assigned_projects"])

    safe_user = {k: v for k, v in user.items() if k != "password_hash"}

    notice = None
    if user.get("status") == "Pending":
        notice = "Your account is currently Pending Admin Approval. You can access Eligibility Checking. Additional modules will unlock once approved by Admin."

    return {
        "status": "success",
        "message": f"Welcome back, {user['full_name']}!",
        "notice": notice,
        "user": safe_user
    }


@router.post("/admin-login")
async def admin_login(payload: AdminLoginPayload):
    """Authenticate Admin using Admin ID & Admin Password."""
    admin_id_clean = payload.admin_id.strip()
    pass_clean = payload.password.strip()

    if admin_id_clean != ADMIN_ACCOUNT["admin_id"]:
        raise HTTPException(status_code=401, detail="Access Denied: Invalid Admin ID.")

    if hash_password(pass_clean) != ADMIN_ACCOUNT["password_hash"]:
        raise HTTPException(status_code=401, detail="Access Denied: Invalid Admin Password.")

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    ADMIN_ACCOUNT["last_login"] = timestamp

    return {
        "status": "success",
        "message": "Admin authentication successful.",
        "must_change_password": ADMIN_ACCOUNT["must_change_password"],
        "admin": {
            "admin_id": ADMIN_ACCOUNT["admin_id"],
            "role": "Admin",
            "must_change_password": ADMIN_ACCOUNT["must_change_password"]
        }
    }


@router.post("/admin-change-password")
async def admin_change_password(payload: AdminChangePasswordPayload):
    """Force Admin to set a new password when using initial temporary password."""
    admin_id_clean = payload.admin_id.strip()
    old_pass = payload.old_password.strip()
    new_pass = payload.new_password.strip()

    if admin_id_clean != ADMIN_ACCOUNT["admin_id"]:
        raise HTTPException(status_code=400, detail="Invalid Admin ID.")

    if hash_password(old_pass) != ADMIN_ACCOUNT["password_hash"]:
        raise HTTPException(status_code=401, detail="Current Admin password does not match.")

    if len(new_pass) < 8:
        raise HTTPException(status_code=400, detail="New Admin password must be at least 8 characters.")

    ADMIN_ACCOUNT["password_hash"] = hash_password(new_pass)
    ADMIN_ACCOUNT["must_change_password"] = False

    return {
        "status": "success",
        "message": "Admin password updated successfully! You may now proceed to the Admin Portal."
    }
