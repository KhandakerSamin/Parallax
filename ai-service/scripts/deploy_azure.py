"""Deploy the AI service to Azure App Service (Linux, Python). Works on Azure for Students.

    python scripts/deploy_azure.py                  # create on first run, update afterwards
    python scripts/deploy_azure.py --name my-name   # the app name must be unique across Azure
    python scripts/deploy_azure.py --dry-run

Needs the Azure CLI, signed in (`az login`).

Why App Service: Azure for Students blocks cloud image builds (ACR Tasks), so Container
Apps would need Docker on this PC. App Service builds a Python app from a zip itself.

The script:
1. Assembles app/, the corpus data and a requirements file with CPU-only PyTorch, and zips it.
2. Creates the resource group, a Linux B2 plan (2 CPUs, 3.5 GB: LaBSE and the index need
   about 3 GB; roughly US$26 a month from the student credit) and the web app, on first run.
3. Sets the settings, including AI_SHARED_SECRET (from ai-service/.env.space.local,
   git-ignored, never printed), and deploys the zip. App Service installs the requirements.

The first start downloads the LaBSE model (1.8 GB) into persistent storage, so the first
analysis after a deploy waits a few minutes; later restarts reuse it.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from deploy_space import ORIGINS, REPO_ROOT, ROOT, SECRET_FILE, shared_secret, stage  # noqa: E402

DEFAULT_AZ = Path("C:/Program Files/Microsoft SDKs/Azure/CLI2/wbin/az.cmd")  # winget's install path
STARTUP = "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
LIVE_WAIT_SECONDS = 30 * 60


def live_passages(url: str) -> int | None:
    """Passages the running service reports, or None while it is down or starting."""
    try:
        with urllib.request.urlopen(f"{url}/health", timeout=30) as response:
            return json.load(response).get("corpus", {}).get("passages")
    except (OSError, ValueError):
        return None


def wait_until_live(url: str, expected: int) -> bool:
    """Poll /health until the service serves the new index (az's own wait can hang for good)."""
    deadline = time.time() + LIVE_WAIT_SECONDS
    while time.time() < deadline:
        passages = live_passages(url)
        print(f"  {time.strftime('%H:%M')}  live service: {passages if passages is not None else 'starting'} passages")
        if passages == expected:
            return True
        time.sleep(60)
    return False


def az(*args: str, capture: bool = False, secret: str | None = None, check: bool = True) -> str:
    """Run an Azure CLI command; `secret` is hidden when the command is echoed."""
    exe = shutil.which("az") or shutil.which("az.cmd") or (str(DEFAULT_AZ) if DEFAULT_AZ.exists() else None)
    if exe is None:
        sys.exit("The Azure CLI is not installed. Run: winget install -e --id Microsoft.AzureCLI")
    shown = " ".join(args).replace(secret, "***") if secret else " ".join(args)
    print(f"$ az {shown}", flush=True)
    result = subprocess.run([exe, *args], text=True, capture_output=capture)
    if check and result.returncode != 0:
        if capture and result.stderr:
            print(result.stderr.strip())
        sys.exit(f"az {' '.join(args[:2])} failed (exit {result.returncode})")
    return (result.stdout or "").strip() if result.returncode == 0 else ""


def build_zip(workdir: Path) -> Path:
    """The app, data and requirements as one zip, ready for `az webapp deploy`."""
    target = workdir / "site"
    target.mkdir()
    stage(target)
    for name in ("Dockerfile", "README.md"):
        (target / name).unlink(missing_ok=True)  # container-only files
    requirements = (ROOT / "deploy" / "container" / "requirements.txt").read_text(encoding="utf-8")
    (target / "requirements.txt").write_text(
        "# CPU-only PyTorch: the GPU build is several GB larger and unused here.\n"
        "--extra-index-url https://download.pytorch.org/whl/cpu\n"
        "torch==2.5.1+cpu\n" + requirements,
        encoding="utf-8",
    )
    return Path(shutil.make_archive(str(workdir / "site"), "zip", target))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--name", default="parallax-ai-diu", help="web app name (unique across Azure)")
    parser.add_argument("--group", default="parallax-rg", help="resource group")
    parser.add_argument("--location", default="eastasia", help="Azure region (Azure for Students allows only some)")
    parser.add_argument("--sku", default="B2", help="App Service plan size")
    parser.add_argument("--dry-run", action="store_true", help="build the zip and stop")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="parallax-azure-") as tmp:
        package = build_zip(Path(tmp))
        print(f"Built {package.name}: {package.stat().st_size / 1e6:.0f} MB")
        if args.dry_run:
            return 0

        print(f"Subscription: {az('account', 'show', '--query', 'name', '-o', 'tsv', capture=True)}")
        az("provider", "register", "--namespace", "Microsoft.Web", "--wait", "--only-show-errors")
        az("group", "create", "-n", args.group, "-l", args.location, "--only-show-errors", "-o", "none")

        plan = f"{args.name}-plan"
        if not az("appservice", "plan", "show", "-n", plan, "-g", args.group, "-o", "tsv", capture=True, check=False):
            az(
                "appservice", "plan", "create", "-n", plan, "-g", args.group, "-l", args.location,
                "--is-linux", "--sku", args.sku, "--only-show-errors", "-o", "none",
            )  # fmt: skip
        if not az("webapp", "show", "-n", args.name, "-g", args.group, "-o", "tsv", capture=True, check=False):
            az(
                "webapp", "create", "-n", args.name, "-g", args.group, "-p", plan,
                "--runtime", "PYTHON:3.11", "--only-show-errors", "-o", "none",
            )  # fmt: skip

        secret = shared_secret()
        az(
            "webapp", "config", "appsettings", "set", "-n", args.name, "-g", args.group, "--settings",
            "SCM_DO_BUILD_DURING_DEPLOYMENT=true",
            f"AI_SHARED_SECRET={secret}",
            f"AI_ALLOWED_ORIGINS={ORIGINS}",
            "PARALLAX_DATA_DIR=data",  # relative: App Service runs the build from a temporary folder
            "HF_HOME=/home/hf-cache",  # persistent: the model is downloaded once
            "WEBSITES_CONTAINER_START_TIME_LIMIT=1800",
            "--only-show-errors", "-o", "none",
            secret=secret,
        )  # fmt: skip
        az(
            "webapp", "config", "set", "-n", args.name, "-g", args.group,
            "--startup-file", STARTUP, "--always-on", "true", "--only-show-errors", "-o", "none",
        )  # fmt: skip
        # --async: return once the zip is uploaded. Azure then installs and restarts by itself,
        # and its status report sometimes never arrives, which left `az` waiting forever.
        az(
            "webapp", "deploy", "-n", args.name, "-g", args.group, "--src-path", str(package),
            "--type", "zip", "--async", "true", "--only-show-errors", "-o", "none",
        )  # fmt: skip

    url = f"https://{args.name}.azurewebsites.net"
    manifest = json.loads((REPO_ROOT / "data" / "embeddings" / "manifest.json").read_text(encoding="utf-8"))
    print(f"\nUploaded. Waiting for {url} to serve {manifest['passages']:,} passages (checked every minute)...")
    if not wait_until_live(url, manifest["passages"]):
        print(f"The service did not report the new index within 30 minutes. Check it later: {url}/health")
        return 1
    print(f"\nDeployed: {url}")
    print(f"Check it: {url}/health  (the first start downloads the model; allow a few minutes)")
    print("Backend settings to add (Vercel project parallax-diu-api, production):")
    print(f"  AI_SERVICE_URL={url}")
    print(f"  AI_PUBLIC_URL={url}")
    print(f"  AI_SHARED_SECRET=<the value in {SECRET_FILE.relative_to(REPO_ROOT)}>")
    return 0


if __name__ == "__main__":
    sys.exit(main())
