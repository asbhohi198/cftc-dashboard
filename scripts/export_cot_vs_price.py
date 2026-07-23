"""
Export COT vs Price data for the CFTC Dashboard.

This script:
1. Fetches historical price data from Norgate (2016 onwards)
2. Fetches COT data from CFTC
3. Aligns weekly COT data with prices
4. Calculates regression statistics
5. Exports to JSON for the dashboard

Run this script weekly after CFTC data releases.

Requirements:
- Norgate Data Updater (NDU) must be running
- norgatedata Python package installed
- pandas, numpy, scipy installed

Usage:
    python export_cot_vs_price.py
"""

import json
import os
import io
import zipfile
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from scipy import stats
import requests

try:
    import norgatedata
except ImportError:
    print("Error: norgatedata package not installed.")
    print("Install with: pip install norgatedata")
    exit(1)


# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data")

# Month code to number mapping
MONTH_CODES = {
    "F": 1, "G": 2, "H": 3, "J": 4, "K": 5, "M": 6,
    "N": 7, "Q": 8, "U": 9, "V": 10, "X": 11, "Z": 12
}

# Commodity configurations
COMMODITIES = {
    # Ags - Grains
    "corn": {
        "name": "Corn",
        "norgate_prefix": "ZC",
        "months": ["H", "K", "N", "U", "Z"],
        "cftc_code": "002602",
        "report_type": "disagg",
        "sector": "ags-grains"
    },
    "chicago-wheat": {
        "name": "Chicago Wheat",
        "norgate_prefix": "ZW",
        "months": ["H", "K", "N", "U", "Z"],
        "cftc_code": "001602",
        "report_type": "disagg",
        "sector": "ags-grains"
    },
    "kansas-wheat": {
        "name": "Kansas Wheat",
        "norgate_prefix": "KE",
        "months": ["H", "K", "N", "U", "Z"],
        "cftc_code": "001612",
        "report_type": "disagg",
        "sector": "ags-grains"
    },
    "soybeans": {
        "name": "Soybeans",
        "norgate_prefix": "ZS",
        "months": ["F", "H", "K", "N", "Q", "U", "X"],
        "cftc_code": "005602",
        "report_type": "disagg",
        "sector": "ags-grains"
    },
    "soymeal": {
        "name": "Soybean Meal",
        "norgate_prefix": "ZM",
        "months": ["F", "H", "K", "N", "Q", "U", "V", "Z"],
        "cftc_code": "026603",
        "report_type": "disagg",
        "sector": "ags-grains"
    },
    "soyoil": {
        "name": "Soybean Oil",
        "norgate_prefix": "ZL",
        "months": ["F", "H", "K", "N", "Q", "U", "V", "Z"],
        "cftc_code": "007601",
        "report_type": "disagg",
        "sector": "ags-grains"
    },
    # Ags - Softs
    "sugar": {
        "name": "Sugar #11",
        "norgate_prefix": "SB",
        "months": ["H", "K", "N", "V"],
        "cftc_code": "080732",
        "report_type": "disagg",
        "sector": "ags-softs"
    },
    "cotton": {
        "name": "Cotton",
        "norgate_prefix": "CT",
        "months": ["H", "K", "N", "V", "Z"],
        "cftc_code": "033661",
        "report_type": "disagg",
        "sector": "ags-softs"
    },
    "arabica-coffee": {
        "name": "Coffee C",
        "norgate_prefix": "KC",
        "months": ["H", "K", "N", "U", "Z"],
        "cftc_code": "083731",
        "report_type": "disagg",
        "sector": "ags-softs"
    },
    "ny-cocoa": {
        "name": "Cocoa",
        "norgate_prefix": "CC",
        "months": ["H", "K", "N", "U", "Z"],
        "cftc_code": "073732",
        "report_type": "disagg",
        "sector": "ags-softs"
    },
    # Ags - Livestock
    "live-cattle": {
        "name": "Live Cattle",
        "norgate_prefix": "LE",
        "months": ["G", "J", "M", "Q", "V", "Z"],
        "cftc_code": "057642",
        "report_type": "disagg",
        "sector": "ags-livestock"
    },
    "feeder-cattle": {
        "name": "Feeder Cattle",
        "norgate_prefix": "GF",
        "months": ["F", "H", "J", "K", "Q", "U", "V", "X"],
        "cftc_code": "061641",
        "report_type": "disagg",
        "sector": "ags-livestock"
    },
    "lean-hogs": {
        "name": "Lean Hogs",
        "norgate_prefix": "HE",
        "months": ["G", "J", "K", "M", "N", "Q", "V", "Z"],
        "cftc_code": "054642",
        "report_type": "disagg",
        "sector": "ags-livestock"
    },
    # Energy
    "wti-crude": {
        "name": "WTI Crude Oil",
        "norgate_prefix": "CL",
        "months": ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"],
        "cftc_code": "067651",
        "report_type": "disagg",
        "sector": "energy"
    },
    "natural-gas": {
        "name": "Natural Gas",
        "norgate_prefix": "NG",
        "months": ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"],
        "cftc_code": "023651",
        "report_type": "disagg",
        "sector": "energy"
    },
    # Metals
    "gold": {
        "name": "Gold",
        "norgate_prefix": "GC",
        "months": ["G", "J", "M", "Q", "V", "Z"],
        "cftc_code": "088691",
        "report_type": "disagg",
        "sector": "metals"
    },
    "silver": {
        "name": "Silver",
        "norgate_prefix": "SI",
        "months": ["H", "K", "N", "U", "Z"],
        "cftc_code": "084691",
        "report_type": "disagg",
        "sector": "metals"
    },
    "copper": {
        "name": "Copper",
        "norgate_prefix": "HG",
        "months": ["H", "K", "N", "U", "Z"],
        "cftc_code": "085692",
        "report_type": "disagg",
        "sector": "metals"
    },
}


