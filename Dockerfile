FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml README.md /app/
COPY src /app/src

RUN python -m pip install --no-cache-dir -e '.[browser]' \
    && python -m playwright install --with-deps chromium

VOLUME ["/config", "/app/data", "/app/browser-profile"]
CMD ["campsite-watch", "--config", "/config/config.toml"]
