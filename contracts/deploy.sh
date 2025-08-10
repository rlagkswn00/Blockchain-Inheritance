#!/bin/bash

# 신한은행 블록체인 상속 시스템 - Smart Contracts 배포 스크립트

echo "🚀 신한은행 블록체인 상속 시스템 - Smart Contracts 배포"
echo "====================================================="

# 현재 디렉토리가 contracts 폴더인지 확인
if [ ! -f "foundry.toml" ]; then
    echo "❌ Error: 이 스크립트는 contracts 폴더에서 실행해야 합니다."
    echo "   현재 디렉토리: $(pwd)"
    echo "   올바른 사용법: cd contracts && ./deploy.sh"
    exit 1
fi

# Anvil 체인이 실행 중인지 확인
echo "🔍 Anvil 체인 연결 확인 중..."
if ! curl -s http://localhost:8545 > /dev/null; then
    echo "❌ Anvil 체인이 실행되지 않았습니다."
    echo "   먼저 ./start.sh를 실행하여 Anvil을 시작해주세요."
    exit 1
fi

echo "✅ Anvil 체인 연결됨 (http://localhost:8545)"

# 컨트랙트 빌드
echo "🔨 스마트 컨트랙트 빌드 중..."
forge build
if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

# 컨트랙트 배포
echo "📦 스마트 컨트랙트 배포 중..."
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/Deploy.s.sol:DeployScript \
--rpc-url http://localhost:8545 \
--broadcast

if [ $? -ne 0 ]; then
    echo "❌ 배포 실패"
    exit 1
fi

echo ""
echo "✅ 배포 완료!"
echo "📋 배포된 컨트랙트 정보:"
echo "   - 컨트랙트 주소: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "   - 체인 ID: 31337"
echo "   - 네트워크: Anvil (localhost:8545)"
echo ""
echo "💡 다음 단계:"
echo "   - web 폴더에서 ./start.sh 실행하여 프론트엔드 시작"
echo "   - 브라우저에서 http://localhost:3000 접속"
