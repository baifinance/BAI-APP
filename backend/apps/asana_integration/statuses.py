"""Map raw Asana section names onto the loan pipeline statuses."""

from __future__ import annotations

import re

LOAN_STATUSES = {
    "Pending",
    "Appointment Booked",
    "Under Review",
    "Revisit",
    "Proceeding",
    "Collection of Documents",
    "Assessment",
    "Docs for Sign",
    "For Lodgment",
    "Submitted",
    "Conditional Approval",
    "Conversion to Unconditional Approval",
    "Unconditional Approval",
    "Settlement",
    "Settled",
    "Withdraw",
}

_ALIASES = {
    "for lodgement": "For Lodgment",
    "withdrawn": "Withdraw",
    "settlements": "Settlement",
    "unconditionally approved": "Unconditional Approval",
    "final assessment": "Assessment",
}


def _normalize(name):
    value = re.sub(r"\s+", " ", str(name or "")).strip()
    value = re.sub(r"\s*\(.*$", "", value).strip().lower()
    return re.sub(r"\s+", " ", value)


_CANONICAL_BY_KEY = {_normalize(name): name for name in LOAN_STATUSES}


def canonical_loan_status(name):
    """Return the pipeline status for a raw section name, or ``None``."""
    key = _normalize(name)
    if not key:
        return None
    return _CANONICAL_BY_KEY.get(key) or _ALIASES.get(key)
