#!/bin/bash

# 신한은행 블록체인 상속 시스템 - Web Frontend 실행 스크립트

echo "🚀 신한은행 블록체인 상속 시스템 - Web Frontend 시작"
echo "=================================================="

# 현재 디렉토리가 web 폴더인지 확인
if [ ! -f "package.json" ]; then
    echo "❌ Error: 이 스크립트는 web 폴더에서 실행해야 합니다."
    echo "   현재 디렉토리: $(pwd)"
    echo "   올바른 사용법: cd web && ./start.sh"
    exit 1
fi

# Node.js 버전 확인
echo "📋 Node.js 버전 확인 중..."
node_version=$(node --version)
echo "   현재 Node.js 버전: $node_version"

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 의존성 설치 실패"
        exit 1
    fi
else
    echo "✅ 의존성 이미 설치됨"
fi

# .next 폴더 정리
if [ -d ".next" ]; then
    echo "🧹 이전 빌드 캐시 정리 중..."
    rm -rf .next
fi

# 개발 서버 시작
echo "🌐 Next.js 개발 서버 시작 중..."
echo "   서버 주소: http://localhost:3000"
echo "   네트워크 주소: http://192.168.200.196:3000"
echo ""
echo "💡 팁:"
echo "   - 브라우저에서 http://localhost:3000 접속"
echo "   - Ctrl+C로 서버 중지"
echo ""

npm run dev
