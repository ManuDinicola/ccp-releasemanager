# Quick Start Guide

## Getting Started

### Prerequisites
1. Node.js 18+ installed
2. Azure DevOps Personal Access Token (PAT) with:
   - Code: Read & Write permissions
   - Work Items: Read & Write permissions

### Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

## Using the Application

### Step 1: Authentication
1. Enter your Azure DevOps Personal Access Token in the password field
2. Click "Validate Token" button
3. Wait for validation - you'll see your name displayed on success
4. Click "Next" to proceed

### Step 2: Select Repositories
1. The app will load current versions for all repositories
2. Select repositories you want to release by checking the boxes
3. Use "Select All" to select/deselect all at once
4. Review current versions shown for each repository
5. Click "Next" to proceed

### Step 3: Configure Versions
1. Choose "Major" or "Minor" for each selected repository
   - Major: Increments first number (e.g., 1.0 → 2.0)
   - Minor: Increments second number (e.g., 1.0 → 1.1)
2. Use bulk actions to set all repositories at once:
   - "Set All to Major"
   - "Set All to Minor"
3. Preview the version changes (Current → New)

### Step 4: Process & Export
1. Click "Process Releases" button at the bottom
2. Monitor progress as each repository is processed
3. View success/error status for each repository
4. Once complete, click "Download CSV" to export release notes
5. The CSV file will be named "ReleaseNote-{version}.csv"

## Features

### Automatic Processing
When you click "Process Releases", the app will:
- Create release branches (e.g., refs/heads/release/1.1.x)
- Create annotated tags (e.g., v1.1)
- Fetch commits between old and new versions
- Collect work items from those commits
- Aggregate and deduplicate work items across all repositories

### CSV Export
The exported CSV contains:
- Type (User Story, Bug, Task, etc.)
- ID (Work Item ID)
- Title (Work Item Title)
- URL (Direct link to work item)

### Work Item Updates
After export, the app automatically updates each work item's "Integration Build" field with the main application version.

## Troubleshooting

### Token Validation Fails
- Verify your PAT has Code (Read/Write) and Work Items (Read/Write) permissions
- Check that the token hasn't expired
- Ensure you're connected to the internet

### Repository Versions Not Loading
- Verify repositories exist in Azure DevOps
- Check that release branches follow the pattern: refs/heads/release/{version}.x
- Confirm your PAT has Code Read permissions

### CORS Errors
Azure DevOps API calls from browser may be blocked by CORS. Solutions:
1. Install a CORS browser extension for development
2. Use a local proxy server
3. Temporarily disable browser CORS (development only - use with caution)

### Processing Failures
- Check the error message in the Processing Panel
- Verify network connectivity
- Ensure you have write permissions to the repositories
- Check Azure DevOps API rate limits

## Repository List

The application works with these repositories:
- CareConnect.Pharmacy (Main Application - used for CSV naming)
- AdminService
- AuthenticationService
- BillingService
- InventoryService
- NotificationService
- OrderService
- PatientService
- PharmacyService
- PrescriptionService

## Configuration

To modify the organization or project:
1. Edit `/src/services/azureDevOpsService.ts`
2. Update `AZURE_DEVOPS_ORG` and `AZURE_DEVOPS_PROJECT` constants
3. Rebuild the application

## Security Notes

- PAT tokens are stored in localStorage for convenience
- Tokens are never logged or exposed in console
- All API calls use HTTPS
- No data is sent to any server except Azure DevOps
- Clear your browser's localStorage to remove stored token

## Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

The production files will be in the `dist/` directory.

## Need Help?

- Check the main README.md for detailed documentation
- Review error messages in the browser console
- Create an issue in the GitHub repository
