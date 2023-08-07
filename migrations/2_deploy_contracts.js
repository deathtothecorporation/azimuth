var Azimuth = artifacts.require("Azimuth");

var Husk = artifacts.require("Husk");

const WITH_TEST_STATE = process.argv[3] === "with-state";

const windup = 20;
const rateUnit = 50;
const deadlineStep = 100;
const condit2 = web3.utils.fromAscii("1234");
const escapeHatchTime = deadlineStep * 100;

async function getChainTime() {
  const block = await web3.eth.getBlock("latest");

  return block.timestamp;
}

module.exports = async function(deployer, network, accounts) {
  await deployer;

  // setup contracts
  // const azimuth = await deployer.deploy(Azimuth);

  // goerli:
  // const azAddress = "0x9D3e931D3A35eB5b2E2F84672b3456049a21742B"

  // mainnet
  const azAddress = "0x223c067F8CF28ae173EE5CafEa60cA44C335fecB"

  const husk = await deployer.deploy(Husk, azAddress);

};
