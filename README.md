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
    "image": "url", -> maybe upload full picture (evaluation point for report)
    "time": "mmddyyy:hhmm",
    "duration": "string",
    "url": "url",
    "twitter": "url"
  }
}
```

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
    "mapping": [ -> report: note, that the one mapping entry is restricted to be used once in one event in our application
        "x1/y1",
        "x1/y2",
        "x1/y3"
    ]
  }
}
```

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
