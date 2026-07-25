# Contributing / 贡献 / 貢獻

Issues and pull requests are welcome. Keep changes focused, do not include
runtime data or credentials, and update all affected language documentation
when behavior or setup changes.

欢迎提交 Issue 和 Pull Request。请保持改动聚焦，不要提交运行数据或凭证；行为或
部署方式变化时，请同步更新受影响的多语言文档。

歡迎提交 Issue 與 Pull Request。請保持變更聚焦，不要提交執行資料或憑證；行為或
部署方式變更時，請同步更新受影響的多語言文件。

Before submitting:

```powershell
cd backend
mvn test

cd ..\frontend
npm ci
npm run lint
npm run build
```

Use clear commit messages and explain any database, API, privacy, or deployment
impact in the pull request.
