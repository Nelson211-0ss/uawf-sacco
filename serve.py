"""Preview the site locally with clean addresses (/about instead of /about.html).

    python serve.py

then open http://localhost:8000. GitHub Pages serves /about from about.html
the same way, so what you see here matches the live site.
"""

import http.server
import os
import socketserver

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class CleanUrlHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        full = super().translate_path(path)
        if not os.path.exists(full) and os.path.exists(full + ".html"):
            return full + ".html"
        return full


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), CleanUrlHandler) as httpd:
        print("Serving the site at http://localhost:%d  (Ctrl+C to stop)" % PORT)
        httpd.serve_forever()
