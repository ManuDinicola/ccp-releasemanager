// AI/LLM related type definitions

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export interface ReleaseContext {
  prTitles: string[];
  workItemDetails: {
    id: number;
    type: string;
    title: string;
    description?: string;
  }[];
  contributors: string[];
  version: string;
}

export interface AIGenerationState {
  isGenerating: boolean;
  generatedContent: string;
  error: string | null;
  selectedModel: string;
  availableModels: string[];
  isOllamaAvailable: boolean;
}
