# HRMS Platform — Complete Supabase Edition

A multi-tenant Employee Lifecycle Management System built around the employee as the central entity.

## Included lifecycle
Recruitment → Candidate → Selection → Offer → Offer Accepted → Pre-Onboarding → Onboarding → Probation → Active/Confirmed → Projects/Team Allocation → Attendance → Leave → Assets → System Access → Expenses → Payroll → Performance/Appraisal → Promotion/Transfer → Resignation → Notice Period → Offboarding.

## Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS + React Router + TanStack Query + Zustand
- Backend: FastAPI + Pydantic + Supabase Python client
- Database/Auth: Supabase PostgreSQL + Supabase Auth + RLS
- Tests: pytest + TypeScript build
- Deployment: Docker / Docker Compose

## Setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` once in the Supabase SQL editor.
3. Copy `.env.example` to `.env` in root, backend, and frontend as applicable.
4. Put your Supabase URL, anon key and service role key in the backend environment.
5. Install backend dependencies: `pip install -r backend/requirements.txt`.
6. Install frontend dependencies: `cd frontend && npm install`.
7. Start API: `uvicorn app.main:app --reload --app-dir backend`.
8. Start UI: `cd frontend && npm run dev`.

Never expose the Supabase service-role key in the browser.

## Demo bootstrap
After creating the first user in Supabase Auth, call `POST /api/setup/bootstrap` with an organization name. The authenticated user becomes an owner/admin.

## Production notes
The repository implements the application baseline and all requested functional areas. Before public production launch, configure email/SMS providers, storage buckets, payroll/tax rules for the target jurisdiction, backups, observability, rate limits, domain/SSL, and organization-specific policies.
