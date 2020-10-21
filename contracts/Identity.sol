// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

contract Identity{
    struct IpfsCid {
        bytes1 hashFunction;
        bytes1 size;
        bytes32 digest;
    }

    event ApproverRegistered(address approverAddress,bytes1 hashFunction, bytes1 size, bytes32 digest);

    mapping (address => mapping (address => uint8)) approvedIdentity;

    mapping (address => IpfsCid) approverInfo;

    function registerApprover(bytes1 _hashFunction, bytes1 _size, bytes32 _digest)
        public
    {
        approverInfo[msg.sender] = IpfsCid(_hashFunction, _size, _digest);
        emit ApproverRegistered(msg.sender,_hashFunction,_size,_digest);
    }

    function approveIdentity(address _identity, uint8 _level)
        public
        onlyRegisteredApprover()
    {
        approvedIdentity[msg.sender][_identity] = _level;
    }

    function getSecurityLevel(address _approver, address _identity)
        public
        view
        returns (uint8)
    {
        return approvedIdentity[_approver][_identity];
    }

    function getApproverInfo(address _approver)
        public
        view
        returns (IpfsCid memory)
    {
        return approverInfo[_approver];
    }

    modifier onlyRegisteredApprover(){
        require(approverInfo[msg.sender].digest != 0, "not registered");
        _;
    }
}
