import time
import re
import hashlib
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/auth", tags=["Production Authentication & RBAC"])

def hash_password(plain_password: str) -> str:
    """Secure SHA-256 password hash generator."""
    return hashlib.sha256(plain_password.strip().encode("utf-8")).hexdigest()

# Initial Dev Admin State
ADMIN_ACCOUNT = {
    "admin_id": "admin",
    "password_hash": hash_password("AquaAdmin@2026#DES"),
    "must_change_password": True,
    "last_login": "Never"
}

# --- Database User Records ---
REGISTERED_USERS: List[Dict[str, Any]] = [
    {
        "id": "usr-101",
        "employee_id": "EMP001",
        "full_name": "Ankit Purohit",
        "email": "ankit.purohit@desireenergy.com",
        "phone": "9829012345",
        "password_hash": hash_password("Ankit@EMP001#2026"),
        "role": "BD Executive",
        "department": "Business Development",
        "status": "Active",  # Active | Pending | Rejected | Deactivated
        "permissions": ["eligibility", "ai_analysis", "bid_decision"],
        "assigned_projects": ["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"],
        "registered_at": "2026-08-01 09:00:00",
        "last_login": "2026-08-08 10:15:00"
    },
    {
        "id": "usr-102",
        "employee_id": "EMP002",
        "full_name": "Deepak Khandelwal",
        "email": "deepak.khandelwal@desireenergy.com",
        "phone": "9829023456",
        "password_hash": hash_password("Deepak@EMP002#2026"),
        "role": "Sr Estimator",
        "department": "Estimation Team",
        "status": "Active",
        "permissions": ["eligibility", "cost_estimation"],
        "assigned_projects": ["SOLAR", "RHDS", "KUSUM", "EPC"],
        "registered_at": "2026-08-02 11:30:00",
        "last_login": "2026-08-08 09:45:00"
    },
    {
        "id": "usr-103",
        "employee_id": "EMP003",
        "full_name": "Suresh Sharma",
        "email": "suresh.sharma@desireenergy.com",
        "phone": "9829034567",
        "password_hash": hash_password("Suresh@EMP003#2026"),
        "role": "Chief Engineer",
        "department": "Engineering",
        "status": "Active",
        "permissions": ["eligibility", "ai_analysis"],
        "assigned_projects": ["SOLAR", "RHDS", "STP"],
        "registered_at": "2026-08-03 14:00:00",
        "last_login": "2026-08-07 16:20:00"
    },
    {
        "id": "usr-104",
        "employee_id": "EMP004",
        "full_name": "Vikas Verma",
        "email": "vikas.verma@desireenergy.com",
        "phone": "9829045678",
        "password_hash": hash_password("Vikas@EMP004#2026"),
        "role": "Tender Head",
        "department": "Tender Team",
        "status": "Active",
        "permissions": ["eligibility", "bid_submission", "bid_details", "tender_result"],
        "assigned_projects": ["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"],
        "registered_at": "2026-08-04 10:10:00",
        "last_login": "2026-08-08 08:30:00"
    }
]

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
    """Create a new employee account with Role: User and Status: Pending Admin Approval."""
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

    # Check existing Employee ID or Email
    existing_emp = next((u for u in REGISTERED_USERS if u["employee_id"] == emp_id), None)
    if existing_emp:
        raise HTTPException(status_code=400, detail=f"Employee ID '{emp_id}' is already registered.")

    existing_email = next((u for u in REGISTERED_USERS if u["email"].lower() == email_clean), None)
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Email '{email_clean}' is already registered.")

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    new_user = {
        "id": f"usr-{int(time.time())}",
        "employee_id": emp_id,
        "full_name": full_name,
        "email": email_clean,
        "phone": phone_clean,
        "password_hash": hash_password(password_clean),
        "role": "User",
        "department": "Unassigned",
        "status": "Pending",  # Requires Admin Approval!
        "permissions": ["eligibility"],  # Access restricted to Eligibility Check ONLY until Admin Approval!
        "assigned_projects": ["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"],
        "registered_at": timestamp,
        "last_login": "Never"
    }

    REGISTERED_USERS.append(new_user)

    return {
        "status": "success",
        "message": "Your account has been created successfully. You can currently access Eligibility Checking. Additional modules will become available after Admin approval.",
        "user": {k: v for k, v in new_user.items() if k != "password_hash"}
    }


@router.post("/login")
async def user_login(payload: UserLoginPayload):
    """Authenticate User using Employee ID and Password."""
    emp_id = payload.employee_id.strip().upper()
    password_clean = payload.password.strip()

    if not emp_id or not password_clean:
        raise HTTPException(status_code=400, detail="Employee ID and Password are required.")

    user = next((u for u in REGISTERED_USERS if u["employee_id"] == emp_id), None)
    if not user:
        raise HTTPException(status_code=401, detail="Access Denied: Invalid Employee ID or password.")

    if user["password_hash"] != hash_password(password_clean):
        raise HTTPException(status_code=401, detail="Access Denied: Incorrect password.")

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    user["last_login"] = timestamp

    safe_user = {k: v for k, v in user.items() if k != "password_hash"}

    notice = None
    if user["status"] == "Pending":
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
