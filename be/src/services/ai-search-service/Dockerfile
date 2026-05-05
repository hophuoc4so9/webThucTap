FROM node:18-bullseye-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY .npmrc* ./

RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build
RUN npm prune --omit=dev

# =====================================================

FROM node:18-bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY .npmrc* ./

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p .models

RUN node -e "\
(async () => {\
  const { pipeline, env } = await import('@xenova/transformers');\
  env.cacheDir = './.models';\
  await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');\
  console.log('Model downloaded successfully');\
})();"

EXPOSE 8005

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=1024
ENV EMBEDDING_PROVIDER=local

CMD ["node", "dist/main.js"]