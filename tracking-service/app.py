import os
import modal

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "wget", "ffmpeg", "libsm6", "libxext6")
    .pip_install(
        "torch", 
        "torchvision", 
        "torchaudio", 
        index_url="https://download.pytorch.org/whl/cu121"
    )
    .run_commands(
        "pip install 'tapnet[torch] @ git+https://github.com/google-deepmind/tapnet.git'",
        "mkdir -p /checkpoints",
        "wget -O /checkpoints/bootstapir_checkpoint_v2.pt https://storage.googleapis.com/dm-tapnet/bootstap/bootstapir_checkpoint_v2.pt"
    )
    .pip_install(
        "fastapi[standard]",
        "pydantic",
        "requests",
        "opencv-python",
        "numpy"
    )
)

app = modal.App("vehicle360-tracking", image=image)

with image.imports():
    import torch
    import torch.nn.functional as F
    import numpy as np
    import requests
    from io import BytesIO
    from PIL import Image
    from tapnet.torch import tapir_model
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    from typing import List

web_app = FastAPI(title="TAPIR Tracking Service")

class TrackingRequest(BaseModel):
    frames: List[str]
    initialFrame: int
    initialX: float
    initialY: float
    projectId: str
    markerId: str
    markerType: str

def preprocess_frames(frames: torch.Tensor):
    frames = frames.float()
    frames = frames / 255.0 * 2.0 - 1.0
    return frames

def load_video(urls: List[str]):
    # In production, we'd do parallel downloads. Here we just loop.
    images = []
    for url in urls:
        resp = requests.get(url)
        resp.raise_for_status()
        img = Image.open(BytesIO(resp.content)).convert('RGB')
        images.append(np.array(img))
    return np.stack(images)

@app.cls(gpu="any", keep_warm=1)
class Tracker:
    @modal.enter()
    def load_model(self):
        print("Loading BootsTAPIR model...")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = tapir_model.TAPIR(use_casual_conv=False, bilinear_interp_with_depthwise_conv=False)
        self.model.load_state_dict(torch.load('/checkpoints/bootstapir_checkpoint_v2.pt', map_location=self.device))
        self.model = self.model.to(self.device)
        self.model.eval()
        print("Model loaded.")

    @modal.method()
    def track(self, req: TrackingRequest):
        print(f"Tracking {len(req.frames)} frames...")
        # 1. Load images
        video = load_video(req.frames) # shape: (T, H, W, C)
        T, H, W, C = video.shape
        
        video_tensor = torch.from_numpy(video).to(self.device)
        video_tensor = preprocess_frames(video_tensor)[None] # (1, T, H, W, C)

        # 2. Prepare query points: (t, y, x) in absolute pixels
        # UI sends (0-100) percentages for X and Y.
        # Note: TAPNet uses (t, y, x) format
        y_px = req.initialY / 100.0 * H
        x_px = req.initialX / 100.0 * W
        
        query_points = torch.tensor([[req.initialFrame, y_px, x_px]], dtype=torch.float32, device=self.device)
        query_points = query_points[None] # (1, 1, 3)

        # 3. Run Inference
        with torch.no_grad():
            outputs = self.model(video_tensor, query_points, is_training=False, query_chunk_size=1)
            
            tracks = outputs['tracks'][0, 0] # (T, 2) => [x, y]
            occlusion = outputs['occlusion'][0, 0] # (T,)
            expected_dist = outputs['expected_dist'][0, 0] # (T,)
            
            # Postprocess to get visibility
            visibles = (1 - F.sigmoid(occlusion)) * (1 - F.sigmoid(expected_dist)) > 0.5
            
        tracks = tracks.cpu().numpy()
        visibles = visibles.cpu().numpy()
        confidence = (1 - F.sigmoid(expected_dist)).cpu().numpy()
        
        # 4. Format Output
        results = []
        for t in range(T):
            x = max(0, min(100, (tracks[t, 0] / W) * 100.0))
            y = max(0, min(100, (tracks[t, 1] / H) * 100.0))
            vis = bool(visibles[t])
            conf = float(confidence[t])
            
            results.append({
                "frameNumber": t,
                "posX": float(x),
                "posY": float(y),
                "visible": vis,
                "isKeyframe": (t == req.initialFrame),
                "confidence": conf
            })
            
        return {"positions": results}

@app.function()
@modal.web_endpoint(method="POST")
def track_endpoint(req: TrackingRequest):
    tracker = Tracker()
    return tracker.track.remote(req)
