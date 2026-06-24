FROM maven:3.9.11-eclipse-temurin-21-alpine AS build

WORKDIR /app

COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S deadzone && adduser -S deadzone -G deadzone

COPY --from=build /app/target/*.jar app.jar

USER deadzone

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
