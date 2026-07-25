# 甲蟲成長記錄：繁體中文說明

[返回專案首頁](../README.md) · [简体中文](README.zh-CN.md) · [English](README.en.md)

## 1. 專案簡介

甲蟲成長記錄是一套可自行託管的飼養資料管理工具：

- Web：React 19 + Vite，適合電腦與手機瀏覽器。
- 後端：Spring Boot 2.7、Java 8、Spring Data JPA。
- 小程式：原生微信小程式，提供個體與成長記錄等核心操作。
- 資料庫：預設使用本機 H2 檔案；可切換至 MySQL 或 TiDB。
- 相片：預設儲存在本機；可選用 Supabase Storage 公開 bucket。
- 通知：支援 Bark，以及可選的 Telegram Bot。
- 語言：簡體中文、繁體中文、英文，也可跟隨系統。

主要功能包含甲蟲個體、成長測量、批次、繁殖與生產、收支統計、相片標註與上傳、
全域搜尋及週期性飼養提醒。

## 2. 隱私與安全設計

公開儲存庫不包含正式環境資料庫主機、雲端專案編號、微信 AppID、區域網路位址、
真實使用者資料、Bot Token 或部署憑證。預設設定會優先把資料保存在本機。

部署前請了解以下邊界：

- `JWT_SECRET` 必須是至少 32 位元組的隨機值，且只能保存在伺服器環境變數中。
- 首次註冊預設開啟。建立所需帳號後，對外服務應設定
  `REGISTRATION_ENABLED=false`。
- H2 資料庫與本機上傳檔案不會由本應用程式加密；請保護主機、磁碟與備份。
- Supabase 介面會回傳公開物件 URL，因此取得 URL 的人都可能讀取相片。
- 請勿將 `.env`、`data/`、資料庫、上傳目錄或小程式私有設定提交至 Git。
- 公網部署必須使用 HTTPS，並關閉 H2 Console。

## 3. 目錄結構

```text
backend/                 Spring Boot API、資料模型與通知服務
frontend/                React Web 用戶端
miniprogram/             原生微信小程式
supabase/functions/      可選的 Telegram API 中繼
docs/                    三語部署與使用文件
compose.yaml             本機/單機 Docker 部署
Dockerfile               Web 與後端整合的正式環境映像
data/                    Docker 執行資料（內容不會被 Git 追蹤）
```

## 4. 最快部署：Docker Compose

### 4.1 準備環境

需要安裝：

- Git
- Docker Desktop 或 Docker Engine，並支援 `docker compose`

複製儲存庫並建立本機設定：

```powershell
git clone https://github.com/brainiackaler/beetle-growth-tracker-opensource.git
cd beetle-growth-tracker-opensource
Copy-Item .env.example .env
```

產生隨機 JWT 金鑰：

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

將輸出填入 `.env` 的 `JWT_SECRET=` 後方。Linux/macOS 可使用：

```bash
openssl rand -base64 32
```

### 4.2 啟動

```powershell
docker compose up -d --build
docker compose logs -f app
```

應用程式啟動完成後開啟：

```text
http://127.0.0.1:8088
```

第一次使用時：

1. 在登入頁切換至「註冊」。
2. 建立第一個帳號並妥善保存密碼。
3. 若服務會提供給區域網路其他使用者或公網使用，請將 `.env` 中的
   `REGISTRATION_ENABLED` 改為 `false`。
4. 執行 `docker compose up -d` 套用設定。

預設只綁定 `127.0.0.1`。確實需要區域網路存取時，可設定
`APP_BIND_ADDRESS=0.0.0.0`，並以防火牆限制來源。公網存取應透過 HTTPS
反向代理，不建議直接公開 8088 連接埠。

### 4.3 停止、更新與備份

停止服務：

```powershell
docker compose down
```

更新前先停止服務並複製整個 `data/` 目錄，再執行：

```powershell
git pull
docker compose up -d --build
```

H2 資料庫與本機相片都位於 `data/`。還原時應先停止容器，再將備份放回相同位置。
請勿在應用程式寫入資料庫時直接複製 H2 檔案。

## 5. 本機開發

### 5.1 後端

需要 Java 8 與 Maven 3.8 或更新版本。在 PowerShell 中：

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$env:REGISTRATION_ENABLED = 'true'
cd backend
mvn spring-boot:run
```

健康檢查：

```text
http://127.0.0.1:8088/api/health
```

本機 H2 資料會保存在 `backend/data/`。如需暫時使用 H2 Console，請在啟動前設定：

```powershell
$env:H2_CONSOLE_ENABLED = 'true'
```

然後只在本機開啟 `http://127.0.0.1:8088/h2-console`，連線參數為：

```text
JDBC URL: jdbc:h2:file:./data/beetle_growth;MODE=MySQL;AUTO_SERVER=TRUE
User: sa
Password: 留空
```

### 5.2 Web 前端

