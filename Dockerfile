# Stage 1: Build the Angular application
FROM node:20 AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies
RUN npm install

# Copy frontend code
COPY frontend/ ./frontend/

# Install frontend dependencies
RUN npm run install:frontend

# Build the frontend application for production
RUN npm run frontend:build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build output from the builder stage
COPY --from=builder /app/frontend/dist/frontend/browser /usr/share/nginx/html

# Copy the nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080
EXPOSE 8080
