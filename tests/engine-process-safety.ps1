param([string]$ScriptPath = (Join-Path $PSScriptRoot '../src-tauri/resources/RemoveWindowsAi.ps1'))

# Parse the engine without executing any Windows modifications.
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    $scriptPath, [ref]$tokens, [ref]$parseErrors
)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
$function = $ast.Find({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -eq 'Set-UwpAppRegistryEntry'
}, $true)
if (!$function) { throw 'Settings registry function missing' }
$assignment = $function.Find({
    param($node)
    $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    $node.Left.Extent.Text -eq '$ProcessToStop'
}, $true)
if (!$assignment) { throw 'Process stop list missing' }
$processNames = @($assignment.Right.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.StringConstantExpressionAst]
}, $true) | ForEach-Object { $_.Value })
if ($processNames -contains 'msedgewebview2') {
    throw 'Engine would terminate the KANAO WebView2 renderer'
}
foreach ($hostName in @('AppActions', 'SearchHost', 'FESearchHost', 'TextInputHost')) {
    if ($processNames -notcontains $hostName) { throw "Missing settings host: $hostName" }
}
Write-Output 'PASS: engine parses and preserves the shared WebView2 runtime.'