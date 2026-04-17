FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

#
# Prisma CLI validates `DATABASE_URL` even for `prisma generate`.
# During image builds, Railway may not provide runtime service variables.
# Use a dummy local URL for build-time generation; runtime uses real DATABASE_URL.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

# Railway sets PORT; token-server.mjs reads PORT
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node server/token-server.mjs"]
