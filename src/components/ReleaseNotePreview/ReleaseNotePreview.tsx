import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import { aiService } from '../../services/aiService';
import type { ReleaseContext } from '../../types/aiTypes';
import type { WorkItem } from '../../types/azureTypes';

interface ReleaseNotePreviewProps {
  open: boolean;
  onClose: () => void;
  workItems: WorkItem[];
  version: string;
}

export const ReleaseNotePreview: React.FC<ReleaseNotePreviewProps> = ({
  open,
  onClose,
  workItems,
  version,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const checkOllama = useCallback(async () => {
    const available = await aiService.checkOllamaAvailability();
    setIsOllamaAvailable(available);

    if (available) {
      const models = await aiService.getAvailableModels();
      setAvailableModels(models);
      if (models.length > 0 && !selectedModel) {
        // Prefer llama3 or mistral if available
        const preferredModel = models.find((m) => 
          m.includes('llama3') || m.includes('mistral')
        ) || models[0];
        setSelectedModel(preferredModel);
      }
    } else {
      setError('Ollama is not running. Please start Ollama on localhost:11434 with CORS enabled for browser requests.');
    }
  }, [selectedModel]);

  useEffect(() => {
    if (open) {
      checkOllama();
      setGeneratedContent('');
      setError(null);
    }
  }, [open, checkOllama]);

  const buildContext = (): ReleaseContext => {
    const workItemDetails = workItems.map((item) => ({
      id: item.id,
      type: item.fields['System.WorkItemType'],
      title: item.fields['System.Title'],
    }));

    return {
      prTitles: [],
      workItemDetails,
      contributors: [],
      version,
    };
  };

  const handleGenerate = async () => {
    if (!selectedModel) {
      setError('Please select a model');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');

    try {
      const context = buildContext();
      const result = await aiService.generateReleaseNotes(selectedModel, context);
      setGeneratedContent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate release notes');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSaveAsMarkdown = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ReleaseNotes-${version}.md`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeIcon color="primary" />
        AI Release Notes Generator
      </DialogTitle>
      
      <DialogContent>
        {!isOllamaAvailable && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Ollama is not running. Please start Ollama on localhost:11434 with CORS enabled for browser requests.
            <br />
            <Typography variant="caption" component="span" sx={{ display: 'block', mt: 1 }}>
              Development only: <code>OLLAMA_ORIGINS="http://localhost:*" ollama serve</code>
            </Typography>
            <Button 
              size="small" 
              startIcon={<RefreshIcon />} 
              onClick={checkOllama}
              sx={{ ml: 2 }}
            >
              Retry
            </Button>
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }} disabled={!isOllamaAvailable}>
            <InputLabel>Model</InputLabel>
            <Select
              value={selectedModel}
              label="Model"
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {availableModels.map((model) => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
              {availableModels.length === 0 && (
                <MenuItem disabled value="">
                  No models available
                </MenuItem>
              )}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleGenerate}
            disabled={!isOllamaAvailable || !selectedModel || isGenerating || workItems.length === 0}
          >
            {isGenerating ? 'Generating...' : 'Generate AI Report'}
          </Button>
        </Box>

        {workItems.length === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No work items available. Please process releases first to gather work items.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {generatedContent && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Generated Release Notes
              </Typography>
              <Box>
                <Tooltip title={copied ? 'Copied!' : 'Copy to Clipboard'}>
                  <IconButton onClick={handleCopyToClipboard} color={copied ? 'success' : 'default'}>
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Save as Markdown">
                  <IconButton onClick={handleSaveAsMarkdown}>
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                maxHeight: 400, 
                overflow: 'auto',
                bgcolor: 'grey.50',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                fontSize: '0.875rem',
              }}
            >
              {generatedContent}
            </Paper>
          </Box>
        )}

        {!generatedContent && !error && !isGenerating && workItems.length > 0 && (
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              bgcolor: 'grey.50',
            }}
          >
            <Typography color="text.secondary">
              Click "Generate AI Report" to create release notes from {workItems.length} work items.
            </Typography>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
