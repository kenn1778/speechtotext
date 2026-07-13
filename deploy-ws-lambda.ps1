# Deploy the WebSocket streaming Lambda function
param(
  [string]$Region = "us-east-1",
  [string]$BucketName = "kenn-text-speech-dev",
  [string]$FunctionName = "speechweb-transcribe-stream-dev"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Step 1: Install Lambda dependencies ==="
Set-Location -LiteralPath "$PSScriptRoot\amplify\backend\function\speechwebTranscribeStream\src"
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
npm install --production

Write-Host "=== Step 2: Create deployment ZIP ==="
$zipPath = "$env:TEMP\speechweb-transcribe-stream.zip"
Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue

$files = @(
  "index.js",
  "package.json",
  "node_modules"
)
$compress = @{
  Path = $files
  DestinationPath = $zipPath
  CompressionLevel = "Optimal"
  Force = $true
}
Compress-Archive @compress

Write-Host "ZIP size: $((Get-Item $zipPath).Length / 1KB) KB"

Write-Host "=== Step 3: Create/Update Lambda function ==="
try {
  $result = aws lambda get-function --function-name $FunctionName --region $Region 2>$null
  $exists = $true
} catch {
  $exists = $false
}

if ($exists) {
  Write-Host "Updating existing function..."
  aws lambda update-function-code `
    --function-name $FunctionName `
    --zip-file "fileb://$zipPath" `
    --region $Region
} else {
  Write-Host "Creating new function..."
  # Get the execution role ARN for Amplify
  $roleArn = "arn:aws:iam::352206182975:role/amplify-speechweb-dev-45acd-authRole"
  
  aws lambda create-function `
    --function-name $FunctionName `
    --runtime nodejs18.x `
    --role $roleArn `
    --handler index.handler `
    --zip-file "fileb://$zipPath" `
    --timeout 900 `
    --memory-size 512 `
    --region $Region `
    --environment "Variables={STORAGE_BUCKET=$BucketName,REGION=$Region}"
  
  Write-Host "Adding S3 permissions..."
  aws lambda add-permission `
    --function-name $FunctionName `
    --statement-id apigateway-invoke `
    --action lambda:InvokeFunction `
    --principal apigateway.amazonaws.com `
    --region $Region
  
  Write-Host "Adding Transcribe permissions to role..."
  aws iam put-role-policy `
    --role-name "amplify-speechweb-dev-45acd-authRole" `
    --policy-name "speechweb-transcribe-policy" `
    --policy-document '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": ["transcribe:StartTranscriptionJob", "transcribe:GetTranscriptionJob"],
          "Resource": "*"
        },
        {
          "Effect": "Allow",
          "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
          "Resource": "arn:aws:s3:::'$BucketName'/*"
        },
        {
          "Effect": "Allow",
          "Action": ["execute-api:ManageConnections"],
          "Resource": "*"
        }
      ]
    }'
}

Write-Host "=== Step 4: Get Lambda ARN ==="
$arn = aws lambda get-function --function-name $FunctionName --region $Region --query "Configuration.FunctionArn" --output text
Write-Host "Lambda ARN: $arn"

Write-Host "=== Done! ==="
Write-Host "Next step: Create the API Gateway WebSocket API and connect it to this Lambda."
