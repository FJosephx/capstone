# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# Serve con Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Config SPA (fallback a index.html)
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
