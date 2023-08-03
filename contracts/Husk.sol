// SPDX-License-Identifier: MIT
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/access/rbac/RBAC.sol";

/*
Assumptions:
- addDockedShip will be used _properly_ by hosting providers:
   - tokenID will be a valid azimuth point
*/

/*
 Todos before go-live:
 - functional:
   - Make sure role requirement works for addDockedShip
   - use .pop on hangar?
 - future:
   - make it possible for hosting providers to transfer a batch of points (look into ecliptic's setApprovalForAll)
 - style:
   - use modifier for roles vs require
   - delete launchedShip ? in transferPointToShipless
*/

interface IEcliptic {
    function transferPoint(uint32 _point, address _newOwner, bool _reset) external;
}

interface IAzimuth {
    function getOwner(uint32 _point) external view returns (address);
    function owner() external view returns (address);
}

contract Husk is RBAC, Ownable {
    IAzimuth public azimuth;

    string public constant SHIP_ADDER_ROLE = "ship_adder";
    string public constant SHIP_REMOVER_ROLE = "ship_remover";

    event ShipDocked(uint32 indexed tokenID, string hostedUrl);
    event ShipLaunched(uint32 indexed tokenID, address indexed newShipOwner, string hostedUrl);

    struct DockedShip {
        uint32 tokenID;
        string hostedUrl;
    }

    DockedShip[] public hangar;

    constructor(address _azimuthAddress) {
        azimuth = IAzimuth(_azimuthAddress);

        addRole(msg.sender, SHIP_ADDER_ROLE);
        addRole(msg.sender, SHIP_REMOVER_ROLE);
    }

    function grantShipAdderRole(address _address) public onlyOwner {
        addRole(_address, SHIP_ADDER_ROLE);
    }
    function grantShipRemoverRole(address _address) public onlyOwner {
        addRole(_address, SHIP_REMOVER_ROLE);
    }

    function addDockedShip(uint32 tokenID, string memory hostedUrl) public {
        require(hasRole(msg.sender, SHIP_ADDER_ROLE), "Must have ship adder role to dock ship");
        require(hostedUrl != "", "hostedUrl is empty")

        DockedShip memory newShip = DockedShip({
            tokenID: tokenID,
            hostedUrl: hostedUrl
        });

        hangar.push(newShip);
        emit ShipDocked(tokenID, hostedUrl);
    }

    // Function to remove a docked ship and transfer it to targetAddress (LIFO)
    function transferPointToShipless(address targetAddress)
        public
        onlyRole(SHIP_REMOVER_ROLE)
        returns (uint32, string memory)
    {
        require(hangar.length > 0, "No more docked ships");

        // Step 1: Peek at the next ship on the stack
        DockedShip storage launchedShip = hangar[hangar.length - 1];

        // Step 2: Try to transfer ownership of the point
        IEcliptic ecliptic = IEcliptic(azimuth.owner());
        ecliptic.transferPoint(launchedShip.tokenID, targetAddress, false);

        // Step 3: If the transfer didn't throw, remove the ship from the stack
        delete hangar[hangar.length - 1];
        hangar.length--;

        emit ShipLaunched(launchedShip.tokenID, targetAddress, launchedShip.hostedUrl);
        return (launchedShip.tokenID, launchedShip.hostedUrl);
    }
}
