"""Standalone self-check for canonical_loan_status (no Django needed)."""

import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "asana_integration_statuses",
    Path(__file__).with_name("statuses.py"),
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

LOAN_STATUSES = module.LOAN_STATUSES
canonical_loan_status = module.canonical_loan_status

CASES = [
    ("For Lodgment", "For Lodgment"),
    ("For Lodgement", "For Lodgment"),
    ("FOR LODGEMENT (autogenerate)", "For Lodgment"),
    ("Withdrawn", "Withdraw"),
    ("Settlements", "Settlement"),
    ("SETTLEMENTS (autogenerate)", "Settlement"),
    ("Unconditionally Approved", "Unconditional Approval"),
    ("Final Assessment", "Assessment"),
    ("FINAL ASSESSMENT (autogenerate)", "Assessment"),
    ("UNDER REVIEW", "Under Review"),
    ("Proceeding", "Proceeding"),
    ("PROCEEDING (autogenerate)", "Proceeding"),
    ("Settled", "Settled"),
    ("SETTLED (for the previous month)", "Settled"),
    ("SUBMITTED (Bank's Timeframe))", "Submitted"),
    ("COLLECTION OF DOCUMENTS", "Collection of Documents"),
    ("Docs for Sign", "Docs for Sign"),
    ("Conversion to Unconditional Approval", "Conversion to Unconditional Approval"),
    ("Declined", None),
    ("Declined (autogenerate)", None),
    ("Origination", None),
    ("Archive", None),
    ("TEMPLATE", None),
    ("", None),
    ("   ", None),
    (None, None),
]

failures = 0
for raw, expected in CASES:
    got = canonical_loan_status(raw)
    if got != expected:
        print(f"FAIL: {raw!r} -> {got!r}, expected {expected!r}")
        failures += 1

# Sanity: every canonical name normalizes to itself.
for name in LOAN_STATUSES:
    if canonical_loan_status(name) != name:
        print(f"FAIL: canonical {name!r} did not map to itself")
        failures += 1

if failures:
    raise SystemExit(f"{failures} failure(s)")
print(f"OK: {len(CASES)} cases + {len(LOAN_STATUSES)} canonical self-checks")
