import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Alert,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useAppStore } from '../../stores/appStore';

export const ProcessingPanel: React.FC = () => {
  const { isProcessing, processingResults, repositories } = useAppStore();
  
  const selectedRepos = repositories.filter((r) => r.selected);
  const totalRepos = selectedRepos.length;
  const processedRepos = processingResults.length;
  const progress = totalRepos > 0 ? (processedRepos / totalRepos) * 100 : 0;

  if (!isProcessing && processingResults.length === 0) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Processing Status
        </Typography>

        {isProcessing && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                Processing repositories...
              </Typography>
              <Typography variant="body2">
                {processedRepos} / {totalRepos}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        <List>
          {processingResults.map((result, index) => (
            <ListItem
              key={index}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {result.success ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                    <Typography variant="subtitle1">
                      {result.repository}
                    </Typography>
                    {result.newVersion && (
                      <Chip label={`v${result.newVersion}`} size="small" />
                    )}
                  </Box>
                }
                secondary={
                  result.success ? (
                    <Typography variant="body2" color="success.main">
                      Release processed successfully
                      {result.workItems && ` • ${result.workItems.length} work items`}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="error.main">
                      {result.error}
                    </Typography>
                  )
                }
              />
            </ListItem>
          ))}
        </List>

        {!isProcessing && processingResults.length > 0 && (
          <Alert 
            severity={processingResults.every((r) => r.success) ? 'success' : 'warning'}
            sx={{ mt: 2 }}
          >
            {processingResults.every((r) => r.success)
              ? 'All repositories processed successfully!'
              : 'Some repositories failed to process. Please review the errors above.'}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};
