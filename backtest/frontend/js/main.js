// Main JavaScript for PEAD Regression Backtest Dashboard

// DOM Elements
const stockSelect = document.getElementById('stock-select');
const sections = document.querySelectorAll('.content-section');
const navLinks = document.querySelectorAll('.menu a');
const selectedStockName = document.getElementById('selected-stock-name');

// Overview cards
const bestStock = document.getElementById('best-stock');
const bestSharpe = document.getElementById('best-sharpe');
const worstStock = document.getElementById('worst-stock');
const worstSharpe = document.getElementById('worst-sharpe');
const avgSharpe = document.getElementById('avg-sharpe');

// Detail cards
const detailSharpe = document.getElementById('detail-sharpe');
const detailTrades = document.getElementById('detail-trades');
const detailWinrate = document.getElementById('detail-winrate');
const detailPnl = document.getElementById('detail-pnl');

// Comparison elements
const comparisonMetric = document.getElementById('comparison-metric');
const comparisonTable = document.getElementById('comparison-table').querySelector('tbody');

// Helper functions
function formatNumber(number, decimals = 2) {
    return number.toFixed(decimals);
}

function getColorForSharpe(sharpe) {
    if (sharpe > 1) return '#4ade80';
    if (sharpe > 0) return '#fbbf24';
    return '#f87171';
}

async function loadequityCSV(path) {
    const res = await fetch(path);
    const text = await res.text();

    // Skip header and split each line into [timestamp, value]
    const rows = text.trim().split('\n').slice(1); // remove header
    return rows.map(row => {
        const [x, y] = row.split(',');
        return { x: parseInt(x), y: parseFloat(y) };
    });
}

// Function to parse summary.txt content
function parseSummaryFile(content) {
    const lines = content.split('\n');
    const data = {};
    
    lines.forEach(line => {
        if (line.includes('Sharpe Ratio:')) {
            data.sharpe = parseFloat(line.split(':')[1]) || 0;
        } else if (line.includes('Total Trades:')) {
            data.totalTrades = parseFloat(line.split(':')[1]) || 0;
        } else if (line.includes('Won Trades:')) {
            const match = line.match(/(\d+\.?\d*)\s*\((\d+\.?\d*)%\)/);
            if (match) {
                data.wonTrades = parseFloat(match[1]);
                data.winRate = parseFloat(match[2]);
            }
        } else if (line.includes('Lost Trades:')) {
            data.lostTrades = parseFloat(line.split(':')[1]) || 0;
        } else if (line.includes('Net PnL:')) {
            data.netPnL = parseFloat(line.split(':')[1]) || 0;
        } else if (line.includes('Current Win Streak:')) {
            data.currentWin = parseFloat(line.split(':')[1]) || 0;
        } else if (line.includes('Longest Win Streak:')) {
            data.longestWin = parseFloat(line.split(':')[1]) || 0;
        } else if (line.includes('Current Loss Streak:')) {
            data.currentLoss = parseFloat(line.split(':')[1]) || 0;
        } else if (line.includes('Longest Loss Streak:')) {
            data.longestLoss = parseFloat(line.split(':')[1]) || 0;
        }
    });
    
    return data;
}

// Function to load stock data from summary files
async function loadStockData() {
    const tickers = ['NVDA', 'GOOGL', 'GS', 'GME', 'MSFT'];
    const stockData = {};

    for (const ticker of tickers) {
        try {
            const response = await fetch(`results/${ticker}/${ticker}_backtest_results/summary.txt`);
            const content = await response.text();
            const data = parseSummaryFile(content);
            
            stockData[ticker] = {
                name: ticker, // You might want to maintain a separate mapping for full names
                ticker: ticker,
                sharpe: data.sharpe,
                totalTrades: data.totalTrades,
                winRate: data.winRate,
                netPnL: data.netPnL,
                wonTrades: data.wonTrades,
                lostTrades: data.lostTrades,
                streaks: {
                    currentWin: data.currentWin,
                    longestWin: data.longestWin,
                    currentLoss: data.currentLoss,
                    longestLoss: data.longestLoss
                }
            };
        } catch (error) {
            console.error(`Error loading data for ${ticker}:`, error);
        }
    }
    
    // Load trades data for each stock
    for (const ticker in stockData) {
        try {
            const response = await fetch(`results/${ticker}/${ticker}_backtest_results/trade_entries.csv`);
            const csvText = await response.text();
            const trades = parseTradeEntriesCSV(csvText);
            stockData[ticker].trades = trades;
        } catch (error) {
            console.error(`Error loading trades for ${ticker}:`, error);
        }
    }
    
    return stockData;
}

