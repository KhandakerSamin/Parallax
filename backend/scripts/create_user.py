"""Create an account with any role, e.g. the first admin (self sign-up only allows student/reviewer).

    python -m scripts.create_user --name "Samin" --email samin@diu.edu.bd \
        --university-id 221-35-900 --role admin --department "Software Engineering"

The password is prompted for (or read from NEW_USER_PASSWORD) and checked
against the same rules as sign-up.
"""

import argparse
import getpass
import os
import sys

from sqlalchemy import or_, select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, User
from app.schemas.auth import DEPARTMENTS, check_password_rules, normalise_university_id


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--university-id", required=True)
    parser.add_argument("--role", required=True, choices=[r.value for r in Role])
    parser.add_argument("--department", default="Software Engineering", choices=DEPARTMENTS)
    args = parser.parse_args()

    try:
        university_id = normalise_university_id(args.university_id)
        password = os.environ.get("NEW_USER_PASSWORD") or getpass.getpass("Password: ")
        check_password_rules(password)
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 1

    email = args.email.strip().lower()
    with SessionLocal() as db:
        if db.scalar(select(User.id).where(or_(User.email == email, User.university_id == university_id))):
            print("An account with this email or ID already exists.", file=sys.stderr)
            return 1
        db.add(
            User(
                name=args.name.strip(),
                email=email,
                university_id=university_id,
                role=Role(args.role),
                department=args.department,
                password_hash=hash_password(password),
            )
        )
        db.commit()
    print(f"Created {args.role} {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
