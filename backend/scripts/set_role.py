"""Change the role of an existing account, e.g. make yourself the first super admin.

    python -m scripts.set_role --email samin@diu.edu.bd --role super_admin

Admins can change roles from the admin page, but only a super admin can create
admins, and someone has to be the first one: this script is for that.
"""

import argparse
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Role, User


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", required=True, choices=[r.value for r in Role])
    args = parser.parse_args()

    email = args.email.strip().lower()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            print(f"No account uses {email}. Sign in on the website once first.", file=sys.stderr)
            return 1
        before = user.role.value if isinstance(user.role, Role) else str(user.role)
        user.role = Role(args.role)
        user.is_active = True
        db.commit()
    print(f"{email}: {before} -> {args.role}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
