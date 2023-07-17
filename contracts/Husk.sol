// SPDX-License-Identifier: MIT
pragma solidity 0.4.24;

import './ReadsAzimuth.sol';

// import "openzeppelin-solidity/contracts/token/ERC721/IERC721Receiver.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
// import "openzeppelin-solidity/contracts/access/AccessControl.sol";
import "openzeppelin-solidity/contracts/access/rbac/RBAC.sol";

// azimuth address: 0x33EeCbf908478C10614626A9D304bfe18B78DD73
// azimuth goerli:  0xbB61Fa683E4B910418E27b00a1438a936234df52
// keccak256 encoded "SHIP_ADDER_ROLE": 0x381e9228496910d7a11e0b24564a256a78aa4897f0fdba78b8dd41d88f34e8a9
// keccak256 encoded "SHIP_REMOVER_ROLE": 0x5cbc5b59bdfae9f0aaf4938e5a095024e97b6493a564f95fbb82ddcdbafdc969

// we need to define this, rather than importing from openzeppelin, because their
// version uses 0.8.x and can't use that with Azimuth's 0.4.x
interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes data)
    public
    returns(bytes4);
}

interface IEcliptic {
    function transferPoint(uint32 _point, address _newOwner, bool _reset) external;
}

contract Husk is IERC721Receiver, RBAC, Ownable, ReadsAzimuth {
    // IEcliptic public ecliptic;
    // Ecliptic public ecliptic;
    // IAzimuth public azimuth;

    string public constant SHIP_ADDER_ROLE = "ship_adder";
    string public constant SHIP_REMOVER_ROLE = "ship_remover";

    event ShipDocked(uint32 indexed tokenID, string hostedUrl);
    event ShipLaunched(uint32 indexed tokenID, address indexed owner, string hostedUrl);

    struct DockedShip {
        uint256 id;
        uint32 tokenID;
        string hostedUrl;
    }

    DockedShip[] private hangar;

    constructor(Azimuth _azimuthAddress) ReadsAzimuth(_azimuthAddress) {
        // since the constructor creates these roles, the contract owner is the 'admin' for these roles.
        // and the contract owner is the DEFAULT_ADMIN_ROLE, which means nobody else can call _setupRole
        /// _setupRole(SHIP_ADDER_ROLE, msg.sender);
        /// _setupRole(SHIP_REMOVER_ROLE, msg.sender);
        addRole(msg.sender, SHIP_ADDER_ROLE);
        addRole(msg.sender, SHIP_REMOVER_ROLE);
        // _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);


        // azimuth = IAzimuth(_azimuthAddress);
    }

    function grantShipAdderRole(address _address) public onlyOwner {
        addRole(_address, SHIP_ADDER_ROLE);
    }
    function grantShipRemoverRole(address _address) public onlyOwner {
        addRole(_address, SHIP_REMOVER_ROLE);
    }

    // This is the callback function that a hosting provider using safeTransferFrom should call
    function onERC721Received(address operator, address from, uint256 tokenID, bytes data)
    public
    returns (bytes4) {
        // require(hasRole(msg.sender, SHIP_ADDER_ROLE), "Must have ship adder role to transfer ship");

        // Ensure that the tokenId can be safely converted to a uint32
        require(tokenID <= 4294967295, "tokenId exceeds maximum for uint32");

        // Convert the tokenID to a uint32
        uint32 tokenID32 = uint32(tokenID);

        // Do something when we receive an NFT
        // pull out the URL from the function call data
        string memory url = string(data);

        // Add it to the hangar (addDockedShip will create the struct)
        addDockedShip(tokenID32, url);

        return this.onERC721Received.selector;
    }
    // to be used something like this:
    // (javascript)
    // let receivingContract = await ReceivingContract.deployed();

    // let data = web3.eth.abi.encodeParameter('string', 'https://sampel-palenet.red-horizon.com');
    // await erc721.safeTransferFrom("0xYourAddress", receivingContract.address, 1, data);


    function addDockedShip(uint32 tokenID, string memory hostedUrl) public {
        // TODO: bring roles back in. currently failing in integration tests for some reason.
        // require(hasRole(msg.sender, SHIP_ADDER_ROLE), "Must have ship adder role to dock ship");

        // TODO: require hostedUrl to be present?
        // TODO: require this to actually be an azimuth point?! we don't want
        // hosting providers accidentally sending us BAYCs

        DockedShip memory newShip = DockedShip({
            id: hangar.length, // the 'id' is based on the current queue of ships
            tokenID: tokenID,
            hostedUrl: hostedUrl
        });

        hangar.push(newShip);
        emit ShipDocked(tokenID, hostedUrl);
    }

    // This function REQUIRES that the hosting provider FIRST make us the 
    // transferProxy for this point. THEN call this function.
    function addDockedShipWithTransfer(uint32 _point, string memory hostedUrl) public {
        // TODO: bring roles back in. currently failing in integration tests for some reason.
        // require(hasRole(msg.sender, SHIP_ADDER_ROLE), "Must have ship adder role to dock ship");

        // TODO: require hostedUrl to be present?

        // Ensure caller owns the point
        require(azimuth.getOwner(_point) == msg.sender, "Sender must own the point");

        // TODO: this won't work, because msg.sender to _ecliptic_ is Husk, not the owner.
        // Transfer to Husk
        IEcliptic ecliptic = IEcliptic(azimuth.owner());
        ecliptic.transferPoint(_point, address(this), false);

        addDockedShip(_point, hostedUrl);
    }


    // Function to get the details of a docked ship
    function getDockedShip(uint256 id) public view returns (uint32, string memory) {
        require(id < hangar.length, "Invalid ship ID");

        DockedShip memory dockedShip = hangar[id];
        return (dockedShip.tokenID, dockedShip.hostedUrl);
    }

    // Function to get the total number of docked ships
    function getDockedShipsCount() public view returns (uint256) {
        return hangar.length;
    }

    // Function to remove a docked ship (LIFO)
    // TODO: should this called as a callback after _this contract_ (or %make) transfers ownership to some address?
    // TODO: implement the azimuth safeTransferFrom required to send a ship to a new user if using callbacks...?
    function transferPointToShipless(address targetAddress) public onlyRole(SHIP_REMOVER_ROLE) returns (uint32, string memory) {
        require(hasRole(msg.sender, SHIP_REMOVER_ROLE), "Must have ship remover role to remove ship");
        require(hangar.length > 0, "No more docked ships");
        // TODO: emit this as an event

        // Step 1: Peek at the next ship on the stack
        DockedShip memory nextShip = hangar[hangar.length - 1];
        uint32 nextShipTokenID = uint32(nextShip.tokenID);

        // Step 2: Try to transfer ownership of the point
        IEcliptic ecliptic = IEcliptic(azimuth.owner());
        ecliptic.transferPoint(nextShipTokenID, targetAddress, false);

        // Step 3: If the transfer didn't throw, remove the ship from the stack
        delete hangar[hangar.length - 1];
        hangar.length--;

        emit ShipLaunched(nextShipTokenID, targetAddress, nextShip.hostedUrl);
        return (nextShip.tokenID, nextShip.hostedUrl);
    }

    // TODO: deprecated? fix this.
    // function destroy() public onlyOwner {
    //     address _owner = owner();
    //     selfdestruct(_owner);
    // }
    // function destroy() public onlyOwner {
    //     address _owner = owner();
    //     address payable payableOwner = payable(address(uint160(_owner)));
    //     selfdestruct(payableOwner);
    // }

    //// AccessControl provides these:
    // Grants `role` to `account`
    // function grantRole(bytes32 role, address account) public virtual;
    // used like: grantRole(SHIP_ADDER_ROLE, some_address);

    // // Revokes `role` from `account`
    // function revokeRole(bytes32 role, address account) public virtual;
    // used like: revokeRole(SHIP_ADDER_ROLE, some_address);

    // // Renounce an assigned `role` from self 
    // function renounceRole(bytes32 role, address account) public virtual;
    // used like:  renounceRole(SHIP_ADDER_ROLE, msg.sender);

    // // Check if an `account` has been granted a `role`
    // function hasRole(bytes32 role, address account) public view returns (bool);
    // used like: if (hasRole(SHIP_ADDER_ROLE, some_address)) {
    //   ... do something ...
    // }
}

