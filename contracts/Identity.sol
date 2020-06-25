pragma solidity ^0.6.8;


contract identity{
    address payable owner;
    uint idCount;

    constructor() public {
        owner = msg.sender;
        idCount = 0;
    }

    mapping (address => mapping (address => uint) ) approvedIdentity ;

    mapping (address => bytes32) approverInfo;

    function registerApprover( bytes32 ipfsHash ) public returns (bool) {
        approverInfo[msg.sender] = ipfsHash;
        return true;
    }

    function approveIdentity( address identity, uint level) public returns (bool) {
        require (approverInfo[msg.sender] != 0, "Please register first");
        approvedIdentity[msg.sender][identity] = level;
        return true;
    }

    function getSecurityLevel( address approver, address  identity) public view returns (uint) {
        if (approverInfo[approver] != 0 && approvedIdentity[approver][identity] != 0) {
            return approvedIdentity[approver][identity];
        }
        else {
            return 0;
        }
    }
    function getApproverInfo (address approver) public view returns (bytes32) {
        if (approverInfo[approver] != 0) {
            return approverInfo[approver];
        }
        else {
            return 0;
        }
    }

}
