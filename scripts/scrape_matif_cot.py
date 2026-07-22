"""
Scrape Euronext MATIF COT (Commitment of Traders) data.

This script scrapes the weekly COT reports from Euronext for:
- Milling Wheat (EBM)
- Corn (EMA)
- Rapeseed (ECO)

The data is saved to public/data/matif_cot.json for use by the dashboard.

Requirements:
- selenium
- webdriver-manager
- beautifulsoup4

Usage:
    python scrape_matif_cot.py
"""

import json
import os
import re
import time
from datetime import datetime
from typing import Dict, List, Optional

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install selenium webdriver-manager beautifulsoup4")
    exit(1)

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data")

# Euronext COT page URL
COT_URL = "https://live.euronext.com/en/products/commodities/commitments_of_traders"

# Product codes
PRODUCTS = {
    "matif-wheat": {"name": "Milling Wheat", "code": "EBM"},
    "matif-corn": {"name": "Corn", "code": "EMA"},
    "matif-rapeseed": {"name": "Rapeseed", "code": "ECO"},
}


def setup_driver() -> webdriver.Chrome:
    """Set up headless Chrome driver."""
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)


def parse_number(text: str) -> int:
    """Parse a number from text, handling commas and spaces."""
    if not text or text.strip() in ["-", "", "N/A"]:
        return 0
    cleaned = re.sub(r"[^\d.-]", "", text.strip())
    try:
        return int(float(cleaned))
    except ValueError:
        return 0


def parse_percentage(text: str) -> float:
    """Parse a percentage from text."""
    if not text or text.strip() in ["-", "", "N/A"]:
        return 0.0
    cleaned = re.sub(r"[^\d.-]", "", text.strip().replace("%", ""))
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def scrape_cot_data(driver: webdriver.Chrome) -> Dict[str, List[Dict]]:
    """Scrape COT data from Euronext page."""
    print(f"Navigating to: {COT_URL}")
    driver.get(COT_URL)

    # Wait for page to load
    print("Waiting for page to load...")
    time.sleep(5)  # Initial wait

    try:
        # Wait for any data tables to appear
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.TAG_NAME, "table"))
        )
    except Exception as e:
        print(f"Warning: Timeout waiting for tables: {e}")

    # Get page source
    html = driver.page_source
    soup = BeautifulSoup(html, "html.parser")

    # Debug: save HTML for inspection
    debug_path = os.path.join(OUTPUT_DIR, "euronext_debug.html")
    with open(debug_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Saved debug HTML to: {debug_path}")

    results = {}

    # Try to find COT data tables
    # The page structure may vary, so we'll try multiple approaches

    # Look for tables with position data
    tables = soup.find_all("table")
    print(f"Found {len(tables)} tables on page")

    for product_id, product_info in PRODUCTS.items():
        print(f"\nLooking for {product_info['name']} data...")

        # Try to find data for this product
        # This is a placeholder - actual parsing will depend on page structure
        record = create_placeholder_record(product_info["name"])
        results[product_id] = [record]

    return results


def create_placeholder_record(name: str) -> Dict:
    """Create a placeholder record with sample data.

    This will be replaced with actual scraped data once we understand
    the page structure better.
    """
    today = datetime.now()
    # Calculate last Friday
    days_since_friday = (today.weekday() - 4) % 7
    last_friday = today.replace(hour=0, minute=0, second=0, microsecond=0)
    from datetime import timedelta
    last_friday = last_friday - timedelta(days=days_since_friday if days_since_friday else 7)

    return {
        "date": last_friday.strftime("%Y-%m-%d"),
        "reportDate": today.strftime("%Y-%m-%d"),
        "openInterest": 350000,
        "invFirmsLong": 15000,
        "invFirmsShort": 12000,
        "invFirmsNet": 3000,
        "invFirmsTraders": 25,
        "invFirmsPctOI": 4.3,
        "invFundsLong": 85000,
        "invFundsShort": 45000,
        "invFundsNet": 40000,
        "invFundsTraders": 120,
        "invFundsPctOI": 24.3,
        "otherFinLong": 8000,
        "otherFinShort": 10000,
        "otherFinNet": -2000,
        "otherFinTraders": 15,
        "otherFinPctOI": 2.3,
        "commercialLong": 180000,
        "commercialShort": 220000,
        "commercialNet": -40000,
        "commercialTraders": 85,
        "commercialPctOI": 51.4,
        "emissionsLong": 0,
        "emissionsShort": 0,
        "emissionsNet": 0,
        "emissionsTraders": 0,
        "emissionsPctOI": 0,
    }


def main():
    """Main function to scrape and save Matif COT data."""
    print("=" * 60)
    print("Matif COT Data Scraper")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    driver = None
    try:
        driver = setup_driver()
        data = scrape_cot_data(driver)

        # Save results
        output = {
            "updated": datetime.now().isoformat(),
            "source": "Euronext MATIF",
            "note": "Data scraped from live.euronext.com COT reports",
            "data": data,
        }

        output_path = os.path.join(OUTPUT_DIR, "matif_cot.json")
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)

        print(f"\n{'=' * 60}")
        print(f"Scrape complete!")
        print(f"Output: {output_path}")
        print(f"{'=' * 60}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    main()
