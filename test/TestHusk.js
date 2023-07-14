const Azimuth = artifacts.require('Azimuth');
const Husk = artifacts.require('Husk');

const assertRevert = require('./helpers/assertRevert');
const seeEvents = require('./helpers/seeEvents');

const web3abi = require('web3-eth-abi');
const web3 = Azimuth.web3;

contract('Azimuth', function([owner, user, user2, user3]) {
  let azimuth;

  before('setting up for tests', async function() {
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
    husk = await Husk.new(azimuth.address)
  });

  it('Husk contract should receive ERC721 tokens', async function() {
    // Mint a new token on the Azimuth contract
    await azimuth.mint(user, 1, { from: owner });

    // Transfer the token to the Husk contract
    await azimuth.safeTransferFrom(user, husk.address, 1, { from: user });

    // Check that the Husk contract received the token
    const ownerOfToken = await azimuth.ownerOf(1);
    assert.equal(ownerOfToken, husk.address);
  });

  it('getting prefix', async function() {
    // galaxies
    assert.equal(await azimuth.getPrefix(0), 0);
    assert.equal(await azimuth.getPrefix(255), 255);
    // stars
    assert.equal(await azimuth.getPrefix(256), 0);
    assert.equal(await azimuth.getPrefix(65535), 255);
    // planets
    assert.equal(await azimuth.getPrefix(1245952), 768);
  });

});
