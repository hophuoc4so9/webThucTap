FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src/api-gateway ./src/api-gateway
WORKDIR /app/src/api-gateway
RUN npm run build
CMD ["npm", "run", "start:prod"]
