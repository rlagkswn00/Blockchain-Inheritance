"use client";

import { useState, useEffect } from 'react';
import { useReadContract, useWatchContractEvent } from 'wagmi';
import { formatEther } from 'viem';

/**
 * 스마트 컨트랙트 ABI
 */
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "totalDocuments",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalCases",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
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
    "inputs": [{"type": "address"}],
    "name": "getUserDocuments",
    "outputs": [{"type": "bytes32[]"}],
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
  }
] as const;

// 스마트 컨트랙트 주소
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

interface Document {
  id: number;
  case_id: string;
  document_hash: string;
  file_name: string;
  file_size: number;
  file_content: string;
  document_type: string;
  owner_address: string;
  is_verified: boolean;
  encrypted_data: string;
  bank_public_key: string;
  created_at: string;
  updated_at: string;
}

interface ProcessStep {
  id: number;
  case_id: string;
  step_number: number;
  step_name: string;
  status: 'pending' | 'completed' | 'failed';
  data: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

interface InheritanceCase {
  id: number;
  case_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  documents: Document[];
  steps: ProcessStep[];
  inheritors: any[];
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

export default function AdminPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [cases, setCases] = useState<InheritanceCase[]>([]);
  const [blockchainDocuments, setBlockchainDocuments] = useState<BlockchainDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedCase, setSelectedCase] = useState<InheritanceCase | null>(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);

