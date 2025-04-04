# Post Earnings Announcement Drift Trading Dashboard

The project uses the Post Earnings Announcement Drift (PEAD) anomaly to generate trade recommendations by analyzing earnings surprises both through regression and by comparing with analyst estimates. A web-based interface displays these recommendations and 10 years of backtesting results. 

Check out our demmo! 
https://github.com/user-attachments/assets/f63caec3-9973-4fac-a679-18e3f5211c7b 
## User Guide
### CleanPEADReg.ipynb
This jupyter notebook is the place where we have collected, preprocessed and created a regression model for all the 5 stocks ["NVDA","GOOGL","MSFT","GME","GS"]. 

The notebook has been divided into 4 tasks, for each of which we have explained the technicalities and best user practices:
1. Getting Data from AlphaVantage API and Cleaning: The financial data such as balance sheets, income statements and cash flow statements is collected from AlphaVantage using an API key, which has a rate limit on it. Therefore to make it easy for the user we have already the historical data has already been populated in the financial statements directory, the structure for the same has been shown below. Furthermore,the user can run any code cell below the first one in "CleanPEADReg.ipynb" to clean the financial data again, perform multi-collinearity checks, and create the regression model again. : 

```
.
└── financial_statements/
    ├── [STOCK_TICKER]_balance_sheet.csv
    ├── [STOCK_TICKER]_income_statement.csv
    └── [STOCK_TICKER]_cash_flow.csv
```
2. Getting Earnings Dates, EPS Estimates, Surprises, Reported EPS from yfinance and then merging with the financial statements data.
3. Checking for multi-collinearity and using VIF Filtering to drop insignificant attributes. In addition, shifting the EPS tuples by 1 so that the regression model can be trained properly.
4. Finally conducting multi-variate regression for all stocks and making their regression models. In this Task their are two code cells, the first one performs the regression and then produces the regression summary, also showcasing the latest predictions on the latest earnings dates. The second cell uses this regression model to make predicitions on the previous earnings dates as well, as these predictions were required in the backtest to check how good the regression was performing.

### backtest.py
The backtest.py file simulates the trades for the past 10 years on all stocks, makes the visualizations and provides us with the results which are populated on the dashboard. The results are populated in the following directory structure: 

```
.
└── backtest/
    └── frontend/
        └── results/
            └── [STOCK_TICKER]/
                └── [STOCK_TICKER]_backtest_results
```

#### Libraries Used
numpy, pandas, backtrader, backtrader.analyzers, yfinance, plotly.express


### frontend
Once the results are populated, main.js pulls them and uses to them to display our results on the dashboard. Below we go into more depth in the dashboard functionality itself. 

# PEAD Regression Dashboard
A beautiful interactive frontend to visualize the results of PEAD (Post-Earnings Announcement Drift) regression backtests.



<img width="1200" alt="Screenshot 2025-04-02 at 11 20 24 PM" src="https://github.com/user-attachments/assets/e0e2d607-954c-44cb-946e-9dbafa9254fd" />



## Features

- 📊 Interactive charts and visualizations
- 📈 Equity curves for each stock
- 🔄 Stock comparison tools
- 📱 Responsive design for all devices

## Quick Start

This is a static HTML/CSS/JavaScript frontend - no build steps required! Just open the `index.html` file in your browser.

```bash
# Windows (CMD)
start index.html

# Windows (PowerShell)
Invoke-Item index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

## Data Structure

The dashboard reads data from the following file structure:

```
results/
└── [STOCK_TICKER]/
    └── [STOCK_TICKER]_backtest_results/
        ├── equity_curve.csv
        ├── pnl_data.csv
        ├── streaks_data.csv
        ├── summary.txt
        ├── trade_analysis.csv
        ├── trade_length_data.csv
        └── trade_outcomes.csv
```

## Customizing

### Adding New Stocks

To add a new stock to the dashboard:

1. Add the stock data to the `stockData` object in `js/main.js`
2. Add the stock as an option in the select dropdown in `index.html`

### Modifying Charts

All charts are created using ApexCharts.js. You can customize charts by modifying their options in the `js/main.js` file.

## Technical Details

This dashboard uses:

- **HTML5** for structure
- **CSS3** for styling and responsive design
- **JavaScript** (vanilla) for interactions
- **ApexCharts.js** for data visualization
- **Font Awesome** for icons

## Future Improvements

- Add data loading directly from CSV files (currently uses hardcoded data)
- Add additional metrics and visualizations
- Implement dark/light theme toggle
- Add export functionality for reports
.
