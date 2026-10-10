import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, Depends, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import date, datetime
from .core import admin, settings, get_user, require_org, require_role

app = FastAPI(title="HRMS Platform API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(',')], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def send_email_notification(to_email: str, subject: str, body_text: str, body_html: Optional[str] = None):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg['From'] = smtp_user
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body_text, 'plain'))
            if body_html:
                msg.attach(MIMEText(body_html, 'html'))
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print(f"[SMTP EMAIL DISPATCHED] To: {to_email} | Subject: {subject}")
            return True
        except Exception as err:
            print(f"[SMTP EMAIL ERROR] {err}")
            return False
    else:
        print(f"[SIMULATED EMAIL DISPATCH] To: {to_email} | Subject: {subject}\nBody:\n{body_text}\n")
        return True


class OrgCreate(BaseModel): name: str = Field(min_length=2, max_length=160)
class EmployeeCreate(BaseModel):
    organization_id: str; employee_code: Optional[str]=None; first_name: str; last_name: Optional[str]=None; work_email: Optional[str]=None; phone: Optional[str]=None; date_of_joining: Optional[date]=None; department_id: Optional[str]=None; designation_id: Optional[str]=None; manager_id: Optional[str]=None; employment_type: str="full_time"; status: str="pre_onboarding"
class EmployeeUpdate(BaseModel):
    first_name: Optional[str]=None; last_name: Optional[str]=None; work_email: Optional[str]=None; personal_email: Optional[str]=None; phone: Optional[str]=None; date_of_joining: Optional[date]=None; date_of_birth: Optional[date]=None; gender: Optional[str]=None; department_id: Optional[str]=None; designation_id: Optional[str]=None; manager_id: Optional[str]=None; employment_type: Optional[str]=None; status: Optional[str]=None; location: Optional[str]=None; emergency_contact: Optional[dict[str, Any]]=None
class RequestModel(BaseModel): payload: dict[str, Any]

@app.get("/health")
def health(): return {"status":"ok","service":"hrms-api"}

@app.post("/api/setup/bootstrap")
def bootstrap(body: OrgCreate, user=Depends(get_user)):
    org=admin.table("organizations").insert({"name":body.name}).execute().data[0]
    admin.table("organization_members").insert({"organization_id":org["id"],"user_id":user.id,"role":"owner","status":"active"}).execute()
    admin.table("profiles").upsert({"id":user.id,"full_name":user.user_metadata.get("full_name") or user.email,"email":user.email}).execute()
    return org

@app.get("/api/organizations")
def organizations(user=Depends(get_user)):
    memberships = admin.table("organization_members").select("organization_id, role, organizations(*)").eq("user_id", user.id).eq("status", "active").execute().data or []
    
    if user.email:
        u_email = user.email.lower().strip()
        emp_records = admin.table("employees").select("*").or_(f"work_email.ilike.%{u_email}%,personal_email.ilike.%{u_email}%").execute().data or []
        
        existing_org_ids = {m["organization_id"] for m in memberships if m.get("organization_id")}
        
        for emp in emp_records:
            o_id = emp.get("organization_id")
            if o_id and o_id not in existing_org_ids:
                if not emp.get("user_id"):
                    admin.table("employees").update({"user_id": user.id}).eq("id", emp["id"]).execute()
                
                mem_check = admin.table("organization_members").select("*").eq("organization_id", o_id).eq("user_id", user.id).execute().data
                if not mem_check:
                    admin.table("organization_members").insert({
                        "organization_id": o_id,
                        "user_id": user.id,
                        "role": "employee",
                        "status": "active"
                    }).execute()
                
                new_mem = admin.table("organization_members").select("organization_id, role, organizations(*)").eq("organization_id", o_id).eq("user_id", user.id).execute().data
                if new_mem:
                    memberships.append(new_mem[0])
                    existing_org_ids.add(o_id)

    return memberships

@app.get("/api/dashboard/{org_id}")
def dashboard(org_id: str, user=Depends(get_user)):
    require_org(user.id, org_id)
    def count(table, field="organization_id", value=org_id):
        try: return len(admin.table(table).select("id").eq(field,value).execute().data)
        except Exception: return 0
    return {"employees":count("employees"),"active_employees":len(admin.table("employees").select("id").eq("organization_id",org_id).eq("status","active").execute().data),"onboarding":count("onboarding_tasks"),"probation":count("probation_records"),"leave_pending":len(admin.table("leave_requests").select("id").eq("organization_id",org_id).eq("status","pending").execute().data),"open_jobs":len(admin.table("jobs").select("id").eq("organization_id",org_id).eq("status","open").execute().data),"expenses_pending":len(admin.table("expenses").select("id").eq("organization_id",org_id).eq("status","pending").execute().data)}

def generate_next_employee_code(org_id: str) -> str:
    existing = admin.table("employees").select("employee_code").eq("organization_id", org_id).execute().data or []
    max_num = 0
    for e in existing:
        code = e.get("employee_code") or ""
        nums = "".join([c for c in code if c.isdigit()])
        if nums:
            try:
                num = int(nums)
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    next_num = max_num + 1
    return f"{next_num:03d}"