  // 컨트랙트 데이터 읽기
  const { data: totalDocuments } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'totalDocuments',
  });

  const { data: totalCases } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'totalCases',
  });

  // 블록체인 이벤트 모니터링
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'DocumentRegistered',
    onLogs(logs) {
      console.log('New document registered on blockchain:', logs);
      loadBlockchainDocuments();
    },
  });

  // 블록체인에서 문서 목록 로드
  const loadBlockchainDocuments = async () => {
    setBlockchainLoading(true);
    try {
      const docs: BlockchainDocument[] = [];
      const total = Number(totalDocuments || 0);
      
      for (let i = 0; i < total; i++) {
        try {
          const doc = await fetch(`/api/blockchain/document/${i}`).then(res => res.json());
          if (doc.success) {
            docs.push(doc.data);
          }
        } catch (error) {
          console.error(`Error loading document ${i}:`, error);
        }
      }
      
      setBlockchainDocuments(docs);
    } catch (error) {
      console.error('Error loading blockchain documents:', error);
    } finally {
      setBlockchainLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // 실제 블록체인에서만 데이터를 로드하므로 빈 배열로 설정
      setDocuments([]);
      setCases([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadBlockchainDocuments();
  }, []);

  useEffect(() => {
    if (totalDocuments !== undefined) {
      loadBlockchainDocuments();
    }
  }, [totalDocuments]);

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

  const formatBlockchainTimestamp = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString('ko-KR');
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🔧 관리자 패널</h1>
        <p>블록체인 상속 시스템 관리 및 모니터링</p>
      </div>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>📊 전체 통계</h3>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">데이터베이스 문서:</span>
              <span className="stat-value">{documents.length}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">블록체인 문서:</span>
              <span className="stat-value">{blockchainDocuments.length}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">상속 케이스:</span>
              <span className="stat-value">{cases.length}개</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h3>⛓️ 블록체인 상태</h3>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">컨트랙트 주소:</span>
              <span className="stat-value">{formatAddress(CONTRACT_ADDRESS)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 문서 수:</span>
              <span className="stat-value">{Number(totalDocuments || 0)}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 케이스 수:</span>
              <span className="stat-value">{Number(totalCases || 0)}개</span>
            </div>
          </div>
        </div>
      </div>

      {/* 블록체인 문서 목록 */}
      <div className="documents-section">
        <div className="section-header">
          <h2>⛓️ 블록체인 등록 문서</h2>
          <button 
            onClick={loadBlockchainDocuments}
            disabled={blockchainLoading}
            className="refresh-button"
          >
            {blockchainLoading ? '🔄 로딩 중...' : '🔄 새로고침'}
          </button>
        </div>
        
        {blockchainDocuments.length === 0 ? (
          <div className="empty-state">
            <p>블록체인에 등록된 문서가 없습니다.</p>
          </div>
        ) : (
          <div className="documents-table">
            <table>
              <thead>
                <tr>
                  <th>문서 해시</th>
                  <th>소유자</th>
                  <th>문서 타입</th>
                  <th>등록 시간</th>
                  <th>검증 상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {blockchainDocuments.map((doc, index) => (
                  <tr key={index}>
                    <td>
                      <code className="hash">{formatHash(doc.documentHash)}</code>
                    </td>
                    <td>{formatAddress(doc.owner)}</td>
                    <td>
                      <span className="document-type">{doc.documentType || 'inheritance'}</span>
                    </td>
                    <td>{formatBlockchainTimestamp(doc.timestamp)}</td>
                    <td>
                      <span className={`verification-status ${doc.isVerified ? 'verified' : 'pending'}`}>
                        {doc.isVerified ? '✅ 검증됨' : '⏳ 대기중'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedDocument({
                          id: index,
                          case_id: '',
                          document_hash: doc.documentHash,
                          file_name: `Blockchain Document ${index + 1}`,
                          file_size: 0,
                          file_content: '',
                          document_type: doc.documentType,
                          owner_address: doc.owner,
                          is_verified: doc.isVerified,
                          encrypted_data: doc.encryptedData,
                          bank_public_key: doc.bankPublicKey,
                          created_at: formatBlockchainTimestamp(doc.timestamp),
                          updated_at: formatBlockchainTimestamp(doc.timestamp)
                        })}
                        className="view-button"
                      >
                        👁️ 상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 데이터베이스 문서 목록 */}
      <div className="documents-section">
        <div className="section-header">
          <h2>💾 데이터베이스 문서</h2>
        </div>
        
        {documents.length === 0 ? (
          <div className="empty-state">
            <p>데이터베이스에 등록된 문서가 없습니다.</p>
          </div>
        ) : (
          <div className="documents-table">
            <table>
              <thead>
                <tr>
                  <th>파일명</th>
                  <th>문서 타입</th>
                  <th>소유자</th>
                  <th>등록 시간</th>
                  <th>검증 상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.file_name}</td>
                    <td>
                      <span className="document-type">{doc.document_type}</span>
                    </td>
                    <td>{formatAddress(doc.owner_address)}</td>
                    <td>{formatTimestamp(doc.created_at)}</td>
                    <td>
                      <span className={`verification-status ${doc.is_verified ? 'verified' : 'pending'}`}>
                        {doc.is_verified ? '✅ 검증됨' : '⏳ 대기중'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedDocument(doc)}
                        className="view-button"
                      >
                        👁️ 상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 상속 케이스 목록 */}
      <div className="documents-section">
        <div className="section-header">
          <h2>📋 상속 케이스 목록</h2>
        </div>
        
        {cases.length === 0 ? (
          <div className="empty-state">
            <p>등록된 상속 케이스가 없습니다.</p>
          </div>
        ) : (
          <div className="documents-table">
            <table>
              <thead>
                <tr>
                  <th>케이스 ID</th>
                  <th>상태</th>
                  <th>문서 수</th>
                  <th>생성 시간</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caseItem) => (
                  <tr key={caseItem.id}>
                    <td>
                      <code className="case-id">{caseItem.case_id}</code>
                    </td>
                    <td>
                      <span className={`case-status ${caseItem.status}`}>
                        {caseItem.status === 'pending' ? '⏳ 대기중' : 
                         caseItem.status === 'completed' ? '✅ 완료' : 
                         caseItem.status === 'failed' ? '❌ 실패' : caseItem.status}
                      </span>
                    </td>
                    <td>{caseItem.documents?.length || 0}개</td>
                    <td>{formatTimestamp(caseItem.created_at)}</td>
                    <td>
                      <button 
                        onClick={() => setSelectedCase(caseItem)}
                        className="view-button"
                      >
                        👁️ 상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 문서 상세 모달 */}
      {selectedDocument && (
        <div className="modal-overlay" onClick={() => setSelectedDocument(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 문서 상세 정보</h3>
              <button onClick={() => setSelectedDocument(null)} className="close-button">×</button>
            </div>
            <div className="modal-body">
              <div className="document-info">
                <div className="info-row">
                  <span className="info-label">파일명:</span>
                  <span className="info-value">{selectedDocument.file_name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">문서 해시:</span>
                  <span className="info-value">
                    <code className="hash">{selectedDocument.document_hash}</code>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">소유자:</span>
                  <span className="info-value">{formatAddress(selectedDocument.owner_address)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">문서 타입:</span>
                  <span className="info-value">{selectedDocument.document_type}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">등록 시간:</span>
                  <span className="info-value">{formatTimestamp(selectedDocument.created_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">검증 상태:</span>
                  <span className="info-value">
                    <span className={`verification-status ${selectedDocument.is_verified ? 'verified' : 'pending'}`}>
                      {selectedDocument.is_verified ? '✅ 검증됨' : '⏳ 대기중'}
                    </span>
                  </span>
                </div>
                {selectedDocument.file_content && (
                  <div className="info-row">
                    <span className="info-label">문서 내용:</span>
                    <div className="document-content">
                      <pre>{selectedDocument.file_content}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 케이스 상세 모달 */}
      {selectedCase && (
        <div className="modal-overlay" onClick={() => setSelectedCase(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 케이스 상세 정보</h3>
              <button onClick={() => setSelectedCase(null)} className="close-button">×</button>
            </div>
            <div className="modal-body">
              <div className="case-info">
                <div className="info-row">
                  <span className="info-label">케이스 ID:</span>
                  <span className="info-value">
                    <code className="case-id">{selectedCase.case_id}</code>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">상태:</span>
                  <span className="info-value">
                    <span className={`case-status ${selectedCase.status}`}>
                      {selectedCase.status === 'pending' ? '⏳ 대기중' : 
                       selectedCase.status === 'completed' ? '✅ 완료' : 
                       selectedCase.status === 'failed' ? '❌ 실패' : selectedCase.status}
                    </span>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">생성 시간:</span>
                  <span className="info-value">{formatTimestamp(selectedCase.created_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">문서 수:</span>
                  <span className="info-value">{selectedCase.documents?.length || 0}개</span>
                </div>
                {selectedCase.steps && selectedCase.steps.length > 0 && (
                  <div className="info-row">
                    <span className="info-label">진행 단계:</span>
                    <div className="steps-list">
                      {selectedCase.steps.map((step) => (
                        <div key={step.id} className="step-item">
                          <span className="step-number">{step.step_number}.</span>
                          <span className="step-name">{step.step_name}</span>
                          <span className={`step-status ${step.status}`}>
                            {step.status === 'completed' ? '✅' : 
                             step.status === 'failed' ? '❌' : '⏳'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
