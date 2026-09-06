FROM python:3.9-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

# Use shell form so $PORT env variable (injected by Render) is expanded at runtime
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}