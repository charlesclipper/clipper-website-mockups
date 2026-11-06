#!/usr/bin/env python3
"""Share identical static assets across published mockup versions.

Content is identified by SHA-256, never by filename. Each unique payload is
stored once at:

    shared/<sha256[:2]>/<sha256>/<original-basename>

Pages stay at their existing version URLs. HTML, CSS, and JS stay in place;
only their local asset URLs are rewritten to a relative path that reaches the
shared file from that document. Absolute http(s) URLs, fragment-only URLs,
and links to HTML pages are left alone.

Running this again is safe. Assets already in shared/ stay there, and a newly
added version directory is folded into the same pool.

Usage:
    python3 tools/share_assets.py
    python3 tools/share_assets.py --check
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SKIP_DIRS = {".git", "clipper-site", "tools", "__pycache__"}
ASSET_EXT = {
    ".avif", ".css", ".eot", ".gif", ".ico", ".jpeg", ".jpg", ".mp3", ".mp4",
    ".otf", ".pdf", ".png", ".svg", ".ttf", ".webm", ".webp", ".woff", ".woff2",
}
# Stylesheets are rewritten in place. They are not moved, because their
# url() paths are relative to the stylesheet's own directory.
DOCUMENT_EXT = {".html", ".css", ".js", ".svg", ".xml", ".webmanifest", ".json"}
MOVE_EXT = ASSET_EXT - {".css"}
CHUNK = 1024 * 1024


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        while True:
            block = fh.read(CHUNK)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def walk_files():
    for dirpath, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for name in files:
            yield os.path.join(dirpath, name)


def rel(path: str) -> str:
    return os.path.relpath(path, ROOT).replace(os.sep, "/")


def is_under(path: str) -> bool:
    try:
        return os.path.commonpath([ROOT, os.path.abspath(path)]) == ROOT
    except ValueError:
        return False


def classify_svg(path: str) -> str:
    """Return 'asset' when the SVG does not point at another file."""
    try:
        text = open(path, "r", encoding="utf-8", errors="replace").read()
    except OSError:
        return "asset"
    for match in re.finditer(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)|href\s*=\s*(['"])([^'"]+)\3""", text, re.I):
        target = match.group(2) or match.group(4) or ""
        target = target.strip()
        if not target or target.startswith("#") or target.startswith("data:"):
            continue
        return "document"
    return "asset"


def shared_dest(digest: str, basename: str) -> str:
    return os.path.join(ROOT, "shared", digest[:2], digest, basename)


def choose_basename(names: list[str]) -> str:
    brochure = [n for n in names if n.lower().endswith(".pdf") and "brochure" in n.lower()]
    pool = brochure or names
    counts = defaultdict(int)
    for name in pool:
        counts[name] += 1
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]


def split_url(raw: str):
    raw = raw.strip()
    for sep in ("#", "?"):
        if sep in raw:
            path, suffix = raw.split(sep, 1)
            return path, sep + suffix
    return raw, ""


def resolve_url(doc_path: str, raw: str):
    path, suffix = split_url(raw.strip())
    if not path:
        return None
    lower = path.lower()
    if lower.startswith(("http://", "https://", "//", "data:", "mailto:", "tel:", "javascript:", "#")):
        return None
    if path.startswith("/"):
        return None
    full = os.path.normpath(os.path.join(os.path.dirname(doc_path), path))
    if not is_under(full) or not os.path.isfile(full):
        return None
    ext = os.path.splitext(full)[1].lower()
    if ext not in MOVE_EXT:
        return None
    return full, suffix


