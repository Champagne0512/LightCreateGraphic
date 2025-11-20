import os
from pathlib import Path
import sys

try:
    import chardet  # type: ignore
except Exception:
    chardet = None

TEXT_EXTS = {
    ".wxml", ".wxss", ".js", ".json", ".md", ".sql", ".ts", ".jsx", ".tsx", ".txt"
}

def detect_bytes_bom(b: bytes) -> str:
    if b.startswith(b"\xef\xbb\xbf"):
        return "UTF8-BOM"
    if b.startswith(b"\xff\xfe"):
        return "UTF-16LE-BOM"
    if b.startswith(b"\xfe\xff"):
        return "UTF-16BE-BOM"
    return ""

def is_text_path(p: Path) -> bool:
    return p.suffix.lower() in TEXT_EXTS

def main(root: str = ".") -> int:
    rootp = Path(root)
    rows = []
    for p in rootp.rglob("*"):
        if not p.is_file():
            continue
        if not is_text_path(p):
            continue
        b = p.read_bytes()
        bom = detect_bytes_bom(b)
        enc_guess = ""
        conf = 0.0
        if chardet is not None:
            det = chardet.detect(b)
            enc_guess = (det.get("encoding") or "").upper()
            conf = float(det.get("confidence") or 0.0)
        # Try quick UTF-8 decode check
        try:
            s = b.decode("utf-8")
            utf8_ok = True
        except UnicodeDecodeError:
            utf8_ok = False
        rows.append((str(p), len(b), bom, utf8_ok, enc_guess, conf))
    # Print header
    print("PATH\tSIZE\tBOM\tUTF8_OK\tGUESS\tCONF")
    for r in rows:
        print("\t".join([
            r[0], str(r[1]), r[2] or "-", "Y" if r[3] else "N", r[4] or "-", f"{r[5]:.2f}"
        ]))
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "."))

