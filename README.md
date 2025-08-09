# ICT Sizing/Selection Assistant (Servers · Security · Switches)

An end-to-end scaffold for a Retrieval-Augmented Matching (RAM/RAG) ICT selection assistant.

## What’s inside
- **catalog/** – data schemas & sample datasets
- **selector/** – FastAPI service (rules baseline + RAG stubs)
- **web/** – frontend placeholder (add Next.js later)
- **.github/** – Issue/PR templates, labels, releases, projects workflows
- **compose.yaml** – local dev (API + Postgres + Qdrant)

## Quick start
```bash
docker compose up -d --build
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/select -H 'Content-Type: application/json' -d '{"scenario":"virtualization","constraints":{"budget":120000}}'
```

## Dev (selector service only)
```bash
cd selector
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
