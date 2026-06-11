import sys
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

BASE_DIR = Path(__file__).resolve().parent
BACKEND_MAIN = BASE_DIR / "src" / "backend" / "main.py"
BACKEND_DIR = BACKEND_MAIN.parent
sys.path.insert(0, str(BACKEND_DIR))

spec = spec_from_file_location("backend_main", BACKEND_MAIN)
backend_main = module_from_spec(spec)
sys.modules[spec.name] = backend_main
spec.loader.exec_module(backend_main)

app = backend_main.app
