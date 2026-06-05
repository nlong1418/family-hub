# Family Hub

A family command center with shared calendar, to-do list, and message board — with a two-way Telegram bridge.

## What it does

- **Calendar** — add and view family events; links to Google Calendar
- **To-do list** — manage from the dashboard or via Telegram commands
- **Message board** — post from the iPad; syncs two-ways with your Telegram family group

## Telegram bot commands

| Command | Action |
|---|---|
| `/add Buy milk` | Add item to to-do list |
| `/done 3` | Mark item #3 as done |
| `/remove 3` | Delete item #3 |
| `/list` | Show all to-do items |
| `/clear` | Remove all completed items |
| `/help` | Show all commands |
| Any regular message | Appears on the family message board |

---

## Deployment guide

### Step 1 — Deploy the backend to Render

1. Create a free account at [render.com](https://render.com)
2. Click **New → Web Service**
3. Connect your GitHub repo (or use "Deploy from existing repo")
4. Set these values:
   - **Root directory**: `backend`
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Instance type**: Free
5. Add these **Environment Variables**:
   - `TELEGRAM_BOT_TOKEN` → `8729653092:AAGnIbZGE_gCwbnA2xkvyTNcgDAD_bhE7bk`
   - `TELEGRAM_GROUP_CHAT_ID` → `-5293301832`
6. Click **Create Web Service**
7. Wait ~2 minutes; copy the URL (e.g. `https://family-hub-abc123.onrender.com`)

> ⚠️ Free Render instances spin down after 15 min of inactivity. The first load after a gap takes ~30 seconds. Upgrade to the $7/mo Starter plan to keep it always-on — recommended for an always-on iPad display.

### Step 2 — Deploy the frontend

**Option A — Netlify (free, easiest)**

1. Create a free account at [netlify.com](https://netlify.com)
2. In the `frontend` folder, copy `.env.example` to `.env` and fill in your Render URL
3. Run `npm install && npm run build` locally
4. Drag the `build` folder into Netlify's deploy dropzone
5. Netlify gives you a URL like `https://family-hub-xyz.netlify.app`

**Option B — Render static site (keep everything on Render)**

1. In Render, click **New → Static Site**
2. Root directory: `frontend`
3. Build command: `npm install && npm run build`
4. Publish directory: `build`
5. Add environment variable: `REACT_APP_API_URL` = your backend Render URL

### Step 3 — Set up the iPad

1. Open Safari on the iPad
2. Navigate to your frontend URL
3. Tap the **Share** button → **Add to Home Screen**
4. Name it "Family Hub"
5. It'll appear as a full-screen app icon on the home screen

---

## Local development

```bash
# Backend
cd backend
npm install
TELEGRAM_BOT_TOKEN=your_token TELEGRAM_GROUP_CHAT_ID=your_chat_id node server.js

# Frontend (new terminal)
cd frontend
cp .env.example .env
# Edit .env with your backend URL (http://localhost:3001 for local)
npm install
npm start
```

---

## Adding family members

Edit the `FAMILY_MEMBERS` array at the top of `frontend/src/App.js`:

```js
const FAMILY_MEMBERS = ["Mom", "Dad", "Jamie", "Alex"];
```

Each name gets its own color in the message board.

---

## Upgrading later

- **Persistent storage**: Replace the in-memory `store` in `server.js` with a free [Supabase](https://supabase.com) PostgreSQL database so data survives server restarts
- **Google Calendar sync**: Add Google OAuth to the backend to read/write real calendar events
- **Push notifications**: Add web push so family members get notified of new messages on their phones
