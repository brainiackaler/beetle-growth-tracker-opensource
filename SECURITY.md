# Security Policy / 安全政策

## Reporting a vulnerability / 报告漏洞

Please use GitHub's private vulnerability reporting or open a private Security
Advisory for this repository. Do not put credentials, personal data, database
exports, or exploit details in a public issue.

请优先使用本仓库的 GitHub 私密漏洞报告或 Security Advisory。请勿在公开 Issue
中粘贴凭证、个人数据、数据库导出文件或可直接利用的攻击细节。

請優先使用本儲存庫的 GitHub 私密漏洞回報或 Security Advisory。請勿在公開
Issue 中貼上憑證、個人資料、資料庫匯出檔或可直接利用的攻擊細節。

If a real secret was committed, rotate or revoke it first. Removing the line
from the latest commit is not enough; review and rewrite the affected Git
history before publishing again.

## Deployment boundaries / 部署边界

- `JWT_SECRET` must be random, private, and at least 32 bytes.
- Registration is enabled by default for first-time setup. Disable it with
  `REGISTRATION_ENABLED=false` after creating the required accounts on an
  internet-facing deployment.
- H2 files and local uploads are not encrypted by this application. Protect
  the host, backups, and `data/` directory.
- Supabase support returns public object URLs. Do not use a public bucket for
  photos that must remain private.
- The H2 console is disabled by default. Never expose it through a public
  reverse proxy.
- Put the service behind HTTPS before using it over the internet.
- Telegram, Bark, database, and storage credentials belong only in server-side
  environment variables or platform secret stores.

## Supported version

Security fixes target the latest `main` branch. Older deployments should back
up their data and upgrade before requesting support.
