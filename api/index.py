import sys
import os

# Add apps/api directory to sys.path so FastAPI imports work
apps_api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))
if apps_api_dir not in sys.path:
    sys.path.insert(0, apps_api_dir)

from main import app
