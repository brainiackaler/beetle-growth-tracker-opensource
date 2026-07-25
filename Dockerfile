FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9.16-eclipse-temurin-8 AS build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/src ./src
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static
RUN mvn clean package -DskipTests

FROM eclipse-temurin:8-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/data
ENV PORT=8088
EXPOSE 8088
ENTRYPOINT ["java", "-jar", "app.jar"]
