$ErrorActionPreference = "Stop"

if (Get-Command mvn -ErrorAction SilentlyContinue) {
  mvn spring-boot:run
  exit $LASTEXITCODE
}

Write-Host "未找到 Maven 命令。请用 IntelliJ IDEA 打开 backend/pom.xml 后运行 BeetleGrowthApplication。" -ForegroundColor Yellow
Write-Host "也可以安装 Maven 后重新执行 .\run.ps1。"
exit 1
