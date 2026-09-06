FROM python:3.9-slim

WORKDIR /app

COPY backend/requirements.txt .

# Force pip layer cache bust when requirements change
ARG CACHE_BUST=1
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

# PORT=7860 for HF Spaces; Render injects $PORT automatically
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-7860}