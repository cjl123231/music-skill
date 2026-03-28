Add-Type -AssemblyName PresentationCore

$player = New-Object System.Windows.Media.MediaPlayer
$currentPath = $null

while (($line = [Console]::In.ReadLine()) -ne $null) {
  if ([string]::IsNullOrWhiteSpace($line)) {
    continue
  }

  try {
    $cmd = $line | ConvertFrom-Json

    switch ($cmd.action) {
      "play" {
        $uri = New-Object System.Uri([string]$cmd.fileUrl)
        $player.Open($uri)
        $player.Volume = [double]($cmd.volumePercent / 100.0)
        $player.Play()
        $currentPath = [string]$cmd.fileUrl
      }
      "pause" {
        $player.Pause()
      }
      "resume" {
        if ($null -ne $currentPath) {
          $player.Play()
        }
      }
      "stop" {
        $player.Stop()
      }
      "set_volume" {
        $player.Volume = [double]($cmd.volumePercent / 100.0)
      }
    }

    [Console]::Out.WriteLine('{"ok":true}')
    [Console]::Out.Flush()
  } catch {
    $message = $_.Exception.Message.Replace('"', "'")
    [Console]::Out.WriteLine("{""ok"":false,""error"":""$message""}")
    [Console]::Out.Flush()
  }
}