def get_front_contract(prefix: str, months: List[str], as_of_date: datetime) -> Optional[str]:
    """Get the front month contract symbol for a given date."""
    current_year = as_of_date.year
    current_month = as_of_date.month
    current_day = as_of_date.day
    EXPIRY_DAY = 5

    for year_offset in range(2):
        year = current_year + year_offset
        year_suffix = str(year)
        for month_code in months:
            month_num = MONTH_CODES[month_code]

            if year == current_year:
                if month_num < current_month:
                    continue
                if month_num == current_month and current_day > EXPIRY_DAY:
                    continue

            return f"{prefix}-{year_suffix}{month_code}"

    return None


def fetch_price_data(prefix: str, months: List[str]) -> pd.DataFrame:
    """
    Fetch historical price data by stitching together front month contracts.
    """
    current_year = datetime.now().year

    # Fetch all contracts from 2015 to now (need 2015 to have data for 2016)
    contracts_data = {}

    for year in range(2015, current_year + 2):
        year_suffix = str(year)
        for month_code in months:
            symbol = f"{prefix}-{year_suffix}{month_code}"
            try:
                prices = norgatedata.price_timeseries(symbol, format="pandas-dataframe")
                if prices is not None and len(prices) > 0:
                    contracts_data[symbol] = prices
            except:
                pass

    if not contracts_data:
        return pd.DataFrame()

    # Build continuous price series using front month
    start_date = datetime(2016, 1, 1)
    end_date = datetime.now()

    price_records = []
    current_date = start_date

    while current_date <= end_date:
        front_symbol = get_front_contract(prefix, months, current_date)

        if front_symbol and front_symbol in contracts_data:
            df = contracts_data[front_symbol]
            if current_date in df.index:
                price_records.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "price": float(df.loc[current_date, "Close"])
                })

        current_date += timedelta(days=1)

    if not price_records:
        return pd.DataFrame()

    return pd.DataFrame(price_records)


