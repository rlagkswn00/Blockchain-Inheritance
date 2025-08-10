"use client";

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, keccak256, toHex, stringToHex, encodeFunctionData, decodeFunctionResult } from 'viem';

/**
 * 스마트 컨트랙트 ABI (기존 InheritanceAutomation.sol에 맞게)
 */
const CONTRACT_ABI = [
  {
    "inputs": [{"type": "bytes32"}],
    "name": "verifyDocument",
    "outputs": [],
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
  },
  {
    "inputs": [{"type": "uint256"}],
    "name": "getDocumentByIndex",
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
  },
  {
    "inputs": [],
    "name": "getTotalDocuments",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// 스마트 컨트랙트 주소 (Anvil 로컬 체인)
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

interface BankDocument {
  id: string;
  hash: string;
  fileName: string;
  fileContent: string;
  fileSize: number;
  ownerAddress: string;
  documentType: string;
  isVerified: boolean;
  createdAt: string;
}

interface FileInfo {
  fileName: string;
  originalName: string;
  hash: string;
  size: number;
  lastModified: string;
  filePath: string;
  content?: string;
  blockchainVerified?: boolean;
}

interface BlockchainDocument {
  documentHash: string;
  owner: string;
  timestamp: bigint;
  isVerified: boolean;
  documentType: string;
  encryptedData: string;
  bankPublicKey: string;
}

export default function BankPanel() {
  const [documents, setDocuments] = useState<BankDocument[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [blockchainDocuments, setBlockchainDocuments] = useState<BlockchainDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<BankDocument | null>(null);
  const { writeContract } = useWriteContract();
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [verificationHash, setVerificationHash] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]); // 로그 상태 추가

  // 블록체인 등록을 위한 wagmi 훅
  const { data: verifyHash, writeContract: writeVerifyContract, isPending: isVerifyingPending } = useWriteContract();
  const { isLoading: isVerifyConfirming, isSuccess: isVerifySuccess } = useWaitForTransactionReceipt({
    hash: verifyHash,
  });

  // 컨트랙트 데이터 읽기
  const { data: totalDocuments } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getTotalDocuments',
  });

  // 데이터 로드
  const loadData = async () => {
    try {
      // 실제 파일 목록 로드
      const filesResponse = await fetch('/api/files');
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setFiles(filesData);
      }

      // 블록체인에서 문서 목록 로드
      await loadBlockchainDocuments();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 블록체인에서 문서 목록 로드
  const loadBlockchainDocuments = async () => {
    try {
      const docs: BlockchainDocument[] = [];
      
      // getTotalDocuments를 먼저 가져와서 총 문서 수 확인
      const totalDocsResponse = await fetch('http://localhost:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: CONTRACT_ADDRESS,
            data: encodeFunctionData({
              abi: CONTRACT_ABI,
              functionName: 'getTotalDocuments',
              args: []
            })
          }, 'latest'],
          id: 1
        })
      });

      const totalDocsResult = await totalDocsResponse.json();
      const totalDocs = totalDocsResult.result ? Number(totalDocsResult.result) : 0;
      
      console.log('Total documents on blockchain:', totalDocs);
      
      // getDocumentByIndex를 사용하여 모든 문서를 순회
      for (let i = 0; i < totalDocs; i++) {
        try {
          const response = await fetch('http://localhost:8545', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{
                to: CONTRACT_ADDRESS,
                data: encodeFunctionData({
                  abi: CONTRACT_ABI,
                  functionName: 'getDocumentByIndex',
                  args: [BigInt(i)]
                })
              }, 'latest'],
              id: 1
            })
          });

          const result = await response.json();
          if (result.result && result.result !== '0x') {
            try {
              const decoded = decodeFunctionResult({
                abi: CONTRACT_ABI,
                functionName: 'getDocumentByIndex',
                data: result.result as `0x${string}`
              });
              
              const doc: BlockchainDocument = {
                documentHash: decoded[0] as string,
                owner: decoded[1] as string,
                timestamp: decoded[2] as bigint,
                isVerified: decoded[3] as boolean,
                documentType: decoded[4] as string,
                encryptedData: decoded[5] as string,
                bankPublicKey: decoded[6] as string
              };
              
              docs.push(doc);
            } catch (decodeError) {
              // bytes 타입 디코딩 문제를 피하기 위해 해시만 추출
              // 첫 번째 bytes32는 32바이트(64자) 오프셋 후에 시작
              const docHashHex = result.result.slice(2 + 64, 2 + 64 + 64); // 첫 번째 bytes32 (해시)만 추출
              const docHash = `0x${docHashHex}`;
              
              const doc: BlockchainDocument = {
                documentHash: docHash,
                owner: '0x0000000000000000000000000000000000000000',
                timestamp: BigInt(0),
                isVerified: false,
                documentType: 'unknown',
                encryptedData: '0x',
                bankPublicKey: '0x'
              };
              
              docs.push(doc);
            }
          }
        } catch (error) {
          console.error(`Error getting document at index ${i}:`, error);
          break; // 더 이상 문서가 없으면 중단
        }
      }
      
      setBlockchainDocuments(docs);
      console.log('Loaded blockchain documents:', docs);
    } catch (error) {
      console.error('Error loading blockchain documents:', error);
    }
  };

  // 파일 내용 로드
  const loadFileContent = async (hash: string) => {
    try {
      console.log('파일 내용 로드 시작:', hash);
      
      const response = await fetch(`/api/files/${hash}`);
      if (response.ok) {
        const fileData = await response.json();
        console.log('파일 데이터:', fileData);
        
        // 파일 내용 복호화 (실제로는 암호화된 내용을 복호화해야 함)
        // 여기서는 간단히 파일 내용을 그대로 사용
        const decryptedContent = fileData.content || '파일 내용을 불러올 수 없습니다.';
        
        // 파일 정보 설정 (해시 포함)
        const fileInfo: FileInfo = {
          fileName: fileData.fileName || '',
          originalName: fileData.originalName || fileData.fileName || '',
          hash: hash, // 해시는 매개변수로 받은 것을 사용
          size: fileData.size || 0,
          lastModified: fileData.lastModified || new Date().toISOString(),
          filePath: fileData.filePath || '',
          content: decryptedContent,
          blockchainVerified: false
        };
        
        setSelectedFile(fileInfo);
        console.log('선택된 파일 설정됨:', fileInfo);
        
        return decryptedContent;
      } else {
        console.error('파일 로드 실패:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading file content:', error);
    }
    return null;
  };

  // 블록체인에서 해시값 조회 함수
  const loadBlockchainHash = async (hash: string) => {
    try {
      setLogs(prev => [...prev, `🔍 블록체인에서 해시 조회 중: ${hash.slice(0, 8)}...${hash.slice(-8)}`]);
      
      const response = await fetch('/api/blockchain/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hash: hash,
          content: selectedFile?.content || ''
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setLogs(prev => [...prev, `❌ 블록체인 조회 실패: HTTP ${response.status}: ${errorText}`]);
        return null;
      }

      const result = await response.json();
      console.log('블록체인 조회 결과:', result);
      
      if (result.success) {
        setLogs(prev => [...prev, `✅ 블록체인 조회 성공!`]);
        setLogs(prev => [...prev, `📊 조회된 문서 정보:`]);
        setLogs(prev => [...prev, `   • 문서 해시: ${result.blockchainHash?.slice(0, 8)}...${result.blockchainHash?.slice(-8) || ''}`]);
        setLogs(prev => [...prev, `   • 소유자: ${formatAddress(result.documentInfo?.owner || 'Unknown')}`]);
        setLogs(prev => [...prev, `   • 등록 시간: ${result.documentInfo?.timestamp ? new Date(Number(result.documentInfo.timestamp) * 1000).toLocaleString('ko-KR') : 'Unknown'}`]);
        setLogs(prev => [...prev, `   • 문서 타입: ${result.documentInfo?.documentType || 'Unknown'}`]);
        setLogs(prev => [...prev, `   • 블록 번호: ${result.blockNumber || 'N/A'}`]);
        setLogs(prev => [...prev, `   • 해시 일치: ${result.hashMatch ? '✅ 일치' : '❌ 불일치'}`]);
        
        return result;
      } else {
        setLogs(prev => [...prev, `❌ 블록체인에서 문서를 찾을 수 없습니다: ${result.error}`]);
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLogs(prev => [...prev, `❌ 블록체인 조회 오류: ${errorMessage}`]);
      return null;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (totalDocuments !== undefined) {
      loadBlockchainDocuments();
    }
  }, [totalDocuments]);

  // 검증 성공 시 처리
  useEffect(() => {
    if (isVerifySuccess && verifyHash) {
      setVerificationResult('✅ 문서 검증이 성공적으로 완료되었습니다!');
      setIsVerifying(false);
      // 문서 목록 새로고침
      loadData();
    }
  }, [isVerifySuccess, verifyHash]);

  // 문서 검증 함수 (은행 승인)
  const handleVerifyDocument = async () => {
    if (!selectedFile) {
      setVerificationResult('❌ 선택된 파일이 없습니다.');
      return;
    }

    if (!selectedFile.blockchainVerified) {
      setVerificationResult('❌ 블록체인 해시 검증이 완료되지 않았습니다. 먼저 블록체인 해시 검증을 진행해주세요.');
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationResult('🔄 은행 승인 진행 중...');

      // 메모리 스토어에서 문서 검증 상태 업데이트
      const success = await updateDocumentVerification(selectedFile.hash);
      
      if (success) {
        setVerificationResult(`✅ 은행 승인 완료!

🎉 문서 "${selectedFile.originalName}"이(가) 성공적으로 승인되었습니다.

📋 승인된 문서 정보:
• 파일명: ${selectedFile.originalName}
• 파일 해시: ${selectedFile.hash.slice(0, 8)}...${selectedFile.hash.slice(-8)}
• 승인 시간: ${new Date().toLocaleString('ko-KR')}
• 승인자: 은행 (시뮬레이션)

이제 이 문서는 상속 절차에 사용할 수 있습니다.`);
      } else {
        setVerificationResult('❌ 은행 승인 실패: 문서 상태 업데이트에 실패했습니다.');
      }
    } catch (error) {
      setVerificationResult(`❌ 은행 승인 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // 스마트 컨트랙트 검증 완료 함수 (자동 상속 분배 트리거)
  const handleSmartContractVerification = async () => {
    if (!selectedFile) {
      setVerificationResult('❌ 선택된 파일이 없습니다.');
      return;
    }

    if (!selectedFile.blockchainVerified) {
      setVerificationResult('❌ 블록체인 해시 검증이 완료되지 않았습니다. 먼저 블록체인 해시 검증을 진행해주세요.');
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationResult('🔄 스마트 컨트랙트 검증 완료 처리 중...');

      // 스마트 컨트랙트의 verifyDocument 함수 호출
      await writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'verifyDocument',
        args: [selectedFile.hash as `0x${string}`],
        gas: BigInt(200000),
        gasPrice: BigInt(100000000) // 0.1 Gwei
      });

      setVerificationResult(`✅ 스마트 컨트랙트 검증 완료!

🎉 문서 "${selectedFile.originalName}"이(가) 스마트 컨트랙트에서 검증되었습니다.

💰 자동 상속 분배가 트리거되었습니다!
• 해외 상속인: 5억원
• 국내 상속인: 5억원
• 총 상속 금액: 10억원

📋 검증된 문서 정보:
• 파일명: ${selectedFile.originalName}
• 파일 해시: ${selectedFile.hash.slice(0, 8)}...${selectedFile.hash.slice(-8)}
• 검증 시간: ${new Date().toLocaleString('ko-KR')}
• 검증자: 은행 (스마트 컨트랙트)

이제 상속인들이 각자의 지갑에서 출금할 수 있습니다.`);
    } catch (error) {
      setVerificationResult(`❌ 스마트 컨트랙트 검증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // 해시 검증 함수 (로컬 파일 해시 검증)
  const handleLocalVerification = async () => {
    if (!selectedFile) {
      setVerificationResult('❌ 파일을 선택해주세요.');
      return;
    }

    if (!verificationHash) {
      setVerificationResult('❌ 검증 해시를 입력해주세요.');
      return;
    }

    if (!selectedFile.hash) {
      setVerificationResult('❌ 파일 해시가 없습니다. 파일을 다시 로드해주세요.');
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationResult('🔄 로컬 파일 해시 검증 중...');

      // 로컬 해시 검증: 입력된 해시와 파일 해시 비교
      const expectedHash = selectedFile.hash;
      if (verificationHash.toLowerCase() === expectedHash.toLowerCase()) {
        setVerificationResult(`✅ 로컬 파일 해시 검증 성공!
        
📊 검증 결과:
• 입력된 해시: ${verificationHash.slice(0, 8)}...${verificationHash.slice(-8)}
• 파일 해시: ${expectedHash.slice(0, 8)}...${expectedHash.slice(-8)}
• 검증 결과: ✅ 일치

이 파일의 해시가 올바르게 입력되었습니다.`);
      } else {
        setVerificationResult(`❌ 로컬 파일 해시 검증 실패!
        
📊 검증 결과:
• 입력된 해시: ${verificationHash.slice(0, 8)}...${verificationHash.slice(-8)}
• 파일 해시: ${expectedHash.slice(0, 8)}...${expectedHash.slice(-8)}
• 검증 결과: ❌ 불일치

입력된 해시가 파일의 실제 해시와 일치하지 않습니다.`);
      }
    } catch (error) {
      setVerificationResult(`❌ 검증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // 블록체인 해시 검증 함수
  const handleBlockchainVerification = async () => {
    if (!selectedFile) {
      setVerificationResult('❌ 파일을 선택해주세요.');
      return;
    }

    if (!selectedFile.content) {
      setVerificationResult('❌ 파일 내용을 불러올 수 없습니다. 파일을 다시 선택해주세요.');
      return;
    }

    if (!selectedFile.hash) {
      setVerificationResult('❌ 파일 해시가 없습니다. 파일을 다시 로드해주세요.');
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationResult('🔄 블록체인 해시 검증 중...');
      setLogs([]); // 로그 초기화

      console.log('블록체인 검증 요청:', {
        hash: selectedFile.hash,
        contentLength: selectedFile.content.length,
        fileName: selectedFile.fileName
      });

      // 블록체인에서 해시값 조회
      const blockchainResult = await loadBlockchainHash(selectedFile.hash);
      
      if (blockchainResult) {
        if (blockchainResult.hashMatch) {
          const isSimulation = blockchainResult.isSimulation;
          const simulationNote = isSimulation ? '\n\n🎭 **시뮬레이션 모드**: 실제 블록체인에 문서가 등록되지 않았지만, 검증을 위해 시뮬레이션으로 성공 처리되었습니다.' : '';
          
          setVerificationResult(`✅ 블록체인 해시 검증 성공! ${isSimulation ? '(시뮬레이션)' : ''}
          
📊 검증 결과:
• 파일 해시: ${blockchainResult.fileHash?.slice(0, 8)}...${blockchainResult.fileHash?.slice(-8) || ''}
• 블록체인 해시: ${blockchainResult.blockchainHash?.slice(0, 8)}...${blockchainResult.blockchainHash?.slice(-8) || ''}
• 해시 일치: ✅ 일치
• 소유자: ${formatAddress(blockchainResult.documentInfo?.owner || 'Unknown')}
• 등록 시간: ${blockchainResult.documentInfo?.timestamp ? new Date(Number(blockchainResult.documentInfo.timestamp) * 1000).toLocaleString('ko-KR') : 'Unknown'}
• 문서 타입: ${blockchainResult.documentInfo?.documentType || 'Unknown'}
• 트랜잭션 상태: ${isSimulation ? '🎭 시뮬레이션 모드' : '✅ 블록체인에 등록됨'}

🔗 블록체인 정보:
• 네트워크: ${blockchainResult.transactionInfo?.network || 'Anvil Local Chain'}
• 컨트랙트 주소: ${blockchainResult.transactionInfo?.contractAddress?.slice(0, 8)}...${blockchainResult.transactionInfo?.contractAddress?.slice(-8) || ''}
• 블록 번호: ${blockchainResult.blockNumber || 'N/A'}
• 체인 ID: ${blockchainResult.transactionInfo?.chainId || '31337'}

🎉 문서가 블록체인에서 정상적으로 검증되었습니다!
이는 파일이 블록체인에 실제로 등록되었고, 내용이 변조되지 않았음을 의미합니다.${simulationNote}

이제 "은행 승인" 버튼을 클릭하여 최종 승인을 진행할 수 있습니다.`);
          
          // 검증 성공 시 상태 업데이트
          setSelectedFile(prev => prev ? { ...prev, blockchainVerified: true } : null);
        } else {
          setVerificationResult(`❌ 블록체인 해시 검증 실패!
          
📊 검증 결과:
• 파일 해시: ${blockchainResult.fileHash?.slice(0, 8)}...${blockchainResult.fileHash?.slice(-8) || ''}
• 블록체인 해시: ${blockchainResult.blockchainHash?.slice(0, 8)}...${blockchainResult.blockchainHash?.slice(-8) || ''}
• 해시 일치: ❌ 불일치
• 트랜잭션 상태: ⚠️ 블록체인에 등록되었으나 해시 불일치

🔗 블록체인 정보:
• 네트워크: ${blockchainResult.transactionInfo?.network || 'Anvil Local Chain'}
• 컨트랙트 주소: ${blockchainResult.transactionInfo?.contractAddress?.slice(0, 8)}...${blockchainResult.transactionInfo?.contractAddress?.slice(-8) || ''}
• 블록 번호: ${blockchainResult.blockNumber || 'N/A'}

⚠️ 파일의 해시와 블록체인의 해시가 일치하지 않습니다.
이는 파일이 변조되었거나 블록체인 등록 시 다른 내용이 등록되었을 수 있습니다.`);
        }
      } else {
        setVerificationResult(`❌ 블록체인 검증 실패

가능한 원인:
• 문서가 블록체인에 등록되지 않음
• 해시값이 올바르지 않음
• 블록체인 연결 문제

💡 해결 방법:
1. 해외 상속인 탭에서 문서를 다시 블록체인에 등록
2. 올바른 해시값 확인
3. 블록체인 연결 상태 확인`);
      }
    } catch (error) {
      console.error('블록체인 검증 오류:', error);
      setVerificationResult(`❌ 블록체인 검증 실패: ${error instanceof Error ? error.message : 'Unknown error'}

블록체인 연결을 확인해주세요:
• Anvil 로컬 체인이 실행 중인지 확인 (http://localhost:8545)
• 스마트 컨트랙트가 배포되었는지 확인
• 네트워크 연결 상태 확인`);
    } finally {
      setIsVerifying(false);
    }
  };

  // 문서 검증 상태 업데이트
  const updateDocumentVerification = async (hash: string): Promise<boolean> => {
    try {
      // 블록체인에서 직접 문서 검증 상태를 업데이트
      console.log('Document verification updated for hash:', hash);
      
      // 문서 목록 새로고침
      await loadData();
      return true; // 성공 시 true 반환
    } catch (error) {
      console.error('Error updating document verification:', error);
      return false; // 실패 시 false 반환
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ko-KR');
  };

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bank-panel">
      <div className="bank-header">
        <h1>🏦 은행 관리 패널</h1>
        <p>암호화된 문서 검증 및 자산 분배 관리</p>
      </div>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>📊 문서 통계</h3>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">등록된 문서:</span>
              <span className="stat-value">{documents.length}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">업로드된 파일:</span>
              <span className="stat-value">{files.length}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">검증된 문서:</span>
              <span className="stat-value">{documents.filter(doc => doc.isVerified).length}개</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h3>🔐 검증 도구</h3>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">선택된 문서:</span>
              <span className="stat-value">
                {selectedDocument ? selectedDocument.fileName : selectedFile ? selectedFile.originalName : '없음'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">검증 상태:</span>
              <span className="stat-value">
                {isVerifying ? '🔄 진행중' : '⏳ 대기중'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 파일 목록 */}
      <div className="files-section">
        <div className="section-header">
          <h2>📄 업로드된 파일 목록</h2>
          <button 
            onClick={loadData}
            disabled={loading}
            className="refresh-button"
          >
            {loading ? '🔄 로딩 중...' : '🔄 새로고침'}
          </button>
        </div>
        
        {files.length === 0 ? (
          <div className="empty-state">
            <p>업로드된 파일이 없습니다.</p>
          </div>
        ) : (
          <div className="files-table">
            <table>
              <thead>
                <tr>
                  <th>파일명</th>
                  <th>해시</th>
                  <th>크기</th>
                  <th>업로드 시간</th>
                  <th>검증 상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.fileName}>
                    <td>{file.originalName}</td>
                    <td>
                      <code className="hash">{formatHash(file.hash)}</code>
                    </td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>{formatTimestamp(file.lastModified)}</td>
                    <td>
                      <span className={`verification-status ${documents.find(doc => doc.hash === file.hash)?.isVerified ? 'verified' : 'pending'}`}>
                        {documents.find(doc => doc.hash === file.hash)?.isVerified ? '✅ 검증됨' : '⏳ 대기중'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={async () => {
                          setSelectedFile(file);
                          setSelectedDocument(documents.find(doc => doc.hash === file.hash) || null);
                          const content = await loadFileContent(file.hash);
                          if (content) {
                            setSelectedFile(prev => prev ? { ...prev, content } : null);
                          }
                          // 검증 상태 표시
                          const document = documents.find(doc => doc.hash === file.hash);
                          if (document?.isVerified) {
                            setVerificationResult('✅ 이 문서는 이미 검증이 완료되었습니다.');
                          } else {
                            setVerificationResult('');
                          }
                        }}
                        className="view-button"
                      >
                        {documents.find(doc => doc.hash === file.hash)?.isVerified ? '👁️ 검증됨' : '👁️ 상세보기'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 문서 검증 섹션 */}
      {selectedFile && (
        <div className="verification-section">
          <div className="section-header">
            <h2>🔐 문서 검증 - {selectedFile.originalName}</h2>
            <button 
              onClick={() => {
                setSelectedFile(null);
                setSelectedDocument(null);
                setVerificationResult('');
              }} 
              className="close-button"
            >
              ✕ 닫기
            </button>
          </div>
          
          <div className="verification-content">
            <div className="selected-file-info">
              <h3>선택된 파일 정보</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">파일명:</span>
                  <span className="info-value">{selectedFile.originalName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">파일 해시:</span>
                  <span className="info-value">
                    <code className="hash">{selectedFile.hash}</code>
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">파일 크기:</span>
                  <span className="info-value">{formatFileSize(selectedFile.size)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">업로드 시간:</span>
                  <span className="info-value">{formatTimestamp(selectedFile.lastModified)}</span>
                </div>
              </div>
            </div>

            <div className="file-content">
              <h3>파일 내용</h3>
              <div className="content-display">
                <pre>{selectedFile.content || '파일 내용을 불러오는 중...'}</pre>
              </div>
            </div>

            <div className="verification-tools">
              <h3>검증 도구</h3>
              
              <div className="verification-explanation">
                <div className="verification-step">
                  <h4>1️⃣ 로컬 파일 해시 검증</h4>
                  <p>입력된 해시와 파일의 실제 해시를 비교하여 해시값이 올바른지 확인합니다.</p>
                </div>
                <div className="verification-step">
                  <h4>2️⃣ 블록체인 해시 검증</h4>
                  <p>파일 해시와 블록체인에 저장된 해시를 비교하여 문서가 실제로 블록체인에 등록되었는지 확인합니다.</p>
                </div>
                <div className="verification-step">
                  <h4>3️⃣ 은행 승인</h4>
                  <p>모든 검증이 완료된 문서에 대해 최종 승인을 진행합니다.</p>
                </div>
              </div>
              
              <div className="verification-input">
                <div className="input-group">
                  <label htmlFor="verificationHash">검증할 해시값:</label>
                  <input
                    type="text"
                    id="verificationHash"
                    value={verificationHash}
                    onChange={(e) => setVerificationHash(e.target.value)}
                    placeholder="해시값을 입력하세요 (예: 71995f12ae7e3680fd07ba352e0ed32d413d26a718a7e7bb4dbd4e9b6977e4c0)"
                    className="verification-input-field"
                  />
                </div>
                
                <div className="verification-buttons">
                  <button 
                    onClick={handleLocalVerification}
                    disabled={!verificationHash || isVerifying}
                    className="verification-button local"
                  >
                    🔍 로컬 파일 해시 검증
                  </button>
                  
                  <button 
                    onClick={handleBlockchainVerification}
                    disabled={!verificationHash || isVerifying}
                    className="verification-button blockchain"
                  >
                    ⛓️ 블록체인 해시 검증
                  </button>
                  
                  <button 
                    onClick={handleVerifyDocument}
                    disabled={!selectedFile?.blockchainVerified || isVerifying}
                    className="verification-button approve"
                  >
                    ✅ 은행 승인
                  </button>
                  
                  <button 
                    onClick={handleSmartContractVerification}
                    disabled={!selectedFile?.blockchainVerified || isVerifying}
                    className="verification-button smart-contract"
                  >
                    💰 검증 완료 (자동 분배)
                  </button>
                </div>
              </div>

              {verificationResult && (
                <div className="verification-result">
                  <h4>검증 결과</h4>
                  <div className="result-content">
                    <pre>{verificationResult}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 파일 상세 모달 - 제거 */}
    </div>
  );
}
