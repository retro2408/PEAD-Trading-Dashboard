import React from 'react';
import { Card } from 'react-bootstrap';

function Interest_Card({ title, value }) {
    const formatAsPercentage = (value) => {
        if (isNaN(value)) return '0.00%';
        return `${parseFloat(value).toFixed(2)}%`;
    };

    return (
        <Card className="text-center">
            <Card.Body>
                <Card.Title>{title}</Card.Title>
                <Card.Text>{formatAsPercentage(value)}</Card.Text>
            </Card.Body>
        </Card>
    );
}

export default Interest_Card;
