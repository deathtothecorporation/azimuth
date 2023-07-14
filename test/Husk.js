const Azimuth = artifacts.require('Azimuth');
const Husk = artifacts.require('Husk');

const Polls = artifacts.require('Polls');
const Claims = artifacts.require('Claims');
const Ecliptic = artifacts.require('Ecliptic');
const ENSRegistry = artifacts.require('ENSRegistry');
const PublicResolver = artifacts.require('PublicResolver');

const assertRevert = require('./helpers/assertRevert');
const increaseTime = require('./helpers/increaseTime');
const seeEvents = require('./helpers/seeEvents');

const deposit = '0x1111111111111111111111111111111111111111';
const zero = '0x0000000000000000000000000000000000000000';
const zero64 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const web3abi = require('web3-eth-abi');

contract('Husk', function([owner, user1, user2, user3]) {
  let azimuth, polls, claims, ens, resolver, eclipt, eclipt2, pollTime;
  let husk;

  before('setting up for tests', async function() {
    azimuth = await Azimuth.new();
    husk = await Husk.new(azimuth.address);

    pollTime = 432000;
    azimuth = await Azimuth.new();
    polls = await Polls.new(pollTime, pollTime);
    claims = await Claims.new(azimuth.address);
    eclipt = await Ecliptic.new(zero,
                                azimuth.address,
                                polls.address,
                                claims.address);
    await azimuth.transferOwnership(eclipt.address);
    await polls.transferOwnership(eclipt.address);
  });

  it('setup works', async function() {
    asset.isTrue(await husk.isOwner(0, owner))
  });

  // GPT...
  it('should receive an azimuth token', async function() {
    const user1BalanceBefore = await azimuth.balanceOf(user1);
    assert.equal(user1BalanceBefore.toString(), '1');

    const huskBalanceBefore = await azimuth.balanceOf(husk.address);
    assert.equal(huskBalanceBefore.toString(), '0');

    // Web3 utils to help encode the function call
    const encodedFunctionCall = web3.eth.abi.encodeFunctionCall({
      name: 'onERC721Received',
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'operator'
      },{
          type: 'address',
          name: 'from'
      },{
          type: 'uint256',
          name: 'tokenId'
      },{
          type: 'bytes',
          name: 'data'
      }]
    }, [user1, husk.address, '1', '0x0']);

    // Send the token from user1 to the Husk contract
    await azimuth.safeTransferFrom(user1, husk.address, 1, encodedFunctionCall, {from: user1});

    const user1BalanceAfter = await azimuth.balanceOf(user1);
    assert.equal(user1BalanceAfter.toString(), '0');

    const huskBalanceAfter = await azimuth.balanceOf(husk.address);
    assert.equal(huskBalanceAfter.toString(), '1');
  });

});
