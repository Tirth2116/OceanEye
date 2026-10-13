# OceanEye — Project Overview

> An AI-powered situational-awareness platform for marine debris: it *sees* trash in the water,
> *understands* the risk it poses, *watches* coastlines from orbit, and *plans* how a robot would go
> clean it up — all inside one real-time dashboard.

This document is a narrative walkthrough of what the project is, why it exists, and how the interesting
pieces work. It is meant for someone who has never seen the codebase and wants to *understand the
project*, not set it up. (For install/run instructions see `README.md` and `SETUP.md`.)

---

## 1. The problem

Every year more than 8 million tons of plastic enter the oceans. Some of it takes 400+ years to
break down, roughly 700 marine species are harmed by ingestion or entanglement, and only ~9% of
all plastic ever made has been recycled. The people who respond to this — coastal authorities, NGOs,
cleanup crews, marine-robotics teams — face two hard questions:

1. **Where is the trash, and how bad is it?** (detection + risk assessment)
2. **How do we prioritize and physically go collect it?** (monitoring + planning)

Most tools answer only one of these. OceanEye is a prototype that stitches the whole loop together:
**detect → understand → monitor → plan**, with a live dashboard tying it into one story.

---

## 2. What the platform does

OceanEye is a full-stack application. A **Next.js** dashboard talks to a **Flask** backend that
orchestrates several AI/vision models. The dashboard is organized into four views:

### a. Dashboard view — detect & understand
- **AI Analyst Panel**: upload an underwater image or video. The backend runs a custom-trained
  **YOLOv8 segmentation** model (`best.pt`) to find and mask individual objects, crops each detected
  object, and sends the crop to **Google Gemini** for analysis.
- **Live Detection Log**: Gemini returns structured JSON for every object — `label`, `threat_level`,
  `decomposition_years`, `environmental_impact`, `disposal_instructions`, `probable_source`. These
  stream into the dashboard as cards (the UI polls `/api/detections` every 2 seconds), color-coded by
  threat and expandable for the full analysis.
- **Sonar Viewer** and **Trash Heatmap**: spatial visualizations of where debris is concentrated.

The pipeline in one line: **frame → YOLO masks → per-object crop → Gemini classification → POST to
dashboard → live card appears.**

### b. Satellite view — monitor from orbit
Type in any coastal city (or draw a custom bounding box) and OceanEye pulls **Sentinel-2** satellite
imagery through **Google Earth Engine**, computes water-quality and floating-debris indices over time,
and reports whether pollution is *excellent → critical* and whether the trend is *improving / stable /
worsening*. (Detailed in §4.)

### c. Path Visualizer — plan the cleanup
Given a set of detected trash coordinates, OceanEye computes an efficient collection route for an
autonomous underwater vehicle (ROV) and animates it following a smooth, natural path. The routing uses
nearest-neighbor + 2-opt optimization, and the *motion* is smoothed with **Catmull–Rom splines**.
(Detailed in §3.)

---

## 3. Deep dive: Catmull–Rom splines (the path smoothing)

**Where it lives:** `frontend/lib/visualizer/path.ts` (`buildSmoothPath` / Catmull–Rom), rendered by
`frontend/components/path-visualizer.tsx`.

### The problem it solves
Once we know *which* pieces of trash to collect, we compute an *order* to visit them:

1. Start at the ROV (or the centroid of the debris field if no ROV position is given).
2. Greedily hop to the **nearest unvisited target** (nearest-neighbor heuristic).
3. Refine that ordering with **2-opt** — repeatedly uncrossing pairs of route segments whenever
   swapping them shortens the total distance.

The result is an efficient *ordering*, but geometrically it's just a **polyline**: a sequence of
straight segments with sharp corners at each waypoint. If you animated a vehicle along it, the motion
would jerk and instantly change direction at every point — visually ugly and physically unrealistic for
a real underwater robot, which has momentum and can't turn on a dime.

### What a Catmull–Rom spline is
A Catmull–Rom spline is an **interpolating cubic spline**: a smooth curve that *passes through every
control point* (unlike Bézier curves, whose intermediate control points are only "pulled toward").
This "passes through the points" property is exactly what we want — the vehicle must actually reach
each piece of trash, not just curve near it.

For any segment between two consecutive waypoints `p1 → p2`, the curve's shape is influenced by the
*neighbors* `p0` and `p3`. The tangent (direction) at `p1` is set to be parallel to the line from `p0`
to `p2`, and similarly at `p2`. This automatically gives the curve **C¹ continuity** — the direction of
travel is continuous across the whole path, so there are no sudden turns.

### The math actually in the code
For a parameter `t` going from 0 to 1 along one segment, the point is the standard *uniform*
Catmull–Rom basis (`catmullRom(p0, p1, p2, p3, t)`):

