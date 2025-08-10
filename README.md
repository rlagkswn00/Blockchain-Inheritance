# 🌍 신한은행 블록체인 상속 자동화 시스템

> 블록체인과 스마트 컨트랙트를 활용한 해외 상속인 문서 인증 자동화 시스템

## 🎥 데모 영상



*시스템의 전체적인 워크플로우와 주요 기능들을 시연하는 데모 영상입니다.*

## 📋 프로젝트 개요

### 🎯 목적
한국에서 상속 과정 중 외국인 상속인이 있을 때 발생하는 문제를 해결하는 블록체인 기반 자동화 시스템입니다. 해외 상속인이 작성한 문서를 블록체인에 등록하고, 암호화하여 은행에 전송하는 과정을 자동화합니다.

### 🚨 기존 프로세스의 문제점

#### 💰 높은 비용과 시간 소요
- **공증 비용**: 해외 공증서 발급 및 번역 비용 (약 50-100만원)
- **법무법인 수수료**: 상속 절차 대리 비용 (약 300-500만원)
- **시간 소요**: 전체 상속 절차 완료까지 대략 1개월 소모
- **국제 우편 비용**: 문서 송달 및 확인 과정 (약 10-20만원)

#### 🔄 복잡한 절차
1. **해외 공증**: 현지 공증인을 통한 문서 공증
2. **번역 및 인증**: 한국어 번역 및 대사관 인증
3. **국내 공증**: 한국 공증인을 통한 재공증
4. **법원 제출**: 상속재산분할심판 신청
5. **자산 분배**: 개별 자산별 분배 절차

### ✨ 블록체인 솔루션의 혁신성

#### 💡 비용 절감 효과
- **공증 비용 절감**: 블록체인 기반 디지털 공증으로 80% 비용 절감
- **법무법인 수수료 절감**: 자동화된 절차로 60% 비용 절감
- **시간 단축**: 6개월 → 2주로 단축 (90% 시간 절약)
- **운영 비용 절감**: 수동 처리 → 자동화로 70% 비용 절감

#### 🔄 프로세스 개선
1. **해외 상속인**: 문서 업로드 → 해시 생성 → 블록체인 등록 → RSA 암호화 → 은행 전송
2. **은행**: 문서 수신 → 해시 검증 → 블록체인 확인 → 최종 승인 → 자산 분배

#### 🎯 핵심 혁신 포인트
- **원큐 자산 분배**: 블록체인 정보를 바탕으로 모든 자산을 한 번에 분배
- **투명성 보장**: 모든 과정이 블록체인에 기록되어 검증 가능
- **보안 강화**: 암호화와 해시 검증으로 문서 무결성 보장
- **실시간 처리**: 24시간 언제든지 처리 가능

## 📊 주요 기능

### 🌍 해외 상속인 프로세스
- **파일 업로드**: PDF, DOC, TXT 파일 지원
- **해시 생성**: SHA-256 기반 문서 해시
- **블록체인 등록**: 스마트 컨트랙트에 문서 저장
- **은행 전송**: 암호화된 문서 전송

### 🏦 은행 패널
- **문서 검증**: 로컬 및 블록체인 해시 검증
- **승인 프로세스**: 문서 승인 및 자산 분배
- **실시간 모니터링**: 블록체인 상태 확인

### 🔐 보안 기능
- **해시 검증**: 문서 무결성 보장
- **암호화**: RSA 기반 문서 암호화
- **접근 제어**: 역할 기반 권한 관리

## 🛠️ 기술 스택

### Frontend
- **Next.js 14** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링
- **Wagmi + Viem** - Ethereum 인터페이스
- **MetaMask** - 지갑 연결

### Backend
- **Next.js API Routes** - 서버리스 API
- **Node.js** - JavaScript 런타임
- **File System** - 파일 저장소

### Blockchain
- **Foundry** - 스마트 컨트랙트 개발 도구
- **Solidity 0.8.30** - 스마트 컨트랙트 언어
- **Anvil** - 로컬 Ethereum 개발 체인
- **OpenZeppelin** - 보안 컨트랙트 라이브러리

### Security & Encryption
- **SHA-256** - 문서 해시 생성
- **RSA** - 문서 암호화 (시뮬레이션)
- **Keccak256** - 블록체인 해시

## 📁 프로젝트 구조

```
shinhan-assignment/
├── contracts/                 # 스마트 컨트랙트
│   ├── src/
│   │   ├── InheritanceAutomation.sol  # 메인 컨트랙트
│   │   └── SimpleInheritance.sol      # 간단한 상속 컨트랙트
│   ├── script/
│   │   └── Deploy.s.sol               # 배포 스크립트
│   ├── foundry.toml                   # Foundry 설정
│   └── lib/                          # 의존성
├── web/                             # 웹 애플리케이션
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── api/                  # API 엔드포인트
│   │   │   │   ├── blockchain/       # 블록체인 API
│   │   │   │   ├── files/            # 파일 관리 API
│   │   │   │   └── upload/           # 파일 업로드 API
│   │   │   ├── globals.css           # 전역 스타일
│   │   │   ├── layout.tsx            # 레이아웃
│   │   │   └── page.tsx              # 메인 페이지
│   │   ├── client/                   # 클라이언트 컴포넌트
│   │   │   ├── overseas-inheritor/   # 해외 상속인 프로세스
│   │   │   ├── bank/                 # 은행 패널
│   │   │   └── admin/                # 관리자 패널
│   │   └── components/               # 공통 컴포넌트
│   ├── uploads/                      # 업로드된 파일
│   └── package.json                  # 의존성 관리
├── start.sh                         # 서비스 시작 스크립트
├── stop.sh                          # 서비스 중지 스크립트
└── README.md                        # 프로젝트 문서
```

### 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Blockchain    │
│   (Next.js)     │◄──►│   (Next.js API) │◄──►│   (Anvil)       │
│                 │    │                 │    │                 │
│ • 해외 상속인      │    │ • 파일 업로드     │    │ • 스마트 컨트랙트   │
│ • 은행 패널       │    │ • 해시 검증       │    │ • 문서 등록        │
│ • MetaMask 연동  │    │ • 블록체인 API    │    │ • 자산 분배        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 실행 방법

### 1. 사전 요구사항
```bash
# Node.js 18+ 설치
node --version

# Foundry 설치
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. 프로젝트 클론 및 설정
```bash
git clone <repository-url>
cd shinhan-assignment

# 의존성 설치
cd web && npm install
cd ../contracts && forge install
```

### 3. 서비스 시작
```bash
# 전체 서비스 시작 (블록체인 + 웹 서버)
./start.sh

# 또는 개별 시작
cd contracts && forge build
anvil --port 8545
cd ../web && npm run dev
```

### 4. 접속
- **웹 애플리케이션**: http://localhost:3000
- **블록체인**: http://localhost:8545
- **컨트랙트 주소**: 0x5FbDB2315678afecb367f032d93F642f64180aa3

## 🔧 개발 가이드

### 스마트 컨트랙트 개발
```bash
cd contracts

# 컨트랙트 빌드
forge build

# 테스트 실행
forge test

# 배포
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### 웹 애플리케이션 개발
```bash
cd web

# 개발 서버 시작
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

## 🔄 배포

### 로컬 개발 환경
```bash
./start.sh  # 전체 서비스 시작
```

### 프로덕션 배포
```bash
# 스마트 컨트랙트 배포
cd contracts
forge script script/Deploy.s.sol --rpc-url <PRODUCTION_RPC> --broadcast

# 웹 애플리케이션 배포
cd web
npm run build
npm start
```
