# Unit Testing

This directory contains unit tests for the ICOMS backend API.

## Running Tests

```bash
# Install dependencies (if not already installed)
npm install

# Run all tests with coverage
npm test

# Run tests in watch mode
npx jest --watch

# Run specific test file
npx jest tests/auth.test.js
```

## Test Structure

- `setup.js` - Test environment setup
- `auth.test.js` - Authentication route tests
- `patients.test.js` - Patient management route tests
- `appointments.test.js` - Appointment route tests

## Coverage

Tests cover:
- Input validation
- Authentication checks
- CRUD operations
- Error handling
