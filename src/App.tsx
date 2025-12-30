import {
  Container,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
} from '@mui/material';
import { useAppStore } from './stores/appStore';
import { AuthStep } from './components/AuthStep';
import { RepoSelector } from './components/RepoSelector';
import { VersionConfig } from './components/VersionConfig';
import { ProcessingPanel } from './components/ProcessingPanel';
import { ExportBar } from './components/ExportBar';

const steps = ['Authentication', 'Select Repositories', 'Configure Versions'];

function App() {
  const { currentStep, setCurrentStep, isAuthenticated, repositories } = useAppStore();

  const selectedRepos = repositories.filter((r) => r.selected);
  const canProceedFromStep1 = isAuthenticated;
  const canProceedFromStep2 = selectedRepos.length > 0;

  const handleNext = () => {
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return canProceedFromStep1;
      case 1:
        return canProceedFromStep2;
      default:
        return false;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Release Manager - Visual Release Orchestrator
          </Typography>
          <Typography variant="body2">
            v1.0.0
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={currentStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        <Box sx={{ mb: 10 }}>
          {currentStep === 0 && <AuthStep />}
          {currentStep === 1 && <RepoSelector />}
          {currentStep === 2 && <VersionConfig />}
        </Box>

        <ProcessingPanel />

        <Paper elevation={2} sx={{ p: 2, mt: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canGoNext() || currentStep === steps.length - 1}
            >
              Next
            </Button>
          </Box>
        </Paper>
      </Container>

      <ExportBar />
    </Box>
  );
}

export default App;
