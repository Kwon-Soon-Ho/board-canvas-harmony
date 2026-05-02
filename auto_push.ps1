# 자동 업로드(Auto-Push) 스크립트
# 이 스크립트는 파일 변경을 감지하여 자동으로 git commit 및 push를 수행합니다.

$path = Get-Location
$filter = "*.*"
$watcher = New-Object IO.FileSystemWatcher $path, $filter -Property @{
    IncludeSubdirectories = $true
    EnableRaisingEvents = $true
}

Write-Host "자동 업로드 감시를 시작합니다. (폴더: $path)"
Write-Host "종료하려면 Ctrl+C를 누르세요."

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    $timeStamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # .git 폴더 변경은 무시
    if ($path -like "*\.git\*") { return }

    Write-Host "[$timeStamp] 변경 감지: $path ($changeType)"
    
    # 5초 대기 (연속적인 변경을 하나로 묶기 위함)
    Start-Sleep -Seconds 5
    
    try {
        git add .
        $commitMessage = "auto-sync: $timeStamp"
        git commit -m $commitMessage
        git push origin main # 필요시 브랜치명 확인
        Write-Host "Successfully pushed to GitHub."
    } catch {
        Write-Host "Push 실패: $_"
    }
}

Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action
Register-ObjectEvent $watcher "Renamed" -Action $action

while ($true) { Start-Sleep -Seconds 1 }
