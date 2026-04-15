FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production

# Railway sets PORT; token-server.mjs reads PORT
EXPOSE 3001

CMD ["node", "server/token-server.mjs"]

