# KingCRO™ Agentic Builder Starter

This repo is a **minimal, self‑hostable scaffold** for a voice/chat agent‑builder.  
It lets a non‑technical client _interview_ an assistant and automatically stores the
collected requirements (as JSON) then hands them off to an automation engine (n8n)
which can chain tools, generate prompt mind‑maps, draft workflow JSON for Tixae /
Ultravox, and finally persist everything to Supabase/Postgres.

**Highlights**

* 📦 Single‑container Express API (`/interview`) ready for Railway / Fly / Render  
* 🔑 Simple JWT bearer auth (drop your token in `.env`)  
* 🛠  Ready‑to‑import n8n workflow (`workflows/agent_builder_workflow.json`)  
* 🗄  Supabase schema (`db/schema.sql`) with a `projects` table (one row per agent)  
* 🧑‍💻 No business‑specific copy – reuse it for _any_ vertical (front‑desk, ecommerce…)  

---

## Quick start (Railway)

```bash
# 1. Clone & push
railway init
railway up

# 2. Set env vars
railway variables set JWT_SECRET="supersecret" SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..."

# 3. Open the live URL and POST to /interview with the Bearer token
```

See full docs in `docs/DEPLOYMENT.md`.