// Add this helper function to parse the CSV
function parseTradeEntriesCSV(csvText) {
    const lines = csvText.trim().split('\n');
    return lines.slice(1).map(line => {
        const [, datetime, price, signal, closed] = line.split(',');
        return {
            datetime,
            price: parseFloat(price),
            signal,
            closed
        };
    });
}

// Initialize the dashboard
async function initDashboard() {
    
    window.stockData = await loadStockData();
    
    // Then initialize the rest of the dashboard
    updateOverviewCards();
    createSharpeComparisonChart();
    await createWinLossChart();
    updateStockDetails('NVDA');
    updateComparisonTable();
    createComparisonChart('sharpe');
    addEventListeners();
}


function updateOverviewCards() {
    
    const tickers = Object.keys(window.stockData);
    if (tickers.length === 0) {
        console.error('No stock data available');
        return;
    }

    let bestStockTicker = tickers[0];
    let worstStockTicker = tickers[0];
    let bestSharpeVal = window.stockData[tickers[0]].sharpe;
    let worstSharpeVal = window.stockData[tickers[0]].sharpe;
    
    // Calculate average Sharpe ratio
    let totalSharpe = 0;
    let count = 0;
    
    for (const ticker in window.stockData) {
        const currentSharpe = window.stockData[ticker].sharpe;
        
        
        if (currentSharpe == null) continue;
        
        totalSharpe += currentSharpe;
        count++;
        
        if (currentSharpe > bestSharpeVal || bestSharpeVal == null) {
            bestSharpeVal = currentSharpe;
            bestStockTicker = ticker;
        }
        
        if (currentSharpe < worstSharpeVal || worstSharpeVal == null) {
            worstSharpeVal = currentSharpe;
            worstStockTicker = ticker;
        }
    }
    
    const averageSharpe = count > 0 ? totalSharpe / count : 0;
    
    // Update the DOM with proper error handling
    try {
        bestStock.textContent = bestStockTicker;
        bestSharpe.textContent = formatNumber(bestSharpeVal);
        worstStock.textContent = worstStockTicker;
        worstSharpe.textContent = formatNumber(worstSharpeVal);
        avgSharpe.textContent = formatNumber(averageSharpe);
    } catch (error) {
        console.error('Error updating overview cards:', error);
    }
}

// Update stock details section
async function updateStockDetails(ticker) {
    const stock = window.stockData[ticker];
    
    selectedStockName.textContent = ticker;
    document.getElementById('trades-stock-name').textContent = ticker;
    
    
    detailSharpe.textContent = formatNumber(stock.sharpe);
    detailSharpe.className = 'card-value ' + (stock.sharpe > 0 ? 'positive' : 'negative');
    
    detailTrades.textContent = stock.totalTrades;
    detailWinrate.textContent = `${formatNumber(stock.winRate)}%`;
    detailPnl.textContent = `$${formatNumber(stock.netPnL)}`;
    detailPnl.className = 'card-value ' + (stock.netPnL > 0 ? 'positive' : 'negative');
    
    
    await createNewEquityChart(ticker);
    await createTradeOutcomesChart(ticker);
    await createStreaksChart(ticker);

    // create Trades Table
    createTradesTable(ticker);
}

