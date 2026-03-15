# Build stage
FROM node:18-alpine AS build

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Install production server dependencies (using serve or just node server)
RUN npm install -g serve

# Copy built assets
COPY --from=build /app/dist ./dist

# Expose port (Vite default preview port is 4173, but user asked for 3000 mapping in compose)
EXPOSE 3000

# Start serving the application
CMD ["serve", "-s", "dist", "-l", "3000"]
