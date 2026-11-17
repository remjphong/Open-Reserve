from pathlib import Path
import difflib
import hashlib
import re
import sys

mode, evidence, vault_name, tests_name = sys.argv[1:]
evidence = Path(evidence)
vault, tests = Path(vault_name), Path(tests_name)
phase_c = (evidence / "tests-phase-c.sol").read_bytes()
expected = (evidence / "tests-expected.sol").read_bytes()
raw = tests.read_bytes()
normalized = raw.replace(b"\r\n", b"\n")

def require(condition, message):
    if not condition:
        sys.exit(f"BLOCKER: {message}")

require(vault.read_bytes() == (evidence / "vault-expected.sol").read_bytes(),
        "Vault bytes differ from the Phase C snapshot")
require(normalized == expected,
        "LF-normalized test content differs from the approved Phase D snapshot")
require(b"\r" not in normalized, "unexpected standalone CR byte")

names = {
    b"test_D17_01_RejectsZeroSessionIdAndEvidence",
    b"test_D17_01_RejectsPtProposalOnTimeAccess",
    b"test_D17_01_RejectsMissingAgreementAndClaimOnWrites",
}
old_lines = phase_c.splitlines(keepends=True)
new_lines = expected.splitlines(keepends=True)
changes = [
    op for op in difflib.SequenceMatcher(None, old_lines, new_lines, autojunk=False).get_opcodes()
    if op[0] != "equal"
]
require(bool(changes) and all(op[0] == "insert" for op in changes),
        "the approved test delta changes existing Phase C lines")
added = b"".join(b"".join(new_lines[j:k]) for _, _, _, j, k in changes)
added_names = re.findall(rb"(?m)^    function (test_[A-Za-z0-9_]+)\(", added)
require(len(added_names) == 3 and set(added_names) == names,
        "test additions do not match the three approved names")
for name in names:
    require(len(re.findall(rb"(?m)^    function " + name + rb"\(", expected)) == 1,
            f"missing or duplicate test: {name.decode()}")

if mode == "normalize" and raw != normalized:
    tests.write_bytes(normalized)

after = tests.read_bytes()
require(after == normalized == expected, "test bytes differ after LF normalization")
require(vault.read_bytes() == (evidence / "vault-expected.sol").read_bytes(),
        "Vault bytes changed")
print(f"VERIFIED: test CRLF sequences before={raw.count(b'\r\n')}, after=0")
print(f"VERIFIED: LF bytes identical, SHA256={hashlib.sha256(after).hexdigest()}")
print("VERIFIED: Vault unchanged; Phase C test lines preserved; all three Phase D tests present")
