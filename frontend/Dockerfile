FROM node:20-alpine AS build
WORKDIR /app

# 1) deps
COPY package.json ./
RUN npm install

# 2) fuentes del proyecto (incluye tailwind y postcss!)
COPY index.html ./index.html
COPY vite.config.js ./vite.config.js
COPY tailwind.config.js ./tailwind.config.js
COPY postcss.config.js ./postcss.config.js
COPY src ./src
COPY public ./public

# 3) build
RUN npm run build

# 4) imagen final
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
