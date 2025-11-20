import sys
from pathlib import Path

p = Path('pages/index/index.wxml')
b = p.read_bytes()
s = b.decode('utf-8', 'strict')
print('len', len(s))
key = 'text class="app-tagline"'
i = s.find(key)
print('key index', i)
if i != -1:
    print(s[i-40:i+120])
    snippet = s[i-20:i+40]
    print([hex(ord(ch)) for ch in snippet])
else:
    print('key not found')