需要 Node.js 20。另開終端機：

```powershell
cd frontend
npm ci
npm run dev
```

開發模式預設連線至 `http://localhost:8088`。也可在建置前設定
`VITE_API_BASE`，或在 Web 頂端的端點設定中修改 API 位址。

驗證命令：

```powershell
npm run lint
npm run build
```

### 5.3 整合映像

根目錄 `Dockerfile` 會先建置 React，再把靜態檔案放入 Spring Boot JAR：

```powershell
docker build -t beetle-growth-tracker .
```

正式環境建議使用 `compose.yaml` 與 `.env`，避免把金鑰直接寫入命令歷程。

## 6. 資料庫設定

### 6.1 H2（預設）

適合個人、單機及單一執行個體。優點是不需要額外資料庫；限制是多個應用程式執行個體
不能同時共用同一個檔案，也不適合沒有持久磁碟的雲端平台。

### 6.2 MySQL / TiDB

設定以下變數後重新啟動：

```dotenv
DATABASE_URL=jdbc:mysql://db.example.com:3306/beetle_growth?useSSL=true&serverTimezone=UTC
DB_USERNAME=beetle_app
DB_PASSWORD=replace-with-a-private-password
```

應用程式同時包含 H2 與 MySQL 驅動程式，會依 JDBC URL 自動選擇。首次連線前請建立
空資料庫與權限受限的應用程式帳號。預設 `JPA_DDL_AUTO=update` 會自動更新資料表；
重要正式環境應先建立快照，並在預備環境驗證升級。

無持久磁碟、會自動休眠重建或需要多副本的雲端平台應使用外部 MySQL/TiDB，不要使用
容器內 H2。

## 7. 相片儲存

### 7.1 本機儲存（預設）

未設定 Supabase 時，上傳檔案保存在 `data/uploads/`。備份資料庫時也要備份此目錄。

### 7.2 Supabase Storage（可選）

建立一個公開 Storage bucket，然後只在伺服器端設定：

```dotenv
STORAGE_SUPABASE_URL=https://your-project.supabase.co
STORAGE_SUPABASE_BUCKET=beetle-images
STORAGE_SUPABASE_KEY=your-server-side-key
```

注意：

- 目前實作會產生公開 URL，bucket 必須允許讀取物件。
- 相片可能包含位置、時間、環境與飼養資訊；有隱私需求時請使用本機儲存。
- 高權限 Key 只能放在伺服器 Secret，不可放入 React、小程式或儲存庫。
- 資料庫備份只保存相片 URL，不會自動備份 Supabase 物件。

## 8. 通知設定

### 8.1 Bark

使用者可在 Web 的「提醒」頁面填寫自己的 Bark Server 與 Device Key。伺服器端不會
預設寫入任何裝置 Key。若要顯示自訂圖示，可設定：

```dotenv
BARK_ICON_URL=https://example.com/public-beetle-logo.png
```

圖示必須是 Bark 用戶端可存取的公開 HTTPS URL；未設定時仍可正常推送。

### 8.2 Telegram Bot

1. 使用 BotFather 建立 Bot 並取得 Token。
2. 為公開服務準備隨機 Webhook Secret。
3. 服務必須已有 HTTPS 網域。
4. 設定：

```dotenv
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your_bot
TELEGRAM_WEBHOOK_SECRET=your-random-webhook-secret
TELEGRAM_WEBHOOK_URL=https://beetles.example.com/api/integrations/telegram/webhook
```

啟動時後端會註冊 Webhook 與命令選單。使用者在 Web 提醒頁面產生 10 分鐘有效的綁定
連結，在 Telegram 中點選 Start 後完成綁定。支援 `/reminders`、`/status`、
`/pause`、`/resume` 與 `/help`。

若部署環境無法直接連線 Telegram API，可部署
`supabase/functions/telegram-proxy`：

```bash
supabase secrets set TELEGRAM_PROXY_SECRET="random-proxy-secret"
supabase secrets set TELEGRAM_BOT_TOKEN="your-bot-token"
supabase functions deploy telegram-proxy --no-verify-jwt
```

再於應用程式伺服器設定：

```dotenv
TELEGRAM_API_PROXY_URL=https://your-project.supabase.co/functions/v1/telegram-proxy
TELEGRAM_API_PROXY_SECRET=random-proxy-secret
```

中繼只允許專案所需的四個 Telegram 方法。兩個 Secret 必須透過 Supabase Secret Store
設定，不要修改原始碼寫入實際值。

## 9. 微信小程式

1. 使用微信開發者工具匯入 `miniprogram/`。
2. 儲存庫使用通用的 `touristappid`；發佈前請在本機換成自己的 AppID，且不要提交
   `project.private.config.json`。
3. 開發者工具除錯可使用 `http://127.0.0.1:8088`。
4. 真機除錯時，將 `miniprogram/app.js` 的 `apiBase` 改為電腦區域網路位址，例如
   `http://192.168.1.100:8088`，並允許防火牆連入。
