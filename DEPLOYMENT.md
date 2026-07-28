# Deploying GoalSync Enterprise (Web + Android + Desktop)

Read this first: **I can't run these steps for you** — I don't have network access in the
sandbox I work in, so I can't create accounts, push to GitHub, or call Vercel/Render's APIs
on your behalf. Everything below is prepared and ready to go; you just need to click through
it yourself. It's about 20–30 minutes, no credit card required on the free tiers.

**What you get at the end:** a real `https://` URL that works in any browser on desktop, plus
two ways to run it on Android — an installable PWA (step 5) and a real Play-Store-ready
Capacitor app (step 6) — both talking to the same live backend over Socket.IO in real time.

## What changed in this update
- **Manager and Admin can now self-register** at `/register` and are activated immediately —
  no approval from anyone required. Employee and Team Leader registration still needs dual
  approval (Manager + Admin), unchanged.
- **Manager and Admin can now create groups (teams)** — either leading one themselves or
  assigning any Team Leader — and **create projects for any team**. Projects they create go
  straight to `ACTIVE` (they already hold the approval authority, so there's no queue to wait on).
- Team Leaders keep their existing flow: create their own team, draft a project, submit it,
  wait for Manager + Admin approval.
- Managers and Admins already had full org-wide visibility into performance data (Dashboard →
  workload analysis + leadership evaluation) — that's unchanged, just confirmed working.
- The demo seed data (`npm run seed` in `backend/`) now creates **2 Admins, 2 Managers, 2 Team
  Leaders, 10 Employees, 2 teams, and 3 active projects** with milestones and tasks already
  assigned, so the dashboards have real numbers to show right away. All seeded accounts use the
  password `Password123!` — see the console output after seeding for the full email list.

---

## 0. Push this code to GitHub

Render and Vercel both deploy from a Git repository, not a zip file.

```bash
cd goalsync-enterprise
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repo on [github.com/new](https://github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/goalsync-enterprise.git
git branch -M main
git push -u origin main
```

> `backend/node_modules` and `frontend/node_modules` are already excluded by `.gitignore` —
> good, don't commit them, both hosts install dependencies fresh during deploy.

---

## 1. Database — Neon (free Postgres)

1. Go to [neon.tech](https://neon.tech) → sign up (free) → **New Project**.
2. Copy the connection string it gives you (starts with `postgresql://...`).
3. Keep it handy for step 2.

*(Render's own free Postgres also works if you use the `render.yaml` blueprint in step 2b — Neon
is just the simplest standalone option.)*

---

## 2. Backend — Render

### Option A: Manual (most reliable)
1. [render.com](https://render.com) → sign up → **New +** → **Web Service**.
2. Connect your GitHub repo.
3. **Root Directory:** `backend`
4. **Runtime:** Docker (it will auto-detect `backend/Dockerfile`)
5. **Instance Type:** Free
6. Add environment variables (Render dashboard → Environment):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon connection string from step 1 |
   | `JWT_SECRET` | any long random string — generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `PORT` | `5000` |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | leave blank for now — you'll fill this in after step 3 |
   | `ESCALATION_CRON` | `0 * * * *` |
   | `ESCALATION_THRESHOLD_DAYS` | `3` |
   | `DUE_SOON_REMINDER_DAYS` | `2` |

7. **Create Web Service.** Render builds the Docker image (`npm ci`, `prisma generate`), then
   runs `prisma migrate deploy` and starts the server automatically (see `backend/Dockerfile`).
8. Once live, copy the backend's URL — looks like `https://goalsync-backend.onrender.com`.
9. Seed demo accounts: Render dashboard → your service → **Shell** tab →
   ```bash
   npm run seed
   ```

### Option B: One-shot Blueprint
Render can read `render.yaml` (already included at the repo root) and provision the web
service + a free Postgres database together: **New +** → **Blueprint** → select your repo.
You'll still need to set `JWT_SECRET`/`CLIENT_URL` as above if they aren't auto-filled.

> **Free tier note:** Render's free web services spin down after 15 minutes of no traffic and
> take ~30–50s to wake back up on the next request. Fine for personal use/demos; upgrade to a
> paid instance if you want it always warm.

---

## 3. Frontend — Vercel

1. [vercel.com](https://vercel.com) → sign up → **Add New** → **Project** → import the same
   GitHub repo.
2. **Root Directory:** `frontend` (click "Edit" next to Root Directory in the import screen).
3. Framework preset: Next.js (auto-detected).
4. Add environment variable:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | your Render backend URL from step 2, e.g. `https://goalsync-backend.onrender.com` |

5. **Deploy.** You'll get a URL like `https://goalsync-enterprise.vercel.app`.
6. Go back to Render → your backend service → set `CLIENT_URL` to this Vercel URL, then
   **Manual Deploy → Redeploy** (this is what makes CORS and Socket.IO auth work correctly).

---

## 4. Try it

Open your Vercel URL. Log in with the seeded demo accounts (see `backend/prisma/seed.js` for
exact emails/passwords, or whatever your seed script prints).

## 5. Install it on Android (and desktop)

This app is now a installable **PWA** (manifest + service worker were added in
`frontend/public/manifest.json` and `frontend/public/sw.js`, registered in `pages/_app.js`).

- **Android (Chrome):** open the Vercel URL → tap the **⋮** menu → **"Install app"** (or
  **"Add to Home screen"**). It installs a real launcher icon and opens full-screen, no
  browser bar — indistinguishable from a native app at a glance.
- **Desktop (Chrome/Edge):** click the install icon (⊕ or a small monitor icon) in the address
  bar → **Install**.
- **iPhone (Safari):** Share icon → **Add to Home Screen** (Safari doesn't show an automatic
  install prompt, but this does the same thing).

---

## 6. Real native Android app (APK / Play Store) — Capacitor

The frontend is now wrapped with [Capacitor](https://capacitorjs.com): `frontend/capacitor.config.json`
and the `android:*` scripts in `frontend/package.json` are already in place. Capacitor points
the native shell at your **live Vercel URL** (not a bundled copy) — so the phone app talks to
the same backend, in real time over the same Socket.IO connection, as the website. Any change
you deploy to Vercel shows up in the app on next launch, no app-store update required.

I can't run Android Studio / the Android SDK inside this sandbox (no network, no SDK), so
these steps are ones you run locally:

1. Finish steps 1–3 above first — you need a live Vercel URL.
2. Open `frontend/capacitor.config.json` and replace the placeholder `server.url` with your
   actual Vercel URL (e.g. `https://goalsync-enterprise.vercel.app`).
3. On your machine, with [Android Studio](https://developer.android.com/studio) installed:
   ```bash
   cd goalsync-enterprise/frontend
   npm install
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
4. Android Studio opens the generated `android/` project.
   - To test on a device/emulator: click **Run**.
   - To ship a real APK: **Build → Build Bundle(s)/APK(s) → Build APK(s)**. The signed/unsigned
     APK lands in `android/app/build/outputs/apk/`.
   - To publish on the Play Store: **Build → Generate Signed Bundle/APK**, create a keystore,
     then upload the resulting `.aab` to the [Play Console](https://play.google.com/console)
     (one-time $25 developer fee).
5. App icon/splash screen: replace the placeholder assets under `android/app/src/main/res/`
   (or use `npx @capacitor/assets generate` with your own logo).

**Why this approach instead of a from-scratch native rebuild:** it reuses 100% of the existing
Next.js frontend and Express/Socket.IO backend as-is, so every feature (real-time notifications,
chat, approvals, dashboards) works identically on Android without re-implementing it in
Kotlin/Java. It's the standard, low-risk path for shipping a web product as a Play Store app.

---

## Troubleshooting
- **CORS errors in the browser console:** double check `CLIENT_URL` on Render exactly matches
  your Vercel URL (including `https://`, no trailing slash), then redeploy the backend.
- **Chat (Socket.IO) doesn't connect:** same cause — `CLIENT_URL` mismatch, or the backend is
  still asleep (free tier cold start, wait ~40s and retry).
- **"Install app" doesn't appear in Chrome:** it only shows over HTTPS (Vercel gives you this
  automatically) and after the service worker has registered once — reload the page and wait
  a few seconds, or check `chrome://serviceworker-internals` for registration errors.
- **500 errors right after backend deploy:** the DB migration may still be running — check the
  Render service logs; `prisma migrate deploy` runs automatically on every deploy per the
  `Dockerfile` CMD.
