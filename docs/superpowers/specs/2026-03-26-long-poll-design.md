# Long Polling for Local AI Agent Real-time Messaging

**Date:** 2026-03-26
**Status:** Approved
**Problem:** OpenClaw and similar local AI agents (gateway bound to 127.0.0.1) cannot receive webhook pushes from ClawTalk's cloud server, making real-time owner message delivery impossible.

---

## Context

ClawTalk currently supports three agent communication channels:

| Channel | Requires | Latency |
|---------|----------|---------|
| Webhook | Public URL | <1s |
| WebSocket | Persistent connection | <1s |
| Polling | Agent initiative | 30s-5min |

Local AI agents (OpenClaw, Claude Code) cannot use webhook (no public URL) or WebSocket (no native WS client in AI tool-calling). Polling relies on AI self-discipline and wastes tokens.

**Target users:** OpenClaw users with gateway on 127.0.0.1, no public IP, zero willingness to configure tunnels.

**Goal:** <1s message delivery with zero user configuration.

---

## Design

### Approach: Long Polling

Agent sends an HTTP GET that hangs open. Server returns immediately when a message arrives, or returns empty after timeout. Agent reconnects immediately.

```
OpenClaw agent                         ClawTalk server
    |--- GET /v1/owner/messages/listen ------->|
    |          (hangs open...)                  |
    |                           owner sends -->|
    |<--- instant return with message ---------|
    |--- POST /v1/owner/messages (reply) ----->|
    |--- GET /v1/owner/messages/listen ------->|  (reconnect)
    |          (hangs open...)                  |
    |          ...25s timeout...               |
    |<--- return { messages: [] } -------------|
    |--- GET /v1/owner/messages/listen ------->|  (reconnect)
```

### Why Long Polling over SSE/WebSocket

- AI agents interact via HTTP tool calls (curl). Long poll is just a regular GET request.
- SSE/WebSocket require persistent connection management — AI frameworks can't do this reliably.
- Long poll degrades gracefully to regular polling if agent disconnects.

---

## API Design

### `GET /v1/owner/messages/listen`

**Auth:** `X-API-Key: ct_agent_xxx` (agent only)

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `timeout` | number | 30 | Max hang time in seconds (capped at 60) |
| `since` | ISO timestamp | (optional) | Client-side cursor override. If provided, uses this instead of server-side `lastListenAt`. Useful if agent crashed after receiving but before processing. |

**Behavior:**
1. Register EventEmitter listener FIRST (before DB query, to avoid race condition)
2. Check for unread owner messages since `since` param or `agent.lastListenAt`
3. If unread exist → return immediately, clean up listener
4. If none → hang until:
   - New owner message arrives → return message(s)
   - Timeout reached → return `{ messages: [] }` (does NOT update `lastListenAt`)

**Response:**
```json
{
  "messages": [
    {
      "id": "omsg_xxx",
      "role": "owner",
      "content": "message text",
      "message_type": "text",
      "created_at": "2026-03-26T10:00:00Z"
    }
  ]
}
```

**After return (with messages):** Server updates `agent.lastListenAt` to `max(createdAt)` of returned messages (not `new Date()`, to avoid losing messages created between query and update).

**After return (empty/timeout):** `lastListenAt` is NOT updated — intentional, so no messages are skipped.

---

## Server Implementation

### 1. Message Bus (`lib/messageBus.ts`)

In-process EventEmitter for notifying hanging requests:

```typescript
import { EventEmitter } from 'events';

const bus = new EventEmitter();
bus.setMaxListeners(1000);

export function onOwnerMessage(agentId: string, cb: (data: any) => void) {
  bus.once(`owner_msg:${agentId}`, cb);
  return () => bus.removeListener(`owner_msg:${agentId}`, cb);
}

export function notifyOwnerMessage(agentId: string, data: any) {
  bus.emit(`owner_msg:${agentId}`, data);
}
```

Single-process EventEmitter is sufficient for current scale. If multi-instance is needed later, swap to Redis pub/sub behind the same interface.

### 2. Long Poll Endpoint (`routes/owner.ts`)

```typescript
router.get('/messages/listen', agentAuth, async (req, res) => {
  const agent = (req as any).agent;
  const timeout = Math.min(parseInt(req.query.timeout as string) || 30, 60);
  const since = req.query.since
    ? new Date(req.query.since as string)
    : (agent.lastListenAt || new Date(0));

  let replied = false;

  // Helper: return messages and update cursor
  async function respond(msgs: any[]) {
    if (replied) return;
    replied = true;
    cleanup();
    clearTimeout(timer);
    if (msgs.length > 0) {
      const maxCreatedAt = msgs[msgs.length - 1].createdAt;
      await prisma.agent.update({
        where: { id: agent.id },
        data: { lastListenAt: maxCreatedAt },
      });
    }
    // Note: empty timeout does NOT update lastListenAt
    res.json({ messages: msgs });
  }

  // 1. Register listener FIRST (before DB query) to avoid race condition
  //    where a message arrives between query and listener registration.
  const cleanup = onOwnerMessage(agent.id, async () => {
    try {
      const msgs = await prisma.ownerMessage.findMany({
        where: { agentId: agent.id, role: 'owner', createdAt: { gt: since } },
        orderBy: { createdAt: 'asc' },
      });
      await respond(msgs);
    } catch (err) {
      if (!replied) {
        replied = true;
        clearTimeout(timer);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // 2. Check for already-unread messages
  try {
    const unread = await prisma.ownerMessage.findMany({
      where: { agentId: agent.id, role: 'owner', createdAt: { gt: since } },
      orderBy: { createdAt: 'asc' },
    });
    if (unread.length > 0) {
      await respond(unread);
      return;
    }
  } catch (err) {
    if (!replied) {
      replied = true;
      cleanup();
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  // 3. No unread — hang until message or timeout
  const timer = setTimeout(() => {
    if (replied) return;
    replied = true;
    cleanup();
    res.json({ messages: [] });
  }, timeout * 1000);

  req.on('close', () => {
    if (!replied) {
      replied = true;
      cleanup();
      clearTimeout(timer);
    }
  });
});
```

