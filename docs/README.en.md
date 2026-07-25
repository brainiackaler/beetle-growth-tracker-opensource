# Beetle Growth Tracker: English Guide

[Project home](../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

## 1. Overview

Beetle Growth Tracker is a self-hosted husbandry data manager:

- Web: React 19 and Vite for desktop and mobile browsers.
- Backend: Spring Boot 2.7, Java 8, and Spring Data JPA.
- Mini Program: a native WeChat Mini Program for core individual and growth records.
- Database: local H2 by default, with optional MySQL or TiDB.
- Photos: local storage by default, with optional public Supabase Storage.
- Notifications: Bark and an optional Telegram bot.
- Languages: Simplified Chinese, Traditional Chinese, English, or system language.

Features include individual beetles, growth measurements, batches, breeding and
production, income and expenses, photo annotation and upload, global search, and
recurring care reminders.

## 2. Privacy and security model

The public repository does not contain a production database host, cloud project
identifier, WeChat AppID, private LAN address, real user data, bot token, or
deployment credential. The default configuration keeps data under your control
on the local host.

Understand these boundaries before deployment:

- `JWT_SECRET` must be a private random value of at least 32 bytes and must stay
  in server-side environment variables.
- Registration is enabled for first-time setup. Set
  `REGISTRATION_ENABLED=false` after creating the required accounts on an
  internet-facing instance.
- This application does not encrypt H2 files or local uploads. Protect the host,
  disk, and backups.
- The Supabase adapter returns public object URLs, so anyone with a URL may read
  the corresponding photo.
- Never commit `.env`, `data/`, databases, uploads, or private Mini Program
  configuration.
- Internet-facing deployments require HTTPS, and the H2 console must remain off.

## 3. Repository layout

```text
backend/                 Spring Boot API, data models, and notification services
frontend/                React web client
miniprogram/             Native WeChat Mini Program
supabase/functions/      Optional Telegram API relay
docs/                    Guides in three languages
compose.yaml             Local or single-host Docker deployment
Dockerfile               Combined web and backend production image
data/                    Docker runtime data (contents are not tracked by Git)
```

## 4. Fastest deployment: Docker Compose

### 4.1 Prerequisites

Install:

- Git
- Docker Desktop or Docker Engine with `docker compose`

Clone the repository and create a local configuration:

```powershell
git clone https://github.com/brainiackaler/beetle-growth-tracker-opensource.git
cd beetle-growth-tracker-opensource
Copy-Item .env.example .env
```

Generate a random JWT key in PowerShell:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Paste the output after `JWT_SECRET=` in `.env`. On Linux/macOS:

```bash
openssl rand -base64 32
```

### 4.2 Start the application

```powershell
docker compose up -d --build
docker compose logs -f app
```

After startup completes, open:

```text
http://127.0.0.1:8088
```

On first use:

1. Switch the login screen to Register.
2. Create the first account and store its password safely.
3. If other LAN users or the internet can reach the service, change
   `REGISTRATION_ENABLED` in `.env` to `false`.
4. Run `docker compose up -d` to apply the setting.

The default bind address is `127.0.0.1`. If LAN access is required, set
`APP_BIND_ADDRESS=0.0.0.0` and restrict sources with a firewall. For internet
access, use an HTTPS reverse proxy instead of directly exposing port 8088.

### 4.3 Stop, update, and back up

Stop the service:

```powershell
docker compose down
```

Before an update, stop the service and copy the complete `data/` directory, then:

```powershell
git pull
docker compose up -d --build
```

The H2 database and local photos both live under `data/`. Stop the container
before restoring that directory. Do not copy an H2 database while the
application is writing to it.

## 5. Local development

### 5.1 Backend

Install Java 8 and Maven 3.8 or newer. In PowerShell:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$env:REGISTRATION_ENABLED = 'true'
cd backend
mvn spring-boot:run
```

Health endpoint:

```text
http://127.0.0.1:8088/api/health
```

Local H2 data is written under `backend/data/`. To temporarily use the H2
console, set this before startup:

```powershell
$env:H2_CONSOLE_ENABLED = 'true'
```

Open `http://127.0.0.1:8088/h2-console` only from the local machine and use:

```text
JDBC URL: jdbc:h2:file:./data/beetle_growth;MODE=MySQL;AUTO_SERVER=TRUE
User: sa
Password: empty
```

### 5.2 Web frontend

Install Node.js 20. In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Development mode connects to `http://localhost:8088` by default. You can set
`VITE_API_BASE` before building or change the API endpoint from the web app's
endpoint settings.

Validation commands:

```powershell
npm run lint
npm run build
```

### 5.3 Combined image

The root `Dockerfile` builds React first and embeds the static output in the
Spring Boot JAR:

```powershell
docker build -t beetle-growth-tracker .
```

Use `compose.yaml` and `.env` for production so secrets do not appear in shell
history.

## 6. Database configuration

### 6.1 H2 (default)

H2 is suitable for personal, single-host, single-instance deployments. It
requires no separate database, but multiple application instances must not
share the same H2 file. It is also unsuitable for cloud platforms without a
persistent disk.

### 6.2 MySQL / TiDB

Set the following variables and restart:

```dotenv
DATABASE_URL=jdbc:mysql://db.example.com:3306/beetle_growth?useSSL=true&serverTimezone=UTC
DB_USERNAME=beetle_app
DB_PASSWORD=replace-with-a-private-password
```

Both H2 and MySQL drivers are included, and the application selects one from the
JDBC URL. Create an empty database and a least-privilege application account
before the first connection. `JPA_DDL_AUTO=update` updates tables by default;
take a snapshot and validate upgrades in a staging environment for important
production deployments.

Use external MySQL/TiDB on platforms that rebuild sleeping instances, lack
persistent disks, or run multiple replicas.

## 7. Photo storage

### 7.1 Local storage (default)

Without Supabase configuration, uploaded files are stored in `data/uploads/`.
Back up this directory together with the database.

### 7.2 Supabase Storage (optional)

Create a public Storage bucket, then set these values only on the server:

```dotenv
STORAGE_SUPABASE_URL=https://your-project.supabase.co
STORAGE_SUPABASE_BUCKET=beetle-images
STORAGE_SUPABASE_KEY=your-server-side-key
```

Important:

- The current adapter creates public URLs, so the bucket must allow object reads.
- Photos may reveal time, location, environment, or husbandry details. Use local
  storage when those images must remain private.
- A privileged key belongs only in a server secret store, never in React, the
  Mini Program, or Git.
- A database backup stores photo URLs but does not back up Supabase objects.

## 8. Notifications

### 8.1 Bark

Each user can enter a Bark server and Device Key on the web Reminders page. No
device key is embedded in the server. To display a custom notification icon:

```dotenv
BARK_ICON_URL=https://example.com/public-beetle-logo.png
```

The icon must be a public HTTPS URL reachable by Bark. Notifications still work
when this value is empty.

### 8.2 Telegram bot

1. Create a bot with BotFather and obtain its token.
2. Generate a random webhook secret for the public service.
3. Make sure the application has an HTTPS domain.
4. Set:

```dotenv
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your_bot
TELEGRAM_WEBHOOK_SECRET=your-random-webhook-secret
TELEGRAM_WEBHOOK_URL=https://beetles.example.com/api/integrations/telegram/webhook
```

At startup, the backend registers the webhook and bot command menu. A user
creates a ten-minute binding link on the web Reminders page and taps Start in
Telegram. Commands include `/reminders`, `/status`, `/pause`, `/resume`, and
`/help`.

If the host cannot reach the Telegram API, deploy
`supabase/functions/telegram-proxy`:

```bash
supabase secrets set TELEGRAM_PROXY_SECRET="random-proxy-secret"
supabase secrets set TELEGRAM_BOT_TOKEN="your-bot-token"
supabase functions deploy telegram-proxy --no-verify-jwt
```

Then configure the application server:

```dotenv
TELEGRAM_API_PROXY_URL=https://your-project.supabase.co/functions/v1/telegram-proxy
TELEGRAM_API_PROXY_SECRET=random-proxy-secret
```

The relay permits only the four Telegram methods required by this project. Both
secrets must come from the Supabase secret store; never hard-code real values in
the function source.

## 9. WeChat Mini Program

1. Import `miniprogram/` into WeChat DevTools.
2. The repository uses the generic `touristappid`. Replace it locally with your
   own AppID before release, and never commit `project.private.config.json`.
3. DevTools can use `http://127.0.0.1:8088`.
4. For a physical device, change `apiBase` in `miniprogram/app.js` to the
   computer's LAN address, for example `http://192.168.1.100:8088`, and permit
   the connection through the firewall.
5. A released Mini Program must use an HTTPS request domain registered in the
   WeChat admin console.

The Mini Program supports registration and login and stores the JWT in WeChat
local storage. Signing out removes it. The Mini Program currently covers core
individual and growth records; use the web app for batches, breeding, finances,
and advanced reminder administration.

## 10. Using the application

1. Register or sign in. Each account can access only its own business data.
2. Use the top-right language selector for system language, Simplified Chinese,
   Traditional Chinese, or English.
3. Add an individual beetle with its name, species, stage, source, and dates.
4. Open its details to add weight, length, temperature, humidity, stage, notes,
   and photos, and review growth charts.
5. Use Batches to organize individuals purchased or hatched together.
6. Use Breeding to track pairing, eggs, hatching, and production history.
7. Use Finances for purchases, consumables, equipment, sales, and profit/loss.
8. Use Search to find individuals, batches, and related records.
9. Configure recurring rules under Reminders and optionally link Bark or
   Telegram.

Deleting an individual, batch, or record may cascade to related data. Review the
confirmation text and keep regular backups.

## 11. Environment variables

| Variable | Default | Purpose | Sensitive |
| --- | --- | --- | --- |
| `PORT` | `8088` | Backend listen port | No |
| `JWT_SECRET` | none; required | JWT signing, at least 32 random bytes | Yes |
| `REGISTRATION_ENABLED` | `true` | Allow creation of new accounts | No |
| `DATABASE_URL` | local H2 | JDBC connection string | Sometimes |
| `DB_USERNAME` | `sa` | Database username | Yes |
| `DB_PASSWORD` | empty | Database password | Yes |
| `JPA_DDL_AUTO` | `update` | Hibernate schema policy | No |
| `H2_CONSOLE_ENABLED` | `false` | H2 console switch | No |
| `STORAGE_SUPABASE_URL` | empty | Supabase project URL | No |
| `STORAGE_SUPABASE_BUCKET` | empty | Public photo bucket name | No |
| `STORAGE_SUPABASE_KEY` | empty | Server-side Storage key | Yes |
| `BARK_ICON_URL` | empty | Public Bark icon URL | No |
| `TELEGRAM_BOT_TOKEN` | empty | Telegram bot token | Yes |
| `TELEGRAM_BOT_USERNAME` | empty | Bot username | No |
| `TELEGRAM_WEBHOOK_SECRET` | empty | Webhook verification secret | Yes |
| `TELEGRAM_WEBHOOK_URL` | empty | Public HTTPS webhook | No |
| `TELEGRAM_API_PROXY_URL` | empty | Optional Telegram relay URL | No |
| `TELEGRAM_API_PROXY_SECRET` | empty | Relay authentication secret | Yes |
| `VITE_API_BASE` | `http://localhost:8088` in development | API root for a separately built frontend | No |

## 12. Troubleshooting

### The backend reports an invalid JWT key length

`JWT_SECRET` is too short. Generate at least 32 random bytes and restart. A new
key invalidates existing login tokens but does not delete business data.

### Data disappeared after rebuilding Docker

Confirm that `compose.yaml` is in use and the `./data:/app/data` mount still
exists. Cloud platforms without persistent disks need a persistent volume or an
external database and object storage.

### The web app says the backend is disconnected

Check `/api/health`, the port, firewall, and web endpoint settings. Development
uses backend port 8088 by default; the combined production image uses same-origin
`/api`.

### Photo upload fails

Check disk write permissions, reverse-proxy request-size limits, and the
Supabase URL, bucket, and key. When Supabase is configured, a failed cloud upload
does not silently fall back to local storage.

### A physical-device Mini Program request fails

`127.0.0.1` points to the phone itself. Use the computer's LAN address; a
released build also requires an approved HTTPS domain. Sign in again after a
401 response.

### Telegram messages do not arrive

Check the bot token, webhook URL, webhook secret, and public HTTPS reachability.
When using the relay, the application and Supabase Function proxy secrets must
match.

## 13. License

This project is available under the [MIT License](../LICENSE). Read
[SECURITY.md](../SECURITY.md) before reporting a security issue.
