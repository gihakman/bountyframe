"""Shared fixtures and mock helpers for BountyFrame direct-mode tests."""
import json
from pathlib import Path

# repo root = tests/direct/conftest.py -> parents[2]
CONTRACT = str(Path(__file__).resolve().parents[2] / "contracts" / "bounty_frame.py")

# 1x1 PNG bytes are irrelevant in direct mode (the model is mocked); any body works.
FAKE_IMAGE_BODY = b"\x89PNG\r\n\x1a\n-fake-image-bytes"


def mock_media_ok(direct_vm, url_pattern: str = r".*"):
    """Mock a successful media fetch returning image bytes."""
    direct_vm.mock_web(
        url_pattern,
        {"status": 200, "body": FAKE_IMAGE_BODY},
    )


def mock_verdict(direct_vm, compliant: bool, score: int = 90, reason: str = "ok"):
    """Mock the vision model verdict for the evaluation prompt."""
    direct_vm.mock_llm(
        r".*brand-safety reviewer.*",
        json.dumps({"compliant": compliant, "score": score, "reason": reason}),
    )


ONE_GEN = 10**18


def addr_hex(a) -> str:
    """Normalize a test-fixture address (Address or bytes) to lowercase 0x hex."""
    if hasattr(a, "as_hex"):
        return a.as_hex.lower()
    return ("0x" + bytes(a).hex()).lower()
