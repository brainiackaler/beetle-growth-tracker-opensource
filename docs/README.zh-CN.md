# 甲虫成长记录：简体中文说明

[返回项目首页](../README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md)

## 1. 项目简介

甲虫成长记录是一套可自托管的饲养数据管理工具：

- Web：React 19 + Vite，适合电脑和手机浏览器。
- 后端：Spring Boot 2.7、Java 8、Spring Data JPA。
- 小程序：原生微信小程序，提供个体和成长记录等核心操作。
- 数据库：默认使用本地 H2 文件；可切换到 MySQL 或 TiDB。
- 图片：默认保存在本机；可选用 Supabase Storage 公共桶。
- 通知：支持 Bark，以及可选的 Telegram Bot。
- 语言：简体中文、繁体中文、英语，也可跟随系统。

主要功能包括甲虫个体、成长测量、批次、繁殖与生产、收支统计、照片标注与上传、
全局搜索和周期养护提醒。

## 2. 隐私和安全设计

公开仓库不包含生产数据库主机、云项目编号、微信 AppID、局域网地址、真实用户数据、
Bot Token 或部署凭证。默认配置优先在本机保存数据。

部署前请理解以下边界：

- `JWT_SECRET` 必须使用至少 32 字节的随机值，且只能保存在服务器环境变量中。
- 首次注册默认开放。创建所需账号后，公网实例应设置
  `REGISTRATION_ENABLED=false`。
- H2 数据库和本地上传文件本身没有由本应用加密；请保护主机、磁盘和备份。
- Supabase 适配器返回公共对象 URL，因此照片会被任何获得 URL 的人读取。
- 不要把 `.env`、`data/`、数据库、上传目录或小程序私有配置提交到 Git。
- 公网部署必须使用 HTTPS，并关闭 H2 控制台。

## 3. 目录结构

```text
backend/                 Spring Boot API、数据模型和通知服务
frontend/                React Web 客户端
miniprogram/             原生微信小程序
supabase/functions/      可选的 Telegram API 中继
docs/                    三语部署与使用文档
compose.yaml             本地/单机 Docker 部署
Dockerfile               Web 与后端一体化生产镜像
data/                    Docker 运行数据（内容不会被 Git 跟踪）
```

## 4. 最快部署：Docker Compose

### 4.1 准备环境

需要安装：

- Git
- Docker Desktop 或 Docker Engine，并支持 `docker compose`

克隆仓库并创建本地配置：

```powershell
git clone https://github.com/brainiackaler/beetle-growth-tracker-opensource.git
cd beetle-growth-tracker-opensource
Copy-Item .env.example .env
```

生成随机 JWT 密钥：

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

将输出填入 `.env` 的 `JWT_SECRET=` 后面。Linux/macOS 可使用：

```bash
openssl rand -base64 32
```

### 4.2 启动

```powershell
docker compose up -d --build
docker compose logs -f app
```

看到应用启动完成后访问：

```text
http://127.0.0.1:8088
```

第一次使用时：

1. 在登录页切换到“注册”。
2. 创建第一个账号并妥善保存密码。
3. 如果服务将被局域网其他人或公网访问，把 `.env` 中的
   `REGISTRATION_ENABLED` 改为 `false`。
4. 执行 `docker compose up -d` 使配置生效。

默认只绑定 `127.0.0.1`。若确实需要局域网访问，可将
`APP_BIND_ADDRESS=0.0.0.0`，同时使用防火墙限制来源。公网访问应通过 HTTPS
反向代理，不建议直接暴露 8088 端口。

### 4.3 停止、更新和备份

停止服务：

```powershell
docker compose down
```

更新前先停止服务并复制整个 `data/` 目录，然后执行：

```powershell
git pull
docker compose up -d --build
```

H2 数据库和本地照片都在 `data/` 中。恢复时应先停止容器，再把备份恢复到相同位置。
不要在应用写入数据库时直接复制 H2 文件。

## 5. 本地开发

### 5.1 后端

需要 Java 8 和 Maven 3.8 或更高版本。在 PowerShell 中：

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$env:REGISTRATION_ENABLED = 'true'
cd backend
mvn spring-boot:run
```

健康检查：

```text
http://127.0.0.1:8088/api/health
```

本地 H2 数据会保存在 `backend/data/`。如需临时使用 H2 控制台，在启动前设置：

```powershell
$env:H2_CONSOLE_ENABLED = 'true'
```

然后仅在本机访问 `http://127.0.0.1:8088/h2-console`，连接参数为：

```text
JDBC URL: jdbc:h2:file:./data/beetle_growth;MODE=MySQL;AUTO_SERVER=TRUE
User: sa
Password: 留空
```

### 5.2 Web 前端

