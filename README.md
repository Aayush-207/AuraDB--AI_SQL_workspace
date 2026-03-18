<h1 align="center">🗃️ AuraDB — <span style="color:#22c55e;">AI SQL Workspace</span></h1>

<p align="center">
  <i>AI-powered database client that turns natural language into SQL/Mongo queries using Google Gemini.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&style=for-the-badge" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&style=for-the-badge" />
  <img src="https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi&style=for-the-badge" />
  <img src="https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&style=for-the-badge" />
  <img src="https://img.shields.io/badge/MySQL-8%2B-00758F?logo=mysql&style=for-the-badge" />
  <img src="https://img.shields.io/badge/MongoDB-5%2B-13AA52?logo=mongodb&style=for-the-badge" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&style=for-the-badge" />
</p>

---

## ✨ Key Features

| 🧩 Feature | 🚀 Description |
|-----------|----------------|
| **Multi-Database Support** | Unified workspace for **PostgreSQL**, **MySQL**, and **MongoDB** with a 3‑way toggle |
| **Natural Language Queries** | Ask in plain English, get executable SQL/Mongo queries via **Google Gemini** |
| **Safe Mode** | Blocks destructive operations (`DROP`, `DELETE`, `TRUNCATE`) unless explicitly confirmed |
| **Transaction Control** | One‑click **BEGIN / COMMIT / ROLLBACK** for SQL databases |
| **Schema Explorer** | Auto-discovers tables, columns, types, and MongoDB collections |
| **Real-time Results** | Instant table and chart views for executed queries |
| **CSV Export** | One-click export of result sets |
| **Terminal Console** | Color-coded logs for queries, errors, and system messages |

---

## 🔁 Workflow

1. **Choose Database**  
   Use the **3‑way toggle** to select PostgreSQL, MySQL, or MongoDB.

2. **Connect Your DB**  
   Enter credentials for your **local** or **cloud** database (Supabase, Railway, RDS, MongoDB Atlas, etc.) and connect.

3. **Chat in Natural Language**  
   Describe what you want (e.g., _“Show me the top 10 customers by revenue this month”_).

4. **Review & Run Query**  
   AuraDB shows the generated SQL/Mongo query — you can edit it and then execute.

5. **Inspect Results & Export**  
   View results in the table/chart panel and **export to CSV** if needed.

6. **Commit Changes Safely**  
   For SQL databases, use **BEGIN / COMMIT / ROLLBACK** and Safe Mode to control data changes.

---

## 🏗️ System Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                      🖥️ Frontend (React)                      │
│  Top Bar · AI Panel · Results Panel · Terminal Console        │
│                PostgreSQL ◁▷ MySQL ◁▷ MongoDB                 │
└───────────────────────────────────────────────────────────────┘
                              │ REST API
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                       ⚙️ Backend (FastAPI)                    │
│      /connect      ·      /ai-query      ·      /execute      │
└───────────────────────────────────────────────────────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
     PostgreSQL         MySQL                MongoDB / Atlas
     
```
# 1️⃣ Start backend
```
.venv\Scripts\activate     # Windows (adjust for your OS)
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload
```

# 2️⃣ Start frontend (new terminal)
```
npm install
npm run dev
```


---

## 🛠️ Tech Stack

### 🎨 Frontend

- **React 18**, **TypeScript**, **Vite**
- **TailwindCSS**, **shadcn/ui**
- **Framer Motion** (3‑way DB toggle animation)
- **TanStack Query**, **Recharts**

### ⚙️ Backend

- **FastAPI** (Python)
- **psycopg2** (PostgreSQL), **pymysql** (MySQL), **pymongo** (MongoDB)
- **Google Gemini API** (NL → SQL/Mongo)
- **Pydantic** (validation)

---

## 💡 Technical Highlights

- **Multi-engine backend** with unified API for PostgreSQL, MySQL, and MongoDB.
- **Schema-aware prompts** so Gemini generates accurate, context-specific queries.
- **Safe Mode + transaction controls** for safer write operations.
- **Session-based workspace** using `sessionStorage` (no server-side credential storage).


---

## 🌐 Network Requirements

- **Ports**: `8001` (backend), `8080` (frontend) must be accessible.
- **Cloud DBs**: Whitelist your IP in your DB provider (e.g., Supabase, Atlas, RDS).
- **IPv6**: If using providers that rely on IPv6 (e.g., some Supabase setups), ensure your network supports it.

---

## 🔒 Security Considerations

- Credentials stay in `sessionStorage` on the client.
- **Safe Mode** is enabled by default.
- Parameterized queries mitigate SQL injection risks.

---
