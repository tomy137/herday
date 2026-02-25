# Stage 1 : build frontend
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2 : backend + fichiers statiques
FROM python:3.12-slim
WORKDIR /app
RUN pip install uv
COPY backend/pyproject.toml ./
RUN uv pip install --system .
COPY backend/ .
COPY --from=frontend /app/dist /app/static
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
