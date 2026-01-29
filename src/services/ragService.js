/**
 * Client-Side RAG Service using Binary Index
 * Uses pre-computed embeddings from /rag/ assets (meta.json, vectors.f32, texts.txt)
 * LLM can call tools to access resume subsections on-demand (tools: experience, education, etc.)
 */

import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { tool } from '@langchain/core/tools';

export class RAGChatService {
  constructor() {
    this.embedder = null; // OpenAI embeddings for query encoding
    this.llm = null;
    this.llmWithTools = null; // LLM bound with tools
    this.initialized = false;
    this.resumeData = null;
    
    // Binary index assets (cached after first load)
    this.indexMeta = null;           // Parsed meta.json
    this.vectors = null;              // Float32Array of shape count * dim
    this.textsBuffer = null;           // Uint8Array buffer for texts.txt
    this.indexLoaded = false;
    
    // Project detection
    this.repoNames = [];             // Unique repo names from index
    this.projectAliases = new Map(); // normalized alias -> repo name

    // Conversation memory (rolling summary stored in sessionStorage)
    this.conversationSummary = '';

    // Tool definitions (lazy-initialized in initialize())
    this.tools = [];
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
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('REACT_APP_OPENAI_API_KEY not found in environment');
      }

      // Initialize query embedder
      this.embedder = new OpenAIEmbeddings({
        apiKey,
        model: 'text-embedding-3-large'
      });

      // Initialize LLM
      this.llm = new ChatOpenAI({
        apiKey,
        model: process.env.REACT_APP_LLM_MODEL || 'gpt-3.5-turbo',
        temperature: 0.2,
        maxTokens: 900
      });

      // Build and bind tools to LLM
      this.buildTools();
      this.llmWithTools = this.llm.bindTools(this.tools);

      // Load resume data for system context
      await this.loadResumeData();

      // Load binary RAG index assets
      await this.loadBinaryIndex();

      if (!this.indexLoaded || !this.indexMeta) {
        throw new Error('Failed to initialize binary RAG index');
      }
      
      // Build project alias map for robust detection
      this.buildProjectAliases();

