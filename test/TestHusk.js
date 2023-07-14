const Azimuth = artifacts.require('Azimuth');
const Polls = artifacts.require('Polls');
const Claims = artifacts.require('Claims');
const Ecliptic = artifacts.require('Ecliptic');
const Husk = artifacts.require('Husk');

const assertRevert = require('./helpers/assertRevert');
const seeEvents = require('./helpers/seeEvents');

const web3abi = require('web3-eth-abi');
const web3 = Azimuth.web3;
const zero = '0x0000000000000000000000000000000000000000';

contract('Azimuth', function([owner, user1, user2, user3, hostingProvider, makeAddress, customer]) {
  let azimuth, polls, claims, ens, resolver, eclipt, eclipt2, pollTime;
  let husk;

  before('setting up for tests', async function() {
    pollTime = 432000;
    azimuth = await Azimuth.new();
    polls = await Polls.new(pollTime, pollTime);
    claims = await Claims.new(azimuth.address);
    eclipt = await Ecliptic.new(zero,
                                azimuth.address,
                                polls.address,
                                claims.address, zero);
    await azimuth.transferOwnership(eclipt.address);
    await polls.transferOwnership(eclipt.address);
    husk = await Husk.new(azimuth.address)
  });

  it('setting dns domains', async function() {
    // can only be done by owner
    await assertRevert(eclipt.setDnsDomains("1", "2", "3", {from:user1}));
    await eclipt.setDnsDomains("1", "2", "3");
    assert.equal(await azimuth.dnsDomains(2), "3");
  });

  it('creating galaxies', async function() {
    // create.
    await eclipt.createGalaxy(0, user1);
    assert.isFalse(await azimuth.isActive(0));
    assert.isTrue(await azimuth.isOwner(0, owner));
    assert.isTrue(await azimuth.isTransferProxy(0, user1));
    // can't create twice.
    await assertRevert(eclipt.createGalaxy(0, owner));
    // non-owner can't create.
    await assertRevert(eclipt.createGalaxy(1, user1, {from:user1}));
    // prep for next tests.
    await eclipt.transferPoint(0, user1, false, {from:user1});
    await eclipt.createGalaxy(1, user1);
    await eclipt.transferPoint(1, user1, false, {from:user1});
    await eclipt.createGalaxy(2, owner);
    assert.isTrue(await azimuth.isActive(2));
    assert.isTrue(await azimuth.isOwner(2, owner));
    assert.equal(await polls.totalVoters(), 3);
    await eclipt.transferPoint(2, user1, false);
  });

  it('spawning points', async function() {
    // can't spawn if prefix not live.
    await assertRevert(eclipt.spawn(256, user1, {from:user1}));
    await eclipt.configureKeys(web3.utils.toHex(0),
                               web3.utils.toHex(1),
                               web3.utils.toHex(2),
                               web3.utils.toHex(1),
                               false,
                               {from:user1});
    // can't spawn if not prefix owner.
    await assertRevert(eclipt.spawn(256, user1, {from:user2}));
    // can only spawn size directly below prefix
    await assertRevert(eclipt.spawn(65536, user1), {from:user1});
    // spawn child to self, directly
    assert.isFalse(await azimuth.isOwner(256, user1));
    await seeEvents(eclipt.spawn(256, user1, {from:user1}),
                    ['Transfer']);
    assert.equal(await azimuth.getSpawnCount(0), 1);
    assert.isTrue(await azimuth.isOwner(256, user1));
    assert.isTrue(await azimuth.isActive(256));
    // can't spawn same point twice.
    await assertRevert(eclipt.spawn(256, user1, {from:user1}));
    // spawn child to other, via withdraw pattern
    await seeEvents(eclipt.spawn(512, user2, {from:user1}),
                    ['Transfer', 'Approval']);
    assert.equal(await azimuth.getSpawnCount(0), 2);
    assert.isTrue(await azimuth.isOwner(512, user1));
    assert.isFalse(await azimuth.isActive(512));
    assert.isTrue(await azimuth.isTransferProxy(512, user2));
    await eclipt.transferPoint(512, user2, true, {from:user2});
    assert.isTrue(await azimuth.isOwner(512, user2));
    assert.isTrue(await azimuth.isActive(512));
    await eclipt.transferPoint(512, user1, true, {from:user2});
    // check the spawn limits.
    assert.equal(await eclipt.getSpawnLimit(0, 0), 255);
    assert.equal(await eclipt.getSpawnLimit(123455, 0), 0);
    assert.equal(await eclipt.getSpawnLimit(512, new Date('2019-01-01 UTC').valueOf() / 1000), 1024);
    assert.equal(await eclipt.getSpawnLimit(512, new Date('2019-12-31 UTC').valueOf() / 1000), 1024);
    assert.equal(await eclipt.getSpawnLimit(512, new Date('2020-01-01 UTC').valueOf() / 1000), 2048);
    assert.equal(await eclipt.getSpawnLimit(512, new Date('2024-01-01 UTC').valueOf() / 1000), 32768);
    assert.equal(await eclipt.getSpawnLimit(512, new Date('2025-01-01 UTC').valueOf() / 1000), 65535);
    assert.equal(await eclipt.getSpawnLimit(512, new Date('2026-01-01 UTC').valueOf() / 1000), 65535);
  });

  it('Raw transfer to hosting provider (points 0 and 1)', async function() {
    assert.equal(await azimuth.getContinuityNumber(0), 0);
    // set values that should be cleared on-transfer.
    await eclipt.setManagementProxy(0, owner, {from:user1});
    await eclipt.setVotingProxy(0, owner, {from:user1});
    await eclipt.setSpawnProxy(0, owner, {from:user1});
    await eclipt.setTransferProxy(0, owner, {from:user1});
    await claims.addClaim(0, "protocol", "claim", web3.utils.toHex("proof"), {from:user1});
    // can't do if not owner.
    await assertRevert(eclipt.transferPoint(0, user2, true, {from:user2}));
    // transfer as owner, resetting the point.
    await seeEvents(eclipt.transferPoint(0, hostingProvider, false, {from:user1}),
                    ['Transfer']);
    assert.isTrue(await azimuth.isOwner(0, hostingProvider));

    // also transfer point 1 to hostingProvider
    await seeEvents(eclipt.transferPoint(1, hostingProvider, false, {from:user1}),
                    ['Transfer']);


    // Transfer the token to the Husk contract
    // await azimuth.safeTransferFrom(user, husk.address, 1, { from: user });

    // Check that the Husk contract received the token
    // const ownerOfToken = await azimuth.ownerOf(1);
    // assert.equal(ownerOfToken, husk.address);
  });

  it('Hosting provider can deposit in Husk with safeTransferFrom', async function() {
    assert.isTrue(await azimuth.isOwner(0, hostingProvider));

    // cannot do this until hosting provider has SHIP_ADDER_ROLE
    await asserRevert(eclipt.safeTransferFrom(hostingProvider, husk.address, 0, { from: hostingProvider }));
    await eclipt.safeTransferFrom(hostingProvider, husk.address, 0, { from: hostingProvider });


    const ownerOfPoint = await azimuth.ownerOf(0);
    assert.equal(ownerOfPoint, husk.address);

    let data = web3.eth.abi.encodeParameter('string', 'https://sampel-palenet.hosting-provider.com');

    // await seeEvents(eclipt.safeTransferFrom(hostingProvider, huskAddress, {from:user1}), ['Transfer'])

    // Transfer the token to the Husk contract
    // await azimuth.safeTransferFrom(user, husk.address, 1, { from: user });

    // Check that the Husk contract received the token
    // const ownerOfToken = await azimuth.ownerOf(1);
    // assert.equal(ownerOfToken, husk.address);
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