def iter_candidates(text: str):
    """Yield (start, end, raw_url) spans that might be local asset URLs."""
    covered = []

    def overlaps(start, end):
        return any(not (end <= a or start >= b) for a, b in covered)

    def take(start, end, raw):
        if overlaps(start, end):
            return
        covered.append((start, end))
        yield_list.append((start, end, raw))

    yield_list = []
    for match in re.finditer(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)""", text, re.I):
        take(match.start(2), match.end(2), match.group(2))
    for match in re.finditer(r"""srcset\s*=\s*(['"])(.*?)\1""", text, re.I | re.S):
        body_start = match.start(2)
        body = match.group(2)
        offset = 0
        for part in body.split(","):
            leading = len(part) - len(part.lstrip())
            token = part.strip().split()
            if not token:
                offset += len(part) + 1
                continue
            url = token[0]
            idx = part.find(url, leading if False else 0)
            if idx < 0:
                offset += len(part) + 1
                continue
            start = body_start + offset + idx
            take(start, start + len(url), url)
            offset += len(part) + 1
    attr = re.compile(
        r"""\b(?:src|href|poster)\s*=\s*(['"])([^'"]+)\1""",
        re.I,
    )
    for match in attr.finditer(text):
        take(match.start(2), match.end(2), match.group(2))
    string_re = re.compile(
        r"""(?<![A-Za-z0-9_])(['"])([^'"]+\.(?:avif|gif|ico|jpe?g|pdf|png|svg|ttf|webp|woff2?))\1""",
        re.I,
    )
    for match in string_re.finditer(text):
        take(match.start(2), match.end(2), match.group(2))
    yield_list.sort()
    for item in yield_list:
        yield item


def normalize(text: str, doc_path: str, path_hash: dict[str, str]) -> str:
    pieces = []
    cursor = 0
    for start, end, raw in iter_candidates(text):
        resolved = resolve_url(doc_path, raw)
        if not resolved:
            continue
        full, suffix = resolved
        digest = path_hash.get(full)
        if not digest:
            continue
        pieces.append(text[cursor:start])
        pieces.append("sha256:" + digest + suffix)
        cursor = end
    pieces.append(text[cursor:])
    return "".join(pieces)


def publish_bytes() -> int:
    total = 0
    for path in walk_files():
        total += os.path.getsize(path)
    return total


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="verify only; do not rewrite")
    parser.add_argument("--report", default="/opt/cursor/artifacts/v79-dedup/share-report.json")
    args = parser.parse_args()

    print("hashing assets", flush=True)
    assets = []
    documents = []
    for path in walk_files():
        ext = os.path.splitext(path)[1].lower()
        if ext == ".svg":
            kind = classify_svg(path)
            if kind == "asset":
                assets.append(path)
            else:
                documents.append(path)
            continue
        if ext in MOVE_EXT:
            assets.append(path)
        elif ext in DOCUMENT_EXT:
            documents.append(path)

    by_hash = defaultdict(list)
    path_hash = {}
    manifest = []
    for index, path in enumerate(assets, 1):
        digest = sha256_file(path)
        path_hash[path] = digest
        by_hash[digest].append(path)
        manifest.append({"path": rel(path), "sha256": digest, "size": os.path.getsize(path)})
        if index % 2000 == 0:
            print(f"  hashed {index}/{len(assets)}", flush=True)
    print(f"assets {len(assets)} unique {len(by_hash)} documents {len(documents)}", flush=True)

    before_pages = sorted(rel(p) for p in documents if p.endswith(".html"))
    before_bytes = publish_bytes()
    print("normalizing documents", flush=True)
    before_norm = {}
    broken = []
    for path in documents:
        text = open(path, "r", encoding="utf-8", newline="").read()
        before_norm[path] = hashlib.sha256(normalize(text, path, path_hash).encode("utf-8")).hexdigest()
        for _start, _end, raw in iter_candidates(text):
            path_part, _suffix = split_url(raw.strip())
            ext = os.path.splitext(path_part.split("?")[0])[1].lower()
            if ext not in MOVE_EXT:
                continue
            if path_part.lower().startswith(("http://", "https://", "//", "data:")):
                continue
            resolved = resolve_url(path, raw)
            if resolved is None and not path_part.startswith(("#", "/")):
                broken.append({"document": rel(path), "url": raw.strip()[:180]})

    names_for = {digest: [os.path.basename(p) for p in paths] for digest, paths in by_hash.items()}
    dest_for = {}
    for digest, paths in by_hash.items():
        dest_for[digest] = shared_dest(digest, choose_basename(names_for[digest]))

    report = {
        "beforeBytes": before_bytes,
        "assetFiles": len(assets),
        "uniquePayloads": len(by_hash),
        "uniqueBytes": sum(os.path.getsize(paths[0]) for paths in by_hash.values()),
        "htmlPages": len(before_pages),
        "preexistingUnresolved": broken,
    }
    os.makedirs(os.path.dirname(args.report), exist_ok=True)
    baseline = os.path.join(os.path.dirname(args.report), "baseline-manifest.jsonl")
    with open(baseline, "w", encoding="utf-8") as fh:
        for row in manifest:
            fh.write(json.dumps(row) + "\n")

    if args.check:
        missing = []
        for path in documents:
            text = open(path, "r", encoding="utf-8", errors="surrogateescape").read()
            for _s, _e, raw in iter_candidates(text):
                resolved = resolve_url(path, raw)
                if resolved is None:
                    continue
                full, _suffix = resolved
                digest = sha256_file(full)
                expected = path_hash.get(full)
                if expected and digest != expected:
                    missing.append(rel(path) + " -> " + rel(full))
        report["byteMismatches"] = missing
        with open(args.report, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2)
        print(json.dumps({k: report[k] for k in report if k != "preexistingUnresolved"}, indent=2))
        return 1 if missing else 0

    print("writing shared payloads", flush=True)
    written = 0
    for digest, paths in by_hash.items():
        dest = dest_for[digest]
        if os.path.isfile(dest) and sha256_file(dest) == digest:
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        source = paths[0]
        with open(source, "rb") as src, open(dest, "wb") as out:
            while True:
                block = src.read(CHUNK)
                if not block:
                    break
                out.write(block)
        written += 1
    print(f"  new shared files {written}", flush=True)

    for digest, dest in dest_for.items():
        path_hash[dest] = digest
    print("rewriting references", flush=True)
    changed_docs = 0
    introduced = []
    after_norm = {}
    for path in documents:
        text = open(path, "r", encoding="utf-8", newline="").read()
        replacements = []
        for start, end, raw in iter_candidates(text):
            resolved = resolve_url(path, raw)
            if not resolved:
                continue
            full, suffix = resolved
            digest = path_hash.get(full)
            if not digest:
                continue
            dest = dest_for[digest]
            new_url = os.path.relpath(dest, os.path.dirname(path)).replace(os.sep, "/") + suffix
            if text[start:end] != new_url:
                replacements.append((start, end, new_url))
        if replacements:
            chars = list(text)
            for start, end, new_url in reversed(replacements):
                chars[start:end] = list(new_url)
            new_text = "".join(chars)
            with open(path, "w", encoding="utf-8", newline="") as fh:
                fh.write(new_text)
            changed_docs += 1
        else:
            new_text = text
        after_norm[path] = hashlib.sha256(normalize(new_text, path, path_hash).encode("utf-8")).hexdigest()
        if after_norm[path] != before_norm[path]:
            introduced.append(rel(path))

    print("removing duplicate payloads", flush=True)
    removed = 0
    removed_bytes = 0
    for path, digest in path_hash.items():
        dest = dest_for[digest]
        if os.path.abspath(path) == os.path.abspath(dest):
            continue
        if not os.path.isfile(path):
            continue
        if sha256_file(dest) != digest:
            introduced.append("shared-mismatch " + rel(dest))
            continue
        removed_bytes += os.path.getsize(path)
        os.remove(path)
        removed += 1
    # Drop directories that no longer hold files.
    for dirpath, dirs, files in os.walk(ROOT, topdown=False):
        if any(part in SKIP_DIRS or part.startswith(".") for part in dirpath.split(os.sep)):
            continue
        if dirpath == ROOT:
            continue
        if not dirs and not files:
            try:
                os.rmdir(dirpath)
            except OSError:
                pass

    after_pages = sorted(
        rel(p) for p in walk_files() if p.endswith(".html")
    )
    after_bytes = publish_bytes()
    pdf_rows = [row for row in manifest if row["path"].endswith("Clipper-Aviation-AltitudeAccess-Brochure.pdf")]
    pdf_hashes = sorted({row["sha256"] for row in pdf_rows})
    report.update({
        "afterBytes": after_bytes,
        "savedBytes": before_bytes - after_bytes,
        "documentsRewritten": changed_docs,
        "duplicatesRemoved": removed,
        "removedBytes": removed_bytes,
        "normalizedMismatches": introduced,
        "pagesBefore": len(before_pages),
        "pagesAfter": len(after_pages),
        "pagesMissing": sorted(set(before_pages) - set(after_pages)),
        "pagesAdded": sorted(set(after_pages) - set(before_pages)),
        "brochureCopies": len(pdf_rows),
        "brochureHashes": pdf_hashes,
        "brochureBytes": sorted({row["size"] for row in pdf_rows}),
        "preexistingUnresolvedCount": len(broken),
    })
    with open(args.report, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
        fh.write("\n")
    print(json.dumps({k: report[k] for k in (
        "beforeBytes", "afterBytes", "savedBytes", "uniquePayloads", "uniqueBytes",
        "documentsRewritten", "duplicatesRemoved", "normalizedMismatches",
        "pagesMissing", "brochureHashes", "brochureBytes", "preexistingUnresolvedCount",
    )}, indent=2))
    return 1 if introduced or report["pagesMissing"] else 0


if __name__ == "__main__":
    sys.exit(main())
