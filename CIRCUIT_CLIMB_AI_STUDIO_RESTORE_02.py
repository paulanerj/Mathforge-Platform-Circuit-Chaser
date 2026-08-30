#!/usr/bin/env python3
"""
CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py

Restores the frozen Circuit Climb successor workspace (SOT-02) into a NEW
empty directory. Standard library only; no network, no GitHub, no knowledge of
the conversation that produced the code.

    python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py \\
        --payload circuit-climb-successor-02-payload.b64 \\
        ./circuit-climb-restored

Then:

    cd ./circuit-climb-restored
    npm install
    npm run lint
    npm test
    npm run build
    npm run test:circuit-climb:browser

It refuses to write into a directory that already has contents, rejects any
archive member that escapes the target, verifies the payload against a recorded
SHA-256, and checks every sentinel file after extraction. It never creates a
file the payload did not contain.
"""

import argparse
import base64
import binascii
import hashlib
import io
import sys
import tarfile
from pathlib import Path

# Filled in by the packaging step. "" disables that particular check.
EXPECTED_B64_SHA256 = "3ba6dd6d6660afa4c1d6efaac0f9866e0789e07c635a6ce2e8bba3e067fa85be"
EXPECTED_TAR_SHA256 = "600448477583696901c9ee0c969c5e0ba304facf7e8ff2d40bf36c5f2aac92f9"
EXPECTED_FILE_COUNT = 195

# Every one of these must exist after extraction or the restore is a failure.
SENTINELS = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "index.html",
    "src/games/circuit-climb/docs/CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_02.md",
    "src/games/circuit-climb/docs/CIRCUIT_CLIMB_BROWSER_SMOKE.md",
    "src/games/circuit-climb/geometry/circuitClimbGeometry.ts",
    "src/games/circuit-climb/runtime/circuitClimbLearnerRouting.ts",
    "src/games/circuit-climb/runtime/circuitClimbRuntimeRules.ts",
    "src/games/circuit-climb/runtime/useCircuitClimbPrototypeRuntime.ts",
    "src/games/circuit-climb/pursuer/circuitClimbPursuer.ts",
    "src/games/circuit-climb/pursuer/circuitClimbPursuerTuning.ts",
    "src/games/circuit-climb/pursuer/circuitClimbPursuerTrace.ts",
    "src/games/circuit-climb/tests/circuitClimbLockedCapabilities.test.ts",
    "src/games/circuit-climb/tests/circuitClimbWorldFraming.test.ts",
    "src/games/circuit-climb/tools/circuitClimbSmoke.mjs",
    "src/games/circuit-climb/tools/circuitClimbBrowserSmoke.mjs",
    "src/games/circuit-climb/tools/circuitClimbBrowserHarness.mjs",
]


def die(message):
    print(f"\n✗ {message}", file=sys.stderr)
    sys.exit(1)


def safe_members(tar, destination):
    """Yield members, refusing anything that would write outside destination.

    Absolute paths, "..", symlinks and hard links are all rejected rather than
    sanitised: a transfer archive has no legitimate reason to contain them, so
    their presence means the payload is not the one that was packaged.
    """
    root = destination.resolve()
    for member in tar.getmembers():
        name = member.name
        if name.startswith("/") or name.startswith("\\"):
            die(f"archive contains an absolute path: {name}")
        if ".." in Path(name).parts:
            die(f"archive contains a parent-directory traversal: {name}")
        if member.issym() or member.islnk():
            die(f"archive contains a link, which this payload should not have: {name}")
        if not (member.isfile() or member.isdir()):
            die(f"archive contains a special file: {name}")
        target = (root / name).resolve()
        if target != root and root not in target.parents:
            die(f"archive member escapes the target directory: {name}")
        yield member


