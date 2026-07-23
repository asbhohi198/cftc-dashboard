"""
Scrape Euronext MATIF COT (Commitment of Traders) historical data.

Downloads weekly COT reports from Euronext for:
- Milling Wheat (EBM)
- Corn/Maize (EMA)
- Rapeseed (ECO)

URL format: https://live.euronext.com/sites/default/files/commodities_reporting/YYYY/MM/DD/en/cdwpr_{PRODUCT}_{YYYYMMDD}.html

Reports are published on Wednesdays, reflecting Friday position data.

Usage:
    python scrape_matif_cot.py
"""

import json
import os
import re
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from html.parser import HTMLParser

# Output directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..", "public", "data")

# Product codes
PRODUCTS = {
    "matif-wheat": "EBM",
    "matif-corn": "EMA",
    "matif-rapeseed": "ECO",
}

# Start date for historical data
START_DATE = datetime(2018, 1, 1)


class EuronextCOTParser(HTMLParser):
    """Parse Euronext COT HTML report to extract position data."""

    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.current_row = []
        self.rows = []
        self.cell_content = ""
        self.report_date = ""
        self.position_date = ""

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.in_table = True
        elif tag == "tr" and self.in_table:
            self.in_row = True
            self.current_row = []
        elif tag in ("td", "th") and self.in_row:
            self.in_cell = True
            self.cell_content = ""
        elif tag == "span":
            # Check for date spans
            for attr_name, attr_val in attrs:
                if attr_name == "id":
                    if attr_val == "ReferedDate":
                        self.in_cell = True
                        self.cell_content = ""

    def handle_endtag(self, tag):
        if tag == "table":
            self.in_table = False
        elif tag == "tr" and self.in_row:
            self.in_row = False
            if self.current_row:
                self.rows.append(self.current_row)
        elif tag in ("td", "th") and self.in_cell:
            self.in_cell = False
            self.current_row.append(self.cell_content.strip())
        elif tag == "span" and self.in_cell:
            self.in_cell = False

    def handle_data(self, data):
        if self.in_cell:
            self.cell_content += data


def parse_number(text: str) -> float:
    """Parse a number from text, handling commas and spaces."""
    if not text or text.strip() in ["-", "", "N/A", "n/a"]:
        return 0.0
    # Remove spaces and handle European number format (space as thousands separator)
    cleaned = text.strip().replace(" ", "").replace(",", ".")
    # Keep only digits, minus, and dot
    cleaned = re.sub(r"[^\d.-]", "", cleaned)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def fetch_report(product_code: str, report_date: datetime) -> Optional[str]:
    """Fetch a single COT report HTML."""
    date_str = report_date.strftime("%Y%m%d")
    year = report_date.strftime("%Y")
    month = report_date.strftime("%m")
    day = report_date.strftime("%d")

    url = f"https://live.euronext.com/sites/default/files/commodities_reporting/{year}/{month}/{day}/en/cdwpr_{product_code}_{date_str}.html"

    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=30) as response:
            return response.read().decode("utf-8", errors="ignore")
    except HTTPError as e:
        if e.code == 404:
            return None
        return None
    except (URLError, Exception):
        return None


def parse_report(html: str, report_date: datetime) -> Optional[Dict]:
    """Parse COT report HTML and extract position data."""
    parser = EuronextCOTParser()
    parser.feed(html)

    # Position date is the Friday before the Wednesday report
    # Wednesday - 5 days = Friday
    position_date = report_date - timedelta(days=5)

    data = {
        "date": position_date.strftime("%Y-%m-%d"),
        "reportDate": report_date.strftime("%Y-%m-%d"),
        "openInterest": 0,
        "invFirmsLong": 0, "invFirmsShort": 0, "invFirmsNet": 0, "invFirmsTraders": 0, "invFirmsPctOI": 0.0,
        "invFundsLong": 0, "invFundsShort": 0, "invFundsNet": 0, "invFundsTraders": 0, "invFundsPctOI": 0.0,
        "otherFinLong": 0, "otherFinShort": 0, "otherFinNet": 0, "otherFinTraders": 0, "otherFinPctOI": 0.0,
        "commercialLong": 0, "commercialShort": 0, "commercialNet": 0, "commercialTraders": 0, "commercialPctOI": 0.0,
        "emissionsLong": 0, "emissionsShort": 0, "emissionsNet": 0, "emissionsTraders": 0, "emissionsPctOI": 0.0,
    }

    # Find the "Total" row under "Number of positions"
    # Table structure:
    # Row 0: Headers (Trading venue info)
    # Row 1: Category headers (Investment Firms, Investment Funds, etc)
    # Row 2: Long/Short subheaders
    # Row 3: "Number of positions", "LOTS", "Risk Reducing...", data...
    # Row 4: "Other", data...
    # Row 5: "Total", data for all categories

    in_positions_section = False

    for row in parser.rows:
        if not row:
            continue

        first_cell = row[0].lower() if row[0] else ""

        # Detect we're in the positions section
        if "number of position" in first_cell:
            in_positions_section = True
            continue

        # End of positions section
        if "change" in first_cell or "percentage" in first_cell:
            in_positions_section = False
            continue

        # Look for Total row
        if in_positions_section and "total" in first_cell:
            # Row format: [Total, InvFirmsLong, InvFirmsShort, InvFundsLong, InvFundsShort,
            #              OtherFinLong, OtherFinShort, CommercialLong, CommercialShort,
            #              EmissionsLong, EmissionsShort]
            # But first column might be "Total" itself

            nums = []
            for cell in row:
                if cell.lower() != "total":
                    nums.append(parse_number(cell))

            if len(nums) >= 10:
                data["invFirmsLong"] = int(nums[0])
                data["invFirmsShort"] = int(nums[1])
                data["invFundsLong"] = int(nums[2])
                data["invFundsShort"] = int(nums[3])
                data["otherFinLong"] = int(nums[4])
                data["otherFinShort"] = int(nums[5])
                data["commercialLong"] = int(nums[6])
                data["commercialShort"] = int(nums[7])
                data["emissionsLong"] = int(nums[8])
                data["emissionsShort"] = int(nums[9])

                # Calculate nets
                data["invFirmsNet"] = data["invFirmsLong"] - data["invFirmsShort"]
                data["invFundsNet"] = data["invFundsLong"] - data["invFundsShort"]
                data["otherFinNet"] = data["otherFinLong"] - data["otherFinShort"]
                data["commercialNet"] = data["commercialLong"] - data["commercialShort"]
                data["emissionsNet"] = data["emissionsLong"] - data["emissionsShort"]

                # Calculate total open interest
                data["openInterest"] = (
                    data["invFirmsLong"] + data["invFundsLong"] +
                    data["otherFinLong"] + data["commercialLong"] + data["emissionsLong"]
                )

                break

    # Calculate %OI
    if data["openInterest"] > 0:
        oi = data["openInterest"]
        for prefix in ["invFirms", "invFunds", "otherFin", "commercial", "emissions"]:
            net = data[f"{prefix}Net"]
            data[f"{prefix}PctOI"] = round((net / oi) * 100, 2)

    return data if data["openInterest"] > 0 else None


