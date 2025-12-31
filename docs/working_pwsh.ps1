# ============================================
# CONFIGURATION
# ============================================
$patToken = "<YOUR_PERSONAL_ACCESS_TOKEN>"
$organization = "corilusnv"
$project = "CCPharmacyBuild"
$repositoryId = "TestPipelines"
$tagName = "0.2"
$targetBranch = "main"

# ============================================
# SETUP
# ============================================
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$patToken"))
$headers = @{ Authorization = "Basic $base64AuthInfo" }
$targetBranchCommitId = $null

function Invoke-AzDoApi {
    param([string]$Url)
    try {
        $response = Invoke-RestMethod -Uri $Url -Headers $headers -Method Get -ContentType "application/json"
        return $response | ConvertTo-Json -Depth 20 -Compress
    } catch {
        return $null
    }
}

Write-Host "Azure DevOps Work Items Query" -ForegroundColor Cyan
Write-Host "Organization: $organization | Project: $project | Repository: $repositoryId" -ForegroundColor Gray
Write-Host "Tag: $tagName | Branch: $targetBranch" -ForegroundColor Gray
Write-Host ""

# ============================================
# Get branches and find target branch commit
# ============================================
$allBranchesUrl = "https://dev.azure.com/$organization/$project/_apis/git/repositories/$repositoryId/refs?filter=heads/&api-version=7.1"
$allBranchesResponse = Invoke-AzDoApi -Url $allBranchesUrl
$allBranchesJson = if ($allBranchesResponse) { $allBranchesResponse | ConvertFrom-Json } else { @{ value = @() } }

if ($allBranchesJson.value) {
    foreach ($branch in $allBranchesJson.value) {
        $branchShortName = $branch.name -replace 'refs/heads/', ''
        if ($branchShortName -eq $targetBranch) {
            $targetBranchCommitId = $branch.objectId
        }
    }
}

if (-not $targetBranchCommitId) {
    Write-Host "ERROR: Target branch '$targetBranch' not found" -ForegroundColor Red
    exit 1
}

# ============================================
# Get tag and dereference if annotated
# ============================================
Write-Host "Getting tag '$tagName' details..." -ForegroundColor Green

$tagUrl = "https://dev.azure.com/$organization/$project/_apis/git/repositories/$repositoryId/refs?filter=tags/$tagName&api-version=7.1"
$tagResponse = Invoke-AzDoApi -Url $tagUrl
$tagJson = if ($tagResponse) { $tagResponse | ConvertFrom-Json } else { @{ count = 0; value = @() } }

if ($tagJson.count -eq 0 -or !$tagJson.value) {
    Write-Host "ERROR: Tag '$tagName' not found!" -ForegroundColor Red
    exit 1
}

$tagObjectId = $tagJson.value[0].objectId

# Dereference annotated tag
$annotatedTagUrl = "https://dev.azure.com/$organization/$project/_apis/git/repositories/$repositoryId/annotatedtags/$tagObjectId`?api-version=7.1"
$annotatedTagResponse = Invoke-AzDoApi -Url $annotatedTagUrl
$annotatedTagJson = $null
try { $annotatedTagJson = $annotatedTagResponse | ConvertFrom-Json } catch { }

if ($annotatedTagJson -and $annotatedTagJson.taggedObject -and $annotatedTagJson.taggedObject.objectId) {
    $tagCommitId = $annotatedTagJson.taggedObject.objectId
} else {
    $tagCommitId = $tagObjectId
}

Write-Host "Tag commit: $($tagCommitId.Substring(0,8))" -ForegroundColor Cyan

# ============================================
# Get commits since tag
# ============================================
Write-Host "Finding commits since tag on '$targetBranch'..." -ForegroundColor Green

