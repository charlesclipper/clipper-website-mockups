# Shared assets

Published mockups stay at `v1/` through `v79/` (and `altitudeaccess/`). Identical images, fonts, and brochures are stored once under `shared/<sha256>/` and pages point at that file. The match is the file bytes, not the filename.

After adding a future version directory, from the repository root:

```bash
python3 tools/share_assets.py
```

Run it again any time. A second run does not rewrite pages that already point at the pool. Then check every page and asset on a local server that mounts this repo at `/clipper-website-mockups/` before opening a pull request. GitHub Pages publishes the whole checkout, so the tree of regular files (and a tar of that tree) needs to stay under 1 GB. Do not change the Pages workflow to do this.
