# Portfolio Chat – Copilot Instructions

## Big picture
- Client-side React portfolio with RAG chatbot; no backend. Chat flow is in [src/services/chatAPIClient.js](src/services/chatAPIClient.js) → [src/services/ragService.js](src/services/ragService.js) → UI in [src/components/ChatHistory.js](src/components/ChatHistory.js).
- Retrieval uses binary vector assets in [public/rag/](public/rag/) (meta.json, vectors.f32, texts.txt). Resume content is the source of truth in [public/data/resume.json](public/data/resume.json).
- Action tags drive auto-scroll: responses may end with `<<ACTION:SCROLL_*>>`, parsed by ChatHistory; target sections live in page components under [src/pages/](src/pages/).

## Project-specific patterns
- RAG is fully client-side (OpenAI embeddings + LLM). `ragService` does embedding, dot-product search, chunk de-dupe by `chunk_id`, and optional project-scoped retrieval.
- Message formatting pipeline in `ChatHistory`: parse `[label](url)` links → bold `**text**` → strip action tags.
- Theme is CSS variables only in [src/index.css](src/index.css). Toggle is `document.documentElement.dataset.theme` (set in [src/App.js](src/App.js) and [src/components/TopNav.js](src/components/TopNav.js)).
- Avoid inline styles unless truly dynamic; use shared utilities in [src/App.css](src/App.css) (e.g., `.section`, `.card`, `.btn`).

## Workflows
- Local dev: `npm install` then `npm start` (CRA). Tests: `npm test`. Production build: `npm run build`.
- Environment variables in `.env.local`: `REACT_APP_OPENAI_API_KEY` (required), `REACT_APP_LLM_MODEL`, `REACT_APP_RAG_ENABLED`.
- Adding/changing resume data: edit [public/data/resume.json](public/data/resume.json) and regenerate the RAG index assets in [public/rag/](public/rag/) (see [CLIENT_SIDE_MIGRATION.md](CLIENT_SIDE_MIGRATION.md)).

## Gotchas
- `server.js` is deprecated; keep changes client-side only.
- Action tag must be the final characters in the model reply (e.g., `... <<ACTION:SCROLL_PROJECTS>>`) to trigger scroll.
- Section ids expected by scroll tags: `about-me`, `education`, `experience`, `projects`, `certifications`, `contact`.
- ✅ Initialize embedder once in `RAGService.initialize()` on App mount
- ✅ Always pass conversation history (last 6 messages) to maintain context
- ✅ Wrap LLM calls in try-catch with fallback to resume-only context
- ✅ Normalize emails in LLM responses via `ragService.normalizeEmails()`
- ❌ NEVER expose API key in frontend code (use .env.local only)

### Accessibility
- ✅ Semantic HTML (`<nav>`, `<button>`, `<section>`)
- ✅ ARIA labels where needed (`aria-label`, `aria-expanded`)
- ✅ Touch targets: 44×44px minimum
- ✅ Alt text for images; empty alt (`alt=""`) for decorative icons
- ✅ Keyboard navigation: Tab through interactive elements (buttons, links, inputs)

## Debugging Checklist

### RAG Not Initializing
- [ ] `.env.local` has `REACT_APP_OPENAI_API_KEY=sk-...`
- [ ] `/rag/meta.json` exists and valid JSON (check Network tab)
- [ ] `/rag/vectors.f32` size = count × 1536 × 4 bytes (binary Float32)
- [ ] `/rag/texts.txt` size matches total text_length sum in meta.json
- [ ] Browser console shows "✅ RAG initialized successfully"
- [ ] `ragService.getStatus()` returns `{ initialized: true, indexLoaded: true, apiKey: 'configured' }`

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
- [ ] OpenAI API key valid (test: `openai.ChatCompletion.create({...})`)
- [ ] Billing/quota not exceeded on OpenAI account
- [ ] Browser console: check for errors in chatAPIClient.sendMessage()
- [ ] Verify RAG initialized before sending message
- [ ] Check Network tab: POST requests to OpenAI endpoints returning 200

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
    ├── ragService.js      # Core: query embedding, retrieval, LLM inference, project detection
    └── chatAPIClient.js   # Wrapper: ensures RAG ready before queries

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

9. **Conversation memory** - sessionStorage-based rolling summary compresses multi-turn conversations into concise bullets, reducing token bloat while preserving context continuity.

## Documentation

- `CLIENT_SIDE_MIGRATION.md` - Server → client-side Langchain migration notes
- `DESIGN_TOKENS.md` - Complete CSS variable system reference (468 lines)
- `LANGCHAIN_SETUP.md` / `LANGCHAIN_INTEGRATION.md` - Langchain config details
- `README.md` - Standard CRA instructions (not project-specific)

---

**Last Updated:** January 28, 2026  
**Status:** Production-ready (client-side RAG + conversation memory)
