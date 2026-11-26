# Register only after a manual backup and verification have succeeded.
param([Parameter(Mandatory=$true)][string]$ConfigFile,[string]$At='02:00')
$ErrorActionPreference='Stop'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Config=(Resolve-Path $ConfigFile).Path
if($Config.StartsWith($Root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Le fichier prive doit rester hors du depot.'}
$Node=(Get-Command node -ErrorAction Stop).Source
foreach($cmd in @('pg_dump','pg_restore','age','tar')){Get-Command $cmd -ErrorAction Stop | Out-Null}
$Time=[DateTime]::ParseExact($At,'HH:mm',[Globalization.CultureInfo]::InvariantCulture)
$Script=Join-Path $Root 'scripts\backup.mjs'
$Action=New-ScheduledTaskAction -Execute $Node -Argument ('--env-file="'+$Config+'" "'+$Script+'"') -WorkingDirectory $Root
$Trigger=New-ScheduledTaskTrigger -Daily -At $Time
$Principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$Settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName 'EXPO-TALENT-Backup' -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description 'Sauvegarde locale chiffree EXPO TALENT' -Force | Out-Null
Write-Host 'Tache inscrite. Elle fonctionne lorsque ta session Windows est ouverte. Controle le resultat et le fichier age chaque jour.'
