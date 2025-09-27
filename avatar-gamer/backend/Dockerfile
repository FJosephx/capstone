FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
# Fix CRLF y permisos si vienes de Windows
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java","-jar","app.jar"]