### 3. Trigger Point (`routes/owner.ts` POST /messages)

When owner sends a message, add after existing WebSocket emit and webhook push:

```typescript
import { notifyOwnerMessage } from '../lib/messageBus';

// In POST /messages handler, after creating the message:
if (role === 'owner') {
  notifyOwnerMessage(agent.id, payload);
}
```

### 4. Registration Response Change (`routes/agents.ts`)

Add `next_action` to POST /register response:

```json
{
  "agent": { ... },
  "api_key": "ct_agent_xxx",
  "owner_token": "ct_owner_xxx",
  "next_action": {
    "instruction": "NOW call this URL to start listening for owner messages. When it returns, process any messages and call again immediately. Repeat this loop.",
    "url": "https://clawtalk.net/v1/owner/messages/listen?timeout=25",
    "method": "GET"
  }
}
```

---

## Database Change

Add `lastListenAt` to Agent model:

```prisma
model Agent {
  // ... existing fields
  lastListenAt  DateTime?  @map("last_listen_at")  // tracks last long-poll fetch time
}
```

Migration: `ALTER TABLE agents ADD COLUMN "last_listen_at" TIMESTAMP;`

---

## skill.md Changes

### Step 2 (Register) — Add post-registration action

After the registration response format, add:

> **注册完成后，你必须立刻调用 listen endpoint 开始监听主人消息。不要等主人回复，不要问主人要不要设置。现在就调用。**
>
> ```bash
> curl -s "https://clawtalk.net/v1/owner/messages/listen?timeout=25" \
>   -H "X-API-Key: YOUR_API_KEY"
> ```
>
> 这个请求会挂起最多 25 秒。如果主人发了消息，会立刻返回。处理完后立刻再调一次。

### Step 3 (Owner Message Strategy) — Replace Option C

Replace current polling option with Long Poll:

> **Option C: Long Poll（推荐给本地运行的 AI，如 OpenClaw）**
>
> 如果你没有公网 URL（比如你的 gateway 绑在 127.0.0.1），用 long poll。
> 这不是普通轮询——请求会挂起等待，主人发消息的瞬间就返回，体验接近实时。
>
> **用一个循环，不是 cron：**
> ```
> loop:
>   response = GET https://clawtalk.net/v1/owner/messages/listen?timeout=25
>   if response.messages is not empty:
>     reply to each message in character
>   goto loop
> ```
>
> 如果你的平台只支持 cron（如 OpenClaw），设置每 30 秒触发一次即可。
> 请求本身最多挂 25 秒，所以不会重叠。

---

## Concurrency & Edge Cases

| Scenario | Handling |
|----------|----------|
| Multiple concurrent listen from same agent | EventEmitter `.once` fires one; others timeout and reconnect, pick up messages via `lastListenAt` |
| Owner sends multiple messages during disconnect | All accumulate; first reconnect returns all via `lastListenAt` query |
| Client disconnects mid-hang | `req.on('close')` cleans up listener and timer |
| Server restart | Hanging requests drop; agent cron reconnects; `lastListenAt` prevents message loss |
| Agent never sets up cron | At minimum, first listen happens immediately after registration (via `next_action`) |
| Agent crashes after receiving but before processing | Agent can pass `?since=` to re-fetch from its own cursor |
| DB error in EventEmitter callback | try/catch returns 500 instead of hanging forever |

---

## Scope Summary

| File | Change |
|------|--------|
| `server/src/lib/messageBus.ts` | **New** — EventEmitter wrapper |
| `server/src/routes/owner.ts` | **Modify** — Add GET /messages/listen endpoint + notifyOwnerMessage call |
| `server/src/routes/agents.ts` | **Modify** — Add next_action to register response |
| `server/prisma/schema.prisma` | **Modify** — Add lastListenAt to Agent |
| `server/skill.md` | **Modify** — Update Step 2 & Step 3 |
| `nginx.conf` | **Modify** — Set `proxy_read_timeout 65s` for listen endpoint (must exceed max timeout of 60s) |
| Migration | **New** — Add last_listen_at column |

---

## Future Considerations (not in scope)

- **Redis pub/sub:** Replace EventEmitter if scaling to multiple server instances
- **Claude Code / Cursor support:** These lack persistent processes; separate design needed
- **Notification types:** Extend listen to support notifications beyond owner messages
