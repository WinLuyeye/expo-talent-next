"""Private HTTPS reverse-proxy backend. ClamAV daemon stays on the Docker network."""
import hashlib, hmac, json, os, socket, struct, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ.get('FILE_SCAN_TOKEN', '')
if len(TOKEN) < 32:
    raise RuntimeError('Configure a scanner token of at least 32 characters')
MAX_BYTES = 3 * 1024 * 1024
SLOTS = threading.BoundedSemaphore(4)


def scan(data):
    # INSTREAM: never exposes the daemon directly to public traffic.
    with socket.create_connection(('clamav', 3310), timeout=5) as conn:
        conn.settimeout(12)
        conn.sendall(b'zINSTREAM\0')
        for i in range(0, len(data), 65536):
            chunk = data[i:i+65536]
            conn.sendall(struct.pack('!I', len(chunk)) + chunk)
        conn.sendall(struct.pack('!I', 0))
        result = bytearray()
        while len(result) < 4096:
            part = conn.recv(1024)
            if not part:
                break
            result.extend(part)
            if b'\0' in part:
                break
        answer = bytes(result).split(b'\0', 1)[0].strip()
        if answer == b'stream: OK':
            return 'clean'
        if answer.startswith(b'stream: ') and answer.endswith(b' FOUND'):
            return 'infected'
        raise RuntimeError('Scanner unavailable or inconclusive')


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(20)

    def log_message(self, *_):
        pass  # No document names, contents, credentials or client addresses in logs.

    def reply(self, status, payload):
        body = json.dumps(payload, separators=(',', ':')).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != '/scan':
            return self.reply(404, {'verdict': 'error'})
        if not hmac.compare_digest(self.headers.get('Authorization', '').encode(), ('Bearer ' + TOKEN).encode()):
            return self.reply(401, {'verdict': 'error'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_BYTES or self.headers.get('Content-Type') != 'application/octet-stream':
            return self.reply(413, {'verdict': 'error'})
        if not SLOTS.acquire(blocking=False):
            return self.reply(503, {'verdict': 'error'})
        try:
            data = self.rfile.read(length)
            if len(data) != length:
                return self.reply(400, {'verdict': 'error'})
            self.reply(200, {'verdict': scan(data), 'sha256': hashlib.sha256(data).hexdigest()})
        except (OSError, RuntimeError, ValueError):
            try:
                self.reply(503, {'verdict': 'error'})
            except OSError:
                pass
        finally:
            SLOTS.release()


if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', 8787), Handler).serve_forever()