def fetch_cot_data(cftc_code: str, report_type: str) -> pd.DataFrame:
    """Fetch COT data from CFTC for a single contract from 2016 onwards."""
    all_records = []
    current_year = datetime.now().year

    for year in range(2016, current_year + 1):
        if report_type == "tff":
            url = f"https://www.cftc.gov/files/dea/history/fut_fin_txt_{year}.zip"
        else:
            url = f"https://www.cftc.gov/files/dea/history/com_disagg_txt_{year}.zip"

        try:
            response = requests.get(url, timeout=60)
            if response.status_code != 200:
                continue

            z = zipfile.ZipFile(io.BytesIO(response.content))
            txt_files = [f for f in z.namelist() if f.endswith('.txt')]
            if not txt_files:
                continue

            with z.open(txt_files[0]) as f:
                content = f.read().decode('utf-8')

            lines = content.strip().split('\n')

            for line in lines[1:]:
                if not line.strip():
                    continue

                if report_type == "tff":
                    if f",{cftc_code}," not in line and f",{cftc_code} ," not in line:
                        continue
                else:
                    if f'"{cftc_code}"' not in line:
                        continue

                fields = []
                current = ""
                in_quotes = False
                for char in line:
                    if char == '"':
                        in_quotes = not in_quotes
                    elif char == ',' and not in_quotes:
                        fields.append(current.strip())
                        current = ""
                    else:
                        current += char
                fields.append(current.strip())

                if len(fields) < 20:
                    continue

                def parse_num(s):
                    cleaned = ''.join(c for c in s if c.isdigit() or c == '-' or c == '.')
                    return float(cleaned) if cleaned else 0

                date = fields[2]

                if report_type == "tff":
                    mm_long = parse_num(fields[14])
                    mm_short = parse_num(fields[15])
                    mm_net = mm_long - mm_short
                    open_interest = parse_num(fields[7])
                else:
                    mm_long = parse_num(fields[13])
                    mm_short = parse_num(fields[14])
                    mm_net = mm_long - mm_short
                    open_interest = parse_num(fields[7])

                all_records.append({
                    "date": date,
                    "mm_net": mm_net,
                    "open_interest": open_interest
                })

        except Exception as e:
            print(f"    Error fetching {year}: {e}")
            continue

    if not all_records:
        return pd.DataFrame()

    df = pd.DataFrame(all_records)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').drop_duplicates('date')
    df = df.set_index('date')

    return df


def align_data(cot_df: pd.DataFrame, price_df: pd.DataFrame) -> pd.DataFrame:
    """Align COT data with price data."""
    if cot_df.empty or price_df.empty:
        return pd.DataFrame()

    # Convert price_df date to datetime index
    price_df['date'] = pd.to_datetime(price_df['date'])
    price_df = price_df.set_index('date')

    aligned_records = []

    for date, row in cot_df.iterrows():
        # Find closest price within +/- 5 days
        price = None
        for offset in range(6):
            check_date = date + timedelta(days=offset)
            if check_date in price_df.index:
                price = price_df.loc[check_date, 'price']
                break
            check_date = date - timedelta(days=offset)
            if check_date in price_df.index:
                price = price_df.loc[check_date, 'price']
                break

        if price is not None:
            aligned_records.append({
                "date": date.strftime("%Y-%m-%d"),
                "mm_net": row['mm_net'],
                "price": price
            })

    if not aligned_records:
        return pd.DataFrame()

    df = pd.DataFrame(aligned_records)

    # Calculate changes
    df['mm_change'] = df['mm_net'].diff()
    df['price_change'] = df['price'].diff()
    df['price_change_pct'] = df['price'].pct_change() * 100

    # Remove first row (NaN from diff)
    df = df.iloc[1:]

    return df


