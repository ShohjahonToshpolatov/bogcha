FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine AS runner
COPY --from=builder /app/dist/web/browser /usr/share/nginx/html
COPY docker/nginx.web.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
