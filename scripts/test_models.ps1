try {
    if (-not $env:GEMINI_API_KEY) {
        throw "Set GEMINI_API_KEY before running this script."
    }
    $encodedKey = [System.Uri]::EscapeDataString($env:GEMINI_API_KEY)
    $response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models?key=$encodedKey" -Method GET -TimeoutSec 30
    Write-Output "SUCCESS! Available models:"
    foreach ($model in $response.models) {
        Write-Output ("  - " + $model.name + " : " + $model.displayName)
    }
} catch {
    Write-Output "ERROR:"
    Write-Output $_.Exception.Message
}
