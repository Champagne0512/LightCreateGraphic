import esprima  # type: ignore
import os

def main():
    errs = []
    for root, _, files in os.walk('.'):
        for f in files:
            if f.endswith('.js'):
                p = os.path.join(root, f)
                try:
                    with open(p, 'r', encoding='utf-8') as fh:
                        src = fh.read()
                    esprima.parseScript(src)
                except Exception as e:
                    errs.append((p, str(e)))
    print('JS files with parse errors:', len(errs))
    for p, e in errs:
        print('ERR', p)
        print('   ', e)

if __name__ == '__main__':
    main()

