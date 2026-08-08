@echo off
title Desire Tender Intelligence - Python FastAPI Backend Server
echo ====================================================================
echo  DESIRE TENDER INTELLIGENCE SYSTEM - FASTAPI PYTHON BACKEND
echo ====================================================================
echo.
echo Checking Python environment & installing required dependencies...
python -m pip install -r requirements.txt
echo.
echo Starting FastAPI Backend Server on http://localhost:8000 ...
echo Interactive Swagger API Documentation: http://localhost:8000/docs
echo ====================================================================
python -m uvicorn main:app --reload --port 8000
pause
