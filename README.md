# 🗃️ AuraDB — AI SQL Workspace

> A modern, AI-powered PostgreSQL client that converts natural language to SQL queries using Google Gemini API.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss)

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Natural Language Queries** | Type questions in plain English, get executable SQL powered by Gemini AI |
| **Safe Mode** | Blocks dangerous operations (DROP, DELETE, TRUNCATE) with confirmation modals |
| **Transaction Control** | BEGIN, COMMIT, ROLLBACK buttons for manual transaction management |
| **Schema Explorer** | Auto-fetches and displays database schema with tables, columns, and types |
| **Real-time Results** | Execute queries with instant table/chart visualization |
| **CSV Export** | One-click export of query results |
| **Terminal Console** | Color-coded logs for queries, errors, and system messages |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  TopBar  │  │  AI Panel   │  │ Results  │  │   Terminal   │  │
│  │(Actions) │  │ (Chat UI)   │  │ (Table)  │  │  (Console)   │  │
│  └──────────┘  └─────────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │ REST API
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  /connect   │  │  /ai-query   │  │  /execute              │  │
│  │  (Auth)     │  │  (Gemini AI) │  │  (SQL Execution)       │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
```

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript + Vite
- TailwindCSS + shadcn/ui components
- Framer Motion (animations)
- TanStack Query (data fetching)
- Recharts (data visualization)

**Backend:**
- FastAPI (Python)
- psycopg2 (PostgreSQL driver)
- Google Gemini API (AI/LLM)
- Pydantic (validation)

## 🚀 Quick Start

```bash
# 1. Clone & setup backend
cd Backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 2. Configure environment
echo "GEMINI_API_KEY=your_api_key" > .env

# 3. Start backend
uvicorn main:app --port 8001 --reload

# 4. Start frontend (new terminal)
cd Frontend
npm install && npm run dev
```

## 💡 Technical Highlights

- **AI Context Injection**: Schema metadata is dynamically injected into Gemini prompts for accurate SQL generation
- **Safe Mode Validation**: Server-side regex validation blocks destructive SQL patterns
- **Optimistic UI**: Results panel updates immediately while maintaining sync with backend
- **Session Management**: Connection credentials stored in sessionStorage for workspace persistence
- **Dynamic Chat Interface**: Auto-resizing textarea with keyboard shortcuts (Enter to send, Shift+Enter for newline)

## 📸 Screenshots

| Connect | Workspace |
|---------|-----------|
| Database connection form with validation | AI chat + Results + Schema explorer |

## 🔒 Security Considerations

- Credentials stored client-side only (sessionStorage)
- Safe Mode enabled by default
- SQL injection prevented via parameterized queries
- CORS configured for development

---

<p align="center">
  Built with ☕ and curiosity
</p>
