@echo off
cd /d "%~dp0"
echo ============================================
echo   SUPER ERP - Starting Server
echo ============================================
echo.
echo Starting Flask backend on http://localhost:5000
echo.
echo Login credentials:
echo   Admin:      admin / admin123
echo   SuperAdmin: superadmin / super123
echo   Manager:    manager / manager123
echo   Cashier:    cashier / cashier123
echo   Warehouse:  ware / ware123
echo   Account:    account / account123
echo.
echo Opening browser...
start http://localhost:5000/login.html
echo.
python run_backend.py
pause
