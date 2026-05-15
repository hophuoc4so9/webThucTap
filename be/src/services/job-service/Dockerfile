FROM node:20-bullseye-slim 
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps


COPY . .
RUN mkdir -p data && npm run build
CMD ["node", "dist/main.js"]
