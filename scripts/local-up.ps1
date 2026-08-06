<#
    Dung moi truong phat trien tren Windows — MOT lenh.

        pwsh -File scripts\local-up.ps1

    Tuong duong `dev-setup.sh` nhung khong can Git Bash. Kich ban nay AN TOAN
    khi chay lai nhieu lan: no khong ghi de `.env` da co, va migration co
    checksum nen chay lai khong lam gi thua.

    Sau khi xong, `scripts\smoke-auth.mjs` kiem tra luong dang nhap that.
#>

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Buoc($n, $msg) { Write-Host "`n==> $n  $msg" -ForegroundColor Cyan }
function Loi($msg)      { Write-Host "    $msg" -ForegroundColor Red }
function Xong($msg)     { Write-Host "    $msg" -ForegroundColor Green }

# ─────────────────────────────────────────────────────────────
Buoc '1/6' 'Kiem cong cu'

$node = (node -v) 2>$null
if (-not $node) { Loi 'Chua cai Node. Can Node 22 tro len: https://nodejs.org'; exit 1 }
if ([int](($node -replace '^v') -split '\.')[0] -lt 22) {
    Loi "Can Node >= 22, dang co $node"; exit 1
}
Xong "Node $node"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host '    Chua co pnpm — dang cai...'
    npm install -g pnpm@10.34.5 | Out-Null
}
Xong "pnpm $(pnpm -v)"

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Loi 'Docker Desktop chua chay. Mo Docker Desktop roi chay lai kich ban nay.'
    exit 1
}
Xong 'Docker dang chay'

# ─────────────────────────────────────────────────────────────
Buoc '2/6' 'Tao .env neu chua co'

if (Test-Path .env) {
    Xong '.env da co — GIU NGUYEN, khong ghi de'
} else {
    # Sinh bi mat THAT bang bo sinh so ngau nhien cua he dieu hanh.
    # Hai bi mat phai KHAC nhau: dung chung thi mot the dat lai mat khau
    # doi duoc thanh the phien.
    function BiMat {
        $b = [byte[]]::new(48)
        [System.Security.Cryptography.RandomNumberGenerator]::Fill($b)
        [Convert]::ToBase64String($b)
    }
    (Get-Content .env.example -Raw) `
        -replace 'JWT_SECRET=.*',            "JWT_SECRET=$(BiMat)" `
        -replace 'PASSWORD_RESET_SECRET=.*', "PASSWORD_RESET_SECRET=$(BiMat)" `
        | Set-Content .env -NoNewline
    Xong '.env da tao, bi mat sinh ngau nhien'
    Write-Host '    COOKIE_SECURE=false — dung cho http://localhost.' -ForegroundColor DarkGray
    Write-Host '    Tren may chu that, de `true`; neu khong API se TU CHOI khoi dong.' -ForegroundColor DarkGray
}

# ─────────────────────────────────────────────────────────────
Buoc '3/6' 'Khoi dong PostgreSQL 16'

docker compose up -d postgres media-init | Out-Null
Write-Host '    cho PostgreSQL san sang...' -NoNewline
for ($i = 0; $i -lt 60; $i++) {
    docker compose exec -T postgres pg_isready -U ltv -d ltvn_dev 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 2; Write-Host '.' -NoNewline
}
if ($LASTEXITCODE -ne 0) { Write-Host ''; Loi 'PostgreSQL khong len. Xem: docker compose logs postgres'; exit 1 }
Write-Host ''
Xong 'PostgreSQL san sang tren cong 5432'

# ─────────────────────────────────────────────────────────────
Buoc '4/6' 'Cai dependency'
pnpm install
Xong 'xong'

# ─────────────────────────────────────────────────────────────
Buoc '5/6' 'Chay migration va du lieu khoi tao'
pnpm db:migrate
pnpm --filter @ltv/db seed
pnpm db:status
Xong 'so do va du lieu khoi tao da san sang'

# ─────────────────────────────────────────────────────────────
Buoc '6/6' 'Xong'

Write-Host @'

    Mo MOT cua so lenh khac va chay:

        pnpm dev:backend

    Roi quay lai cua so nay va chay:

        node scripts/smoke-auth.mjs

    Kich ban do se tu tao tai khoan quan tri dau tien va kiem ca luong
    dang nhap — khong phai go curl bang tay.

'@ -ForegroundColor Green
