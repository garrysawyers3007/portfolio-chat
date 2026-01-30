/**
 * Client-Side RAG Service - Secure Backend Proxy Version
 * Uses backend API endpoints to protect OpenAI API key
 * API calls: /api/embed (embeddings), /api/chat (LLM inference)
 */

import { tool } from '@langchain/core/tools';

export class RAGChatService {
  constructor() {
    this.initialized = false;
    this.resumeData = null;
    
    // Binary index assets (cached after first load)
    this.indexMeta = null;
    this.vectors = null;
    this.textsBuffer = null;
    this.indexLoaded = false;
    
    // Project detection
    this.repoNames = [];
    this.projectAliases = new Map();

    // Conversation memory
    this.conversationSummary = '';

    // Tool definitions
    this.tools = [];
    
    // API endpoints (configure based on environment)
    this.apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '';
  }

  async loadResumeData() {
    if (this.resumeData) return this.resumeData;
    try {
      const response = await fetch('/data/resume.json');
      if (!response.ok) throw new Error('Failed to load resume data');
      this.resumeData = await response.json();
      return this.resumeData;
    } catch (err) {
      console.warn('Could not load resume data:', err.message);
      return null;
    }
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // No API key needed on client side - handled by backend
      console.log('🔐 Using secure backend proxy for OpenAI API');

      // Build tools that access resume data
      this.buildTools();

      // Load resume data for system context
      await this.loadResumeData();

      // Load binary RAG index assets
      await this.loadBinaryIndex();

      if (!this.indexLoaded || !this.indexMeta) {
        throw new Error('Failed to initialize binary RAG index');
      }
      
      // Build project alias map
      this.buildProjectAliases();

      this.initialized = true;
      console.log('✅ RAG initialized successfully (secure proxy mode)');
    } catch (err) {
      console.error('❌ Failed to initialize RAG:', err.message);
      this.initialized = false;
      throw err;
    }
  }

  // --- Tool Definitions ---
  buildTools() {
    // Schema template for tools with no parameters
    const emptySchema = {
      type: 'object',
      properties: {},
      required: []
    };

    const getExperienceTool = tool(
      () => {
        const experience = this.resumeData?.experience || [];
        return JSON.stringify(experience, null, 2);
      },
      {
        name: 'get_experience',
        description: 'Retrieve Gauransh\'s work experience, including companies, positions, years, descriptions, and technologies used.',
        schema: emptySchema
      }
    );

    const getEducationTool = tool(
      () => {
        const education = this.resumeData?.education || [];
        return JSON.stringify(education, null, 2);
      },
      {
        name: 'get_education',
        description: 'Retrieve Gauransh\'s education history, including schools, degrees, dates, GPA, and relevant coursework.',
        schema: emptySchema
      }
    );

    const getCertificationsTool = tool(
      () => {
        const certifications = this.resumeData?.certifications || [];
        return JSON.stringify(certifications, null, 2);
      },
      {
        name: 'get_certifications',
        description: 'Retrieve Gauransh\'s licenses and certifications, including title, organization, date issued, and credential ID.',
        schema: emptySchema
      }
    );

    const getProjectsTool = tool(
      () => {
        const projects = this.resumeData?.projects || [];
        return JSON.stringify(projects, null, 2);
      },
      {
        name: 'get_projects',
        description: 'Retrieve Gauransh\'s projects, including titles, descriptions, dates, technologies, and repository links.',
        schema: emptySchema
      }
    );

    const getSkillsTool = tool(
      () => {
        const skills = this.resumeData?.skills || [];
        return JSON.stringify(skills, null, 2);
      },
      {
        name: 'get_skills',
        description: 'Retrieve Gauransh\'s technical skills organized by category (e.g., languages, frameworks, tools).',
        schema: emptySchema
      }
    );

    const getContactInfoTool = tool(
      () => {
        const socials = this.resumeData?.socials || [];
        const contact = {
          socials,
          basicInfo: this.resumeData?.basic_info || {}
        };
        return JSON.stringify(contact, null, 2);
      },
      {
        name: 'get_contact_info',
        description: 'Retrieve Gauransh\'s contact information and social media profiles (email, LinkedIn, GitHub, etc.).',
        schema: emptySchema
      }
    );

    this.tools = [
      getExperienceTool,
      getEducationTool,
      getCertificationsTool,
      getProjectsTool,
      getSkillsTool,
      getContactInfoTool
    ];

    console.log('✓ Built 6 tools for resume subsections');
  }

  // --- Backend API Wrappers ---
  
  /**
   * Call backend /api/embed endpoint for secure embedding generation
   */
  async embedQuery(userMessage) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userMessage,
          model: process.env.REACT_APP_EMBEDDING_MODEL || 'text-embedding-3-large'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Embedding failed');
      }

      const data = await response.json();
      const vec = new Float32Array(data.embedding);
      return this.normalize(vec);
    } catch (err) {
      console.error('❌ Embedding API error:', err.message);
      throw err;
    }
  }

  /**
   * Call backend /api/chat endpoint for secure LLM inference
   * Supports tool calling via OpenAI function calling format
   */
  async callLLM(messages, { tools = null } = {}) {
    try {
      const body = {
        messages,
        model: process.env.REACT_APP_LLM_MODEL || 'gpt-3.5-turbo',
        temperature: 0.2,
        maxTokens: 900
      };

      // Convert Langchain tools to OpenAI function calling format
      if (tools && tools.length > 0) {
        body.tools = tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.schema || { type: 'object', properties: {}, required: [] }
          }
        }));
      }

      const response = await fetch(`${this.apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chat API failed');
      }

      const data = await response.json();
      
      // Transform response to match Langchain format
      return {
        content: data.content,
        role: data.role,
        tool_calls: data.tool_calls?.map(tc => ({
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments || '{}')
        })) || []
      };
    } catch (err) {
      console.error('❌ Chat API error:', err.message);
      throw err;
    }
  }

  async loadBinaryIndex() {
    if (this.indexLoaded && this.indexMeta && this.vectors && this.textsBuffer) {
      console.log('✓ Binary index already cached, reusing...');
      return;
    }

    const loadStart = Date.now();
    try {
      const metaResponse = await fetch('/rag/meta.json');
      if (!metaResponse.ok) throw new Error('Failed to load /rag/meta.json');
      this.indexMeta = await metaResponse.json();

      const { count, dim, items } = this.indexMeta;
      if (!count || !dim || !items || items.length !== count) {
        throw new Error('Invalid meta.json');
      }

      const vectorsResponse = await fetch('/rag/vectors.f32');
      if (!vectorsResponse.ok) throw new Error('Failed to load /rag/vectors.f32');
      const arrayBuffer = await vectorsResponse.arrayBuffer();
      this.vectors = new Float32Array(arrayBuffer);

      if (this.vectors.length !== count * dim) {
        throw new Error(`Vector size mismatch: got ${this.vectors.length}, expected ${count * dim}`);
      }

      const textsResponse = await fetch('/rag/texts.txt');
      if (!textsResponse.ok) throw new Error('Failed to load /rag/texts.txt');
      this.textsBuffer = new Uint8Array(await textsResponse.arrayBuffer());

      this.indexLoaded = true;
      const loadTime = Date.now() - loadStart;
      console.log(`✓ Loaded binary index: ${count} items, dim=${dim}, in ${loadTime}ms`);
    } catch (err) {
      console.error('Failed to load binary index:', err.message);
      this.indexLoaded = false;
      throw err;
    }
  }

  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildProjectAliases() {
    this.repoNames = [];
    this.projectAliases = new Map();

    const repoSet = new Set();
    if (this.indexMeta?.items) {
      this.indexMeta.items.forEach(item => {
        const repo = item.repo || item.project_name;
        if (repo) repoSet.add(repo);
      });
    }
    this.repoNames = Array.from(repoSet);

    this.repoNames.forEach(repo => {
      const normalized = this.normalizeText(repo);
      this.projectAliases.set(normalized, repo);
      
      const withoutYear = normalized.replace(/\s+(19|20)\d{2}\s*$/, '').trim();
      if (withoutYear !== normalized) {
        this.projectAliases.set(withoutYear, repo);
      }
    });

    if (this.resumeData?.projects) {
      this.resumeData.projects.forEach(proj => {
        if (proj.title && proj.repo_name) {
          const normalized = this.normalizeText(proj.title);
          this.projectAliases.set(normalized, proj.repo_name);
        }
      });
    }

    const portfolioAliases = [
      'this website', 'this project', 'this portfolio',
      'portfolio chat', 'ai portfolio', 'rag portfolio', 'portfolio assistant'
    ];
    portfolioAliases.forEach(alias => {
      this.projectAliases.set(alias, 'portfolio-chat');
    });

    console.log('✓ Built project aliases:', this.projectAliases.size, 'aliases for', this.repoNames.length, 'repos');
  }

  async detectProjectContextViaLLM(userMessage) {
    const projectList = this.resumeData?.projects
      ? JSON.stringify(this.resumeData.projects.map(p => ({ project: p.title, repo: p.repo_name })))
      : '[]';
    
    if (this.repoNames.length === 0) return null;

    try {
      const prompt = `User query: "${userMessage}"\n\nProject-to-repo mapping: ${projectList}\n\nWhich repo does the user's query refer to? \nRespond with ONLY the exact repo name from the list above, or "NONE" if no repo is mentioned.\nDo not add explanation.`;

      const result = await this.callLLM([
        { role: 'user', content: prompt }
      ]);

      const response = (result.content || '').trim();
      
      if (response !== 'NONE' && this.repoNames.includes(response)) {
        console.log(`📦 Detected project via LLM: "${response}"`);
        return response;
      }
      
      console.log(`📦 LLM fallback: no project detected (response: "${response}")`);
      return null;
    } catch (err) {
      console.warn('⚠️ LLM project detection failed:', err.message);
      return null;
    }
  }

  normalize(vec) {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    if (norm === 0) return vec;
    const normalized = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
      normalized[i] = vec[i] / norm;
    }
    return normalized;
  }

  dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  getChunkText(itemIndex) {
    const item = this.indexMeta.items[itemIndex];
    if (!item) return '';
    
    const { text_offset, text_length } = item;
    const slice = this.textsBuffer.slice(text_offset, text_offset + text_length);
    return new TextDecoder('utf-8').decode(slice);
  }

  retrieveTopK(queryVector, { repoFilter = null, k = 10 } = {}) {
    const { count, dim, items } = this.indexMeta;
    const similarities = [];

    for (let i = 0; i < count; i++) {
      const itemRepo = items[i].repo || items[i].project_name;

      if (repoFilter && itemRepo !== repoFilter) {
        continue;
      }

      const vectorStart = i * dim;
      let sim = 0;
      for (let j = 0; j < dim; j++) {
        sim += queryVector[j] * this.vectors[vectorStart + j];
      }
      
      similarities.push({ index: i, similarity: sim });
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, k);
  }

  formatChunks(chunkIndices) {
    const formatted = [];

    for (const idx of chunkIndices) {
      const item = this.indexMeta.items[idx];
      const projectName = item.repo || item.project_name || 'Unknown';
      const filePath = item.file_path || 'N/A';
      const startLine = item.start_line;
      const endLine = item.end_line;

      let sourceHeader = `[Source: ${projectName} | ${filePath}`;
      if (startLine && endLine) {
        sourceHeader += ` | L${startLine}–${endLine}`;
      }
      sourceHeader += ']';

      const chunkText = this.getChunkText(idx);
      const maxLength = 1200;
      const truncated = chunkText.length > maxLength
        ? chunkText.substring(0, maxLength) + '...'
        : chunkText;

      formatted.push(`${sourceHeader}\n${truncated}`);
    }
    
    console.log('🧹 Formatted context chunks:', formatted.length);
    return formatted.join('\n\n---\n\n');
  }

  buildSystemPrompt(retrievedContext) {
    const projectList = this.resumeData?.projects
      ? JSON.stringify(this.resumeData.projects.map(p => ({ project: p.title, repo: p.repo_name })))
      : '[]';

    return `You are the official AI Portfolio Assistant for **Gauransh Sawhney**, a Full-stack / AI / ML software engineer and graduate student.
      Your role is to represent Gauransh professionally, accurately, and conservatively.

      ## 🎯 Context Recognition
      **This Website / This Project refers to:** "portfolio-chat" (the AI-powered portfolio RAG system you're running in)
      When users ask about "this website", "this project", "portfolio chat", or the portfolio assistant itself, they're asking about the portfolio-chat project.
      Use the get_projects tool to reference its details if needed.

      ## 🔒 Core Rules
      1. **Ground everything:** Only cite information explicitly available via tools, retrieved context, or your training knowledge about public projects.
      2. **Be honest:** If you don't have a detail, say "I don't have that specific information."
      3. **Cite sources:** When referencing code or technical details, mention the project name and source.
      4. **Stay professional:** Confident and enthusiastic, but never exaggerated.
      5. **Be concise:** Keep responses to 3–4 sentences unless asked for more.
      6. **No speculation:** Don't infer or assume beyond what's explicitly available.

      ## 🛠️ Available Tools
      Call tools to access resume details on-demand:
      - **get_experience**: Work history and positions
      - **get_education**: Degrees, schools, GPA
      - **get_projects**: Project titles, descriptions, repos
      - **get_skills**: Technical skills by category
      - **get_certifications**: Licenses and credentials
      - **get_contact_info**: Email, LinkedIn, GitHub, socials

      ## 📐 Retrieved Context (Code & Architecture)
      ${retrievedContext || 'No code context available for this query.'}

       ## 🚦 Navigation & Action Rules
          Append **EXACTLY ONE** action tag at the end **ONLY IF** the response clearly maps to a navigation intent.
          If no navigation intent applies, append **nothing**.

          **Education keywords:** "Degree", "University", "GPA"  
          → <<ACTION:SCROLL_EDUCATION>>

          **Experience keywords:** "Work", "Job", "Internship"  
          → <<ACTION:SCROLL_EXPERIENCE>>

          **Projects keywords:** "Projects", "GitHub", "Code", or ${projectList}  
          → <<ACTION:SCROLL_PROJECTS>>  

          **Certifications keywords:** "Licenses", "Certifications", "Credentials", "Certificate"  
          → <<ACTION:SCROLL_CERTIFICATIONS>>

          **Contact keywords:** "Contact", "Email", "LinkedIn"  
          →    <<ACTION:SCROLL_CONTACT>>

          **DO NOT narrate actions.**  
          Correct:  
          "Gauransh has worked on projects such as Image Coloration. <<ACTION:SCROLL_PROJECTS>>"

          Incorrect:  
          "Let me scroll you to his projects. <<ACTION:SCROLL_PROJECTS>>"`;
  }

  detectProjectContext(message) {
    if (!this.resumeData?.projects || this.projectAliases.size === 0) return null;
    
    const normalizedMsg = this.normalizeText(message);
    const msgTokens = new Set(normalizedMsg.split(' ').filter(t => t.length > 0));

    let bestMatch = null;
    let bestScore = 0;
    let matchReason = '';

    for (const [alias, repoName] of this.projectAliases.entries()) {
      if (normalizedMsg.includes(alias)) {
        if (!bestMatch || alias.length > matchReason.length) {
          bestMatch = repoName;
          matchReason = `exact match: "${alias}"`;
          bestScore = 1.0;
        }
        continue;
      }

      const aliasTokens = new Set(alias.split(' ').filter(t => t.length > 0));
      const intersection = new Set([...msgTokens].filter(t => aliasTokens.has(t)));
      const union = new Set([...msgTokens, ...aliasTokens]);
      const jaccard = intersection.size / union.size;

      if (jaccard >= 0.5 && jaccard > bestScore) {
        bestMatch = repoName;
        bestScore = jaccard;
        matchReason = `token overlap (${jaccard.toFixed(2)}): "${alias}"`;
      }
    }

    if (bestMatch) {
      console.log(`📦 Detected project: "${bestMatch}" via ${matchReason}`);
      return bestMatch;
    }
    
    return null;
  }

  async executeToolCall(toolName, toolInput) {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      console.warn(`⚠️ Tool not found: ${toolName}`);
      return `Tool "${toolName}" not available.`;
    }

    try {
      const result = await tool.invoke(toolInput || {});
      return result;
    } catch (err) {
      console.error(`❌ Tool execution failed: ${toolName}`, err.message);
      return `Error executing tool: ${err.message}`;
    }
  }

  async agenticLoop(systemPrompt, messages, maxIterations = 3) {
    let currentMessages = [...messages];
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`🔄 Agentic loop iteration ${iteration}/${maxIterations}`);

      const response = await this.callLLM(
        [{ role: 'system', content: systemPrompt }, ...currentMessages],
        { tools: this.tools }
      );

      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`🔧 LLM called ${response.tool_calls.length} tool(s)`);

        currentMessages.push({
          role: 'assistant',
          content: response.content || ''
        });

        for (const toolCall of response.tool_calls) {
          const toolName = toolCall.name;
          const toolInput = toolCall.args || {};

          console.log(`  → Executing: ${toolName}`);
          const toolResult = await this.executeToolCall(toolName, toolInput);

          currentMessages.push({
            role: 'user',
            content: `[Tool Result from ${toolName}]:\n${toolResult}`
          });
        }
      } else {
        console.log(`✓ Agentic loop complete (no more tool calls)`);
        return {
          text: response.content || '',
          iterations: iteration
        };
      }
    }

    console.warn(`⚠️ Max iterations (${maxIterations}) reached`);
    const lastResponse = currentMessages[currentMessages.length - 1];
    return {
      text: lastResponse?.content || 'Unable to generate response.',
      iterations: iteration
    };
  }

  async query(userMessage, history = []) {
    if (!this.initialized || !this.indexLoaded) {
      console.warn('⚠️ RAG not ready; using fallback');
      return this.queryFallback(userMessage, history);
    }

    try {
      const queryStart = Date.now();
      
      console.log('🧠 User query:', userMessage);
      let targetRepo = this.detectProjectContext(userMessage);
      
      if (!targetRepo) {
        console.log('🧠 No alias match; trying LLM fallback...');
        targetRepo = await this.detectProjectContextViaLLM(userMessage);
      }
      
      console.log('📦 Detected project:', targetRepo || 'none');
      console.log('🔍 Retrieval mode:', targetRepo ? `scoped (repo: ${targetRepo})` : 'broad');

      const queryVector = await this.embedQuery(userMessage);
      const topKResults = this.retrieveTopK(queryVector, {
        repoFilter: targetRepo,
        k: 10
      });
      
      console.log('📊 Raw retrieval hits:', topKResults.length);

      let formattedContext = '';
      let sourceDocuments = [];
      if (topKResults.length > 0) {
        const topKIndices = topKResults.map(r => r.index);
        formattedContext = this.formatChunks(topKIndices);
        sourceDocuments = topKIndices.map(idx => ({
          pageContent: this.getChunkText(idx),
          metadata: this.indexMeta.items[idx]
        }));
      }

      const systemPrompt = this.buildSystemPrompt(formattedContext);
      const recentHistory = history.slice(-6);

      const summary = this.getConversationSummary();
      if (summary) {
        recentHistory.unshift({ role: 'system', content: `Conversation Summary:\n${summary}` });
      }

      const agenticResult = await this.agenticLoop(systemPrompt, [
        ...recentHistory,
        { role: 'user', content: userMessage }
      ]);

      const queryTime = Date.now() - queryStart;
      console.log(`✓ Query completed in ${queryTime}ms, retrieved ${topKResults.length} chunks, agentic iterations: ${agenticResult.iterations}`);

      const responseText = this.normalizeEmails(agenticResult.text);

      this.updateConversationSummaryAsync([
        ...recentHistory.filter(m => m.role !== 'system'),
        { role: 'user', content: userMessage },
        { role: 'assistant', content: responseText }
      ]);

      return {
        text: responseText,
        sourceDocuments
      };
    } catch (err) {
      console.error('❌ RAG query failed:', err.message);
      return this.queryFallback(userMessage, history);
    }
  }

  async queryFallback(userMessage, history = []) {
    console.log('📋 Using fallback mode (tools available, no RAG context)');
    try {
      const fallbackSystemPrompt = `You are Gauransh Sawhney's portfolio assistant. 
        Answer questions about Gauransh's experience, education, projects, and skills.
        Use the available tools to access resume details on demand.
        Be professional, concise, and honest. If you don't have info, say so.`;

      const recentHistory = history.slice(-4);

      const agenticResult = await this.agenticLoop(fallbackSystemPrompt, [
        ...recentHistory,
        { role: 'user', content: userMessage }
      ]);

      return { 
        text: this.normalizeEmails(agenticResult.text), 
        sourceDocuments: [] 
      };
    } catch (err) {
      console.error('❌ Fallback query failed:', err.message);
      return { 
        text: 'I\'m having trouble responding right now. Please try again.', 
        sourceDocuments: [] 
      };
    }
  }

  normalizeEmails(text) {
    const parts = text.split(/(```[\s\S]*?```)/);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) return part;
      
      let result = part;
      
      const existingMailtoEmails = new Set();
      const mailtoRegex = /\(mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/g;
      let mailtoMatch;
      while ((mailtoMatch = mailtoRegex.exec(result)) !== null) {
        existingMailtoEmails.add(mailtoMatch[1]);
      }
      
      result = result.replace(/\[([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\](?!\(mailto:)/g, (match, email) => {
        if (existingMailtoEmails.has(email)) return match;
        return `[${email}](mailto:${email})`;
      });
      
      result = result.replace(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, (match, email) => {
        if (existingMailtoEmails.has(email)) return match;
        
        const idx = result.indexOf(match);
        const before = result.substring(Math.max(0, idx - 8), idx);
        if (before.includes('mailto:') || before.endsWith('](')) return match;
        
        return `[${email}](mailto:${email})`;
      });
      
      return result;
    }).join('');
  }

  getConversationSummary() {
    try {
      if (!this.conversationSummary) {
        const stored = sessionStorage.getItem('conversationSummary') || '';
        this.conversationSummary = stored;
      }
      return this.conversationSummary;
    } catch (_) {
      return this.conversationSummary || '';
    }
  }

  setConversationSummary(summary) {
    this.conversationSummary = summary || '';
    try {
      sessionStorage.setItem('conversationSummary', this.conversationSummary);
    } catch (_) {}
  }

  buildSummaryPrompt(existingSummary, messages) {
    const header = `You are maintaining a concise conversation summary for a portfolio assistant.\n` +
      `Update the summary to capture enduring context, user goals, constraints, and decisions.\n` +
      `Keep it under 200 tokens. Exclude chit-chat. Prefer bullet points.\n`;

    const summaryBlock = existingSummary
      ? `Current summary:\n${existingSummary}\n\n`
      : '';

    const historyText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    return `${header}${summaryBlock}Recent turns:\n${historyText}\n\nNew summary:`;
  }

  updateConversationSummaryAsync(messages) {
    try {
      const existing = this.getConversationSummary();
      const prompt = this.buildSummaryPrompt(existing, messages);
      
      this.callLLM([
        { role: 'system', content: 'You are a summarizer that outputs ONLY the updated summary.' },
        { role: 'user', content: prompt }
      ]).then(res => {
        const updated = (res?.content || '').trim();
        if (updated) this.setConversationSummary(updated);
      }).catch(() => {});
    } catch (_) {}
  }

  isReady() {
    return this.initialized && this.indexLoaded;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      ready: this.isReady(),
      indexLoaded: this.indexLoaded,
      proxyMode: true
    };
  }
}

export default new RAGChatService();
