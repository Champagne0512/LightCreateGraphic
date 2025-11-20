import os
import re

def main():
    bad = []
    for root, _, files in os.walk('.'):
        for f in files:
            if f.endswith('.wxml'):
                p = os.path.join(root, f)
                s = open(p, 'r', encoding='utf-8', errors='strict').read()
                for m in re.finditer(r'(^|[^<])/text>', s):
                    bad.append((p, s[max(0, m.start()-30):m.end()+30].replace('\n',' ')))
    print('Found', len(bad), 'suspicious closing </text> without < in front:')
    for p, sn in bad[:30]:
        print('BAD', p)
        print('   ', sn)

if __name__ == '__main__':
    main()

