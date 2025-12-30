import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from '../types/azureTypes';

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      patToken: '',
      user: null,
      isAuthenticated: false,
      repositories: [],
      isProcessing: false,
      processingResults: [],
      consolidatedWorkItems: [],
      currentStep: 0,

      // Actions
      setPatToken: (token: string) => set({ patToken: token }),
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: user !== null 
      }),
      
      setRepositories: (repos) => set({ repositories: repos }),
      
      updateRepository: (name, updates) => set((state) => ({
        repositories: state.repositories.map((repo) =>
          repo.name === name ? { ...repo, ...updates } : repo
        ),
      })),
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      setIsProcessing: (processing) => set({ isProcessing: processing }),
      
      addProcessingResult: (result) => set((state) => ({
        processingResults: [...state.processingResults, result],
      })),
      
      setConsolidatedWorkItems: (items) => set({ 
        consolidatedWorkItems: items 
      }),
      
      resetProcessing: () => set({
        isProcessing: false,
        processingResults: [],
        consolidatedWorkItems: [],
      }),
    }),
    {
      name: 'release-manager-storage',
      partialize: (state) => ({ 
        patToken: state.patToken // Only persist the PAT token
      }),
    }
  )
);
