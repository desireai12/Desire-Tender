import time
import re
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/auth", tags=["User Authentication & Role Rights"])

# --- In-Memory Mock User Database ---
REGISTERED_USERS: List[Dict[str, Any]] = [
    {
        "id": "usr-101",
        "name": "Ankit Purohit",
        "email": "ankit.purohit@desireenergy.com",
        "phone": "9829012345",
        "department": "Business Development",
        "allowed_modules": ["dashboard", "wizard", "lifecycle", "competitors"],
        "is_approved": True,
        "registered_at": "2026-08-01 09:00:00",
        "last_login": "2026-08-08 10:15:00"
    },
    {
        "id": "usr-102",
        "name": "Deepak Khandelwal",
        "email": "deepak.khandelwal@desireenergy.com",
        "phone": "9829023456",
        "department": "Estimation Team",
        "allowed_modules": ["dashboard", "wizard", "lifecycle", "competitors"],
        "is_approved": True,
        "registered_at": "2026-08-02 11:30:00",
        "last_login": "2026-08-08 09:45:00"
    },
    {
        "id": "usr-103",
        "name": "Suresh Sharma",
        "email": "suresh.sharma@desireenergy.com",
        "phone": "9829034567",
        "department": "Engineering",
        "allowed_modules": ["dashboard", "wizard", "lifecycle", "competitors"],
        "is_approved": True,
        "registered_at": "2026-08-03 14:00:00",
        "last_login": "2026-08-07 16:20:00"
    },
    {
        "id": "usr-104",
        "name": "Vikas Verma",
        "email": "vikas.verma@desireenergy.com",
        "phone": "9829045678",
        "department": "Tender Team",
        "allowed_modules": ["dashboard", "wizard", "lifecycle", "competitors"],
        "is_approved": True,
        "registered_at": "2026-08-04 10:10:00",
        "last_login": "2026-08-08 08:30:00"
    },
    {
        "id": "usr-999",
        "name": "System Administrator",
        "email": "admin@desireenergy.com",
        "phone": "9999999999",
        "department": "Admin",
        "allowed_modules": ["dashboard", "wizard", "lifecycle", "competitors", "admin", "admin_config", "settings"],
        "is_approved": True,
        "registered_at": "2026-07-01 00:00:00",
        "last_login": "2026-08-08 10:40:00"
    }
]

LOGIN_AUDIT_LOGS: List[Dict[str, Any]] = [
    {
        "id": "log-001",
        "user_name": "Ankit Purohit",
        "email": "ankit.purohit@desireenergy.com",
        "phone": "9829012345",
        "department": "Business Development",
        "timestamp": "2026-08-08 10:15:00",
        "status": "Success"
    }
]


# --- Models ---
class LoginRequest(BaseModel):
    email: str
    phone: str

class UpdateUserRolePayload(BaseModel):
    user_id: str
    department: str
    allowed_modules: Optional[List[str]] = None
    is_approved: Optional[bool] = True


# --- Routes ---

@router.post("/login")
async def login_user(payload: LoginRequest):
    """Validate email & 10-digit mobile number, register if new, and authenticate session."""
    email_clean = payload.email.strip().lower()
    phone_clean = payload.phone.strip()

    # Basic email validation
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email_clean):
        raise HTTPException(status_code=400, detail="Invalid email format. Please enter a valid email address.")

    # Strict 10-digit mobile number check
    if not re.match(r"^\d{10}$", phone_clean):
        raise HTTPException(status_code=400, detail="Invalid mobile number. Please enter a valid 10-digit phone number.")

    # Search existing user
    user = next((u for u in REGISTERED_USERS if u["email"].lower() == email_clean or u["phone"] == phone_clean), None)

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    if not user:
        # Auto-register new user with default BD role pending/active
        user_id = f"usr-{int(time.time())}"
        name = email_clean.split("@")[0].replace(".", " ").title()
        
        # Check if email contains 'admin'
        is_admin_req = "admin" in email_clean
        dept = "Admin" if is_admin_req else "Business Development"
        modules = ["dashboard", "wizard", "lifecycle", "competitors", "admin", "admin_config", "settings"] if is_admin_req else ["dashboard", "wizard", "lifecycle", "competitors"]

        user = {
            "id": user_id,
            "name": name,
            "email": email_clean,
            "phone": phone_clean,
            "department": dept,
            "allowed_modules": modules,
            "is_approved": True,
            "registered_at": timestamp,
            "last_login": timestamp
        }
        REGISTERED_USERS.append(user)
    else:
        user["last_login"] = timestamp

    # Append to login audit log
    LOGIN_AUDIT_LOGS.insert(0, {
        "id": f"log-{int(time.time())}",
        "user_name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "department": user["department"],
        "timestamp": timestamp,
        "status": "Success"
    })

    return {
        "status": "success",
        "message": f"Welcome, {user['name']}! Logged in successfully.",
        "user": user
    }


@router.get("/users")
async def list_all_users():
    """Retrieve registered users list and login audit logs for Admin Panel."""
    return {
        "status": "success",
        "total_users": len(REGISTERED_USERS),
        "users": REGISTERED_USERS,
        "login_logs": LOGIN_AUDIT_LOGS
    }


@router.post("/users/assign-role")
async def assign_user_role(payload: UpdateUserRolePayload):
    """Admin endpoint to assign department roles and module rights to users."""
    user = next((u for u in REGISTERED_USERS if u["id"] == payload.user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user["department"] = payload.department
    if payload.allowed_modules:
        user["allowed_modules"] = payload.allowed_modules
    if payload.is_approved is not None:
        user["is_approved"] = payload.is_approved

    return {
        "status": "success",
        "message": f"Successfully updated rights for {user['name']}! Department set to '{payload.department}'.",
        "user": user
    }
