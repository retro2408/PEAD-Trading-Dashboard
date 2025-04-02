#!/usr/bin/env python3
"""
Earnings Announcement Trading Strategy Backtest

This module implements a backtesting framework for trading stocks around earnings announcements.
It analyzes historical price data and earnings surprises to generate trading signals.
Results are saved in a directory structure organized by stock.
"""

import os
import datetime
import warnings
import pandas as pd
import numpy as np
import backtrader as bt
import backtrader.analyzers as btanalyzers
import yfinance as yf
import plotly.express as px

# Ignore warnings
warnings.filterwarnings("ignore")

class EarningsTradingStrategy(bt.Strategy):
    """
    A trading strategy that trades based on earnings surprises.
    
    The strategy enters long positions for positive earnings surprises and
    short positions for negative earnings surprises. Positions are managed
    with take-profit, stop-loss, and maximum holding period rules.
    """
    
    params = (
        ('take_profit', 0.015),   # 1.5% Take Profit
        ('stop_loss', 0.015),     # 1.5% Stop Loss
        ('holding_period', 24),   # Max holding period in 5-min bars
        ('max_trade_value', 1000), # $1,000 max per trade
        ('stock', None),  #To get the stock_symbol
        ('regression_file', 'regression_predictions_new.csv')
    )

    def __init__(self):
        self.order = None
        self.entry_price = None
        self.bar_count = 0
        self.trade_outcomes = []
        self._closed_by_tp = False
        self._closed_by_sl = False
        self.is_long = None  # Track position type: True=Long, False=Short
        self.portfolio_value = []
        self.reg_preds = pd.read_csv(self.p.regression_file)
        self.symbol = self.p.stock
        self.reg_preds = self.reg_preds[self.reg_preds['Symbol'] == self.symbol].copy()
        # Initialize DataFrame for trade entries
        self.df = pd.DataFrame(columns=['datetime', 'price', 'signal', 'closed'])

    def notify_trade(self, trade):
        if trade.isclosed:
            outcome = 'timeout'
            if self._closed_by_tp:
                outcome = 'tp'
            elif self._closed_by_sl:
                outcome = 'sl'
            self.trade_outcomes.append((outcome, 'long' if self.is_long else 'short'))
            print(f"Trade closed by {outcome} ({'Long' if self.is_long else 'Short'})")

    def next(self):
        current_time = self.datas[0].datetime.time()
        current_date = self.datas[0].datetime.date()
        current_ts = pd.Timestamp(current_date)
        current_dt = datetime.datetime.combine(current_date, current_time)

        pred_df = self.reg_preds.loc[:,['Predicted_EPS', 'Earnings_Date']]
        pred_df['Earnings_Date'] = pd.to_datetime(pred_df['Earnings_Date'])
        closest_row = pred_df.loc[(pred_df['Earnings_Date'] - current_ts).abs().idxmin()]

        if datetime.time(16, 0) <= current_time <= datetime.time(16, 10) and not self.order:
            earnings = self._get_earnings_for_date(current_date)
            if not earnings.empty:
                predicted_eps_value = float(closest_row['Predicted_EPS'])
                estimated_eps = earnings['EPS Estimate'].values[0]
                reported_eps = earnings['Reported EPS'].values[0]
                estimated_surprise = (reported_eps - estimated_eps) / estimated_eps
                regression_suprise = (reported_eps - predicted_eps_value) / predicted_eps_value
                surprise = 0.2*regression_suprise + 0.8*estimated_surprise

                # Calculate position size based on $1,000 trade limit
                current_price = self.data.close[0]
                position_size = int(self.params.max_trade_value / current_price)  # Round to whole shares

                print(f"Date: {current_date}, Price: {current_price:.2f}, Position Size: {position_size}")

                if position_size <= 0:
                    print(f"Skipping trade on {current_date}: Position size is zero or negative.")
                    return

                if surprise >= 0.1:  # Long entry
                    self.order = self.buy(size=position_size)
                    self.is_long = True
                    print(f"LONG ENTRY at {current_price:.2f} on {current_date}")
                    # Record trade entry
                    trade_entry = pd.DataFrame({
                        'datetime': [current_dt],
                        'price': [current_price],
                        'signal': ['BUY'],
                        'closed': ['OPENED']
                    })
                    self.df = pd.concat([self.df, trade_entry], ignore_index=True)
                elif surprise <= -0.1:  # Short entry
                    self.order = self.sell(size=position_size)
                    self.is_long = False
                    print(f"SHORT ENTRY at {current_price:.2f} on {current_date}")
                    # Record trade entry
                    trade_entry = pd.DataFrame({
                        'datetime': [current_dt],
                        'price': [current_price],
                        'signal': ['SELL'],
                        'closed': ['OPENED']
                    })
                    self.df = pd.concat([self.df, trade_entry], ignore_index=True)
                
                if self.order:
                    self.entry_price = current_price
                    self.bar_count = 0

        if self.order and self.order.status == bt.Order.Completed:
            self.bar_count += 1
            price = self.data.close[0]
            
            # Calculate price change based on position type
            if self.is_long:
                price_change = (price - self.entry_price) / self.entry_price
                tp_condition = price_change >= self.params.take_profit
                sl_condition = price_change <= -self.params.stop_loss
            else:  # Short position
                price_change = (self.entry_price - price) / self.entry_price
                tp_condition = price_change >= self.params.take_profit
                sl_condition = price_change <= -self.params.stop_loss

            if tp_condition:
                print(f"Closing {'Long' if self.is_long else 'Short'} via Take Profit")
                # Record trade exit
                trade_entry = pd.DataFrame({
                    'datetime': [current_dt],
                    'price': [price],
                    'signal': ['BUY' if self.is_long else 'SELL'],
                    'closed': ['TOOK PROFIT']
                })
                self.df = pd.concat([self.df, trade_entry], ignore_index=True)
                self._closed_by_tp = True
                self.close()
                self.order = None
            elif sl_condition:
                print(f"Closing {'Long' if self.is_long else 'Short'} via Stop Loss")
                # Record trade exit
                trade_entry = pd.DataFrame({
                    'datetime': [current_dt],
                    'price': [price],
                    'signal': ['BUY' if self.is_long else 'SELL'],
                    'closed': ['STOPPED OUT']
                })
                self.df = pd.concat([self.df, trade_entry], ignore_index=True)
                self._closed_by_sl = True
                self.close()
                self.order = None
            elif self.bar_count >= self.params.holding_period:
                print(f"Closing {'Long' if self.is_long else 'Short'} via Timeout")
                # Record trade exit
                trade_entry = pd.DataFrame({
                    'datetime': [current_dt],
                    'price': [price],
                    'signal': ['BUY' if self.is_long else 'SELL'],
                    'closed': ['EXITED']
                })
                self.df = pd.concat([self.df, trade_entry], ignore_index=True)
                self.close()
                self.order = None
        
            self.portfolio_value.append(self.broker.getvalue())

    def _get_earnings_for_date(self, date):
        """
        Helper method to get earnings data for a specific date.
        
        Args:
            date: The date to check for earnings data
            
        Returns:
            DataFrame: Earnings data for the specified date or empty DataFrame
        """
        # This will be set by the backtest runner
        if not hasattr(self, 'earnings_data'):
            return pd.DataFrame()
        
        return self.earnings_data[self.earnings_data.index.date == date]


