"""Background analysis jobs.

A full report can take minutes on a small cloud CPU, longer than hosting
platforms keep a request open. So a PDF is accepted at once as a job, analysed
on a background worker, and the browser checks back until the result is ready.

Jobs live in memory on the single instance that serves the AI service: they are
short-lived (an hour) and a restart only loses analyses in progress. One worker
runs at a time, so two large reports never compete for the model and memory.
"""

from __future__ import annotations

import threading
import time
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any, Literal

JOB_TTL_SECONDS = 60 * 60
MAX_JOBS = 200

Status = Literal["queued", "running", "done", "failed"]


@dataclass
class Job:
    id: str
    owner: str
    status: Status = "queued"
    result: dict[str, Any] | None = None
    error: str | None = None
    error_status: int | None = None
    created: float = field(default_factory=time.time)

    def public(self, position: int | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {"id": self.id, "status": self.status}
        if position is not None:
            body["position"] = position
        if self.status == "done":
            body["result"] = self.result
        if self.status == "failed":
            body["error"] = self.error
            body["error_status"] = self.error_status
        return body


class JobFailedError(Exception):
    """Raised by a job's work to fail it with a message and an HTTP-like status."""

    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


class JobQueue:
    def __init__(self, workers: int = 1) -> None:
        self._jobs: dict[str, Job] = {}
        self._order: list[str] = []
        self._lock = threading.Lock()
        self._pool = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="analysis")

    def submit(self, owner: str, work: Callable[[], dict[str, Any]]) -> Job:
        job = Job(id=uuid.uuid4().hex, owner=owner)
        with self._lock:
            self._prune()
            self._jobs[job.id] = job
            self._order.append(job.id)
        self._pool.submit(self._run, job, work)
        return job

    def get(self, job_id: str, owner: str) -> Job | None:
        """The job, only for the caller who started it."""
        with self._lock:
            job = self._jobs.get(job_id)
        return job if job is not None and job.owner == owner else None

    def position(self, job: Job) -> int | None:
        """How many jobs are ahead of a queued one (0 = next)."""
        if job.status != "queued":
            return None
        with self._lock:
            waiting = [j for j in self._order if self._jobs[j].status in ("queued", "running")]
        return waiting.index(job.id) if job.id in waiting else None

    def _run(self, job: Job, work: Callable[[], dict[str, Any]]) -> None:
        job.status = "running"
        try:
            job.result = work()
            job.status = "done"
        except JobFailedError as exc:
            job.error, job.error_status, job.status = exc.message, exc.status, "failed"
        except Exception:  # noqa: BLE001 - reported to the user, not swallowed silently
            job.error, job.error_status, job.status = "The analysis failed. Please try again.", 500, "failed"

    def _prune(self) -> None:
        cutoff = time.time() - JOB_TTL_SECONDS
        keep = [j for j in self._order if self._jobs[j].created >= cutoff or self._jobs[j].status == "running"]
        keep = keep[-MAX_JOBS:]
        for job_id in set(self._order) - set(keep):
            self._jobs.pop(job_id, None)
        self._order = keep


queue = JobQueue()
