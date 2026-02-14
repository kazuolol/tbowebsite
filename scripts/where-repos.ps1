$ErrorActionPreference = 'Stop'

function Resolve-GitRoot([string]$path) {
  Push-Location $path
  try {
    $root = (git rev-parse --show-toplevel 2>$null).Trim()
    if (-not $root) {
      return $null
    }
    return $root
  } finally {
    Pop-Location
  }
}

$frontendRoot = Resolve-GitRoot (Get-Location).Path
if (-not $frontendRoot) {
  Write-Host "Frontend: (not a git repo)"
  exit 1
}

Write-Host ("Frontend: {0}" -f $frontendRoot)

$explicitBackendRoot = $env:TBO_BACKEND_ROOT
$explicitReposRoot = $env:TBO_REPOS_ROOT

$backendCandidates = @(
  $explicitBackendRoot,
  ($(if ($explicitReposRoot) { Join-Path $explicitReposRoot 'tbowebsite-backend' } else { $null })),
  (Join-Path (Split-Path $frontendRoot -Parent) 'tbowebsite-backend'),
  'C:\Code\tbowebsite-backend',
  'D:\Code\tbowebsite-backend'
) | Where-Object { $_ -and $_.Trim().Length -gt 0 } | Select-Object -Unique

$backendRoot = $null
foreach ($candidate in $backendCandidates) {
  if (-not (Test-Path -LiteralPath $candidate)) {
    continue
  }
  $found = Resolve-GitRoot $candidate
  if ($found) {
    $backendRoot = $found
    break
  }
}

if ($backendRoot) {
  Write-Host ("Backend:  {0}" -f $backendRoot)
  exit 0
}

Write-Host "Backend:  (not found)"
Write-Host "Hint: set TBO_BACKEND_ROOT or TBO_REPOS_ROOT, or clone to a sibling folder named 'tbowebsite-backend'"
exit 2
