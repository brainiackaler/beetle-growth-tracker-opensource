FROM maven:3.9.16-eclipse-temurin-8 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:8-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/data
ENV PORT=8088
EXPOSE 8088
ENTRYPOINT ["java", "-jar", "app.jar"]
