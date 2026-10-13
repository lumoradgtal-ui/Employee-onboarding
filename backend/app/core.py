from pydantic_settings import BaseSettings, SettingsConfigDict
from supabase import create_client, Client
from fastapi import Header, HTTPException
from typing import Optional

class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    cors_origins: str = "*"
    super_admin_emails: str = "testadmin@gmail.com,admin@cypherswift.com,sagarsagar49061@gmail.com"
    model_config = SettingsConfigDict(env_file=("backend/.env", ".env"), extra="ignore")

settings = Settings()
admin: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
public: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

def get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ",1)[1]
    try:
        user = public.auth.get_user(token).user
        if not user:
            raise Exception("invalid")
        return user
    except Exception:
        raise HTTPException(401, "Invalid or expired token")

def is_super_admin(user) -> bool:
    if not user or not getattr(user, 'email', None):
        return False
    u_email = user.email.lower().strip()
    configured = [e.strip().lower() for e in settings.super_admin_emails.split(",") if e.strip()]
    if u_email in configured:
        return True
    try:
        p = admin.table("profiles").select("is_super_admin").eq("id", user.id).maybe_single().execute()
        if p and p.data and p.data.get("is_super_admin") is True:
            return True
    except Exception:
        pass
    return False

def is_super_admin_id(user_id: str) -> bool:
    try:
        p = admin.table("profiles").select("email, is_super_admin").eq("id", user_id).maybe_single().execute()
        if p and p.data:
            if p.data.get("is_super_admin") is True:
                return True
            email = (p.data.get("email") or "").lower().strip()
            configured = [e.strip().lower() for e in settings.super_admin_emails.split(",") if e.strip()]
            if email in configured:
                return True
    except Exception:
        pass
    return False

def require_super_admin(authorization: Optional[str] = Header(None)):
    user = get_user(authorization)
    if not is_super_admin(user):
        raise HTTPException(403, "Access restricted to Platform System Owner / Super Admin.")
    return user

def membership(user_id: str, org_id: str):
    r = admin.table("organization_members").select("*").eq("organization_id", org_id).eq("user_id", user_id).eq("status","active").maybe_single().execute()
    return r.data

def require_org(user_id: str, org_id: str):
    m = membership(user_id, org_id)
    if not m:
        if is_super_admin_id(user_id):
            return {"organization_id": org_id, "user_id": user_id, "role": "owner", "status": "active"}
        raise HTTPException(403, "You are not a member of this organization")
    return m

def require_role(user_id: str, org_id: str, roles: list[str]):
    m = require_org(user_id, org_id)
    if is_super_admin_id(user_id):
        return m
    if m.get("role") not in roles:
        raise HTTPException(403, "Insufficient permissions")
    return m
