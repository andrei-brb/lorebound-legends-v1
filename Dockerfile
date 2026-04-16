FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

# Railway sets PORT; token-server.mjs reads PORT
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node server/token-server.mjs"]
