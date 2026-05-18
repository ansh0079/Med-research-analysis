try {
    $response = Invoke-RestMethod -Uri 'http://localhost:8080/api/config' -Method GET -TimeoutSec 10
    Write-Output "Config loaded:"
    Write-Output ("  - Gemini: " + $response.gemini)
    Write-Output ("  - Mistral: " + $response.mistral)
} catch {
    Write-Output "ERROR:"
    Write-Output $_.Exception.Message
}
