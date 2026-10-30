# q: e1-ex
# status: ran
# after: e1-fetch
import email.message
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime


def retry_after(value, now):
    """Seconds a Retry-After asks for, as a number of seconds or as an HTTP date, kept between 0 and the cap;
    None when it is neither."""
    if value.isdigit():
        seconds = int(value)
    else:
        try:
            when = parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return None
        seconds = (when - now).total_seconds()
    return int(min(max(seconds, 0), RETRY_AFTER_CAP))


def wait_for(error, attempt, now=None):
    """e1-fetch's rule with both forms: the server's wait when it gives one that can be read, else the backoff."""
    value = error.headers.get("Retry-After") if isinstance(error, urllib.error.HTTPError) else None
    seconds = retry_after(value, now or datetime.now(timezone.utc)) if value else None
    return WAITS[attempt] if seconds is None else seconds


NOW = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)
for code, value in [(429, "1"), (503, "Thu, 29 Oct 2026 12:00:30 GMT"), (503, "Thu, 29 Oct 2026 11:00:00 GMT"),
                    (503, "3600"), (503, "soon"), (404, None)]:
    headers = email.message.Message()
    if value is not None:
        headers["Retry-After"] = value
    error = urllib.error.HTTPError("https://example.org/file", code, "", headers, None)
    shown = f"HTTP {code}" + (f", Retry-After {value!r}" if value else "")
    print(f"{shown}: " + (f"again in {wait_for(error, 0, NOW)} s" if transient(error) else "not retried"))
