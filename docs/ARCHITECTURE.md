# Architecture
React SPA -> Supabase Auth -> FastAPI -> Supabase PostgreSQL.
The browser never receives the service-role key. Backend checks bearer authentication, organization membership and role before sensitive operations. PostgreSQL RLS is enabled for business tables and uses organization membership functions. Employee is the central lifecycle entity and history tables preserve important changes.
