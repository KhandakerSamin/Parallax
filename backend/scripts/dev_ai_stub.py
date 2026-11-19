"""A stand-in for the AI service, for trying the whole PDF flow on localhost.

The real AI service (LaBSE + the corpus index) is heavy, and the deployed one only accepts
uploads from the live website. This stub answers the same three calls the browser makes:

    POST /jobs        accept the PDF, start a job (queued, then running)
    GET  /jobs/{id}   report progress, then a finished, signed result
    GET  /health

It does not analyse the PDF. It waits like the real service would and returns a fixed
result, signed for the uploading user with the shared secret, so the backend saves it as a
real report. Run it next to the backend:

    python -m scripts.dev_ai_stub                         # port 8001, about 75 s per job
    python -m scripts.dev_ai_stub --seconds 20            # a quicker wait
    python -m scripts.dev_ai_stub --result my-job.json    # return a result you saved

The backend's AI_SERVICE_URL (default http://localhost:8001) and AI_SHARED_SECRET must match
this process. Refuses to run when APP_ENV=production.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.signing import sign, unsign
from app.services.analysis import RESULT_PURPOSE, TICKET_PURPOSE, result_digest

QUEUED_SECONDS = 6

# A small, realistic result: one source with a copied paragraph as evidence.
SAMPLE_RESULT: dict[str, Any] = {
    "document": {"id": "submission", "title": None, "words": 640, "passages": 9, "language": "en", "flags": []},
    "summary": {
        "overall": 0.21,
        "lexical_coverage": 0.21,
        "semantic_coverage": 0.21,
        "level": "moderate",
        "hybrid": 0.3,
    },
    "matches": [
        {
            "source": {
                "id": "8053",
                "title": "Restaurant Management System",
                "authors": [],
                "year": "2021",
                "type": "Other",
                "url": "https://dspace.daffodilvarsity.edu.bd/handle/123456789/8053",
            },
            "overall": 0.21,
            "hybrid": 0.3,
            "scores": {"lexical": 0.21, "semantic": 0.21, "concept": 0.4, "structural": 0.0},
            "evidence": [
                {
                    "perspective": "lexical",
                    "score": 0.94,
                    "submitted": {
                        "text": "The major goal of creating this system is to assist restaurant managers in running "
                        "their businesses and to assist customers with online ordering and table reservations.",
                        "section": "Background",
                    },
                    "source": {
                        "text": "The major goal of creating this system is to assist restaurant managers in running "
                        "their businesses and to assist customers with online ordering and table reservations.",
                        "section": "Background",
                    },
                }
            ],
            "shared_terms": ["restaurant management", "table reservations"],
            "shared_headings": [],
        }
    ],
    "corpus": {"documents": 1925, "passages": 209386},
    "weights": {"lexical": 0.2, "semantic": 0.35, "concept": 0.25, "structural": 0.2},
    "notes": ["Result from the local AI stand-in (scripts/dev_ai_stub.py), not a real analysis."],
}


def create_app(result: dict[str, Any], seconds: float, secret: str):
    app = FastAPI(title="Parallax AI stand-in")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3100"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    jobs: dict[str, dict[str, Any]] = {}

    def user_from(ticket: str | None) -> str:
        payload = unsign(ticket, purpose=TICKET_PURPOSE, key=secret)
        if not payload:
            raise HTTPException(401, "Your upload pass expired. Please try again.")
        return str(payload["sub"])

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "mode": "stand-in"}

    @app.post("/jobs")
    async def create(request: Request, x_parallax_ticket: str | None = Header(None)) -> dict[str, Any]:
        user = user_from(x_parallax_ticket)
        await request.body()  # read and drop the upload
        job_id = uuid.uuid4().hex
        jobs[job_id] = {"user": user, "started": time.time()}
        return {"id": job_id, "status": "queued", "position": 1}

    @app.get("/jobs/{job_id}")
    def status(job_id: str, x_parallax_ticket: str | None = Header(None)) -> dict[str, Any]:
        user_from(x_parallax_ticket)
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(404, "Job not found.")
        age = time.time() - job["started"]
        if age < min(QUEUED_SECONDS, seconds / 3):
            return {"id": job_id, "status": "queued", "position": 1}
        if age < seconds:
            return {"id": job_id, "status": "running"}
        signature = sign(
            {"sub": job["user"], "sha": result_digest(result)},
            purpose=RESULT_PURPOSE,
            max_age_seconds=3600,
            key=secret,
        )
        return {"id": job_id, "status": "done", "result": {**result, "signature": signature}}

    return app


def load_result(path: str | None) -> dict[str, Any]:
    if not path:
        return SAMPLE_RESULT
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    result = data.get("result", data)  # a saved job response or a bare result
    result.pop("signature", None)
    result.pop("report_id", None)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--seconds", type=float, default=75, help="how long each job takes")
    parser.add_argument("--result", help="a saved AI job response or result JSON to return")
    args = parser.parse_args()

    settings = get_settings()
    if settings.app_env == "production":
        sys.exit("Refusing to run the AI stand-in with APP_ENV=production.")

    app = create_app(load_result(args.result), args.seconds, settings.ai_shared_secret)
    uvicorn.run(app, host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
