#!/usr/bin/env python3
"""Test TOML validation for security - malformed .secrets.toml"""

import tomllib
import sys

try:
    with open('.secrets.toml.test', 'rb') as f:
        tomllib.loads(f.read())
    print("❌ ERROR: TOML validation should have failed!")
    print("   Missing closing quote was not detected!")
    sys.exit(1)
except tomllib.TOMLDecodeError as e:
    print(f"✅ TOML validation correctly caught error:")
    print(f"   {e}")
    sys.exit(0)
except Exception as e:
    print(f"⚠️  Unexpected error: {e}")
    sys.exit(1)

