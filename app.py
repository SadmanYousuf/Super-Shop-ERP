"""ERP Super Shop - Main Entry Point
Runs the Flask backend with all features.
"""
import os
import sys

# Import and run the Flask backend
sys.path.insert(0, os.path.dirname(__file__))
from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"============================================")
    print(f"  SUPER ERP SERVER STARTING")
    print(f"  Open: http://localhost:{port}/login.html")
    print(f"  Login: admin / admin123")
    print(f"============================================")
    app.run(host='0.0.0.0', port=port, debug=True)
