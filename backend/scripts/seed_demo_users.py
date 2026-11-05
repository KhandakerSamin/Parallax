"""Create the demo accounts used in class demos and the frontend README.

    python -m scripts.seed_demo_users            # uses DEMO_PASSWORD or Parallax#2026
    python -m scripts.seed_demo_users --reset    # also resets their passwords

Refuses to run when APP_ENV=production.
"""

import argparse
import os
import sys

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, User

DEMO_USERS = (
    {
        "name": "Demo Student",
        "email": "student@diu.edu.bd",
        "university_id": "221-35-001",
        "role": Role.student,
        "department": "Software Engineering",
    },
    {
        "name": "Demo Reviewer",
        "email": "reviewer@diu.edu.bd",
        "university_id": "STAFF-0042",
        "role": Role.reviewer,
        "department": "Software Engineering",
    },
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="reset passwords of existing demo users")
    args = parser.parse_args()

    if get_settings().app_env == "production":
        print("Refusing to create demo accounts with APP_ENV=production.", file=sys.stderr)
        return 1

    password = os.environ.get("DEMO_PASSWORD", "Parallax#2026")
    with SessionLocal() as db:
        for data in DEMO_USERS:
            user = db.scalar(select(User).where(User.email == data["email"]))
            if user is None:
                db.add(User(**data, password_hash=hash_password(password)))
                print(f"created  {data['email']} / {data['university_id']}")
            elif args.reset:
                user.password_hash = hash_password(password)
                print(f"reset    {data['email']}")
            else:
                print(f"exists   {data['email']}")
        db.commit()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
