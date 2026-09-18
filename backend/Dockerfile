FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
# hadolint ignore=DL3018
RUN apk add --no-cache nodejs curl
COPY pom.xml .
COPY src src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk update && apk upgrade --no-cache && \
    addgroup -S devsecops && adduser -S -G devsecops devsecops
USER devsecops
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
