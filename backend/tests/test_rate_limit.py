"""The request limiter: per-key windows, retry times, and no over-counting under load."""

import threading

from app.core.rate_limit import RequestLimiter


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_requests_within_the_limit_go_ahead():
    limiter = RequestLimiter(max_attempts=3, window_seconds=60, clock=FakeClock())
    assert [limiter.hit("a") for _ in range(3)] == [0, 0, 0]


def test_the_next_request_waits_until_the_oldest_leaves_the_window():
    clock = FakeClock()
    limiter = RequestLimiter(max_attempts=2, window_seconds=60, clock=clock)
    limiter.hit("a")
    clock.now = 10
    limiter.hit("a")
    clock.now = 15
    assert limiter.hit("a") == 45
    clock.now = 60
    assert limiter.hit("a") == 0


def test_a_refused_request_does_not_count():
    clock = FakeClock()
    limiter = RequestLimiter(max_attempts=1, window_seconds=60, clock=clock)
    limiter.hit("a")
    for _ in range(5):
        assert limiter.hit("a") > 0
    clock.now = 60
    assert limiter.hit("a") == 0


def test_each_person_has_their_own_window():
    limiter = RequestLimiter(max_attempts=1, window_seconds=60, clock=FakeClock())
    assert limiter.hit("a") == 0
    assert limiter.hit("b") == 0
    assert limiter.hit("a") > 0


def test_simultaneous_requests_never_pass_the_limit():
    limiter = RequestLimiter(max_attempts=20, window_seconds=60)
    allowed = []
    start = threading.Barrier(50)

    def search() -> None:
        start.wait()
        if limiter.hit("a") == 0:
            allowed.append(1)

    threads = [threading.Thread(target=search) for _ in range(50)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(allowed) == 20
