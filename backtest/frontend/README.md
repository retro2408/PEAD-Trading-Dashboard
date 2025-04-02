# PEAD Regression Backtest Dashboard

A beautiful interactive frontend to visualize the results of PEAD (Post-Earnings Announcement Drift) regression backtests.

![Dashboard Screenshot](https://placeholder-image.com)

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
├── comparison/
│   ├── sharpe_comparison.csv
│   └── sharpe_comparison.html
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
