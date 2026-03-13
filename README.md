# 🗃️ AuraDB — AI SQL Workspace

> A modern, AI-powered database client that converts natural language to SQL queries using Google Gemini API. Supports PostgreSQL, MySQL, and MongoDB with a unified interface.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql)
![MySQL](https://img.shields.io/badge/MySQL-8+-00758F?logo=mysql)
![MongoDB](https://img.shields.io/badge/MongoDB-5+-13AA52?logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss)

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Database Support** | PostgreSQL, MySQL, and MongoDB with seamless switching via 3-way toggle |
| **Natural Language Queries** | Type questions in plain English, get executable SQL/queries powered by Gemini AI |
| **Safe Mode** | Blocks dangerous operations (DROP, DELETE, TRUNCATE) with confirmation modals |
| **Transaction Control** | BEGIN, COMMIT, ROLLBACK buttons for manual transaction management (SQL databases) |
| **Schema Explorer** | Auto-fetches and displays database schema with tables, columns, types, and MongoDB collections |
| **Real-time Results** | Execute queries with instant table/chart visualization |
| **CSV Export** | One-click export of query results |
| **Terminal Console** | Color-coded logs for queries, errors, and system messages |
| **Cloud & Local** | Connect to both localhost and cloud-hosted databases (PostgreSQL, MySQL, MongoDB Atlas) |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  TopBar  │  │  AI Panel   │  │ Results  │  │   Terminal   │  │
│  │(Actions) │  │ (Chat UI)   │  │ (Table)  │  │  (Console)   │  │
│  └──────────┘  └─────────────┘  └──────────┘  └──────────────┘  │
│      DB Toggle (PostgreSQL / MySQL / MongoDB)                    │
└─────────────────────────────────────────────────────────────────┘
                              │ REST API
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  /connect   │  │  /ai-query   │  │  /execute              │  │
│  │  (Auth)     │  │  (Gemini AI) │  │  (SQL Execution)       │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                     │            │            │
        ┌────────────┴───┬────────┴──┬────────┴──────┐
        │                │           │               │
   ┌──────────┐   ┌──────────┐  ┌─────────┐  ┌─────────────┐
   │PostgreSQL│   │  MySQL   │  │MongoDB  │  │PostgreSQL   │
   │(Local)   │   │ (Local/  │  │(Local/  │  │(Cloud)      │
   │          │   │  Cloud)  │  │ Atlas)  │  │             │
   └──────────┘   └──────────┘  └─────────┘  └─────────────┘
```

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript + Vite
- TailwindCSS + shadcn/ui components
- Framer Motion (animations & spring-based 3-way toggle)
- TanStack Query (data fetching)
- Recharts (data visualization)

**Backend:**
- FastAPI (Python)
- psycopg2 (PostgreSQL driver)
- pymysql (MySQL driver)
- pymongo (MongoDB driver)
- Google Gemini API (AI/LLM)
- Pydantic (validation)

## 🚀 Quick Start

```bash
# 1. Start backend
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload

# 2. Start frontend (new terminal)
npm install && npm run dev
```

## 🌐 Network Requirements

- **IPv6 Support**: Some cloud-hosted databases (e.g., Supabase) may require IPv6 connectivity. If you experience DNS resolution issues, ensure your network or ISP supports IPv6 or contact your provider.
- **Port Access**: Ensure ports 8001 (backend) and 8080 (frontend) are accessible on your machine
- **Firewall**: For cloud databases, whitelist your IP address in the database's security settings

## 💡 Technical Highlights

- **Multi-Database Architecture**: Unified backend routing for PostgreSQL, MySQL, and MongoDB with database-specific optimizations
- **AI Context Injection**: Schema metadata is dynamically injected into Gemini prompts for accurate SQL/query generation
- **Multi-Statement Execution**: MySQL supports executing multiple statements (e.g., CREATE TABLE + INSERT) in a single prompt
- **Safe Mode Validation**: Server-side regex validation blocks destructive SQL patterns
- **Spring-Based 3-Way Toggle**: Framer Motion powered database selector with smooth sliding animation
- **Optimistic UI**: Results panel updates immediately while maintaining sync with backend
- **Session Management**: Connection credentials stored in sessionStorage for workspace persistence
- **Dynamic Chat Interface**: Auto-resizing textarea with keyboard shortcuts (Enter to send, Shift+Enter for newline)

## 📸 Screenshots

| Connect | Workspace |
|---------|-----------|
| Database connection form with validation | AI chat + Results + Schema explorer |

## 🔒 Security Considerations

- Credentials stored client-side only (sessionStorage) — not persisted to disk
- Safe Mode enabled by default, blocks DROP/DELETE/TRUNCATE operations
- SQL injection prevented via parameterized queries
- MongoDB queries validated for safe operations
- CORS configured for development
- API keys (Gemini) stored server-side in `.env` (never exposed to frontend)
- Multi-statement support validated to prevent chaining malicious queries

---

<p align="center">
  Built with ☕ and curiosity — Supports PostgreSQL, MySQL, and MongoDB
</p>
