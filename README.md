<div align="center">

# 🔍 Parallax

### A Multi-Perspective Semantic & Structural Similarity Detection System for Bangla-English Academic Reuse

[![CI](https://github.com/KhandakerSamin/Parallax/actions/workflows/ci.yml/badge.svg)](https://github.com/KhandakerSamin/Parallax/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 📖 About

**Parallax** is a capstone project that detects academic text reuse across Bangla and English documents. Unlike simple plagiarism checkers, Parallax uses **multiple perspectives** — semantic embeddings, structural analysis, and cross-lingual similarity — to identify nuanced forms of academic reuse including paraphrasing, translation-based reuse, and structural copying.

### Key Features

- 🌐 **Cross-lingual Detection** — Compares Bangla and English academic texts using multilingual embeddings
- 🧠 **Semantic Similarity** — Goes beyond surface-level string matching using transformer-based models
- 📐 **Structural Analysis** — Detects reuse in document structure, citation patterns, and section organization
- 📄 **Document Processing** — Extracts and processes text from PDF and DOCX files
- ⚡ **Vector Search** — FAISS-powered fast approximate nearest neighbor search for scalable comparison

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  AI Service   │
│  (Next.js)   │◀────│  (FastAPI)   │◀────│  (FastAPI)    │
└─────────────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │
                    ┌──────┴───────┐      ┌──────┴───────┐
                    │  PostgreSQL  │      │    FAISS      │
                    │    + Redis   │      │  + Models     │
                    └──────────────┘      └──────────────┘
```

| Service | Tech Stack | Port |
|---|---|---|
| **Frontend** | Next.js, React | `3000` |
| **Backend API** | Python, FastAPI, SQLAlchemy | `8000` |
| **AI Service** | Python, FastAPI, sentence-transformers, FAISS | `8001` |
| **Database** | PostgreSQL 16 | `5432` |
| **Cache** | Redis 7 | `6379` |

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Python 3.11+](https://www.python.org/downloads/) (for local development)
- [Node.js 20+](https://nodejs.org/) (for frontend development)
- [Git](https://git-scm.com/)

### Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/KhandakerSamin/Parallax.git
cd Parallax

# 2. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 3. Start all services
docker compose up --build
```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/docs
- **AI Service:** http://localhost:8001/docs

### Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# AI Service
cd ai-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
Parallax/
├── ai-service/            # ML/NLP microservice
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── embeddings/    # Embedding generation & management
│   │   ├── evaluation/    # Similarity evaluation metrics
│   │   ├── extraction/    # Text extraction from documents
│   │   ├── models/        # ML model definitions & loading
│   │   ├── pipelines/     # End-to-end processing pipelines
│   │   ├── services/      # Business logic layer
│   │   └── similarity/    # Similarity computation engines
│   ├── notebooks/         # Jupyter notebooks for experiments
│   ├── tests/             # Unit & integration tests
│   ├── Dockerfile
│   └── requirements.txt
├── backend/               # REST API backend
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/              # Web application UI
│   └── Dockerfile
├── data/                  # Data directories (gitignored)
│   ├── raw/               # Original documents
│   ├── processed/         # Preprocessed text
│   ├── embeddings/        # Generated vector embeddings
│   └── metadata/          # Document metadata
├── docs/                  # Project documentation
├── .github/workflows/     # CI/CD pipelines
├── docker-compose.yml     # Multi-service orchestration
├── .env.example           # Environment variable template
└── .gitignore
```

---

## 🔀 Git Workflow

We follow a **feature-branch** workflow:

```
main ← develop ← feature-branches
```

1. Create a feature branch from `develop`
2. Make your changes and push
3. Open a Pull Request into `develop`
4. After review & CI passes, merge into `develop`
5. Periodically merge `develop` → `main` for releases

---

## 🧪 Testing

```bash
# Backend tests
cd backend && pytest -v

# AI Service tests
cd ai-service && pytest -v

# Frontend tests (when set up)
cd frontend && npm test
```

---

## 👥 Team

Built as a Capstone Project.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
