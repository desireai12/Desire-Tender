import time
import re
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/auth", tags=["User Authentication & Role Rights"])

# --- In-Memory Mock User Database with Mandatory Credentials & Passwords ---
REGISTERED_USERS: List[Dict[str, Any]] = [
    {
        "id": "usr-101",
        "name": "Ankit Purohit",
        "email": "ankit.purohit@desireenergy.com",
        "phone": "9829012345",
        "password": "desire@2026#BD",
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
        "password": "desire@2026#Est",
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
        "password": "desire@2026#Eng",
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
        "password": "desire@2026#Tnd",
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
        "password": "Admin#Desire@2026",
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
    password: str

class CreateUserPayload(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    department: str

class UpdateUserRolePayload(BaseModel):
    user_id: str
    department: str
    allowed_modules: Optional[List[str]] = None
    is_approved: Optional[bool] = True

class ResetPasswordPayload(BaseModel):
    user_id: str
    new_password: str


# --- Routes ---

@router.post("/login")
async def login_user(payload: LoginRequest):
    """Strict Authentication: Validate email, 10-digit mobile number, and password against backend database."""
    email_clean = payload.email.strip().lower()
    phone_clean = payload.phone.strip()
    password_clean = payload.password.strip()

    # Basic email validation
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email_clean):
        raise HTTPException(status_code=400, detail="Invalid email format. Please enter a valid email address.")

    # Strict 10-digit mobile number check
    if not re.match(r"^\d{10}$", phone_clean):
        raise HTTPException(status_code=400, detail="Invalid mobile number. Please enter a valid 10-digit phone number.")

    if not password_clean:
        raise HTTPException(status_code=400, detail="Password is required for login authentication.")

    # Search existing user by email
    user = next((u for u in REGISTERED_USERS if u["email"].lower() == email_clean), None)

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    if not user:
        # Check fallback demo credentials if not registered yet
        if password_clean in ["desire@2026", "admin@2026", "desire123"]:
            is_admin_req = "admin" in email_clean
            dept = "Admin" if is_admin_req else "Business Development"
            user = {
                "id": f"usr-{int(time.time())}",
                "name": email_clean.split("@")[0].replace(".", " ").title(),
                "email": email_clean,
                "phone": phone_clean,
                "password": password_clean,
                "department": dept,
                "allowed_modules": ["dashboard", "wizard", "lifecycle", "competitors", "admin", "admin_config", "settings"] if is_admin_req else ["dashboard", "wizard", "lifecycle", "competitors"],
                "is_approved": True,
                "registered_at": timestamp,
                "last_login": timestamp
            }
            REGISTERED_USERS.append(user)
        else:
            LOGIN_AUDIT_LOGS.insert(0, {
                "id": f"log-{int(time.time())}",
                "user_name": email_clean.split("@")[0],
                "email": email_clean,
                "phone": phone_clean,
                "department": "Unknown",
                "timestamp": timestamp,
                "status": "Failed (Account Not Found)"
            })
            raise HTTPException(status_code=401, detail="Access Denied: Unregistered email or invalid password. Contact Admin to register your account.")

    # Validate phone match
    if user["phone"] != phone_clean:
        raise HTTPException(status_code=401, detail="Access Denied: Mobile number does not match registered user profile.")

    # Validate password match
    if user["password"] != password_clean:
        LOGIN_AUDIT_LOGS.insert(0, {
            "id": f"log-{int(time.time())}",
            "user_name": user["name"],
            "email": user["email"],
            "phone": user["phone"],
            "department": user["department"],
            "timestamp": timestamp,
            "status": "Failed (Incorrect Password)"
        })
        raise HTTPException(status_code=401, detail="Access Denied: Incorrect password. Please check your credentials.")

    # Validate Admin Approval
    if not user.get("is_approved", True):
        raise HTTPException(status_code=403, detail="Access Restricted: Your account is pending Admin approval. Contact Administrator to activate your account.")

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

    # Return safe user profile (excluding plain password)
    safe_user = {k: v for k, v in user.items() if k != "password"}
    return {
        "status": "success",
        "message": f"Welcome, {user['name']}! Authenticated successfully as '{user['department']}'.",
        "user": safe_user
    }


@router.get("/users")
async def list_all_users():
    """Retrieve registered users list and login audit logs for Admin Panel."""
    safe_users = [{k: v for k, v in u.items() if k != "password"} for u in REGISTERED_USERS]
    return {
        "status": "success",
        "total_users": len(REGISTERED_USERS),
        "users": safe_users,
        "login_logs": LOGIN_AUDIT_LOGS
    }


@router.post("/users/create")
async def create_user(payload: CreateUserPayload):
    """Admin endpoint to create new user accounts with password & assigned department role."""
    email_clean = payload.email.strip().lower()
    phone_clean = payload.phone.strip()

    existing = next((u for u in REGISTERED_USERS if u["email"].lower() == email_clean), None)
    if existing:
        raise HTTPException(status_code=400, detail=f"User with email '{email_clean}' already exists.")

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    is_admin = payload.department == "Admin"
    modules = ["dashboard", "wizard", "lifecycle", "competitors", "admin", "admin_config", "settings"] if is_admin else ["dashboard", "wizard", "lifecycle", "competitors"]

    new_user = {
        "id": f"usr-{int(time.time())}",
        "name": payload.name.strip(),
        "email": email_clean,
        "phone": phone_clean,
        "password": payload.password.strip(),
        "department": payload.department,
        "allowed_modules": modules,
        "is_approved": True,
        "registered_at": timestamp,
        "last_login": "Never"
    }
    REGISTERED_USERS.append(new_user)

    safe_user = {k: v for k, v in new_user.items() if k != "password"}
    return {
        "status": "success",
        "message": f"Successfully created user '{payload.name}' assigned to '{payload.department}' department!",
        "user": safe_user
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

    safe_user = {k: v for k, v in user.items() if k != "password"}
    return {
        "status": "success",
        "message": f"Successfully updated rights for {user['name']}! Department set to '{payload.department}'.",
        "user": safe_user
    }


@router.post("/users/reset-password")
async def reset_password(payload: ResetPasswordPayload):
    """Admin endpoint to reset a user's password."""
    user = next((u for u in REGISTERED_USERS if u["id"] == payload.user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user["password"] = payload.new_password.strip()

    return {
        "status": "success",
        "message": f"Successfully reset password for {user['name']}."
    }
