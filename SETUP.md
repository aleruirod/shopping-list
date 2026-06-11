# Shopping List App — Setup Guide

A barcode-scanning, object-recognition and handwriting-OCR shopping list built with React + FastAPI. Deployed free on Vercel (frontend) and Render (backend).

---

## What you'll have at the end

- A live URL for your frontend (Vercel)
- A live API URL for your backend (Render)
- A free PostgreSQL database (Render)
- GitHub-connected auto-deploys (push to main → live in 60s)

**Estimated setup time: ~45 minutes**

---

## Prerequisites — install these first

| Tool | Install |
|---|---|
| Git | https://git-scm.com |
| Node.js 20+ | https://nodejs.org |
| Python 3.11+ | https://python.org |
| A GitHub account | https://github.com |

---

## Part 1 — Get the code onto your machine

### Step 1.1 — Create a GitHub repo

1. Go to https://github.com/new
2. Name it `shopping-list`
3. Set it to **Public** (required for Vercel and Render free tiers)
4. Do NOT add a README or .gitignore (the project already has one)
5. Click **Create repository**
6. Copy the repo URL — it will look like `https://github.com/YOUR_USERNAME/shopping-list.git`

### Step 1.2 — Clone the scaffold and push it

Open a terminal and run:

```bash
# Clone this scaffold (or unzip the folder you received)
cd ~/projects   # or wherever you keep code

# Initialise git in the project folder
cd shopping-list
git init
git add .
git commit -m "Initial scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/shopping-list.git
git push -u origin main
```

Refresh your GitHub repo page — all files should now be visible.

---

## Part 2 — Get your Anthropic API key

The object recognition and handwriting OCR both use Claude Haiku. Cost is ~$0.001–0.003 per image, effectively free for personal use.

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click **API Keys** in the left sidebar
4. Click **Create Key**, name it `shopping-list`
5. **Copy the key now** — you won't see it again. Save it somewhere safe (e.g. a password manager).

---

## Part 3 — Deploy the backend on Render

### Step 3.1 — Create a Render account

1. Go to https://render.com
2. Sign up with your GitHub account (this links them automatically)

### Step 3.2 — Deploy using the render.yaml blueprint

1. From the Render dashboard, click **New → Blueprint**
2. Connect your GitHub account if prompted
3. Select your `shopping-list` repository
4. Render will detect the `render.yaml` file automatically
5. Click **Apply**

Render will now create two things:
- A **PostgreSQL database** called `shopping-list-db`
- A **Web service** called `shopping-list-api`

### Step 3.3 — Add your API key as an environment variable

The `render.yaml` has `ANTHROPIC_API_KEY` marked as `sync: false` — meaning you must set it manually (for security — never commit secrets to git).

1. In Render dashboard, click on the **shopping-list-api** service
2. Go to **Environment** tab
3. Click **Add Environment Variable**
4. Key: `ANTHROPIC_API_KEY`
5. Value: paste your key from Part 2
6. Click **Save Changes**

Render will automatically redeploy.

### Step 3.4 — Note your backend URL

Once the deploy finishes (green dot), click on the service. You'll see a URL like:

```
https://shopping-list-api.onrender.com
```

**Copy this URL — you'll need it in Part 4.**

To verify it works, open: `https://shopping-list-api.onrender.com/health`
You should see: `{"status":"ok"}`

> **Note on cold starts:** The free tier spins down after 15 minutes of inactivity. The first request after that takes ~60 seconds. To avoid this, set up a free keep-alive ping at https://cron-job.org — create a cron job that hits `YOUR_BACKEND_URL/health` every 10 minutes.

---

## Part 4 — Deploy the frontend on Vercel

### Step 4.1 — Create a Vercel account

1. Go to https://vercel.com
2. Sign up with your GitHub account

### Step 4.2 — Import your project

1. From the Vercel dashboard, click **Add New → Project**
2. Find and select your `shopping-list` repository
3. Vercel will ask you to configure the project:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`  ← important, click Edit and set this
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)

### Step 4.3 — Add your backend URL as an environment variable

Before clicking Deploy, scroll down to **Environment Variables** and add:

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://shopping-list-api.onrender.com` |

Replace the value with your actual Render URL from Step 3.4.

### Step 4.4 — Deploy

