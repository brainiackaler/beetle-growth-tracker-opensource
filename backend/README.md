# Spring Boot + H2 后端

此目录现在是标准 Maven 项目，使用 Spring Boot 2.7.18、Spring Web、Spring Data JPA 和 H2 文件数据库。

## 启动方式

### 方式一：IntelliJ IDEA

1. 用 IDEA 打开 `D:\idea_projects\beetle-growth-tracker\backend\pom.xml`。
2. 等待 Maven 依赖同步完成。
3. 运行 `com.example.beetle.BeetleGrowthApplication`。

服务地址：

```text
http://127.0.0.1:8088
```

### 方式二：命令行 Maven

如果电脑已经安装 Maven：

```powershell
cd D:\idea_projects\beetle-growth-tracker\backend
.\run.ps1
```

或：

```powershell
mvn spring-boot:run
```

## H2 数据库

数据库文件保存在：

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

## API

前端原有接口不需要改：

- `GET /api/health`
- `GET /api/beetles`
- `POST /api/beetles`
- `GET /api/beetles/{id}`
- `PUT /api/beetles/{id}`
- `DELETE /api/beetles/{id}`
- `GET /api/beetles/{id}/records`
- `POST /api/beetles/{id}/records`
