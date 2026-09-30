# CanTrack — Architecture

Four layers, each in its own stack. The frontend only talks to the backend; the backend is the
only layer that talks to the database and to the AI models, and the only one that holds secrets.

```mermaid
flowchart LR
    U([User<br/>dog walker / owner]):::user
    subgraph FE [Layer 1 · Frontend · Vercel]
        W[React 19 + Vite PWA<br/>TypeScript]
    end
    subgraph BE [Layer 2 · Backend · Render]
        A[FastAPI · Python<br/>REST + auth guard]
        S[cantrack_api.structures<br/>hand-written Stack · Queue · Lists<br/>AVL · Weighted graph + Dijkstra]
        A --- S
    end
    subgraph DB [Layer 3 · Database · Supabase]
        P[(PostgreSQL + pgvector<br/>Auth)]
    end
    subgraph AI [Layer 4 · AI]
        E[Image embeddings<br/>CLIP · Hugging Face]
        V[Vision model<br/>Ollama Cloud]
    end
    U -- taps, camera --> W
    W -- HTTPS + JSON<br/>Bearer token --> A
    A -- SQL / supabase client<br/>service-role key --> P
    A -- HTTPS + API key --> E
    A -- HTTPS + API key --> V
    classDef user fill:#FACC15,stroke:#EAB308,color:#000
```

Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `HF_TOKEN`, `OLLAMA_API_KEY`) live in the backend `.env`
(git-ignored). The browser never sees them and never calls the AI or the database directly.

## Request journey: a walker checks a dog in

```mermaid
sequenceDiagram
    actor Walker
    participant FE as Frontend (React)
    participant BE as Backend (FastAPI)
    participant DB as Supabase (Postgres)
    participant AI as AI (CLIP + vision)
    Walker->>FE: takes a photo at the stop
    FE->>BE: POST /routes/{id}/check-in (image, Bearer token)
    BE->>DB: validate token, load the dogs of this route
    DB-->>BE: dogs + stored embeddings
    BE->>AI: image -> 512-d embedding
    AI-->>BE: embedding
    BE->>BE: nearest dog by cosine similarity, above threshold
    BE->>DB: INSERT checkin (route_id, dog_id)
    DB-->>BE: row
    BE-->>FE: 201 { dog, similarity }
    FE-->>Walker: "Rocky checked in" + undo button (Stack)
```

## Entity-relationship diagram

```mermaid
erDiagram
    AUTH_USERS ||--o{ DOGS : "owns (owner_id)"
    AUTH_USERS ||--o{ ROUTES : "walks (walker_id)"
    ROUTES ||--o{ CHECKINS : "has"
    DOGS ||--o{ CHECKINS : "appears in"
    AUTH_USERS {
        uuid id PK
        text email
        jsonb user_metadata "role: walker or owner"
    }
    DOGS {
        uuid id PK
        uuid owner_id FK
        text name
        text breed
        text notes
        vector_512 embedding "CLIP, pgvector"
        timestamptz created_at
    }
    ROUTES {
        uuid id PK
        uuid walker_id FK
        jsonb stops "ordered stops"
        timestamptz created_at
    }
    CHECKINS {
        uuid id PK
        uuid route_id FK
        uuid dog_id FK
        timestamptz created_at
    }
```

Source of truth for the schema: `apps/api/schema.sql`.

## Where each data structure lives

| Structure | Used for |
|---|---|
| Stack | undo history of check-ins |
| Queue | GPS ingestion buffer |
| Singly linked list | ordered stops of a route (reorder / remove) |
| Doubly linked list | walk timeline, navigable both ways |
| Circular list | recurring route rotation |
| AVL tree | next pickup by time, O(log n) |
| Weighted graph + Dijkstra | shortest path through the street mesh |
