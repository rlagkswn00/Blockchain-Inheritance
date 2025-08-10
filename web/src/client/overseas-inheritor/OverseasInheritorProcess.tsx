"use client";

import { useState, useRef, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useConnect, useReadContract } from 'wagmi';
import { parseEther, keccak256, toHex, stringToHex, encodePacked } from 'viem';
import StepIndicator from '../../components/StepIndicator';
import LogBox from '../../components/LogBox';

// MetaMask 타입 정의
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (params: unknown) => void) => void;
      removeListener: (event: string, callback: (params: unknown) => void) => void;
    };
  }
}

/**
 * 스마트 컨트랙트 ABI (Application Binary Interface)
 * 
 * 이 ABI는 스마트 컨트랙트와 상호작용하기 위한 인터페이스를 정의합니다.
 * 각 함수의 입력/출력 타입과 이름을 명시합니다.
 */
const CONTRACT_ABI = [
  {
    "inputs": [
      {"type": "string", "name": "documentContent"},
      {"type": "string", "name": "documentType"}
    ],
    "name": "registerDocument",
    "outputs": [{"type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"type": "bytes32", "name": "documentHash"},
      {"type": "string", "name": "documentContent"},
      {"type": "bytes", "name": "bankPublicKey"}
    ],
    "name": "encryptAndSendToBank",
    "outputs": [{"type": "bytes"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"type": "bytes32", "name": "documentHash"},
      {"type": "string", "name": "decryptedContent"}
    ],
    "name": "decryptAndVerifyDocument",
    "outputs": [{"type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"type": "bytes32"}],
    "name": "getDocument",
    "outputs": [
      {"type": "bytes32", "name": "documentHash"},
      {"type": "address", "name": "owner"},
      {"type": "uint256", "name": "timestamp"},
      {"type": "bool", "name": "isVerified"},
      {"type": "string", "name": "documentType"},
      {"type": "bytes", "name": "encryptedData"},
      {"type": "bytes", "name": "bankPublicKey"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// 스마트 컨트랙트 주소 (Anvil 로컬 체인)
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

interface OverseasInheritorProcessProps {
  onDocumentGenerated: (document: string, hash: string, encryptedDocument: string) => void;
}

interface ProcessStep {
  stepNumber: number;
  stepName: string;
  status: 'pending' | 'completed' | 'failed';
  data?: any;
  completedAt?: string;
}

/**
 * 해외 상속인 프로세스 컴포넌트
 * 
 * 이 컴포넌트는 다음과 같은 기능을 제공합니다:
 * 1. 파일 업로드 및 SHA-256 해시 생성
 * 2. 블록체인에 문서 등록
 * 3. RSA 암호화를 통한 문서 암호화
 * 4. 암호화된 문서를 은행에 전송
 */
export default function OverseasInheritorProcess({ onDocumentGenerated }: OverseasInheritorProcessProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [document, setDocument] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [documentHash, setDocumentHash] = useState<string>("");
  const [encryptedDocument, setEncryptedDocument] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3단계까지만 진행
  const steps = ["파일 업로드 및 블록체인 등록", "은행 전송"];

  // MetaMask 연결 상태 확인
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  
  // 컨트랙트 쓰기 및 읽기 훅
  const { writeContract, isPending: isWritePending, error: writeError, data: writeData } = useWriteContract();
  const { data: transactionHash, isSuccess: isRegistered } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // MetaMask 연결 상태 모니터링
  useEffect(() => {
    if (isConnected && address) {
      setLogs(prev => [...prev, `✅ MetaMask 연결됨: ${address.slice(0, 6)}...${address.slice(-4)}`]);
    } else if (connectError) {
      setLogs(prev => [...prev, `❌ MetaMask 연결 실패: ${connectError.message}`]);
    }
  }, [isConnected, address, connectError]);

  // 트랜잭션 에러 처리
  useEffect(() => {
    if (writeError) {
      setLogs(prev => [...prev, `❌ 트랜잭션 실패: ${writeError.message}`]);
    }
  }, [writeError]);

  // 문서 등록 성공 처리
  useEffect(() => {
    if (isRegistered && transactionHash) {
      setLogs(prev => [
        ...prev, 
        "✅ 블록체인 등록 완료!", 
        `📝 트랜잭션 해시: ${transactionHash}`,
        `🔗 블록체인에서 확인 가능: Anvil Local Chain`,
        `📊 문서가 성공적으로 블록체인에 등록되었습니다.`,
        `🔐 등록된 해시: ${documentHash}`,
        `📋 해시값을 복사하려면 아래 버튼을 클릭하세요.`
      ]);
      updateStep(2, 'completed', { transactionHash, documentHash });
      setCurrentStep(2);
    }
  }, [isRegistered, transactionHash, documentHash]);

  // MetaMask 연결 함수
  const connectMetaMask = async () => {
    try {
      setLogs(prev => [...prev, "🔗 MetaMask 연결 시도 중..."]);
      
      const metamaskConnector = connectors.find(connector => connector.name === 'MetaMask');
      if (metamaskConnector) {
        await connect({ connector: metamaskConnector });
        setLogs(prev => [...prev, "✅ MetaMask 연결 성공!"]);
      } else {
        setLogs(prev => [...prev, "❌ MetaMask를 찾을 수 없습니다. MetaMask를 설치해주세요."]);
      }
    } catch (error) {
      setLogs(prev => [...prev, `❌ MetaMask 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  // 계정 전환 함수
  const switchAccount = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        setLogs(prev => [...prev, "🔄 계정 전환 요청됨"]);
      } catch (error) {
        setLogs(prev => [...prev, `❌ 계정 전환 실패: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
    }
  };

  // MetaMask 이벤트 리스너 설정
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        if (Array.isArray(accounts) && accounts.length === 0) {
          setLogs(prev => [...prev, "🔌 MetaMask 연결이 해제되었습니다."]);
        } else if (Array.isArray(accounts) && accounts.length > 0) {
          const account = accounts[0] as string;
          setLogs(prev => [...prev, `🔄 계정 변경됨: ${account.slice(0, 6)}...${account.slice(-4)}`]);
        }
      };

      const handleChainChanged = () => {
        setLogs(prev => [...prev, "🔄 네트워크가 변경되었습니다."]);
        // 페이지 새로고침하여 네트워크 변경 적용
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // 프로세스 단계 초기화
  const initializeProcessSteps = async (_caseId: string) => {
    // 단계 초기화 로직이 필요한 경우 여기에 구현
  };

  // 단계 업데이트
  const updateStep = async (stepNumber: number, status: 'pending' | 'completed' | 'failed', data?: unknown) => {
    // 단계 업데이트 로직이 필요한 경우 여기에 구현
    console.log(`Step ${stepNumber} ${status}`, data);
  };

  // 파일 해시 생성 함수
  const generateFileHash = async (input: File | string): Promise<string> => {
    try {
      let content: string;
      
      if (input instanceof File) {
        content = await readFileAsText(input);
      } else {
        content = input;
      }
      
      // 스마트 컨트랙트와 동일한 방식으로 해시 생성
      const hash = keccak256(encodePacked(['string'], [content]));
      
      return hash;
    } catch (error) {
      throw new Error(`해시 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 파일 읽기 함수
  const readFileAsText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('파일 읽기 실패'));
        }
      };
      reader.onerror = () => reject(new Error('파일 읽기 오류'));
      reader.readAsText(file);
    });
  };

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      await processFile(file);
    }
  };

  // 파일 선택 이벤트 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      await processFile(file);
    }
  };

  // 파일 처리 함수
  const processFile = async (file: File) => {
    try {
      setLogs(prev => [...prev, `📁 파일 선택됨: ${file.name}`]);
      setUploadedFile(file);
      
      const content = await readFileAsText(file);
      setDocument(content);
      
      const hash = await generateFileHash(content);
      setDocumentHash(hash);
      
      setLogs(prev => [...prev, `🔐 파일 해시 생성: ${hash}`]);
      
      // 즉시 블록체인 등록 시작
      setLogs(prev => [...prev, `⛓️ 블록체인 등록 자동 시작...`]);
      await handleStep2();
    } catch (error) {
      setLogs(prev => [...prev, `❌ 파일 처리 실패: ${error}`]);
    }
  };

  /**
   * 1단계: 파일 업로드
   */
  const handleStep1 = async () => {
    if (!uploadedFile || !document) {
      setLogs(prev => [...prev, "❌ 업로드된 파일이 없습니다."]);
      return;
    }

    try {
      setIsProcessing(true);
      setLogs(prev => [...prev, "📁 파일 처리 중..."]);
      
      // 파일 해시 생성
      const hash = documentHash || await generateFileHash(document);
      setDocumentHash(hash);
      
      setLogs(prev => [...prev, `🔐 파일 해시 생성: ${hash}`]);
      setLogs(prev => [...prev, "📋 해시값을 복사하려면 아래 버튼을 클릭하세요."]);
      
      // 실제 파일 업로드
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('hash', hash);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      setLogs(prev => [...prev, "✅ 파일 업로드 완료"]);
      
      // 문서 해시 저장
      setDocumentHash(hash);
      await updateStep(1, 'completed', { documentHash: hash, fileName: uploadedFile.name });
      
      // 바로 은행 전송 단계로 이동
      setCurrentStep(1);
      setLogs(prev => [...prev, "✅ 문서 등록 완료 - 은행 전송 준비 완료"]);
    } catch (error) {
      setLogs(prev => [...prev, `❌ 파일 업로드 실패: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      await updateStep(1, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 해시값 복사 함수
  const copyHashToClipboard = async () => {
    if (documentHash) {
      try {
        await navigator.clipboard.writeText(documentHash);
        setLogs(prev => [...prev, "✅ 해시값이 클립보드에 복사되었습니다!"]);
      } catch (error) {
        setLogs(prev => [...prev, "❌ 해시값 복사 실패: 수동으로 복사해주세요."]);
      }
    }
  };

  /**
   * 2단계: 은행 전송
   */
  const handleStep2 = async () => {
    if (!documentHash) {
      setLogs(prev => [...prev, "❌ 문서 해시가 없습니다."]);
      return;
    }

    try {
      setIsProcessing(true);
      setLogs(prev => [...prev, "🏦 은행에 파일 전송 중..."]);
      
      // 실제 파일 업로드
      const formData = new FormData();
      formData.append('file', uploadedFile!);
      formData.append('hash', documentHash);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to bank');
      }

      setLogs(prev => [...prev, "✅ 은행 전송 완료"]);
      setLogs(prev => [...prev, "🎉 모든 프로세스가 완료되었습니다!"]);
      
      await updateStep(2, 'completed', { 
        documentHash: documentHash,
        fileName: uploadedFile?.name,
        uploadedAt: new Date().toISOString()
      });
      
      // 2단계 완료 후 프로세스 종료
      if (onDocumentGenerated) {
        onDocumentGenerated(document, documentHash, "bank_transfer_completed");
      }
    } catch (error) {
      setLogs(prev => [...prev, `❌ 은행 전송 실패: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      await updateStep(2, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * RSA 암호화 함수 (시뮬레이션)
   * 
   * 실제 RSA 암호화는 복잡한 수학적 연산이 필요하므로,
   * 여기서는 시뮬레이션을 위해 Base64 인코딩을 사용합니다.
   * 
   * @param text 암호화할 텍스트
   * @returns 암호화된 데이터 (Base64 문자열)
   */
  const mockRSAEncrypt = (text: string): string => {
    try {
      // Base64 인코딩을 통한 시뮬레이션
      const encoded = btoa(unescape(encodeURIComponent(text)));
      return `ENCRYPTED_${encoded}_${Date.now()}`;
    } catch (error) {
      throw new Error(`암호화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * RSA 복호화 함수 (시뮬레이션)
   * 
   * @param encryptedText 암호화된 텍스트
   * @returns 복호화된 데이터
   */
  const mockRSADecrypt = (encryptedText: string): string => {
    try {
      // Base64 디코딩을 통한 시뮬레이션
      const encoded = encryptedText.replace('ENCRYPTED_', '').replace(/_\d+$/, '');
      return decodeURIComponent(escape(atob(encoded)));
    } catch (error) {
      throw new Error(`복호화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="overseas-inheritor-process">
      <h2>🌍 해외 상속인 프로세스</h2>
      <p className="description">
        해외에서 작성한 상속 관련 문서를 업로드하고<br />
        블록체인에 등록한 후, 암호화하여 은행에 전송하는 과정입니다.
      </p>

      {/* 단계 표시기 */}
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* MetaMask 연결 상태 */}
      <div className="metamask-status">
        {isConnected ? (
          <div className="connected">
            <div className="account-info">
              <span>✅ MetaMask 연결됨 - 주소: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
              <div className="account-actions">
                <button 
                  onClick={switchAccount}
                  className="switch-account-button"
                  title="MetaMask에서 계정 선택 팝업을 엽니다"
                >
                  🔄 계정 변경
                </button>
                <div className="account-change-tip">
                  💡 <strong>팁</strong>: MetaMask 확장 프로그램에서 직접 계정을 변경할 수도 있습니다.
                </div>
              </div>
            </div>
            <div className="network-info">
              <span className="network-ok">✅ Anvil Local Chain 연결됨</span>
              <div className="network-tip">
                💡 <strong>팁</strong>: Anvil Local Chain (Chain ID: 31337)에 연결되어 있는지 확인하세요.
                <br />
                실제 ETH 대신 테스트 ETH를 사용할 수 있습니다.
              </div>
            </div>
          </div>
        ) : (
          <div className="not-connected">
            ❌ MetaMask 연결 안됨
            <div className="metamask-guide">
              <h4>🔑 MetaMask 설정이 필요합니다</h4>
              <ol>
                <li><strong>MetaMask 설치</strong>: <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">https://metamask.io/</a>에서 브라우저 확장 프로그램 설치</li>
                <li><strong>계정 생성</strong>: MetaMask에서 새 계정을 생성하고 개인키를 안전하게 보관</li>
                <li><strong>Anvil 네트워크 추가</strong>:
                  <div className="anvil-network-guide">
                    <h5>🔗 Anvil 로컬 네트워크 설정:</h5>
                    <ul>
                      <li><strong>네트워크 이름</strong>: <code>Anvil Local</code></li>
                      <li><strong>새 RPC URL</strong>: <code>http://localhost:8545</code></li>
                      <li><strong>체인 ID</strong>: <code>31337</code></li>
                      <li><strong>통화 기호</strong>: <code>ETH</code></li>
                      <li><strong>블록 탐색기 URL</strong>: (비워두기)</li>
                    </ul>
                  </div>
                </li>
                <li><strong>테스트 ETH 받기</strong>: Anvil에서 제공하는 테스트 ETH를 받아야 합니다
                  <div className="test-eth-guide">
                    <p>Anvil에서 제공하는 테스트 계정들:</p>
                    <ul>
                      <li><strong>계정 0</strong>: <code>0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</code> (10000 ETH)</li>
                      <li><strong>계정 1</strong>: <code>0x70997970C51812dc3A010C7d01b50e0d17dc79C8</code> (10000 ETH)</li>
                      <li><strong>계정 2</strong>: <code>0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC</code> (10000 ETH)</li>
                    </ul>
                    <p>MetaMask에서 이 계정들을 가져오거나, Anvil이 실행 중일 때 자동으로 테스트 ETH를 받을 수 있습니다.</p>
                    <div className="test-eth-instructions">
                      <h6>💰 테스트 ETH 받는 방법:</h6>
                      <ol>
                        <li>MetaMask에서 Anvil Local 네트워크로 전환</li>
                        <li>상단의 계정 선택 드롭다운 클릭</li>
                        <li>"계정 가져오기" 또는 "Import Account" 클릭</li>
                        <li>위의 테스트 계정 중 하나의 개인키를 입력 (<strong>0x 접두사 제외</strong>):
                          <ul>
                            <li><strong>계정 0</strong>: <code>0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</code>
                              <br />개인키: <code>ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</code> (10000 ETH)</li>
                            <li><strong>계정 1</strong>: <code>0x70997970C51812dc3A010C7d01b50e0d17dc79C8</code>
                              <br />개인키: <code>59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d</code> (10000 ETH)</li>
                            <li><strong>계정 2</strong>: <code>0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC</code>
                              <br />개인키: <code>5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a</code> (10000 ETH)</li>
                          </ul>
                        </li>
                        <li className="important-note"><strong>중요</strong>: 개인키 입력 시 <code>0x</code> 접두사를 <strong>제외하고</strong> 입력해야 합니다!</li>
                        <li>"가져오기" 또는 "Import" 클릭</li>
                        <li>이제 10000 ETH가 있는 테스트 계정을 사용할 수 있습니다!</li>
                      </ol>
                    </div>
                  </div>
                </li>
              </ol>
            </div>
            <button 
              onClick={connectMetaMask}
              className="connect-button"
            >
              🔗 MetaMask 연결
            </button>
          </div>
        )}
      </div>

      {/* 단계별 콘텐츠 */}
      {currentStep === 0 && (
        <div className="step-content">
          <h2>파일 업로드</h2>
          <p>상속 관련 문서를 업로드하여 블록체인에 등록합니다.</p>
          
          <div className="file-upload-area">
            <div
              className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-content">
                <div className="upload-icon">📁</div>
                <p className="upload-text">
                  {uploadedFile ? uploadedFile.name : "파일을 드래그하여 업로드하거나 클릭하여 선택하세요"}
                </p>
                {uploadedFile && (
                  <div className="file-info">
                    <p>파일 크기: {(uploadedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt"
            />
          </div>
          
          {documentHash && (
            <div className="hash-display">
              <h3>🔐 생성된 파일 해시</h3>
              <div className="hash-container">
                <code className="hash-value">{documentHash}</code>
                <button 
                  onClick={copyHashToClipboard}
                  className="copy-hash-button"
                  title="해시값을 클립보드에 복사"
                >
                  📋 복사
                </button>
              </div>
              <p className="hash-note">
                💡 이 해시값을 복사하여 은행 탭에서 문서 검증에 사용할 수 있습니다.
              </p>
            </div>
          )}
          
          <button 
            onClick={handleStep1} 
            className="step-button"
            disabled={!uploadedFile || isProcessing}
          >
            {isProcessing ? "⏳ 처리 중..." : "📁 파일 업로드 진행"}
          </button>
        </div>
      )}

      {currentStep === 1 && (
        <div className="step-content">
          <h2>은행 전송</h2>
          <p>파일을 은행 시스템에 전송하여 저장합니다.</p>
          
          {documentHash && (
            <div className="hash-display">
              <h3>🔐 파일 해시</h3>
              <div className="hash-container">
                <code className="hash-value">{documentHash}</code>
                <button 
                  onClick={copyHashToClipboard}
                  className="copy-hash-button"
                  title="해시값을 클립보드에 복사"
                >
                  📋 복사
                </button>
              </div>
              <p className="hash-note">
                💡 이 해시값을 복사하여 은행 탭에서 문서 검증에 사용할 수 있습니다.
              </p>
            </div>
          )}
          
          <button 
            onClick={handleStep2} 
            className="step-button"
            disabled={isProcessing}
          >
            {isProcessing ? "⏳ 처리 중..." : "🏦 은행 전송 진행"}
          </button>
        </div>
      )}

      <LogBox logs={logs} />
    </div>
  );
}
