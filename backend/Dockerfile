FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npx prisma migrate deploy
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/uploads ./uploads
EXPOSE 4000
LABEL org.opencontainers.image.source="https://github.com/cloudmart/frontend"
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
