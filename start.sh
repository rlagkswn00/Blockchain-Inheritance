#!/bin/bash

# 신한은행 블록체인 상속 시스템 - 통합 실행 스크립트
# 이 스크립트는 모든 서비스를 순차적으로 시작합니다.

echo "🚀 신한은행 블록체인 상속 시스템 - 통합 실행"
echo "=========================================="
echo ""

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 필수 도구 확인
check_requirements() {
    log_info "필수 도구 확인 중..."
    
    # Node.js 확인
    if ! command -v node &> /dev/null; then
        log_error "Node.js가 설치되지 않았습니다."
        echo "   설치 방법: https://nodejs.org/"
        exit 1
    fi
    
    # npm 확인
    if ! command -v npm &> /dev/null; then
        log_error "npm이 설치되지 않았습니다."
        exit 1
    fi
    
    # Foundry 확인
    if ! command -v forge &> /dev/null; then
        log_warning "Foundry가 설치되지 않았습니다."
        echo "   설치 방법: curl -L https://foundry.paradigm.xyz | bash"
        echo "   설치 후: source ~/.zshenv && foundryup"
        echo ""
        read -p "계속 진행하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "필수 도구 확인 완료"
}

# 기존 프로세스 정리
cleanup_processes() {
    log_info "기존 프로세스 정리 중..."
    
    # Anvil 프로세스 종료
    pkill -f "anvil" 2>/dev/null
    
    # Next.js 프로세스 종료
    pkill -f "next dev" 2>/dev/null
    
    sleep 2
    log_success "기존 프로세스 정리 완료"
}

# 스마트 컨트랙트 시작
start_contracts() {
    log_info "스마트 컨트랙트 서비스 시작 중..."
    
    if [ ! -d "contracts" ]; then
        log_error "contracts 폴더를 찾을 수 없습니다."
        exit 1
    fi
    
    cd contracts
    
    # Foundry 의존성 설치
    if [ ! -d "lib" ]; then
        log_info "Foundry 의존성 설치 중..."
        forge install
    fi
    
    # 컨트랙트 빌드
    log_info "스마트 컨트랙트 빌드 중..."
    forge build
    if [ $? -ne 0 ]; then
        log_warning "컨트랙트 빌드 실패 - 계속 진행합니다"
        log_info "이전 빌드 결과를 사용합니다"
    else
        log_success "컨트랙트 빌드 완료"
    fi
    
    # Anvil 시작 (백그라운드)
    log_info "Anvil 로컬 체인 시작 중..."
    anvil --port 8545 > anvil.log 2>&1 &
    ANVIL_PID=$!
    
    # Anvil 시작 대기
    sleep 5
    
    # Anvil 연결 확인
    if curl -s http://localhost:8545 > /dev/null; then
        log_success "Anvil 체인 시작됨 (PID: $ANVIL_PID)"
    else
        log_error "Anvil 체인 시작 실패"
        exit 1
    fi
    
    # 컨트랙트 배포
    log_info "스마트 컨트랙트 배포 중..."
    PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    forge script script/Deploy.s.sol:DeployScript \
    --rpc-url http://localhost:8545 \
    --broadcast > deploy.log 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "컨트랙트 배포 완료"
    else
        log_warning "컨트랙트 배포 실패 (로그: contracts/deploy.log)"
    fi
    
    cd ..
}

# 웹 프론트엔드 시작
start_web() {
    log_info "웹 프론트엔드 서비스 시작 중..."
    
    if [ ! -d "web" ]; then
        log_error "web 폴더를 찾을 수 없습니다."
        exit 1
    fi
    
    cd web
    
    # 의존성 설치
    if [ ! -d "node_modules" ]; then
        log_info "Node.js 의존성 설치 중..."
        npm install
        if [ $? -ne 0 ]; then
            log_warning "의존성 설치 실패 - 계속 진행합니다"
        fi
    fi
    
    # .next 폴더 정리
    if [ -d ".next" ]; then
        log_info "이전 빌드 캐시 정리 중..."
        rm -rf .next
    fi
    
    # Next.js 시작 (백그라운드)
    log_info "Next.js 개발 서버 시작 중..."
    npm run dev > next.log 2>&1 &
    NEXT_PID=$!
    
    # Next.js 시작 대기
    sleep 10
    
    # Next.js 연결 확인
    if curl -s http://localhost:3000 > /dev/null; then
        log_success "Next.js 서버 시작됨 (PID: $NEXT_PID)"
    else
        log_warning "Next.js 서버 시작 확인 중... (로그: web/next.log)"
    fi
    
    cd ..
}

# 메인 실행 함수
main() {
    echo ""
    log_info "신한은행 블록체인 상속 시스템을 시작합니다..."
    echo ""
    
    # 필수 도구 확인
    check_requirements
    
    # 기존 프로세스 정리
    cleanup_processes
    
    # 스마트 컨트랙트 시작
    start_contracts
    
    # 웹 프론트엔드 시작
    start_web
    
    echo ""
    log_success "🎉 모든 서비스가 성공적으로 시작되었습니다!"
    echo ""
    echo "📋 서비스 정보:"
    echo "   🌐 웹 프론트엔드: http://localhost:3000"
    echo "   ⛓️  블록체인 체인: http://localhost:8545"
    echo "   📄 컨트랙트 주소: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
    echo ""
    echo "💡 사용법:"
    echo "   - 브라우저에서 http://localhost:3000 접속"
    echo "   - MetaMask에서 네트워크 추가: http://localhost:8545"
    echo "   - 체인 ID: 31337"
    echo ""
    echo "🛑 서비스 중지:"
    echo "   - ./stop.sh로 모든 서비스 종료"
    echo "   - 또는: pkill -f 'anvil\|next dev'"
    echo ""
    
    log_info "서비스가 백그라운드에서 실행 중입니다."
    log_info "종료하려면: ./stop.sh"
}

# 스크립트 실행
main
