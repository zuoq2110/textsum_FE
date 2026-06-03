# Multi-stage build: build with Node, serve with nginx
FROM node:20-alpine AS builder

WORKDIR /app
# Ensure devDependencies (like TypeScript) are installed during the build
ENV NODE_ENV=development

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY . .
# Use a docker-friendly build script that skips `tsc` (type-checking)
RUN npm run build:docker

# Serve with nginx
FROM nginx:stable-alpine

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
