FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py llm_router.py bot.py ./
COPY extension/ extension/
COPY i18n/ i18n/
COPY i18n.js onboard.js demo.js app.html index.html demo.html pitch.html ./
COPY muse-demo.mp4 ./
COPY images/ images/
COPY skill/ skill/
COPY scripts/ scripts/

# Persistent volume mount point for muse.db
RUN mkdir -p /data
ENV MUSE_DB_PATH=/data/muse.db

EXPOSE 5200

CMD ["sh", "-c", "gunicorn -w 2 --threads 4 -b 0.0.0.0:${PORT:-5200} --timeout 120 --access-logfile - server:app"]
