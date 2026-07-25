# Beetle Growth Tracker / 甲虫成长记录

[简体中文](docs/README.zh-CN.md) · [繁體中文](docs/README.zh-TW.md) · [English](docs/README.en.md)

一个可自托管的甲虫饲养记录系统，包含 React Web、Spring Boot API 和原生微信小程序。支持个体与批次、成长测量、繁殖、收支、照片、搜索，以及 Bark / Telegram 养护提醒。

一個可自行託管的甲蟲飼養記錄系統，包含 React Web、Spring Boot API 與原生微信小程式。支援個體與批次、成長測量、繁殖、收支、相片、搜尋，以及 Bark / Telegram 養護提醒。

A self-hosted beetle husbandry tracker with a React web app, Spring Boot API, and native WeChat Mini Program. It covers individuals and batches, growth measurements, breeding, finances, photos, search, and Bark / Telegram care reminders.

## Highlights

- Web and Mini Program interfaces in 简体中文, 繁體中文, and English, with system-language detection.
- Local-first H2 storage; optional MySQL/TiDB and Supabase Storage.
- Account isolation with BCrypt password hashes and signed JWT sessions.
- Docker Compose quick start and a multi-stage production image.
- No production database host, cloud project ID, AppID, token, personal data, or deployment credential in the public tree.
- CI checks backend tests, frontend lint/build, private paths, and common secret formats.

## Quick start

```powershell
git clone https://github.com/brainiackaler/beetle-growth-tracker-opensource.git
cd beetle-growth-tracker-opensource
Copy-Item .env.example .env
```

Open `.env`, set a random `JWT_SECRET` of at least 32 bytes, then run:

```powershell
docker compose up -d --build
```

Visit `http://127.0.0.1:8088`, register the first account, and set
`REGISTRATION_ENABLED=false` before exposing the service to the internet.

The default deployment stores the database and uploaded photos in `./data`.
Back up that directory before upgrades.

## Documentation

- [简体中文：完整部署、配置与使用说明](docs/README.zh-CN.md)
- [繁體中文：完整部署、設定與使用說明](docs/README.zh-TW.md)
- [English: full deployment, configuration, and usage guide](docs/README.en.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
