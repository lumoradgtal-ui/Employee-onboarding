# Project status

All planned business areas are represented in the repository: foundation, auth/tenant/RBAC, employee core, onboarding, probation, attendance/location/corrections, leave, projects/allocation, assets, system access, expenses, payroll, recruitment/offers, performance, promotion/transfer, documents, resignation/offboarding, dashboards, reports, notifications, audit/security, testing and Docker/deployment.

The backend exposes dedicated employee/dashboard/attendance operations plus a generic organization-scoped API for all domain tables. The frontend provides navigation and working CRUD workspace pages. The SQL file is consolidated and intended to be run as one script in Supabase SQL Editor.

Before production launch, configure external providers and jurisdiction-specific payroll/tax rules.
