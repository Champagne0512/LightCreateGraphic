import sys
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python tools/debug_snippet.py <path> [n] [enc]")
        return 2
    p = Path(sys.argv[1])
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 200
    enc = sys.argv[3] if len(sys.argv) > 3 else 'utf-8'
    b = p.read_bytes()
    try:
        s = b.decode(enc, 'strict')
        ok = True
    except Exception as e:
        s = b.decode(enc, 'replace')
        ok = False
    print('encoding', enc, 'strict_ok', ok, 'len_bytes', len(b))
    sn = s[:n]
    print(sn)
    print('codepoints:', [hex(ord(ch)) for ch in sn])
    print('FFFD count', s.count('\uFFFD'))

if __name__ == '__main__':
    main()