```
P(t) = 0.5 * (
    (2·P1)
  + (−P0 + P2)·t
  + (2·P0 − 5·P1 + 4·P2 − P3)·t²
  + (−P0 + 3·P1 − 3·P2 + P3)·t³
)
```

applied independently to the `x` and `y` coordinates. This is the Catmull–Rom form of a cubic Hermite
spline, with the `0.5` factor encoding the tangent estimate `(neighbor_next − neighbor_prev) / 2`.

### How the project uses it
`buildSmoothPath` walks the ordered waypoints and, for each pair, samples the curve at
**`samplesPerSegment = 24`** points, producing a dense list of smooth points:

- **Endpoint handling:** the first and last waypoints have no "outside" neighbor, so the code clamps
  `p0` to the first point and `p3` to the last (`waypoints[i === 0 ? 0 : i - 1]` and
  `waypoints[i + 2] ?? last`). This gives sensible tangents at the ends of the route.
- **Arc-length bookkeeping:** as it samples, it accumulates a `cumulative[]` array of distances and a
  `totalLength`. This lets the animation move the ROV at a *constant speed* along the curve and finish
  the whole mission in a fixed ~10 seconds regardless of how many points there are — you interpolate by
  distance travelled, not by raw `t`, so the vehicle doesn't speed up on long segments and crawl on
  short ones.

**Net effect:** the jagged "connect-the-dots" route becomes a single flowing curve that glides through
every detection — believable robot motion, and a far more convincing demo of an autonomous cleanup
mission.

---

## 4. Deep dive: Google Earth Engine (the satellite monitoring)

**Where it lives:** `backend/satellite_monitor.py`, exposed through Flask routes under
`/api/satellite/*` in `backend/main.py`, and rendered by `satellite-city-analyzer.tsx` /
`satellite-monitor.tsx`.

### What Google Earth Engine is
Google Earth Engine (GEE) is a cloud platform that hosts petabytes of satellite imagery and runs
geospatial analysis on Google's servers. Instead of downloading enormous raster files, you describe the
computation (filter this collection, compute these bands, average over this region) and GEE executes it
remotely and returns just the numbers. OceanEye uses the Python `ee` client, authenticated against a
GEE cloud project (`GEE_PROJECT_ID`).

### The data source
OceanEye pulls from the **Sentinel-2 Harmonized** collection (`COPERNICUS/S2_HARMONIZED`) — the ESA
Copernicus mission that images the whole Earth every ~5 days at 10–30 m resolution. For a given
Area of Interest (AOI) and date range, the code filters the collection to that region and time, and
keeps only images with **`CLOUDY_PIXEL_PERCENTAGE < 20`** so clouds don't corrupt the readings.

### Turning pixels into ocean-health indices
Raw satellite bands aren't directly meaningful, so `calculate_indices()` computes four **normalized
spectral indices** from Sentinel-2 bands. Each is a ratio designed to isolate one signal:

| Index | Formula | What it detects |
|-------|---------|-----------------|
| **NDCI** — Normalized Difference Chlorophyll Index | `(B5 − B4) / (B5 + B4)` | Chlorophyll / algal blooms (biological water quality) |
| **NDWI** — Normalized Difference Water Index | `(B3 − B8) / (B3 + B8)` | Open water vs. land — delineates the water body |
| **NDVI** — Normalized Difference Vegetation Index | `(B8 − B4) / (B8 + B4)` | Vegetation (e.g. coastal/floating plant matter) |
| **FDI** — Floating Debris Index | `B8 − B11` (NIR − SWIR1) | **Floating plastic / marine debris** — the headline metric |

The **FDI** is the star of the show: floating plastics and debris reflect near-infrared (NIR / B8)
differently than the surrounding water reflects shortwave-infrared (SWIR1 / B11), so their difference
lights up debris that's invisible to the naked eye in ordinary satellite photos.

### From indices to an answer
- `get_time_series_data()` maps the index calculation over every qualifying image in the date range,
  then uses `reduceRegion(mean)` at 30 m scale to collapse each image to a single average value per
  index — producing a **time series** of ocean health for that coastline.
- `analyze_pollution_level()` takes the FDI series and classifies it into a 5-level status
  (`excellent → good → moderate → poor → critical`) based on the average FDI, and computes a **trend**
  (`improving / stable / worsening`) by comparing the most-recent readings against the earliest ones.
- `get_latest_image_url()` can also return a GEE map tile URL that renders the FDI as a
  blue → white → red heat overlay for a visual map.