// Create Sharpe Ratio comparison chart
function createSharpeComparisonChart() {
    const labels = [];
    const data = [];
    const backgroundColors = [];
    
    for (const ticker in window.stockData) {
        labels.push(ticker);
        data.push(window.stockData[ticker].sharpe);
        backgroundColors.push(getColorForSharpe(window.stockData[ticker].sharpe));
    }
    
    
    document.querySelector("#sharpe-comparison-chart").innerHTML = '';
    
    const options = {
        series: [{
            name: 'Sharpe Ratio',
            data: data
        }],
        chart: {
            type: 'bar',
            height: 280,
            toolbar: {
                show: false
            }
        },
        plotOptions: {
            bar: {
                distributed: true,
                borderRadius: 4,
                horizontal: false,
                columnWidth: '55%',
            }
        },
        dataLabels: {
            enabled: false
        },
        legend: {
            show: false
        },
        xaxis: {
            categories: labels,
            labels: {
                style: {
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            title: {
                text: 'Sharpe Ratio'
            },
            labels: {
                formatter: function(val) {
                    return formatNumber(val, 2);
                }
            }
        },
        fill: {
            colors: backgroundColors
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return formatNumber(val);
                }
            }
        }
    };

    const chart = new ApexCharts(document.querySelector("#sharpe-comparison-chart"), options);
    chart.render();
}

// Load trade outcomes from CSV
async function loadTradeOutcomes(ticker) {
    try {
        const response = await fetch(`results/${ticker}/${ticker}_backtest_results/trade_outcomes.csv`);
        const text = await response.text();
        const rows = text.trim().split('\n').slice(1); // Skip header
        
        let wonTrades = 0;
        let lostTrades = 0;
        
        rows.forEach(row => {
            const [outcome, count] = row.split(',');
            if (outcome === 'Won') wonTrades = parseFloat(count) || 0;
            if (outcome === 'Lost') lostTrades = parseFloat(count) || 0;
        });
        
        const total = wonTrades + lostTrades;
        const winRate = total > 0 ? (wonTrades / total) * 100 : 0;
        
        return {
            winRate: winRate,
            lossRate: 100 - winRate
        };
    } catch (error) {
        console.error(`Error loading trade outcomes for ${ticker}:`, error);
        return { winRate: 0, lossRate: 100 };
    }
}

// Create Win/Loss chart
async function createWinLossChart() {
    const tickers = Object.keys(window.stockData);
    const winRates = [];
    const lossRates = [];
    
    
    for (const ticker of tickers) {
        const outcomes = await loadTradeOutcomes(ticker);
        winRates.push(outcomes.winRate);
        lossRates.push(outcomes.lossRate);
    }
    
    const options = {
        series: [{
            name: 'Win',
            data: winRates
        }, {
            name: 'Loss',
            data: lossRates
        }],
        chart: {
            type: 'bar',
            height: 280,
            stacked: true,
            stackType: '100%',
            toolbar: {
                show: false
            }
        },
        responsive: [{
            breakpoint: 480,
            options: {
                legend: {
                    position: 'bottom',
                    offsetX: -10,
                    offsetY: 0
                }
            }
        }],
        xaxis: {
            categories: tickers,
        },
        yaxis: {
            labels: {
                formatter: function(val) {
                    return val.toFixed(2) + "%";
                }
            }
        },
        fill: {
            opacity: 1,
            colors: ['#4ade80', '#f87171']
        },
        legend: {
            position: 'right',
            offsetY: 40
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val.toFixed(2) + "%";
                }
            }
        }
    };

    
    document.querySelector("#win-loss-chart").innerHTML = '';
    const chart = new ApexCharts(document.querySelector("#win-loss-chart"), options);
    chart.render();
}

