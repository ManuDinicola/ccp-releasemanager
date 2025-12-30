# Release Manager Web - Visual Release Orchestrator

A modern web-based tool for managing software releases across multiple Azure DevOps repositories. Built with React, TypeScript, Vite, and Material-UI.

## Overview

This application enables DevOps engineers and release managers to:
- Manage releases for multiple repositories in a single workflow
- Select version bump types (major/minor) for each repository
- Process releases by creating branches, tags, and aggregating release notes
- Generate consolidated CSV exports of work items across all releases
- Run entirely in the browser without backend infrastructure

## Features

### 🔐 Secure Authentication
- Azure DevOps Personal Access Token (PAT) validation
- Secure token storage with localStorage persistence
- User profile display after authentication

### 📦 Repository Management
- Predefined list of repositories
- Automatic version fetching from release branches
- Bulk selection controls
- Real-time version display

### 🔢 Version Configuration
- Major/Minor version bump selection
- Bulk actions for all selected repositories
- Version preview before processing

### ⚙️ Release Processing
- Automated release branch creation
- Annotated tag creation
- Work item aggregation from commits
- Robust error handling with detailed feedback

### 📊 Export & Reporting
- CSV export of consolidated release notes
- Work item deduplication
- Automatic Integration Build field updates

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 7
- **Language**: TypeScript 5.9
- **UI Library**: Material-UI (MUI)
- **State Management**: Zustand
- **CSV Generation**: PapaParse
- **API Integration**: Azure DevOps REST API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Azure DevOps Personal Access Token with:
  - Code: Read & Write
  - Work Items: Read & Write

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ManuDinicola/ccp-releasemanager.git
cd ccp-releasemanager
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown (typically `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Step 1: Authentication
1. Enter your Azure DevOps Personal Access Token
2. Click "Validate Token"
3. Verify your user profile is displayed

### Step 2: Select Repositories
1. Review the list of repositories and their current versions
2. Select repositories for release processing
3. Use "Select All" for bulk selection
4. Click "Next"

### Step 3: Configure Versions
1. Choose Major or Minor bump for each selected repository
2. Use bulk actions to set all repositories at once
3. Preview new version numbers
4. Click "Process Releases"

### Step 4: Process & Export
1. Monitor processing progress in real-time
2. Review success/error status for each repository
3. Click "Download CSV" to export release notes
4. Work items will be automatically updated with Integration Build version

## Repository List

The application is configured to work with these repositories:
- CareConnect.Pharmacy (Main Application)
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

The application connects to the Azure DevOps organization and project specified in the service configuration:
- Organization: `CCPharmacyBuild`
- Project: `CCPharmacyBuild`

To modify these, edit `/src/services/azureDevOpsService.ts`.

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── AuthStep/       # Authentication step
│   ├── RepoSelector/   # Repository selection
│   ├── VersionConfig/  # Version configuration
│   ├── ProcessingPanel/# Processing status display
│   └── ExportBar/      # Export and process controls
├── hooks/              # Custom React hooks (reserved)
├── services/           # API and utility services
│   ├── azureDevOpsService.ts  # Azure DevOps API integration
│   └── csvExporter.ts         # CSV export functionality
├── stores/             # Zustand state management
│   └── appStore.ts     # Global application state
├── types/              # TypeScript type definitions
│   └── azureTypes.ts   # Azure DevOps entity types
└── utils/              # Utility functions
    └── retryUtils.ts   # Retry and debounce utilities
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Security Considerations

- PAT tokens are stored in localStorage only
- All API calls use HTTPS
- Tokens are never logged or exposed in console
- No server-side data persistence
- CORS may require browser configuration for local development

## CORS Configuration

Azure DevOps API calls from the browser may require CORS handling:

1. **Browser Extension**: Install a CORS extension for development
2. **Local Proxy**: Use a local proxy server
3. **Browser Flags**: Temporarily disable CORS (development only)

## Troubleshooting

### API Authentication Errors
- Verify PAT token has correct permissions
- Check token hasn't expired
- Ensure organization/project names are correct

### Repository Version Not Loading
- Confirm repository exists in Azure DevOps
- Verify release branches follow naming convention: `refs/heads/release/{version}.x`
- Check PAT token has Code Read permissions

### Processing Failures
- Review error messages in Processing Panel
- Verify network connectivity
- Check Azure DevOps API rate limits

## Future Enhancements

Planned features for future versions:
- Custom repository list configuration
- Patch version support
- Release history viewing
- Multi-project support
- Offline simulation mode

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.

## Support

For issues or questions, please create an issue in the GitHub repository.

---

**Version**: 1.0.0  
**Last Updated**: 2025-12-30  
**Built with**: ❤️ and TypeScript
