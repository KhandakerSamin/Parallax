"""Delete an account and everything it owns (its reports and sign-in sessions).

    python -m scripts.delete_user --id TEST-7813            # shows what would be deleted
    python -m scripts.delete_user --id TEST-7813 --yes      # deletes it
    python -m scripts.delete_user --email someone@diu.edu.bd --yes

For removing test and demo accounts. Admins can deactivate people from the admin
page, which keeps their reports; this removes the account for good, so it asks for
--yes and never deletes the last active super admin. Decisions this person made as
a reviewer stay on the reports, without their name.
"""

import argparse
import sys

from sqlalchemy import func, select, update

from app.db.session import SessionLocal
from app.models import Report, Role, User


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    who = parser.add_mutually_exclusive_group(required=True)
    who.add_argument("--email")
    who.add_argument("--id", help="student or staff ID")
    parser.add_argument("--yes", action="store_true", help="really delete (otherwise only show)")
    args = parser.parse_args(argv)

    with SessionLocal() as db:
        if args.email:
            user = db.scalar(select(User).where(User.email == args.email.strip().lower()))
        else:
            user = db.scalar(select(User).where(User.university_id == args.id.strip().upper()))
        if user is None:
            print("No account matches. Nothing was deleted.", file=sys.stderr)
            return 1

        reports = db.scalar(select(func.count()).select_from(Report).where(Report.user_id == user.id)) or 0
        role = user.role.value if isinstance(user.role, Role) else str(user.role)
        print(f"{user.name} <{user.email}> ({user.university_id}, {role}): {reports} report(s)")

        if user.role == Role.super_admin and user.is_active:
            others = db.scalar(
                select(func.count())
                .select_from(User)
                .where(User.role == Role.super_admin, User.is_active, User.id != user.id)
            )
            if not others:
                print("This is the last active super admin. Make someone else one first.", file=sys.stderr)
                return 1

        if not args.yes:
            print("Nothing deleted. Run again with --yes to delete this account and its reports.")
            return 0

        # Keep other people's reports and their review decisions; only the reviewer's name goes.
        db.execute(update(Report).where(Report.reviewed_by_id == user.id).values(reviewed_by_id=None))
        db.delete(user)  # its reports and sessions go with it
        db.commit()
    print("Deleted.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