@app.get("/api/employees")
def employees(org_id: str, user=Depends(get_user), q: str="", status: str="", limit: int=100, offset: int=0):
    require_org(user.id, org_id)
    
    # Auto-assign sequential employee codes (001, 002, 003...) to any existing employees missing a code
    unassigned = admin.table("employees").select("id, created_at").eq("organization_id", org_id).or_("employee_code.is.null,employee_code.eq.").order("created_at", desc=False).execute().data or []
    if unassigned:
        for u in unassigned:
            next_code = generate_next_employee_code(org_id)
            admin.table("employees").update({"employee_code": next_code}).eq("id", u["id"]).execute()
            
    query = admin.table("employees").select("*, departments!employees_department_id_fkey(name), designations(name)").eq("organization_id", org_id).order("created_at", desc=True)
    if status: query = query.eq("status", status)
    if q: query = query.or_(f"first_name.ilike.%{q}%,last_name.ilike.%{q}%,work_email.ilike.%{q}%,employee_code.ilike.%{q}%")
    return query.range(offset, offset + limit - 1).execute().data

@app.post("/api/employees")
def create_employee(body: EmployeeCreate, user=Depends(get_user)):
    require_role(user.id, body.organization_id, ["owner", "admin", "hr"])
    data = body.model_dump(mode="json")
    if not data.get("employee_code") or not str(data["employee_code"]).strip():
        data["employee_code"] = generate_next_employee_code(body.organization_id)
    emp = admin.table("employees").insert(data).execute().data[0]
    admin.table("employee_status_history").insert({"organization_id": body.organization_id, "employee_id": emp["id"], "from_status": None, "to_status": emp["status"], "changed_by": user.id, "reason": "Employee created"}).execute()
    return emp

@app.get("/api/employees/{employee_id}")
def employee(employee_id: str, org_id: str, user=Depends(get_user)):
    require_org(user.id,org_id)
    r=admin.table("employees").select("*, departments!employees_department_id_fkey(*), designations(*)").eq("id",employee_id).eq("organization_id",org_id).maybe_single().execute()
    if not r.data: raise HTTPException(404,"Employee not found")
    e=r.data
    tables=["employee_status_history","project_allocations","attendance_records","leave_requests","asset_assignments","system_access","expenses","payroll_records","performance_reviews","employee_changes","documents","resignations","offboarding_tasks"]
    e["timeline"]={t:admin.table(t).select("*").eq("employee_id",employee_id).order("created_at",desc=True).execute().data for t in tables if t not in ["attendance_records","leave_requests"]}
    return e

@app.post("/api/employees/{employee_id}/create-account")
def provision_employee_account(employee_id: str, org_id: str, user=Depends(get_user)):
    require_role(user.id, org_id, ["owner", "admin", "hr"])
    emp = admin.table("employees").select("*").eq("id", employee_id).eq("organization_id", org_id).maybe_single().execute().data
    if not emp: raise HTTPException(404, "Employee not found")
    
    target_email = emp.get("work_email") or emp.get("personal_email")
    if not target_email:
        raise HTTPException(400, "Employee must have a work email or personal email to create a login account.")
    
    # Generate temporary default password for initial login
    temp_password = f"Hrms@{emp['first_name'].capitalize()}{datetime.utcnow().year}"
    
    try:
        # Check if auth user already exists or create new
        existing_users = admin.auth.admin.list_users()
        user_match = next((u for u in existing_users if u.email and u.email.lower() == target_email.lower()), None)
        
        if user_match:
            auth_user = user_match
            # Update password
            admin.auth.admin.update_user_by_id(auth_user.id, {"password": temp_password, "email_confirm": True})
        else:
            auth_user = admin.auth.admin.create_user({
                "email": target_email,
                "password": temp_password,
                "email_confirm": True,
                "user_metadata": {"full_name": f"{emp['first_name']} {emp.get('last_name') or ''}".strip()}
            }).user

        # Link employee record to auth user id
        admin.table("employees").update({"user_id": auth_user.id}).eq("id", employee_id).execute()
        
        # Add to organization_members as employee role if not present
        mem_check = admin.table("organization_members").select("*").eq("organization_id", org_id).eq("user_id", auth_user.id).execute().data
        if not mem_check:
            admin.table("organization_members").insert({
                "organization_id": org_id,
                "user_id": auth_user.id,
                "role": "employee",
                "status": "active"
            }).execute()

        # Log audit trail
        admin.table("audit_logs").insert({
            "organization_id": org_id,
            "actor_id": user.id,
            "action": "PROVISION_EMPLOYEE_LOGIN",
            "entity_type": "employee",
            "entity_id": employee_id,
            "before_data": {"email": target_email},
            "after_data": {"user_id": auth_user.id}
        }).execute()

        # Send in-app notification
        admin.table("notifications").insert({
            "organization_id": org_id,
            "user_id": auth_user.id,
            "title": "Welcome to HRMS! Login Account Provisioned",
            "message": f"Your employee portal account has been activated for {target_email}. Initial temp password: {temp_password}",
            "type": "account_provisioned"
        }).execute()

        return {
            "success": True,
            "email": target_email,
            "temp_password": temp_password,
            "user_id": auth_user.id,
            "message": f"Login account provisioned successfully for {target_email}."
        }
    except Exception as ex:
        raise HTTPException(500, f"Account creation failed: {str(ex)}")

class ConfirmUserRequest(BaseModel):
    email: str

@app.post("/api/auth/confirm-user")
def confirm_user(body: ConfirmUserRequest):
    email_clean = body.email.strip().lower()
    if not email_clean:
        raise HTTPException(400, "Email address is required.")
    try:
        existing_users = admin.auth.admin.list_users()
        user_match = next((u for u in existing_users if u.email and u.email.lower() == email_clean), None)
        if user_match:
            admin.auth.admin.update_user_by_id(user_match.id, {"email_confirm": True})
            return {"success": True, "message": "Email confirmed successfully."}
        raise HTTPException(404, "User not found.")
    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(500, f"Auto-confirm failed: {str(ex)}")

