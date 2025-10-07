# """Utilities for extracting images from shared Google Photos albums."""
# 
# from __future__ import annotations
# 
# import re
# import time
# from html import unescape
# from typing import Dict, List
# from urllib.error import HTTPError, URLError
# from urllib.request import Request, urlopen
# 
# _CACHE_TTL_SECONDS = 3600
# _DEFAULT_MAX_IMAGES = 50
# _USER_AGENT = (
#     "Mozilla/5.0 (compatible; WanderLog/1.0; +https://github.com/)"
# )
# 
# _CacheEntry = tuple[float, List[str]]
# _CACHE: Dict[str, _CacheEntry] = {}
# 
# 
# def _clean_url(url: str) -> str:
#     if not isinstance(url, str):
#         return ""
#     return url.strip()
# 
# 
# def _fetch_html(url: str) -> str:
#     if not url:
#         return ""
# 
#     request = Request(url, headers={"User-Agent": _USER_AGENT})
#     try:
#         with urlopen(request, timeout=15) as response:  # nosec: trusted domain
#             content_bytes = response.read()
#     except (HTTPError, URLError, TimeoutError):
#         return ""
#     except Exception:
#         return ""
# 
#     try:
#         return content_bytes.decode("utf-8", errors="replace")
#     except Exception:
#         return ""
# 
# 
# def _normalise_resolution(url: str) -> str:
#     if not url:
#         return ""
# 
#     updated = re.sub(r"=w\d+", "=w2048", url)
#     updated = re.sub(r"-w\d+", "-w2048", updated)
#     updated = re.sub(r"-h\d+", "-h2048", updated)
#     updated = re.sub(r"=s\d+", "=s2048", updated)
#     if "=" not in updated:
#         updated = f"{updated}=w2048"
#     return updated
# 
# 
# def _extract_image_urls(html: str, *, max_images: int) -> List[str]:
#     if not html:
#         return []
# 
#     normalised = unescape(html)
#     normalised = (
#         normalised
#         .replace("\\u003d", "=")
#         .replace("\\u0026", "&")
#         .replace("\\u002f", "/")
#     )
# 
#     pattern = re.compile(r"(?:https?:)?//lh3\.googleusercontent\.com/[^\s\"']+")
#     matches = pattern.findall(normalised)
# 
#     results: List[str] = []
#     seen_bases = set()
#     for match in matches:
#         candidate = match.split("\\")[0]
#         candidate = candidate.split('"')[0]
#         if candidate.startswith("//"):
#             candidate = f"https:{candidate}"
#         base = candidate.split("=")[0]
#         if base in seen_bases:
#             continue
#         seen_bases.add(base)
#         results.append(_normalise_resolution(candidate))
#         if len(results) >= max_images:
#             break
# 
#     return results
# 
# 
# def fetch_album_images(url: str, *, max_images: int = _DEFAULT_MAX_IMAGES) -> List[str]:
#     """Return a list of high-resolution image URLs for a shared album."""
# 
#     cleaned_url = _clean_url(url)
#     if not cleaned_url:
#         return []
# 
#     cache_entry = _CACHE.get(cleaned_url)
#     now = time.time()
#     if cache_entry and now - cache_entry[0] < _CACHE_TTL_SECONDS:
#         return list(cache_entry[1])
# 
#     html = _fetch_html(cleaned_url)
#     images = _extract_image_urls(html, max_images=max_images)
# 
#     _CACHE[cleaned_url] = (now, images)
#     return list(images)
