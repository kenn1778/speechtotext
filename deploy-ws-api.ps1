# Deploy the API Gateway WebSocket API for streaming transcription
param(
  [string]$Region = "us-east-1",
  [string]$LambdaArn = "",
  [string]$StageName = "dev"
)

$ErrorActionPreference = "Stop"

if (-not $LambdaArn) {
  Write-Host "Fetching Lambda ARN..."
  $LambdaArn = aws lambda get-function --function-name "speechweb-transcribe-stream-dev" --region $Region --query "Configuration.FunctionArn" --output text
}

Write-Host "Lambda ARN: $LambdaArn"

Write-Host "=== Step 1: Create WebSocket API ==="
$apiId = aws apigatewayv2 create-api `
  --name "speechweb-transcribe-ws-dev" `
  --protocol-type WEBSOCKET `
  --route-selection-expression '$default' `
  --region $Region `
  --query "ApiId" `
  --output text

Write-Host "API ID: $apiId"

Write-Host "=== Step 2: Create Lambda integration ==="
$integrationId = aws apigatewayv2 create-integration `
  --api-id $apiId `
  --integration-type AWS_PROXY `
  --integration-uri "arn:aws:apigateway:$Region:lambda:path/2015-03-31/functions/${LambdaArn}/invocations" `
  --region $Region `
  --query "IntegrationId" `
  --output text

Write-Host "Integration ID: $integrationId"

Write-Host "=== Step 3: Create routes ==="
foreach ($route in @('$connect', '$disconnect', '$default')) {
  $routeId = aws apigatewayv2 create-route `
    --api-id $apiId `
    --route-key $route `
    --target "integrations/$integrationId" `
    --region $Region `
    --query "RouteId" `
    --output text
  Write-Host "Route '$route' created: $routeId"
}

Write-Host "=== Step 4: Create deployment ==="
$deploymentId = aws apigatewayv2 create-deployment `
  --api-id $apiId `
  --stage-name $StageName `
  --region $Region `
  --query "DeploymentId" `
  --output text

Write-Host "Deployment ID: $deploymentId"

Write-Host "=== Step 5: Grant Lambda invoke permission ==="
aws lambda add-permission `
  --function-name "speechweb-transcribe-stream-dev" `
  --statement-id "apigateway-ws-${apiId}" `
  --action lambda:InvokeFunction `
  --principal apigateway.amazonaws.com `
  --source-arn "arn:aws:execute-api:${Region}:352206182975:${apiId}/*" `
  --region $Region

$wsUrl = "wss://${apiId}.execute-api.${Region}.amazonaws.com/${StageName}"
Write-Host "=== Done! ==="
Write-Host "WebSocket URL: $wsUrl"
Write-Host ""
Write-Host "Add this to .env:"
Write-Host "VITE_WS_TRANSCRIBE_URL=$wsUrl"