def main():
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("--payload", required=True,
                        help="path to circuit-climb-successor-02-payload.b64")
    parser.add_argument("target", nargs="?", default="./circuit-climb-restored",
                        help="new directory to restore into (must be empty or absent)")
    parser.add_argument("--force", action="store_true",
                        help="allow restoring into a non-empty directory (NOT recommended)")
    args = parser.parse_args()

    destination = Path(args.target)
    print("Circuit Climb — successor SOT-02 restore")
    print(f"  payload: {args.payload}")
    print(f"  target:  {destination.resolve()}")
    print()

    # --- refuse to merge into an existing workspace -----------------------
    if destination.exists():
        if not destination.is_dir():
            die(f"{destination} exists and is not a directory.")
        contents = list(destination.iterdir())
        if contents and not args.force:
            die(
                f"{destination} is not empty ({len(contents)} entries).\n"
                "  Restore into a NEW directory. Merging into an existing workspace is\n"
                "  exactly how a stale file survives a transfer and is never noticed."
            )

    # --- read and verify the payload --------------------------------------
    try:
        payload_text = Path(args.payload).read_text().strip()
    except OSError as error:
        die(f"cannot read payload: {error}")

    if not payload_text:
        die("payload file is empty.")

    b64_digest = hashlib.sha256(payload_text.encode("ascii", "strict")).hexdigest()
    print(f"  base64 SHA-256: {b64_digest}")
    if EXPECTED_B64_SHA256 and not EXPECTED_B64_SHA256.startswith("__"):
        if b64_digest != EXPECTED_B64_SHA256:
            die(
                "payload SHA-256 does not match the packaged value.\n"
                f"  expected {EXPECTED_B64_SHA256}\n"
                f"  actual   {b64_digest}\n"
                "  The payload was truncated or altered in transit. Re-copy it whole."
            )
        print("  base64 checksum OK")

    try:
        archive_bytes = base64.b64decode(payload_text, validate=True)
    except (binascii.Error, ValueError) as error:
        die(f"payload is not valid base64 ({error}). It was probably truncated.")

    tar_digest = hashlib.sha256(archive_bytes).hexdigest()
    print(f"  archive SHA-256: {tar_digest}")
    if EXPECTED_TAR_SHA256 and not EXPECTED_TAR_SHA256.startswith("__"):
        if tar_digest != EXPECTED_TAR_SHA256:
            die(
                "decoded archive SHA-256 does not match the packaged value.\n"
                f"  expected {EXPECTED_TAR_SHA256}\n"
                f"  actual   {tar_digest}"
            )
        print("  archive checksum OK")

    # --- extract ----------------------------------------------------------
    destination.mkdir(parents=True, exist_ok=True)
    try:
        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as tar:
            members = list(safe_members(tar, destination))
            tar.extractall(path=destination, members=members)
    except tarfile.TarError as error:
        die(f"archive is corrupt: {error}")

    extracted = [p for p in destination.rglob("*") if p.is_file()]
    print(f"\n  extracted {len(extracted)} files")
    if EXPECTED_FILE_COUNT and len(extracted) != EXPECTED_FILE_COUNT:
        die(
            f"expected {EXPECTED_FILE_COUNT} files, found {len(extracted)}.\n"
            "  The payload is not the one that was packaged."
        )

    # --- sentinels --------------------------------------------------------
    print("\n  verifying sentinels...")
    missing = [name for name in SENTINELS if not (destination / name).is_file()]
    for name in SENTINELS:
        print(f"    {'OK ' if (destination / name).is_file() else 'MISSING'}  {name}")
    if missing:
        die(
            f"{len(missing)} sentinel file(s) missing. The restore is incomplete.\n"
            "  Do NOT create them by hand and do NOT continue: a synthesised file is\n"
            "  not the frozen product, and the transfer has failed."
        )

    print()
    print("=" * 70)
    print("RESTORATION COMPLETE")
    print("=" * 70)
    print(f"""
Next, from {destination}:

  npm install
  npm run lint                          # expect: clean, exit 0
  npm test                              # expect: 20 files, 206 tests, 206 passing
  npm run build                         # expect: success
  npm run test:circuit-climb:browser    # expect: BROWSER SMOKE PASS — 61/61

Then look at it with your own eyes:

  npm run dev                           # http://localhost:3000

If ANY of those baselines differs, stop and report it. Do not proceed, and do
not repair the workspace by hand.

Read src/games/circuit-climb/docs/CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_02.md
before changing anything.
""")


if __name__ == "__main__":
    main()
