# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client types before compiling TypeScript
RUN npx prisma generate
RUN npm run build

# ── Stage 2: production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output + prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
