# Run from the repository root; no secrets required.
$ErrorActionPreference = 'Stop'
$root = (git rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0 -or -not $root) { throw 'Ouvre PowerShell dans le depot Git.' }
Push-Location $root
try {
  if (-not (Test-Path -LiteralPath 'package.json')) { throw 'package.json absent.' }
  $pkg = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json
  if ($pkg.name -ne 'expo-talent-iss-kin' -or $pkg.version -ne '2.8.0') { throw 'Applique d abord le correctif V2.8.' }
  $node = (node -p 'process.versions.node')
  if ($LASTEXITCODE -ne 0 -or $node -notmatch '^22\.') { throw 'Installe et utilise Node.js 22 LTS.' }
  npm install --package-lock-only --ignore-scripts --package-lock=true --lockfile-version=3
  if ($LASTEXITCODE -ne 0) { throw 'Generation npm echouee : ne pas poursuivre.' }
  if (-not (Test-Path -LiteralPath 'package-lock.json' -PathType Leaf)) { throw 'Lockfile absent : verifier npm config, dossier et permissions.' }
  node scripts/verify-lock.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Lockfile incoherent : ne pas poursuivre.' }
  git add -f -- package-lock.json
  if ($LASTEXITCODE -ne 0) { throw 'Impossible d ajouter le lockfile a Git.' }
  git ls-files --error-unmatch -- package-lock.json
  if ($LASTEXITCODE -ne 0) { throw 'Le lockfile n est pas suivi par Git.' }
  Write-Host 'Lockfile genere, verifie et ajoute a Git. Execute npm ci puis npm run build.'
} finally { Pop-Location }
