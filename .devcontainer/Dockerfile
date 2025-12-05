FROM mcr.microsoft.com/devcontainers/javascript-node:24

# Switch to root to install packages and configure sudo
USER root

# Use a specific npm version for the dev container
RUN npm install -g npm@11.6.4

# Install PostgreSQL
RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql postgresql-contrib && \
    rm -rf /var/lib/apt/lists/*

# Install Playwright system dependencies and Chromium browser
RUN npx playwright install --with-deps chromium

# Allow passwordless sudo for the "node" user inside the devcontainer
RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node && \
    chmod 0440 /etc/sudoers.d/node

# Switch back to the non-root user for normal development
USER node

WORKDIR /workspaces

ENV NODE_ENV=development