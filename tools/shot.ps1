param(
  [Parameter(Mandatory=$true)][string]$Name,
  [string]$Dir = "C:\Users\crist\Desktop\webosflux\webos\fidelity\shots\reference"
)
$adb = "C:\Users\crist\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s 127.0.0.1:58526 shell "screencap -p /sdcard/_shot.png" | Out-Null
& $adb -s 127.0.0.1:58526 pull /sdcard/_shot.png "$Dir\$Name.png" 2>&1 | Out-Null
$len = (Get-Item "$Dir\$Name.png").Length
Write-Output "$Name.png $len"
