param(
  [Parameter(Mandatory=$true)]
  [string]$inPath,

  [Parameter(Mandatory=$true)]
  [string]$outPath
)

try {
  Add-Type -AssemblyName PresentationCore
  $fullIn = [System.IO.Path]::GetFullPath($inPath)
  $fullOut = [System.IO.Path]::GetFullPath($outPath)
  $uri = New-Object Uri($fullIn)
  $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create($uri, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
  $encoder = New-Object System.Windows.Media.Imaging.JpegBitmapEncoder
  $encoder.Frames.Add($decoder.Frames[0])
  $fs = [System.IO.File]::Create($fullOut)
  $encoder.Save($fs)
  $fs.Close()
  Write-Output "SUCCESS"
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
