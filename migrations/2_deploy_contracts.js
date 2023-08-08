var Azimuth = artifacts.require("Azimuth");

var Tharsis = artifacts.require("Tharsis");

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
  // goerli
  const azAddress = "0x9D3e931D3A35eB5b2E2F84672b3456049a21742B"
  //
  // mainnet
  // const azAddress = "0x9D3e931D3A35eB5b2E2F84672b3456049a21742B"

  // goerli
  // const huskAddress = "0x1f7a0cc2db9421a9b9017ef18e53997c26f976cc"
  //
  // mainnet
  // const huskAddress = "0x9D3e931D3A35eB5b2E2F84672b3456049a21742B"

  const tharsis = await deployer.deploy(Tharsis, azAddress, huskAddress);
};