def create_results_dir(stock, base_path=None):
    """
    Creates a directory for saving results for a specific stock.
    
    Args:
        stock: Stock symbol
        base_path: Base directory for results (defaults to frontend/results)
    
    Returns:
        str: Path to the created directory
    """
    # Get the absolute path to the frontend directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if base_path is None:
        base_path = os.path.join(current_dir, "frontend", "results")
    
    # Create a timestamp-based folder name
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    stock_dir = os.path.join(base_path, stock)
    results_dir = os.path.join(stock_dir, f"{stock}_backtest_results")
    
    # Create the directory if it doesn't exist
    os.makedirs(results_dir, exist_ok=True)
    
    # Debug information
    print(f"\nCreating results directory:")
    print(f"Base path: {base_path}")
    print(f"Stock directory: {stock_dir}")
    print(f"Results directory: {results_dir}\n")
    
    return results_dir


def flatten_dict(d, parent_key='', sep='.'):
    """
    Recursively flattens a nested dictionary.
    
    Args:
        d: Dictionary to flatten
        parent_key: Key of the parent dictionary
        sep: Separator for nested keys
    
    Returns:
        dict: Flattened dictionary
    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def get_metric_value(trade_df, metric_key):
    """
    Safely extracts a metric value from the DataFrame.
    
    Args:
        trade_df: DataFrame containing metrics
        metric_key: Key to look for
    
    Returns:
        Value of the metric or None if not found
    """
    matches = trade_df[trade_df['Metric'].str.contains(metric_key)]
    if not matches.empty:
        return matches['Value'].values[0]
    return None


def load_price_data(stock):
    """
    Load price data from CSV file for a specific stock.
    
    Args:
        stock: Stock symbol
    
    Returns:
        DataFrame: Price data for the stock
    """
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        file_path = os.path.join(base_dir, f"{stock}_Earnings_Data(5M).csv")
        stock_df = pd.read_csv(file_path)
        stock_df['date'] = pd.to_datetime(stock_df['date'], format='%Y%m%d %H:%M:%S %Z', errors='coerce')
        stock_df = stock_df.loc[:, ~stock_df.columns.str.contains('^Unnamed')]
        stock_df.dropna(subset=['date'], inplace=True)
        stock_df.set_index('date', inplace=True)
        stock_df = stock_df.sort_index()
        stock_df = stock_df.drop(columns=['ReqId', 'ticker'])
        return stock_df
    except Exception as e:
        print(f"Error loading price data for {stock}: {e}")
        return None


def load_earnings_data(stock, max_earnings=64):
    """
    Load earnings data for a specific stock using yfinance.
    
    Args:
        stock: Stock symbol
        max_earnings: Maximum number of earnings releases to fetch
    
    Returns:
        DataFrame: Earnings data for the stock
    """
    try:
        obj = yf.Ticker(stock)
        earnings_data = obj.get_earnings_dates(max_earnings)
        
        # Check if earnings_data is not None before processing
        if earnings_data is not None:
            # Convert index from America/New_York (UTC-5) to UTC
            earnings_data.index = earnings_data.index.tz_convert('UTC')
            today = pd.Timestamp.now(tz='UTC').normalize()
            earnings_data = earnings_data[earnings_data.index <= today]
            
            return earnings_data
        else:
            print(f"No earnings data available for {stock}")
            return None
    except Exception as e:
        print(f"Error loading earnings data for {stock}: {e}")
        return None


def filter_trading_hours(df):
    """
    Filter data to include only after-hours trading (4:05 PM to 6:30 PM).
    
    Args:
        df: DataFrame with price data
    
    Returns:
        DataFrame: Filtered price data
    """
    df['hour'] = df.index.hour
    df['minute'] = df.index.minute
    filtered_df = df[(df['hour'] >= 16) & (df['hour'] <= 18) & ((df['hour'] != 16) | (df['minute'] >= 5))]
    filtered_df.drop(columns=['hour', 'minute'], inplace=True)
    return filtered_df


def save_backtest_results(results_dir, trade_analysis, sharpe_ratio, strategy):
    """
    Save backtest results to files.
    
    Args:
        results_dir: Directory to save results
        trade_analysis: Analysis of trades
        sharpe_ratio: Sharpe ratio of the strategy
        strategy: Strategy object with performance data
    """
    # Save trade entries to CSV
    strategy.df.to_csv(os.path.join(results_dir, "trade_entries.csv"))
    print(f"Trade entries saved to CSV")
    
    # Flatten the trade_analysis object
    flat_trade_analysis = flatten_dict(trade_analysis)
    
    # Convert the flattened dictionary to a DataFrame
    trade_df = pd.DataFrame(list(flat_trade_analysis.items()), columns=['Metric', 'Value'])
    
    # Save the full analysis to CSV
    trade_df.to_csv(os.path.join(results_dir, "trade_analysis.csv"), index=False)
    print(f"Trade analysis saved to CSV")
    
    # Print the DataFrame
    print(trade_df)
    
    # 1. Total Trades
    total_trades = trade_df[trade_df['Metric'].str.contains('total.total')]['Value'].values[0]
    won_trades = trade_df[trade_df['Metric'].str.contains('won.total')]['Value'].values[0]
    lost_trades = trade_df[trade_df['Metric'].str.contains('lost.total')]['Value'].values[0]
    
    # Create a DataFrame for trade outcomes
    trade_outcomes_df = pd.DataFrame({
        'Outcome': ['Won', 'Lost'],
        'Count': [won_trades, lost_trades]
    })
    
    # Save trade outcomes to CSV
    trade_outcomes_df.to_csv(os.path.join(results_dir, "trade_outcomes.csv"), index=False)
    
    # Plot trade outcomes
    fig = px.pie(trade_outcomes_df, values='Count', names='Outcome', title='Trade Outcomes')
    fig.write_html(os.path.join(results_dir, "trade_outcomes.html"))
    
    
    # 2. PnL (Profit and Loss)
    gross_pnl = trade_df[trade_df['Metric'].str.contains('pnl.gross.total')]['Value'].values[0]
    net_pnl = trade_df[trade_df['Metric'].str.contains('pnl.net.total')]['Value'].values[0]
    
    # Create a DataFrame for PnL
    pnl_df = pd.DataFrame({
        'Type': ['Gross PnL', 'Net PnL'],
        'Value': [gross_pnl, net_pnl]
    })
    
    # Save PnL data to CSV
    pnl_df.to_csv(os.path.join(results_dir, "pnl_data.csv"), index=False)
    
    # Plot PnL
    fig = px.bar(pnl_df, x='Type', y='Value', title='Gross vs Net PnL')
    fig.write_html(os.path.join(results_dir, "pnl_data.html"))

    
    # 3. Streaks
    won_streak_current = trade_df[trade_df['Metric'].str.contains('streak.won.current')]['Value'].values[0]
    won_streak_longest = trade_df[trade_df['Metric'].str.contains('streak.won.longest')]['Value'].values[0]
    lost_streak_current = trade_df[trade_df['Metric'].str.contains('streak.lost.current')]['Value'].values[0]
    lost_streak_longest = trade_df[trade_df['Metric'].str.contains('streak.lost.longest')]['Value'].values[0]
    
    # Create a DataFrame for streaks
    streaks_df = pd.DataFrame({
        'Streak Type': ['Won (Current)', 'Won (Longest)', 'Lost (Current)', 'Lost (Longest)'],
        'Value': [won_streak_current, won_streak_longest, lost_streak_current, lost_streak_longest]
    })
    
    # Save streaks data to CSV
    streaks_df.to_csv(os.path.join(results_dir, "streaks_data.csv"), index=False)
    
    # Plot streaks
    fig = px.bar(streaks_df, x='Streak Type', y='Value', title='Winning and Losing Streaks')
    fig.write_html(os.path.join(results_dir, "streaks_data.html"))
    
    # 4. Trade Length
    avg_trade_length = get_metric_value(trade_df, 'len.average')
    max_trade_length = get_metric_value(trade_df, 'len.max')
    
    # Create a DataFrame for trade length (only if metrics are available)
    if avg_trade_length is not None and max_trade_length is not None:
        trade_length_df = pd.DataFrame({
            'Metric': ['Average Trade Length', 'Max Trade Length'],
            'Value': [avg_trade_length, max_trade_length]
        })
        
        # Save trade length data to CSV
        trade_length_df.to_csv(os.path.join(results_dir, "trade_length_data.csv"), index=False)
        
        # Plot trade length
        fig = px.bar(trade_length_df, x='Metric', y='Value', title='Trade Length')
        fig.write_html(os.path.join(results_dir, "trade_length_data.html"))

    else:
        print("Trade length metrics not found in the analysis.")
    
    # 5. Equity Curve
    equity_df = pd.DataFrame({
        'Timestamp': range(len(strategy.portfolio_value)),
        'Value': strategy.portfolio_value
    })
    
    # Save equity curve data to CSV
    equity_df.to_csv(os.path.join(results_dir, "equity_curve.csv"), index=False)
    
    # Plot equity curve
    fig = px.line(equity_df, x='Timestamp', y='Value', title='Portfolio Equity Curve')
    fig.write_html(os.path.join(results_dir, "equity_curve.html"))
    
    # Create a summary text file
    with open(os.path.join(results_dir, "summary.txt"), "w") as f:
        f.write(f"Backtest Results Summary\n")
        f.write(f"======================\n\n")
        f.write(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"Sharpe Ratio: {sharpe_ratio['sharperatio']}\n\n")
        f.write(f"Total Trades: {total_trades}\n")
        f.write(f"Won Trades: {won_trades} ({won_trades/total_trades*100:.2f}%)\n")
        f.write(f"Lost Trades: {lost_trades} ({lost_trades/total_trades*100:.2f}%)\n\n")
        f.write(f"Gross PnL: {gross_pnl}\n")
        f.write(f"Net PnL: {net_pnl}\n\n")
        f.write(f"Current Win Streak: {won_streak_current}\n")
        f.write(f"Longest Win Streak: {won_streak_longest}\n")
        f.write(f"Current Loss Streak: {lost_streak_current}\n")
        f.write(f"Longest Loss Streak: {lost_streak_longest}\n")
    
    print(f"All results saved to {results_dir}")


def run_backtest(stock):
    """
    Run a backtest for a specific stock.
    
    Args:
        stock: Stock symbol
    
    Returns:
        dict: Results of the backtest
    """
    print(f"Running backtest for {stock}...")
    
    # Load price data
    price_df = load_price_data(stock)
    if price_df is None:
        print(f"Cannot run backtest for {stock} due to missing price data.")
        return None
    
    # Load earnings data
    earnings_df = load_earnings_data(stock)
    if earnings_df is None:
        print(f"Cannot run backtest for {stock} due to missing earnings data.")
        return None
    
    # Ensure price_df and earnings_df have no timezone
    price_df.index = price_df.index.tz_localize(None)
    earnings_df.index = earnings_df.index.tz_localize(None)
    
    # Filter for trading hours
    filtered_price_df = filter_trading_hours(price_df)
    
    # Create a cerebro instance
    cerebro = bt.Cerebro()
    
    # Add data feed
    data = bt.feeds.PandasData(dataname=filtered_price_df, datetime=None)
    cerebro.adddata(data)
    
    # Create and add strategy
    strategy = EarningsTradingStrategy
    # Use a class attribute to pass earnings data to the strategy
    strategy.earnings_data = earnings_df
    # cerebro.addstrategy(strategy,stock=stock,regression_file="../regression_predictions_new.csv")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    regression_file_path = os.path.join(base_dir, "regression_predictions_new.csv")
    cerebro.addstrategy(strategy, stock=stock, regression_file=regression_file_path)

    
    # Set broker parameters
    cerebro.broker.setcash(10000.0)
    cerebro.broker.setcommission(commission=0.001)
    
    # Add analyzers
    cerebro.addanalyzer(bt.analyzers.TimeReturn, _name='time_return', timeframe=bt.TimeFrame.Days)
    cerebro.addanalyzer(btanalyzers.SharpeRatio, _name='mysharpe', riskfreerate=0.03, timeframe=bt.TimeFrame.Days, annualize=True)
    cerebro.addanalyzer(btanalyzers.AnnualReturn, _name='annual_return')
    cerebro.addanalyzer(btanalyzers.DrawDown, _name='drawdown')
    cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name='trade_analyzer')
    cerebro.addanalyzer(btanalyzers.Returns, _name='returns')
    cerebro.addanalyzer(btanalyzers.PyFolio, _name='pyfolio')  # For advanced metrics
    
    # Run the backtest
    thestrats = cerebro.run()
    thestrat = thestrats[0]
    
    # Get the analyzers
    sharpe_ratio = thestrat.analyzers.mysharpe.get_analysis()
    trade_analysis = thestrat.analyzers.trade_analyzer.get_analysis()
    
    # Print results
    print(f"Sharpe Ratio for {stock}:", sharpe_ratio['sharperatio'])
    print(trade_analysis)
    
    # Create results directory
    results_dir = create_results_dir(stock)
    
    # Save results
    save_backtest_results(results_dir, trade_analysis, sharpe_ratio, thestrat)
    
    return {
        'stock': stock,
        'sharpe_ratio': sharpe_ratio['sharperatio'],
        'trade_analysis': trade_analysis,
        'results_dir': results_dir,
        'trade_entries': thestrat.df  # Include trade entries in the return dict
    }


def main():
    """
    Main function to run backtests for all stocks.
    """
    # List of stocks to analyze
    stocks = ['NVDA', 'GOOGL', 'GS', 'GME', 'MSFT']
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_results_path = os.path.join(script_dir, "frontend", "results")
    if not os.path.exists(base_results_path):
        os.makedirs(base_results_path)
    
    # Run backtests for all stocks
    results = {}
    for stock in stocks:
        stock_result = run_backtest(stock)
        if stock_result:
            results[stock] = stock_result
    
    # Compare results across stocks
    if results:
        sharpe_ratios = {stock: result['sharpe_ratio'] for stock, result in results.items()}
        
        # Print comparison
        print("\nSharpe Ratio Comparison:")
        for stock, sharpe in sorted(sharpe_ratios.items(), key=lambda x: x[1], reverse=True):
            print(f"{stock}: {sharpe:.4f}")
        
        # Plot comparison
        sharpe_df = pd.DataFrame({
            'Stock': list(sharpe_ratios.keys()),
            'Sharpe Ratio': list(sharpe_ratios.values())
        })
        
        # Save comparison results
        comparison_dir = os.path.join('results', 'comparison')
        os.makedirs(comparison_dir, exist_ok=True)
        sharpe_df.to_csv(os.path.join(comparison_dir, "sharpe_comparison.csv"), index=False)
        
        # Plot comparison
        fig = px.bar(sharpe_df, x='Stock', y='Sharpe Ratio', title='Sharpe Ratio Comparison')
        fig.write_html(os.path.join(comparison_dir, "sharpe_comparison.html"))


if __name__ == "__main__":
    main()