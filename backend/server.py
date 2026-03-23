import os
import sys

import uvicorn


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app import app


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3335)
