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
  Radio,
  RadioGroup,
  ButtonGroup,
  Divider,
} from '@mui/material';
import { useAppStore } from '../../stores/appStore';
import { AzureDevOpsService } from '../../services/azureDevOpsService';
import type { Repository, BumpType } from '../../types/azureTypes';

export const RepoSelectorAndConfig: React.FC = () => {
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
        : ['TestPipelines'];

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

  const handleBumpTypeChange = (repoName: string, bumpType: BumpType) => {
    updateRepository(repoName, { bumpType });
  };

  const handleBulkMajor = () => {
    selectedRepos.forEach((repo) => {
      updateRepository(repo.name, { bumpType: 'major' });
    });
  };

  const handleBulkMinor = () => {
    selectedRepos.forEach((repo) => {
      updateRepository(repo.name, { bumpType: 'minor' });
    });
  };

  const calculateNewVersion = (currentVersion: string | undefined, bumpType: BumpType): string => {
    if (!currentVersion || currentVersion === 'No releases' || currentVersion === 'Error loading') {
      return bumpType === 'major' ? '1.0' : '0.1';
    }

    const [major, minor] = currentVersion.split('.').map(Number);
    
    if (bumpType === 'major') {
      return `${major + 1}.0`;
    } else {
      return `${major}.${minor + 1}`;
    }
  };

  const selectedCount = repositories.filter((r) => r.selected).length;
  const selectedRepos = repositories.filter((r) => r.selected);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Repository Selection & Configuration
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

            <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 3 }}>
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

            {selectedCount > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" gutterBottom>
                  Version Bump Configuration
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Bulk Actions:
                  </Typography>
                  <ButtonGroup variant="outlined" sx={{ mb: 2 }}>
                    <Button onClick={handleBulkMajor}>
                      Set All to Major
                    </Button>
                    <Button onClick={handleBulkMinor}>
                      Set All to Minor
                    </Button>
                  </ButtonGroup>
                </Box>

                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {selectedRepos.map((repo) => {
                    const newVersion = calculateNewVersion(repo.currentVersion, repo.bumpType || 'minor');
                    
                    return (
                      <Box
                        key={repo.name}
                        sx={{
                          p: 2,
                          mb: 2,
                          border: '1px solid #e0e0e0',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="subtitle1" gutterBottom>
                          {repo.name}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <RadioGroup
                            row
                            value={repo.bumpType || 'minor'}
                            onChange={(e) => handleBumpTypeChange(repo.name, e.target.value as BumpType)}
                          >
                            <FormControlLabel value="major" control={<Radio />} label="Major" />
                            <FormControlLabel value="minor" control={<Radio />} label="Minor" />
                          </RadioGroup>
                          
                          <Typography variant="body2" color="text.secondary">
                            {repo.currentVersion} → {newVersion}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};
