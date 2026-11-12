"""Saving and finding a user's similarity reports."""

from __future__ import annotations

from typing import Any

from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models import REVIEWER_ROLES, Report, User

REVIEW_STATUSES = ("pending", "cleared", "follow_up")


def is_reviewer(user: User) -> bool:
    return user.role in REVIEWER_ROLES


def _number(value: Any) -> float:
    return float(value) if isinstance(value, int | float) else 0.0


def save_report(db: Session, user: User, result: dict[str, Any], *, source_kind: str, source_name: str) -> Report:
    """Store an AI service result and the summary fields used for listing."""
    summary = result.get("summary") or {}
    document = result.get("document") or {}
    matches = result.get("matches") or []
    top = (matches[0].get("source") or {}).get("title") if matches else None
    report = Report(
        user_id=user.id,
        title=(document.get("title") or source_name or "Untitled report")[:300],
        source_kind=source_kind,
        source_name=source_name[:300],
        overall=_number(summary.get("overall")),
        hybrid=_number(summary.get("hybrid")),
        level=str(summary.get("level") or "low")[:10],
        words=int(document.get("words") or 0),
        match_count=len(matches),
        top_source_title=top[:500] if isinstance(top, str) else None,
        result=result,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def list_reports(db: Session, user: User, *, limit: int = 50) -> list[Report]:
    """The user's reports, newest first."""
    query = select(Report).where(Report.user_id == user.id).order_by(Report.created_at.desc()).limit(limit)
    return list(db.scalars(query))


def get_report(db: Session, user: User, report_id: str) -> Report | None:
    """A report the user may see: their own, or any report for a reviewer. Otherwise None."""
    report = db.get(Report, report_id)
    if report is None:
        return None
    return report if report.user_id == user.id or is_reviewer(user) else None


def own_report(db: Session, user: User, report_id: str) -> Report | None:
    """Only the user's own report (for deleting)."""
    report = db.get(Report, report_id)
    return report if report is not None and report.user_id == user.id else None


def review_queue(db: Session, *, status: str | None = None, level: str | None = None, limit: int = 100) -> list[Report]:
    """Every user's reports for reviewers: undecided first, then the most similar, then newest."""
    query = select(Report)
    if status:
        query = query.where(Report.review_status == status)
    if level:
        query = query.where(Report.level == level)
    undecided_first = case((Report.review_status == "pending", 0), else_=1)
    query = query.order_by(undecided_first, Report.overall.desc(), Report.created_at.desc()).limit(limit)
    return list(db.scalars(query))


def record_review(db: Session, report: Report, reviewer: User, status: str, note: str | None) -> Report:
    report.review_status = status
    report.review_note = (note or "").strip() or None
    report.reviewed_by_id = reviewer.id if status != "pending" else None
    report.reviewed_at = utcnow() if status != "pending" else None
    db.commit()
    db.refresh(report)
    return report


def delete_report(db: Session, report: Report) -> None:
    db.delete(report)
    db.commit()
