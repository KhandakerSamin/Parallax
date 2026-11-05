"""Sliding-window limiter for failed sign-ins.

In-process only: fine for one API instance. With several instances, move the
counters to Redis (already in docker-compose) behind the same interface.
"""

import math
import threading
import time
from collections import defaultdict, deque


class FailedLoginLimiter:
    def __init__(self, max_attempts: int, window_seconds: float, clock=time.monotonic) -> None:
        self.max_attempts = max_attempts
        self.window = window_seconds
        self._clock = clock
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        attempts = self._failures[key]
        while attempts and now - attempts[0] >= self.window:
            attempts.popleft()
        if not attempts:
            self._failures.pop(key, None)
        return attempts

    def retry_after(self, key: str) -> int:
        """Seconds until this key may try again; 0 when it is not blocked."""
        with self._lock:
            now = self._clock()
            attempts = self._prune(key, now)
            if len(attempts) < self.max_attempts:
                return 0
            return max(1, math.ceil(self.window - (now - attempts[0])))

    def record_failure(self, key: str) -> None:
        with self._lock:
            now = self._clock()
            self._prune(key, now)
            self._failures[key].append(now)

    def reset(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._failures.clear()
            else:
                self._failures.pop(key, None)
