FROM node:20-alpine AS base
WORKDIR /app

# Dependencias del sistema para pdfkit (fuentes) y zip
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev

COPY package.json ./
RUN npm install

COPY src ./src
COPY schema.sql ./schema.sql

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
