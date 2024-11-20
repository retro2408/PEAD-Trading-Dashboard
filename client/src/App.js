import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import io from 'socket.io-client';
import Stock_Table from './Stock_Table';
import Home_Button from './Home_Button';
import Backtest_Graph from './backtest_page/Backtest_Graph';
import Amount_Field from './backtest_page/Amount_Field';
import Interest_Card from './backtest_page/Interest_Card';
import Return_Card from './backtest_page/Return_Card';
import 'bootstrap/dist/css/bootstrap.min.css';

const socket = io('http://localhost:5000');

const test_data = [
  {
    "A": {
      "name": "Company A",
      "price": 10.55,
      "volume": 10000,
      "eps": 1.89,
      "analyst eps": 1.32,
      "whisper number": 1.35,
      "surprise eps": 0.57,
      "trading signal": 1,
    },
    "B": {
      "name": "Company B",
      "price": 25.78,
      "volume": 15000,
      "eps": 2.18,
      "analyst eps": 2.10,
      "whisper number": 2.20,
      "surprise eps": 0.08,
      "trading signal": 0,
    }
  },
  [
    "A",
    [
      { "date": "2024-11-1", "performance": 5.34 },
      { "date": "2024-11-2", "performance": -3.43 },
      { "date": "2024-11-3", "performance": 3.67 },
      { "date": "2024-11-4", "performance": -7.89 },
      { "date": "2024-11-5", "performance": -5.34 },
      { "date": "2024-11-6", "performance": 5.34 },
      { "date": "2024-11-7", "performance": -3.43 },
      { "date": "2024-11-8", "performance": 4.67 },
      { "date": "2024-11-9", "performance": 7.89 },
      { "date": "2024-11-10", "performance": 5.34 },
      { "date": "2024-11-11", "performance": 5.74 },
      { "date": "2024-11-12", "performance": -3.43 },
      { "date": "2024-11-13", "performance": 7.67 },
      { "date": "2024-11-14", "performance": 7.89 },
      { "date": "2024-11-15", "performance": -5.34 },
      { "date": "2024-11-16", "performance": 5.34 },
      { "date": "2024-11-17", "performance": -3.43 },
      { "date": "2024-11-18", "performance": 3.67 },
      { "date": "2024-11-19", "performance": -7.89 },
      { "date": "2024-11-20", "performance": 5.34 },
    ]
  ]
];

function App() {
  const [stocks, setStocks] = useState({});
  const [backtest, setBacktestData] = useState([]);
  const [amount, setAmount] = useState(0);
  const [simpleInterest, setSimpleInterest] = useState(0);
  const [compoundInterest, setCompoundInterest] = useState(0);
  const [simpleInterestReturn, setSimpleInterestReturn] = useState(0);
  const [compoundInterestReturn, setCompoundInterestReturn] = useState(0);

  useEffect(() => {
    console.log('Setting up WebSocket listeners');
    socket.on('stocks', (stock_data) => setStocks(stock_data));
    socket.on('backtest', (backtest_data) => setBacktestData(backtest_data));
    socket.on('update', (updated_data) =>
      setStocks((prevStocks) => ({ ...prevStocks, ...updated_data }))
    );
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (backtest.length !== 0) {
      const [, performanceData] = backtest;

      const si = performanceData.reduce((sum, entry) => sum + entry.performance, 0);
      setSimpleInterest(si);

      const ci =
        (performanceData
          .map((entry) => (entry.performance + 100) / 100)
          .reduce((product, value) => product * value, 1) -
          1) *
        100;
      setCompoundInterest(ci);
    }
  }, [backtest]);

  useEffect(() => {
    setSimpleInterestReturn(Math.max(0, (amount * simpleInterest) / 100));
    setCompoundInterestReturn(Math.max(0, (amount * compoundInterest) / 100));
  }, [amount, simpleInterest, compoundInterest]);

  const handleSymbolClick = (symbol) => {
    console.log(`Requesting backtest data for ${symbol}`);
    socket.emit('symbol', symbol);
  };

  const handleHomeClick = () => {
    setBacktestData([]);
    setAmount(0);
  };

  const handleAmountChange = (newAmount) => {
    setAmount(newAmount);
  };

  return (
    <div className="container py-3">
      <Home_Button onClick={handleHomeClick} />
      {backtest.length === 0 ? (
        <Stock_Table stocks={stocks} onSymbolClick={handleSymbolClick} />
      ) : (
        <div>
          <Amount_Field initialAmount={amount} onAmountChange={handleAmountChange} />
          <Row className="justify-content-center">
            <Col md={3}>
              <Interest_Card title="Simple Interest" value={simpleInterest} />
            </Col>
            <Col md={3}>
              <Return_Card
                title="Simple Interest Return"
                value={simpleInterestReturn}
              />
            </Col>
            <Col md={3}>
              <Interest_Card title="Compound Interest" value={compoundInterest} />
            </Col>
            <Col md={3}>
              <Return_Card
                title="Compound Interest Return"
                value={compoundInterestReturn}
              />
            </Col>
          </Row>
          <Backtest_Graph backtest={backtest} />
        </div>
      )}
    </div>
  );
}

export default App;
