$body = '{"contents":[{"role":"user","parts":[{"text":"Say hello"}]}],"generationConfig":{"temperature":0.7,"maxOutputTokens":100}}'
try {
    if (-not $env:GEMINI_API_KEY) {
        throw "Set GEMINI_API_KEY before running this script."
    }
    $encodedKey = [System.Uri]::EscapeDataString($env:GEMINI_API_KEY)
    $response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$encodedKey" -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 30
    Write-Output "SUCCESS:"
    Write-Output ($response.candidates[0].content.parts[0].text)
} catch {
    Write-Output "ERROR:"
    Write-Output $_.Exception.Message
}
