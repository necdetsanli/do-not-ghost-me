# Development container for the "do-not-ghost-me" application.
# This image is intended for local development only and SHOULD NOT be used in production.

FROM mcr.microsoft.com/devcontainers/javascript-node:24

# Switch to root to install system packages and configure sudo.
USER root

# Use a specific npm version inside the dev container to match the project configuration.
RUN npm install -g npm@11.7.0

# Install PostgreSQL server and CLI tools for local development.
RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql postgresql-contrib && \
    rm -rf /var/lib/apt/lists/*

# Install Playwright system dependencies and the Chromium browser.
# This allows running Playwright tests directly from inside the dev container.
RUN npx playwright install --with-deps chromium

# Allow passwordless sudo for the "node" user inside the dev container.
# This is scoped to the container only and is not meant for production environments.
RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node && \
    chmod 0440 /etc/sudoers.d/node

# Switch back to the non-root user for normal development workflows.
USER node

WORKDIR /workspaces

# Default environment for the devcontainer is development.
ENV NODE_ENV=development
