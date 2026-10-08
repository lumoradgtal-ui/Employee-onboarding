# API
GET /health
POST /api/setup/bootstrap
POST /api/setup/seed
GET /api/organizations
GET /api/dashboard/{org_id}
GET/POST /api/employees
GET/PATCH /api/employees/{employee_id}
GET/POST /api/{resource} for organization-scoped resources
POST /api/attendance/clock-in
POST /api/attendance/clock-out

All authenticated routes use `Authorization: Bearer <Supabase access token>`.
