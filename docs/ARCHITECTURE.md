# Architecture

The app is split by layer and feature. Each layer only talks to the one below it through the
interfaces listed here, so a module can be rewritten without touching its neighbours.

```
src/app (routes)  →  src/features/rag/server  →  src/features/rag/core (pure)
                                              →  src/db (Drizzle)
src/features/chat (UI)  →  HTTP: /api/documents, /api/chat
```

## Shared types — `src/features/rag/types.ts`

| Type               | Meaning                                                                              |
| ------------------ | ------------------------------------------------------------------------------------ |
| `RetrievedChunk`   | A search hit: `documentName`, `chunkIndex`, `content`, `score` (1 − cosine distance) |
| `DocumentSummary`  | A row of the documents list, with its chunk count                                    |
| `UploadResult`     | `document`, `chunksInserted`, `chunksSkipped`                                        |
| `RagUIMessage`     | AI SDK `UIMessage` with one custom data part, `data-sources`                         |
| `RATE_LIMIT_ERROR` | Error text the chat stream sends on a 429; the UI matches on it                      |
| `NOT_FOUND_ANSWER` | The exact reply the model must give when the excerpts don't cover it                 |

## Core (pure, unit tested) — `src/features/rag/core/`

- `chunkText(text, { size = 800, overlap = 150 })` — splits on paragraph, then line, then sentence,
  then whitespace near the end of each window. Never returns a chunk longer than `size`.
- `buildSystemPrompt(chunks)` — rules plus excerpts wrapped in `<excerpt n source>` tags. Excerpt text
  is escaped so a document cannot close its tag, and the model is told to ignore instructions inside.

## Server — `src/features/rag/server/`

| Function                                | Responsibility                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `embedTexts(texts)`                     | OpenRouter embeddings model (`OPENROUTER_EMBEDDING_MODEL`, default `nvidia/nemotron-3-embed-1b:free`, 2048 dimensions), batches of 32     |
| `getChatModel()`                        | OpenRouter through `@ai-sdk/openai-compatible`; model id from `OPENROUTER_MODEL`                                                          |
| `toChatErrorMessage(error)`             | 429 → `RATE_LIMIT_ERROR`, config error → its hint, anything else → generic text                                                           |
| `extractText(file)`                     | `.md`/`.markdown`/`.txt` as text, `.pdf` via unpdf                                                                                        |
| `ingestDocument(name, text, sessionId)` | One transaction: upsert the session's document by name, embed only new chunk hashes, delete chunks no longer in the file, report progress |
| `searchChunks(query, sessionId, k = 5)` | Embeds the query; searches the session's documents plus the shared examples by cosine distance                                            |
| `listDocuments(sessionId)`              | The session's documents plus shared examples, with chunk counts                                                                           |

Swapping a provider means changing `embedTexts` or `getChatModel` only. The embedding dimension (2048, stored as `halfvec`) is
pinned in `src/db/schema.ts`.

## HTTP

| Route                 | Input (Zod)                                                                            | Output                                                             |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `GET /api/documents`  | —                                                                                      | `{ documents }`                                                    |
| `POST /api/documents` | multipart `file`: .md/.markdown/.txt/.pdf, ≤ 5 MB, ≤ 300 chunks                        | `UploadResult`; 400 bad input, 413 too large, 422 PDF without text |
| `POST /api/chat`      | `{ messages }`: 1–50 messages, user/assistant only, last from user, text ≤ 4,000 chars | UI message stream                                                  |

The chat stream writes `data-sources` before the first token, so the sources panel fills while the
answer streams and still shows what was retrieved if generation fails. Only the last 10 messages go
to the model. `req.signal` is passed to `streamText`, so Stop cancels the upstream request.

## UI — `src/features/chat/`

`RagWorkspace` is the only client boundary. It owns `useChat`, the selected answer and the documents
list, and lays out three panels: documents, chat, sources. Answers render through Streamdown with a
remark plugin that turns `[n]` into buttons linked to source card `n`. Raw HTML and images are not
rendered.

## Sessions and data ownership

`src/proxy.ts` gives every visitor an anonymous `rag_session` cookie (`httpOnly`, `SameSite=Lax`) and
handles locale routing. Route handlers read the id with `getSessionId()` and pass it to every query:
documents, chunks and feedback belong to a session, while rows with a null `session_id` are shared,
read-only examples indexed from `examples/` on first use. Uploads older than 24 hours are removed during
ingestion, and rate limits are fixed-window counters in the `rate_limits` table, so they hold across
serverless instances.

## Upload progress

`POST /api/documents` answers with NDJSON: `received`, `chunking`, `embedding` (done and total), `saving`,
then `done` with the result or `error` with a code. Failures before the stream starts are plain JSON
`{ error, code }`; the client translates by code.
