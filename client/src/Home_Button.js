import React from 'react';
import Button from 'react-bootstrap/Button';
import { HouseDoorFill } from 'react-bootstrap-icons';

function Home_Button({ onClick }) {
  return (
    <div className="d-flex justify-content-center mb-5">
      <Button
        variant="primary"
        size="lg"
        className="px-4 py-2 fw-bold"
        onClick={onClick}
      >
        <HouseDoorFill className="me-2 fs-4" /> Home
      </Button>
    </div>
  );
}

export default Home_Button;
