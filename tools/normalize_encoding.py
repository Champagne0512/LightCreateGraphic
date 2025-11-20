import sys
from pathlib import Path

TEXT_EXTS = {".wxml", ".wxss", ".js", ".json", ".md", ".sql", ".ts", ".jsx", ".tsx", ".txt"}

def detect_bom(b: bytes) -> str:
    if b.startswith(b"\xef\xbb\xbf"): return "UTF8-BOM"
    if b.startswith(b"\xff\xfe"): return "UTF-16LE-BOM"
    if b.startswith(b"\xfe\xff"): return "UTF-16BE-BOM"
    return ""

def is_text(p: Path) -> bool:
    return p.suffix.lower() in TEXT_EXTS

def strip_bom_and_normalize(p: Path) -> bool:
    b = p.read_bytes()
    bom = detect_bom(b)
    changed = False
    if bom:
        if bom == "UTF8-BOM":
            b = b[3:]
            changed = True
        elif bom in ("UTF-16LE-BOM", "UTF-16BE-BOM"):
            # Convert UTF-16 to UTF-8
            enc = "utf-16le" if bom == "UTF-16LE-BOM" else "utf-16be"
            s = b.decode(enc)
            b = s.encode("utf-8")
            changed = True
    # Normalize line endings to LF for source files
    if p.suffix.lower() in {".wxml", ".wxss", ".js", ".json", ".md", ".sql"}:
        s = b.decode("utf-8", errors="strict")
        s2 = s.replace("\r\n", "\n").replace("\r", "\n")
        if s2 != s:
            b = s2.encode("utf-8")
            changed = True
    if changed:
        p.write_bytes(b)
    return changed

def main() -> int:
    root = Path('.')
    changed_files = []
    for p in root.rglob('*'):
        if p.is_file() and is_text(p):
            try:
                if strip_bom_and_normalize(p):
                    changed_files.append(str(p))
            except Exception as e:
                print(f"WARN: failed {p}: {e}")
    print("Changed:")
    for f in changed_files:
        print(f)
    print(f"Total changed: {len(changed_files)}")
    return 0

if __name__ == '__main__':
    sys.exit(main())

