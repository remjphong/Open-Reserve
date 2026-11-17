from collections import Counter
from pathlib import Path
import re
import sys

def failures(filename):
    rows = set()
    for line in Path(filename).read_text().splitlines():
        if not line.startswith("[FAIL"):
            continue
        test = re.search(r"\]\s+(test\w+\([^)]*\))\s*(?:\(|$)", line)
        selector = re.search(r"VaultBehaviorNotImplemented\((0x[0-9a-fA-F]{8})\)", line)
        if not test or not selector:
            sys.exit(f"BLOCKER: unexpected failure in {filename}: {line}")
        reason = line[6:test.start()].split("; counterexample:", 1)[0]
        rows.add((test[1], selector[1].lower(), reason))
    return rows

baseline, current = map(failures, sys.argv[1:])
if baseline != current:
    for row in sorted(baseline - current):
        print("Baseline only:", *row)
    for row in sorted(current - baseline):
        print("Current only:", *row)
    sys.exit("BLOCKER: RED test names, selectors or reasons changed")

counts = Counter(selector for _, selector, _ in current)
expected = {"0x17fbfb80": 8, "0xd0fa2436": 5, "0xf51a4c06": 6}
if len({test for test, _, _ in current}) != 19 or counts != expected:
    sys.exit(f"BLOCKER: unexpected RED count or selector breakdown: {dict(counts)}")
for test, selector, _ in sorted(current):
    print(f"{selector}  {test}")
print("VERIFIED: all 19 RED names, selectors and revert reasons match Phase C.")
