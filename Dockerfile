FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml README.md /app/
COPY src /app/src

RUN apt-get update \
    && audio_package="libasound2" \
    && if apt-cache show libasound2t64 >/dev/null 2>&1; then audio_package="libasound2t64"; fi \
    && apt-get install -y --no-install-recommends \
      fonts-liberation \
      "${audio_package}" \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo2 \
      libcups2 \
      libdrm2 \
      libgbm1 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
      xdg-utils \
    && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --no-cache-dir -e '.[browser]' \
    && python -m playwright install chromium

VOLUME ["/config", "/app/data", "/app/browser-profile"]
CMD ["campsite-watch", "--config", "/config/config.toml"]
