"""
Export COT vs Spreads data for the CFTC Dashboard.

This script:
1. Fetches the latest 1-3 month spread data from Norgate
2. Fetches historical spread data for scatter plots
3. Combines with COT data (fetched from CFTC)
4. Exports to JSON for the dashboard

Run this script every Friday evening after CFTC data releases.

Requirements:
- Norgate Data Updater (NDU) must be running
- norgatedata Python package installed
- pandas, numpy, requests, scipy installed

Usage:
    python export_cot_spreads.py
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from scipy import stats

try:
    import norgatedata
except ImportError:
    print("Error: norgatedata package not installed.")
    print("Install with: pip install norgatedata")
    exit(1)


# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data")

# Commodity configurations
# Norgate uses specific symbols for each contract month
# Format: { "cftc_id": { "name": "...", "norgate_prefix": "...", "months": ["F", "G", ...], "multiplier": 1 } }
COMMODITIES = {
    # Grains & Oilseeds
    "corn": {
        "name": "Corn",
        "norgate_prefix": "ZC",
        "months": ["H", "K", "N", "U", "Z"],  # Mar, May, Jul, Sep, Dec
        "multiplier": 1,
        "spread_unit": "c/bu"
    },
    "soybeans": {
        "name": "Soybeans",
        "norgate_prefix": "ZS",
        "months": ["F", "H", "K", "N", "Q", "U", "X"],  # Jan, Mar, May, Jul, Aug, Sep, Nov
        "multiplier": 1,
        "spread_unit": "c/bu"
    },
    "chicago-wheat": {
        "name": "Chicago Wheat",
        "norgate_prefix": "ZW",
        "months": ["H", "K", "N", "U", "Z"],
        "multiplier": 1,
        "spread_unit": "c/bu"
    },
    "kansas-wheat": {
        "name": "Kansas Wheat",
        "norgate_prefix": "KE",
        "months": ["H", "K", "N", "U", "Z"],
        "multiplier": 1,
        "spread_unit": "c/bu"
    },
    "soyoil": {
        "name": "Soyoil",
        "norgate_prefix": "ZL",
        "months": ["F", "H", "K", "N", "Q", "U", "V", "Z"],
        "multiplier": 1,
        "spread_unit": "c/lb"
    },
    "soymeal": {
        "name": "Soymeal",
        "norgate_prefix": "ZM",
        "months": ["F", "H", "K", "N", "Q", "U", "V", "Z"],
        "multiplier": 1,
        "spread_unit": "$/ton"
    },
    # Softs
    "sugar": {
        "name": "NY Sugar",
        "norgate_prefix": "SB",
        "months": ["H", "K", "N", "V"],  # Mar, May, Jul, Oct
        "multiplier": 1,
        "spread_unit": "c/lb"
    },
    "arabica-coffee": {
        "name": "NY Coffee",
        "norgate_prefix": "KC",
        "months": ["H", "K", "N", "U", "Z"],
        "multiplier": 1,
        "spread_unit": "c/lb"
    },
    "ny-cocoa": {
        "name": "NY Cocoa",
        "norgate_prefix": "CC",
        "months": ["H", "K", "N", "U", "Z"],
        "multiplier": 1,
        "spread_unit": "$/ton"
    },
    "cotton": {
        "name": "Cotton",
        "norgate_prefix": "CT",
        "months": ["H", "K", "N", "V", "Z"],
        "multiplier": 1,
        "spread_unit": "c/lb"
    },
    # Livestock
    "live-cattle": {
        "name": "Live Cattle",
        "norgate_prefix": "LE",
        "months": ["G", "J", "M", "Q", "V", "Z"],  # Feb, Apr, Jun, Aug, Oct, Dec
        "multiplier": 1,
        "spread_unit": "c/lb"
    },
    "lean-hogs": {
        "name": "Lean Hogs",
        "norgate_prefix": "HE",
        "months": ["G", "J", "K", "M", "N", "Q", "V", "Z"],
        "multiplier": 1,
        "spread_unit": "c/lb"
    },
    "feeder-cattle": {
        "name": "Feeder Cattle",
        "norgate_prefix": "GF",
        "months": ["F", "H", "J", "K", "Q", "U", "V", "X"],
        "multiplier": 1,
        "spread_unit": "c/lb"
    },
    # ICE Canada
    "canola": {
        "name": "Canola",
        "norgate_prefix": "RS",
        "months": ["F", "H", "K", "N", "X"],  # Jan, Mar, May, Jul, Nov
        "multiplier": 1,
        "spread_unit": "CAD/MT"
    },
}

# Month code to number mapping
MONTH_CODES = {
    "F": 1, "G": 2, "H": 3, "J": 4, "K": 5, "M": 6,
    "N": 7, "Q": 8, "U": 9, "V": 10, "X": 11, "Z": 12
}


def get_active_contracts(prefix: str, months: List[str], as_of_date: datetime = None) -> Tuple[str, str]:
    """
    Get the front month and 3rd month contract symbols.
    Returns (front_symbol, third_symbol)

    Accounts for contract expiry: contracts are considered expired after the 5th
    of their delivery month.
    """
    if as_of_date is None:
        as_of_date = datetime.now()

    current_year = as_of_date.year
    current_month = as_of_date.month
    current_day = as_of_date.day

    # Expiry day threshold - contracts are considered expired after this day of the month
    EXPIRY_DAY = 5

    # Build list of upcoming contracts
    upcoming = []
    for year_offset in range(3):  # Look 3 years ahead
        year = current_year + year_offset
        year_suffix = str(year)[-4:]  # Full year for Norgate
        for month_code in months:
            month_num = MONTH_CODES[month_code]

            # Skip if this contract has already expired:
            # - Past months in current year are expired
            # - Current month is expired if we're past the expiry day
            if year == current_year:
                if month_num < current_month:
                    continue
                if month_num == current_month and current_day > EXPIRY_DAY:
                    continue

            upcoming.append({
                "symbol": f"{prefix}-{year_suffix}{month_code}",
                "year": year,
                "month": month_num,
                "sort_key": year * 100 + month_num
            })

    # Sort by date
    upcoming.sort(key=lambda x: x["sort_key"])

    if len(upcoming) < 3:
        return None, None

    return upcoming[0]["symbol"], upcoming[2]["symbol"]


def get_spread_data(commodity_id: str, config: dict, start_date: str = "2010-01-01") -> pd.DataFrame:
    """
    Get historical 1-3 month spread data for a commodity.
    Returns DataFrame with columns: date, front_price, third_price, spread, spread_pct
    """
    prefix = config["norgate_prefix"]
    months = config["months"]

    all_data = []

    # We need to iterate through historical dates and get the appropriate contracts
    # For simplicity, we'll use continuous contracts if available, or build from individual contracts

    # Try to get front month continuous contract
    front_continuous = f"{prefix}&"  # Norgate continuous contract symbol

    try:
        front_prices = norgatedata.price_timeseries(
            front_continuous,
            start_date=start_date,
            format="pandas-dataframe"
        )

        if front_prices is not None and len(front_prices) > 0:
            # For continuous, we don't have easy access to 3rd month
            # We'll need to build this from individual contracts
            pass
    except Exception as e:
        print(f"  Could not get continuous contract for {prefix}: {e}")

    # Build spread series from individual contracts
    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    end_date = datetime.now()

    # Get all historical contracts
    contracts_data = {}
    current_year = datetime.now().year

    for year in range(2010, current_year + 2):
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
        print(f"  No contract data found for {prefix}")
        return pd.DataFrame()

    # Build spread series by date
    date_range = pd.date_range(start=start_date, end=end_date, freq='B')  # Business days

    spread_records = []
    for date in date_range:
        front_symbol, third_symbol = get_active_contracts(prefix, months, date)

        if front_symbol not in contracts_data or third_symbol not in contracts_data:
            continue

        front_df = contracts_data[front_symbol]
        third_df = contracts_data[third_symbol]

        date_str = date.strftime("%Y-%m-%d")

        # Get prices for this date
        if date in front_df.index and date in third_df.index:
            front_price = front_df.loc[date, "Close"]
            third_price = third_df.loc[date, "Close"]

            spread = front_price - third_price
            spread_pct = (front_price / third_price) * 100 if third_price != 0 else 100

            spread_records.append({
                "date": date_str,
                "front_price": float(front_price),
                "third_price": float(third_price),
                "spread": float(spread),
                "spread_pct": float(spread_pct)
            })

    return pd.DataFrame(spread_records)


def get_latest_spread(commodity_id: str, config: dict) -> Optional[dict]:
    """
    Get the latest 1-3 month spread for a commodity.
    """
    prefix = config["norgate_prefix"]
    months = config["months"]

    front_symbol, third_symbol = get_active_contracts(prefix, months)

    if not front_symbol or not third_symbol:
        return None

    try:
        front_prices = norgatedata.price_timeseries(front_symbol, format="pandas-dataframe")
        third_prices = norgatedata.price_timeseries(third_symbol, format="pandas-dataframe")

        if front_prices is None or third_prices is None:
            return None

        if len(front_prices) == 0 or len(third_prices) == 0:
            return None

        # Get latest prices
        front_latest = front_prices.iloc[-1]
        third_latest = third_prices.iloc[-1]

        front_price = float(front_latest["Close"])
        third_price = float(third_latest["Close"])

        spread = front_price - third_price
        spread_pct = (front_price / third_price) * 100 if third_price != 0 else 100

        return {
            "front_symbol": front_symbol,
            "third_symbol": third_symbol,
            "front_price": front_price,
            "third_price": third_price,
            "spread": spread,
            "spread_pct": spread_pct,
            "date": front_prices.index[-1].strftime("%Y-%m-%d")
        }
    except Exception as e:
        print(f"  Error getting spread for {commodity_id}: {e}")
        return None


def export_spread_data():
    """
    Main export function - fetches all spread data and saves to JSON.
    """
    print("=" * 60)
    print("COT vs Spreads Data Export")
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

    # Results
    summary_data = []
    historical_data = {}

    for commodity_id, config in COMMODITIES.items():
        print(f"\nProcessing {config['name']}...")

        # Get latest spread
        latest = get_latest_spread(commodity_id, config)

        if latest:
            summary_data.append({
                "id": commodity_id,
                "name": config["name"],
                "spread": latest["spread"],
                "spread_pct": latest["spread_pct"],
                "spread_unit": config["spread_unit"],
                "date": latest["date"],
                "front_symbol": latest["front_symbol"],
                "third_symbol": latest["third_symbol"]
            })
            print(f"  Latest: {latest['spread']:.2f} ({latest['spread_pct']:.1f}%)")
        else:
            print(f"  No spread data available")

        # Get historical spread data for scatter plot
        print(f"  Fetching historical data...")
        hist_df = get_spread_data(commodity_id, config, start_date="2010-01-01")

        if len(hist_df) > 0:
            # Convert to list of records for JSON
            historical_data[commodity_id] = hist_df.to_dict(orient="records")
            print(f"  Historical: {len(hist_df)} data points")
        else:
            historical_data[commodity_id] = []
            print(f"  No historical data")

    # Save summary (current spreads)
    output = {
        "updated": datetime.now().isoformat(),
        "summary": summary_data,
        "historical": historical_data
    }

    output_path = os.path.join(OUTPUT_DIR, "cot_spreads.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"Export complete!")
    print(f"Output: {output_path}")
    print(f"Summary: {len(summary_data)} commodities")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    export_spread_data()
