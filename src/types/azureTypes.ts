// Azure DevOps API Type Definitions

export interface AzureUser {
  displayName: string;
  id: string;
  uniqueName: string;
}

export interface GitRef {
  name: string;
  objectId: string;
}

export interface GitCommit {
  commitId: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  comment: string;
  workItems?: WorkItemReference[];
}

export interface WorkItemReference {
  id: string;
  url: string;
}

export interface WorkItem {
  id: number;
  fields: {
    'System.WorkItemType': string;
    'System.Title': string;
    'System.State'?: string;
    'Custom.IntegrationBuild'?: string;
  };
  url: string;
}

export interface Repository {
  id: string;
  name: string;
  currentVersion?: string;
  selected?: boolean;
  bumpType?: 'major' | 'minor';
}

export interface ReleaseProcessingResult {
  repository: string;
  success: boolean;
  newVersion?: string;
  error?: string;
  workItems?: WorkItem[];
}

export interface ReleaseNote {
  type: string;
  id: number;
  title: string;
  url: string;
}

export type BumpType = 'major' | 'minor';

export interface AppState {
  // Authentication
  patToken: string;
  user: AzureUser | null;
  isAuthenticated: boolean;
  
  // Repositories
  repositories: Repository[];
  selectedRepositoryNames: string[];
  
  // Processing
  isProcessing: boolean;
  processingResults: ReleaseProcessingResult[];
  
  // Work Items
  consolidatedWorkItems: WorkItem[];
  
  // UI State
  currentStep: number;
  
  // Actions
  setPatToken: (token: string) => void;
  setUser: (user: AzureUser | null) => void;
  setRepositories: (repos: Repository[]) => void;
  updateRepository: (name: string, updates: Partial<Repository>) => void;
  setSelectedRepositoryNames: (names: string[]) => void;
  setCurrentStep: (step: number) => void;
  setIsProcessing: (processing: boolean) => void;
  addProcessingResult: (result: ReleaseProcessingResult) => void;
  setConsolidatedWorkItems: (items: WorkItem[]) => void;
  resetProcessing: () => void;
}
