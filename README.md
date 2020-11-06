<p align="center">
    <img src="https://raw.githubusercontent.com/bc-ticketing/guest-client/master/docs/img/ticket-icon.png" alt="Ticketing dApp" align="center">
</p>

<h2 align="center">Blockchain Ticketing</h2>
<h3 align="center">Software Project</h3>
<div align="center"><code >University of Zurich</code></div>

---


## Contribution Workflow

1. Create a new issue (automatically adds the issue to the _To Do_ column of _Ticketing dApp_ project)
2. Assign yourself an issue from the _To Do_ column of the _Ticketing dApp_ project and move it to the _In Progress_ column
3. Pull the latest changes from `origin/master`
4. Create a new local branch beginning with the issue number (e.g., `4-feature`).
5. Commit to this branch mentioning the issue number in the commit message (e.g. `add functionality xyz (#4)`
6. Finish your implementation on the branch
7. Pull and merge the latest changes from `origin/master` into your local branch
8. Verify that your changes still work as expected
9. Merge your branch into `master` and push the changes
10. Close the issue and move it to the _Done_ column of the _Ticketing dApp_ project
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

## Evaluation Scripts

To quickly create many events, use the evaluation scripts under `evaluation`.

1. set the contract addresses in the environment:

```bash
export EVENT_FACTORY_ADDRESS=0x055b6e305864DC13E0b9F4ecB1591eE2e8a99C99  IDENTITY_ADDRESS=0x067b6772E882b541121a2af3Cf947E27D1edf4E9 TEST_ERC20_ADDRESS=0xf88D4b83Aa41d7E810d7235cC19365F0e522730C
```

2. run the scripts:

```bash
truffle test evaluation/GasCostAnalysis.js --network ganachecli
```

## IPFS Json schemas
### Event:
```json
{
  "version": "1.0",
  "event": {
    "title": "string",
    "location": "string",
    "category": "string",
    "description": "string",
    "image": "url",
    "time": "unix time stamp",
    "duration": "string",
    "url": "url",
    "twitter": "url"
  }
}
```
-> try uploading full picture (evaluation point for report)

following information is on ethereum:
- ipfs hash (to the json above)
- approver's eth address
- required minimum approvment level
- erc20 token that is accepted for payment

### Ticket type:
```json
{
  "version": "1.0",
  "ticket": {
    "title": "string",
    "description": "string",
    "event": "constractHash",
    "mapping": [
        "x1/y1",
        "x1/y2",
        "x1/y3"
    ]
  }
}
```
-> report: note, that the one mapping entry is restricted to be used once in one event in our application

following information is on ethereum:
- ipfs hash (to the json above)
- whether the ticket is non-fungible
- price
- finalization block
- supply


### Approver:
```json
{
  "version": "1.0",
  "approver": {
    "title": "string",
    "methods": [
      {
        "level": 1,
        "value": "method-name"
      },
      {
        "level": 2,
        "value": "method-name"
      }
    ],
    "url": "url",
    "twitter": "url"
  }
}
```

following information is on ethereum:
- ipfs hash (to the json above)


