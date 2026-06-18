# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Spring Boot backend and embed frontend
FROM maven:3.8.5-openjdk-8 AS build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/src ./src
# Copy built React files into Spring Boot's static folder
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static
RUN mvn clean package -DskipTests

# Stage 3: Run stage
FROM openjdk:8-jre-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV PORT=7860
EXPOSE 7860
ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-jar", "app.jar"]
