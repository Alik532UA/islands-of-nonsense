# закрывает war3 без мыши: Alt+F4 (окно «Выход из игры»), затем X («Выйти»). Нужен keybd_event, SendKeys игра не видит.
Add-Type @'
using System;using System.Runtime.InteropServices;
public class K{[DllImport("user32.dll")]public static extern void keybd_event(byte v,byte s,int f,int e);}
'@
$sh = New-Object -ComObject WScript.Shell
for ($n = 0; $n -lt 3 -and (Get-Process war3 -ea 0); $n++) {
    [void]$sh.AppActivate('Warcraft III'); Start-Sleep 1
    [K]::keybd_event(0x12, 0x38, 0, 0); Start-Sleep -m 100; [K]::keybd_event(0x73, 0x3E, 0, 0); Start-Sleep -m 100
    [K]::keybd_event(0x73, 0x3E, 2, 0); Start-Sleep -m 100; [K]::keybd_event(0x12, 0x38, 2, 0); Start-Sleep 3
    [K]::keybd_event(0x58, 0x2D, 0, 0); Start-Sleep -m 120; [K]::keybd_event(0x58, 0x2D, 2, 0); Start-Sleep 5
}
if (Get-Process war3 -ea 0) { 'running' } else { 'closed' }
