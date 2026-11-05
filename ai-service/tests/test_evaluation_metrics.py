"""Tests for app.evaluation.metrics — precision, recall, F1, and classification."""

from __future__ import annotations

import pytest

from app.evaluation.metrics import classify_pair, f1_score, precision, recall


# ── precision ──────────────────────────────────────────────


class TestPrecision:
    def test_perfect(self):
        assert precision(10, 0) == 1.0

    def test_zero(self):
        assert precision(0, 10) == 0.0

    def test_mixed(self):
        assert precision(3, 7) == pytest.approx(0.3)

    def test_no_predictions(self):
        assert precision(0, 0) == 0.0


# ── recall ─────────────────────────────────────────────────


class TestRecall:
    def test_perfect(self):
        assert recall(10, 0) == 1.0

    def test_zero(self):
        assert recall(0, 10) == 0.0

    def test_mixed(self):
        assert recall(6, 4) == pytest.approx(0.6)

    def test_no_actual_positives(self):
        assert recall(0, 0) == 0.0


# ── f1_score ───────────────────────────────────────────────


class TestF1Score:
    def test_perfect(self):
        assert f1_score(10, 0, 0) == 1.0

    def test_zero_precision_and_recall(self):
        assert f1_score(0, 5, 5) == 0.0

    def test_balanced(self):
        # precision = 8/10 = 0.8, recall = 8/10 = 0.8
        # f1 = 2*0.8*0.8 / (0.8+0.8) = 0.8
        assert f1_score(8, 2, 2) == pytest.approx(0.8)

    def test_imbalanced(self):
        # precision = 1/11, recall = 1/2
        # f1 = 2 * (1/11) * (1/2) / ((1/11) + (1/2))
        expected_p = 1 / 11
        expected_r = 1 / 2
        expected_f1 = 2 * expected_p * expected_r / (expected_p + expected_r)
        assert f1_score(1, 10, 1) == pytest.approx(expected_f1)


# ── classify_pair ──────────────────────────────────────────


class TestClassifyPair:
    def test_above_threshold(self):
        assert classify_pair(0.7, threshold=0.5) is True

    def test_below_threshold(self):
        assert classify_pair(0.3, threshold=0.5) is False

    def test_exactly_at_threshold(self):
        assert classify_pair(0.5, threshold=0.5) is True

    def test_custom_threshold(self):
        assert classify_pair(0.8, threshold=0.9) is False
        assert classify_pair(0.95, threshold=0.9) is True

    def test_invalid_threshold_zero(self):
        with pytest.raises(ValueError, match="threshold must be in"):
            classify_pair(0.5, threshold=0.0)

    def test_invalid_threshold_negative(self):
        with pytest.raises(ValueError):
            classify_pair(0.5, threshold=-0.1)

    def test_threshold_one_is_valid(self):
        assert classify_pair(1.0, threshold=1.0) is True
        assert classify_pair(0.99, threshold=1.0) is False
