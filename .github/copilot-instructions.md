# Portfolio Chat – Copilot Instructions

## Big picture
- **Client-side React 19 portfolio** with RAG chatbot; **secure backend proxy** protects OpenAI API key. Chat flow: [src/services/chatAPIClient.js](src/services/chatAPIClient.js) → [src/services/ragService-secure.js](src/services/ragService-secure.js) → [api/embed.js](api/embed.js) + [api/chat.js](api/chat.js) → UI in [src/components/ChatHistory.js](src/components/ChatHistory.js).
- **Agentic architecture**: LLM can call 6 resume tools on-demand (`get_experience`, `get_education`, `get_projects`, `get_skills`, `get_certifications`, `get_contact_info`) via OpenAI function calling with proper JSON Schema validation. Tools in [src/services/ragService.js#L92](src/services/ragService.js#L92) with `emptySchema` ({type: 'object', properties: {}, required: []}). Agentic loop runs max 3 iterations: LLM → detect tool calls → execute tools → inject results → LLM final response.
- **Binary vector index**: Pre-computed embeddings stored in [public/rag/](public/rag/) (meta.json for metadata, vectors.f32 for Float32 embeddings, texts.txt for chunk content). Resume content is single source of truth in [public/data/resume.json](public/data/resume.json).
- **Action tags**: Responses ending with `<<ACTION:SCROLL_*>>` trigger auto-scroll to page sections. Parsed/stripped by ChatHistory regex; target sections have IDs in [src/pages/](src/pages/) components.
- **Security model**: Vercel Serverless Functions (`/api/embed`, `/api/chat`) proxy OpenAI requests. API key stored as `OPENAI_API_KEY` (no `REACT_APP_` prefix) in Vercel environment variables only.

## Project-specific patterns
- **Backend proxy architecture**: Client calls `/api/embed` and `/api/chat` Vercel serverless functions instead of OpenAI directly. API key secured server-side as `OPENAI_API_KEY` (no `REACT_APP_` prefix).
- **RAG pipeline**: Client-side embedding via `/api/embed` → dot-product similarity search (cosine for L2-normalized vectors) → format top-K chunks with citations → inject into system prompt. Scoped retrieval: project detection via Jaccard similarity on aliases OR LLM fallback, then filter vectors by `repo` field (k=8 for scoped, k=10 for broad).
- **Message formatting**: [ChatHistory.js](src/components/ChatHistory.js) pipeline: parse `[label](url)` links → bold `**text**` → strip action tags regex `/<?<?ACTION:SCROLL_[A-Z_]+>?>?/g`.
- **Theme system**: CSS variables only ([src/index.css](src/index.css)). No CSS-in-JS. Toggle via `document.documentElement.dataset.theme` (dark|light). Set in [src/App.js](src/App.js) localStorage + [src/components/TopNav.js](src/components/TopNav.js).
- **Factory pattern**: Reusable handlers via factory functions (e.g., `createScrollHandler`, `createMessageFormatter`). Avoid inline styles; use shared utilities in [src/App.css](src/App.css) (`.section`, `.card`, `.btn`).

## Workflows
- **Local dev with Vercel Functions**: `npm install` then `vercel dev` (NOT `npm start`—CRA dev server doesn't handle `/api` routes). Tests: `npm test`. Production build: `npm run build`.
- **Environment variables**: 
  - Local: Create `.env` file (not `.env.local`) with `OPENAI_API_KEY=sk-...` for `vercel dev`
  - Or pass via CLI: `OPENAI_API_KEY=sk-... vercel dev`
  - Or sync from Vercel: `vercel env pull` then `vercel dev`
  - Client-side (safe to expose): `REACT_APP_LLM_MODEL`, `REACT_APP_EMBEDDING_MODEL`, `REACT_APP_RAG_ENABLED`
- **Vercel deployment**: Set `OPENAI_API_KEY` in Vercel Dashboard (Project Settings → Environment Variables). API routes in `/api` auto-deploy.
- **Adding/changing resume data**: Edit [public/data/resume.json](public/data/resume.json) and regenerate the RAG index assets in [public/rag/](public/rag/) (see [CLIENT_SIDE_MIGRATION.md](CLIENT_SIDE_MIGRATION.md)).

## Gotchas
- `server.js` is deprecated; keep changes client-side only.
- Action tag must be the final characters in the model reply (e.g., `... <<ACTION:SCROLL_PROJECTS>>`) to trigger scroll.
- Section ids expected by scroll tags: `about-me`, `education`, `experience`, `projects`, `certifications`, `contact`.
- ✅ Tool schemas MUST be valid JSON Schema objects: `{type: 'object', properties: {}, required: []}`. Invalid schemas cause OpenAI 400 errors.
- ✅ Initialize RAG once in `RAGService.initialize()` on App mount
- ✅ Always pass conversation history (last 6 messages) to maintain context
- ✅ Wrap LLM calls in try-catch with fallback to resume-only context
- ✅ Normalize emails in LLM responses via `ragService.normalizeEmails()`
- ❌ NEVER expose API key in frontend code (use server-side env vars only)
- ✅ Use `OPENAI_API_KEY` (no REACT_APP_ prefix) for backend serverless functions
- ✅ Backend `/api` routes handle all OpenAI requests; client never calls OpenAI directly
- ✅ Use `vercel dev` for local testing with API routes (not `npm start`)

### Accessibility
- ✅ Semantic HTML (`<nav>`, `<button>`, `<section>`)
- ✅ ARIA labels where needed (`aria-label`, `aria-expanded`)
- ✅ Touch targets: 44×44px minimum
- ✅ Alt text for images; empty alt (`alt=""`) for decorative icons
- ✅ Keyboard navigation: Tab through interactive elements (buttons, links, inputs)

## Debugging Checklist

### RAG Not Initializing
- [ ] `.env.local` has `OPENAI_API_KEY=sk-...` (no REACT_APP_ prefix)
- [ ] Vercel environment variables: `OPENAI_API_KEY` set (Project Settings)
- [ ] `/rag/meta.json` exists and valid JSON (check Network tab)
- [ ] `/rag/vectors.f32` size = count × 1536 × 4 bytes (binary Float32)
- [ ] `/rag/texts.txt` size matches total text_length sum in meta.json
- [ ] Browser console shows "✅ RAG initialized successfully (secure proxy mode)"
- [ ] Network tab: requests to `/api/embed` and `/api/chat` return 200 (not direct `api.openai.com` calls)

### Action Tags Visible in Chat (Not Executing)
- [ ] ChatHistory.js regex correctly strips: `/<?<?ACTION:SCROLL_[A-Z_]+>?>?/g`
- [ ] LLM response has tag at **very end** (e.g., "...project. <<ACTION:SCROLL_PROJECTS>>")
- [ ] Target section has correct `id` attribute (e.g., `<section id="projects">`)
- [ ] Browser console: check for scroll errors, verify `document.getElementById()` finds element
- [ ] Test: manually paste tag in chat input to verify strip logic works

### Theme Not Switching
- [ ] `document.documentElement.dataset.theme` is either "dark" or "light"
- [ ] CSS rules exist for both `:root[data-theme="dark"]` and `:root[data-theme="light"]`
- [ ] Component CSS imports color tokens: `color: var(--text)`
- [ ] TopNav.js detects system preference: `window.matchMedia('(prefers-color-scheme)')`
- [ ] Check DevTools: computed styles show correct CSS variable values

### Chat Not Responding
- [ ] OpenAI API key valid and set in `.env` (for `vercel dev`) or Vercel Dashboard
- [ ] Using `vercel dev` (NOT `npm start`—required for `/api` routes)
- [ ] Billing/quota not exceeded on OpenAI account
- [ ] Browser console: check for errors in chatAPIClient.sendMessage()
- [ ] Network tab: `/api/chat` endpoint returns 200 (check response body for error details)
- [ ] API key is string type (check type validation in `/api/chat.js`)
- [ ] Verify RAG initialized before sending message
- [ ] Check Vercel function logs for backend errors

### Tools Not Being Called or 400 Schema Errors
- [ ] LLM model supports function calling (gpt-3.5-turbo-1106+, gpt-4+)
- [ ] Tool schemas are valid JSON Schema: `{type: 'object', properties: {}, required: []}` (required for OpenAI)
- [ ] Check `buildTools()` in [src/services/ragService.js#L92](src/services/ragService.js#L92)—all 6 tools must have `schema: emptySchema`
- [ ] Tool descriptions are clear and specific
- [ ] Check console for "🔧 LLM called X tool(s)" logs
- [ ] Agentic loop completing iterations (max 3) without errors
- [ ] Tool execution returns valid JSON-serializable data
- [ ] `/api/chat` endpoint correctly converts tools: `function: { name, description, parameters: t.schema }`

## Project Structure
```
src/
├── App.js                 # Root component: state (messages, theme, chat), RAG init
├── App.css                # Chat UI, layout utilities (.section, .card, .btn)
├── index.css              # Design tokens (colors, spacing, typography)
├── components/
│   ├── ChatHistory.js     # Message list: action tag detection, link/bold parsing, auto-scroll
│   ├── InputArea.js       # Text input + debounced send
│   ├── SectionHeader.js   # Section title component
│   ├── SuggestionChips.js # Quick action chips for common queries
│   └── TopNav.js          # Header: theme toggle, chat toggle
├── pages/
│   ├── AboutMe.js/css          # Profile section with image
│   ├── Education.js/css        # Education timeline with GPA
│   ├── Experience.js/css       # Work history (timeline layout)
│   ├── Projects.js/css         # Project cards grid with expand/collapse
│   ├── Certifications.js/css   # License & certification cards
│   └── ContactMe.js/css        # Contact info + social links
└── services/
    ├── ragService-secure.js # Core: backend proxy, retrieval, project detection (CURRENT)
    ├── ragService.js      # Legacy: direct OpenAI calls (deprecated for production)
    └── chatAPIClient.js   # Wrapper: ensures RAG ready before queries

api/
├── embed.js               # Vercel serverless: proxy OpenAI embeddings API
└── chat.js                # Vercel serverless: proxy OpenAI chat completions API

public/
├── data/
│   ├── resume.json        # Single source of truth: experience, education, projects, skills, socials
│   └── site_data.json     # (Legacy, may be deprecated)
└── rag/
    ├── meta.json          # Index metadata: count, dim, items[] (file_path, repo, chunk_id, text offsets)
    ├── vectors.f32        # Binary Float32 embeddings (pre-computed L2-normalized, dim=1536)
    └── texts.txt          # Concatenated chunk texts (UTF-8), indexed by text_offset/text_length
```

## Key Insights

1. **Client-side architecture** - No backend complexity, OpenAI API called directly from browser (fine for portfolio/demo, not production apps with sensitive API keys)

2. **Binary index design** - Custom retrieval optimized for small datasets (< 10k items). For larger datasets, consider FAISS/Pinecone.

3. **Action tags as LLM affordance** - Simple string-based protocol for navigation. Regex parser is forgiving (handles <<>>, <>, or no brackets).

4. **CSS variable architecture** - Theme switching is O(1) via single `data-theme` attribute change. No component re-renders.

5. **Factory functions** - Core React pattern used throughout (createScrollHandler, createMessageFormatter, etc.)

6. **Project context detection** - Two-tier approach: (1) alias matching with Jaccard similarity, (2) LLM fallback for fuzzy queries. Scopes retrieval to 8 chunks when project detected vs 10 for broad search.

7. **Email normalization** - Idempotent regex in ragService handles `plain@email.com`, `[email](url)`, and existing `[email](mailto:...)` links without duplication.

8. **Resume as API contract** - Single JSON file drives all portfolio sections + RAG context. Adding skills/projects only requires JSON edit + RAG index regeneration.

9. **Conversation memory** - sessionStorage-based rolling summary compresses multi-turn conversations into concise bullets, reducing token bloat while preserving context continuity. Summary stored in sessionStorage, updated async via fire-and-forget LLM calls.

## Documentation

- `BACKEND_PROXY_SECURITY.md` - Complete migration guide for secure backend proxy architecture
- `CLIENT_SIDE_MIGRATION.md` - Server → client-side Langchain migration notes
- `DESIGN_TOKENS.md` - Complete CSS variable system reference (468 lines)
- `LANGCHAIN_SETUP.md` / `LANGCHAIN_INTEGRATION.md` - Langchain config details
- `README.md` - Standard CRA instructions (not project-specific)

---

**Last Updated:** January 30, 2026  
**Status:** Production-ready (client-side RAG + conversation memory + secure backend proxy)
