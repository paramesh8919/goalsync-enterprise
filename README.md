# GoalSync Enterprise Platform

An enterprise project-management system with a four-level role hierarchy
(**Admin → Manager → Team Leader → Employee**), dual-approval workflows for
both account registration and project activation, teams, milestones, tasks,
documents, risk management, attendance/leave, announcements, real-time chat
& notifications, and PDF/Excel reporting.

```
goalsync-enterprise/
├── backend/     Express API + Prisma (Postgres) + Socket.io + escalation engine
└── frontend/    Next.js app (Tailwind CSS), responsive desktop & mobile
```

## What's implemented vs. roadmapped

This build covers the full **hierarchy, approval, and core project-management
workflow** end-to-end — schema, backend routes, and frontend pages all wired
together. Some of the secondary modules you asked for (leave, attendance,
announcements, calendar, chat, risk register, audit log, PDF/Excel export)
are implemented as working CRUD features rather than fully polished,
analytics-heavy modules. Realistic next steps if you want to keep building:

- Richer dashboard charts (currently tables/stat cards, not graphs)
- A dedicated calendar UI (the API exists; there's no calendar grid page yet)
- File type/virus scanning on document uploads
- Automated performance scoring (the `PerformanceScore` table exists but
  nothing populates it yet — you'd add a scheduled job similar to the
  escalation engine)
- Pagination on list endpoints (audit log, notifications, etc. currently cap
  at a fixed number of rows)

---

## 1. Role hierarchy & approval rules (how the system enforces them)

| Role | Created by | Can do |
|---|---|---|
| **Admin** | Provisioned directly (see below) | Full visibility, approves projects & registrations, provisions Manager/Admin accounts, org reports |
| **Manager** | Provisioned directly | Full visibility, approves projects & registrations, dashboards |
| **Team Leader** | Self-registers → pending until approved | Creates their team, adds employees, creates/submits projects, allocates tasks, uploads documents |
| **Employee** | Self-registers → pending until approved | Own tasks, own project's progress, sees their Team Leader/Manager/Admin |

- Registration (`/register`) only offers **Employee** or **Team Leader**.
  The account is created with `isActive: false` and stays that way until
  **both** a Manager and the Admin approve it (`/approvals` page). A
  rejection from either side is final.
- Manager and Admin accounts are never self-registered — an existing Admin
  creates them from the **Admin** page (`POST /api/users`).
- Projects follow the same dual-approval shape: a Team Leader creates a
  project as `DRAFT`, submits it, and it only becomes `ACTIVE` once **both**
  a Manager and the Admin approve it on the project page. A rejection from
  either side is terminal — the project cannot be resubmitted.

---

## 2. Running it locally

### Prerequisites
- Node.js 18+
- A Postgres database (see section 3 for the easiest free options)

### Backend
```bash
cd backend
npm install
# edit .env — set DATABASE_URL to your own Postgres connection string
# (the JWT_SECRET placeholder also needs to be replaced — see .env)
npx prisma migrate dev --name init_enterprise   # creates all tables
npm run seed                                     # optional demo data
npm run dev                                       # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
# frontend/.env.local already points at http://localhost:5000 — adjust if needed
npm run dev   # http://localhost:3000
```

### Demo accounts (after running `npm run seed`)
All use the password `Password123!`:

| Email | Role |
|---|---|
| admin@goalsync.com | Admin |
| manager@goalsync.com | Manager |
| lead@goalsync.com | Team Leader |
| employee@goalsync.com | Employee |
| pending@goalsync.com | Employee — **intentionally left pending**, so you can see the Approvals screen do its job immediately |

---

## 3. Setting up the database

You need a Postgres database and its connection string. Any of these work —
pick whichever is easiest for you:

### Option A — Neon (free, fastest to set up)
1. Go to https://neon.tech and sign up (no credit card for the free tier).
2. Create a project. It gives you a connection string immediately, e.g.
   `postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require`
3. Paste that into `backend/.env` as `DATABASE_URL`.

### Option B — Supabase
1. https://supabase.com → New project.
2. Project Settings → Database → Connection string → **URI** tab. Copy it
   into `backend/.env` as `DATABASE_URL`.

### Option C — Docker, fully local (no signup, no cloud)
```bash
docker run --name goalsync-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=goalsync -p 5432:5432 -d postgres:16
```
Then in `backend/.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/goalsync"
```

### Once you have a connection string
```bash
cd backend
npx prisma migrate dev --name init_enterprise
```
This reads `prisma/schema.prisma` and creates every table (User, Team,
Project, Milestone, Task, ProjectDocument, Risk, LeaveRequest, Attendance,
PerformanceScore, ChatMessage, CalendarEvent, Announcement, Notification,
AuditLog, Department) in your database. Prisma tracks migrations as files
under `backend/prisma/migrations/` — commit that folder to git so teammates
and production deploys apply the exact same schema.

Then, optionally, load demo data:
```bash
npm run seed
```

To inspect/edit data visually at any point:
```bash
npx prisma studio
```

**Production deploys:** use `npx prisma migrate deploy` (not `migrate dev`)
— it applies existing migrations without prompting or generating new ones.

---

## 4. Where uploaded documents go

Project documents are saved to `backend/uploads/` on disk and served at
`/uploads/<filename>`. That's fine for local dev or a single server; for a
real deployment behind multiple instances, swap `documents.controller.js`'s
multer disk storage for an S3-compatible bucket (the upload handler is the
only place that would need to change).

---

## 5. API surface (for reference)

```
POST   /api/auth/register              Employee/Team Leader self-registration
POST   /api/auth/login
GET    /api/approvals/users            Manager/Admin: pending registrations
POST   /api/approvals/users/:id/decision

GET    /api/users                      Directory (role-scoped)
POST   /api/users                      Admin provisions Manager/Admin
GET    /api/users/hierarchy            My Team Leader / Manager / Admin chain

GET    /api/departments   POST /api/departments (admin)

GET    /api/teams   POST /api/teams (team leader)
POST   /api/teams/:id/members   DELETE /api/teams/:id/members/:userId

GET    /api/projects   POST /api/projects (team leader)
GET    /api/projects/pending-approval
POST   /api/projects/:id/submit
POST   /api/projects/:id/decision

/api/projects/:projectId/milestones   /api/milestones/:id
/api/projects/:projectId/tasks        /api/tasks/my   /api/tasks/:id
/api/projects/:projectId/documents    /api/documents/:id
/api/projects/:projectId/risks        /api/risks/:id

GET    /api/dashboard/summary | /workload | /leadership | /org-report
GET    /api/leave   POST /api/leave   POST /api/leave/:id/decision
GET    /api/attendance   POST /api/attendance/check-in | check-out
GET    /api/announcements   POST /api/announcements
GET    /api/calendar   POST /api/calendar
GET    /api/chat?projectId=   POST /api/chat
GET    /api/audit-logs                 (admin only)
GET    /api/reports/projects.pdf | .xlsx   (manager/admin)
GET    /api/notifications
```

---

## 6. Tech stack

- **Backend:** Express, Prisma ORM, PostgreSQL, JWT auth, Socket.io (realtime
  notifications + chat), node-cron (escalation engine), multer (uploads),
  pdfkit + exceljs (reports)
- **Frontend:** Next.js (pages router), Tailwind CSS, axios, socket.io-client,
  react-hot-toast
