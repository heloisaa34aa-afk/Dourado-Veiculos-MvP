import sys
from unittest.mock import MagicMock, patch

class MockApp:
    def __init__(self, *args, **kwargs):
        pass
    def function(self, *args, **kwargs):
        def decorator(func): return func
        return decorator
    def cls(self, *args, **kwargs):
        def decorator(cls): return cls
        return decorator

class MockModal(MagicMock):
    App = MockApp
    def asgi_app(self):
        def decorator(func): return func
        return decorator
    def method(self):
        def decorator(func): return func
        return decorator
    def enter(self):
        def decorator(func): return func
        return decorator

sys.modules['modal'] = MockModal()
sys.modules['torch'] = MagicMock()
sys.modules['torch.nn.functional'] = MagicMock()
sys.modules['tapnet'] = MagicMock()
sys.modules['tapnet.torch'] = MagicMock()

import numpy as np
import pytest
from app import aggregate_points, generate_query_points, load_video, fastapi_app, Tracker
from fastapi.testclient import TestClient

def test_generate_query_points():
    t, y, x = 0, 50, 50
    points = generate_query_points(t, y, x, spacing=5, max_h=512, max_w=512)
    assert len(points) == 9

def test_generate_query_points_clipping():
    t, y, x = 0, 1, 510
    points = generate_query_points(t, y, x, spacing=5, max_h=512, max_w=512)
    assert len(points) == 9
    for p in points:
        assert 0 <= p[1] < 512
        assert 0 <= p[2] < 512

def test_aggregate_points_ideal():
    valid_points = np.array([
        [100, 100], [101, 100], [99, 100],
        [100, 101], [100, 99], [101, 101],
        [99, 99], [99, 101], [101, 99]
    ])
    valid_conf = np.ones(9)
    prev_x, prev_y = 90, 90
    pos, conf, err = aggregate_points(valid_points, valid_conf, prev_x, prev_y)
    assert err is None
    assert pos == (100.0, 100.0)

def test_aggregate_points_outlier_rejection():
    valid_points = np.array([
        [100, 100], [101, 100], [99, 100],
        [100, 101], [100, 99], [101, 101],
        [99, 99], [500, 500], [10, 10]
    ])
    valid_conf = np.ones(9)
    prev_x, prev_y = 100, 100
    pos, conf, err = aggregate_points(valid_points, valid_conf, prev_x, prev_y)
    assert err is None
    assert pos == (100.0, 100.0)

def test_aggregate_points_too_few():
    valid_points = np.array([[100, 100], [101, 100]])
    valid_conf = np.ones(2)
    prev_x, prev_y = 100, 100
    pos, conf, err = aggregate_points(valid_points, valid_conf, prev_x, prev_y)
    assert pos is None
    assert "Poucos inliers" in err

def test_aggregate_points_excessive_jump():
    valid_points = np.array([
        [300, 300], [301, 300], [299, 300],
        [300, 301], [300, 299]
    ])
    valid_conf = np.ones(5)
    prev_x, prev_y = 100, 100
    pos, conf, err = aggregate_points(valid_points, valid_conf, prev_x, prev_y, jump_threshold=150.0)
    assert pos is None
    assert err == "Salto excessivo"

@patch('app.requests.get')
def test_load_video_resizing(mock_get):
    from PIL import Image
    from io import BytesIO
    img = Image.new('RGB', (1920, 1080), color = 'red')
    buf = BytesIO()
    img.save(buf, format='JPEG')
    mock_resp = MagicMock()
    mock_resp.iter_content.return_value = [buf.getvalue()]
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp
    video, orig_size = load_video(["url1", "url2"])
    assert orig_size == (1920, 1080)
    assert video.shape == (2, 512, 512, 3)

def test_load_video_limit_48():
    with pytest.raises(ValueError, match="Exigido entre 2 e 48"):
        load_video(["url"] * 50)

def test_cors():
    app_fastapi = fastapi_app()
    client = TestClient(app_fastapi)
    response = client.options(
        "/track",
        headers={
            "Origin": "https://dourado-veiculos-mv-p.vercel.app",
            "Access-Control-Request-Method": "POST",
        }
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://dourado-veiculos-mv-p.vercel.app"

@patch('app.load_video')
@patch('app.tapir_model.TAPIR')
def test_tracker_logic(mock_tapir, mock_load_video):
    mock_load_video.return_value = (np.zeros((10, 512, 512, 3), dtype=np.uint8), (1920, 1080))
    tracker = Tracker()
    tracker.device = "cpu"
    tracker.model = MagicMock()
    outputs = {'tracks': MagicMock(), 'occlusion': MagicMock(), 'expected_dist': MagicMock()}
    tracker.model.return_value = outputs
    
    fake_tracks = np.zeros((9, 10, 2))
    for t in range(10):
        fake_tracks[:, t, 0] = 100 + t * 10
        fake_tracks[:, t, 1] = 100
    outputs['tracks'].__getitem__.return_value = sys.modules['torch'].tensor(fake_tracks)
    
    fake_occlusion = np.zeros((9, 10))
    fake_occlusion[:, 5] = 10.0
    outputs['occlusion'].__getitem__.return_value = sys.modules['torch'].tensor(fake_occlusion)
    
    fake_dist = np.zeros((9, 10))
    fake_dist[:, 6] = 10.0
    outputs['expected_dist'].__getitem__.return_value = sys.modules['torch'].tensor(fake_dist)
    
    sys.modules['torch'].no_grad = MagicMock
    def mock_sigmoid(x):
        return 1 / (1 + np.exp(-x.numpy() if hasattr(x, 'numpy') else -x))
    sys.modules['torch.nn.functional'].sigmoid = mock_sigmoid
    pass

