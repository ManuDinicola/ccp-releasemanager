import {
  Box,
  Button,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useAppStore } from '../../stores/appStore';
import { AzureDevOpsService } from '../../services/azureDevOpsService';
import { exportToCSV } from '../../services/csvExporter';
import type { ReleaseNote, WorkItem } from '../../types/azureTypes';

export const ExportBar: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const {
    patToken,
    repositories,
    isProcessing,
    processingResults,
    consolidatedWorkItems,
    setIsProcessing,
    addProcessingResult,
    setConsolidatedWorkItems,
    resetProcessing,
  } = useAppStore();

  const selectedRepos = repositories.filter((r) => r.selected);
  const canProcess = selectedRepos.length > 0 && selectedRepos.every((r) => r.bumpType);
  const hasResults = processingResults.length > 0;
  const mainRepo = repositories.find((r) => r.name === 'CareConnect.Pharmacy');
  const mainVersion = mainRepo?.currentVersion || '1.0';

  const calculateNewVersion = (currentVersion: string | undefined, bumpType: 'major' | 'minor'): string => {
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

  const processReleases = async () => {
    resetProcessing();
    setIsProcessing(true);

    const service = new AzureDevOpsService(patToken);
    const allWorkItems: WorkItem[] = [];

    for (const repo of selectedRepos) {
      try {
        const newVersion = calculateNewVersion(repo.currentVersion, repo.bumpType!);
        const branchName = `refs/heads/release/${newVersion}.x`;
        
        // Create release branch
        await service.createBranch(repo.id, branchName, 'refs/heads/main');

        // Get the commit ID for the new branch
        const refs = await service.getRepositoryRefs(repo.id);
        const newBranchRef = refs.find((r) => r.name === branchName);
        
        if (newBranchRef) {
          // Create annotated tag
          await service.createTag(
            repo.id,
            `v${newVersion}`,
            newBranchRef.objectId,
            `Release ${newVersion}`
          );

          // Get commits between old and new version
          const workItems: WorkItem[] = [];
          
          if (repo.currentVersion && repo.currentVersion !== 'No releases') {
            const oldBranchName = `refs/heads/release/${repo.currentVersion}.x`;
            try {
              const commits = await service.getCommitsBetweenBranches(
                repo.id,
                oldBranchName,
                branchName
              );

              // Collect work items from commits
              const workItemIds = new Set<string>();
              for (const commit of commits) {
                const ids = await service.getCommitWorkItems(repo.id, commit.commitId);
                ids.forEach((id) => workItemIds.add(id));
              }

              // Fetch work item details
              for (const id of workItemIds) {
                try {
                  const workItem = await service.getWorkItem(id);
                  workItems.push(workItem);
                  allWorkItems.push(workItem);
                } catch (err) {
                  console.error(`Error fetching work item ${id}:`, err);
                }
              }
            } catch (err) {
              console.error(`Error fetching commits for ${repo.name}:`, err);
            }
          }

          addProcessingResult({
            repository: repo.name,
            success: true,
            newVersion,
            workItems,
          });
        }
      } catch (error) {
        addProcessingResult({
          repository: repo.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Deduplicate work items by ID
    const uniqueWorkItems = Array.from(
      new Map(allWorkItems.map((item) => [item.id, item])).values()
    );

    setConsolidatedWorkItems(uniqueWorkItems);
    setIsProcessing(false);
  };

  const handleExport = async () => {
    if (consolidatedWorkItems.length === 0) {
      return;
    }

    const releaseNotes: ReleaseNote[] = consolidatedWorkItems.map((item) => ({
      type: item.fields['System.WorkItemType'],
      id: item.id,
      title: item.fields['System.Title'],
      url: item.url,
    }));

    // Update work items with integration build version
    const service = new AzureDevOpsService(patToken);
    const mainRepoResult = processingResults.find((r) => r.repository === 'CareConnect.Pharmacy');
    const integrationBuild = mainRepoResult?.newVersion || mainVersion;

    for (const item of consolidatedWorkItems) {
      try {
        await service.updateWorkItem(item.id, integrationBuild);
      } catch (err) {
        console.error(`Error updating work item ${item.id}:`, err);
      }
    }

    exportToCSV(releaseNotes, integrationBuild);
  };

  return (
    <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', borderTop: '1px solid #e0e0e0', p: 2 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={processReleases}
          disabled={!canProcess || isProcessing}
          sx={{ flex: 1 }}
        >
          {isProcessing ? 'Processing...' : 'Process Releases'}
        </Button>

        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={!hasResults || consolidatedWorkItems.length === 0 || isProcessing}
          sx={{ flex: 1 }}
        >
          Download CSV ({consolidatedWorkItems.length} items)
        </Button>
      </Box>

      {!canProcess && selectedRepos.length > 0 && currentStep >= 1 && (
        <Alert severity="warning" sx={{ mt: 2, maxWidth: 800, mx: 'auto' }}>
          Please configure version bump types for all selected repositories.
        </Alert>
      )}
    </Box>
  );
};
