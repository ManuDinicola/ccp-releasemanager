import {
  Box,
  Paper,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  Alert,
  ButtonGroup,
} from '@mui/material';
import { useAppStore } from '../../stores/appStore';
import type { BumpType } from '../../types/azureTypes';

export const VersionConfig: React.FC = () => {
  const { repositories, updateRepository } = useAppStore();

  const selectedRepos = repositories.filter((r) => r.selected);

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

  if (selectedRepos.length === 0) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Alert severity="info">
            Please select at least one repository from the previous step.
          </Alert>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
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
      </Paper>
    </Box>
  );
};
