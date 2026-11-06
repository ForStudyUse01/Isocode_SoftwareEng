"""Builds a soft paint mask for each car photo in public/cars and writes public/cars/meta.json.

The mask marks the saturated body paint so the site can recolour it without touching glass,
tyres, chrome or the background. Pick photos whose paint is clearly more saturated than anything else.

Usage: python scripts/paint-mask.py
"""
import json
import pathlib

import cv2
import numpy as np
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parent.parent / "public" / "cars"
NAMES = ["suv", "sedan", "hatchback", "ev"]


def dominant_hue(hue: np.ndarray, sat: np.ndarray, val: np.ndarray) -> int:
    strong = (sat > 90) & (val > 60)
    hist = np.bincount(hue[strong].ravel(), weights=sat[strong].ravel(), minlength=180)
    smooth = np.convolve(np.concatenate([hist[-6:], hist, hist[:6]]), np.ones(9) / 9, mode="same")[6:-6]
    return int(np.argmax(smooth))


def build(name: str):
    path = ROOT / f"{name}.jpg"
    if not path.exists():
        return None
    bgr = cv2.imread(str(path))
    h, w = bgr.shape[:2]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    peak = dominant_hue(hue, sat, val)
    diff = np.minimum(np.abs(hue.astype(int) - peak), 180 - np.abs(hue.astype(int) - peak))
    mask = ((sat > 60) & (val > 45) & (diff <= 14)).astype(np.uint8)

    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    labels, count = ndimage.label(mask)
    if count == 0:
        return None
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.05]
    mask = np.isin(labels, keep).astype(np.float32)
    soft = cv2.GaussianBlur(mask, (0, 0), 1.3)

    cv2.imwrite(str(ROOT / f"{name}-mask.png"), (soft * 255).astype(np.uint8))

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    weight = soft > 0.5
    lm = float(np.average(lum[weight]))
    mean_rgb = (rgb[weight].mean(axis=0) * 255).round().astype(int)
    ys, xs = np.where(weight)
    return {
        "src": f"/cars/{name}.jpg",
        "mask": f"/cars/{name}-mask.png",
        "width": w,
        "height": h,
        "lm": round(lm, 4),
        "paint": "#%02x%02x%02x" % tuple(mean_rgb),
        "box": [round(xs.min() / w, 4), round(ys.min() / h, 4), round((xs.max() + 1) / w, 4), round((ys.max() + 1) / h, 4)],
        "coverage": round(float(weight.mean()), 4),
    }


meta = {}
for n in NAMES:
    m = build(n)
    if m:
        meta[n] = m
        print(n, m)
    else:
        print(n, "skipped")
(ROOT / "meta.json").write_text(json.dumps(meta, indent=2))
