# Test multipart upload initialization for large file
$uri = "https://law-school-repository.vercel.app/api/videos/multipart-upload"
$body = @{
    filename = "Professionalism Series - Joe Sweeney - 2-21-2023.wmv"
    contentType = "video/x-ms-wmv"
    fileSize = 2763650511
} | ConvertTo-Json

Write-Host "🧪 Testing Multipart Upload Initialization"
Write-Host "File: Professionalism Series - Joe Sweeney - 2-21-2023.wmv"
Write-Host "Size: 2.76GB (2,763,650,511 bytes)"
Write-Host "Type: video/x-ms-wmv"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -ContentType "application/json" -Body $body
    
    Write-Host "✅ SUCCESS! Multipart upload initialized:" -ForegroundColor Green
    Write-Host "Upload ID: $($response.uploadId.Substring(0,20))..." -ForegroundColor Cyan
    Write-Host "S3 Key: $($response.s3Key)" -ForegroundColor Cyan
    Write-Host "Part Size: $([math]::Round($response.partSize / 1MB, 0))MB" -ForegroundColor Cyan
    Write-Host "Total Parts: $($response.totalParts)" -ForegroundColor Cyan
    Write-Host "CloudFront URL: $($response.cloudFrontUrl)" -ForegroundColor Cyan
    
    # Test getting a presigned URL for part 1
    Write-Host ""
    Write-Host "🔗 Testing Part Upload URL Generation..."
    
    $partBody = @{
        uploadId = $response.uploadId
        s3Key = $response.s3Key
        partNumber = 1
        contentType = "video/x-ms-wmv"
    } | ConvertTo-Json
    
    $partResponse = Invoke-RestMethod -Uri $uri -Method PUT -ContentType "application/json" -Body $partBody
    
    Write-Host "✅ Part 1 URL generated successfully!" -ForegroundColor Green
    Write-Host "URL Length: $($partResponse.presignedUrl.Length) characters" -ForegroundColor Cyan
    Write-Host "Part Number: $($partResponse.partNumber)" -ForegroundColor Cyan
    
    # Clean up - abort the upload
    Write-Host ""
    Write-Host "🧹 Cleaning up test upload..."
    
    $abortBody = @{
        uploadId = $response.uploadId
        s3Key = $response.s3Key
    } | ConvertTo-Json
    
    $abortResponse = Invoke-RestMethod -Uri $uri -Method DELETE -ContentType "application/json" -Body $abortBody
    Write-Host "✅ Test upload cleaned up successfully!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🎉 MULTIPART UPLOAD SYSTEM IS WORKING!" -ForegroundColor Green
    Write-Host "Your 43-minute video should upload successfully using this system." -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "🔧 Possible Issues:" -ForegroundColor Yellow
    Write-Host "• AWS credentials may need to be refreshed" -ForegroundColor White
    Write-Host "• S3 bucket permissions may need adjustment" -ForegroundColor White
    Write-Host "• Network connectivity issues" -ForegroundColor White
}
