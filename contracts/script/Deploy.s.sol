// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/InheritanceAutomation.sol";

/**
 * @title DeployScript
 * @dev 스마트 컨트랙트 배포 스크립트
 * 
 * 이 스크립트는 다음과 같은 과정을 수행합니다:
 * 1. Anvil의 기본 계정들을 사용하여 상속인 설정
 * 2. InheritanceAutomation 컨트랙트를 배포
 * 3. 배포된 컨트랙트 주소를 출력
 */
contract DeployScript is Script {
    function run() external {
        // Anvil의 기본 private key 사용
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        // Anvil의 기본 계정들
        address deployer = vm.addr(deployerPrivateKey); // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (은행)
        address overseasInheritor = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // 해외 상속인
        address domesticInheritor = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // 국내 상속인
        
        vm.startBroadcast(deployerPrivateKey);

        // InheritanceAutomation 컨트랙트를 배포
        InheritanceAutomation inheritanceAutomation = new InheritanceAutomation(
            deployer           // 은행 주소
        );

        vm.stopBroadcast();
        
        // 배포된 컨트랙트 주소를 출력
        console.log("InheritanceAutomation deployed to:", address(inheritanceAutomation));
        console.log("Overseas Inheritor:", overseasInheritor);
        console.log("Domestic Inheritor:", domesticInheritor);
        console.log("Bank address:", deployer);
        console.log("Inheritance Amount: 1 billion KRW (500 million each)");
    }
}
