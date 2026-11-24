$ErrorActionPreference = 'Stop'
$envPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.env'
$current = if (Test-Path -LiteralPath $envPath) { [IO.File]::ReadAllText($envPath) } else { '' }
$existing = [regex]::Match($current, '(?m)^\s*CV_ADMIN_USERNAME\s*=\s*([a-zA-Z0-9._-]+)\s*$')
$defaultUsername = if ($existing.Success) { $existing.Groups[1].Value } else { 'admin' }
$username = (Read-Host "Nhap ten tai khoan [mac dinh: $defaultUsername]").Trim()
if (!$username) { $username = $defaultUsername }
if ($username -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$') {
    throw 'Ten tai khoan khong hop le. Dung 3-64 ky tu chu, so, dau cham, gach duoi hoac gach noi.'
}
$first = Read-Host 'Nhap mat khau quan tri (tu 6 ky tu)' -AsSecureString
$second = Read-Host 'Nhap lai mat khau' -AsSecureString
$firstPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($first)
$secondPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPtr)
    $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPtr)
    if ($password.Length -lt 6 -or $password.Length -gt 512 -or $password -cne $confirmation) {
        throw 'Mat khau phai trung khop va dai tu 6 den 512 ky tu.'
    }
    $runtime = 'node'
    $portable = Join-Path (Split-Path -Parent $PSScriptRoot) 'logs/cv-tooling/node-v24.22.3-win-x64/node.exe'
    if (Test-Path -LiteralPath $portable) { $runtime = $portable }
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($password))
    $derived = $encoded | & $runtime -e 'const { randomBytes, scryptSync } = require(''node:crypto''); const input = require(''node:fs'').readFileSync(0,''utf8'').trim(); const salt = randomBytes(16); console.log(salt.toString(''hex'') + '':'' + scryptSync(Buffer.from(input,''base64''), salt, 64).toString(''hex''));'
    if ($LASTEXITCODE -ne 0 -or $derived -notmatch '^[a-f0-9]{32}:[a-f0-9]{128}$') { throw 'Khong tao duoc hash mat khau.' }
    $lines = @($current -split '\r?\n' | Where-Object { $_ -notmatch '^\s*CV_ADMIN_(USERNAME|PASSWORD_HASH)\s*=' })
    if ($current -notmatch '(?m)^\s*CV_DB_PASSWORD\s*=') {
        $lines += "CV_DB_PASSWORD=$([Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant())"
    }
    $lines += "CV_ADMIN_USERNAME=$($username.ToLowerInvariant())"
    $lines += "CV_ADMIN_PASSWORD_HASH=$derived"
    [IO.File]::WriteAllText($envPath, ($lines -join "`n").Trim() + "`n")
    Write-Output 'Da luu ten tai khoan va hash. Chay docker compose up -d --wait de ap dung.'
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPtr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPtr)
}
