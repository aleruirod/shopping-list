import py_compile
import glob
import sys

files = glob.glob('src/backend/**/*.py', recursive=True)
if not files:
    print('No backend files found')
    sys.exit(1)
failed = False
for f in files:
    try:
        py_compile.compile(f, doraise=True)
        print('OK', f)
    except Exception as e:
        print('ERROR', f, e)
        failed = True
if failed:
    sys.exit(2)
print('All files compiled successfully')
