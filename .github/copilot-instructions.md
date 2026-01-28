# Portfolio Chat - AI Agent Guide

**Quick Overview:** React portfolio with client-side RAG chatbot. Binary vector index + OpenAI Embeddings + Langchain LLM. No backend server needed. Everything runs in the browser.

## Core Architecture

### Data Flow (All Client-Side)
```
User Query → ChatAPIClient → RAGService:
  1. Query Embedding (OpenAI text-embedding-3-large)
  2. Similarity Search (dot product on Float32 vectors)
  3. Chunk Deduplication (by chunk_id)
  4. LLM Inference (gpt-3.5-turbo or gpt-4)
  5. Email Link Normalization
→ Response with Action Tags → ChatHistory Parser → Auto-scroll Navigation
```

**Key Files:**
- [src/services/ragService.js](src/services/ragService.js) - Binary index retrieval + LLM prompting + project detection (~600 lines)
- [src/services/chatAPIClient.js](src/services/chatAPIClient.js) - Client-side Langchain wrapper (~50 lines)
- [src/components/ChatHistory.js](src/components/ChatHistory.js) - Message display + action tag parser + formatting
- [src/App.js](src/App.js) - Root state (messages, theme, chat visibility) + initialization
- [public/data/resume.json](public/data/resume.json) - Portfolio content (experience, education, projects, skills, socials)
- [public/rag/](public/rag/) - Binary index assets (meta.json, vectors.f32, texts.txt)

**NO backend server** - `server.js` is deprecated (see [CLIENT_SIDE_MIGRATION.md](CLIENT_SIDE_MIGRATION.md))


## Critical Patterns

### 1. Binary Index RAG (Custom, No External Vector Libs)

**Assets in `/public/rag/`:**
- `meta.json` - Metadata (count, dim, items[] with file_path, repo/project_name, chunk_id, text_offset, text_length, start_line, end_line)
- `vectors.f32` - Pre-computed L2-normalized embeddings (Float32Array, count × 1536)
- `texts.txt` - Concatenated UTF-8 chunk texts

**Retrieval Process (ragService.js):**
1. **embedQuery()** - Convert user message to embedding via OpenAI text-embedding-3-large, normalize to L2
2. **retrieveTopK()** - Compute dot-product similarity for all vectors, sort descending, return top-k
3. **dedupeAndFormatChunks()** - Deduplicate by `chunk_id` (eliminate duplicates across repos), format with citations
4. **LLM invocation** - Pass system prompt + retrieved context + conversation history to gpt-3.5-turbo/gpt-4

**Project Detection (before retrieval):**
- **detectProjectContext()** - Match user query against `projectAliases` map (normalized project titles)
- If no alias match, **detectProjectContextViaLLM()** - Ask LLM which project user references
- Use `repoFilter` to scope retrieval to matching project only (8 chunks scoped vs 10 chunks broad)

**Why binary format?**
- Faster load (~100ms vs seconds for JSON)
- Lower memory (binary vs JSON arrays)
- Enables O(1) text retrieval by offset (no deserialization per chunk)
- Simple dot-product similarity (no external vector libs needed)

### 2. Action Tags for Auto-Navigation (Silent Protocol)

**Format:** `<<ACTION:SCROLL_PROJECTS>>` (double angle brackets, uppercase, ends response)

**Valid Actions:** `SCROLL_ABOUT`, `SCROLL_EDUCATION`, `SCROLL_EXPERIENCE`, `SCROLL_PROJECTS`, `SCROLL_CERTIFICATIONS`, `SCROLL_CONTACT`

**Implementation (ChatHistory.js):**
- **Detection (lines 121-125):** Regex `/<?<?ACTION:SCROLL_[A-Z_]+>?>?/g` matches tags with or without brackets
- **Stripping:** Remove tags from display text via regex
- **Execution:** Detect action type → close chat → setTimeout 300ms → scrollIntoView() target element