def calculate_regression(data: pd.DataFrame) -> dict:
    """Calculate regression: price_change_pct = alpha + beta * mm_change"""
    if len(data) < 10:
        return {"beta": 0, "alpha": 0, "r_squared": 0, "correlation": 0}

    x = data['mm_change'].values
    y = data['price_change_pct'].values

    mask = np.isfinite(x) & np.isfinite(y)
    x = x[mask]
    y = y[mask]

    if len(x) < 10:
        return {"beta": 0, "alpha": 0, "r_squared": 0, "correlation": 0}

    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

    return {
        "beta": float(slope),
        "alpha": float(intercept),
        "r_squared": float(r_value ** 2),
        "correlation": float(r_value)
    }


def process_commodity(commodity_id: str, config: dict) -> Optional[dict]:
    """Process a single commodity: fetch data, align, calculate regression."""
    print(f"\nProcessing {config['name']}...")

    # Fetch COT data
    print(f"  Fetching COT data...")
    cot_df = fetch_cot_data(config['cftc_code'], config['report_type'])
    if cot_df.empty:
        print(f"  No COT data found")
        return None
    print(f"  COT data: {len(cot_df)} records")

    # Fetch price data
    print(f"  Fetching price data from Norgate...")
    price_df = fetch_price_data(config['norgate_prefix'], config['months'])
    if price_df.empty:
        print(f"  No price data found")
        return None
    print(f"  Price data: {len(price_df)} records")

    # Align data
    aligned = align_data(cot_df, price_df)
    if aligned.empty:
        print(f"  Failed to align data")
        return None
    print(f"  Aligned: {len(aligned)} weekly points")

    # Calculate regression
    regression = calculate_regression(aligned)
    print(f"  Beta: {regression['beta']:.6f}, R²: {regression['r_squared']:.4f}")

    # Get current values
    latest = aligned.iloc[-1]
    current_mm_net = float(latest['mm_net'])
    current_price = float(latest['price'])

    # Calculate record positions
    record_max = float(aligned['mm_net'].max())
    record_min = float(aligned['mm_net'].min())

    # Calculate price targets
    contracts_to_max_long = record_max - current_mm_net
    contracts_to_max_short = record_min - current_mm_net

    pct_change_to_max_long = regression['beta'] * contracts_to_max_long
    pct_change_to_max_short = regression['beta'] * contracts_to_max_short

    price_to_max_long = current_price * (1 + pct_change_to_max_long / 100)
    price_to_max_short = current_price * (1 + pct_change_to_max_short / 100)

    return {
        "id": commodity_id,
        "name": config['name'],
        "sector": config['sector'],
        "currentMMNet": current_mm_net,
        "currentPrice": current_price,
        "latestDate": latest['date'],
        "recordMaxPosition": record_max,
        "recordMinPosition": record_min,
        "beta": regression['beta'],
        "rSquared": regression['r_squared'],
        "correlation": regression['correlation'],
        "priceToMaxLong": price_to_max_long,
        "priceToMaxShort": price_to_max_short,
        "contractsToMaxLong": contracts_to_max_long,
        "contractsToMaxShort": contracts_to_max_short,
        "weeklyData": aligned.to_dict(orient='records')
    }


def export_data():
    """Main export function - processes all commodities and saves to JSON."""
    print("=" * 60)
    print("COT vs Price Data Export")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Check Norgate connection
    try:
        status = norgatedata.status()
        print(f"\nNorgate Data Status: {status}")
    except Exception as e:
        print(f"\nError: Could not connect to Norgate Data Updater.")
        print(f"Make sure NDU is running. Error: {e}")
        return

    # Create output directory if needed
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Process all commodities
    results = []

    for commodity_id, config in COMMODITIES.items():
        result = process_commodity(commodity_id, config)
        if result:
            results.append(result)

    # Save to JSON
    output = {
        "updated": datetime.now().isoformat(),
        "data": results
    }

    output_path = os.path.join(OUTPUT_DIR, "cot_vs_price.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"Export complete!")
    print(f"Output: {output_path}")
    print(f"Commodities: {len(results)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    export_data()
