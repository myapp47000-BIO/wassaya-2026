"""Build a self-contained index.html (CSS + JS inlined) for GitHub Pages.

Usage: python build_single_file.py
Output: DEPLOY_SINGLE_FILE/index.html
Upload only that file over the existing index.html in the repository root.
"""
from pathlib import Path
import base64
import re

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "DEPLOY_SINGLE_FILE"
OUT.mkdir(exist_ok=True)

html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "css/style.css").read_text(encoding="utf-8")
data = (ROOT / "js/data.js").read_text(encoding="utf-8")
app = (ROOT / "js/app.js").read_text(encoding="utf-8")

# Guard against prematurely closing inline script/style blocks.
data = data.replace("</script", "<\\/script")
app = app.replace("</script", "<\\/script")
css = css.replace("</style", "<\\/style")

# The single-file build has no separate sw.js to register.
app = app.replace(
    '  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {\n'
    '    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));\n'
    '  }\n',
    '  // النسخة المفردة لا تسجّل service worker منفصلاً.\n'
)

# Inline stylesheet.
html = html.replace('<link rel="stylesheet" href="css/style.css?v=1.1.0">',
                    "<style>\n" + css + "\n</style>")

# Inline icons as data URIs so no icons/ folder is needed for the page itself.
def b64(path):
    return base64.b64encode((ROOT / path).read_bytes()).decode("ascii")

icon32 = "data:image/png;base64," + b64("icons/favicon-32.png")
icon192 = "data:image/png;base64," + b64("icons/icon-192.png")
html = re.sub(r'  <link rel="icon"[^>]*>\n', "", html)
html = re.sub(r'  <link rel="apple-touch-icon"[^>]*>\n', "", html)
html = html.replace('  <meta name="theme-color" content="#0d5548">',
                    '  <meta name="theme-color" content="#0d5548">\n'
                    f'  <link rel="icon" type="image/png" href="{icon32}">\n'
                    f'  <link rel="apple-touch-icon" href="{icon192}">')

# Inline scripts.
html = html.replace('  <script src="js/data.js?v=1.1.0"></script>\n  <script src="js/app.js?v=1.1.0"></script>',
                    "  <script>\n" + data + "\n  </script>\n"
                    "  <script>\n" + app + "\n  </script>")

target = OUT / "index.html"
target.write_text(html, encoding="utf-8")
print("written:", target)
print("size:", len(html.encode("utf-8")), "bytes")
