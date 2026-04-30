# STAGE 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for caching
COPY package*.json ./

# Install ALL dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the Nuxt application
RUN npm run build

# STAGE 2: Production
FROM node:20-slim AS runner

WORKDIR /app

# Only copy the production output from the builder stage
COPY --from=builder /app/.output ./.output

# Exposed port (Nuxt default is 3000)
EXPOSE 3000

# Set production environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Command to start the server
CMD ["node", ".output/server/index.mjs"]
