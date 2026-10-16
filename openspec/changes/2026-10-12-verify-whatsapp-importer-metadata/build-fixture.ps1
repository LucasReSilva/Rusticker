# Windows PowerShell + FFmpeg; creates synthetic images only, without network access.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression

$outputDirectory = Join-Path $PSScriptRoot 'generated'
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$ffmpegVersion = (& $ffmpeg -version | Select-Object -First 1)
$title = 'Rusticker Metadata Probe'
$author = 'Rusticker Synthetic Fixture'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$entries = @('title.txt', 'author.txt', 'sticker_01.webp', 'sticker_02.webp', 'sticker_03.webp', 'tray.png')
[System.IO.File]::WriteAllText((Join-Path $outputDirectory 'title.txt'), $title, $utf8)
[System.IO.File]::WriteAllText((Join-Path $outputDirectory 'author.txt'), $author, $utf8)

function New-SyntheticImage([int]$size, [System.Drawing.Color]$color, [string]$path) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $brush = New-Object System.Drawing.SolidBrush($color)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.FillEllipse($brush, [int]($size / 4), [int]($size / 4), [int]($size / 2), [int]($size / 2))
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $brush.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

function Assert-Image([string]$path, [int]$size) {
    $bitmap = [System.Drawing.Bitmap]::FromFile($path)
    try {
        if ($bitmap.Width -ne $size -or $bitmap.Height -ne $size -or
            $bitmap.GetPixel(0, 0).A -ne 0 -or
            $bitmap.GetPixel([int]($size / 2), [int]($size / 2)).A -ne 255) {
            throw "Unexpected dimensions or transparency: $path"
        }
    } finally {
        $bitmap.Dispose()
    }
}

$colors = @([System.Drawing.Color]::Red, [System.Drawing.Color]::Green, [System.Drawing.Color]::Blue)
for ($index = 1; $index -le 3; $index++) {
    $stem = 'sticker_{0:D2}' -f $index
    $source = Join-Path $outputDirectory "$stem-source.png"
    $encoded = Join-Path $outputDirectory "$stem.webp"
    $decoded = Join-Path $outputDirectory "$stem-decoded.png"
    New-SyntheticImage 512 $colors[$index - 1] $source
    & $ffmpeg -hide_banner -loglevel error -y -i $source -c:v libwebp -lossless 1 $encoded
    if ($LASTEXITCODE -ne 0) { throw "WEBP encoding failed: $stem" }
    if ((Get-Item -LiteralPath $encoded).Length -gt 100000) { throw "WEBP exceeds budget: $stem" }
    & $ffmpeg -hide_banner -loglevel error -y -i $encoded -frames:v 1 $decoded
    if ($LASTEXITCODE -ne 0) { throw "WEBP decoding failed: $stem" }
    Assert-Image $decoded 512
}
New-SyntheticImage 96 $colors[0] (Join-Path $outputDirectory 'tray.png')
Assert-Image (Join-Path $outputDirectory 'tray.png') 96
if ((Get-Item -LiteralPath (Join-Path $outputDirectory 'tray.png')).Length -gt 50000) {
    throw 'Tray icon exceeds budget'
}

$archivePath = Join-Path $outputDirectory 'metadata-probe.wastickers'
$stream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($name in $entries) {
        $entry = $archive.CreateEntry($name, [System.IO.Compression.CompressionLevel]::NoCompression)
        $entry.LastWriteTime = [System.DateTimeOffset]::new(2020, 1, 1, 0, 0, 0, [System.TimeSpan]::Zero)
        $destination = $entry.Open()
        try {
            $bytes = [System.IO.File]::ReadAllBytes((Join-Path $outputDirectory $name))
            $destination.Write($bytes, 0, $bytes.Length)
        } finally {
            $destination.Dispose()
        }
    }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}
# Identical bytes let a device tester compare file-extension routing separately.
[System.IO.File]::WriteAllBytes((Join-Path $outputDirectory 'metadata-probe.zip'), [System.IO.File]::ReadAllBytes($archivePath))
$stream = [System.IO.File]::OpenRead($archivePath)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Read)
try {
    if (($archive.Entries.FullName -join ',') -ne ($entries -join ',')) { throw 'Unexpected archive layout' }
    foreach ($name in @('title.txt', 'author.txt')) {
        $reader = New-Object System.IO.StreamReader($archive.GetEntry($name).Open(), $utf8)
        try {
            $expected = if ($name -eq 'title.txt') { $title } else { $author }
            if ($reader.ReadToEnd() -ne $expected) { throw "Metadata round-trip failed: $name" }
        } finally {
            $reader.Dispose()
        }
    }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}

[ordered]@{
    ffmpeg = $ffmpegVersion
    title = $title
    author = $author
    archiveSha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    entries = @($entries | ForEach-Object {
        [ordered]@{ name = $_; bytes = (Get-Item -LiteralPath (Join-Path $outputDirectory $_)).Length }
    })
    importerResult = 'Not tested; device and exact importer version required'
} | ConvertTo-Json -Depth 4
