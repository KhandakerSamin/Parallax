"""Evaluation metrics for measuring similarity detection quality.

Provides precision, recall, F1, and a simple threshold-based
binary classifier used to evaluate the overall pipeline accuracy.
"""

from __future__ import annotations


def precision(true_positives: int, false_positives: int) -> float:
    """Compute precision = TP / (TP + FP).

    Args:
        true_positives: Number of correctly identified reuse pairs.
        false_positives: Number of incorrectly flagged pairs.

    Returns:
        Precision in [0.0, 1.0]. Returns 0.0 when denominator is zero.
    """
    denom = true_positives + false_positives
    return true_positives / denom if denom > 0 else 0.0


def recall(true_positives: int, false_negatives: int) -> float:
    """Compute recall = TP / (TP + FN).

    Args:
        true_positives: Number of correctly identified reuse pairs.
        false_negatives: Number of missed reuse pairs.

    Returns:
        Recall in [0.0, 1.0]. Returns 0.0 when denominator is zero.
    """
    denom = true_positives + false_negatives
    return true_positives / denom if denom > 0 else 0.0


def f1_score(true_positives: int, false_positives: int, false_negatives: int) -> float:
    """Compute F1 score as the harmonic mean of precision and recall.

    Args:
        true_positives: Number of correctly identified reuse pairs.
        false_positives: Number of incorrectly flagged pairs.
        false_negatives: Number of missed reuse pairs.

    Returns:
        F1 in [0.0, 1.0]. Returns 0.0 when precision + recall is zero.
    """
    p = precision(true_positives, false_positives)
    r = recall(true_positives, false_negatives)
    return 2 * p * r / (p + r) if (p + r) > 0 else 0.0


def classify_pair(score: float, threshold: float = 0.5) -> bool:
    """Classify a similarity score as reuse or not.

    Args:
        score: Similarity score (0.0–1.0).
        threshold: Decision boundary.

    Returns:
        ``True`` if *score* >= *threshold* (i.e., flagged as reuse).

    Raises:
        ValueError: If *threshold* is not in (0, 1].
    """
    if not (0 < threshold <= 1):
        raise ValueError(f"threshold must be in (0, 1], got {threshold}")
    return score >= threshold
