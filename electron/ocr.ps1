# Texterkennung für den Shiny-Zähler (Modus „Text suchen“) mit der in Windows eingebauten OCR (Windows.Media.Ocr).
# Läuft dauerhaft im Hintergrund, gestartet von electron/ocr.js:
#   stdin:  je Zeile ein PNG als Base64
#   stdout: je Zeile JSON, zuerst {"ready":true,"lang":"de-DE"}, dann je Bild {"text":"..."} oder {"error":"..."}
# Alles bleibt auf dem Rechner.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Send($obj) { [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress)); [Console]::Out.Flush() }

try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
      $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if (-not $engine) {
    $first = [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | Select-Object -First 1
    if ($first) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($first) }
  }
  if (-not $engine) { Send @{ fatal = 'Keine OCR-Sprache installiert (Windows-Einstellungen > Zeit und Sprache > Sprache)' }; exit 1 }
} catch {
  Send @{ fatal = $_.Exception.Message }; exit 1
}

function Await($op, [Type]$type) {
  $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  $null = $t.Wait(-1)
  $t.Result
}

Send @{ ready = $true; lang = $engine.RecognizerLanguage.LanguageTag }
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line.Length -eq 0) { continue }
  try {
    $ms = New-Object System.IO.MemoryStream (, [Convert]::FromBase64String($line))
    $stream = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($ms)
    $dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bmp = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $res = Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
    Send @{ text = [string]$res.Text }
    $bmp.Dispose(); $stream.Dispose(); $ms.Dispose()
  } catch {
    Send @{ error = $_.Exception.Message }
  }
}
