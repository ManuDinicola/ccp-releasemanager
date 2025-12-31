import type { OllamaRequest, OllamaResponse, OllamaModelsResponse, ReleaseContext } from '../types/aiTypes';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const OLLAMA_API_GENERATE = `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_API_TAGS = `${OLLAMA_BASE_URL}/api/tags`;

/**
 * Service for communicating with a local Ollama LLM instance
 */
export class AIService {
  /**
   * Check if Ollama is running and accessible
   */
  async checkOllamaAvailability(): Promise<boolean> {
    try {
      const response = await fetch(OLLAMA_API_TAGS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(OLLAMA_API_TAGS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data: OllamaModelsResponse = await response.json();
      return data.models.map((model) => model.name);
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  }

  /**
   * Build a structured prompt for release note generation
   */
  private buildReleaseNotePrompt(context: ReleaseContext): string {
    const workItemsByType: Record<string, { id: number; title: string; description?: string }[]> = {};
    
    for (const item of context.workItemDetails) {
      const type = item.type || 'Other';
      if (!workItemsByType[type]) {
        workItemsByType[type] = [];
      }
      workItemsByType[type].push({ id: item.id, title: item.title, description: item.description });
    }

    const workItemsSection = Object.entries(workItemsByType)
      .map(([type, items]) => {
        const itemsList = items.map((i) => {
          // Strip HTML tags from description if present
          const cleanDescription = i.description 
            ? i.description.replace(/<[^>]*>/g, '').trim()
            : '';
          const descriptionPart = cleanDescription 
            ? `\n    Description: ${cleanDescription}` 
            : '';
          return `  - #${i.id}: ${i.title}${descriptionPart}`;
        }).join('\n');
        return `${type}:\n${itemsList}`;
      })
      .join('\n\n');

    const prSection = context.prTitles.length > 0
      ? `Pull Requests:\n${context.prTitles.map((pr) => `  - ${pr}`).join('\n')}`
      : '';

    const contributorsSection = context.contributors.length > 0
      ? `Contributors: ${context.contributors.join(', ')}`
      : '';

    return `You are a technical writer creating professional release notes for software version ${context.version}.

Based on the following information, generate a clean, professional release note in Markdown format.

IMPORTANT INSTRUCTIONS:
- Only include information provided below. Do NOT invent or hallucinate any features, fixes, or items.
- Categorize the items into: "Features", "Bug Fixes", and "Maintenance" based on the work item types.
- User Story and Feature items should go under "Features"
- Bug items should go under "Bug Fixes"  
- Task and other items should go under "Maintenance"
- If a category has no items, omit that section entirely.
- Use bullet points for each item.
- Include the work item ID in the format #ID.
- Use the description to write concise, user-friendly summaries that explain the value to users.
- Transform technical descriptions into clear, benefit-focused statements.

${workItemsSection}

${prSection}

${contributorsSection}

Generate the release notes now:`;
  }

  /**
   * Generate release notes using Ollama
   */
  async generateReleaseNotes(
    model: string,
    context: ReleaseContext
  ): Promise<string> {
    const prompt = this.buildReleaseNotePrompt(context);

    const request: OllamaRequest = {
      model,
      prompt,
      stream: false,
    };

    try {
      const response = await fetch(OLLAMA_API_GENERATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to Ollama. Please ensure Ollama is running on localhost:11434. For browser-based requests, start Ollama with CORS enabled (development only): OLLAMA_ORIGINS="http://localhost:*" ollama serve');
      }
      throw error;
    }
  }
}

// Export a singleton instance
export const aiService = new AIService();
