"""Shared test setup."""

import os

# Never load the real model and index in the background during tests.
os.environ.setdefault("AI_WARM_UP", "0")
