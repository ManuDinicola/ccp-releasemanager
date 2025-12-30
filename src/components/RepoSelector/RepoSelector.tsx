import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { useAppStore } from '../../stores/appStore';
import { AzureDevOpsService } from '../../services/azureDevOpsService';
import type { Repository } from '../../types/azureTypes';

// Default repository to use when no repositories are selected in settings
const DEFAULT_REPOSITORY = 'TestPipelines';

export const RepoSelector: React.FC = () => {
  const { patToken, repositories, setRepositories, updateRepository, selectedRepositoryNames } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  const loadRepositoryVersions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use selected repositories from settings, or fallback to default
      const repoList = selectedRepositoryNames.length > 0 
        ? selectedRepositoryNames 
        : [DEFAULT_REPOSITORY];

      const service = new AzureDevOpsService(patToken);
      const repos: Repository[] = [];

      for (const repoName of repoList) {
        try {
          const version = await service.getLatestReleaseVersion(repoName);
          repos.push({
            id: repoName,
            name: repoName,
            currentVersion: version || 'No releases',
            selected: false,
          });
        } catch (err) {
          console.error(`Error loading ${repoName}:`, err);
          repos.push({
            id: repoName,
            name: repoName,
            currentVersion: 'Error loading',
            selected: false,
          });
        }
      }

      setRepositories(repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRepositoryVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepositoryNames]);

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    repositories.forEach((repo) => {
      updateRepository(repo.name, { selected: newSelectAll });
    });
  };

  const handleRepoToggle = (repoName: string) => {
    const repo = repositories.find((r) => r.name === repoName);
    if (repo) {
      updateRepository(repoName, { selected: !repo.selected });
      
      // Update select all state
      const allSelected = repositories.every((r) => 
        r.name === repoName ? !repo.selected : r.selected
      );
      setSelectAll(allSelected);
    }
  };

  const selectedCount = repositories.filter((r) => r.selected).length;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Repository Selection
          </Typography>
          <Chip 
            label={`${selectedCount} selected`} 
            color={selectedCount > 0 ? 'primary' : 'default'}
          />
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button onClick={loadRepositoryVersions} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        ) : (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  indeterminate={selectedCount > 0 && selectedCount < repositories.length}
                />
              }
              label="Select All"
              sx={{ mb: 2, fontWeight: 'bold' }}
            />

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {repositories.map((repo) => (
                <Box
                  key={repo.name}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    borderBottom: '1px solid #eee',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={repo.selected || false}
                        onChange={() => handleRepoToggle(repo.name)}
                      />
                    }
                    label={repo.name}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Current: {repo.currentVersion}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};
