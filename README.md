# Attendance Tracker

Google Sheets as database, Google Apps Script as API, Next.js frontend on Vercel.

## Folder guide

```
gas-script/Code.gs      → paste into Google Apps Script (Extensions > Apps Script)
app/                     → Next.js pages (Today, Setup, Summary) + API routes
lib/gas.ts               → server-side helper that calls Apps Script
components/NavBar.tsx    → bottom tab navigation
app/globals.css          → design tokens (colors, fonts, ledger styling)
```

## 1. Google Sheet (you've already created this)

Confirm it has these 4 tabs with these exact headers:

- **Subjects**: `SubjectID | SubjectName | Type`
- **Timetable**: `Day | SubjectID | SubjectName | Type` (leave rows empty — filled by the app)
- **AttendanceLog**: `Date | Day | SubjectID | SubjectName | Type | Status | Timestamp` (leave rows empty)
- **Settings**: `Key | Value`, with a row `MinAttendancePercent | 75`

Fill a few rows in **Subjects** manually, e.g.:

| SubjectID | SubjectName | Type |
|---|---|---|
| SUB01 | Data Structures | Lecture |
| SUB02 | DBMS | Lecture |
| SUB03 | DBMS Lab | Lab |

## 2. Deploy the Apps Script

1. In your Sheet: **Extensions → Apps Script**.
2. Delete the placeholder code, paste the contents of `gas-script/Code.gs`.
3. At the top of the file, set:
   - `SHEET_ID` — copy from your Sheet's URL (`.../d/THIS_PART/edit`)
   - `SECRET_TOKEN` — make up a long random string, e.g. `att_9f3k2m8x...`
4. Click **Deploy → New deployment**.
5. Type: **Web app**. Execute as: **Me**. Who has access: **Anyone**.
6. Click Deploy, authorize the permissions Google asks for, then copy the **Web app URL** (ends in `/exec`).

## 3. Run the website locally

You need [Node.js](https://nodejs.org) (v18 or later) installed.

```bash
# 1. Unzip the project, then open a terminal inside the folder
cd attendance-tracker

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```
GAS_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GAS_TOKEN=the-same-secret-you-put-in-Code.gs
```

Then start the dev server:

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. You should see the Today page. Go to **Setup** first to add subjects to each day, then come back to **Today** to mark attendance.

## 4. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Before deploying, open **Environment Variables** and add the same two values:
   - `GAS_URL`
   - `GAS_TOKEN`
4. Deploy. Vercel gives you a URL — open it on your phone and laptop; both read/write the same Google Sheet, so they always show the same data.

## Notes

- Every time you edit `Code.gs`, you must **redeploy**: Deploy → Manage deployments → pencil icon → New version → Deploy. Just saving the file is not enough.
- If a page shows no data, first check the browser's Network tab / terminal logs for an error from `/api/...` — it usually means `GAS_URL`/`GAS_TOKEN` don't match between `.env.local` and `Code.gs`, or a Sheet tab name doesn't match exactly (`Subjects`, `Timetable`, `AttendanceLog`, `Settings`).
