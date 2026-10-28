param(
    [string]$ScriptPath = (Join-Path $PSScriptRoot '../src-tauri/resources/RemoveWindowsAi.ps1'),
    [string]$FeaturesPath = (Join-Path $PSScriptRoot '../src/data/features.ts')
)

# Keep the UI feature ids, the engine's ValidateSet lists and the dispatch switches in agreement.
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    $ScriptPath, [ref]$tokens, [ref]$parseErrors
)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }

function Get-ValidateSetValues([string]$ParameterName) {
    $parameter = $ast.Find({
        param($node)
        $node -is [System.Management.Automation.Language.ParameterAst] -and
        $node.Name.VariablePath.UserPath -eq $ParameterName
    }, $true)
    if (!$parameter) { throw "Parameter missing: $ParameterName" }
    $attribute = $parameter.Attributes | Where-Object { $_.TypeName.Name -eq 'ValidateSet' }
    if (!$attribute) { throw "ValidateSet missing: $ParameterName" }
    return @($attribute.PositionalArguments | ForEach-Object { $_.Value })
}

function Get-SwitchLabels([string]$VariableName, [string]$FunctionName) {
    $scope = $ast
    if ($FunctionName) {
        $scope = $ast.Find({
            param($node)
            $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
            $node.Name -eq $FunctionName
        }, $true)
        if (!$scope) { throw "Function missing: $FunctionName" }
    }
    $switches = $scope.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.SwitchStatementAst] -and
        $node.Condition.Extent.Text.Trim([char[]]'() ') -eq ('$' + $VariableName)
    }, $true)
    if (!$switches) { throw "Switch on `$$VariableName missing" }
    $labels = foreach ($switch in $switches) {
        foreach ($clause in $switch.Clauses) {
            $clause.Item1.Value
        }
    }
    return @($labels)
}

function Assert-SameSet([string]$Label, [string[]]$Expected, [string[]]$Actual) {
    $missing = @($Expected | Where-Object { $Actual -notcontains $_ })
    $extra = @($Actual | Where-Object { $Expected -notcontains $_ })
    if ($missing.Count -or $extra.Count) {
        throw "$Label mismatch. Missing: [$($missing -join ', ')] Extra: [$($extra -join ', ')]"
    }
}

# Every UI id must be accepted by the engine; the engine may accept ids the UI hides.
function Assert-Covers([string]$Label, [string[]]$Required, [string[]]$Available) {
    $missing = @($Required | Where-Object { $Available -notcontains $_ })
    if ($missing.Count) {
        throw "$Label missing: [$($missing -join ', ')]"
    }
}

# Read the UI feature lists from features.ts without evaluating TypeScript.
$featuresText = Get-Content -LiteralPath $FeaturesPath -Raw -Encoding UTF8
$aiStart = $featuresText.IndexOf('export const AI_FEATURES')
$classicStart = $featuresText.IndexOf('export const CLASSIC_APPS')
if ($aiStart -lt 0 -or $classicStart -lt 0) { throw 'features.ts export missing' }
$aiText = $featuresText.Substring($aiStart, $classicStart - $aiStart)
$classicText = $featuresText.Substring($classicStart)
$aiFunctions = @([regex]::Matches($aiText, "functionName:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value })
$classicFunctions = @([regex]::Matches($classicText, "functionName:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value })
if (!$aiFunctions.Count -or !$classicFunctions.Count) { throw 'No functionName values found in features.ts' }

$optionValues = Get-ValidateSetValues 'Options'
$classicValues = Get-ValidateSetValues 'InstallClassicApps'

Assert-Covers 'UI feature functionName vs -Options' $aiFunctions $optionValues
Assert-SameSet '-Options vs non-interactive dispatch switch' $optionValues (Get-SwitchLabels 'Options')
Assert-Covers 'UI classic functionName vs -InstallClassicApps' $classicFunctions $classicValues
Assert-SameSet '-InstallClassicApps vs install-classicapps switch' $classicValues (Get-SwitchLabels 'app' 'install-classicapps')

Write-Output 'PASS: engine options match the UI feature contract.'
