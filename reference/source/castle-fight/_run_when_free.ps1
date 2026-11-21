# Ждёт, пока war3 свободен N секунд, запускает автотест CF и закрывает ТОЛЬКО свою игру (по pid и времени старта).
# Не трогает чужую партию: если war3 появился до моего старта, ничего не шлёт.
param([string]$map = 'CastleFight_testi4', [int]$freeSec = 45, [int]$maxWait = 570, [int]$testWait = 150, [switch]$quiet, [switch]$small)
if (-not (Test-Path "D:\WarcraftIII 1.26a\Maps\cf_test\$map.w3x")) { "карты нет (сборка упала?): $map"; return }
$t0 = Get-Date
$free = 0
while (((Get-Date) - $t0).TotalSeconds -lt $maxWait) {
    if (Get-Process war3 -ea 0) { $free = 0 } else { $free += 5 }
    if ($free -ge $freeSec) { break }
    Start-Sleep 5
}
if ($free -lt $freeSec) { 'timeout: war3 still busy'; return }
$before = Get-Date
.\_runtest.ps1 -map $map -wait $testWait -quiet:$quiet -small:$small
$mine = @(Get-CimInstance Win32_Process -Filter "Name='war3.exe'" | Where-Object { $_.CreationDate -ge $before.AddSeconds(-2) } | ForEach-Object { [pscustomobject]@{ Id = $_.ProcessId } })
$all = @(Get-Process war3 -ea 0)
"mine=$($mine.Id -join ',') all=$($all.Id -join ',')"
if ($mine.Count -eq 1 -and $all.Count -eq 1) { .\_close2.ps1 } else { 'not closing: not exactly my process' }
