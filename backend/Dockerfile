# Build stage
FROM maven:3.8.5-openjdk-8 AS build
WORKDIR /app
COPY pom.xml .
# Cache dependencies
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM openjdk:8-jre-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV PORT=7860
EXPOSE 7860
ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-jar", "app.jar"]
