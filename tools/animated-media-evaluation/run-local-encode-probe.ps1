param(
    [string]$OutputDirectory = (Join-Path $env:TEMP 'rusticker-animated-media-local-probe')
)

$ErrorActionPreference = 'Stop'

$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$ffprobe = (Get-Command ffprobe -ErrorAction Stop).Source
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) {
    throw "Chrome was not found at $chrome. Set the path in this script to a local desktop Chrome executable."
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$webpPath = Join-Path $OutputDirectory 'whatsapp-candidate.webp'
$webmPath = Join-Path $OutputDirectory 'telegram-candidate.webm'

$animatedRgbaSource = "nullsrc=size=512x512:rate=10:duration=1,format=rgba,geq=r='if(between(X,20+N*10,120+N*10),255,0)':g='0':b='0':a='if(between(X,20+N*10,120+N*10),255,0)'"
$videoRgbaSource = "nullsrc=size=512x512:rate=30:duration=1,format=rgba,geq=r='if(between(X,20+N*5,120+N*5),255,0)':g='0':b='0':a='if(between(X,20+N*5,120+N*5),255,0)'"

& $ffmpeg -hide_banner -loglevel error -f lavfi -i $animatedRgbaSource -frames:v 10 -an -c:v libwebp_anim -lossless 1 -loop 0 -f webp $webpPath -y
if ($LASTEXITCODE -ne 0) { throw "FFmpeg could not encode the animated WebP candidate (exit $LASTEXITCODE)." }

& $ffmpeg -hide_banner -loglevel error -f lavfi -i $videoRgbaSource -frames:v 30 -an -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 30 -deadline good $webmPath -y
if ($LASTEXITCODE -ne 0) { throw "FFmpeg could not encode the WebM candidate (exit $LASTEXITCODE)." }

$webpBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($webpPath))
$webmBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($webmPath))
$htmlTemplate = @'
<!doctype html><meta charset="utf-8"><pre id="result">pending</pre><script>
const webpData = "__WEBP__";
const webmData = "__WEBM__";
const decodeFrame = async (decoder, frameIndex) => {
  const frame = await decoder.decode({ frameIndex });
  const canvas = new OffscreenCanvas(frame.image.displayWidth, frame.image.displayHeight);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(frame.image, 0, 0);
  const sampleX = frameIndex === 0 ? 70 : 165;
  const result = {
    index: frameIndex,
    timestamp: frame.image.timestamp,
    duration: frame.image.duration,
    width: frame.image.displayWidth,
    height: frame.image.displayHeight,
    cornerAlpha: context.getImageData(0, 0, 1, 1).data[3],
    shapeAlpha: context.getImageData(sampleX, 256, 1, 1).data[3],
  };
  frame.image.close();
  return result;
};

(async () => {
  const result = { userAgent: navigator.userAgent };
  try {
    const decoder = new ImageDecoder({
      data: Uint8Array.from(atob(webpData), (character) => character.charCodeAt(0)),
      type: "image/webp",
    });
    await decoder.tracks.ready;
    result.webp = {
      frameCount: decoder.tracks.selectedTrack.frameCount,
      first: await decodeFrame(decoder, 0),
      last: await decodeFrame(decoder, decoder.tracks.selectedTrack.frameCount - 1),
    };
    decoder.close();

    const video = document.createElement("video");
    video.muted = true;
    video.src = `data:video/webm;base64,${webmData}`;
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve;
      video.onerror = () => reject(new Error("WebM video element decode failed"));
      setTimeout(() => reject(new Error("WebM loadeddata timeout")), 5000);
    });
    video.pause();
    const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(video, 0, 0);
    const pixels = context.getImageData(0, 0, video.videoWidth, video.videoHeight).data;
    let minAlpha = 255;
    let maxAlpha = 0;
    let nontransparentPixels = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      const alpha = pixels[index];
      minAlpha = Math.min(minAlpha, alpha);
      maxAlpha = Math.max(maxAlpha, alpha);
      if (alpha !== 0) nontransparentPixels += 1;
    }
    result.webm = {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
      currentTime: video.currentTime,
      minAlpha,
      maxAlpha,
      nontransparentPixels,
    };
    video.remove();
  } catch (error) {
    result.error = String(error);
  }
  document.querySelector("#result").textContent = JSON.stringify(result);
})();
setTimeout(() => {
  const output = document.querySelector("#result");
  if (output.textContent === "pending") output.textContent = "probe timeout";
}, 10000);
</script>
'@
$html = $htmlTemplate.Replace('__WEBP__', $webpBase64).Replace('__WEBM__', $webmBase64)
$htmlPath = Join-Path $OutputDirectory 'probe.html'
[IO.File]::WriteAllText($htmlPath, $html)

Write-Output "Chrome: $((Get-Item $chrome).VersionInfo.ProductVersion)"
Write-Output "FFmpeg: $((& $ffmpeg -hide_banner -version | Select-Object -First 1))"
Write-Output "ffprobe WebP candidate:"
& $ffprobe -v error -count_frames -show_entries stream=codec_name,width,height,pix_fmt,nb_read_frames -show_entries format=format_name,duration,size -of json $webpPath
Write-Output "ffprobe WebM candidate:"
& $ffprobe -v error -count_frames -show_entries stream=codec_name,codec_type,width,height,pix_fmt,r_frame_rate,nb_read_frames -show_entries format=format_name,duration,size -of json $webmPath
Write-Output "SHA-256:"
Get-FileHash $webpPath,$webmPath -Algorithm SHA256 | Select-Object Path,Hash

$profilePath = Join-Path $OutputDirectory 'chrome-profile'
$probeUri = ([Uri]$htmlPath).AbsoluteUri
$chromeStdoutPath = Join-Path $OutputDirectory 'chrome-stdout.html'
$chromeStderrPath = Join-Path $OutputDirectory 'chrome-stderr.log'
$chromeArguments = @(
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-crash-reporter',
    '--disable-crashpad',
    "--user-data-dir=$profilePath",
    '--virtual-time-budget=12000',
    '--dump-dom',
    $probeUri
)
$chromeProcess = Start-Process -FilePath $chrome -ArgumentList $chromeArguments -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput $chromeStdoutPath -RedirectStandardError $chromeStderrPath
if ($chromeProcess.ExitCode -ne 0) { throw "Chrome failed to run the decode probe (exit $($chromeProcess.ExitCode)); see $chromeStderrPath." }
$dom = Get-Content $chromeStdoutPath -Raw
$match = [regex]::Match($dom, '<pre id="result">([^<]+)</pre>')
if (-not $match.Success) { throw 'Chrome did not return a browser probe result.' }

Write-Output "Chrome local decode probe:"
Write-Output $match.Groups[1].Value