$commitsUrl = "https://dev.azure.com/$organization/$project/_apis/git/repositories/$repositoryId/commits?searchCriteria.itemVersion.version=$targetBranch&searchCriteria.`$top=100&api-version=7.1"
$commitsResponse = Invoke-AzDoApi -Url $commitsUrl
$commitsJson = if ($commitsResponse) { $commitsResponse | ConvertFrom-Json } else { @{ value = @() } }

$commitsAfterTag = @()
foreach ($commit in $commitsJson.value) {
    if ($commit.commitId -eq $tagCommitId) { break }
    $commitsAfterTag += $commit
}

if ($commitsAfterTag.Count -eq 0) {
    Write-Host "No commits found since tag '$tagName'" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($commitsAfterTag.Count) commits since tag" -ForegroundColor Cyan
Write-Host ""

# ============================================
# Extract work items from commits and PRs
# ============================================
Write-Host "Extracting work items..." -ForegroundColor Green

$workItemIds = @()
$workItemPattern = '#(\d+)|AB#(\d+)'

foreach ($commit in $commitsAfterTag) {
    $message = $commit.comment
    
    # Check commit message for work item references
    $matches = [regex]::Matches($message, $workItemPattern)
    foreach ($match in $matches) {
        $wiId = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
        if ($wiId -and $workItemIds -notcontains $wiId) {
            $workItemIds += $wiId
        }
    }
    
    # Extract work items from merged PRs
    if ($message -match 'Merged PR (\d+)') {
        $prId = $Matches[1]
        $prWorkItemsUrl = "https://dev.azure.com/$organization/$project/_apis/git/repositories/$repositoryId/pullRequests/$prId/workitems?api-version=7.1"
        $prWorkItemsResponse = Invoke-AzDoApi -Url $prWorkItemsUrl
        
        if ($prWorkItemsResponse) {
            try {
                $prWorkItems = $prWorkItemsResponse | ConvertFrom-Json
                if ($prWorkItems.value) {
                    foreach ($wi in $prWorkItems.value) {
                        if ($wi.id -and $workItemIds -notcontains $wi.id) {
                            $workItemIds += $wi.id
                        }
                    }
                }
            } catch { }
        }
    }
}

$workItemIds = $workItemIds | Select-Object -Unique | Sort-Object

if ($workItemIds.Count -eq 0) {
    Write-Host "No work items found linked to commits" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($workItemIds.Count) work item(s)" -ForegroundColor Cyan
Write-Host ""

# ============================================
# Get work item details
# ============================================
Write-Host "Getting work item details..." -ForegroundColor Green

$idsString = $workItemIds -join ","
$workItemsUrl = "https://dev.azure.com/$organization/$project/_apis/wit/workitems?ids=$idsString&`$expand=relations&api-version=7.1"
$workItemsResponse = Invoke-AzDoApi -Url $workItemsUrl

$workItemsJson = $null
try {
    $workItemsJson = $workItemsResponse | ConvertFrom-Json
} catch {
    Write-Host "ERROR: Could not retrieve work item details" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Work Items Since Tag '$tagName':" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

foreach ($wi in $workItemsJson.value) {
    $wiType = $wi.fields.'System.WorkItemType'
    $wiId = $wi.id
    $wiTitle = $wi.fields.'System.Title'
    $wiState = $wi.fields.'System.State'
    
    Write-Host ""
    Write-Host "[$wiType] #$wiId - $wiState" -ForegroundColor Yellow
    Write-Host "  Title: $wiTitle" -ForegroundColor White
    if ($wi.fields.'System.AssignedTo') {
        Write-Host "  Assigned: $($wi.fields.'System.AssignedTo'.displayName)" -ForegroundColor Gray
    }
}

# ============================================
# Export results
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

$workItemsJson.value | ConvertTo-Json -Depth 10 | Out-File "workitems.json"
$workItemIds | Out-File "workitem_ids.txt"
$commitsAfterTag | Select-Object commitId, comment, author, committer | ConvertTo-Json -Depth 5 | Out-File "commits.json"

Write-Host "Results saved to: workitems.json, workitem_ids.txt, commits.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
