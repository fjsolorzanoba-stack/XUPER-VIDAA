param(
  [string]$OutDir = "$env:TEMP\xuper-timing",
  [int]$Frames = 16,
  [int]$IntervalMs = 600
)
$adb = "C:\Users\crist\AppData\Local\Android\Sdk\platform-tools\adb.exe"
New-Item -ItemType Directory -Force $OutDir | Out-Null
Get-ChildItem $OutDir -Filter *.png -ErrorAction SilentlyContinue | Remove-Item -Force
Add-Type -AssemblyName System.Drawing
# show the controller
& $adb -s 127.0.0.1:58526 shell "input keyevent 19" | Out-Null
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$rows = @()
for ($i = 0; $i -lt $Frames; $i++) {
  $t = $sw.ElapsedMilliseconds
  & $adb -s 127.0.0.1:58526 shell "screencap -p /sdcard/_t.png" | Out-Null
  $local = Join-Path $OutDir ("f{0:d2}.png" -f $i)
  & $adb -s 127.0.0.1:58526 pull /sdcard/_t.png $local 2>&1 | Out-Null
  $img = [System.Drawing.Bitmap]::FromFile($local)
  # brightness of the bottom-left corner where the bar background sits
  $sum = 0; $n = 0
  for ($y = 950; $y -lt 1070; $y += 6) {
    for ($x = 20; $x -lt 300; $x += 6) {
      $p = $img.GetPixel($x, $y); $sum += ($p.R + $p.G + $p.B) / 3; $n++
    }
  }
  $img.Dispose()
  $rows += [pscustomobject]@{ Frame = $i; AtMs = $t; Brightness = [math]::Round($sum / $n, 1) }
  Start-Sleep -Milliseconds $IntervalMs
}
$rows | Format-Table -AutoSize
