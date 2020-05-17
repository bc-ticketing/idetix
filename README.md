# idetix

## Generate ABIs

```bash
truffle compile
```

This generates the ABIs in a new folder `idetix/abi` in the root directory. Use these files to interact with the smart contracts from your web app.

## Deploy contracts on the test network

Make sure Ganache is running on port `7545` or change the port in `truffle-config.js`.

```bash
truffle migrate --reset
```

## Test

Install the necessary dependencies:

```bash
npm install
```

Run the tests:

```bash
tuffle test
```
