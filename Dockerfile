FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache tini wget
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY --from=builder /app/dist ./dist
RUN mkdir -p data/projects data/fog data/tokens
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
VOLUME ["/app/data/projects", "/app/data/fog", "/app/data/tokens"]
ENTRYPOINT ["/sbin/tini", "--", "node", "server.js"]
