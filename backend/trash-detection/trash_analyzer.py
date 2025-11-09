#!/usr/bin/env python3
"""
trash_analyzer.py

Detects NEW trash objects from segmentation masks, crops new objects,
and sends the crops to Gemini Vision for classification.

Usage:
  python trash_analyzer.py path/to/image.jpg [--threshold 40] [--seen-store .trash_analyzer_seen.json]

Environment:
  GEMINI_API_KEY=<your_api_key>
  (optional) TRASH_SEEN_STORE overrides default seen-store path
"""

from __future__ import annotations

import argparse
import io
import json
import os
from pathlib import Path
from typing import List, Tuple, Optional

import numpy as np
from PIL import Image

# Try to import your provided segment(image) function.
# Adjust the import below to match your project layout if needed.
try:
    from segmenter import segment  # type: ignore
except Exception:
    try:
        from segment import segment  # type: ignore
    except Exception:
        segment = None  # Will be validated at runtime


def get_centroid(mask: np.ndarray) -> Optional[Tuple[float, float]]:
    """Return (cx, cy) centroid for mask where mask > 0. Returns None if empty."""
    if mask is None:
        return None
    # Ensure boolean mask
    on = np.argwhere(mask > 0)
    if on.size == 0:
        return None
    # on rows are [y, x]
    cy = float(on[:, 0].mean())
    cx = float(on[:, 1].mean())
    return (cx, cy)


def _euclidean(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    ax, ay = a
    bx, by = b
    return float(np.hypot(ax - bx, ay - by))


def is_new_object(
    centroid: Tuple[float, float],
    seen_objects: List[Tuple[float, float]],
    threshold: float = 40.0,
) -> bool:
    """Return True if centroid is farther than threshold from all seen centroids."""
    for seen in seen_objects:
        if _euclidean(centroid, seen) <= threshold:
            return False
    return True


def load_seen(path: Path) -> List[Tuple[float, float]]:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        # Validate structure
        result: List[Tuple[float, float]] = []
        for item in data:
            if isinstance(item, (list, tuple)) and len(item) == 2:
                result.append((float(item[0]), float(item[1])))
        return result
    except Exception:
        return []


def save_seen(path: Path, seen_objects: List[Tuple[float, float]]) -> None:
    try:
        with path.open("w", encoding="utf-8") as f:
            json.dump(seen_objects, f)
    except Exception:
        pass


def crop_mask_region(image: Image.Image, mask: np.ndarray, pad: int = 5) -> Optional[Image.Image]:
    """Crop the rectangular bounding box of mask>0 from the original image with padding."""
    if mask is None:
        return None
    coords = np.argwhere(mask > 0)
    if coords.size == 0:
        return None
    ys = coords[:, 0]
    xs = coords[:, 1]
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())

    # Pad and clamp to image bounds
    w, h = image.size
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(w - 1, x1 + pad)
    y1 = min(h - 1, y1 + pad)

    # PIL crop box: (left, upper, right, lower); right/lower are exclusive, so +1
    return image.crop((x0, y0, x1 + 1, y1 + 1))


def classify_with_gemini(
    crop: Image.Image,
    *,
    model_name: str = "models/gemini-2.5-flash",
    debug: bool = False,
    api_key: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str], str]:
    """
    Send the crop to Gemini Vision to classify the trash type.
    Returns (label, raw_text, prompt). Label/Raw may be None on failure.
    """
    api_key = api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        if debug:
            print("GEMINI_API_KEY not set. Skipping classification for this crop.")
        prompt = (
            "You are a vision classifier. Look at the object and respond with one short label only.\n"
            "Examples: plastic bottle, fishing net, plastic bag, styrofoam container, aluminum can, glass bottle, other."
        )
        return None, None, prompt

    try:
        import google.generativeai as genai  # type: ignore
    except Exception as e:
        if debug:
            print(f"google-generativeai not installed ({e}). Skipping classification for this crop.")
        prompt = (
            "You are a vision classifier. Look at the object and respond with one short label only.\n"
            "Examples: plastic bottle, fishing net, plastic bag, styrofoam container, aluminum can, glass bottle, other."
        )
        return None, None, prompt

    # Prepare image bytes
    buf = io.BytesIO()
    crop.save(buf, format="PNG")
    image_bytes = buf.getvalue()

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    prompt = """Analyze this trash item and respond with a JSON object containing:
{
  "label": "short name (e.g., plastic bottle, fishing net)",
  "threat_level": "Low|Medium|High|Critical",
  "decomposition_years": number (e.g., 450 for plastic bottle),
  "environmental_impact": "detailed description of harm to marine life and ecosystems",
  "disposal_instructions": "recycling/disposal guidance",
  "probable_source": "likely origin (e.g., consumer waste, fishing industry)"
}

Respond ONLY with valid JSON, no markdown fences."""

    try:
        response = model.generate_content([prompt, {"mime_type": "image/png", "data": image_bytes}])
        raw_text = (response.text or "").strip()
        if debug:
            print("Gemini prompt:", prompt)
            print("Gemini raw response:", raw_text)
        
        # Try to parse JSON
        try:
            import json
            # Strip markdown fences if present
            clean_text = raw_text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            label = data.get("label", "Unknown trash")
            return label, raw_text, prompt
        except:
            # Fallback: treat as simple label
            label = raw_text if raw_text else None
            return label, raw_text, prompt
    except Exception as e:
        if debug:
            print(f"Gemini classification failed: {e}")
        return None, None, prompt


