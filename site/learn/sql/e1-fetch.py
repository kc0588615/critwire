# q: e1-fetch
# status: ran
import hashlib
import http.client
import os
import time
import urllib.error
import urllib.request

WAITS = [1, 2, 4, 8]  # seconds before attempts 2 to 5
RETRY_AFTER_CAP = 60  # the longest wait a server's Retry-After can ask for here


def transient(error):
    """Worth another try: a rate limit (429), a server error (5xx), a dropped or cut connection. A 404 or 403 is not."""
    if isinstance(error, urllib.error.HTTPError):
        return error.code == 429 or error.code >= 500
    return isinstance(error, (urllib.error.URLError, ConnectionError, TimeoutError, http.client.HTTPException))


def wait_for(error, attempt):
    """Seconds to wait before the next attempt: the server's Retry-After, in seconds and up to the cap, else the backoff."""
    value = error.headers.get("Retry-After", "") if isinstance(error, urllib.error.HTTPError) else ""
    return min(int(value), RETRY_AFTER_CAP) if value.isdigit() else WAITS[attempt]


def describe(error):
    if isinstance(error, urllib.error.HTTPError):
        value = error.headers.get("Retry-After")
        return f"HTTP {error.code}" + (f", Retry-After {value}" if value else "")
    return str(error)


def fetch_file(url, path, size=None, sha256=None, log=lambda attempt, what: None):
    """Download url to path, whole. Each attempt writes a fresh path.part from its first byte, hashing as it arrives; a
    transient failure deletes the .part and starts the file again. Only a complete file whose size and sha256 equal
    what the publisher says (when given) gets its real name. Returns (bytes, sha256 hex)."""
    part = path + ".part"
    for attempt in range(len(WAITS) + 1):
        try:
            digest, got = hashlib.sha256(), 0
            with urllib.request.urlopen(url, timeout=60) as r, open(part, "wb") as f:
                declared = r.headers.get("Content-Length")
                for chunk in iter(lambda: r.read(1 << 20), b""):
                    digest.update(chunk)
                    got += len(chunk)
                    f.write(chunk)
            if declared is not None and got != int(declared):  # urllib returns a cut body without an error
                raise ConnectionError(f"body cut at {got} of {declared} bytes")
        except Exception as e:
            if os.path.exists(part):
                os.remove(part)
            if isinstance(e, urllib.error.HTTPError):
                e.close()
            if not transient(e) or attempt == len(WAITS):
                raise
            wait = wait_for(e, attempt)
            log(attempt + 1, f"{describe(e)}; again in {wait} s")
            time.sleep(wait)
            continue
        if (size is not None and got != size) or (sha256 is not None and digest.hexdigest() != sha256):
            os.remove(part)  # complete but not the publisher's file: retrying would fetch it again
            raise ValueError(f"{path}: {got} bytes, sha256 {digest.hexdigest()[:12]}; the publisher says "
                             f"{size}, {(sha256 or '?')[:12]}")
        os.replace(part, path)
        log(attempt + 1, f"{got} bytes")
        return got, digest.hexdigest()
