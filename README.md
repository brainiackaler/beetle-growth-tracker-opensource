---
title: Beetle Growth Tracker
emoji: 🐛
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# 甲虫成长记录 (Beetle Growth Tracker)

这是一个甲虫成长记录项目，支持 React Web 端、原生微信小程序，以及云端部署。

## 🌐 线上环境与交接文档

- **云端 Web 访问地址**：👉 **[https://<你的HF用户名>-<你的Space名称>.hf.space](https://<你的HF用户名>-<你的Space名称>.hf.space)**
- **详细部署与凭证文档**：关于 TiDB 数据库、Supabase 存储、Hugging Face 环境变量以及 GitHub Actions 自动部署的详细信息，请参见 **[云端迁移与部署成果交接文档](./deployment_summary.md)**。

---

## 🛠️ 技术架构

- **后端 (backend/)**：Spring Boot 2.7 + Spring Data JPA + 安全校验过滤器 (`SecurityFilter`)。
- **前端 (frontend/)**：React (Vite) + 全局毛玻璃 Toast 通知 + 密码安全登录。
- **微信小程序 (miniprogram/)**：原生微信小程序，可连接本地后端或 Hugging Face 云端。
- **数据库**：可使用本地 H2 文件数据库，或云端 TiDB Cloud (Serverless) 兼容 MySQL 模式。
- **图片云存储**：Supabase Storage（提供全球公开 CDN 访问）。

## 目录

```text
backend/      Spring Boot 后端
frontend/     React (Vite) 网页前端
miniprogram/  微信小程序前端
```

## 🚀 快速启动 (Quick Start)

为确保你能一次部署成功，请按以下顺序启动项目：

### 1. 启动后端 (Spring Boot)

**方法一：使用 IntelliJ IDEA (推荐)**
1. 用 IDEA 打开 `backend/pom.xml`。
2. 等待 Maven 依赖同步完成。
3. 运行 `com.example.beetle.BeetleGrowthApplication`。

**方法二：命令行运行**
如果已安装 Maven，在项目根目录打开终端：
```powershell
cd backend
mvn spring-boot:run
```
启动成功后，后端健康检查接口运行在：`http://127.0.0.1:8088/api/health`

### 2. 启动前端 (React Web)

需要提前安装 Node.js。在项目根目录打开新的终端：
```powershell
cd frontend
npm install
npm run dev
```
启动成功后，浏览器访问：`http://localhost:5173`

## H2 数据库

数据库文件：

```text
D:\idea_projects\beetle-growth-tracker\backend\data\beetle_growth.mv.db
```

H2 控制台：

```text
http://127.0.0.1:8088/h2-console
```

连接信息：

```text
JDBC URL: jdbc:h2:file:./data/beetle_growth
User: sa
Password: 留空
```

## 微信小程序

用微信开发者工具导入：

```text
D:\idea_projects\beetle-growth-tracker\miniprogram
```

开发者工具中勾选“不校验合法域名、web-view、TLS 版本以及 HTTPS 证书”。

默认接口地址在：

```text
miniprogram/app.js
```

```js
apiBase: 'http://127.0.0.1:8088'
```

真机预览时请把 `127.0.0.1` 改成电脑局域网 IP。

## 功能

- 新增甲虫个体：名称、品种、孵化/购入日期、备注。
- 查看甲虫列表。
- 查看单只甲虫的成长记录。
- 新增成长记录：日期、阶段、体重、体长、温度、湿度、备注。
- 删除甲虫个体及其成长记录。

## 免费技术说明

- Java 与 Spring Boot：本机运行。
- H2：开源免费，本地文件数据库。
- 微信开发者工具：免费。
- 小程序前端：原生微信小程序，无付费 UI 库。
- 不使用云服务器、云数据库或付费 API。