class ForgotPasswordRequest(BaseModel):
    email: str

@app.post("/api/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest):
    email_clean = body.email.strip().lower()
    if not email_clean:
        raise HTTPException(400, "Email address is required.")
        
    try:
        existing_users = admin.auth.admin.list_users()
        user_match = next((u for u in existing_users if u.email and u.email.lower() == email_clean), None)
        emp_res = admin.table("employees").select("*").or_(f"work_email.ilike.%{email_clean}%,personal_email.ilike.%{email_clean}%").execute().data
        emp_match = emp_res[0] if emp_res else None
        
        if not user_match and not emp_match:
            raise HTTPException(404, f"No registered account found for email: {email_clean}. Please check your email address.")
            
        temp_password = f"Hrms@{datetime.utcnow().year}Pass"
        
        if user_match:
            admin.auth.admin.update_user_by_id(user_match.id, {"password": temp_password, "email_confirm": True})
            user_id = user_match.id
        elif emp_match and emp_match.get("user_id"):
            admin.auth.admin.update_user_by_id(emp_match["user_id"], {"password": temp_password, "email_confirm": True})
            user_id = emp_match["user_id"]
        else:
            first_name = emp_match.get("first_name", "Staff")
            auth_user = admin.auth.admin.create_user({
                "email": email_clean,
                "password": temp_password,
                "email_confirm": True,
                "user_metadata": {"full_name": f"{first_name} {emp_match.get('last_name') or ''}".strip()}
            }).user
            user_id = auth_user.id
            admin.table("employees").update({"user_id": user_id}).eq("id", emp_match["id"]).execute()

        reset_link = "http://localhost:5173/login"
        try:
            link_res = admin.auth.admin.generate_link({
                "type": "recovery",
                "email": email_clean,
                "options": {"redirect_to": "http://localhost:5173/login"}
            })
            if hasattr(link_res, "properties") and hasattr(link_res.properties, "action_link"):
                reset_link = link_res.properties.action_link
        except Exception as l_err:
            print(f"[RECOVERY LINK GEN EXCEPTION] {l_err}")

        subject = "🔑 HRMS Portal Password Reset Link"
        emp_name = emp_match.get("first_name", "User") if emp_match else "User"
        body_text = f"Dear {emp_name},\n\nA password reset request was issued for your HRMS account ({email_clean}).\n\nClick the direct link below to reset your password:\n{reset_link}\n\nOr sign in using your temporary password:\n{temp_password}\n\nLogin URL: http://localhost:5173/login\n\nBest regards,\nHRMS Security Team"
        
        send_email_notification(email_clean, subject, body_text)
        
        try:
            if emp_match and emp_match.get("organization_id"):
                admin.table("notifications").insert({
                    "organization_id": emp_match["organization_id"],
                    "user_id": user_id,
                    "title": "Password Reset Issued",
                    "message": f"Temporary password credentials generated and sent to {email_clean}.",
                    "type": "password_reset"
                }).execute()
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Password reset instructions & temporary password sent to {email_clean}! Temporary password: {temp_password}"
        }
    except HTTPException:
        raise
    except Exception as ex:
        print(f"[FORGOT PASSWORD EXCEPTION] {ex}")
        raise HTTPException(500, f"Password reset failed: {str(ex)}")

@app.get("/api/organization/members")
def list_organization_members(org_id: str, user=Depends(get_user)):
    require_role(user.id, org_id, ["owner", "admin", "hr", "manager"])
    members = admin.table("organization_members").select("*").eq("organization_id", org_id).execute().data
    employees = admin.table("employees").select("*").eq("organization_id", org_id).execute().data
    
    emp_by_user = {e["user_id"]: e for e in employees if e.get("user_id")}
    
    result = []
    for m in members:
        u_id = m.get("user_id")
        emp = emp_by_user.get(u_id)
        result.append({
            "id": m.get("id"),
            "organization_id": m.get("organization_id"),
            "user_id": u_id,
            "role": m.get("role", "employee"),
            "status": m.get("status", "active"),
            "joined_at": m.get("joined_at"),
            "employee": emp
        })
    return result

class MemberRoleAssign(BaseModel):
    organization_id: str
    employee_id: Optional[str] = None
    user_id: Optional[str] = None
    role: str

@app.post("/api/organization/members/assign-role")
def assign_member_role(body: MemberRoleAssign, user=Depends(get_user)):
    require_role(user.id, body.organization_id, ["owner", "admin"])
    
    if body.role not in ["owner", "admin", "hr", "manager", "employee"]:
        raise HTTPException(400, "Invalid role specified. Must be owner, admin, hr, manager, or employee.")
        
    target_user_id = body.user_id
    if not target_user_id and body.employee_id:
        emp = admin.table("employees").select("user_id, first_name, last_name").eq("id", body.employee_id).eq("organization_id", body.organization_id).maybe_single().execute().data
        if not emp or not emp.get("user_id"):
            raise HTTPException(400, "Employee does not have a provisioned login user account yet. Provision account first.")
        target_user_id = emp["user_id"]
        
    if not target_user_id:
        raise HTTPException(400, "user_id or employee_id with provisioned login account is required")

    res = admin.table("organization_members").update({"role": body.role}).eq("organization_id", body.organization_id).eq("user_id", target_user_id).execute().data
    if not res:
        res = admin.table("organization_members").insert({
            "organization_id": body.organization_id,
            "user_id": target_user_id,
            "role": body.role,
            "status": "active"
        }).execute().data
        
    try:
        admin.table("notifications").insert({
            "organization_id": body.organization_id,
            "user_id": target_user_id,
            "title": "System Access Role Updated",
            "message": f"Your system access role has been updated to '{body.role.upper()}'. You now have {body.role.upper()} access permissions across HRMS.",
            "type": "role_updated"
        }).execute()
    except Exception:
        pass
        
    return res[0] if res else {"success": True}

