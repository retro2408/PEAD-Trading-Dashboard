import React from 'react';
import { Card } from 'react-bootstrap';

function Return_Card({ title, value }) {
    const formatAsDollar = (value) => {
        if (isNaN(value)) return '$0';
        return `$${Math.round(Number(value)).toLocaleString('en-US')}`;
    };

    return (
        <Card className="text-center">
            <Card.Body>
                <Card.Title>{title}</Card.Title>
                <Card.Text>{formatAsDollar(value)}</Card.Text>
            </Card.Body>
        </Card>
    );
}

export default Return_Card;
