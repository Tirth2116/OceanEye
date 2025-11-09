"""
Real YOLO segmentation for trash_analyzer.py using the trained model.
This replaces the stub segment.py with actual YOLO inference.
"""
from __future__ import annotations

from typing import List
from pathlib import Path
import os

import numpy as np
from PIL import Image

# Try to import YOLO
try:
    from ultralytics import YOLO  # type: ignore
except ImportError:
    YOLO = None


def segment(image, model_path: str | None = None) -> List[np.ndarray]:
    """
    Run YOLOv8 segmentation on an image and return a list of binary masks.
    
    Args:
        image: PIL Image or numpy array (H, W, 3)
        model_path: Path to .pt model file. If None, uses backend/best.pt
    
    Returns:
        List of binary masks (H x W numpy arrays) with 1 for object pixels, 0 otherwise
    """
    if YOLO is None:
        print("Warning: ultralytics not installed. Falling back to stub segmentation.")
        # Fallback to simple threshold-based segmentation
        return _stub_segment(image)
    
    # Resolve model path
    if model_path is None:
        script_dir = Path(__file__).resolve().parent
        model_path = str(script_dir.parent / "best.pt")
    
    if not Path(model_path).exists():
        print(f"Warning: Model not found at {model_path}. Using stub segmentation.")
        return _stub_segment(image)
    
    # Convert to numpy if needed
    if isinstance(image, Image.Image):
        img_np = np.array(image.convert("RGB"))
    else:
        img_np = np.asarray(image)
    
    # Load model and run inference
    try:
        model = YOLO(model_path)
        results = model(img_np, verbose=False)
        
        masks = []
        if results and len(results) > 0:
            result = results[0]
            if hasattr(result, 'masks') and result.masks is not None:
                # Extract binary masks
                for mask_data in result.masks.data:
                    # mask_data is a torch tensor, convert to numpy
                    mask_np = mask_data.cpu().numpy()
                    # Resize to original image size if needed
                    if mask_np.shape != img_np.shape[:2]:
                        from PIL import Image as PILImage
                        mask_img = PILImage.fromarray((mask_np * 255).astype(np.uint8))
                        mask_img = mask_img.resize((img_np.shape[1], img_np.shape[0]), PILImage.NEAREST)
                        mask_np = (np.array(mask_img) > 127).astype(np.uint8)
                    else:
                        mask_np = (mask_np > 0.5).astype(np.uint8)
                    masks.append(mask_np)
        
        return masks
    except Exception as e:
        print(f"Warning: YOLO segmentation failed: {e}. Using stub segmentation.")
        return _stub_segment(image)


def _stub_segment(image) -> List[np.ndarray]:
    """Fallback stub segmentation when YOLO is unavailable."""
    if isinstance(image, Image.Image):
        rgb = np.array(image.convert("RGB"))
    else:
        rgb = np.asarray(image)
    
    # Simple luma threshold
    gray = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]).astype(np.float32)
    mask = (gray > 35).astype(np.uint8)
    on = mask.sum()
    if on == 0 or on == mask.size:
        return []
    return [mask]

