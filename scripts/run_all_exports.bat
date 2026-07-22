@echo off
cd /d "C:\Users\arjun\OneDrive\Programming\Projects\cftc-dashboard\scripts"

echo Running CFTC Dashboard Exports...
echo.

echo [1/3] Exporting COT Spreads data...
python export_cot_spreads.py

echo.
echo [2/3] Exporting COT vs Price data...
python export_cot_vs_price.py

echo.
echo [3/3] Scraping Matif COT data...
python scrape_matif_cot.py

echo.
echo All exports complete!