Click **Deploy**. Vercel builds and deploys in about 30 seconds.

You'll get a URL like: `https://shopping-list-abc123.vercel.app`

Open it — your app is live.

---

## Part 5 — Test everything works

Open your Vercel URL and test each input mode:

### Manual input
1. Type an item name in the text field
2. Select a category
3. Click Add
4. ✅ Item appears in the list under the right category

### Barcode scanner
1. Click the **Barcode** tab
2. Click **Start scanning**
3. Allow camera access when prompted
4. Point the camera at any product barcode (food, household items)
5. ✅ Product name is looked up and added automatically

If a product isn't found (rare for Belgian products), you'll be prompted to enter the name manually.

### Object recognition
1. Click the **Photo** tab
2. Click the button and take a photo of a product (or upload one)
3. ✅ Claude identifies the product and adds it with a suggested category

### Handwriting OCR
1. Write a shopping list on paper
2. Click the **Handwriting** tab
3. Take a photo of your written list
4. ✅ All items are read and added at once

### Check off and remove
- Tap the checkbox next to any item to mark it done
- Click ✕ to remove an item
- Click **Remove checked** in the header to clear all checked items at once

---

## Part 6 — Set up auto-deploy (already done!)

Because Vercel and Render are connected to your GitHub repo, every time you push a commit to `main`, both services redeploy automatically. No manual steps needed.

```bash
# Make a change, push, and it's live in ~60 seconds
git add .
git commit -m "Update item categories"
git push
```

---

## Local development setup

To run the app on your own machine:

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create a .env file
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Run (SQLite is used automatically when no DATABASE_URL is set)
uvicorn main:app --reload
# API is now at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install

# Create a .env.local file
echo "VITE_API_URL=http://localhost:8000" > .env.local

npm run dev
# App is now at http://localhost:5173
```

---

## Cost summary

| Feature | Service | Monthly cost |
|---|---|---|
| Frontend hosting | Vercel | $0 |
| Backend hosting | Render | $0 |
| Database | Render PostgreSQL | $0 |
| Barcode lookup | Open Food Facts | $0 |
| Object recognition (50 scans) | Claude Haiku API | ~$0.05–0.15 |
| Handwriting OCR (20 scans) | Claude Haiku API | ~$0.02–0.06 |
| **Total** | | **~$0.10–0.20/month** |

---

## Project structure reference

```
shopping-list/
├── .gitignore
├── render.yaml                  ← Render auto-deploy config
├── backend/
│   ├── main.py                  ← FastAPI app, CORS, router wiring
│   ├── database.py              ← SQLAlchemy setup (SQLite local, Postgres on Render)
│   ├── models.py                ← Item model + category keyword matcher
│   ├── requirements.txt
│   └── routes/
│       ├── items.py             ← CRUD: list, add, update, delete items
│       ├── scan.py              ← Barcode: Open Food Facts → UPC fallback
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx              ← Main UI: tabs, list grouped by category
        ├── components/
        │   └── BarcodeScanner.jsx  ← ZXing webcam scanner
        └── utils/
            └── api.js           ← All fetch calls to the backend
```

---

## Troubleshooting

**Backend URL gives a 502 or takes 60s to respond**
The free Render instance is spinning up from idle. Wait 60 seconds and try again. Set up the cron-job.org keep-alive (see Part 3, Step 3.4 note) to prevent this.

**Barcode not found**
Open Food Facts has strong Belgian/European coverage but isn't 100%. The app falls back to UPC Item DB. If still not found, enter the name manually. You can also contribute the product to Open Food Facts at https://world.openfoodfacts.org — it's a community database.

**Camera not working for barcode/photo**
Browsers only allow camera access on HTTPS or localhost. Your Vercel URL is HTTPS so it should work. If testing locally, use `localhost`, not `127.0.0.1`.

**ANTHROPIC_API_KEY error in Render logs**
Go to Render → shopping-list-api → Environment and confirm the key is set correctly (no extra spaces). Trigger a manual redeploy after saving.

**Render database deleted after 30 days**
Render's free PostgreSQL expires after 30 days. To reset: go to Render dashboard → Databases → delete the old DB → re-run the Blueprint. Your `render.yaml` will recreate it. To avoid losing data: before the 30 days are up, export with `pg_dump` or upgrade to a $7/month database.