// Equity Chart Function 
async function createNewEquityChart(ticker){
    const data = await loadequityCSV(`results/${ticker}/${ticker}_backtest_results/equity_curve.csv`);
    // Dynamically color based on trend
    const start = data[0].y;
    const end = data[data.length - 1].y;
    const color = end >= start ? '#4ade80' : '#f87171'; // green or red
    const options = {
        series: [{
            name: 'Equity',
            data: data
        }],
        chart: {
            type: 'area',
            height: 300,
            zoom: { enabled: true }
        },
        stroke: {
            curve: 'smooth',
            width: 2,
            colors: [color]
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.6,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            },
            colors: [color]
        },
        dataLabels: {
            enabled: false 
        },
        xaxis: {
            type: 'numeric',
            title: { text: 'Date' }
        },
        yaxis: {
            title: { text: 'Equity ($)' },
            labels: {
                formatter: function(val) {
                    return val.toFixed(2);
                }
            }
        },
        tooltip: {
            x: { format: 'dd MMM yyyy' },
            y: { formatter: val => `$${val.toFixed(2)}` }
        }
    };

    
    document.querySelector("#equity-curve-chart").innerHTML = '';
    const chart = new ApexCharts(document.querySelector("#equity-curve-chart"), options);
    chart.render();
}


// Create Trade Outcomes chart
async function createTradeOutcomesChart(ticker) {
    try {
        
        const response = await fetch(`results/${ticker}/${ticker}_backtest_results/trade_outcomes.csv`);
        const text = await response.text();
        const rows = text.trim().split('\n').slice(1); // Skip header
        
        let wonTrades = 0;
        let lostTrades = 0;
        
        // Parse CSV data
        rows.forEach(row => {
            const [outcome, count] = row.split(',');
            if (outcome === 'Won') wonTrades = parseFloat(count) || 0;
            if (outcome === 'Lost') lostTrades = parseFloat(count) || 0;
        });

        const options = {
            series: [wonTrades, lostTrades],
            chart: {
                type: 'donut',
                height: 280
            },
            labels: ['Won', 'Lost'],
            colors: ['#4ade80', '#f87171'],
            legend: {
                position: 'bottom'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }],
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + " trades";
                    }
                }
            }
        };

        
        document.querySelector("#trade-outcomes-chart").innerHTML = '';
        
        const chart = new ApexCharts(document.querySelector("#trade-outcomes-chart"), options);
        chart.render();
    } catch (error) {
        console.error(`Error loading trade outcomes for ${ticker}:`, error);
        document.querySelector("#trade-outcomes-chart").innerHTML = 'Error loading trade data';
    }
}

// Load streaks data from CSV
async function loadStreaksData(ticker) {
    try {
        const response = await fetch(`results/${ticker}/${ticker}_backtest_results/streaks_data.csv`);
        const text = await response.text();
        const rows = text.trim().split('\n').slice(1); // Skip header
        
        const streaksData = {
            currentWin: 0,
            longestWin: 0,
            currentLoss: 0,
            longestLoss: 0
        };
        
        rows.forEach(row => {
            const [type, value] = row.split(',');
            switch(type) {
                case 'Won (Current)':
                    streaksData.currentWin = parseFloat(value) || 0;
                    break;
                case 'Won (Longest)':
                    streaksData.longestWin = parseFloat(value) || 0;
                    break;
                case 'Lost (Current)':
                    streaksData.currentLoss = parseFloat(value) || 0;
                    break;
                case 'Lost (Longest)':
                    streaksData.longestLoss = parseFloat(value) || 0;
                    break;
            }
        });
        
        return streaksData;
    } catch (error) {
        console.error(`Error loading streaks data for ${ticker}:`, error);
        return null;
    }
}

