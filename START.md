# 🚀 프로젝트 실행 가이드

> 신한은행 블록체인 상속 자동화 시스템을 실행하기 위한 완전한 가이드

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [프로젝트 설정](#프로젝트-설정)
3. [서비스 시작](#서비스-시작)
4. [개발 가이드](#개발-가이드)
5. [배포](#배포)
6. [문제 해결](#문제-해결)

## 🔧 사전 요구사항

### 필수 소프트웨어

#### Node.js 18+ 설치
```bash
# Node.js 버전 확인
node --version

# Node.js가 설치되지 않은 경우
# macOS (Homebrew)
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# https://nodejs.org/에서 LTS 버전 다운로드
```

#### Foundry 설치
```bash
# Foundry 설치
curl -L https://foundry.paradigm.xyz | bash

# 터미널 재시작 후
foundryup

# 설치 확인
forge --version
anvil --version
```

#### Git 설치
```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt-get install git

# Windows
# https://git-scm.com/에서 다운로드
```

## ⚙️ 프로젝트 설정

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd shinhan-assignment
```

### 2. 의존성 설치

#### 웹 애플리케이션 의존성
```bash
cd web
npm install
cd ..
```

#### 스마트 컨트랙트 의존성
```bash
cd contracts
forge install
cd ..
```

### 3. 환경 설정

#### 블록체인 설정
```bash
cd contracts
# foundry.toml 파일이 이미 설정되어 있습니다
forge build
cd ..
```

#### 웹 애플리케이션 설정
```bash
cd web
# .env.local 파일 생성 (필요한 경우)
touch .env.local
cd ..
```

## 🚀 서비스 시작

### 방법 1: 자동 시작 (권장)
```bash
# 전체 서비스 시작 (블록체인 + 웹 서버)
./start.sh
```

### 방법 2: 수동 시작

#### 1단계: 블록체인 노드 시작
```bash
cd contracts
anvil --port 8545
```

#### 2단계: 새 터미널에서 스마트 컨트랙트 배포
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

#### 3단계: 새 터미널에서 웹 서버 시작
```bash
cd web
npm run dev
```

### 4. 접속 확인

서비스가 정상적으로 시작되면 다음 주소로 접속할 수 있습니다:

- **🌐 웹 애플리케이션**: http://localhost:3000
- **🔗 블록체인 노드**: http://localhost:8545
- **📄 컨트랙트 주소**: 0x5FbDB2315678afecb367f032d93F642f64180aa3

### 5. MetaMask 설정

1. **MetaMask 설치**: 브라우저 확장 프로그램 설치
2. **네트워크 추가**:
   - 네트워크 이름: `Localhost 8545`
   - RPC URL: `http://localhost:8545`
   - 체인 ID: `31337`
   - 통화 기호: `ETH`
3. **계정 가져오기**: Anvil에서 제공하는 프라이빗 키 사용

## 🔧 개발 가이드

### 스마트 컨트랙트 개발

#### 컨트랙트 빌드
```bash
cd contracts
forge build
```

#### 테스트 실행
```bash
cd contracts
forge test
```

#### 특정 테스트 실행
```bash
cd contracts
forge test --match-test testFunctionName
```

#### 가스 사용량 확인
```bash
cd contracts
forge test --gas-report
```

#### 컨트랙트 배포
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### 웹 애플리케이션 개발

#### 개발 서버 시작
```bash
cd web
npm run dev
```

#### 빌드
```bash
cd web
npm run build
```

#### 프로덕션 실행
```bash
cd web
npm start
```

#### 린트 검사
```bash
cd web
npm run lint
```

#### 타입 체크
```bash
cd web
npm run type-check
```

## 🚀 배포

### 로컬 개발 환경

#### 전체 서비스 시작
```bash
./start.sh
```

#### 서비스 중지
```bash
./stop.sh
```

### 프로덕션 배포

#### 1. 스마트 컨트랙트 배포

##### Ethereum 메인넷
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url <MAINNET_RPC_URL> --broadcast --verify
```

##### Polygon
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url <POLYGON_RPC_URL> --broadcast --verify
```

##### 테스트넷 (Goerli/Sepolia)
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url <TESTNET_RPC_URL> --broadcast --verify
```

#### 2. 웹 애플리케이션 배포

##### Vercel 배포
```bash
cd web
npm run build
# Vercel CLI 설치 후
vercel --prod
```

##### Docker 배포
```bash
# Dockerfile 생성 후
docker build -t shinhan-inheritance .
docker run -p 3000:3000 shinhan-inheritance
```

##### AWS/GCP 배포
```bash
cd web
npm run build
# 각 클라우드 플랫폼의 배포 가이드 참조
```

## 🔍 문제 해결

### 일반적인 문제들

#### 1. 포트 충돌
```bash
# 포트 사용 확인
lsof -i :3000
lsof -i :8545

# 프로세스 종료
kill -9 <PID>
```

#### 2. Node.js 버전 문제
```bash
# Node.js 버전 확인
node --version

# nvm을 사용한 버전 변경
nvm use 18
```

#### 3. Foundry 설치 문제
```bash
# Foundry 재설치
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

#### 4. 의존성 설치 실패
```bash
# 캐시 삭제 후 재설치
cd web
rm -rf node_modules package-lock.json
npm install

cd ../contracts
forge clean
forge install
```

#### 5. MetaMask 연결 문제
- 브라우저 캐시 삭제
- MetaMask 계정 재연결
- 네트워크 설정 재확인

### 로그 확인

#### 블록체인 로그
```bash
# Anvil 로그 확인
anvil --port 8545 --verbose
```

#### 웹 애플리케이션 로그
```bash
cd web
npm run dev
# 터미널에서 로그 확인
```

### 디버깅

#### 스마트 컨트랙트 디버깅
```bash
cd contracts
forge test --debug
```

#### 웹 애플리케이션 디버깅
- 브라우저 개발자 도구 사용
- React Developer Tools 설치
- Network 탭에서 API 호출 확인

## 📞 지원

문제가 발생하거나 추가 도움이 필요한 경우:

1. **GitHub Issues**: 프로젝트 저장소에 이슈 등록
2. **문서 확인**: README.md 및 이 가이드 재확인
3. **커뮤니티**: 관련 개발자 커뮤니티 참여

---

## 🎯 다음 단계

시스템이 정상적으로 실행되면:

1. **데모 확인**: http://localhost:3000에서 시스템 기능 테스트
2. **코드 탐색**: 프로젝트 구조 및 코드 이해
3. **기능 확장**: 새로운 기능 추가 또는 기존 기능 개선
4. **테스트 작성**: 추가 테스트 케이스 작성

**즐거운 개발 되세요! 🚀**
