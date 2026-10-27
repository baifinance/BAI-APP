# Dockerfile — BAI-APP single-service (Railway Option A: same origin)
# Runs Django backend on :8000 + Next.js frontend on $PORT in one container.
FROM python:3.12-slim

WORKDIR /app

# System dependencies (Node.js, npm, curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

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

# Start script
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Django production settings
ENV DJANGO_SETTINGS_MODULE=config.settings.production
ENV PYTHONUNBUFFERED=1

# Railway injects PORT at runtime
ENV PORT=3000

CMD ["bash", "start.sh"]
