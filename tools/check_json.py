import json
import os

def main():
    ok = 0
    err = 0
    for root, _, files in os.walk('.'):
        for f in files:
            if f.endswith('.json'):
                p = os.path.join(root, f)
                try:
                    with open(p, 'r', encoding='utf-8') as fh:
                        json.load(fh)
                    print('OK', p)
                    ok += 1
                except Exception as e:
                    print('ERR', p, e)
                    err += 1
    print('Checked', ok, 'OK and', err, 'errors')

if __name__ == '__main__':
    main()

