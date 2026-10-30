# q: e1-retry
# status: ran
# after: e1-fetch
import http.server
import threading

BODY = bytes(range(256)) * 400  # 102,400 bytes of made-up data
SCRIPT = ["cut", "429", "whole"]  # what the server does with each request, in order


class Flaky(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        step = SCRIPT.pop(0)
        if step == "429":
            self.send_response(429)
            self.send_header("Retry-After", "1")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Length", str(len(BODY)))
        self.end_headers()
        self.wfile.write(BODY if step == "whole" else BODY[:40_000])  # "cut": the connection closes 40,000 bytes in

    def log_message(self, *args):
        pass  # no request log on stderr


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Flaky)  # port 0: the system picks a free one
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    url = f"http://127.0.0.1:{server.server_port}/flaky.bin"
    got, digest = fetch_file(url, "flaky.bin", len(BODY), hashlib.sha256(BODY).hexdigest(),
                             log=lambda attempt, what: print(f"attempt {attempt}: {what}"))
finally:
    server.shutdown()
    server.server_close()
print(f"flaky.bin: {got} bytes, sha256 {digest[:12]}; .part left: {os.path.exists('flaky.bin.part')}")
