# Dockerfile — BAI-APP single-service (Railway Option A: same origin)
# Runs Django on :8000, Next.js on :3000, and Caddy on $PORT in one container.
FROM python:3.12-slim

WORKDIR /app

# Next.js 16 requires Node >=20.9; Debian's nodejs package is too old.
ARG NODE_VERSION=22.14.0
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    xz-utils \
    && ARCH="$(dpkg --print-architecture)" \
    && case "$ARCH" in \
         amd64) NODE_ARCH=x64 ;; \
         arm64) NODE_ARCH=arm64 ;; \
         *) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
       esac \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
         -o /tmp/node.tar.xz \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && rm /tmp/node.tar.xz \
    && node -v \
    && npm -v \
    && rm -rf /var/lib/apt/lists/*

# Install Caddy binary from official image
COPY --from=caddy:2 /usr/bin/caddy /usr/bin/caddy

# Python virtual environment
ENV VENV_PATH=/opt/venv
ENV PATH="$VENV_PATH/bin:$PATH"

# Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN python -m venv $VENV_PATH && \
    $VENV_PATH/bin/pip install --upgrade pip && \
    $VENV_PATH/bin/pip install -r backend/requirements.txt

# Frontend dependencies (copy package files first for layer caching)
COPY Frontend/package.json Frontend/package-lock.json ./Frontend/
RUN cd Frontend && npm ci && cd ..

# Copy all source code
COPY . .

# Build frontend (Next.js reads NEXT_PUBLIC_API_BASE_URL at build time)
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN cd Frontend && npm run build && cd ..

# Verify frontend build completed (37 routes expected)
RUN test -d Frontend/.next && \
    test -f Frontend/.next/BUILD_ID || \
    (echo "ERROR: Next.js build did not complete" && exit 1)

# Start script
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Django production settings
ENV DJANGO_SETTINGS_MODULE=config.settings.production
ENV PYTHONUNBUFFERED=1

# Caddy listens on Railway's $PORT (public)
# Django on 127.0.0.1:8000 (internal)
# Next.js on 127.0.0.1:3000 (internal)

CMD ["bash", "start.sh"]