def get_wednesdays(start_date: datetime, end_date: datetime) -> List[datetime]:
    """Get all Wednesdays between start and end dates."""
    wednesdays = []
    current = start_date

    # Find first Wednesday
    while current.weekday() != 2:
        current += timedelta(days=1)

    while current <= end_date:
        wednesdays.append(current)
        current += timedelta(days=7)

    return wednesdays


def load_existing_data() -> Optional[Dict[str, List[Dict]]]:
    """Load existing data from JSON file."""
    output_path = os.path.join(OUTPUT_DIR, "matif_cot.json")
    try:
        with open(output_path, "r") as f:
            data = json.load(f)
            return data.get("data", {})
    except FileNotFoundError:
        return None
    except Exception as e:
        print(f"Error loading existing data: {e}")
        return None


def scrape_all_data(incremental: bool = True) -> Dict[str, List[Dict]]:
    """Scrape COT data for all products.

    Args:
        incremental: If True, only fetch data newer than existing records.
    """
    end_date = datetime.now()

    # Load existing data for incremental updates
    existing_data = load_existing_data() if incremental else None

    results = {product_id: [] for product_id in PRODUCTS.keys()}

    for product_id, product_code in PRODUCTS.items():
        # Determine start date based on existing data
        start_date = START_DATE
        existing_records = []

        if existing_data and product_id in existing_data:
            existing_records = existing_data[product_id]
            if existing_records:
                # Get the last report date and start from the next week
                last_date_str = existing_records[-1].get("reportDate", "")
                if last_date_str:
                    last_date = datetime.strptime(last_date_str, "%Y-%m-%d")
                    start_date = last_date + timedelta(days=1)
                    print(f"{product_id}: Found {len(existing_records)} existing records through {last_date_str}")

        wednesdays = get_wednesdays(start_date, end_date)

        if not wednesdays:
            print(f"{product_id}: Already up to date")
            results[product_id] = existing_records
            continue

        print(f"\n{'='*60}")
        print(f"Fetching {product_id} ({product_code})...")
        print(f"Checking {len(wednesdays)} Wednesdays from {start_date.strftime('%Y-%m-%d')}")
        print(f"{'='*60}")

        success_count = 0
        fail_count = 0
        new_records = []

        for i, wed in enumerate(wednesdays):
            if i % 20 == 0 and len(wednesdays) > 20:
                print(f"  Progress: {i}/{len(wednesdays)} ({wed.strftime('%Y-%m-%d')})")

            html = fetch_report(product_code, wed)
            if html:
                record = parse_report(html, wed)
                if record:
                    new_records.append(record)
                    success_count += 1
                else:
                    fail_count += 1
            else:
                fail_count += 1

            # Be nice to the server
            time.sleep(0.1)

        print(f"  Completed: {success_count} new reports fetched, {fail_count} missing/failed")

        # Combine existing and new records
        all_records = existing_records + new_records
        all_records.sort(key=lambda x: x["date"])
        results[product_id] = all_records

    return results


def main():
    """Main function to scrape and save Matif COT data."""
    import sys

    # Check for --full flag
    full_refresh = "--full" in sys.argv

    print("=" * 60)
    print("Matif COT Data Scraper")
    print(f"Mode: {'FULL REFRESH' if full_refresh else 'INCREMENTAL UPDATE'}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    try:
        data = scrape_all_data(incremental=not full_refresh)
        total = sum(len(records) for records in data.values())

        output = {
            "updated": datetime.now().isoformat(),
            "source": "Euronext MATIF",
            "note": f"Historical data scraped from live.euronext.com ({total} records)",
            "data": data,
        }

        output_path = os.path.join(OUTPUT_DIR, "matif_cot.json")
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)

        print(f"\n{'=' * 60}")
        print(f"Scrape complete! Total records: {total}")
        for product_id, records in data.items():
            if records:
                print(f"  {product_id}: {len(records)} records ({records[0]['date']} to {records[-1]['date']})")
        print(f"Output: {output_path}")
        print(f"{'=' * 60}")

    except KeyboardInterrupt:
        print("\nScrape interrupted by user")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
