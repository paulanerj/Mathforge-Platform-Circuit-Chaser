#!/usr/bin/env python3
"""
CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py

Self-contained Circuit Climb successor restoration script.
Restores the exact project state at commit 8f54069 into a new directory.

Usage:
    # Usage 1: Restore from payload file
    python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py --payload circuit-climb-payload.b64 [target_directory]

    # Usage 2: Restore with embedded payload (single-file mode)
    python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py [target_directory]

Example:
    python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py ./circuit-climb-restored
    python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py --payload payload.b64 ./restored

The script will:
1. Extract the embedded payload to the target directory
2. Verify file integrity via inventory
3. Print next steps for validation
"""

import base64
import tarfile
import io
import sys
import os
from pathlib import Path


def main():
    """Extract and restore the Circuit Climb project."""
    args = sys.argv[1:]
    payload_file = None
    target_dir = "./circuit-climb-restored"

    # Parse arguments
    if "--payload" in args:
        idx = args.index("--payload")
        if idx + 1 < len(args):
            payload_file = args[idx + 1]
            # Remove --payload and its argument
            args = args[:idx] + args[idx+2:]

    # Remaining arg is target directory
    if args:
        target_dir = args[0]

    target_path = Path(target_dir)

    print(f"Circuit Climb Successor Restoration (commit 8f54069)")
    print(f"Target: {target_path.absolute()}")
    print()

    # Load payload from file or environment
    if payload_file:
        print(f"Loading payload from: {payload_file}")
        try:
            with open(payload_file, 'r') as f:
                payload_data = f.read().strip()
        except Exception as e:
            print(f"✗ Failed to read payload file: {e}")
            sys.exit(1)
    else:
        # Check for CIRCUIT_CLIMB_PAYLOAD environment variable
        payload_data = os.environ.get("CIRCUIT_CLIMB_PAYLOAD", "")
        if not payload_data:
            print("✗ No payload found.")
            print()
            print("Expected one of:")
            print("  1. CIRCUIT_CLIMB_PAYLOAD environment variable")
            print("  2. --payload <file> argument")
            print()
            print("To use with a base64 file:")
            print(f"  python3 {sys.argv[0]} --payload circuit-climb-payload.b64 ./restored")
            sys.exit(1)
        print("Using embedded payload")

    # Decode base64 payload
    try:
        print("Decoding payload...")
        payload_bytes = base64.b64decode(payload_data)
        print(f"✓ Decoded {len(payload_bytes)} bytes")
    except Exception as e:
        print(f"✗ Decode failed: {e}")
        sys.exit(1)

    # Extract tar.gz
    try:
        print("Extracting archive...")
        target_path.mkdir(parents=True, exist_ok=True)

        with tarfile.open(fileobj=io.BytesIO(payload_bytes), mode="r:gz") as tar:
            tar.extractall(path=target_path)

        print(f"✓ Extracted to {target_path}")
    except Exception as e:
        print(f"✗ Extraction failed: {e}")
        sys.exit(1)

    # Verify expected files
    expected_files = [
        "src/games/circuit-climb/runtime/circuitClimbLearnerRouting.ts",
        "src/games/circuit-climb/runtime/useCircuitClimbPrototypeRuntime.ts",
        "src/games/circuit-climb/geometry/circuitClimbGeometry.ts",
        "src/games/circuit-climb/tests/circuitClimbLockedCapabilities.test.ts",
        "package.json",
    ]

    print()
    print("Verifying inventory...")
    missing = []
    for file_path in expected_files:
        full_path = target_path / file_path
        if full_path.exists():
            print(f"  ✓ {file_path}")
        else:
            print(f"  ✗ {file_path} NOT FOUND")
            missing.append(file_path)

    if missing:
        print(f"\n✗ {len(missing)} file(s) missing from restore")
        sys.exit(1)

    print()
    print("=" * 70)
    print("RESTORATION COMPLETE")
    print("=" * 70)
    print()
    print(f"Project restored to: {target_path.absolute()}")
    print()
    print("Next steps for validation:")
    print("  1. cd " + str(target_path.absolute()))
    print("  2. npm install")
    print("  3. npm run lint")
    print("  4. npx vitest run")
    print("  5. npm run build")
    print("  6. npm run dev")
    print()
    print("Expected:")
    print("  - 18 test files, 165 tests, all passing")
    print("  - Lint: clean")
    print("  - Build: success")
    print("  - Dev server: http://localhost:5173 (Circuit Climb game should load)")
    print()


if __name__ == "__main__":
    main()
