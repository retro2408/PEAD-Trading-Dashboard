import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Title } from 'chart.js';
import { Container, Row, Col } from 'react-bootstrap';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Title);

const Backtest_Graph = ({ backtest }) => {
    const [symbol, data] = backtest;

    const chartData = {
        labels: data.map(({ date }) => date),
        datasets: [
            {
                label: `Performance (${symbol})`,
                data: data.map(({ performance }) => performance),
                backgroundColor: data.map(({ performance }) =>
                    performance >= 0 ? 'rgba(0, 200, 0, 0.8)' : 'rgba(200, 0, 0, 0.8)'
                ),
                borderColor: 'rgba(0, 0, 0, 1)',
                borderWidth: 2,
                borderRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: `Backtest for ${symbol}`,
                font: { size: 20, weight: 'bold' },
                color: '#000', // Ensure the title remains black
            },
            tooltip: { callbacks: { label: ({ raw }) => `${raw >= 0 ? '+' : ''}${raw.toFixed(2)}%` } },
        },
        scales: {
            x: { title: { display: true, text: 'Date', font: { size: 16, weight: 'bold' }} },
            y: { title: { display: true, text: 'Performance (%)', font: { size: 16, weight: 'bold' }}, beginAtZero: true },
        },
    };

    return (
        <Container>
            <Row>
                <Col lg={{ span: 10, offset: 1 }} md={12}>
                    <div className="graph-wrapper p-3 bg-light rounded shadow">
                        <Bar data={chartData} options={options} height={600} />
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default Backtest_Graph;
