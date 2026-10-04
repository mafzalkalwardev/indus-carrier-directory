$ErrorActionPreference = "Stop"
Set-Location "d:\Carrier Directory"
$logDir = "d:\Carrier Directory\data\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "daily.log"

function Write-Log($message) {
  Add-Content -Path $log -Value "$(Get-Date -Format o) $message"
}

Write-Log "daily sync started"
$client = New-Object System.Net.Sockets.TcpClient
try {
  $client.Connect("127.0.0.1", 5432)
  $up = $true
} catch {
  $up = $false
} finally {
  $client.Dispose()
}

if (-not $up) {
  Write-Log "starting Postgres"
  Start-Process -FilePath "npm.cmd" -ArgumentList "run", "db" -WorkingDirectory "d:\Carrier Directory" -WindowStyle Hidden
  $deadline = (Get-Date).AddMinutes(2)
  do {
    Start-Sleep -Seconds 2
    $probe = New-Object System.Net.Sockets.TcpClient
    try {
      $probe.Connect("127.0.0.1", 5432)
      $up = $true
    } catch {
      $up = $false
    } finally {
      $probe.Dispose()
    }
  } while (-not $up -and (Get-Date) -lt $deadline)
}

if (-not $up) {
  Write-Log "Postgres did not start"
  exit 1
}

npm run ingest *>> $log
if ($LASTEXITCODE -ne 0) { Write-Log "census and authority ingest failed"; exit $LASTEXITCODE }
npm run ingest:safety *>> $log
if ($LASTEXITCODE -ne 0) { Write-Log "safety ingest failed"; exit $LASTEXITCODE }
Write-Log "daily sync finished"
