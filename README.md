# AI-Powered IT Support Assistant & Operations Portal

A Company Internal AI IT Support Chatbot powered by **Groq LLM** and **LangGraph**, paired with an Integrated Ticket Management System.

Built with **FastAPI**, **LangGraph**, **Groq LLM (OpenAI-compatible API)**, **PostgreSQL / SQLite**, and **React.js + TypeScript + Tailwind CSS**.

---

## 🎯 Project Overview & Objective

The goal of this MVP is to deliver a streamlined, practical, and dependable internal IT operations solution:
1. **AI IT Support Assistant**: An employee asks an IT-related question (e.g., Wi-Fi issues, Outlook sync failure, VPN errors, software installs).
2. **LangGraph + Groq LLM Workflow**: The workflow classifies the IT category, compiles recent conversation history, and invokes **Groq LLM** (`llama-3.1-8b-instant` by default) to return clear, step-by-step troubleshooting guidance (with an offline fallback if no API key is configured).
3. **Employee Feedback Loop**: The employee tests the steps and clicks:
   - **"Yes, problem solved"**: The conversation is marked as resolved and stored in the database.
   - **"No, problem still exists"**: A ticket creation form is displayed with the conversation context and issue details pre-populated.
4. **Ticket Escalation**: A ticket is created and linked directly to the chat conversation, so IT administrators see the complete troubleshooting history without duplicate questions.
5. **IT Administrator Dashboard**: Administrators can:
   - View all employee conversations and monitor queries in real time.
   - Manage support tickets and update statuses: `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`.

---

## 🏗️ Architecture & Technology Stack

```text
                 EMPLOYEE
                    |
                    v
              REACT FRONTEND
                    |
          +---------+---------+
          |                   |
          v                   v
       AI CHAT            TICKETS
          |                   |
          v                   |
      FASTAPI BACKEND <-------+
          |
          v
       LANGGRAPH
          |
          +------------------+
          |                  |
          v                  v
   CATEGORY INTENT     GROQ LLM API
          |           (with fallback)
          +--------+---------+
                   |
                   v
           GENERATE SOLUTION
                   |
                   v
           SAVE CONVERSATION
                   |
                   v
     DATABASE (PostgreSQL / SQLite)
                   |
                   v
            ADMIN DASHBOARD
                   |
              +----+-----+
              |          |
              v          v
           MONITOR     MANAGE
            CHATS      TICKETS
```

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Tailwind CSS | Vite bundler, Lucide icons, Employee Chat & IT Admin Portals |
| **Backend** | Python 3.11 + FastAPI | Async REST APIs, JWT Role-based Authentication, CORS |
| **Workflow** | LangGraph | StateGraph orchestrating Query Processing $\rightarrow$ Groq LLM $\rightarrow$ Save |
| **LLM** | Groq (`llama-3.1-8b-instant`) | Accessed via OpenAI-compatible `https://api.groq.com/openai/v1` |
| **Database** | SQLAlchemy ORM | Users, Conversations, Messages, Tickets (SQLite / PostgreSQL) |
| **Deployment** | Local batch scripts & Docker Compose | `run_backend.bat`, `run_frontend.bat`, `docker-compose.yml` |

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── app/
│   │   ├── config.py              # Application settings (Pydantic Settings, Groq config)
│   │   ├── database.py            # SQLAlchemy engine, session & auto-fallback
│   │   ├── models.py              # Database models (User, Conversation, Message, Ticket)
│   │   ├── schemas.py             # Pydantic validation schemas
│   │   ├── auth.py                # Password hashing, JWT & RBAC dependencies
│   │   ├── main.py                # FastAPI entry point & router mounting
│   │   ├── workflow/
│   │   │   ├── state.py           # TypedDict AgentState for LangGraph
│   │   │   └── graph.py           # LangGraph StateGraph pipeline (Groq LLM + fallback)
│   │   └── routers/
│   │       ├── auth.py            # /auth/register, /auth/login, /auth/me
│   │       ├── chat.py            # /chat, /chat/feedback, /chat/conversations
│   │       ├── tickets.py         # /tickets, /tickets/{id}
│   │       └── admin.py           # /admin/dashboard, /admin/tickets, /admin/chats
│   ├── tests/                     # Pytest suite for workflow and API endpoints
│   ├── seed_data.py               # Database seeder with sample accounts, chat & tickets
│   ├── requirements.txt           # Python dependencies
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx         # Navigation header & quick demo persona switcher
│   │   │   ├── LoginModal.tsx     # Authentication modal
│   │   │   ├── ChatView.tsx       # ChatGPT-style IT support chat with feedback cards
│   │   │   ├── TicketModal.tsx    # Modal to escalate unresolved issues to a ticket
│   │   │   ├── EmployeeTicketsView.tsx # Employee tickets list with live status badges
│   │   │   ├── AdminDashboard.tsx # Control center overview cards & metrics
│   │   │   ├── AdminTicketsView.tsx # Ticket desk (OPEN -> IN_PROGRESS -> RESOLVED)
│   │   │   └── AdminChatsView.tsx # Real-time conversation monitoring
│   │   ├── context/AuthContext.tsx# Authentication state & session provider
│   │   ├── services/api.ts        # Typed fetch client for backend endpoints
│   │   ├── types/index.ts         # TypeScript definitions
│   │   ├── App.tsx                # App root & persona router
│   │   ├── main.tsx
│   │   └── index.css              # Tailwind styles
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── docker-compose.yml             # Docker stack (PostgreSQL + Backend + Frontend)
├── run_backend.bat                # Windows 1-click backend runner
├── run_frontend.bat               # Windows 1-click frontend runner
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Pre-requisites
- **Python 3.11+** installed
- **Node.js 18+** installed
- **Groq API Key** set in `backend/.env`:
  ```env
  GROQ_API_KEY=your-groq-api-key-here
  GROQ_MODEL=llama-3.1-8b-instant
  GROQ_BASE_URL=https://api.groq.com/openai/v1
  ```

### 2. Option A: Local Execution (Fastest)

#### Backend Setup:
```powershell
# Navigate to backend
cd backend

# Activate virtual environment
.\venv\Scripts\activate

# Seed sample users, conversation, and tickets
python seed_data.py

# Start the FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API is now live at: `http://localhost:8000`  
Swagger API Documentation: `http://localhost:8000/docs`

#### Frontend Setup:
In a new terminal:
```powershell
# Navigate to frontend
cd frontend

# Start the Vite development server
npm run dev
```
Open your browser to: `http://localhost:5173`

---

### 3. Option B: One-Click Windows Launchers
Double-click:
1. `run_backend.bat` (Starts FastAPI on `http://localhost:8000`)
2. `run_frontend.bat` (Starts React Frontend on `http://localhost:5173`)

---

### 4. Option C: Docker Compose
```bash
GROQ_API_KEY=your-groq-api-key docker compose up --build
```
This spins up PostgreSQL, the FastAPI backend, and the React frontend on `http://localhost:3000`.

---

## 🔑 Pre-Seeded Demo Credentials

The database comes pre-seeded with accounts ready for instant testing:

| Role | Email | Password | Persona |
|---|---|---|---|
| **IT Administrator** | `admin@company.com` | `adminpassword123` | Full admin privileges, ticket management, chat monitoring |
| **Employee** | `employee@company.com` | `employeepassword123` | Alex Johnson (Finance & Operations) |
| **Employee 2** | `sarah.dev@company.com` | `employeepassword123` | Sarah Chen (Engineering) |

---

## ⚙️ Running Automated Tests

To run the unit and integration tests:

```powershell
cd backend
.\venv\Scripts\pytest -v
```
