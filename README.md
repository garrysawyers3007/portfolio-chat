# Portfolio Chat

An interactive AI-powered portfolio with a client-side RAG chatbot. Ask questions about my projects, experience, and skills—no backend required.

## ✨ Features

- **AI Chat Assistant** powered by OpenAI GPT
- **Smart Navigation** - Auto-scrolls to relevant sections based on your questions
- **Client-Side RAG** - Binary-indexed retrieval for instant responses
- **Dark/Light Themes** with system preference detection
- **Fully Responsive** - Mobile-first design

## 🚀 Quick Start

```bash
# Install
npm install

# Configure
echo "REACT_APP_OPENAI_API_KEY=sk-..." > .env.local

# Run
npm start
```

Opens at http://localhost:3000

## 🏗️ Tech Stack

- **React 19** - UI framework
- **Langchain + OpenAI API** - RAG chatbot (text-embedding-3-large + GPT-3.5/4)
- **Binary Vector Index** - Custom Float32 storage for fast retrieval
- **CSS Variables** - Theme system (no CSS-in-JS)

## 📂 Key Files

- `src/services/ragService.js` - RAG engine with binary index retrieval
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

```bash
# Build
npm run build

# Deploy ./build folder to Vercel, Netlify, or GitHub Pages
```

Set `REACT_APP_OPENAI_API_KEY` in your deployment platform's environment variables.

---

**Author:** Gauransh Sawhney  
**Contact:** [gauransh30@gmail.com](mailto:gauransh30@gmail.com)