def _compute_bbox(mask: np.ndarray, pad: int, img_w: int, img_h: int) -> Optional[Tuple[int, int, int, int]]:
    coords = np.argwhere(mask > 0)
    if coords.size == 0:
        return None
    ys = coords[:, 0]
    xs = coords[:, 1]
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img_w - 1, x1 + pad)
    y1 = min(img_h - 1, y1 + pad)
    return (x0, y0, x1, y1)


def run(
    image_path: Path,
    threshold: float,
    seen_store: Path,
    *,
    debug: bool = False,
    crops_dir: Optional[Path] = None,
    api_key: Optional[str] = None,
) -> None:
    if segment is None:
        raise RuntimeError(
            "segment(image) function not found. Please ensure it is importable "
            "from 'segmenter' or 'segment', or adjust the import in this script."
        )

    # Load seen
    env_store = os.environ.get("TRASH_SEEN_STORE")
    if env_store:
        seen_store = Path(env_store)
    seen_objects = load_seen(seen_store)

    # Load image
    img = Image.open(image_path).convert("RGB")
    img_np = np.array(img)

    # Run segmentation (try numpy array first, then PIL)
    try:
        masks = segment(img_np)  # type: ignore[call-arg]
    except Exception:
        masks = segment(img)  # type: ignore[call-arg]

    if not masks:
        print("No objects detected.")
        return

    new_count = 0
    if debug:
        if crops_dir is None:
            crops_dir = Path(".trash_crops")
        Path(crops_dir).mkdir(parents=True, exist_ok=True)
    for i, mask in enumerate(masks):
        mask_np = np.array(mask)
        centroid = get_centroid(mask_np)
        if centroid is None:
            continue
        if is_new_object(centroid, seen_objects, threshold=threshold):
            new_count += 1
            seen_objects.append(centroid)
            w, h = img.size
            bbox = _compute_bbox(mask_np, pad=6, img_w=w, img_h=h)
            crop = crop_mask_region(img, mask_np, pad=6)
            area = int(mask_np.sum())
            if debug:
                print(f"Object {i} centroid={centroid} bbox={bbox} area(px)={area}")
            if crop is None:
                print(f"Object {i}: unable to crop; centroid={centroid}")
                continue
            if debug and crops_dir is not None:
                cx, cy = centroid
                crop_path = Path(crops_dir) / f"crop_{i}_{int(cx)}_{int(cy)}.png"
                try:
                    crop.save(crop_path)
                    print(f"Saved crop: {crop_path}")
                except Exception as e:
                    print(f"Failed to save crop: {e}")
            label, raw_text, prompt = classify_with_gemini(crop, debug=debug, api_key=api_key)
            print(f"NEW object at {centroid}: {label or 'Unknown trash'}")
        else:
            # Not new, skip (optional: print verbose)
            pass

    # Persist seen
    save_seen(seen_store, seen_objects)
    if new_count == 0:
        print("No new objects found.")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Detect NEW trash objects and classify with Gemini Vision.")
    p.add_argument("image", type=str, help="Path to an input image.")
    p.add_argument("--threshold", type=float, default=40.0, help="Centroid distance threshold (pixels). Default: 40")
    p.add_argument(
        "--seen-store",
        type=str,
        default=str((Path(__file__).parent / ".trash_analyzer_seen.json")),
        help="Path to JSON store for seen centroids. Default: .trash_analyzer_seen.json",
    )
    p.add_argument(
        "--api-key",
        type=str,
        default=None,
        help="Gemini API key (alternative to GEMINI_API_KEY env var).",
    )
    p.add_argument(
        "--api-key-file",
        type=str,
        default=None,
        help="Path to a file containing the Gemini API key.",
    )
    p.add_argument(
        "--debug",
        action="store_true",
        help="Save detected crops and print Gemini prompt/response.",
    )
    p.add_argument(
        "--crops-dir",
        type=str,
        default=str((Path(__file__).parent / ".trash_crops")),
        help="Directory to save crops when --debug is enabled.",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    image_path = Path(args.image)
    if not image_path.exists():
        raise SystemExit(f"Image not found: {image_path}")
    seen_store = Path(args.seen_store)
    crops_dir = Path(args.crops_dir) if args.debug else None
    # Resolve API key precedence: --api-key-file > --api-key > env inside classify
    api_key: Optional[str] = None
    if getattr(args, "api_key_file", None):
        key_path = Path(args.api_key_file)
        if not key_path.exists():
            raise SystemExit(f"API key file not found: {key_path}")
        api_key = key_path.read_text(encoding="utf-8").strip()
    elif getattr(args, "api_key", None):
        api_key = args.api_key.strip()

    run(
        image_path=image_path,
        threshold=args.threshold,
        seen_store=seen_store,
        debug=args.debug,
        crops_dir=crops_dir,
        api_key=api_key,
    )


if __name__ == "__main__":
    main()


