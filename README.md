# TeamChat AI — Slack Clone with AI Assistant

A real-time team chat application with an AI assistant (@Claude) that responds when mentioned.

**Stack:** Next.js 14, Supabase Realtime, OpenAI, Tailwind CSS

---

## Features

- **Real-time messaging** — Messages appear instantly via WebSockets
- **Channels** — Organize conversations by topic
- **@Claude AI assistant** — Mention @Claude to get AI help
- **Knowledge base integration** — AI can reference your docs (optional)
- **Conversation context** — AI sees recent messages for context

---

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Setup

### 1. Supabase Database

You can use the same Supabase project as your support system. Run this SQL:

```sql
-- Channels table
create table channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Messages table
create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete cascade,
  user_name text not null,
  content text not null,
  is_ai boolean default false,
  created_at timestamptz default now()
);

-- Enable realtime for messages
alter publication supabase_realtime add table messages;

-- Index for faster queries
create index messages_channel_id_idx on messages(channel_id);
create index messages_created_at_idx on messages(created_at);
```

### 2. Enable Realtime

In Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Find the `messages` table
3. Toggle ON for **Realtime**

### 3. Environment Variables

Add to Vercel (or `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
```

### 4. Deploy

```bash
git init
git add .
git commit -m "Initial commit: Slack clone with AI"
git remote add origin https://github.com/YOUR_USERNAME/teamchat-ai.git
git push -u origin main
```

Then import to Vercel.

---

## Usage

1. Open the app
2. Type a message and press Enter
3. To get AI help, mention `@Claude` in your message:
   - "Hey @Claude, can you help me write a function?"
   - "@Claude what's the best way to learn React?"
   - "Can someone explain WebSockets? @Claude"

---

## Optional: Knowledge Base

To give Claude access to your own docs, use the same `knowledge_base` table from your support system. The AI will automatically search it for relevant context.

---

## Resume Line

> Built a real-time team chat with WebSocket messaging and an AI assistant that responds to @mentions. Supabase Realtime, OpenAI, RAG pipeline for knowledge retrieval.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main chat UI
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Slack-like styling
│   └── api/
│       └── ai-respond/    # AI response endpoint
│           └── route.ts
├── lib/
│   ├── supabase.ts        # Supabase client
│   └── types.ts           # TypeScript types
```
