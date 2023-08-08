// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IAzimuth {
    function getOwnedPointCount(address _address) external view returns (uint256 count);
}

interface IHusk {
    function transferPointToShipless(address _recipient) external returns (uint32, string memory);
}

contract Tharsis is ERC721, Ownable, Pausable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    IAzimuth public azimuth;
    IHusk public husk;

    string public constant DEFAULT_URI = "ipfs://QmawbbgwEmxNrH9tt5g7tgCYRDEKN9B8yGvnuupcM4tfPN/";

    constructor(address _azimuth, address _husk) ERC721("Tharsis Video Game Token", "TVG") {
      azimuth = IAzimuth(_azimuth);
      husk = IHusk(_husk);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function safeMint(address to) public {
        // if the sender doesn't own an azimuth point, call transferToShipless
        if (azimuth.getOwnedPointCount(msg.sender) == 0) {
            husk.transferPointToShipless(msg.sender);
        }

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return DEFAULT_URI;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}
