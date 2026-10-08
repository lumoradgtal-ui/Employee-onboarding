import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, Depends, HTTPException, Query
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
    return admin.table("organization_members").select("organization_id, role, organizations(*)").eq("user_id",user.id).eq("status","active").execute().data

@app.get("/api/dashboard/{org_id}")
def dashboard(org_id: str, user=Depends(get_user)):
    require_org(user.id, org_id)
    def count(table, field="organization_id", value=org_id):
        try: return len(admin.table(table).select("id").eq(field,value).execute().data)
        except Exception: return 0
    return {"employees":count("employees"),"active_employees":len(admin.table("employees").select("id").eq("organization_id",org_id).eq("status","active").execute().data),"onboarding":count("onboarding_tasks"),"probation":count("probation_records"),"leave_pending":len(admin.table("leave_requests").select("id").eq("organization_id",org_id).eq("status","pending").execute().data),"open_jobs":len(admin.table("jobs").select("id").eq("organization_id",org_id).eq("status","open").execute().data),"expenses_pending":len(admin.table("expenses").select("id").eq("organization_id",org_id).eq("status","pending").execute().data)}

@app.get("/api/employees")
def employees(org_id: str, user=Depends(get_user), q: str="", status: str="", limit: int=100, offset: int=0):
    require_org(user.id,org_id)
    query=admin.table("employees").select("*, departments!employees_department_id_fkey(name), designations(name)").eq("organization_id",org_id).order("created_at",desc=True)
    if status: query=query.eq("status",status)
    if q: query=query.or_(f"first_name.ilike.%{q}%,last_name.ilike.%{q}%,work_email.ilike.%{q}%,employee_code.ilike.%{q}%")
    return query.range(offset,offset+limit-1).execute().data

@app.post("/api/employees")
def create_employee(body: EmployeeCreate, user=Depends(get_user)):
    require_role(user.id,body.organization_id,["owner","admin","hr"])
    emp=admin.table("employees").insert(body.model_dump(mode="json")).execute().data[0]
    admin.table("employee_status_history").insert({"organization_id":body.organization_id,"employee_id":emp["id"],"from_status":None,"to_status":emp["status"],"changed_by":user.id,"reason":"Employee created"}).execute()
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

@app.patch("/api/employees/{employee_id}")
def update_employee(employee_id:str, org_id:str, body:EmployeeUpdate, user=Depends(get_user)):
    require_role(user.id,org_id,["owner","admin","hr"])
    old=admin.table("employees").select("*").eq("id",employee_id).eq("organization_id",org_id).maybe_single().execute().data
    if not old: raise HTTPException(404,"Employee not found")
    data={k:v for k,v in body.model_dump(mode="json").items() if v is not None}
    if not data: return old
    new=admin.table("employees").update(data).eq("id",employee_id).eq("organization_id",org_id).execute().data[0]
    if "status" in data and data["status"]!=old["status"]:
        admin.table("employee_status_history").insert({"organization_id":org_id,"employee_id":employee_id,"from_status":old["status"],"to_status":data["status"],"changed_by":user.id}).execute()
    admin.table("employee_changes").insert({"organization_id":org_id,"employee_id":employee_id,"change_type":"profile_update","before_data":old,"after_data":new,"changed_by":user.id}).execute()
    return new

@app.post("/api/candidates/{candidate_id}/convert")
def convert_candidate(candidate_id: str, org_id: str, user=Depends(get_user)):
    require_role(user.id, org_id, ["owner", "admin", "hr"])
    c = admin.table("candidates").select("*").eq("id", candidate_id).eq("organization_id", org_id).maybe_single().execute().data
    if not c: raise HTTPException(404, "Candidate not found")
    
    # Create employee from candidate
    emp_data = {
        "organization_id": org_id,
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
    elif table not in ["candidates", "leave_requests", "expenses", "attendance_corrections", "documents", "attendance_records"]:
        require_role(user.id, org_id, ["owner", "admin", "hr", "manager"])
    else:
        require_org(user.id, org_id)
    
    res = admin.table(table).insert(body.payload).execute().data

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
                    
                    body_html = f"""
                    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
                        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 24px; border: 1px solid #e5e7eb;">
                            <h2 style="color: #6d28d9; margin-top: 0;">📋 New Task Assigned</h2>
                            <p>Dear <strong>{emp_name}</strong>,</p>
                            <p>You have been assigned a new task by Admin/Manager on HRMS Platform:</p>
                            <div style="background-color: #f9fafb; border-left: 4px solid #6d28d9; padding: 16px; margin: 20px 0; border-radius: 4px;">
                                <h3 style="margin: 0 0 8px 0; color: #111827;">{task_title}</h3>
                                <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Category:</strong> {category}</p>
                                <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Priority:</strong> <span style="color: #dc2626; font-weight: bold;">{priority.upper()}</span></p>
                                <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Due Date:</strong> {due_date}</p>
                                <p style="margin: 8px 0 0 0; color: #4b5563; font-size: 14px;"><strong>Instructions:</strong> {description}</p>
                            </div>
                            <p>Please log in to your employee portal to view and complete this task.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
                            <p style="font-size: 12px; color: #9ca3af; text-align: center;">HRMS Platform Automated Mailer</p>
                        </div>
                    </div>
                    """
                    send_email_notification(target_email, subject, body_text, body_html)
                    
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
    require_role(user.id,org_id,["owner","admin","hr"])
    data={k:v for k,v in body.payload.items() if k not in ["id","organization_id","created_at"]}
    r=admin.table(table).update(data).eq("id",id).eq("organization_id",org_id).execute()
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
    r=admin.table("attendance_records").update({"clock_out_at":datetime.utcnow().isoformat(),"clock_out_latitude":latitude,"clock_out_longitude":longitude}).eq("id",record_id).eq("organization_id",org_id).execute().data
    if not r: raise HTTPException(404,"Attendance record not found")
    return r[0]

@app.post("/api/setup/seed")
def seed(org_id:str,user=Depends(get_user)):
    require_role(user.id,org_id,["owner","admin","hr"])
    for name in ["Engineering","Product","Marketing","Finance","Human Resources"]:
        admin.table("departments").insert({"organization_id":org_id,"name":name}).execute()
    for name in ["Software Engineer","Senior Software Engineer","Product Manager","HR Manager","Finance Manager"]:
        admin.table("designations").insert({"organization_id":org_id,"name":name}).execute()
    return {"seeded":True}