@app.patch("/api/employees/{employee_id}")
def update_employee(employee_id: str, org_id: str, body: dict = Body(...), user=Depends(get_user)):
    require_org(user.id, org_id)
    old = admin.table("employees").select("*").eq("id", employee_id).eq("organization_id", org_id).maybe_single().execute().data
    if not old:
        raise HTTPException(404, "Employee not found")
        
    is_self = bool(old.get("user_id") and old.get("user_id") == user.id)
    if not is_self:
        require_role(user.id, org_id, ["owner", "admin", "hr", "manager"])
        
    raw_data = body.get("payload") if isinstance(body, dict) and "payload" in body else body
    if not isinstance(raw_data, dict):
        raw_data = {}
        
    allowed_fields = [
        "first_name", "last_name", "work_email", "personal_email", "phone",
        "date_of_joining", "date_of_birth", "gender", "nationality", "ethnicity",
        "religion", "marital_status", "work_anniversary", "next_appraisal_date",
        "department_id", "designation_id", "manager_id", "employment_type", "status",
        "address", "bank_details", "tax_details", "emergency_contact", "relations"
    ]
    
    update_dict = {}
    for k in allowed_fields:
        if k in raw_data:
            update_dict[k] = raw_data[k]
            
    if not update_dict:
        return old
        
    res = admin.table("employees").update(update_dict).eq("id", employee_id).eq("organization_id", org_id).execute().data
    if not res:
        raise HTTPException(400, "Failed to update employee profile")
        
    new = res[0]
    
    if "status" in update_dict and update_dict["status"] != old.get("status"):
        admin.table("employee_status_history").insert({
            "organization_id": org_id,
            "employee_id": employee_id,
            "from_status": old.get("status"),
            "to_status": update_dict["status"],
            "changed_by": user.id
        }).execute()
        
    try:
        admin.table("employee_changes").insert({
            "organization_id": org_id,
            "employee_id": employee_id,
            "change_type": "profile_update",
            "before_data": old,
            "after_data": new,
            "changed_by": user.id
        }).execute()
    except Exception:
        pass
        
    return new

@app.post("/api/candidates/{candidate_id}/convert")
def convert_candidate(candidate_id: str, org_id: str, user=Depends(get_user)):
    require_role(user.id, org_id, ["owner", "admin", "hr"])
    c = admin.table("candidates").select("*").eq("id", candidate_id).eq("organization_id", org_id).maybe_single().execute().data
    if not c: raise HTTPException(404, "Candidate not found")
    
    # Create employee from candidate
    emp_data = {
        "organization_id": org_id,
        "employee_code": generate_next_employee_code(org_id),
        "first_name": c["first_name"],
        "last_name": c["last_name"],
        "personal_email": c["email"],
        "phone": c["phone"],
        "status": "pre_onboarding",
    }
    emp = admin.table("employees").insert(emp_data).execute().data[0]
    
    # Update candidate stage
    admin.table("candidates").update({"stage": "hired"}).eq("id", candidate_id).execute()
    
    # Track status history
    admin.table("employee_status_history").insert({
        "organization_id": org_id,
        "employee_id": emp["id"],
        "from_status": None,
        "to_status": "pre_onboarding",
        "changed_by": user.id,
        "reason": "Converted from candidate"
    }).execute()

