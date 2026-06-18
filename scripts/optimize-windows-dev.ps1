<#
  optimize-windows-dev.ps1

  Speeds up `next dev` on Windows by excluding the project's hot paths from
  Windows Defender real-time scanning. Webpack/Turbopack rewrite thousands of
  files in .next on every compile/HMR; Defender re-scans each write, which can
  multiply dev compile and hot-reload times. node_modules (1.3 GB here) is also
  scanned on resolve.

  RUN AS ADMINISTRATOR (Add-MpPreference requires elevation):
    Right-click PowerShell -> "Run as administrator", then:
      cd D:\Madhan_Utils\learnings\madvibe
      npm run perf:windows
    or directly:
      powershell -ExecutionPolicy Bypass -File .\scripts\optimize-windows-dev.ps1

  Safe & reversible. To undo, see the Remove-MpPreference lines at the bottom.
#>

$ErrorActionPreference = "Stop"

# Resolve project root (parent of this scripts/ folder)
$projectRoot = Split-Path -Parent $PSScriptRoot
$paths = @(
    $projectRoot,
    (Join-Path $projectRoot ".next"),
    (Join-Path $projectRoot "node_modules")
)
$procs = @("node.exe", "next-server.exe", "esbuild.exe")

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "ERROR: This script must be run in an ELEVATED (Administrator) PowerShell." -ForegroundColor Red
    Write-Host "Defender exclusions (Add-MpPreference) require admin rights." -ForegroundColor Red
    Write-Host "Right-click PowerShell -> 'Run as administrator', then re-run: npm run perf:windows" -ForegroundColor Yellow
    exit 1
}

Write-Host "Adding Windows Defender exclusions for MadVibe dev..." -ForegroundColor Cyan

foreach ($path in $paths) {
    try {
        Add-MpPreference -ExclusionPath $path -ErrorAction Stop
        Write-Host "  [+] path excluded:    $path" -ForegroundColor Green
    } catch {
        Write-Host "  [!] could not exclude $path -> $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

foreach ($proc in $procs) {
    try {
        Add-MpPreference -ExclusionProcess $proc -ErrorAction Stop
        Write-Host "  [+] process excluded: $proc" -ForegroundColor Green
    } catch {
        Write-Host "  [!] could not exclude $proc -> $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Done. Current Defender exclusions:" -ForegroundColor Cyan
$prefs = Get-MpPreference
Write-Host "  Paths:     $($prefs.ExclusionPath -join ', ')"
Write-Host "  Processes: $($prefs.ExclusionProcess -join ', ')"
Write-Host ""
Write-Host "Restart your dev server to feel the difference." -ForegroundColor Green

<#
  To UNDO these exclusions later (run elevated):

    $root = "D:\Madhan_Utils\learnings\madvibe"
    Remove-MpPreference -ExclusionPath $root, "$root\.next", "$root\node_modules"
    Remove-MpPreference -ExclusionProcess "node.exe", "next-server.exe", "esbuild.exe"
#>
