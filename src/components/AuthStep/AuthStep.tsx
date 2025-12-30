import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAppStore } from '../../stores/appStore';
import { AzureDevOpsService } from '../../services/azureDevOpsService';

export const AuthStep: React.FC = () => {
  const { patToken, setPatToken, setUser, user } = useAppStore();
  const [localToken, setLocalToken] = useState(patToken);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!localToken.trim()) {
      setError('Please enter a PAT token');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const service = new AzureDevOpsService(localToken);
      const validatedUser = await service.validateToken();
      
      setUser(validatedUser);
      setPatToken(localToken);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate token');
      setUser(null);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Authentication
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your Azure DevOps Personal Access Token (PAT) to get started.
          The token requires Code (Read/Write) and Work Items (Read/Write) permissions.
        </Typography>

        <TextField
          label="Personal Access Token"
          type="password"
          fullWidth
          value={localToken}
          onChange={(e) => setLocalToken(e.target.value)}
          disabled={isValidating}
          sx={{ mb: 2 }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleValidate();
            }
          }}
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleValidate}
          disabled={isValidating || !localToken.trim()}
          sx={{ mb: 2 }}
        >
          {isValidating ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Validating...
            </>
          ) : (
            'Validate Token'
          )}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {user && (
          <Alert severity="success">
            Successfully authenticated as <strong>{user.displayName}</strong>
          </Alert>
        )}
      </Paper>
    </Box>
  );
};
