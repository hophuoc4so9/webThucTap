# Build stage
FROM node:20-alpine AS build

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Reuse dependencies already installed in build stage to avoid flaky network fetches
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules

# Keep runtime image lean by removing dev-only dependencies without reinstalling
RUN npm prune --omit=dev

# Copy built files
COPY --from=build /app/dist ./dist

EXPOSE 8082

CMD ["node", "dist/main.js"]
