import { useState, useCallback, useRef, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import ScienceIcon from '@mui/icons-material/Science';
import { aiService } from '../../services/aiService';
import type { ReleaseContext } from '../../types/aiTypes';
import {
  parseCsvToWorkItems,
  readFileAsText,
  validateCsvFormat,
  type WorkItemFromCsv,
  type CsvValidationResult,
} from '../../utils/csvParser';

interface TestAIGenerationProps {
  open: boolean;
  onClose: () => void;
}

const SELECTED_MODEL_STORAGE_KEY = 'test-ai-generation-model';

export const TestAIGeneration: React.FC<TestAIGenerationProps> = ({
  open,
  onClose,
}) => {
  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [workItems, setWorkItems] = useState<WorkItemFromCsv[]>([]);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // AI generation state
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem(SELECTED_MODEL_STORAGE_KEY) || '';
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist selected model
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
    }
  }, [selectedModel]);

  const checkOllama = useCallback(async () => {
    const available = await aiService.checkOllamaAvailability();
    setIsOllamaAvailable(available);

    if (available) {
      const models = await aiService.getAvailableModels();
      setAvailableModels(models);
      if (models.length > 0 && !selectedModel) {
        const savedModel = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
        if (savedModel && models.includes(savedModel)) {
          setSelectedModel(savedModel);
        } else {
          const preferredModel = models.find((m) =>
            m.includes('llama3') || m.includes('mistral')
          ) || models[0];
          setSelectedModel(preferredModel);
        }
      }
    } else {
      setError('Ollama is not running. Please start Ollama on localhost:11434 with CORS enabled for browser requests.');
    }
  }, [selectedModel]);

  useEffect(() => {
    if (open) {
      checkOllama();
      setError(null);
    }
  }, [open, checkOllama]);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setIsValidating(true);
    setError(null);
    setGeneratedContent('');
    setGenerationTime(null);

    try {
      const content = await readFileAsText(file);
      setUploadedFile(file);

      // Validate CSV
      const validation = validateCsvFormat(content);
      setValidationResult(validation);

      if (validation.isValid) {
        const result = parseCsvToWorkItems(content);
        if (result.success) {
          setWorkItems(result.workItems);
        } else {
          setError(result.errors.join(', '));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setWorkItems([]);
    setValidationResult(null);
    setError(null);
    setGeneratedContent('');
    setGenerationTime(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    await processFile(file);
  };

  const buildContext = (): ReleaseContext => {
    const workItemDetails = workItems.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
    }));

    return {
      prTitles: [],
      workItemDetails,
      contributors: [],
      version: 'Test Version',
    };
  };

  const handleGenerate = async () => {
    if (!selectedModel) {
      setError('Please select a model');
      return;
    }

    if (workItems.length === 0) {
      setError('Please upload a valid CSV file first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');
    setGenerationTime(null);

    const startTime = Date.now();

    try {
      const context = buildContext();
      const result = await aiService.generateReleaseNotes(selectedModel, context);
      setGeneratedContent(result);
      setGenerationTime(Date.now() - startTime);
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseName = uploadedFile?.name.replace('.csv', '') || 'Test';

    link.setAttribute('href', url);
    link.setAttribute('download', `ReleaseNotes-${baseName}-${timestamp}.md`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScienceIcon color="secondary" />
        Test AI Generation
        <Chip
          label="Testing"
          color="warning"
          size="small"
          sx={{ ml: 1 }}
        />
      </DialogTitle>

      <DialogContent>
        {/* Ollama status */}
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

        {/* File Upload Section */}
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mb: 3,
            border: '2px dashed',
            borderColor: uploadedFile ? 'success.main' : 'grey.300',
            bgcolor: uploadedFile ? 'success.lighter' : 'grey.50',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !uploadedFile && fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {isValidating ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={24} />
              <Typography>Validating CSV...</Typography>
            </Box>
          ) : uploadedFile ? (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <UploadFileIcon color="success" />
                <Box>
                  <Typography fontWeight="bold">{uploadedFile.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(uploadedFile.size)} • {workItems.length} work items
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearFile();
                }}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <UploadFileIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Drag and drop a CSV file here
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse. Expected format: Prefix, Id, Content, Description (optional), Url
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Validation warnings */}
        {validationResult?.warnings && validationResult.warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Warnings:</Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationResult.warnings.slice(0, 5).map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
              {validationResult.warnings.length > 5 && (
                <li>...and {validationResult.warnings.length - 5} more</li>
              )}
            </ul>
          </Alert>
        )}

        {/* Validation errors */}
        {validationResult && !validationResult.isValid && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Validation Errors:</Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationResult.errors.slice(0, 5).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
              {validationResult.errors.length > 5 && (
                <li>...and {validationResult.errors.length - 5} more</li>
              )}
            </ul>
          </Alert>
        )}

        {/* CSV Preview */}
        {workItems.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Preview (first 5 rows)
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prefix</TableCell>
                    <TableCell>Id</TableCell>
                    <TableCell>Content</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workItems.slice(0, 5).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Chip
                          label={item.type}
                          size="small"
                          color={
                            item.type.toLowerCase().includes('bug')
                              ? 'error'
                              : item.type.toLowerCase().includes('story') || item.type.toLowerCase().includes('feature')
                              ? 'primary'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>#{item.id}</TableCell>
                      <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {workItems.length > 5 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                ...and {workItems.length - 5} more items
              </Typography>
            )}
          </Box>
        )}

        {/* Model selection and generation controls */}
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
            color="secondary"
            startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleGenerate}
            disabled={!isOllamaAvailable || !selectedModel || isGenerating || workItems.length === 0}
          >
            {isGenerating ? 'Generating...' : 'Generate AI Report'}
          </Button>
        </Box>

        {/* Error display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Generation result */}
        {generatedContent && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Generated Release Notes
                </Typography>
                {generationTime && (
                  <Chip
                    label={`${formatDuration(generationTime)}`}
                    size="small"
                    variant="outlined"
                  />
                )}
                <Chip
                  label={selectedModel}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Box>
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

        {/* Empty state */}
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