      this.initialized = true;
      console.log('✅ RAG initialized successfully');
    } catch (err) {
      console.error('❌ Failed to initialize RAG:', err.message);
      this.initialized = false;
      throw err;
    }
  }

  // --- Tool Definitions ---
  buildTools() {
    // Tool: Get experience
    const getExperienceTool = tool(
      () => {
        const experience = this.resumeData?.experience || [];
        return JSON.stringify(experience, null, 2);
      },
      {
        name: 'get_experience',
        description: 'Retrieve Gauransh\'s work experience, including companies, positions, years, descriptions, and technologies used.'
      }
    );

    // Tool: Get education
    const getEducationTool = tool(
      () => {
        const education = this.resumeData?.education || [];
        return JSON.stringify(education, null, 2);
      },
      {
        name: 'get_education',
        description: 'Retrieve Gauransh\'s education history, including schools, degrees, dates, GPA, and relevant coursework.'
      }
    );

    // Tool: Get certifications
    const getCertificationsTool = tool(
      () => {
        const certifications = this.resumeData?.certifications || [];
        return JSON.stringify(certifications, null, 2);
      },
      {
        name: 'get_certifications',
        description: 'Retrieve Gauransh\'s licenses and certifications, including title, organization, date issued, and credential ID.'
      }
    );

    // Tool: Get projects
    const getProjectsTool = tool(
      () => {
        const projects = this.resumeData?.projects || [];
        return JSON.stringify(projects, null, 2);
      },
      {
        name: 'get_projects',
        description: 'Retrieve Gauransh\'s projects, including titles, descriptions, dates, technologies, and repository links.'
      }
    );

    // Tool: Get skills
    const getSkillsTool = tool(
      () => {
        const skills = this.resumeData?.skills || [];
        return JSON.stringify(skills, null, 2);
      },
      {
        name: 'get_skills',
        description: 'Retrieve Gauransh\'s technical skills organized by category (e.g., languages, frameworks, tools).'
      }
    );

    // Tool: Get contact info
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
        description: 'Retrieve Gauransh\'s contact information and social media profiles (email, LinkedIn, GitHub, etc.).'
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

  async loadBinaryIndex() {
    if (this.indexLoaded && this.indexMeta && this.vectors && this.textsBuffer) {
      console.log('✓ Binary index already cached, reusing...');
      return;
    }

    const loadStart = Date.now();
    try {
      // 1. Load and parse meta.json
      const metaResponse = await fetch('/rag/meta.json');
      if (!metaResponse.ok) throw new Error('Failed to load /rag/meta.json');
      this.indexMeta = await metaResponse.json();

      const { count, dim, items } = this.indexMeta;
      if (!count || !dim || !items || items.length !== count) {
        throw new Error('Invalid meta.json: missing count, dim, or items');
      }

      // 2. Load vectors.f32 as Float32Array
      const vectorsResponse = await fetch('/rag/vectors.f32');
      if (!vectorsResponse.ok) throw new Error('Failed to load /rag/vectors.f32');
      const arrayBuffer = await vectorsResponse.arrayBuffer();
      this.vectors = new Float32Array(arrayBuffer);

      if (this.vectors.length !== count * dim) {
        throw new Error(`Vector size mismatch: got ${this.vectors.length}, expected ${count * dim}`);
      }

      // 3. Load texts.txt as Uint8Array
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

  // --- Project Detection Helpers ---

  normalizeText(text) {
    // Normalize text for fuzzy matching
    return text
      .toLowerCase()
      .replace(/[_-]/g, ' ')           // Replace _ and - with spaces
      .replace(/[^a-z0-9\s]/g, '')     // Remove punctuation
      .replace(/\s+/g, ' ')            // Collapse whitespace
      .trim();
  }

  buildProjectAliases() {
    // Build alias map from index repos and resume projects
    this.repoNames = [];
    this.projectAliases = new Map();

    // 1. Extract unique repos from index
    const repoSet = new Set();
    if (this.indexMeta?.items) {
      this.indexMeta.items.forEach(item => {
        const repo = item.repo || item.project_name;
        if (repo) repoSet.add(repo);
      });
    }
    this.repoNames = Array.from(repoSet);

    // 2. Add repo names as aliases (normalized)
    this.repoNames.forEach(repo => {
      const normalized = this.normalizeText(repo);
      this.projectAliases.set(normalized, repo);
      
      // Add version without trailing year (e.g., "bosm roulette 2019" -> "bosm roulette")
      const withoutYear = normalized.replace(/\s+(19|20)\d{2}\s*$/, '').trim();
      if (withoutYear !== normalized) {
        this.projectAliases.set(withoutYear, repo);
      }
    });

    // 3. Add resume project titles mapped to repo_name
    if (this.resumeData?.projects) {
      this.resumeData.projects.forEach(proj => {
        if (proj.title && proj.repo_name) {
          const normalized = this.normalizeText(proj.title);
          this.projectAliases.set(normalized, proj.repo_name);
        }
      });
    }

    // 4. Add explicit aliases for portfolio-chat (this website/project)
    const portfolioAliases = [
      'this website',
      'this project',
      'this portfolio',
      'portfolio chat',
      'ai portfolio',
      'rag portfolio',
      'portfolio assistant'
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
    // LLM fallback: ask LLM which project user is referring to
    if (!this.llm || this.repoNames.length === 0) return null;

    try {
      const prompt = `User query: "${userMessage}"\n\nProject-to-repo mapping: ${projectList}\n\nWhich repo does the user's query refer to? \nRespond with ONLY the exact repo name from the "Available repos" list above, or "NONE" if no repo is mentioned.\nDo not add explanation.`;

      const result = await this.llm.invoke([
        { role: 'user', content: prompt }
      ]);

      const response = (result.content || '').trim();
      
      // Check if response is a valid repo name
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

  // --- Binary Index Retrieval ---
  normalize(vec) {
    // Normalize vector to unit length (L2 norm)
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
    // Compute dot product of two vectors (a.k.a. cosine similarity for L2-normalized vectors)
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  async embedQuery(userMessage) {
    // Embed user message using OpenAI embeddings and normalize
    const embedding = await this.embedder.embedQuery(userMessage);
    const vec = new Float32Array(embedding);
    return this.normalize(vec);
  }

  getChunkText(itemIndex) {
    // Retrieve and decode text for a specific chunk from texts.txt
    const item = this.indexMeta.items[itemIndex];
    if (!item) return '';
    
    const { text_offset, text_length } = item;
    const slice = this.textsBuffer.slice(text_offset, text_offset + text_length);
    return new TextDecoder('utf-8').decode(slice);
  }

  retrieveTopK(queryVector, { repoFilter = null, k = 10 } = {}) {
    // Compute dot product similarity for all vectors and return top-k
    const { count, dim, items } = this.indexMeta;
    const similarities = [];
    let filteredCount = 0;

    for (let i = 0; i < count; i++) {
      // Determine repo name from items[i]
      const itemRepo = items[i].repo || items[i].project_name;

      // Skip if repo filter is active and doesn't match
      if (repoFilter && itemRepo !== repoFilter) {
        continue;
      }
      filteredCount++;

      // Compute dot product directly using offset (avoid slice)
      const vectorStart = i * dim;
      let sim = 0;
      for (let j = 0; j < dim; j++) {
        sim += queryVector[j] * this.vectors[vectorStart + j];
      }
      
      similarities.push({ index: i, similarity: sim });
    }

    // Debug log for scoped retrieval
    if (repoFilter && similarities.length === 0) {
      console.warn(`⚠️ Scoped retrieval returned 0 results for repo: "${repoFilter}"`);
      console.warn(`  First item keys: ${Object.keys(items[0]).join(', ')}`);
      console.warn(`  Filtered item count: ${filteredCount}`);
      if (items[0]) {
        console.warn(`  Sample item repo value: "${items[0].repo}" | project_name: "${items[0].project_name}"`);
      }
    }

    // Sort by similarity (descending) and keep top-k
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, k);
  }

  formatChunks(chunkIndices) {
    // Format retrieved chunks with citations (chunk_id is already unique)
    const formatted = [];

    for (const idx of chunkIndices) {
      const item = this.indexMeta.items[idx];

      // Build citation header
      const projectName = item.repo || item.project_name || 'Unknown';
      const filePath = item.file_path || 'N/A';
      const startLine = item.start_line;
      const endLine = item.end_line;

      let sourceHeader = `[Source: ${projectName} | ${filePath}`;
      if (startLine && endLine) {
        sourceHeader += ` | L${startLine}–${endLine}`;
      }
      sourceHeader += ']';

      // Get chunk text and truncate
      const chunkText = this.getChunkText(idx);
      const maxLength = 1200;
      const truncated = chunkText.length > maxLength
        ? chunkText.substring(0, maxLength) + '...'
        : chunkText;

      formatted.push(`${sourceHeader}\n${truncated}`);

    }
    
    // Log formatting results
    console.log('🧹 Formatted context chunks:', formatted.length);
    
    // Log chunk previews (safe - first 120 chars only)
    formatted.forEach((chunk, i) => {
      const preview = chunk.split('\n')[1]?.slice(0, 120) || chunk.slice(0, 120);
      console.log(`📄 Context chunk ${i + 1} preview:`, preview + '...');
    });

    return formatted.join('\n\n---\n\n');
  }

  buildSystemPrompt(retrievedContext) {
    const projectList = this.resumeData?.projects
      ? JSON.stringify(this.resumeData.projects.map(p => ({ project: p.title, repo: p.repo_name })))
      : '[]';

    return `You are the official AI Portfolio Assistant for **Gauransh Sawhney**, a Full-stack / AI / ML software engineer and graduate student.
      Your role is to represent Gauransh professionally, accurately, and conservatively.

      ## � Context Recognition
      **This Website / This Project refers to:** "portfolio-chat" (the AI-powered portfolio RAG system you're running in)
      When users ask about "this website", "this project", "portfolio chat", or the portfolio assistant itself, they're asking about the portfolio-chat project.
      Use the get_projects tool to reference its details if needed.

      ## �🔒 Core Rules
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

    // Check each alias for matches
    for (const [alias, repoName] of this.projectAliases.entries()) {
      // Exact inclusion match (highest priority)
      if (normalizedMsg.includes(alias)) {
        if (!bestMatch || alias.length > matchReason.length) {
          bestMatch = repoName;
          matchReason = `exact match: "${alias}"`;
          bestScore = 1.0;
        }
        continue;
      }

      // Token overlap (Jaccard similarity)
      const aliasTokens = new Set(alias.split(' ').filter(t => t.length > 0));
      const intersection = new Set([...msgTokens].filter(t => aliasTokens.has(t)));
      const union = new Set([...msgTokens, ...aliasTokens]);
      const jaccard = intersection.size / union.size;

      // Require minimum overlap of 0.5
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
    
    // If no alias match, mark for async LLM fallback (will be called in query())
    return null;
  }

  // --- Agentic Tool Loop ---
  async executeToolCall(toolName, toolInput) {
    // Execute a tool call and return the result
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
    // Run agentic loop: LLM → check for tool calls → execute → add results → repeat
    let currentMessages = [...messages];
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`🔄 Agentic loop iteration ${iteration}/${maxIterations}`);

      // Call LLM with tools bound
      const response = await this.llmWithTools.invoke([
        { role: 'system', content: systemPrompt },
        ...currentMessages
      ]);

      // Check if response has tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`🔧 LLM called ${response.tool_calls.length} tool(s)`);

        // Add LLM response to message history
        currentMessages.push({
          role: 'assistant',
          content: response.content || ''
        });

        // Execute each tool call sequentially
        for (const toolCall of response.tool_calls) {
          const toolName = toolCall.name;
          const toolInput = toolCall.args || {};

          console.log(`  → Executing: ${toolName}`);
          const toolResult = await this.executeToolCall(toolName, toolInput);

          // Add tool result to message history
          currentMessages.push({
            role: 'user',
            content: `[Tool Result from ${toolName}]:\n${toolResult}`
          });
        }

        // Continue loop to get final response from LLM
      } else {
        // No tool calls, return final response
        console.log(`✓ Agentic loop complete (no more tool calls)`);
        return {
          text: response.content || '',
          iterations: iteration
        };
      }
    }

    // Max iterations reached, return current response
    console.warn(`⚠️ Max iterations (${maxIterations}) reached`);
    const lastResponse = currentMessages[currentMessages.length - 1];
    return {
      text: lastResponse?.content || 'Unable to generate response.',
      iterations: iteration
    };
  }

  async query(userMessage, history = []) {
    if (!this.embedder || !this.llmWithTools || !this.initialized || !this.indexLoaded) {
      console.warn('⚠️ RAG not ready; using resume-only context');
      return this.queryFallback(userMessage, history);
    }

    try {
      const queryStart = Date.now();
      
      // A) Log user query and project detection
      console.log('🧠 User query:', userMessage);
      let targetRepo = this.detectProjectContext(userMessage);
      
      // If no alias match found, try LLM fallback
      if (!targetRepo) {
        console.log('🧠 No alias match; trying LLM fallback...');
        targetRepo = await this.detectProjectContextViaLLM(userMessage);
      }
      
      console.log('📦 Detected project:', targetRepo || 'none');
      
      // B) Log retrieval mode
      console.log('🔍 Retrieval mode:', targetRepo ? `scoped (repo: ${targetRepo})` : 'broad');

      // Embed query and retrieve top-k (RAG context for code/implementation details)
      const queryVector = await this.embedQuery(userMessage);
      const topKResults = this.retrieveTopK(queryVector, {
        repoFilter: targetRepo,
        k: 10
      });
      
      // C) Log raw retrieval results
      console.log('📊 Raw retrieval hits:', topKResults.length);
      if (topKResults.length > 0) {
        console.log('📊 Top 3 hits:', topKResults.slice(0, 3).map(h => ({
          similarity: h.similarity.toFixed(4),
          repo: this.indexMeta.items[h.index].repo || this.indexMeta.items[h.index].project_name,
          path: this.indexMeta.items[h.index].file_path
        })));
      }

      // Format RAG context (only if retrieval hits found)
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

      // Build lightweight system prompt with RAG context (if any)
      const systemPrompt = this.buildSystemPrompt(formattedContext);
      const recentHistory = history.slice(-6);

      // Add conversation summary if available
      const summary = this.getConversationSummary();
      if (summary) {
        recentHistory.unshift({ role: 'system', content: `Conversation Summary:\n${summary}` });
      }

      // Run agentic loop: tools will be available for LLM to call on-demand
      const agenticResult = await this.agenticLoop(systemPrompt, [
        ...recentHistory,
        { role: 'user', content: userMessage }
      ]);

      const queryTime = Date.now() - queryStart;
      const topSimilarity = topKResults[0]?.similarity?.toFixed(3) || 'N/A';
      console.log(`✓ Query completed in ${queryTime}ms, retrieved ${topKResults.length} chunks (top similarity: ${topSimilarity}), agentic iterations: ${agenticResult.iterations}`);

      const responseText = this.normalizeEmails(agenticResult.text);

      // Update conversation summary asynchronously
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
      if (!this.llmWithTools) throw new Error('LLM not initialized');

      // Lightweight fallback prompt with just identity + tools available
      const fallbackSystemPrompt = `You are Gauransh Sawhney's portfolio assistant. 
        Answer questions about Gauransh's experience, education, projects, and skills.
        Use the available tools to access resume details on demand.
        Be professional, concise, and honest. If you don't have info, say so.`;

      const recentHistory = history.slice(-4);

      // Run agentic loop with fallback prompt
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

  // --- Email Normalization Helper ---
  normalizeEmails(text) {
    // Convert emails to markdown mailto links (idempotent - safe to call multiple times)
    // Preserves code blocks (```) and existing mailto links
    // Does nothing if mailto: already appears in the same email string
    
    const parts = text.split(/(```[\s\S]*?```)/);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) return part;
      
      let result = part;
      
      // Pre-scan for existing mailto links to avoid duplicate conversions
      const existingMailtoEmails = new Set();
      const mailtoRegex = /\(mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/g;
      let mailtoMatch;
      while ((mailtoMatch = mailtoRegex.exec(result)) !== null) {
        existingMailtoEmails.add(mailtoMatch[1]);
      }
      
      // 1. Convert [email] -> [email](mailto:email) only if not already followed by (mailto:...)
      result = result.replace(/\[([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\](?!\(mailto:)/g, (match, email) => {
        // Skip if already converted to mailto
        if (existingMailtoEmails.has(email)) {
          return match;
        }
        return `[${email}](mailto:${email})`;
      });
      
      // 2. Convert plain emails -> [email](mailto:email)
      // Skip if email is already in a mailto link or surrounded by markdown syntax
      result = result.replace(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, (match, email) => {
        // Skip if already converted to mailto
        if (existingMailtoEmails.has(email)) {
          return match;
        }
        
        // Check if email is preceded by (mailto: or ]( (already in a link)
        const idx = result.indexOf(match);
        const before = result.substring(Math.max(0, idx - 8), idx);
        if (before.includes('mailto:') || before.endsWith('](')) {
          return match;
        }
        
        return `[${email}](mailto:${email})`;
      });
      
      return result;
    }).join('');
  }

  // --- Conversation Memory (Rolling Summary) ---
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
    } catch (_) {
      // ignore storage errors
    }
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
      // Fire-and-forget to avoid blocking the main query
      this.llm.invoke([
        { role: 'system', content: 'You are a summarizer that outputs ONLY the updated summary.' },
        { role: 'user', content: prompt }
      ]).then(res => {
        const updated = (res?.content || '').trim();
        if (updated) this.setConversationSummary(updated);
      }).catch(() => { /* ignore */ });
    } catch (_) {
      // ignore summarization errors
    }
  }

  isReady() {
    return this.initialized && this.embedder !== null && this.llm !== null && this.indexLoaded;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      ready: this.isReady(),
      indexLoaded: this.indexLoaded,
      apiKey: process.env.REACT_APP_OPENAI_API_KEY ? 'configured' : 'missing'
    };
  }
}

export default new RAGChatService();
