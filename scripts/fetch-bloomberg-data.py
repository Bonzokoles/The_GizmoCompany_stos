#!/usr/bin/env python3
"""
Fetch Bloomberg Terminal Free data → meblepumo.db
Tickers: e-commerce benchmarks + crypto
Run: python fetch-bloomberg-data.py
"""
import sys, json, sqlite3, os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'WWW_Zen_BRo_wser_tool', 'vendor', 'bloomberg-terminal-free'))
from api_wrapper import get_stock_fundamentals, get_historical_data, compare_stocks, get_crypto_quote

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'WWW_Zen_BRo_wser_tool', 'meblepumo.db')

TICKERS = ['AMZN', 'SHOP', 'EBAY', 'W', 'MKS.L', 'ALV.WA']
CRYPTO   = ['BTC', 'ETH', 'SOL']

def init_tables(con):
    con.executescript("""
    CREATE TABLE IF NOT EXISTS finance_stocks (
        ticker TEXT NOT NULL,
        name TEXT,
        price REAL,
        currency TEXT,
        market_cap REAL,
        pe_ratio REAL,
        forward_pe REAL,
        peg_ratio REAL,
        price_to_book REAL,
        profit_margin REAL,
        operating_margin REAL,
        revenue REAL,
        revenue_growth REAL,
        earnings_growth REAL,
        week52_high REAL,
        week52_low REAL,
        sector TEXT,
        industry TEXT,
        recommendation TEXT,
        fetched_at TEXT,
        PRIMARY KEY (ticker, fetched_at)
    );

    CREATE TABLE IF NOT EXISTS finance_history (
        ticker TEXT NOT NULL,
        date TEXT NOT NULL,
        open REAL, high REAL, low REAL, close REAL, volume INTEGER,
        PRIMARY KEY (ticker, date)
    );

    CREATE TABLE IF NOT EXISTS finance_crypto (
        symbol TEXT NOT NULL,
        name TEXT,
        price REAL,
        market_cap REAL,
        volume_24h REAL,
        week52_high REAL,
        week52_low REAL,
        fetched_at TEXT,
        PRIMARY KEY (symbol, fetched_at)
    );
    """)
    con.commit()

def fetch_stocks(con):
    now = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    data = compare_stocks(TICKERS)
    rows = data.get('comparison', [])
    ins = con.execute
    for r in rows:
        try:
            con.execute("""
                INSERT OR REPLACE INTO finance_stocks VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                r['ticker'], r.get('name'), r.get('price'), r.get('currency'),
                r.get('market_cap'), r.get('pe_ratio'), r.get('forward_pe'), r.get('peg_ratio'),
                r.get('price_to_book'), r.get('profit_margin'), r.get('operating_margin'),
                r.get('revenue'), r.get('revenue_growth'), r.get('earnings_growth'),
                r.get('52_week_high'), r.get('52_week_low'),
                r.get('sector'), r.get('industry'), r.get('recommendation'), now
            ))
            print(f'  stock: {r["ticker"]} ${r.get("price")}')
        except Exception as e:
            print(f'  ERROR {r.get("ticker")}: {e}')
    con.commit()

def fetch_history(con):
    import yfinance as yf
    for ticker in TICKERS:
        try:
            df = yf.download(ticker, period='3mo', interval='1d', progress=False, auto_adjust=True)
            if df.empty:
                print(f'  history: {ticker} — no data')
                continue
            # Flatten MultiIndex columns if present
            if hasattr(df.columns, 'levels'):
                df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]
            rows = []
            for idx, row in df.iterrows():
                rows.append((
                    ticker,
                    str(idx.date()),
                    float(row['Open']),
                    float(row['High']),
                    float(row['Low']),
                    float(row['Close']),
                    int(row['Volume']),
                ))
            con.executemany(
                'INSERT OR REPLACE INTO finance_history VALUES (?,?,?,?,?,?,?)', rows
            )
            con.commit()
            print(f'  history: {ticker} — {len(rows)} rows')
        except Exception as e:
            print(f'  history ERROR {ticker}: {e}')

def fetch_crypto(con):
    now = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    for sym in CRYPTO:
        try:
            r = get_crypto_quote(sym)
            if 'error' not in r:
                con.execute("""
                    INSERT OR REPLACE INTO finance_crypto VALUES (?,?,?,?,?,?,?,?)
                """, (sym, r.get('name'), r.get('price'), r.get('market_cap'),
                      r.get('24h_volume'), r.get('52_week_high'), r.get('52_week_low'), now))
                print(f'  crypto: {sym} ${r.get("price")}')
        except Exception as e:
            print(f'  crypto ERROR {sym}: {e}')
    con.commit()

def main():
    print(f'Connecting to: {DB_PATH}')
    con = sqlite3.connect(DB_PATH)
    init_tables(con)

    print('\nFetching stocks...')
    fetch_stocks(con)

    print('\nFetching price history...')
    fetch_history(con)

    print('\nFetching crypto...')
    fetch_crypto(con)

    # Summary
    for table in ['finance_stocks', 'finance_history', 'finance_crypto']:
        cnt = con.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
        print(f'  {table}: {cnt} rows')

    con.close()
    print('\nDone.')

if __name__ == '__main__':
    main()
