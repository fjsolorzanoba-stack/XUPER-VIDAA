param(
  [Parameter(Mandatory=$true)][string]$Src,
  [Parameter(Mandatory=$true)][string]$OutDir,
  [Parameter(Mandatory=$true)][string]$Name,
  [Parameter(Mandatory=$true)][int]$X,
  [Parameter(Mandatory=$true)][int]$Y,
  [Parameter(Mandatory=$true)][int]$W,
  [Parameter(Mandatory=$true)][int]$H,
  [int]$OutW = 0,
  [int]$OutH = 0,
  [int]$Quality = 90
)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $OutDir | Out-Null
$img = [System.Drawing.Image]::FromFile((Resolve-Path $Src).Path)
if ($OutW -le 0) { $OutW = $W }
if ($OutH -le 0) { $OutH = $H }
$bmp = New-Object System.Drawing.Bitmap($OutW, $OutH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0,0,$OutW,$OutH)),
             (New-Object System.Drawing.Rectangle($X,$Y,$W,$H)),
             [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
$path = Join-Path $OutDir ($Name + '.jpg')
$bmp.Save($path, $codec, $ep)
$bmp.Dispose()
$img.Dispose()
Write-Output ("{0} {1}x{2} {3} B" -f $path, $OutW, $OutH, (Get-Item $path).Length)
