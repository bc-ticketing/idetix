// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

contract Identity{
    struct IpfsCid {
        bytes1 hashFunction;
        bytes1 size;
        bytes32 digest;
    }

    address payable owner;
    uint idCount;

    constructor() public {
        owner = msg.sender;
        idCount = 0;
    }

    mapping (address => mapping (address => uint) ) approvedIdentity ;

    mapping (address => IpfsCid) approverInfo;

    function registerApprover(bytes1 _hashFunction, bytes1 _size, bytes32 _digest ) public {
        approverInfo[msg.sender] = IpfsCid(_hashFunction, _size, _digest);
    }

    function approveIdentity(address _identity, uint _level) public {
        require (approverInfo[msg.sender].digest != 0, "Please register first");
        approvedIdentity[msg.sender][_identity] = _level;
    }

    function getSecurityLevel( address _approver, address  _identity) public view returns (uint) {
        if (approverInfo[_approver].digest != 0 && approvedIdentity[_approver][_identity] != 0) {
            return approvedIdentity[_approver][_identity];
        }
        else {
            return 0;
        }
    }
    function getApproverInfo (address _approver) public view returns (IpfsCid memory) {
        if (approverInfo[_approver].digest != 0) {
            return approverInfo[_approver];
        }
        else {
            return IpfsCid(0, 0, 0);
        }
    }

}