**Example in LLM Response:**
```
"Check out the Image Coloration project—it uses PyTorch for real-time processing. <<ACTION:SCROLL_PROJECTS>>"
```

**LLM System Prompt Instructions (ragService.js line ~425-433):**
- Append EXACTLY ONE action tag at end if response maps to navigation intent
- No narration ("Let me scroll you...") — silent navigation only
- If no clear navigation intent, omit tag entirely
- Valid keyword mappings:
  - "Projects"/"GitHub"/"Code" → `<<ACTION:SCROLL_PROJECTS>>`
  - "Work"/"Job"/"Internship" → `<<ACTION:SCROLL_EXPERIENCE>>`
  - "Degree"/"University"/"GPA" → `<<ACTION:SCROLL_EDUCATION>>`
  - "Licenses"/"Certifications"/"Credentials" → `<<ACTION:SCROLL_CERTIFICATIONS>>`
  - "Contact"/"Email"/"LinkedIn" → `<<ACTION:SCROLL_CONTACT>>`

### 3. CSS Variables & Theme System (Design Tokens)

**All styling defined in [src/index.css](src/index.css) (lines 1–100):**
- Dark theme (default): `--bg: #0B0F19`, `--text: #E5E7EB`, `--primary: #22D3EE` (neon cyan)
- Light theme: `--bg: #F1F5F9`, `--text: #0F172A`, `--primary: #0EA5E9` (bright blue)
- All sizes, spacing, transitions also tokenized (--space-*, --radius, --transition-*)

**Theme Switching Mechanism:**
- Controlled by `document.documentElement.dataset.theme` ("dark" or "light")
- TopNav.js detects system preference on mount via `window.matchMedia('(prefers-color-scheme)')`
- Single attribute change cascades to all components (no re-renders needed)

**Usage Rules:**
- ✅ ALWAYS use CSS variables (`color: var(--text)`) — NEVER hardcoded colors
- ✅ PREFER shared utilities (`.section`, `.card`, `.chip`, `.btn` from App.css)
- ✅ Semantic HTML + flex/grid for layout (avoid absolute positioning)
- ✅ ALL interactive elements MUST have `:focus-visible` styles
- ✅ ALL animations MUST respect `@media (prefers-reduced-motion: reduce)` (see App.js lines 23–37)
- ❌ NEVER inline styles (`style={{}}`) except for truly dynamic values
- ❌ NEVER hardcoded colors/spacing/borders

### 4. Message Formatting & Link Parsing (ChatHistory.js)

**Three-stage formatting pipeline:**
1. **Link Parsing** - `[label](url)` → `<a href="url">{label}</a>` (supports mailto: links)
2. **Bold Parsing** - `**text**` → `<strong>text</strong>`
3. **Email Normalization** - Plain emails auto-converted to `[email](mailto:email)` by ragService.normalizeEmails()

**Factory Pattern for DRY Code (ChatHistory.js):**
```javascript
const createScrollHandler = (sectionId) => () => {
  onCloseChat();
  setTimeout(() => document.getElementById(sectionId)?.scrollIntoView(), 300);
};

// Reuse for all 5 sections
const handleScrollToEducation = createScrollHandler('education');
const handleScrollToProjects = createScrollHandler('projects');
```
**Why:** Eliminates repeated setTimeout + scrollIntoView logic 5+ times

### 5. React Hooks & State Management

**Key patterns in App.js:**
- **useRef** - `containerRef`, `nudgeTimeoutRef` for DOM access and cleanup
- **useEffect** - Initialize RAG service once on mount, cleanup timers on unmount
- **useState** - `messages[]`, `isLoading`, `isChatVisible`, `theme` (lifted to App root)
- **useCallback** - Debounce handlers to 300-500ms (input area, text processing)
- **React.memo()** - Wrap expensive list items (Projects cards, Education timelines) to avoid re-renders
- **Custom Hook: useInputNudge** - Session-scoped nudge animation for new users (respects prefers-reduced-motion)

