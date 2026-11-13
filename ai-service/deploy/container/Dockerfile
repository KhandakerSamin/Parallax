# Parallax AI service container (Azure Container Apps, Hugging Face Spaces or any Docker host).
# scripts/deploy_azure.py and scripts/deploy_space.py copy app/ and the corpus data next to this file.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface \
    PARALLAX_DATA_DIR=/home/user/app/data

# CPU-only PyTorch keeps the image small; then the rest of the dependencies.
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir "torch==2.5.1" --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r /tmp/requirements.txt

# Run as an unprivileged user (Hugging Face Spaces require uid 1000).
RUN useradd -m -u 1000 user
USER user
WORKDIR /home/user/app

# Bake the LaBSE model into the image so a restart doesn't download 1.8 GB.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/LaBSE')"

COPY --chown=user app ./app
COPY --chown=user data ./data

EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
