# ---------- build stage ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG VITE_API_BASE_URL=https://api.mju-craft.shop/api
ARG VITE_TOKEN_KEY=accessToken
# GA4 — measurement ID는 번들에 공개되는 값이라 저장소에 둬도 무방
ARG VITE_GA4_MEASUREMENT_ID=G-17VCDJP1BN
ARG VITE_GA4_DEBUG_MODE=false
ARG VITE_SHOW_GA4_FOOTER_BADGE=true
ARG VITE_GA4_REPORT_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_TOKEN_KEY=$VITE_TOKEN_KEY
ENV VITE_GA4_MEASUREMENT_ID=$VITE_GA4_MEASUREMENT_ID
ENV VITE_GA4_DEBUG_MODE=$VITE_GA4_DEBUG_MODE
ENV VITE_SHOW_GA4_FOOTER_BADGE=$VITE_SHOW_GA4_FOOTER_BADGE
ENV VITE_GA4_REPORT_URL=$VITE_GA4_REPORT_URL

RUN npm run build

# ---------- serve stage ----------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1
