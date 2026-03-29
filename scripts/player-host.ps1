Add-Type -AssemblyName PresentationCore

$player = New-Object System.Windows.Media.MediaPlayer
$currentPath = $null
$currentStatus = "idle"
$currentVolumePercent = 50

# Detect when media finishes playing naturally
Register-ObjectEvent -InputObject $player -EventName MediaEnded -Action {
  $script:currentStatus = "idle"
} | Out-Null

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
        $currentVolumePercent = [int]$cmd.volumePercent
        $player.Volume = [double]($currentVolumePercent / 100.0)
        $player.Play()
        $currentPath = [string]$cmd.fileUrl
        $currentStatus = "playing"
      }
      "pause" {
        $player.Pause()
        if ($null -ne $currentPath) {
          $currentStatus = "paused"
        }
      }
      "resume" {
        if ($null -ne $currentPath) {
          $player.Play()
          $currentStatus = "playing"
        }
      }
      "stop" {
        $player.Stop()
        $currentPath = $null
        $currentStatus = "idle"
      }
      "set_volume" {
        $currentVolumePercent = [int]$cmd.volumePercent
        $player.Volume = [double]($currentVolumePercent / 100.0)
      }
      "get_state" {
        # Check if playback ended naturally (position reached duration)
        if ($currentStatus -eq "playing" -and $null -ne $currentPath) {
          $dur = $player.NaturalDuration
          if ($dur.HasTimeSpan -and $player.Position -ge $dur.TimeSpan) {
            $currentStatus = "idle"
          }
        }

        [Console]::Out.WriteLine("{""ok"":true,""status"":""$currentStatus"",""volumePercent"":$currentVolumePercent}")
        [Console]::Out.Flush()
        continue
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