需要 Node.js 20。另开一个终端：

```powershell
cd frontend
npm ci
npm run dev
```

开发模式默认连接 `http://localhost:8088`。也可在构建前设置
`VITE_API_BASE`，或在 Web 顶部的端点设置中修改 API 地址。

验证命令：

```powershell
npm run lint
npm run build
```

### 5.3 一体化镜像

根目录 `Dockerfile` 会先构建 React，再把静态文件打进 Spring Boot JAR：

```powershell
docker build -t beetle-growth-tracker .
```

生产环境推荐使用 `compose.yaml` 和 `.env`，避免把密钥直接写入命令历史。

## 6. 数据库配置

### 6.1 H2（默认）

适合个人、单机和单实例部署。优点是无需额外数据库；限制是不能让多个应用实例同时
共享同一个文件，也不适合无持久磁盘的云平台。

### 6.2 MySQL / TiDB

设置以下变量后重启：

```dotenv
DATABASE_URL=jdbc:mysql://db.example.com:3306/beetle_growth?useSSL=true&serverTimezone=UTC
DB_USERNAME=beetle_app
DB_PASSWORD=replace-with-a-private-password
```

应用同时包含 H2 和 MySQL 驱动，会根据 JDBC URL 自动选择。首次连接前请创建空数据库
和权限受限的应用账号。默认 `JPA_DDL_AUTO=update` 会自动更新表结构；重要生产环境应先
做数据库快照并在预发布环境验证升级。

无持久磁盘、会自动休眠重建或需要多副本的云平台应使用外部 MySQL/TiDB，不要使用容器
内 H2。

## 7. 图片存储

### 7.1 本地存储（默认）

不配置 Supabase 时，上传文件保存在 `data/uploads/`。备份数据库时也要备份该目录。

### 7.2 Supabase Storage（可选）

创建一个公共 Storage bucket，然后仅在服务端设置：

```dotenv
STORAGE_SUPABASE_URL=https://your-project.supabase.co
STORAGE_SUPABASE_BUCKET=beetle-images
STORAGE_SUPABASE_KEY=your-server-side-key
```

注意：

- 当前实现生成公共 URL，桶必须允许读取对象。
- 照片可能包含位置、时间、环境和饲养信息；有隐私要求时请继续使用本地存储。
- 高权限 Key 只能放在服务器 Secret 中，不能放进 React、小程序或仓库。
- 数据库备份只保存图片 URL，不会自动备份 Supabase 对象。

## 8. 通知配置

### 8.1 Bark

用户可在 Web 的“提醒”页面填写自己的 Bark Server 和 Device Key。服务端默认不会写死
任何设备 Key。若希望推送显示自定义图标，可设置：

```dotenv
BARK_ICON_URL=https://example.com/public-beetle-logo.png
```

图标必须是 Bark 客户端可访问的公网 HTTPS URL；不设置时仍可正常发送通知。

### 8.2 Telegram Bot

1. 使用 BotFather 创建 Bot 并取得 Token。
2. 为公开服务准备一个随机 Webhook Secret。
3. 服务必须已有 HTTPS 域名。
4. 设置：

```dotenv
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your_bot
TELEGRAM_WEBHOOK_SECRET=your-random-webhook-secret
TELEGRAM_WEBHOOK_URL=https://beetles.example.com/api/integrations/telegram/webhook
```

启动时后端会注册 Webhook 和命令菜单。用户在 Web 的提醒页面生成 10 分钟有效的绑定
链接，在 Telegram 中点击 Start 后完成绑定。支持 `/reminders`、`/status`、`/pause`、
`/resume` 和 `/help`。

如果部署环境无法直连 Telegram API，可部署
`supabase/functions/telegram-proxy`：

```bash
supabase secrets set TELEGRAM_PROXY_SECRET="random-proxy-secret"
supabase secrets set TELEGRAM_BOT_TOKEN="your-bot-token"
supabase functions deploy telegram-proxy --no-verify-jwt
```

再在应用服务器设置：

```dotenv
TELEGRAM_API_PROXY_URL=https://your-project.supabase.co/functions/v1/telegram-proxy
TELEGRAM_API_PROXY_SECRET=random-proxy-secret
```

中继只允许项目所需的四个 Telegram 方法。两个 Secret 必须通过 Supabase Secret Store
配置，不要修改源码写入实际值。

## 9. 微信小程序

1. 用微信开发者工具导入 `miniprogram/`。
2. 仓库使用通用的 `touristappid`；发布前请在本地换成自己的 AppID，且不要提交
   `project.private.config.json`。
