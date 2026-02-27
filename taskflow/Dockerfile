# Agent 10: Multi-stage Docker build
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
