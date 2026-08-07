import pytest
from fastapi.testclient import TestClient

# Mock modal before importing app
import sys
from unittest.mock import MagicMock
sys.modules['modal'] = MagicMock()

from app import web_app

client = TestClient(web_app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "Tracking Lab MVP"}

def test_track_contract_missing_body():
    response = client.post("/track")
    assert response.status_code == 422 # Unprocessable Entity

def test_track_contract_valid_format():
    # We only test the HTTP validation layer here, since modal execution is mocked
    payload = {
        "frames": ["http://example.com/img1.jpg"],
        "initialFrame": 0,
        "initialX": 50.0,
        "initialY": 50.0,
        "projectId": "proj-123",
        "markerId": "marker-123",
        "markerType": "poi"
    }
    # This will fail inside track_endpoint because Tracker isn't actually modal deployed, 
    # but we can check if it passes Pydantic validation (which it does, it will hit the 500 error instead of 422)
    response = client.post("/track", json=payload)
    assert response.status_code == 500 # Valid payload, but mocked remote function fails
