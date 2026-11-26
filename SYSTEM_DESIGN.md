# AI-Powered IT Support Assistant & Operations Portal
## Comprehensive System Design & Workflow Architecture Document

---

## 1. Executive Summary & Core Objective

The **AI-Powered IT Support Assistant** is an internal corporate enterprise platform that automates Tier-1 IT support using **Groq LLM** orchestrated with **LangGraph**, and seamlessly escalates unresolved issues to human IT specialists via an integrated ticket management system.

### Primary Objectives:
1. **Reduce Tier-1 IT Ticket Volume**: Employees resolve common configuration, hardware, and access issues via instant, step-by-step guidance from Groq LLM.
2. **Context-Preserving Escalation**: When automated solutions fail, support tickets carry the entire conversation context (questions, attempted commands, and reasons for failure) to eliminate redundant back-and-forth communication.
3. **Operational Visibility**: IT administrators monitor live employee conversations and manage tickets across `OPEN`, `IN_PROGRESS`, and `RESOLVED` stages.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (React + TypeScript)"]
        UI_Emp["Employee Support Portal<br/>• AI Chat & History<br/>• Feedback Action Cards<br/>• Ticket Tracking"]
        UI_Admin["IT Operations Dashboard<br/>• Conversation Monitor<br/>• Ticket Management Desk<br/>• Operations Metrics"]
    end

    subgraph APILayer ["API Gateway Layer (FastAPI)"]
        Router_Auth["/api/v1/auth<br/>JWT & Password Hashing"]
        Router_Chat["/api/v1/chat<br/>Conversation & Feedback"]
        Router_Tickets["/api/v1/tickets<br/>Creation & Status Tracking"]
        Router_Admin["/api/v1/admin<br/>Dashboard & Monitoring"]
        RBAC["Role-Based Access Control<br/>(require_admin / require_employee)"]
    end

    subgraph AIWorkflow ["AI Orchestration Layer (LangGraph)"]
        Node_Process["Node 1: Query Intent Classifier"]
        Node_LLM["Node 2: Solution Generator (Groq LLM / Fallback)"]
        Node_Save["Node 3: Conversation State Persister"]
    end

    subgraph StorageLayer ["Persistence Layer"]
        DB_Relational[("PostgreSQL / SQLite<br/>Users, Conversations, Messages, Tickets")]
    end

    UI_Emp -->|REST Requests + JWT| APILayer
    UI_Admin -->|REST Requests + JWT| APILayer

    APILayer --> RBAC
    Router_Chat --> AIWorkflow

    Node_Process --> Node_LLM
    Node_LLM --> Node_Save

    Node_Save -->|Store Messages| DB_Relational
    Router_Tickets <--> DB_Relational
    Router_Admin <--> DB_Relational
```

---

## 3. Core Component Architecture

### A. Frontend Layer (React 18 + Vite + Tailwind CSS)
- **Role-Based Views**: Dynamic rendering depending on JWT claims:
  - **Employee Persona**: Chat interface with past session history, step-by-step troubleshooting displays, action cards (*"Yes, problem solved"* vs *"No, problem still exists"*), and personal ticket tracking.
  - **IT Admin Persona**: Control center with metrics cards, real-time query monitoring, and ticket lifecycle management.
- **Context-Aware Modals**: Ticket creation forms automatically extract the conversation title and user query into editable fields.

### B. Backend API Gateway (FastAPI)
- **Security & RBAC**:
  - `python-jose` for JWT creation and decoding.
  - `passlib[bcrypt]` for cryptographic password hashing.
  - Dependency-injected authorization guards (`require_admin`, `get_current_user`).
- **Resilient Database Layer**: Configured for PostgreSQL with automatic zero-configuration fallback to SQLite for local development.

### C. AI Workflow Engine (LangGraph + Groq LLM)
A single stateful workflow graph (`StateGraph`) manages each conversation turn:
- **State Schema (`AgentState`)**: Holds query, user ID, conversation ID, chat history, detected category, generated solution, and ticket recommendation flags.
- **LLM Integration**: Uses Groq's OpenAI-compatible Chat Completions endpoint (`GROQ_BASE_URL=https://api.groq.com/openai/v1`, default model `llama-3.1-8b-instant`) with a category-aware offline fallback if no API key is configured.

---

## 4. Data Model & Entity Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : "initiates"
    USERS ||--o{ TICKETS : "creates"
    CONVERSATIONS ||--o{ MESSAGES : "contains"
    CONVERSATIONS ||--o{ TICKETS : "linked_to"

    USERS {
        int id PK
        string email UK
        string full_name
        string hashed_password
        string role "employee | admin"
        string department
        datetime created_at
    }

    CONVERSATIONS {
        int id PK
        int user_id FK
        string title
        string status "active | resolved | ticket_raised"
        boolean is_resolved
        datetime resolved_at
        datetime created_at
        datetime updated_at
    }

    MESSAGES {
        int id PK
        int conversation_id FK
        string sender "user | assistant | system"
        text content
        text troubleshooting_steps
        datetime created_at
    }

    TICKETS {
        int id PK
        string ticket_number UK "e.g. TICK-2026-1042"
        int user_id FK
        int conversation_id FK "nullable"
        string title
        text description
        string category
        string priority "LOW | MEDIUM | HIGH | CRITICAL"
        string status "OPEN | IN_PROGRESS | RESOLVED"
        text resolution_notes
        int resolved_by_admin_id FK "nullable"
        datetime created_at
        datetime updated_at
    }
```

---

## 5. LangGraph State Machine Specification

```mermaid
stateDiagram-v2
    [*] --> process_query
    process_query --> generate_response : Category & Intent Extracted
    generate_response --> save_conversation : Groq LLM Response Formulated
    save_conversation --> [*] : Persisted to DB
```

| Node Name | Function | Input State Keys | Mutated / Output Keys |
|---|---|---|---|
| `process_query` | Extracts IT category keywords (Network, VPN, Outlook, Hardware, Software, Access) | `query` | `category` |
| `generate_response` | Calls Groq Chat Completions API (or category-aware fallback) for step-by-step troubleshooting | `query`, `category`, `history` | `response_content`, `troubleshooting_steps`, `suggest_ticket` |
| `save_conversation` | Saves assistant message to database and updates conversation title | `response_content`, `conversation_id` | `saved_message_id` |