**Message History Structure:**
```javascript
[
  { role: 'user', content: 'Tell me about X' },
  { role: 'assistant', content: 'Response with <<ACTION:SCROLL_X>>' }
]
```
- Passed to RAGService.query() for context window (truncate to last 6 messages)
- ChatHistory renders in reverse order (newest at bottom, auto-scroll on update)

### 6. Conversation Memory (Rolling Summary in sessionStorage)

**Pattern (ragService.js ~678–724):**
- **getConversationSummary()** - Retrieves persisted summary from sessionStorage
- **setConversationSummary()** - Stores summary in sessionStorage (survives page reload within session)
- **updateConversationSummaryAsync()** - Fire-and-forget LLM call to compress recent turns into concise bullet points (< 200 tokens)
- **buildSummaryPrompt()** - Instructs LLM to extract enduring context, user goals, and decisions

**Why:** Maintains conversation context across many turns without growing token count. Summary passed to LLM alongside recent history (last 6 messages) for continuity.

## Development Workflow

### Quick Setup (5 min)
```bash
npm install
# Create .env.local:
REACT_APP_OPENAI_API_KEY=sk-...
REACT_APP_LLM_MODEL=gpt-3.5-turbo  # or gpt-4
npm start  # Runs on http://localhost:3000
```

### Testing RAG Initialization
```javascript
// Browser console
import ragService from './services/ragService.js';
await ragService.initialize();
console.log(ragService.getStatus());
// Should see: { initialized: true, indexLoaded: true, apiKey: true }
```

### Build & Deployment
```bash
npm run build        # Creates optimized /build (gzip binary index assets)
npm test             # Runs Jest tests
npm run eject        # ⚠️  One-way CRA eject (avoid unless necessary)
``` in page sections:
   - `id="about-me"`, `id="education"`, `id="experience"`, `id="projects"`, `id="certifications"`, `id="contact"`
3. Check browser console for scroll errors
4. Verify LLM response includes tag at **very end** of message
5. Verify ChatHistory.js useEffect hook for action detection runs after message updat

**Add new project to resume:**
1. Edit [public/data/resume.json](public/data/resume.json) → add to `projects` array
2. Regenerate RAG index (Python script) → update `/rag/*` files
3. Restart app (React will fetch new resume.json)

**Fix action tag not executing:**
1. Verify ChatHistory.js regex matches: `/<?<?ACTION:SCROLL_[A-Z_]+>?>?/g`
2. Check target element exists: `id="projects"`, `id="education"`, etc. (see page JS files)
3. Check browser console for scroll errors
4. Verify LLM response includes tag at **very end** of message

**Update theme colors:**
1. Edit [src/index.css](src/index.css) → CSS variables in `:root[data-theme="dark/light"]`
2. Component CSS files inherit variables automatically
3. Test both dark/light modes: TopNav theme toggle tests both

## Code Standards (Enforced)

### CSS Rules
- ✅ ALWAYS use CSS variables from [src/index.css](src/index.css)
- ✅ PREFER shared utilities (`.section`, `.card`, `.chip`, `.btn`)
- ✅ ALL interactive elements MUST have `:focus-visible` styles (accessibility)
- ✅ ALL animations MUST respect `@media (prefers-reduced-motion: reduce)`
- ✅ Use semantic HTML (`<button>`, `<nav>`, not `<div onClick>`)
- ❌ NEVER inline styles (`style={{}}`) unless computing dynamic values
- ❌ NEVER hardcoded colors/spacing/radii

### React Hooks
- ✅ Call hooks at top level BEFORE conditional returns
- ✅ Debounce user input (300-500ms via useCallback)
- ✅ Use React.memo() for list items (Projects, Education cards)
- ✅ Cleanup side effects: always return cleanup function from useEffect
- ❌ NEVER call hooks inside conditions or loops

### Langchain & LLM
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