// Create Streaks chart
async function createStreaksChart(ticker) {
    try {
        const streaksData = await loadStreaksData(ticker);
        
        if (!streaksData) {
            document.querySelector("#streaks-chart").innerHTML = 'Error loading streaks data';
            return;
        }

        const options = {
            series: [{
                name: 'Current',
                data: [streaksData.currentWin, streaksData.currentLoss]
            }, {
                name: 'Longest',
                data: [streaksData.longestWin, streaksData.longestLoss]
            }],
            chart: {
                type: 'bar',
                height: 280,
                toolbar: {
                    show: false
                }
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    endingShape: 'rounded'
                },
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            xaxis: {
                categories: ['Win Streak', 'Loss Streak'],
            },
            yaxis: {
                title: {
                    text: 'Trades'
                }
            },
            fill: {
                opacity: 1,
                colors: ['#4361ee', '#fb923c']
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + " trades";
                    }
                }
            }
        };

        document.querySelector("#streaks-chart").innerHTML = '';
        
        const chart = new ApexCharts(document.querySelector("#streaks-chart"), options);
        chart.render();
    } catch (error) {
        console.error(`Error creating streaks chart for ${ticker}:`, error);
        document.querySelector("#streaks-chart").innerHTML = 'Error creating streaks chart';
    }
}

// Update comparison table
function updateComparisonTable() {
    
    comparisonTable.innerHTML = '';
    
    for (const ticker in window.stockData) {  
        const stock = window.stockData[ticker];
        
        const row = document.createElement('tr');
        
        const tickerCell = document.createElement('td');
        tickerCell.textContent = stock.name || ticker;  
        row.appendChild(tickerCell);
        
        const sharpeCell = document.createElement('td');
        sharpeCell.textContent = formatNumber(stock.sharpe);
        sharpeCell.className = stock.sharpe > 0 ? 'positive' : 'negative';
        row.appendChild(sharpeCell);
        
        const tradesCell = document.createElement('td');
        tradesCell.textContent = stock.totalTrades;
        row.appendChild(tradesCell);
        
        const winRateCell = document.createElement('td');
        winRateCell.textContent = `${formatNumber(stock.winRate)}%`;
        row.appendChild(winRateCell);
        
        const pnlCell = document.createElement('td');
        pnlCell.textContent = `$${formatNumber(stock.netPnL)}`;
        pnlCell.className = stock.netPnL > 0 ? 'positive' : 'negative';
        row.appendChild(pnlCell);
        
        comparisonTable.appendChild(row);
    }
}

