# ---------- build stage ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG VITE_API_BASE_URL=https://api.mju-craft.shop/api
ARG VITE_TOKEN_KEY=accessToken
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_TOKEN_KEY=$VITE_TOKEN_KEY

RUN npm run build

# ---------- serve stage ----------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1