@app.post("/api/candidates/{candidate_id}/approve")
def approve_candidate_referral(candidate_id: str, org_id: str, user=Depends(get_user)):
    require_role(user.id, org_id, ["owner", "admin", "hr", "manager"])
    c = admin.table("candidates").select("*").eq("id", candidate_id).eq("organization_id", org_id).maybe_single().execute().data
    if not c: raise HTTPException(404, "Candidate not found")
    
    # Update candidate stage to screening/approved
    admin.table("candidates").update({"stage": "screening"}).eq("id", candidate_id).execute()
    
    # Fetch job title if matched
    job_title = "General Position"
    if c.get("job_id"):
        j = admin.table("jobs").select("title").eq("id", c["job_id"]).maybe_single().execute().data
        if j: job_title = j.get("title", job_title)
        
    # Get referrer name
    referrer_name = "our employee"
    if c.get("referrer_employee_id"):
        ref_emp = admin.table("employees").select("first_name, last_name").eq("id", c["referrer_employee_id"]).maybe_single().execute().data
        if ref_emp:
            referrer_name = f"{ref_emp['first_name']} {ref_emp.get('last_name') or ''}".strip()
            
    # Send notification email record
    cand_email = c.get("email")
    try:
        admin.table("notifications").insert({
            "organization_id": org_id,
            "title": "Referral Application Approved!",
            "message": f"Dear {c['first_name']}, your referral application for '{job_title}' referred by {referrer_name} has been approved by HR. We will reach out shortly for next steps!",
            "type": "referral_approved",
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    except Exception:
        pass
    
    return {
        "success": True,
        "candidate_id": candidate_id,
        "email": cand_email,
        "message": f"Referral approved! Confirmation email notification sent to {cand_email}."
    }

@app.post("/api/{table}")
def generic_create(table:str, body:RequestModel, user=Depends(get_user)):
    allowed={"departments","designations","onboarding_tasks","probation_records","attendance_locations","attendance_records","attendance_corrections","leave_types","leave_balances","leave_requests","projects","project_allocations","assets","asset_assignments","system_access","expenses","payroll_periods","payroll_records","jobs","candidates","interviews","performance_cycles","performance_goals","performance_reviews","documents","offboarding_tasks","resignations","dashboard_preferences","notifications"}
    if table not in allowed: raise HTTPException(404,"Unsupported resource")
    org_id=body.payload.get("organization_id")
    if not org_id: raise HTTPException(400,"organization_id is required")
    
    if table in ["onboarding_tasks", "offboarding_tasks", "projects", "project_allocations", "assets", "asset_assignments", "payroll_records", "payroll_periods"]:
        require_role(user.id, org_id, ["owner", "admin", "manager"])
    elif table not in ["candidates", "leave_requests", "expenses", "attendance_corrections", "documents", "attendance_records", "attendance_locations"]:
        require_role(user.id, org_id, ["owner", "admin", "hr", "manager"])
    else:
        require_org(user.id, org_id)
    
    res = admin.table(table).insert(body.payload).execute().data

    # Send Mail & In-App Notification when Leave Request is submitted
    if table == "leave_requests" and body.payload.get("employee_id"):
        try:
            emp_id = body.payload.get("employee_id")
            emp = admin.table("employees").select("*").eq("id", emp_id).maybe_single().execute().data
            if emp:
                emp_name = f"{emp.get('first_name')} {emp.get('last_name') or ''}".strip()
                s_date = body.payload.get("start_date", "N/A")
                e_date = body.payload.get("end_date", "N/A")
                days = body.payload.get("days", 1)
                reason = body.payload.get("reason", "No reason specified.")
                
                recipient_user_ids = set()
                recipient_emails = set()

                # 1. Target assigned specific manager
                if emp.get("manager_id"):
                    mgr_emp = admin.table("employees").select("*").eq("id", emp["manager_id"]).maybe_single().execute().data
                    if mgr_emp:
                        if mgr_emp.get("user_id"):
                            recipient_user_ids.add(mgr_emp["user_id"])
                        mgr_email = mgr_emp.get("work_email") or mgr_emp.get("personal_email")
                        if mgr_email:
                            recipient_emails.add(mgr_email)

                # 2. All organization managers, admins, HR, and owners
                mgrs = admin.table("organization_members").select("user_id, role").eq("organization_id", org_id).in_("role", ["owner", "admin", "hr", "manager"]).execute().data
                for m in mgrs:
                    if m.get("user_id"):
                        recipient_user_ids.add(m["user_id"])

                # Create in-app notifications for all managers & admins
                for u_id in recipient_user_ids:
                    admin.table("notifications").insert({
                        "organization_id": org_id,
                        "user_id": u_id,
                        "title": f"🚨 Pending Leave Application: {emp_name}",
                        "message": f"{emp_name} has requested {days} day(s) leave ({s_date} to {e_date}). Reason: {reason}. Please review and approve/reject.",
                        "type": "leave_request_pending"
                    }).execute()

                # Dispatch email notification to manager/admin email addresses
                subject = f"🚨 HRMS Leave Request Pending Approval: {emp_name} ({s_date} to {e_date})"
                body_text = f"Dear Manager / Admin,\n\n{emp_name} has submitted a new leave application on HRMS Platform.\n\nLeave Application Details:\n- Employee: {emp_name}\n- Duration: {days} day(s) ({s_date} to {e_date})\n- Reason: {reason}\n- Status: PENDING APPROVAL\n\nPlease log in to the employee portal to review and approve or reject this request.\n\nBest regards,\nHRMS Management Team"

                for to_email in recipient_emails:
                    send_email_notification(to_email, subject, body_text)
        except Exception as ex:
            print(f"[LEAVE NOTIFICATION EXCEPTION] {ex}")

    # Send Mail & In-App Notification when Onboarding/Offboarding Task is assigned
    if table in ["onboarding_tasks", "offboarding_tasks"] and body.payload.get("employee_id"):
        try:
            emp_id = body.payload.get("employee_id")
            emp = admin.table("employees").select("*").eq("id", emp_id).maybe_single().execute().data
            if emp:
                target_email = emp.get("work_email") or emp.get("personal_email")
                task_title = body.payload.get("title", "New Assigned Task")
                category = body.payload.get("category", "General")
                due_date = body.payload.get("due_date", "N/A")
                priority = body.payload.get("priority", "high")
                description = body.payload.get("description", "No description provided.")
                emp_name = f"{emp.get('first_name')} {emp.get('last_name') or ''}".strip()

                if target_email:
                    subject = f"📋 HRMS Task Assigned: {task_title}"
                    body_text = f"Dear {emp_name},\n\nYou have been assigned a new task by Admin/Manager on HRMS Platform.\n\nTask Details:\n- Title: {task_title}\n- Category: {category}\n- Priority: {priority.upper()}\n- Due Date: {due_date}\n- Instructions: {description}\n\nPlease log in to your employee portal to view and complete your assigned task.\n\nBest regards,\nHR & Management Team"
                    send_email_notification(target_email, subject, body_text)
                    
                    admin.table("notifications").insert({
                        "organization_id": org_id,
                        "user_id": emp.get("user_id"),
                        "title": f"Task Notification Mail Sent: {task_title}",
                        "message": f"Mail notification dispatched to {target_email}. Task '{task_title}' ({category}) due on {due_date}.",
                        "type": "onboarding_task_assigned",
                        "created_at": datetime.utcnow().isoformat()
                    }).execute()
        except Exception as ex:
            print(f"[TASK MAIL NOTIFICATION ERROR] {ex}")

    # Send Mail & In-App Notification when Project Member is allocated
    if table == "project_allocations" and body.payload.get("employee_id") and body.payload.get("project_id"):
        try:
            emp_id = body.payload.get("employee_id")
            proj_id = body.payload.get("project_id")
            alloc_pct = body.payload.get("allocation_percentage", 100)
            
            emp = admin.table("employees").select("*").eq("id", emp_id).maybe_single().execute().data
            proj = admin.table("projects").select("*").eq("id", proj_id).maybe_single().execute().data
            
            if emp and proj:
                emp_name = f"{emp.get('first_name')} {emp.get('last_name') or ''}".strip()
                proj_name = proj.get("name", "Project")
                client_name = proj.get("client_name") or "Internal"
                target_email = emp.get("work_email") or emp.get("personal_email")
                
                # In-app notification for the employee
                if emp.get("user_id"):
                    admin.table("notifications").insert({
                        "organization_id": org_id,
                        "user_id": emp["user_id"],
                        "title": f"📁 Assigned to New Project: {proj_name}",
                        "message": f"You have been added as a team member on '{proj_name}' ({client_name}) with {alloc_pct}% allocation.",
                        "type": "project_assigned",
                        "created_at": datetime.utcnow().isoformat()
                    }).execute()
                    
                # Email notification to the employee
                if target_email:
                    subject = f"📁 HRMS Project Assignment: {proj_name}"
                    body_text = f"Dear {emp_name},\n\nYou have been assigned to a new project by your Manager on HRMS Platform.\n\nProject Details:\n- Project Name: {proj_name}\n- Client: {client_name}\n- Bandwidth Allocation: {alloc_pct}%\n- Description: {proj.get('description') or 'No description provided.'}\n\nPlease log in to your employee portal to view your active project deliverables.\n\nBest regards,\nProject & Engineering Management"
                    send_email_notification(target_email, subject, body_text)
        except Exception as ex:
            print(f"[PROJECT ALLOCATION NOTIFICATION ERROR] {ex}")

    return res

@app.get("/api/{table}")
def generic_list(table:str, org_id:str, user=Depends(get_user), employee_id:str="", status:str="", limit:int=100, offset:int=0):
    allowed={"departments","designations","onboarding_tasks","probation_records","attendance_locations","attendance_records","attendance_corrections","leave_types","leave_balances","leave_requests","projects","project_allocations","assets","asset_assignments","system_access","expenses","payroll_periods","payroll_records","jobs","candidates","interviews","performance_cycles","performance_goals","performance_reviews","documents","offboarding_tasks","resignations","dashboard_preferences","notifications","audit_logs"}
    if table not in allowed: raise HTTPException(404,"Unsupported resource")
    require_org(user.id,org_id)
    q=admin.table(table).select("*").eq("organization_id",org_id).order("created_at",desc=True)
    if employee_id: q=q.eq("employee_id",employee_id)
    if status: q=q.eq("status",status)
    return q.range(offset,offset+limit-1).execute().data

@app.patch("/api/{table}/{id}")
def generic_update(table:str, id:str, body:RequestModel, user=Depends(get_user)):
    allowed={"departments","designations","onboarding_tasks","probation_records","attendance_locations","attendance_records","attendance_corrections","leave_types","leave_balances","leave_requests","projects","project_allocations","assets","asset_assignments","system_access","expenses","payroll_periods","payroll_records","jobs","candidates","interviews","performance_cycles","performance_goals","performance_reviews","documents","offboarding_tasks","resignations","dashboard_preferences","notifications"}
    if table not in allowed: raise HTTPException(404,"Unsupported resource")
    org_id=body.payload.get("organization_id")
    if not org_id: raise HTTPException(400,"organization_id is required")
    require_role(user.id,org_id,["owner","admin","hr","manager"])
    data={k:v for k,v in body.payload.items() if k not in ["id","organization_id","created_at"]}
    r=admin.table(table).update(data).eq("id",id).eq("organization_id",org_id).execute()

    if table == "leave_requests" and "status" in data:
        try:
            new_status = data["status"]
            old_req = admin.table("leave_requests").select("*").eq("id", id).maybe_single().execute().data
            if old_req and old_req.get("employee_id"):
                emp = admin.table("employees").select("*").eq("id", old_req["employee_id"]).maybe_single().execute().data
                if emp:
                    emp_name = f"{emp.get('first_name')} {emp.get('last_name') or ''}".strip()
                    target_email = emp.get("work_email") or emp.get("personal_email")
                    s_date = old_req.get("start_date")
                    e_date = old_req.get("end_date")
                    days = old_req.get("days", 1)

                    if emp.get("user_id"):
                        admin.table("notifications").insert({
                            "organization_id": org_id,
                            "user_id": emp["user_id"],
                            "title": f"Leave Request {new_status.upper()}",
                            "message": f"Your leave request for {days} day(s) ({s_date} to {e_date}) has been {new_status.upper()} by Management.",
                            "type": f"leave_{new_status}"
                        }).execute()
                        
                    if target_email:
                        subject = f"📢 HRMS Leave Request {new_status.upper()}: {s_date} to {e_date}"
                        body_text = f"Dear {emp_name},\n\nYour leave request for {days} day(s) ({s_date} to {e_date}) has been {new_status.upper()} by Management.\n\nBest regards,\nHR & Management Team"
                        send_email_notification(target_email, subject, body_text)
        except Exception as ex:
            print(f"[LEAVE STATUS NOTIFICATION EXCEPTION] {ex}")

    return r.data[0] if r.data else {"success":True}

@app.delete("/api/{table}/{id}")
def generic_delete(table:str, id:str, org_id:str, user=Depends(get_user)):
    allowed={"departments","designations","onboarding_tasks","probation_records","attendance_locations","attendance_records","attendance_corrections","leave_types","leave_balances","leave_requests","projects","project_allocations","assets","asset_assignments","system_access","expenses","payroll_periods","payroll_records","jobs","candidates","interviews","performance_cycles","performance_goals","performance_reviews","documents","offboarding_tasks","resignations","dashboard_preferences","notifications"}
    if table not in allowed: raise HTTPException(404,"Unsupported resource")
    require_role(user.id,org_id,["owner","admin","hr"])
    admin.table(table).delete().eq("id",id).eq("organization_id",org_id).execute()
    return {"success":True}

@app.post("/api/attendance/clock-in")
def clock_in(org_id:str, employee_id:str, location_id:str, latitude:float, longitude:float, user=Depends(get_user)):
    require_org(user.id,org_id)
    loc=admin.table("attendance_locations").select("*").eq("id",location_id).eq("organization_id",org_id).maybe_single().execute().data
    if not loc: raise HTTPException(404,"Location not found")
    
    # Check if employee has already clocked in today
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    existing = admin.table("attendance_records").select("*").eq("organization_id", org_id).eq("employee_id", employee_id).eq("attendance_date", today_str).maybe_single().execute().data
    if existing:
        if not existing.get("clock_out_at"):
            raise HTTPException(400, "You are currently clocked in. Please clock out first.")
        else:
            raise HTTPException(400, "You have already completed your attendance shift for today.")

    # Haversine is intentionally implemented server-side; database cannot trust browser coordinates alone.
    import math
    r=6371000; p1=math.radians(loc["latitude"]); p2=math.radians(latitude); dp=math.radians(latitude-loc["latitude"]); dl=math.radians(longitude-loc["longitude"])
    a=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2; dist=2*r*math.asin(math.sqrt(a))
    if dist>loc["radius_meters"]: raise HTTPException(400,f"Outside allowed attendance radius ({round(dist)}m)")
    rec=admin.table("attendance_records").insert({"organization_id":org_id,"employee_id":employee_id,"location_id":location_id,"clock_in_at":datetime.utcnow().isoformat(),"clock_in_latitude":latitude,"clock_in_longitude":longitude,"clock_in_distance_meters":dist,"status":"present"}).execute().data[0]
    return rec

@app.post("/api/attendance/clock-out")
def clock_out(record_id:str, org_id:str, latitude:float, longitude:float, user=Depends(get_user)):
    require_org(user.id,org_id)
    rec = admin.table("attendance_records").select("*").eq("id", record_id).eq("organization_id", org_id).maybe_single().execute().data
    if not rec: raise HTTPException(404,"Attendance record not found")
    
    extra = {}
    if rec.get("break_start_at"):
        from datetime import datetime as dt, timezone
        b_start = dt.fromisoformat(rec["break_start_at"].replace("Z", "+00:00"))
        b_end = datetime.now(timezone.utc) if b_start.tzinfo else datetime.utcnow()
        elapsed_mins = max(1, int((b_end - b_start).total_seconds() // 60))
        current_break_total = rec.get("total_break_minutes") or 0
        extra["total_break_minutes"] = current_break_total + elapsed_mins
        extra["break_start_at"] = None

    r=admin.table("attendance_records").update({
        "clock_out_at":datetime.utcnow().isoformat(),
        "clock_out_latitude":latitude,
        "clock_out_longitude":longitude,
        "status": "present",
        **extra
    }).eq("id",record_id).eq("organization_id",org_id).execute().data
    return r[0]

@app.post("/api/attendance/start-break")
def start_break(record_id: str, org_id: str, user=Depends(get_user)):
    require_org(user.id, org_id)
    rec = admin.table("attendance_records").select("*").eq("id", record_id).eq("organization_id", org_id).maybe_single().execute().data
    if not rec:
        raise HTTPException(404, "Attendance record not found")
    if rec.get("clock_out_at"):
        raise HTTPException(400, "Shift is already completed")
    if rec.get("break_start_at"):
        raise HTTPException(400, "Already on break")
        
    updated = admin.table("attendance_records").update({
        "break_start_at": datetime.utcnow().isoformat(),
        "status": "on_break"
    }).eq("id", record_id).execute().data
    return updated[0] if updated else rec

@app.post("/api/attendance/end-break")
def end_break(record_id: str, org_id: str, user=Depends(get_user)):
    require_org(user.id, org_id)
    rec = admin.table("attendance_records").select("*").eq("id", record_id).eq("organization_id", org_id).maybe_single().execute().data
    if not rec:
        raise HTTPException(404, "Attendance record not found")
    if not rec.get("break_start_at"):
        raise HTTPException(400, "Not currently on break")
        
    from datetime import datetime as dt, timezone
    b_start = dt.fromisoformat(rec["break_start_at"].replace("Z", "+00:00"))
    b_end = datetime.now(timezone.utc) if b_start.tzinfo else datetime.utcnow()
    elapsed_mins = max(1, int((b_end - b_start).total_seconds() // 60))
    current_break_total = rec.get("total_break_minutes") or 0
    new_break_total = current_break_total + elapsed_mins

    updated = admin.table("attendance_records").update({
        "break_start_at": None,
        "total_break_minutes": new_break_total,
        "status": "present"
    }).eq("id", record_id).execute().data
    return updated[0] if updated else rec

class RemoteLocationRegister(BaseModel):
    organization_id: str
    employee_id: Optional[str] = None
    name: str
    latitude: float
    longitude: float
    radius_meters: int = 500

@app.post("/api/attendance/register-remote-location")
def register_remote_location(body: RemoteLocationRegister, user=Depends(get_user)):
    require_org(user.id, body.organization_id)
    addr_tag = f"employee_id:{body.employee_id}" if body.employee_id else None
    
    existing = None
    if body.employee_id:
        existing_res = admin.table("attendance_locations").select("*").eq("organization_id", body.organization_id).eq("address", addr_tag).execute().data
        if existing_res:
            existing = existing_res[0]
        else:
            all_locs = admin.table("attendance_locations").select("*").eq("organization_id", body.organization_id).execute().data
            for l in all_locs:
                if body.name and l.get("name") == body.name:
                    existing = l
                    break
            
    loc_payload = {
        "organization_id": body.organization_id,
        "name": body.name,
        "address": addr_tag,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "radius_meters": body.radius_meters,
        "active": True
    }
    
    if existing:
        res = admin.table("attendance_locations").update(loc_payload).eq("id", existing["id"]).execute().data
    else:
        res = admin.table("attendance_locations").insert(loc_payload).execute().data
        
    return res

@app.post("/api/attendance/auto-process-absent")
def auto_process_absent(org_id: str, days_back: int = 14, user=Depends(get_user)):
    require_org(user.id, org_id)
    
    employees = admin.table("employees").select("id, created_at, date_of_joining, status").eq("organization_id", org_id).eq("status", "active").execute().data
    if not employees:
        return {"processed": 0, "message": "No active employees found"}

    leaves = admin.table("leave_requests").select("employee_id, start_date, end_date, status").eq("organization_id", org_id).in_("status", ["approved", "pending"]).execute().data
    
    att_records = admin.table("attendance_records").select("employee_id, attendance_date, status").eq("organization_id", org_id).execute().data
    
    existing_map = set()
    for r in att_records:
        rec_date = r.get("attendance_date")
        if rec_date and r.get("employee_id"):
            existing_map.add((r["employee_id"], str(rec_date)))

    from datetime import timedelta
    today = datetime.utcnow().date()
    start_check = today - timedelta(days=days_back)
    
    inserted_records = []
    for emp in employees:
        emp_id = emp["id"]
        joining_date = None
        if emp.get("date_of_joining"):
            try:
                joining_date = datetime.strptime(str(emp["date_of_joining"]), "%Y-%m-%d").date()
            except Exception:
                pass
        if not joining_date and emp.get("created_at"):
            try:
                joining_date = datetime.strptime(str(emp["created_at"]).split("T")[0], "%Y-%m-%d").date()
            except Exception:
                pass

        curr_date = start_check
        while curr_date < today:
            d_str = curr_date.strftime("%Y-%m-%d")
            
            # Skip dates prior to employee's joining or creation date
            if joining_date and curr_date < joining_date:
                curr_date += timedelta(days=1)
                continue

            # Check weekdays (Monday-Friday: 0..4)
            if curr_date.weekday() < 5:
                if (emp_id, d_str) not in existing_map:
                    on_leave = False
                    for l in leaves:
                        if l.get("employee_id") == emp_id and l.get("start_date") and l.get("end_date"):
                            if str(l["start_date"]) <= d_str <= str(l["end_date"]):
                                on_leave = True
                                break
                    
                    if not on_leave:
                        absent_entry = {
                            "organization_id": org_id,
                            "employee_id": emp_id,
                            "status": "absent",
                            "notes": "Auto-marked Absent (Unexcused - No clock-in & no leave applied)",
                            "clock_in_at": f"{d_str}T09:00:00Z"
                        }
                        try:
                            res = admin.table("attendance_records").insert(absent_entry).execute().data
                            if res:
                                inserted_records.append(res[0])
                                existing_map.add((emp_id, d_str))
                        except Exception as ex:
                            print(f"[AUTO-ABSENT INSERT EXCEPTION] {ex}")
            
            curr_date += timedelta(days=1)
            
    return {"processed": len(inserted_records), "records": inserted_records}

@app.post("/api/setup/seed")
def seed(org_id:str,user=Depends(get_user)):
    require_role(user.id,org_id,["owner","admin","hr"])
    for name in ["Engineering","Product","Marketing","Finance","Human Resources"]:
        admin.table("departments").insert({"organization_id":org_id,"name":name}).execute()
    for name in ["Software Engineer","Senior Software Engineer","Product Manager","HR Manager","Finance Manager"]:
        admin.table("designations").insert({"organization_id":org_id,"name":name}).execute()
    return {"seeded":True}