5. 正式發佈時必須使用已在微信公眾平台設定的 HTTPS request 合法網域。

小程式支援註冊、登入，並把 JWT 保存在微信本機儲存中。登出會刪除該 Token。小程式
目前提供個體與成長記錄等核心功能；批次、繁殖、收支及進階提醒管理以 Web 為主。

## 10. 使用步驟

1. 註冊或登入帳號。每個帳號只能存取自己的業務資料。
2. 在右上角語言選擇器中選擇「跟隨系統」、簡體中文、繁體中文或 English。
3. 新增甲蟲個體，填寫名稱、品種、階段、來源與日期等資訊。
4. 進入詳情新增體重、體長、溫濕度、階段、備註與相片，查看成長曲線。
5. 使用「批次」整理同批購入或孵化的個體。
6. 使用「繁殖」記錄配對、產卵、孵化及生產歷史。
7. 使用「收支」登記購入、耗材、設備、出售等記錄並查看盈虧。
8. 使用搜尋尋找個體、批次及相關記錄。
9. 在「提醒」設定週期規則，並依需求綁定 Bark 或 Telegram。

刪除個體、批次或記錄可能連帶刪除關聯資料。執行前請確認提示，並維持定期備份。

## 11. 環境變數

| 變數 | 預設值 | 用途 | 是否敏感 |
| --- | --- | --- | --- |
| `PORT` | `8088` | 後端監聽連接埠 | 否 |
| `JWT_SECRET` | 無，必須設定 | JWT 簽章，至少 32 隨機位元組 | 是 |
| `REGISTRATION_ENABLED` | `true` | 是否允許建立新帳號 | 否 |
| `DATABASE_URL` | 本機 H2 | JDBC 連線字串 | 視內容而定 |
| `DB_USERNAME` | `sa` | 資料庫使用者名稱 | 是 |
| `DB_PASSWORD` | 空 | 資料庫密碼 | 是 |
| `JPA_DDL_AUTO` | `update` | Hibernate 資料表策略 | 否 |
| `H2_CONSOLE_ENABLED` | `false` | H2 Console 開關 | 否 |
| `STORAGE_SUPABASE_URL` | 空 | Supabase 專案 URL | 否 |
| `STORAGE_SUPABASE_BUCKET` | 空 | 公開相片 bucket 名稱 | 否 |
| `STORAGE_SUPABASE_KEY` | 空 | 伺服器端 Storage Key | 是 |
| `BARK_ICON_URL` | 空 | Bark 公開圖示 URL | 否 |
| `TELEGRAM_BOT_TOKEN` | 空 | Telegram Bot Token | 是 |
| `TELEGRAM_BOT_USERNAME` | 空 | Bot 使用者名稱 | 否 |
| `TELEGRAM_WEBHOOK_SECRET` | 空 | Webhook 驗證 Secret | 是 |
| `TELEGRAM_WEBHOOK_URL` | 空 | 公開 HTTPS Webhook | 否 |
| `TELEGRAM_API_PROXY_URL` | 空 | 可選 Telegram 中繼 URL | 否 |
| `TELEGRAM_API_PROXY_SECRET` | 空 | 中繼驗證 Secret | 是 |
| `VITE_API_BASE` | 開發環境為 `http://localhost:8088` | 獨立建置前端時的 API 根位址 | 否 |

## 12. 常見問題

### 後端啟動時出現 JWT Key 長度錯誤

`JWT_SECRET` 太短。重新產生至少 32 位元組的隨機值，替換後重新啟動。更換金鑰會使
現有登入 Token 失效，但不會刪除業務資料。

### Docker 重建後資料消失

確認使用 `compose.yaml`，而且 `./data:/app/data` 掛載仍存在。沒有持久磁碟的雲端
平台必須掛載持久卷，或使用外部資料庫與物件儲存。

### Web 顯示後端未連線

檢查 `/api/health`、連接埠、防火牆與 Web 端點設定。開發模式預設後端連接埠為
8088；正式整合映像使用同源 `/api`。

### 相片上傳失敗

檢查磁碟寫入權限、反向代理請求大小限制，以及 Supabase URL、bucket 與 Key。若已
設定 Supabase，雲端上傳失敗時不會靜默改存本機。

### 小程式真機請求失敗

`127.0.0.1` 在手機上代表手機本身。請改用電腦區域網路 IP；正式版本還需要 HTTPS
合法網域。若回傳 401，請重新登入。

### Telegram 沒有收到訊息

檢查 Bot Token、Webhook URL、Webhook Secret 與公開 HTTPS 可達性。使用代理時，
應用程式與 Supabase Function 的 Proxy Secret 必須一致。

## 13. 開源授權

專案以 [MIT License](../LICENSE) 開源。回報安全問題前請閱讀
[SECURITY.md](../SECURITY.md)。
