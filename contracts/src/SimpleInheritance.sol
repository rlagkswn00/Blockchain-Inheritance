// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleInheritance is Ownable {
    
    struct Document {
        bytes32 documentHash;
        address owner;
        uint256 timestamp;
        bool isVerified;
        string documentType;
    }
    
    struct Inheritor {
        address wallet;
        bool isOverseas;
        bool hasReceived;
        uint256 receivedAmount;
    }
    
    mapping(bytes32 => Document) public documents;
    mapping(address => uint256) public balances;
    
    uint256 public totalDocuments;
    bytes32[] public allDocumentHashes;
    
    address public bankAddress;
    
    Inheritor public overseasInheritor;
    Inheritor public domesticInheritor;
    
    uint256 public constant SHARE_AMOUNT = 5_000_000_000;
    bool public isInheritanceDistributed = false;
    
    event DocumentRegistered(bytes32 indexed documentHash, address indexed owner, string documentType, uint256 timestamp);
    event DocumentVerified(bytes32 indexed documentHash, address indexed verifier, uint256 timestamp);
    event InheritanceDistributed(address indexed overseasInheritor, address indexed domesticInheritor, uint256 amount, uint256 timestamp);
    event Deposited(address indexed from, uint256 amount, uint256 timestamp);
    event Released(address indexed to, uint256 amount, uint256 timestamp);
    
    constructor(
        address _overseasInheritor,
        address _domesticInheritor,
        address _bankAddress
    ) Ownable(msg.sender) {
        require(_overseasInheritor != address(0), "Invalid overseas inheritor");
        require(_domesticInheritor != address(0), "Invalid domestic inheritor");
        require(_bankAddress != address(0), "Invalid bank address");
        require(_overseasInheritor != _domesticInheritor, "Inheritors must be different");
        
        overseasInheritor = Inheritor({
            wallet: _overseasInheritor,
            isOverseas: true,
            hasReceived: false,
            receivedAmount: 0
        });
        
        domesticInheritor = Inheritor({
            wallet: _domesticInheritor,
            isOverseas: false,
            hasReceived: false,
            receivedAmount: 0
        });
        
        bankAddress = _bankAddress;
    }
    
    modifier onlyBank() {
        require(msg.sender == bankAddress, "Only bank can call this function");
        _;
    }
    
    function registerDocument(string memory documentContent, string memory documentType) public returns (bytes32) {
        bytes32 documentHash = keccak256(abi.encodePacked(documentContent));
        
        require(documents[documentHash].documentHash == 0, "Document already exists");
        
        documents[documentHash] = Document({
            documentHash: documentHash,
            owner: msg.sender,
            timestamp: block.timestamp,
            isVerified: false,
            documentType: documentType
        });
        
        allDocumentHashes.push(documentHash);
        totalDocuments++;
        
        emit DocumentRegistered(documentHash, msg.sender, documentType, block.timestamp);
        
        return documentHash;
    }
    
    function verifyDocument(bytes32 documentHash) public onlyBank {
        require(documents[documentHash].documentHash != 0, "Document does not exist");
        require(!documents[documentHash].isVerified, "Document already verified");
        
        documents[documentHash].isVerified = true;
        
        emit DocumentVerified(documentHash, msg.sender, block.timestamp);
        
        _checkAndDistributeInheritance();
    }
    
    function _checkAndDistributeInheritance() internal {
        if (isInheritanceDistributed) return;
        
        bool hasVerifiedDocument = false;
        for (uint256 i = 0; i < allDocumentHashes.length; i++) {
            if (documents[allDocumentHashes[i]].isVerified) {
                hasVerifiedDocument = true;
                break;
            }
        }
        
        if (hasVerifiedDocument) {
            _distributeInheritance();
        }
    }
    
    function _distributeInheritance() internal {
        require(!isInheritanceDistributed, "Inheritance already distributed");
        require(address(this).balance >= 10_000_000_000, "Insufficient balance");
        
        if (!overseasInheritor.hasReceived) {
            balances[overseasInheritor.wallet] += SHARE_AMOUNT;
            overseasInheritor.hasReceived = true;
            overseasInheritor.receivedAmount = SHARE_AMOUNT;
        }
        
        if (!domesticInheritor.hasReceived) {
            balances[domesticInheritor.wallet] += SHARE_AMOUNT;
            domesticInheritor.hasReceived = true;
            domesticInheritor.receivedAmount = SHARE_AMOUNT;
        }
        
        isInheritanceDistributed = true;
        
        emit InheritanceDistributed(
            overseasInheritor.wallet,
            domesticInheritor.wallet,
            SHARE_AMOUNT,
            block.timestamp
        );
    }
    
    function deposit() public payable {
        require(msg.value > 0, "Must deposit some amount");
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }
    
    function withdraw() public {
        require(
            msg.sender == overseasInheritor.wallet || 
            msg.sender == domesticInheritor.wallet,
            "Only inheritors can withdraw"
        );
        
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        balances[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Released(msg.sender, amount, block.timestamp);
    }
    
    function getDocument(bytes32 documentHash) external view returns (Document memory) {
        require(documents[documentHash].documentHash != 0, "Document does not exist");
        return documents[documentHash];
    }
    
    function getTotalDocuments() external view returns (uint256) {
        return totalDocuments;
    }
    
    function getDocumentByIndex(uint256 index) external view returns (Document memory) {
        require(index < totalDocuments, "Index out of bounds");
        bytes32 docHash = allDocumentHashes[index];
        return documents[docHash];
    }
    
    function getInheritors() external view returns (Inheritor memory, Inheritor memory) {
        return (overseasInheritor, domesticInheritor);
    }
    
    function getInheritanceStatus() external view returns (bool) {
        return isInheritanceDistributed;
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }
}

