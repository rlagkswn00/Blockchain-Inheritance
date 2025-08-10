#!/bin/bash

# 신한은행 블록체인 상속 시스템 - 서비스 종료 스크립트

echo "🛑 신한은행 블록체인 상속 시스템 - 서비스 종료"
echo "=========================================="

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

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 서비스 종료 함수
stop_services() {
    log_info "서비스 종료 중..."
    
    # Anvil 프로세스 종료
    if pkill -f "anvil" 2>/dev/null; then
        log_success "Anvil 체인 종료됨"
    else
        log_warning "Anvil 프로세스가 실행되지 않았습니다"
    fi
    
    # Next.js 프로세스 종료
    if pkill -f "next dev" 2>/dev/null; then
        log_success "Next.js 서버 종료됨"
    else
        log_warning "Next.js 프로세스가 실행되지 않았습니다"
    fi
    
    # 기타 관련 프로세스 종료
    if pkill -f "npm run dev" 2>/dev/null; then
        log_success "npm 개발 서버 종료됨"
    fi
    
    # 포트 확인 및 정리
    sleep 2
    
    # 포트 사용 확인
    if lsof -ti:3000 > /dev/null 2>&1; then
        log_warning "포트 3000이 여전히 사용 중입니다"
        lsof -ti:3000 | xargs kill -9 2>/dev/null
        log_success "포트 3000 정리됨"
    fi
    
    if lsof -ti:8545 > /dev/null 2>&1; then
        log_warning "포트 8545가 여전히 사용 중입니다"
        lsof -ti:8545 | xargs kill -9 2>/dev/null
        log_success "포트 8545 정리됨"
    fi
}

# 로그 파일 정리
cleanup_logs() {
    log_info "로그 파일 정리 중..."
    
    # Anvil 로그 파일 삭제
    if [ -f "contracts/anvil.log" ]; then
        rm -f contracts/anvil.log
        log_success "Anvil 로그 파일 삭제됨"
    fi
    
    # Next.js 로그 파일 삭제
    if [ -f "web/next.log" ]; then
        rm -f web/next.log
        log_success "Next.js 로그 파일 삭제됨"
    fi
    
    # 배포 로그 파일 삭제
    if [ -f "contracts/deploy.log" ]; then
        rm -f contracts/deploy.log
        log_success "배포 로그 파일 삭제됨"
    fi
}

# 메인 실행 함수
main() {
    echo ""
    
    # 서비스 종료
    stop_services
    
    # 로그 파일 정리
    cleanup_logs
    
    echo ""
    log_success "🎉 모든 서비스가 성공적으로 종료되었습니다!"
    echo ""
    echo "📋 정리된 항목:"
    echo "   - Anvil 블록체인 체인"
    echo "   - Next.js 개발 서버"
    echo "   - 관련 로그 파일"
    echo "   - 포트 정리 (3000, 8545)"
    echo ""
    echo "💡 다음 실행:"
    echo "   - ./start.sh로 서비스 재시작"
    echo ""
}

# 스크립트 실행
main
