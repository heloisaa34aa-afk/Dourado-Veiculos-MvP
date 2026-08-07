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
        "numpy",
        "starlette"
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

def preprocess_frames(frames):
    frames = frames.float()
    frames = frames / 255.0 * 2.0 - 1.0
    return frames

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def load_video(urls):
    if len(urls) < 2 or len(urls) > 48:
        raise ValueError(f"Quantidade de frames inválida: {len(urls)}. Exigido entre 2 e 48.")
        
    images = []
    original_size = None
    for url in urls:
        resp = requests.get(url, timeout=10, stream=True)
        resp.raise_for_status()
        
        # Check size and validate it's an image
        content = b""
        for chunk in resp.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > MAX_FILE_SIZE:
                raise ValueError("Imagem excede o limite de 5MB.")
                
        try:
            img = Image.open(BytesIO(content))
            img.verify() # verify it's an image
            img = Image.open(BytesIO(content)).convert('RGB')
        except Exception:
            raise ValueError("O arquivo não é uma imagem válida.")
            
        if original_size is None:
            original_size = img.size # (W, H)
            
        # Resize to 512x512 for inference
        img = img.resize((512, 512), Image.Resampling.BILINEAR)
        images.append(np.array(img))
    
    return np.stack(images), original_size

def generate_query_points(t, y, x, spacing=5, max_h=512, max_w=512):
    points = []
    for dy in [-spacing, 0, spacing]:
        for dx in [-spacing, 0, spacing]:
            py = max(0, min(max_h - 1, y + dy))
            px = max(0, min(max_w - 1, x + dx))
            points.append([t, py, px])
    return points

def aggregate_points(valid_points, valid_conf, prev_x, prev_y, jump_threshold=150.0):
    if len(valid_points) < 3:
        return None, float(np.mean(valid_conf) if len(valid_conf)>0 else 0), "Poucos inliers"
        
    med_x = np.median(valid_points[:, 0])
    med_y = np.median(valid_points[:, 1])
    
    dists = np.sqrt((valid_points[:, 0] - med_x)**2 + (valid_points[:, 1] - med_y)**2)
    inlier_mask = dists < 20.0
    
    inliers = valid_points[inlier_mask]
    inlier_conf = valid_conf[inlier_mask]
    
    if len(inliers) < 3:
        return None, float(np.mean(valid_conf) if len(valid_conf)>0 else 0), "Poucos inliers pós-mediana"
        
    final_x = np.median(inliers[:, 0])
    final_y = np.median(inliers[:, 1])
    final_conf = np.mean(inlier_conf)
    
    jump_dist = np.sqrt((final_x - prev_x)**2 + (final_y - prev_y)**2)
    if jump_dist > jump_threshold:
        return None, float(final_conf), "Salto excessivo"
        
    return (final_x, final_y), float(final_conf), None

@app.cls(gpu="any", timeout=300)
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
    def track(self, req: dict):
        print(f"Tracking {len(req['frames'])} frames...")
        try:
            video, (orig_w, orig_h) = load_video(req['frames'])
        except Exception as e:
            raise Exception(f"Failed to load images: {str(e)}")

        T, H, W, C = video.shape
        # H=512, W=512
        
        video_tensor = torch.from_numpy(video).to(self.device)
        video_tensor = preprocess_frames(video_tensor)[None]

        y_px = (req['initialY'] / 100.0) * H
        x_px = (req['initialX'] / 100.0) * W
        initial_t = req['initialFrame']
        
        raw_points = generate_query_points(initial_t, y_px, x_px, spacing=5, max_h=H, max_w=W)
        query_points = torch.tensor(raw_points, dtype=torch.float32, device=self.device)
        query_points = query_points[None]

        with torch.no_grad():
            outputs = self.model(video_tensor, query_points, is_training=False, query_chunk_size=9)
            
            tracks = outputs['tracks'][0]
            occlusion = outputs['occlusion'][0]
            expected_dist = outputs['expected_dist'][0]
            
            visibles = (1 - F.sigmoid(occlusion)) * (1 - F.sigmoid(expected_dist)) > 0.5
            
        tracks = tracks.cpu().numpy()
        visibles = visibles.cpu().numpy()
        confidence = (1 - F.sigmoid(expected_dist)).cpu().numpy()
        
        results = []
        tracked_frames = 0
        quality_issues = []
        prev_x, prev_y = x_px, y_px
        
        for t in range(T):
            if t == initial_t:
                results.append({
                    "frameNumber": t,
                    "posX": req['initialX'],
                    "posY": req['initialY'],
                    "visible": True,
                    "isKeyframe": True,
                    "confidence": 1.0
                })
                tracked_frames += 1
                continue
                
            vis_mask = visibles[:, t]
            valid_points = tracks[vis_mask, t, :]
            valid_conf = confidence[vis_mask, t]
            
            final_pos, final_conf, error_reason = aggregate_points(valid_points, valid_conf, prev_x, prev_y)
            
            if final_pos is None:
                if error_reason == "Salto excessivo":
                    quality_issues.append(f"Salto excessivo detectado no frame {t}.")
                results.append({
                    "frameNumber": t,
                    "posX": req['initialX'],
                    "posY": req['initialY'],
                    "visible": False,
                    "isKeyframe": False,
                    "confidence": final_conf
                })
                continue
                
            final_x, final_y = final_pos
            prev_x, prev_y = final_x, final_y
            tracked_frames += 1
            
            pct_x = max(0.0, min(100.0, (final_x / float(W)) * 100.0))
            pct_y = max(0.0, min(100.0, (final_y / float(H)) * 100.0))
            
            results.append({
                "frameNumber": t,
                "posX": float(pct_x),
                "posY": float(pct_y),
                "visible": True,
                "isKeyframe": False,
                "confidence": float(final_conf)
            })

        accepted = True
        rejection_reasons = quality_issues.copy()
        
        tracking_ratio = tracked_frames / T
        if tracking_ratio < 0.3:
            accepted = False
            rejection_reasons.append(f"Rastreamento perdido na maior parte do tempo (visível em {tracked_frames}/{T} frames).")
            
        quality_score = tracking_ratio
            
        return {
            "positions": results,
            "qualityScore": quality_score,
            "accepted": accepted,
            "rejectionReasons": list(set(rejection_reasons))
        }

@app.function(timeout=300)
@modal.asgi_app()
def fastapi_app():
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    from typing import List
    import os

    web_app = FastAPI(title="TAPIR Tracking Service")

    origins_str = os.environ.get("ALLOWED_ORIGINS", "")
    origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://ais-dev-eqzpqqpztelmdrjtgkatda-280799738711.us-east1.run.app",
        "https://ais-pre-eqzpqqpztelmdrjtgkatda-280799738711.us-east1.run.app",
        "https://dourado-veiculos-mv-p.vercel.app"
    ]
    if origins_str:
        origins.extend([o.strip() for o in origins_str.split(",") if o.strip()])

    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class TrackingRequest(BaseModel):
        frames: List[str]
        initialFrame: int
        initialX: float
        initialY: float
        projectId: str
        markerId: str
        markerType: str

    @web_app.get("/health")
    def health_check():
        return {"status": "ok", "service": "Tracking Lab MVP"}

    @web_app.post("/track")
    def track_endpoint(req: TrackingRequest):
        try:
            payload = req.model_dump()
            tracker = Tracker()
            return tracker.track.remote(payload)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return web_app
