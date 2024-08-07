FROM oven/bun:1 as base

ARG BOT_KEY
ARG SECRET
ARG POCKETBASE_URL
ARG BACKEND_TOKEN

# Set environment variables
ENV BOT_KEY=${BOT_KEY} \
    SECRET=${SECRET} \
    POCKETBASE_URL=${POCKETBASE_URL} \
    BACKEND_TOKEN=${BACKEND_TOKEN}

# Set work directory
WORKDIR /usr/src/app

# Copy application source
COPY . .

# Install dependencies
RUN bun install

# Set the default command to execute
CMD ["bun", "index.js"]
