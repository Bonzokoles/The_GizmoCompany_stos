# ZENO Browser - Docker Setup
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]