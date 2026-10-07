"""
Golden desk-id and ticket-id vectors shared with the frontend (tests/js/ids.test.ts
reads the same file). Every value is computed by the contract's own code on the real
SDK Keccak256.

Regenerate:  WRITE_VECTORS=1 python3 -m pytest tests/contract/test_id_vectors.py
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VECTORS = ROOT / "tests" / "js" / "id-vectors.json"
CONTRACT = str(ROOT / "contracts" / "BlocksOthers.py")

OWNER = "0x3065E31B1D993d7C0D59E6786844cBa56780B2d3"
FILER = "0xADE4533b5C00Fc6c8E44F674213c081D919aaD1D"
NAMES = ["Platform help desk", "  Platform   help\tdesk ", "Café　IT", "\u001cOps\u001f", "﻿Support"]
TEXTS = [
    "Main won't build, so my branch can't merge and neither can anyone else's.",
    "Main won't build on my laptop, so my branch can't merge.",
    "  The shared test database\u0085is down for everyone. ",
    "Printer jammed 🖨️ on my job",
]


def build(contract):
    desks = [{"name": n, "desk_id": contract._desk_id(OWNER, contract._normalize_text(n.strip()))} for n in NAMES]
    did = desks[0]["desk_id"]
    tickets = [{"text": t, "ticket_id": contract._ticket_id(did, FILER, contract._normalize_text(t.strip()))} for t in TEXTS]
    return {"owner": OWNER, "filer": FILER, "desks": desks, "tickets": tickets}


def test_vectors_match_contract(direct_deploy):
    data = build(direct_deploy(CONTRACT))
    if os.environ.get("WRITE_VECTORS") == "1":
        VECTORS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    assert json.loads(VECTORS.read_text(encoding="utf-8")) == data
