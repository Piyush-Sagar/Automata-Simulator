#!/usr/bin/env python3
"""Small standard-library client; credentials are read only from the environment."""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation")
    payload = parser.add_mutually_exclusive_group()
    payload.add_argument("--json", default=None)
    payload.add_argument("--file", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z_]+(?:\.json)?", args.operation):
        parser.error("Operation must be a name from capabilities.")
    base = os.environ.get("AUTOMATA_API_URL", "http://localhost:3000").rstrip("/")
    discovery = args.operation in {"health", "capabilities", "openapi.json"}
    try:
        data = None if discovery else json.dumps(json.loads(args.file.read_text(encoding="utf-8") if args.file else args.json or "{}"), ensure_ascii=False).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        key = os.environ.get("AUTOMATA_API_KEY")
        if key:
            headers["Authorization"] = "Bearer " + key
        request = urllib.request.Request(base + "/api/v1/" + args.operation, data=data, headers=headers, method="GET" if discovery else "POST")
        with urllib.request.urlopen(request, timeout=45) as response:
            result = json.loads(response.read())
    except urllib.error.HTTPError as error:
        print(error.read().decode("utf-8"), file=sys.stderr)
        return 1
    except (OSError, ValueError, urllib.error.URLError) as error:
        print("Automata API request failed: " + str(error), file=sys.stderr)
        return 1
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    else:
        sys.stdout.buffer.write(text.encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
