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
# Versions figées par uv.lock (un « pip install . » tire les dernières versions
# compatibles : sqlmodel 0.0.48 refuse les datetimes naïfs du backend).
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv export --frozen --no-dev --no-emit-project -o /tmp/requirements.txt \
    && uv pip install --system -r /tmp/requirements.txt
COPY backend/ .
COPY --from=frontend /app/dist /app/static
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
