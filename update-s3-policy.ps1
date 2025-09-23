param(
    [string]$BucketName = "law-school-repository-content",
    [string]$PolicyFile = "s3-policy-mux.json"
)

Write-Host "Updating policy for bucket: $BucketName" -ForegroundColor Cyan

if (-not (Test-Path $PolicyFile)) {
    Write-Error "Policy file '$PolicyFile' not found."
    exit 1
}

$policyJson = Get-Content $PolicyFile -Raw

$confirmation = Read-Host "Apply this policy? (y/n)"
if ($confirmation -ne 'y') {
    Write-Warning "Aborted by user."
    exit 0
}

aws s3api put-bucket-policy `
    --bucket $BucketName `
    --policy $policyJson

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to apply bucket policy."
    exit $LASTEXITCODE
}

aws s3api get-bucket-policy `
    --bucket $BucketName `
    --query Policy `
    --output text

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Policy applied, but verification failed."
    exit $LASTEXITCODE
}

Write-Host "Bucket policy updated successfully." -ForegroundColor Green
