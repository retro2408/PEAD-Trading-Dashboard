import React, { useState } from 'react';
import { Form } from 'react-bootstrap';

function Amount_Field({ initialAmount, onAmountChange }) {
    const [localValue, setLocalValue] = useState();


    const formatAsMoney = (value) => {
        const absValue = Math.abs(value);
        const formattedValue = absValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return value < 0 ? `-${formattedValue}` : formattedValue;
    };

    const stripFormatting = (value) => value.replace(/[^0-9]/g, '');

    const handleFocus = () => {
        if (localValue !== null && localValue !== undefined && localValue !== '') {
            setLocalValue(stripFormatting(localValue));
        }
    };

    const handleInputChange = (e) => {
        const rawValue = stripFormatting(e.target.value)
        if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
            const numValue = Number(rawValue)
            if (numValue > 1000000) return;
            setLocalValue(numValue);
        }
        else {
            setLocalValue('');
        }
    };


    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };


    const handleBlur = () => {
        if (localValue !== null && localValue !== undefined && localValue !== '') {
            const value = Number(localValue)
            onAmountChange(value);
            const formattedValue = formatAsMoney(value);
            setLocalValue(formattedValue);
        } else {
            onAmountChange(0);
        }
    };

    return (
        <Form.Group controlId="initialAmount" className="mb-3">
            <Form.Label className="fw-bold">Initial Amount</Form.Label>
            <Form.Control
                type="text"
                value={localValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder="$0"
            />
        </Form.Group>
    );
}

export default Amount_Field;
