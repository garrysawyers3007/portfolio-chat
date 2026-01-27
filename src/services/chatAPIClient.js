/**
 * Chat API Client - Client-Side Langchain
 * Handles LLM interactions directly in the browser using Langchain
 * No backend server required
 */

import ragService from './ragService';

export class ChatAPIClient {
  constructor() {
    this.ragEnabled = process.env.REACT_APP_RAG_ENABLED !== 'false';
  }

  /**
   * Send message to LLM with RAG context
   * @param {string} message - User message
   * @param {Array} conversationHistory - Previous messages for context
   * @returns {Promise<string>} - LLM response
   */
  async sendMessage(message, conversationHistory = []) {
    try {
      if (!message || typeof message !== 'string') {
        throw new Error('Invalid message');
      }

      // Ensure RAG is initialized
      if (!ragService.initialized) {
        console.log('🔄 Initializing RAG service...');
        await ragService.initialize();
      }

      // Check if initialization succeeded
      if (!ragService.isReady()) {
        const status = ragService.getStatus();
        throw new Error(`RAG initialization failed. Status: ${JSON.stringify(status)}`);
      }

      // Query RAG
      const result = await ragService.query(message, conversationHistory);
      return result.text;
    } catch (err) {
      console.error('Chat API error:', err);
      throw err;
    }
  }

  /**
   * Get RAG status for debugging
   */
  getStatus() {
    return ragService.getStatus();
  }
}

export default new ChatAPIClient();