// Create Comparison chart
function createComparisonChart(metric) {
    if (!window.stockData) {
        console.error('Stock data not loaded');
        return;
    }

    const labels = [];
    const data = [];
    const backgroundColors = [];
    let title = '';
    let prefix = '';
    let suffix = '';
    
    // Get data and determine min/max for PnL scaling
    let minValue = 0;
    let maxValue = 0;
    
    for (const ticker in window.stockData) {
        const stock = window.stockData[ticker];
        labels.push(stock.name || ticker);
        
        let value;
        switch(metric) {
            case 'sharpe':
                value = stock.sharpe;
                backgroundColors.push(getColorForSharpe(value));
                title = 'Sharpe Ratio';
                break;
            case 'winrate':
                value = stock.winRate;
                backgroundColors.push(value > 50 ? '#4ade80' : '#fbbf24');
                title = 'Win Rate';
                suffix = '%';
                minValue = Math.min(minValue, value);
                maxValue = Math.max(maxValue, value);
                break;
            case 'pnl':
                value = stock.netPnL;
                backgroundColors.push(value > 0 ? '#4ade80' : '#f87171');
                title = 'Net PnL';
                prefix = '$';
                minValue = Math.min(minValue, value);
                maxValue = Math.max(maxValue, value);
                break;
            case 'trades':
                value = stock.totalTrades;
                backgroundColors.push('#4361ee');
                title = 'Total Trades';
                break;
            default:
                value = 0;
        }
        
        data.push(value || 0);
    }
    
    // Base options
    const options = {
        series: [{
            name: title,
            data: data
        }],
        chart: {
            type: 'bar',
            height: 350,
            toolbar: {
                show: false
            }
        },
        plotOptions: {
            bar: {
                distributed: true,
                borderRadius: 4,
                horizontal: false,
                columnWidth: '55%',
            }
        },
        dataLabels: {
            enabled: false
        },
        legend: {
            show: false
        },
        xaxis: {
            categories: labels,
            labels: {
                style: {
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            title: {
                text: title
            },
            labels: {
                formatter: function(val) {
                    return prefix + formatNumber(val) + suffix;
                }
            }
        },
        fill: {
            colors: backgroundColors
        },
        tooltip: {
            fixed: {
                enabled: true,
                position: 'topLeft',
                offsetY: 30,
                offsetX: 60
            },
            y: {
                formatter: function (val) {
                    return prefix + formatNumber(val) + suffix;
                }
            }
        }
    };

    // Add specific configurations for different metrics
    if (metric === 'pnl') {
        // Calculate symmetric range around zero
        const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue));
        options.yaxis = {
            ...options.yaxis,
            min: -absMax,
            max: absMax,
            tickAmount: 7,
            labels: {
                formatter: function(val) {
                    return prefix + formatNumber(val) + suffix;
                }
            },
            axisBorder: {
                show: true
            },
            axisTicks: {
                show: true
            },
            crosshairs: {
                show: true
            },
            plotLines: [{
                value: 0,
                width: 1,
                color: '#808080'
            }]
        };
    } else if (metric === 'winrate') {
        options.yaxis = {
            ...options.yaxis,
            min: 0,
            max: 100,
            tickAmount: 10,
            labels: {
                formatter: function(val) {
                    return formatNumber(val) + '%';
                }
            }
        };
        
        // Enable data labels to show values on bars
        options.dataLabels = {
            enabled: true,
            formatter: function(val) {
                return formatNumber(val) + '%';
            },
            style: {
                fontSize: '12px',
                colors: ['#333']
            }
        };
        
        // Adjust grid settings for better visibility
        options.grid = {
            show: true,
            borderColor: '#f1f1f1',
            strokeDashArray: 0,
            position: 'back'
        };
        
        
        options.plotOptions.bar = {
            ...options.plotOptions.bar,
            columnWidth: '70%',
            opacity: 1
        };
    }

    
    document.querySelector("#comparison-chart").innerHTML = '';
    
    const chart = new ApexCharts(document.querySelector("#comparison-chart"), options);
    chart.render();
}

// Event Listeners
function addEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            this.parentElement.classList.add('active');

            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
  
    stockSelect.addEventListener('change', function() {
        updateStockDetails(this.value);
    });
    
    
    comparisonMetric.addEventListener('change', function() {
        createComparisonChart(this.value);
    });

    // Add search functionality
    const searchInput = document.querySelector('.search-box input');
    const searchButton = document.querySelector('.search-box button');

    function performSearch() {
        const searchTerm = searchInput.value.toUpperCase().trim();
       
        if (window.stockData && window.stockData[searchTerm]) {
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            const stockDetailsLink = document.querySelector('[data-section="stock-details"]');
            stockDetailsLink.parentElement.classList.add('active');
            document.getElementById('stock-details').classList.add('active');
            stockSelect.value = searchTerm;
            updateStockDetails(searchTerm);

            searchInput.value = '';
        } else {
            alert('Ticker not found. Please enter a valid ticker symbol.');
        }
    }

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Add this function to create the trades table
function createTradesTable(ticker) {
    const tableContainer = document.getElementById('trades-table-container');
    tableContainer.innerHTML = `
        <table id="trades-table">
            <thead>
                <tr>
                    <th>Date/Time</th>
                    <th>Price</th>
                    <th>Signal</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>
    `;

    const trades = window.stockData[ticker].trades;
    const tbody = document.querySelector('#trades-table tbody');
    
    trades.forEach(trade => {
        const row = document.createElement('tr');
        const dateTime = new Date(trade.datetime);
        
        row.innerHTML = `
            <td>${dateTime.toLocaleString()}</td>
            <td>$${trade.price}</td>
            <td class="${trade.signal.toLowerCase()}">${trade.signal}</td>
            <td>${trade.closed}</td>
        `;
        
        tbody.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', initDashboard);
