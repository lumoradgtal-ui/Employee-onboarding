from pydantic_settings import BaseSettings, SettingsConfigDict
from supabase import create_client, Client
from fastapi import Header, HTTPException
from typing import Optional

class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    cors_origins: str = "*"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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

def membership(user_id: str, org_id: str):
    r = admin.table("organization_members").select("*").eq("organization_id", org_id).eq("user_id", user_id).eq("status","active").maybe_single().execute()
    return r.data

def require_org(user_id: str, org_id: str):
    m = membership(user_id, org_id)
    if not m:
        raise HTTPException(403, "You are not a member of this organization")
    return m

def require_role(user_id: str, org_id: str, roles: list[str]):
    m = require_org(user_id, org_id)
    if m.get("role") not in roles:
        raise HTTPException(403, "Insufficient permissions")
    return m
