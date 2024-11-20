import React from 'react';
import Table from 'react-bootstrap/Table';
import { ArrowUp, ArrowDown, DashCircle } from 'react-bootstrap-icons';

function Stock_Table({ stocks, onSymbolClick }) {
  return (
    <Table bordered responsive="md" size="sm" striped>
      <thead className="table-dark">
        <tr>
          <th className="text-center">Name</th>
          <th className="text-center">Symbol</th>
          <th className="text-center">Price</th>
          <th className="text-center">Volume</th>
          <th className="text-center">EPS</th>
          <th className="text-center">Analyst EPS</th>
          <th className="text-center">Whisper Number</th>
          <th className="text-center">Surprise EPS</th>
          <th className="text-center">Trading Signal</th>
        </tr>
      </thead>
      <tbody className="table-light">
        {Object.keys(stocks).map((symbol) => {
          const stock = stocks[symbol];
          return (
            <tr key={symbol}>
              <td className="text-center">{stock.name}</td>
              <td className="text-center">
                <span
                  className="text-primary"
                  onClick={() => onSymbolClick(symbol)}
                  onMouseEnter={(e) => e.currentTarget.classList.add('text-decoration-underline')}
                  onMouseLeave={(e) => e.currentTarget.classList.remove('text-decoration-underline')}
                  style={{ cursor: 'pointer' }}
                >
                  {symbol}
                </span>
              </td>
              <td className="text-end">${stock.price.toFixed(2)}</td>
              <td className="text-end">{stock.volume.toLocaleString()}</td>
              <td className="text-end">{stock.eps.toFixed(2)}</td>
              <td className="text-end">{stock['analyst eps'].toFixed(2)}</td>
              <td className="text-end">{stock['whisper number'].toFixed(2)}</td>
              <td className="text-end">{stock['surprise eps'] >= 0 ? `+${stock['surprise eps'].toFixed(2)}` : stock['surprise eps'].toFixed(2)}</td>
              <td className="text-center">
                <span
                  className={
                    stock['trading signal'] === 1
                      ? 'badge bg-success'
                      : stock['trading signal'] === 2
                        ? 'badge bg-danger'
                        : 'badge bg-warning text-dark'
                  }
                >
                  {stock['trading signal'] === 1 ? (
                    <>
                      <ArrowUp className="me-2" /> Buy
                    </>
                  ) : stock['trading signal'] === 2 ? (
                    <>
                      <ArrowDown className="me-2" /> Sell
                    </>
                  ) : (
                    <>
                      <DashCircle className="me-2" /> Hold
                    </>
                  )}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export default Stock_Table;