3. 开发者工具调试可使用 `http://127.0.0.1:8088`。
4. 真机调试时，把 `miniprogram/app.js` 的 `apiBase` 改成电脑局域网地址，例如
   `http://192.168.1.100:8088`，并允许防火墙入站。
5. 正式发布时必须使用已在微信公众平台配置的 HTTPS request 合法域名。

小程序支持注册、登录，并把 JWT 保存在微信本地存储中。退出登录会删除该令牌。小程序
目前提供个体和成长记录等核心功能；批次、繁殖、收支和高级提醒管理以 Web 为准。

## 10. 使用步骤

1. 注册或登录账号。每个账号只能访问自己的业务数据。
2. 在右上角语言选择器中选择“跟随系统”、简体中文、繁体中文或 English。
3. 新增甲虫个体，填写名称、品种、阶段、来源和日期等信息。
4. 进入详情添加体重、体长、温湿度、阶段、备注和照片，查看成长曲线。
5. 使用“批次”整理同批购入或孵化的个体。
6. 使用“繁殖”记录配对、产卵、孵化和生产历史。
7. 使用“收支”登记购入、耗材、设备、出售等记录并查看盈亏。
8. 使用搜索查找个体、批次和关联记录。
9. 在“提醒”配置周期规则，并按需绑定 Bark 或 Telegram。

删除个体、批次或记录可能级联删除关联数据。执行前请确认提示，并保持定期备份。

## 11. 环境变量

| 变量 | 默认值 | 用途 | 是否敏感 |
| --- | --- | --- | --- |
| `PORT` | `8088` | 后端监听端口 | 否 |
| `JWT_SECRET` | 无，必须设置 | JWT 签名，至少 32 随机字节 | 是 |
| `REGISTRATION_ENABLED` | `true` | 是否允许创建新账号 | 否 |
| `DATABASE_URL` | 本地 H2 | JDBC 连接串 | 视内容而定 |
| `DB_USERNAME` | `sa` | 数据库用户名 | 是 |
| `DB_PASSWORD` | 空 | 数据库密码 | 是 |
| `JPA_DDL_AUTO` | `update` | Hibernate 表结构策略 | 否 |
| `H2_CONSOLE_ENABLED` | `false` | H2 控制台开关 | 否 |
| `STORAGE_SUPABASE_URL` | 空 | Supabase 项目 URL | 否 |
| `STORAGE_SUPABASE_BUCKET` | 空 | 公共图片桶名称 | 否 |
| `STORAGE_SUPABASE_KEY` | 空 | 服务端 Storage Key | 是 |
| `BARK_ICON_URL` | 空 | Bark 公共图标 URL | 否 |
| `TELEGRAM_BOT_TOKEN` | 空 | Telegram Bot Token | 是 |
| `TELEGRAM_BOT_USERNAME` | 空 | Bot 用户名 | 否 |
| `TELEGRAM_WEBHOOK_SECRET` | 空 | Webhook 校验 Secret | 是 |
| `TELEGRAM_WEBHOOK_URL` | 空 | 公网 HTTPS Webhook | 否 |
| `TELEGRAM_API_PROXY_URL` | 空 | 可选 Telegram 中继 URL | 否 |
| `TELEGRAM_API_PROXY_SECRET` | 空 | 中继鉴权 Secret | 是 |
| `VITE_API_BASE` | 开发环境为 `http://localhost:8088` | 独立构建前端时的 API 根地址 | 否 |

## 12. 常见问题

### 后端启动时报 JWT Key 长度错误

`JWT_SECRET` 太短。重新生成至少 32 字节的随机值，替换后重启；更换密钥会让已有登录
令牌失效，但不会删除业务数据。

### Docker 重建后数据消失

确认使用 `compose.yaml`，并且 `./data:/app/data` 挂载仍存在。无持久磁盘的云平台必须
挂载持久卷或使用外部数据库和对象存储。

### Web 显示后端未连接

检查 `/api/health`、端口、防火墙和 Web 端点设置。开发模式默认后端端口是 8088；
生产一体化镜像使用同源 `/api`。

### 图片上传失败

检查磁盘写权限、反向代理请求体限制，以及 Supabase URL、bucket 和 Key。若配置了
Supabase，云端上传失败不会静默改存本地。

### 小程序真机请求失败

`127.0.0.1` 在手机上指向手机本身。改用电脑局域网 IP；正式版本还需要 HTTPS 合法
域名。若返回 401，请重新登录。

### Telegram 没有收到消息

检查 Bot Token、Webhook URL、Webhook Secret 和公网 HTTPS 可达性。使用代理时，应用
与 Supabase Function 的 Proxy Secret 必须一致。

## 13. 开源许可

项目以 [MIT License](../LICENSE) 开源。提交安全问题前请阅读
[SECURITY.md](../SECURITY.md)。
