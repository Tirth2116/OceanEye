"""
Minimal segmentation stub for trash_analyzer.py

Replace this with your real `segment(image)` implementation later.
This stub returns a single binary mask covering non-dark pixels.
"""
from __future__ import annotations

from typing import List

import numpy as np
from PIL import Image


def _to_numpy_rgb(image) -> np.ndarray:
    # Accept PIL.Image or numpy array
    if isinstance(image, Image.Image):
        return np.array(image.convert("RGB"))
    arr = np.asarray(image)
    if arr.ndim == 2:
        return np.stack([arr, arr, arr], axis=-1)
    return arr


def segment(image) -> List[np.ndarray]:
    """
    Return a list of binary masks (H x W) with 1 for object pixels, 0 otherwise.
    Stub logic: keep pixels that aren't very dark -> one mask.
    """
    rgb = _to_numpy_rgb(image)
    # Simple luma (BT.709)
    gray = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]).astype(np.float32)
    # Threshold at low brightness to treat “foreground” as not-dark
    mask = (gray > 35).astype(np.uint8)
    # If everything or nothing is selected, make it empty to avoid false positives
    on = mask.sum()
    if on == 0 or on == mask.size:
        return []
    return [mask]


