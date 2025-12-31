import type { AzureUser, GitRef, GitCommit, WorkItem } from '../types/azureTypes';
import { retryAsync } from '../utils/retryUtils';

// Azure DevOps Configuration
// TODO: Move these to environment variables for better configurability
const AZURE_DEVOPS_ORG = 'corilusnv';
const AZURE_DEVOPS_PROJECT = 'CCPharmacyBuild';
const API_VERSION = '7.1-preview.1';

export class AzureDevOpsService {
  private baseUrl: string;
  private patToken: string;

  constructor(patToken: string) {
    this.patToken = patToken;
    this.baseUrl = `https://dev.azure.com/${AZURE_DEVOPS_ORG}/${AZURE_DEVOPS_PROJECT}`;
  }

  private getHeaders(): HeadersInit {
    const auth = btoa(`:${this.patToken}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async validateToken(): Promise<AzureUser> {
    const url = `https://dev.azure.com/${AZURE_DEVOPS_ORG}/_apis/connectionData?api-version=${API_VERSION}`;
    
    return retryAsync(async () => {
      const response = await this.fetch<{ displayName: string; id: string; emailAddress: string }>(url);
      return {
        displayName: response.displayName,
        id: response.id,
        uniqueName: response.emailAddress,
      };
    });
  }

  async getAllRepositories(): Promise<{ id: string; name: string }[]> {
    const url = `${this.baseUrl}/_apis/git/repositories?api-version=7.0`;
    
    return retryAsync(async () => {
      const response = await this.fetch<{ value: { id: string; name: string }[] }>(url);
      return response.value;
    });
  }

  async getRepositoryRefs(repositoryId: string): Promise<GitRef[]> {
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/refs?filter=heads/release&api-version=${API_VERSION}`;
    
    return retryAsync(async () => {
      const response = await this.fetch<{ value: GitRef[] }>(url);
      return response.value;
    });
  }

  async getRepositoryTags(repositoryId: string): Promise<GitRef[]> {
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/refs?filter=tags&api-version=${API_VERSION}`;
    
    return retryAsync(async () => {
      const response = await this.fetch<{ value: GitRef[] }>(url);
      return response.value;
    });
  }

  async getMainBranchCommit(repositoryId: string): Promise<string> {
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/refs?filter=heads/main&api-version=${API_VERSION}`;
    
    return retryAsync(async () => {
      const response = await this.fetch<{ value: GitRef[] }>(url);
      if (response.value.length === 0) {
        throw new Error('Main branch not found');
      }
      return response.value[0].objectId;
    });
  }

  async getLatestReleaseVersion(repositoryId: string): Promise<string | null> {
    try {
      const refs = await this.getRepositoryRefs(repositoryId);
      
      // Find release branches (refs/heads/release/{version}.x)
      const releaseBranches = refs
        .filter((ref) => ref.name.startsWith('refs/heads/release/'))
        .map((ref) => {
          const match = ref.name.match(/refs\/heads\/release\/(\d+\.\d+)\.x/);
          return match ? match[1] : null;
        })
        .filter((v): v is string => v !== null);

      if (releaseBranches.length === 0) {
        return null;
      }

      // Sort versions and return the latest
      releaseBranches.sort((a, b) => {
        const [aMajor, aMinor] = a.split('.').map(Number);
        const [bMajor, bMinor] = b.split('.').map(Number);
        return bMajor - aMajor || bMinor - aMinor;
      });

      return releaseBranches[0];
    } catch (error) {
      console.error(`Error fetching version for ${repositoryId}:`, error);
      return null;
    }
  }

  async createBranch(
    repositoryId: string,
    branchName: string,
    sourceBranch: string = 'refs/heads/main'
  ): Promise<GitRef> {
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/refs?api-version=${API_VERSION}`;

    // First, get the commit ID of the source branch
    const refsUrl = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/refs?filter=${sourceBranch.replace('refs/heads/', 'heads/')}&api-version=${API_VERSION}`;
    const refs = await this.fetch<{ value: GitRef[] }>(refsUrl);
    
    if (refs.value.length === 0) {
      throw new Error(`Source branch ${sourceBranch} not found`);
    }

    const sourceCommitId = refs.value[0].objectId;

    return retryAsync(async () => {
      const response = await this.fetch<{ value: GitRef[] }>(url, {
        method: 'POST',
        body: JSON.stringify([
          {
            name: branchName,
            oldObjectId: '0000000000000000000000000000000000000000',
            newObjectId: sourceCommitId,
          },
        ]),
      });

      return response.value[0];
    });
  }

  async createTag(
    repositoryId: string,
    tagName: string,
    commitId: string,
    message: string
  ): Promise<void> {
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/annotatedtags?api-version=${API_VERSION}`;

    await retryAsync(async () => {
      await this.fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          name: tagName,
          taggedObject: {
            objectId: commitId,
          },
          message,
        }),
      });
    });
  }

  async getTagObject(
    repositoryId: string,
    tagObjectId: string
  ): Promise<{ taggedObject: { objectId: string } }> {
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/annotatedtags/${tagObjectId}?api-version=${API_VERSION}`;

    return retryAsync(async () => {
      return await this.fetch<{ taggedObject: { objectId: string } }>(url);
    });
  }

  private async resolveTagCommitId(
    repositoryId: string,
    tagRef: GitRef,
    tagName: string
  ): Promise<string> {
    try {
      const tagObject = await this.getTagObject(repositoryId, tagRef.objectId);
      return tagObject.taggedObject.objectId;
    } catch (error) {
      // If getting tag object fails, it might be a lightweight tag
      // In that case, the objectId already points to the commit
      console.error(`Failed to dereference tag ${tagName}, treating as lightweight tag:`, error);
      return tagRef.objectId;
    }
  }

  async getCommitsBetweenBranches(
    repositoryId: string,
    baseBranch: string,
    compareBranch: string
  ): Promise<GitCommit[]> {
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/commits?searchCriteria.itemVersion.version=${compareBranch}&searchCriteria.compareVersion.version=${baseBranch}&api-version=${API_VERSION}`;

    return retryAsync(async () => {
      const response = await this.fetch<{ value: GitCommit[] }>(url);
      return response.value;
    });
  }

  async getCommitsBetweenTags(
    repositoryId: string,
    oldTag: string,
    newTag: string
  ): Promise<GitCommit[]> {
    // Get the tag refs to find object IDs
    const tags = await this.getRepositoryTags(repositoryId);
    
    const oldTagRef = tags.find((t) => t.name === `refs/tags/${oldTag}`);
    const newTagRef = tags.find((t) => t.name === `refs/tags/${newTag}`);
    
    if (!oldTagRef || !newTagRef) {
      throw new Error(`Tags not found: ${oldTag} or ${newTag}`);
    }

    // Dereference annotated tags to get the actual commit IDs
    // For annotated tags, the objectId points to the tag object, not the commit
    const oldCommitId = await this.resolveTagCommitId(repositoryId, oldTagRef, oldTag);
    const newCommitId = await this.resolveTagCommitId(repositoryId, newTagRef, newTag);

    console.log(`Getting commits between tags: ${oldTag} (${oldCommitId}) and ${newTag} (${newCommitId})`);

    // Get all commits from the new tag
    // Then filter to only those that come after the old tag commit
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/commits?searchCriteria.itemVersion.version=${newCommitId}&searchCriteria.itemVersion.versionType=commit&api-version=${API_VERSION}`;

    return retryAsync(async () => {
      const response = await this.fetch<{ value: GitCommit[] }>(url);
      
      // Filter commits to only include those after the old tag
      // Find the index of the old commit and return everything before it (in reverse chronological order)
      const oldCommitIndex = response.value.findIndex((c) => c.commitId === oldCommitId);
      
      if (oldCommitIndex === -1) {
        // Old commit not found in the history, return all commits
        console.log(`Old commit ${oldCommitId} not found in history, returning all ${response.value.length} commits`);
        return response.value;
      }
      
      // Return commits from index 0 to oldCommitIndex (exclusive)
      const filteredCommits = response.value.slice(0, oldCommitIndex);
      console.log(`Found ${filteredCommits.length} commits between tags (out of ${response.value.length} total)`);
      return filteredCommits;
    });
  }

  async getCommitWorkItems(
    repositoryId: string,
    commitId: string
  ): Promise<string[]> {
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/commits/${commitId}/workitems?api-version=${API_VERSION}`;

    try {
      const response = await retryAsync(async () => {
        return await this.fetch<{ value: { id: string }[] }>(url);
      });

      return response.value.map((item) => item.id);
    } catch (error) {
      console.error(`Error fetching work items for commit ${commitId}:`, error);
      return [];
    }
  }

  async getPullRequestWorkItems(
    repositoryId: string,
    pullRequestId: string
  ): Promise<string[]> {
    const url = `${this.baseUrl}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/workitems?api-version=${API_VERSION}`;

    try {
      const response = await retryAsync(async () => {
        return await this.fetch<{ value: { id: string }[] }>(url);
      });

      return response.value.map((item) => item.id);
    } catch (error) {
      console.error(`Error fetching work items for PR ${pullRequestId}:`, error);
      return [];
    }
  }

  async getWorkItem(workItemId: string): Promise<WorkItem> {
    const url = `https://dev.azure.com/${AZURE_DEVOPS_ORG}/_apis/wit/workitems/${workItemId}?api-version=${API_VERSION}`;

    return retryAsync(async () => {
      return await this.fetch<WorkItem>(url);
    });
  }

  async updateWorkItem(
    workItemId: number,
    integrationBuild: string
  ): Promise<void> {
    const url = `https://dev.azure.com/${AZURE_DEVOPS_ORG}/_apis/wit/workitems/${workItemId}?api-version=${API_VERSION}`;

    await retryAsync(async () => {
      await this.fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json-patch+json',
        },
        body: JSON.stringify([
          {
            op: 'add',
            path: '/fields/Custom.IntegrationBuild',
            value: integrationBuild,
          },
        ]),
      });
    });
  }
}
