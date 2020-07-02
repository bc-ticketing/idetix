const multihashes = require("multihashes");
const BigNumber = require('bignumber.js');

// Check out the link for IPFS hash conversion:
// https://ipfs-sec.stackexchange.cloudflare-ipfs.com/ethereum/A/question/17094.html

exports.cidToArgs = (cid) => {
  const mh = multihashes.fromB58String(Buffer.from(cid));
  return {
    hashFunction: "0x" + mh.slice(0, 1).toString("hex"),
    size: "0x" + mh.slice(1, 2).toString("hex"),
    digest: "0x" + mh.slice(2).toString("hex"),
  };
};

exports.argsToCid = (hashFunction, size, digest) => {
  const hashHex = hashFunction.slice(2) + size.slice(2) + digest.slice(2);
  const hashBytes = Buffer.from(hashHex, "hex");
  return multihashes.toB58String(hashBytes);
};

// number is is equivalent to 1(128*0)
exports.fungibleBaseId = new BigNumber("340282366920938463463374607431768211456");

// which is equivalent in binary to 1(126*0)1(128*0)
exports.nonFungibleBaseId = new BigNumber("57896044618658097711785492504343953926975274699741220483192166611388333031424");
