#!/bin/bash

# 신한은행 블록체인 상속 시스템 - Smart Contracts 실행 스크립트

echo "🚀 신한은행 블록체인 상속 시스템 - Smart Contracts 시작"
echo "======================================================"

# 현재 디렉토리가 contracts 폴더인지 확인
if [ ! -f "foundry.toml" ]; then
    echo "❌ Error: 이 스크립트는 contracts 폴더에서 실행해야 합니다."
    echo "   현재 디렉토리: $(pwd)"
    echo "   올바른 사용법: cd contracts && ./start.sh"
    exit 1
fi

# Foundry 설치 확인
echo "📋 Foundry 설치 확인 중..."
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry가 설치되지 않았습니다."
    echo "   설치 방법: curl -L https://foundry.paradigm.xyz | bash"
    echo "   설치 후: source ~/.zshenv && foundryup"
    exit 1
fi

forge_version=$(forge --version)
echo "   현재 Foundry 버전: $forge_version"

# 의존성 설치 확인
if [ ! -d "lib" ]; then
    echo "📦 Foundry 의존성 설치 중..."
    forge install
    if [ $? -ne 0 ]; then
        echo "❌ 의존성 설치 실패"
        exit 1
    fi
else
    echo "✅ 의존성 이미 설치됨"
fi

# 컨트랙트 빌드
echo "🔨 스마트 컨트랙트 빌드 중..."
forge build
if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

# Anvil 체인 시작
echo "⛓️  Anvil 로컬 체인 시작 중..."
echo "   체인 주소: http://localhost:8545"
echo "   체인 ID: 31337"
echo ""
echo "💡 팁:"
echo "   - 새 터미널에서 컨트랙트 배포: ./deploy.sh"
echo "   - Ctrl+C로 체인 중지"
echo ""

# 기존 Anvil 프로세스 종료
pkill -f "anvil" 2>/dev/null

# Anvil 시작
anvil --port 8545