### Making it usable and demo-safe
- **Any coast, not just one city:** `geocode_city()` resolves a city name to a bounding box — first
  checking a built-in list of major coastal cities (Mumbai, NYC, Singapore, Sydney, Dubai, …), then
  falling back to the **OpenStreetMap Nominatim** geocoder, around which it builds a ~20 km AOI box.
- **Graceful mock fallback:** if `earthengine-api` isn't installed or GEE authentication isn't set up,
  the module and API routes transparently return realistic **synthetic** time-series data (flagged with
  `usingMockData: true`). This means the dashboard and the demo always work, even offline — and swap to
  real satellite data the moment credentials are present.

---

## 5. Architecture at a glance

```
                 ┌──────────────────────────── Next.js Dashboard (frontend/) ────────────────────────────┐
                 │  Dashboard view · Satellite view · Swarm view · Visualizer view                        │
                 │  polls /api/detections every 2s · in-memory detections store · Recharts / three.js UI  │
                 └───────▲───────────────────────────────────────────────▲───────────────────────────────┘
                         │ detection cards (POST/GET)                     │ /api/satellite/* (GET/POST)
                         │                                                │
        ┌────────────────┴─────────────────────────────────────────────┴───────────────────┐
        │                          Flask backend (backend/main.py)                            │
        │                                                                                     │
        │   /upload-video ── YOLOv8 seg + track (yolov8_seg_track.py) ── annotated MP4        │
        │   /upload-image ── YOLO segment → crop → Gemini classify → POST detection           │
        │   /api/satellite/* ── satellite_monitor.py ── Google Earth Engine (Sentinel-2)      │
        └───────────────────────────────┬───────────────────────────┬───────────────────────┘
                                         │                           │
                              Google Gemini (Vision)       Google Earth Engine
                            object → risk/impact JSON      Sentinel-2 → NDCI/NDWI/NDVI/FDI
```

### Data flow — detection
1. User uploads an image/video in the AI Analyst Panel.
2. Flask runs YOLOv8 segmentation → object masks; each mask is cropped.
3. Each crop is sent to Gemini, which returns structured risk JSON.
4. The crop is copied into `frontend/public/detections/…` and the metadata is POSTed to
   `/api/detections`.
5. The dashboard, polling every 2 s, renders the new card automatically.

### Data flow — satellite
1. User enters a city / bounding box in the Satellite view.
2. Flask geocodes it and calls `satellite_monitor.py`.
3. GEE filters Sentinel-2 for that AOI + date range, computes indices, reduces to a time series.
4. The backend classifies pollution level + trend and returns it.
5. The dashboard charts the series and shows the status.

---

## 6. Technology stack

**Frontend**
- Next.js 16 + React 19 (App Router), TypeScript
- Tailwind CSS v4 + Radix UI primitives (shadcn-style components)
- Recharts (time-series charts), three.js / react-three-fiber (3D & shader visuals)
- HTML5 Canvas for the animated path visualizer
- In-memory `/api/detections` route (GET/POST/DELETE) for hackathon-speed live updates

**Backend**
- Flask + Flask-CORS (REST API, background job orchestration)
- Ultralytics **YOLOv8** segmentation & tracking (custom `best.pt` model) via OpenCV
- Google **Gemini** (`google-generativeai`, `gemini-2.5-flash`) for vision-based risk analysis
- Google **Earth Engine** (`ee`) over **Sentinel-2** imagery for pollution monitoring
- Pillow / NumPy for image handling; OpenStreetMap Nominatim for geocoding

---

## 7. Design choices worth knowing

- **Two-model split of labor.** YOLO answers *"where are the objects?"* fast and locally; Gemini
  answers *"what is this and how dangerous is it?"* with rich, human-readable context. Neither model
  alone gives both localization and actionable risk narrative.
- **Everything degrades gracefully.** No Gemini key → sensible default classification. No Earth Engine
  auth → realistic mock time series. No YOLO model / no detections → full-frame fallback classification.
  The demo never hard-fails, which matters under hackathon conditions.
- **Polling over sockets (for now).** The dashboard polls every 2 s instead of using WebSockets — dead
  simple and reliable for a prototype. Real-time streaming is on the roadmap.
- **In-memory store.** Detections live in memory for demo speed; a persistent DB + analytics is a
  post-hackathon step.

---

## 8. Roadmap

- Real-time ingest from RTSP feeds, USV/drone cameras, and live satellite frames.
- WebSocket/SSE live updates instead of polling.
- Persistent storage (Postgres/SQLite) + historical analytics.
- Geospatial heatmaps and time-lapse exploration of debris over time.
- On-device segmentation for low-connectivity, at-sea deployments.
- Closing the loop: feeding satellite FDI hotspots directly into the ROV path planner.

---

*"Protect the water that protects life."*
