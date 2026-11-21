Add-Type -AssemblyName System.Drawing

$src = "C:\Users\HP\.gemini\antigravity\brain\acd6dbf0-15f1-4c8a-ba63-96dab8746a1d\.user_uploaded\media_1795262437980_9b542bf9.jpg"
if (-not (Test-Path $src)) {
    Write-Error "Source image not found: $src"
    exit 1
}

$bmp = [System.Drawing.Bitmap]::FromFile($src)

function Resize-Bitmap($orig, $width, $height) {
    $target = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($target)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($orig, 0, 0, $width, $height)
    $g.Dispose()
    return $target
}

# 1. Generate icon.png (512x512)
$icon512 = Resize-Bitmap $bmp 512 512
$icon512.Save("src\app\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon512.Save("public\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon512.Dispose()

# 2. Generate apple-icon.png (180x180)
$appleIcon = Resize-Bitmap $bmp 180 180
$appleIcon.Save("src\app\apple-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$appleIcon.Save("public\apple-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$appleIcon.Dispose()

# 3. Generate multi-resolution favicon.ico (16, 32, 48, 64, 128, 256)
$sizes = @(16, 32, 48, 64, 128, 256)
$pngList = @()

foreach ($sz in $sizes) {
    $thumb = Resize-Bitmap $bmp $sz $sz
    $ms = New-Object System.IO.MemoryStream
    $thumb.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngList += ,$ms.ToArray()
    $ms.Dispose()
    $thumb.Dispose()
}

$bmp.Dispose()

function Save-IcoFile($outputPath, $sizes, $pngBytes) {
    $fs = [System.IO.File]::Create($outputPath)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICO Header: Reserved (0), Type (1 = ICO), ImageCount
    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]$sizes.Count)

    $offset = 6 + ($sizes.Count * 16)

    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $sz = $sizes[$i]
        $data = $pngBytes[$i]
        $wByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
        $hByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

        $bw.Write($wByte)
        $bw.Write($hByte)
        $bw.Write([byte]0)   # Color palette
        $bw.Write([byte]0)   # Reserved
        $bw.Write([uint16]1)  # Color planes
        $bw.Write([uint16]32) # Bits per pixel
        $bw.Write([uint32]$data.Length) # Image data size
        $bw.Write([uint32]$offset)      # File offset

        $offset += $data.Length
    }

    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $bw.Write($pngBytes[$i])
    }

    $bw.Close()
    $fs.Close()
}

Save-IcoFile "src\app\favicon.ico" $sizes $pngList
Save-IcoFile "public\favicon.ico" $sizes $pngList

Write-Output "Generated favicon files successfully:"
Get-Item src\app\favicon.ico, src\app\icon.png, src\app\apple-icon.png, public\favicon.ico, public\icon.png, public\apple-icon.png | Select-Object FullName, Length
