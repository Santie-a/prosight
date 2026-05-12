FROM pytorch/pytorch:2.4.1-cuda12.1-cudnn9-runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 1. Dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx libglib2.0-0 ffmpeg espeak-ng curl \
    && rm -rf /var/lib/apt/lists/*

# 2. Instalación de librerías (Pip)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 3. Configuración de Rutas de IA
ENV HF_HOME=/app/ml_models/huggingface
RUN mkdir -p $HF_HOME

# 4. PRE-DOWNLOAD DE MODELOS (Moondream + Kokoro)
# Al estar antes del COPY . ., esta capa se guarda en caché y no se repite si cambias tu código
RUN python -c "from huggingface_hub import snapshot_download; \
    snapshot_download(repo_id='vikhyatk/moondream2', revision='2024-08-26'); \
    snapshot_download(repo_id='hexgrad/Kokoro-82M')"

# 5. Copiar el código del backend (Ahora al final)
COPY . .

# 6. Configuración de Lanzamiento
ENV APP_HOST=0.0.0.0
ENV APP_PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host $APP_HOST --port $APP_PORT"]