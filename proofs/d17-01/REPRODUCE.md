# Reproducing the reviewed checks

This file documents replay. Evidence collection did not execute these checks.

Use baseline `7738f0153bf59768d91fb56696fc413ba34c91a2`, Foundry 1.9.0 and
`git/source-after.patch` in a separate checkout. Confirm the test file uses LF and
check both source hashes against `git/source-sha256.txt`.

Run the commands in `resumed/{foundry-version,fmt,build,focused,deposit,full-suite}.command`
from `contracts/`. The focused command contains the exact 11-test filter. Run
`git diff --check HEAD` from the repository root. Capture each command's status
and the corresponding `tee` status individually using Bash `PIPESTATUS`. The
reviewed full-suite command exited 1 and its tee exited 0.

Compare full-suite failures by test name, selector and revert reason against
`phase-c/full-suite.log`. The reviewed rows appear in `red-comparison.tsv`.
Absolute paths in the archived `.command` files refer to the original WSL2 run.
