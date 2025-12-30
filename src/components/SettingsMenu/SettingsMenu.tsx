import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Typography,
  IconButton,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAppStore } from '../../stores/appStore';
import { AzureDevOpsService } from '../../services/azureDevOpsService';

interface SettingsMenuProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ open, onClose }) => {
  const { patToken, selectedRepositoryNames, setSelectedRepositoryNames } = useAppStore();
  const [allRepositories, setAllRepositories] = useState<{ id: string; name: string }[]>([]);
  const [localSelection, setLocalSelection] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  const loadAllRepositories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const service = new AzureDevOpsService(patToken);
      const repos = await service.getAllRepositories();
      setAllRepositories(repos);
      
      // Update selectAll state based on current selection
      const allSelected = repos.every(repo => selectedRepositoryNames.includes(repo.name));
      setSelectAll(allSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  }, [patToken, selectedRepositoryNames]);

  useEffect(() => {
    if (open) {
      loadAllRepositories();
      setLocalSelection([...selectedRepositoryNames]);
    }
  }, [open, selectedRepositoryNames, loadAllRepositories]);

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      setLocalSelection(allRepositories.map(repo => repo.name));
    } else {
      setLocalSelection([]);
    }
  };

  const handleRepoToggle = (repoName: string) => {
    setLocalSelection(prev => {
      const newSelection = prev.includes(repoName)
        ? prev.filter(name => name !== repoName)
        : [...prev, repoName];
      
      // Update select all state
      setSelectAll(newSelection.length === allRepositories.length);
      
      return newSelection;
    });
  };

  const handleSave = () => {
    if (localSelection.length === 0) {
      setError('Please select at least one repository');
      return;
    }

    setSelectedRepositoryNames(localSelection);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelection([...selectedRepositoryNames]);
    setError(null);
    onClose();
  };

  const selectedCount = localSelection.length;

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Settings - Repository Selection</Typography>
          <Chip 
            label={`${selectedCount} selected`} 
            color={selectedCount > 0 ? 'primary' : 'default'}
            size="small"
          />
        </Box>
        <IconButton onClick={handleCancel} edge="end">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            {error.includes('Failed to load') && (
              <Button onClick={loadAllRepositories} sx={{ ml: 2 }}>
                Retry
              </Button>
            )}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select the repositories you want to manage. These will be shown in the repository selection step.
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  indeterminate={selectedCount > 0 && selectedCount < allRepositories.length}
                />
              }
              label="Select All"
              sx={{ my: 2, fontWeight: 'bold' }}
            />

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {allRepositories.map((repo) => (
                <Box
                  key={repo.id}
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
                        checked={localSelection.includes(repo.name)}
                        onChange={() => handleRepoToggle(repo.name)}
                      />
                    }
                    label={repo.name}
                  />
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={isLoading || selectedCount === 0}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
