# 甲虫成长记录项目：云端迁移与部署成果交接文档

本篇文档总结了我们为 **甲虫成长记录项目**（Spring Boot 后端 + React Web 前端 + 微信小程序）所做的全部数据库云端迁移、免费图片云存储集成、前后端一体化单容器云端部署、安全验证拦截、以及 UI 交互体验的升级与自动更新配置工作。

---

## 📋 核心技术架构与平台服务

| 服务模块 | 选型平台 | 费用阶梯 | 主要作用 |
| :--- | :--- | :--- | :--- |
| **底层数据库** | **TiDB Cloud (Serverless)** | $0 / 永久免费额度 | 存储甲虫个体信息和测量成长历史数据，支持高并发和高可靠性。 |
| **图片云存储** | **Supabase Storage** | $0 / 500MB 免费额度 | 托管用户上传的甲虫及饲养盒照片，生成公开 URL 供前端直接访问。 |
| **前后端服务托管**| **Hugging Face Spaces (Docker)**| $0 / CPU Basic 免费实例 | 编译打包 React 前端并将其集成在 Spring Boot 后端中，实现单一容器同源部署。 |

---

## 🔑 关键数据库与云存储凭证 (TiDB & Supabase)

以下是用于连通云数据库和云存储的配置凭据。

### 1. TiDB Cloud 云数据库配置

 Jpa/Hibernate 实体类对应 TiDB 中自动生成的 `beetle` 和 `growth_record` 表。

* **连接驱动 (Driver Class)**: `com.mysql.cj.jdbc.Driver`
* **连接 URL (JDBC URL)**:
  `jdbc:mysql://<YOUR_TIDB_HOST>:4000/beetle_growth?sslMode=VERIFY_IDENTITY`
* **数据库名 (Database)**: `beetle_growth`
* **用户名 (Username)**: `<YOUR_TIDB_USERNAME>` *(大小写敏感，前缀中包含大写字母 **Q**)*
* **密码 (Password)**: `<YOUR_TIDB_PASSWORD>`
* **Hibernate 方言 (Dialect)**: `org.hibernate.dialect.MySQL8Dialect`

### 2. Supabase Cloud 图片存储桶配置

* **API 访问地址 (Url)**: `https://<YOUR_SUPABASE_PROJECT>.supabase.co`
* **存储桶名称 (Bucket)**: `beetle-images` *(已在 Supabase 开启 Public 权限)*
* **存储访问秘钥 (API Key)**: `<YOUR_SUPABASE_SECRET_KEY>`

---

## 🚀 Hugging Face 云端一体化部署配置

我们已经在 Hugging Face 空间 **`<你的HF用户名>/<你的Space名称>`** 实现了前后端一体化单容器部署。

* **空间首页与前端 Web 访问地址**: 👉 **[https://<你的HF用户名>-<你的Space名称>.hf.space](https://<你的HF用户名>-<你的Space名称>.hf.space)**
* **后端健康检查接口**: [https://<你的HF用户名>-<你的Space名称>.hf.space/api/health](https://<你的HF用户名>-<你的Space名称>.hf.space/api/health)
* **服务启动监听端口**: `7860` *(Hugging Face Spaces Docker SDK 强制绑定)*

### 环境变量 (Settings -> Secrets) 列表

为确保您的账号和数据库密码不在 GitHub 源码中泄露，我们已在 Hugging Face Spaces 控制台的 **Settings -> Variables and secrets** 里配置了以下 9 个环境变量：

| 变量名称 (Secret Name) | 变量值 (Secret Value) | 说明 |
| :--- | :--- | :--- |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://<YOUR_TIDB_HOST>:4000/beetle_growth?sslMode=VERIFY_IDENTITY` | TiDB Cloud 数据库连接串 |
| `SPRING_DATASOURCE_USERNAME` | `<YOUR_TIDB_USERNAME>` | TiDB 用户名 |
| `SPRING_DATASOURCE_PASSWORD` | `<YOUR_TIDB_PASSWORD>` | TiDB 密码 |
| `SPRING_DATASOURCE_DRIVER_CLASS_NAME`| `com.mysql.cj.jdbc.Driver` | MySQL 驱动类名 |
| `SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT`| `org.hibernate.dialect.MySQL8Dialect` | Hibernate MySQL 方言 |
| `STORAGE_SUPABASE_URL` | `https://<YOUR_SUPABASE_PROJECT>.supabase.co` | Supabase API 端点 |
| `STORAGE_SUPABASE_BUCKET` | `beetle-images` | Supabase 存储桶 |
| `STORAGE_SUPABASE_KEY` | `<YOUR_SUPABASE_SECRET_KEY>` | Supabase 秘钥 |
| `APP_SECURITY_PASSCODE` | `由您设定的通行密码` | *(安全控制)* 全局数据访问及修改密匙 |

---

## 💻 网页端 UI / UX 升级与优化

为了彻底改善手机端使用体验并防止浏览器弹窗拦截：
1. **安全校验拦截 (Passcode 登录)**：引入了 Passcode（通行密钥）安全过滤器。后端接口受到拦截保护，前端自动滑出高科技磨砂登录界面，并支持密码的本地持久化。
2. **全局气泡提示 (Toast)**：设计了精美的半透明毛玻璃气泡提示组件，自动在页面顶部滑入。
3. **免手动确认**：替换了前端全部 **19 处** 原生阻断式 `alert()` 弹窗。现在保存成功或报错均会在顶部显示气泡，并在 **3 秒钟后自动消失**，您无需再手动去点击“确定”关闭弹窗。
4. **图片去重与极速上传**：编辑测量记录时，原有的云端图片直接沿用原有链接，只有新选择的本地照片才会触发上传，避免了云端产生重复的图片副本。
5. **iOS 端日期输入框适配**：优化了 `input[type="date"]` 样式，在 iOS / Safari 移动端使用 `display: flex` 并加入最大宽度限制，解决其尺寸过大及向右溢出容器卡片的问题。

---

## 📱 微信小程序连接配置

如果您希望在微信开发者工具或真机预览中连接到这个全新的云端数据库：
1. 打开本地项目下的 `miniprogram/app.js`。
2. 将本地局域网调试端口修改为您的云端域名：
   ```javascript
   App({
     globalData: {
       apiBase: 'https://<你的HF用户名>-<你的Space名称>.hf.space'
     }
   })
   ```
3. 在微信开发者工具的详情设置中，勾选 **“不校验合法域名、web-view、TLS 版本以及 HTTPS 证书”**，即可在小程序端录入并同步更新至 TiDB 云端。
