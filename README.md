# Portfolio Chat

An interactive AI-powered portfolio with a client-side RAG chatbot. Ask questions about my projects, experience, and skills—no backend required.

**🌐 Live:** [gauranshsawhney.site](https://gauranshsawhney.site)

## ✨ Features

- **AI Chat Assistant** powered by OpenAI GPT
- **Smart Navigation** - Auto-scrolls to relevant sections based on your questions
- **Client-Side RAG** - Binary-indexed retrieval for instant responses
- **Dark/Light Themes** with system preference detection
- **Fully Responsive** - Mobile-first design

## 🚀 Quick Start (Local Development)

**Important:** Use `vercel dev` (not `npm start`) to run the backend API proxy locally.

```bash
# Install
npm install

# Create .env file (or set via CLI)
echo "OPENAI_API_KEY=sk-your-api-key-here" > .env

# Run with Vercel Functions
vercel dev
```

Visit at: `http://localhost:3000`

**Alternative:** Pass API key via CLI instead of `.env`:
```bash
OPENAI_API_KEY=sk-your-api-key-here vercel dev
```

## 🏗️ Tech Stack

- **React 19** - UI framework
- **Vercel Serverless Functions** - Backend proxy for OpenAI API (`/api/embed`, `/api/chat`)
- **Langchain.js** - Tool definitions for agentic function calling
- **OpenAI API** - LLM (text-embedding-3-large + GPT-3.5/4)
- **Binary Vector Index** - Custom Float32 storage for fast retrieval
- **CSS Variables** - Theme system (no CSS-in-JS)

## 📂 Key Files

- `src/services/ragService.js` - RAG engine with binary index retrieval & agentic tool calling
- `api/embed.js` - Backend proxy for OpenAI embeddings
- `api/chat.js` - Backend proxy for OpenAI chat with tool calling support
- `src/components/ChatHistory.js` - Message display + action tag parser
- `public/data/resume.json` - Portfolio content (single source of truth)
- `public/rag/` - Binary index assets (meta.json, vectors.f32, texts.txt)

## 🎨 Customization

Edit `public/data/resume.json` to update:
- Experience, education, projects, skills
- Contact info and social links
- Certifications

Theme colors in `src/index.css`:
```css
:root[data-theme="dark"] {
  --primary: #22D3EE;  /* Neon cyan */
}
```

## 📱 Deployment

Currently hosted on **[gauranshsawhney.site](https://gauranshsawhney.site)**.

To deploy your own version:
```bash
# Build
npm run build

# Set environment variable in Vercel Dashboard
# Project Settings → Environment Variables
# OPENAI_API_KEY: sk-your-key

# Deploy to Vercel (auto-deploys from GitHub)
vercel --prod
```

**Important:** API key must be set in Vercel Dashboard, not in code. `/api` routes auto-deploy.

---

**Author:** Gauransh Sawhney  
**Contact:** [gauransh30@gmail.com](mailto:gauransh30@gmail.com)
