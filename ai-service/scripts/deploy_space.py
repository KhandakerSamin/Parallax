"""Publish the AI service to a Hugging Face Space (Docker; needs a PRO plan since 2026).

    python scripts/deploy_space.py                       # khandakersamin/parallax-ai
    python scripts/deploy_space.py --repo you/parallax-ai --dry-run

Needs `hf auth login` first. The script:

1. Assembles the Space: deploy/container/{Dockerfile,requirements.txt}, the card in
   deploy/huggingface/README.md, app/,
   and the corpus data the engine loads (data/processed/*.json and data/embeddings/).
2. Creates the Space if needed and uploads it. Hugging Face then builds the image.
3. Sets AI_SHARED_SECRET (a Space secret) and AI_ALLOWED_ORIGINS (a variable).

The shared secret is generated once and kept in ai-service/.env.space.local, which
git ignores. The backend needs the same value (AI_SHARED_SECRET), plus
AI_SERVICE_URL and AI_PUBLIC_URL set to the Space's URL. The script never prints
the secret.
"""

from __future__ import annotations

import argparse
import json
import secrets
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
SECRET_FILE = ROOT / ".env.space.local"
ORIGINS = "https://parallax-diu.vercel.app,http://localhost:3000"


def shared_secret() -> str:
    """The deployment's shared secret, created on first use and reused afterwards."""
    if SECRET_FILE.exists():
        for line in SECRET_FILE.read_text(encoding="utf-8").splitlines():
            if line.startswith("AI_SHARED_SECRET="):
                return line.split("=", 1)[1].strip()
    value = secrets.token_urlsafe(48)
    SECRET_FILE.write_text(
        "# Shared by the AI Space and the backend. Git-ignored: never commit or paste it anywhere.\n"
        f"AI_SHARED_SECRET={value}\n",
        encoding="utf-8",
    )
    return value


def stage(target: Path) -> int:
    """Copy everything the Space needs into `target`; returns the number of files."""
    for name in ("Dockerfile", "requirements.txt"):
        shutil.copy2(ROOT / "deploy" / "container" / name, target / name)
    shutil.copy2(ROOT / "deploy" / "huggingface" / "README.md", target / "README.md")  # the Space's card
    shutil.copytree(ROOT / "app", target / "app", ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))

    data = REPO_ROOT / "data"
    (target / "data" / "processed").mkdir(parents=True)
    duplicates_file = data / "processed" / "_duplicates.json"
    copies = set(json.loads(duplicates_file.read_text(encoding="utf-8"))) if duplicates_file.exists() else set()
    for path in (data / "processed").glob("*.json"):
        if path.name == "_scan.json" or path.stem in copies:  # calibration output; repository duplicates
            continue
        shutil.copy2(path, target / "data" / "processed" / path.name)
    shutil.copytree(data / "embeddings", target / "data" / "embeddings")
    return sum(1 for p in target.rglob("*") if p.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default="khandakersamin/parallax-ai", help="the Space, as user/name")
    parser.add_argument("--dry-run", action="store_true", help="assemble and list the files, upload nothing")
    args = parser.parse_args()

    if not (REPO_ROOT / "data" / "embeddings" / "manifest.json").exists():
        print("No index in data/embeddings. Run scripts/build_index.py first.")
        return 1

    with tempfile.TemporaryDirectory(prefix="parallax-space-") as tmp:
        target = Path(tmp)
        count = stage(target)
        size = sum(p.stat().st_size for p in target.rglob("*") if p.is_file()) / 1e6
        print(f"Assembled {count} files ({size:.0f} MB) for {args.repo}")
        if args.dry_run:
            for path in sorted(target.iterdir()):
                print(" ", path.name)
            return 0

        from huggingface_hub import HfApi

        api = HfApi()
        api.create_repo(args.repo, repo_type="space", space_sdk="docker", exist_ok=True)
        api.add_space_secret(args.repo, "AI_SHARED_SECRET", shared_secret())
        api.add_space_variable(args.repo, "AI_ALLOWED_ORIGINS", ORIGINS)
        api.upload_folder(
            repo_id=args.repo,
            repo_type="space",
            folder_path=str(target),
            commit_message="Deploy the Parallax AI service",
            delete_patterns=["app/**", "data/**"],  # drop files removed since the last deploy
        )

    user, name = args.repo.split("/")
    print(f"Uploaded. Build progress: https://huggingface.co/spaces/{args.repo}")
    print(f"Service URL once built:   https://{user}-{name.replace('_', '-')}.hf.space")
    print(f"Shared secret saved in {SECRET_FILE.relative_to(REPO_ROOT)} (not printed).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
