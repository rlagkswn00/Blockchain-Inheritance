"use client";

import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { parseEther, keccak256, toHex, stringToHex, encodeFunctionData, decodeFunctionResult } from 'viem';

/**
 * 스마트 컨트랙트 ABI
 */
const CONTRACT_ABI = [
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
    "inputs": [],
    "name": "getTotalDocuments",
    "outputs": [{"type": "uint256"}],
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
    "inputs": [],
    "name": "getTotalDocuments",
    "outputs": [{"type": "uint256"}],
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

// 스마트 컨트랙트 주소 (Anvil 로컬 체인)
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

interface BlockchainDocument {
  documentHash: string;
  owner: string;
  timestamp: bigint;
  isVerified: boolean;
  documentType: string;
  encryptedData: string;
  bankPublicKey: string;
}

interface BlockchainStats {
  totalDocuments: number;
  verifiedDocuments: number;
  totalOwners: number;
  latestDocument?: BlockchainDocument;
}

export default function BlockchainViewer() {
  const [documents, setDocuments] = useState<BlockchainDocument[]>([]);
  const [stats, setStats] = useState<BlockchainStats>({
    totalDocuments: 0,
    verifiedDocuments: 0,
    totalOwners: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<BlockchainDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'pending'>('all');

  const { address, isConnected } = useAccount();

  // 총 문서 수 조회
  const { data: totalDocuments, refetch: refetchTotal } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getTotalDocuments',
  });

  // 블록체인 데이터 로드
  const loadBlockchainData = async () => {
    try {
      setIsLoading(true);
      
      if (!totalDocuments || totalDocuments === BigInt(0)) {
        setDocuments([]);
        setStats({
          totalDocuments: 0,
          verifiedDocuments: 0,
          totalOwners: 0
        });
        return;
      }

      const docs: BlockchainDocument[] = [];
      const owners = new Set<string>();
      let verifiedCount = 0;

      // 각 문서 해시를 조회하여 문서 정보 가져오기
      const documentHashes = await getAllDocumentHashes();
      
      for (const hash of documentHashes) {
        try {
          const doc = await getDocumentByHash(hash);
          if (doc) {
            docs.push(doc);
            owners.add(doc.owner);
            if (doc.isVerified) verifiedCount++;
          }
        } catch (error) {
          console.error(`Error loading document ${hash}:`, error);
        }
      }

      setDocuments(docs);
      setStats({
        totalDocuments: docs.length,
        verifiedDocuments: verifiedCount,
        totalOwners: owners.size,
        latestDocument: docs.length > 0 ? docs[docs.length - 1] : undefined
      });
    } catch (error) {
      console.error('Error loading blockchain data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 모든 문서 해시 가져오기
  const getAllDocumentHashes = async (): Promise<string[]> => {
    try {
      // getDocumentByIndex를 사용하여 모든 문서를 순회
      const hashes: string[] = [];
      const totalDocs = Number(totalDocuments || 0);
      
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
              
              hashes.push(decoded[0] as string);
            } catch (decodeError) {
              // bytes 타입 디코딩 문제를 피하기 위해 해시만 추출
              // 첫 번째 bytes32는 32바이트(64자) + 0x 접두사 = 66자
              // 하지만 실제로는 첫 번째 bytes32가 32바이트 오프셋을 가짐
              const docHashHex = result.result.slice(2 + 64, 2 + 64 + 64); // 첫 번째 bytes32 (해시)만 추출
              const docHash = `0x${docHashHex}`;
              
              console.log(`문서 ${i} 해시 (직접 추출):`, docHash);
              hashes.push(docHash);
            }
          }
        } catch (error) {
          console.log(`Error getting document at index ${i}:`, error);
          break; // 더 이상 문서가 없으면 중단
        }
      }
      
      console.log('Found document hashes from getDocumentByIndex:', hashes);
      return hashes;
    } catch (error) {
      console.error('Error getting document hashes:', error);
      return [];
    }
  };

  // 해시로 문서 조회 (API 사용)
  const getDocumentByHash = async (hash: string): Promise<BlockchainDocument | null> => {
    try {
      const response = await fetch(`/api/blockchain/document?hash=${hash}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        return {
          documentHash: result.data.documentHash,
          owner: result.data.owner,
          timestamp: BigInt(result.data.timestamp),
          isVerified: result.data.isVerified,
          documentType: result.data.documentType,
          encryptedData: result.data.encryptedData,
          bankPublicKey: result.data.bankPublicKey
        };
      }
    } catch (error) {
      console.error('Error reading document by hash:', error);
    }
    return null;
  };

  // 검색 및 필터링된 문서들
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.documentHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'verified' && doc.isVerified) ||
                         (filterType === 'pending' && !doc.isVerified);
    
    return matchesSearch && matchesFilter;
  });

  // 문서 선택
  const handleDocumentSelect = (doc: BlockchainDocument) => {
    setSelectedDocument(doc);
  };

  // 시간 포맷팅
  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString('ko-KR');
  };

  // 주소 포맷팅
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 해시 포맷팅
  const formatHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  // 데이터 새로고침
  const handleRefresh = () => {
    loadBlockchainData();
  };

  useEffect(() => {
    loadBlockchainData();
  }, [totalDocuments]);

  return (
    <div className="blockchain-viewer">
      <div className="blockchain-header">
        <h1>⛓️ 블록체인 뷰어</h1>
        <p>블록체인에 기록된 모든 문서 해시값과 데이터를 확인할 수 있습니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>총 문서 수</h3>
          <div className="stat-content">
            <span className="stat-value">{stats.totalDocuments}</span>
            <span className="stat-label">개</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>검증된 문서</h3>
          <div className="stat-content">
            <span className="stat-value">{stats.verifiedDocuments}</span>
            <span className="stat-label">개</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>총 소유자</h3>
          <div className="stat-content">
            <span className="stat-value">{stats.totalOwners}</span>
            <span className="stat-label">명</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>최신 문서</h3>
          <div className="stat-content">
            <span className="stat-value">
              {stats.latestDocument ? formatTimestamp(stats.latestDocument.timestamp) : '없음'}
            </span>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="search-filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="해시값, 주소, 문서 타입으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-button ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            전체
          </button>
          <button
            className={`filter-button ${filterType === 'verified' ? 'active' : ''}`}
            onClick={() => setFilterType('verified')}
          >
            검증됨
          </button>
          <button
            className={`filter-button ${filterType === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterType('pending')}
          >
            대기중
          </button>
        </div>
        <button onClick={handleRefresh} className="refresh-button">
          🔄 새로고침
        </button>
      </div>

      {/* 문서 목록 */}
      <div className="documents-section">
        <div className="section-header">
          <h2>📄 블록체인 문서 목록</h2>
          <span className="document-count">{filteredDocuments.length}개 문서</span>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <p>블록체인 데이터를 불러오는 중...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <p>표시할 문서가 없습니다.</p>
          </div>
        ) : (
          <div className="documents-table">
            <table>
              <thead>
                <tr>
                  <th>문서 해시</th>
                  <th>소유자</th>
                  <th>등록 시간</th>
                  <th>문서 타입</th>
                  <th>검증 상태</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc, index) => (
                  <tr key={index} className={selectedDocument?.documentHash === doc.documentHash ? 'selected' : ''}>
                    <td className="hash">
                      <code>{formatHash(doc.documentHash)}</code>
                    </td>
                    <td className="owner">
                      {formatAddress(doc.owner)}
                    </td>
                    <td className="timestamp">
                      {formatTimestamp(doc.timestamp)}
                    </td>
                    <td className="document-type">
                      {doc.documentType}
                    </td>
                    <td className="verification-status">
                      <span className={`status ${doc.isVerified ? 'verified' : 'pending'}`}>
                        {doc.isVerified ? '✅ 검증됨' : '⏳ 대기중'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDocumentSelect(doc)}
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

      {/* 문서 상세 정보 모달 */}
      {selectedDocument && (
        <div className="modal-overlay" onClick={() => setSelectedDocument(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 문서 상세 정보</h3>
              <button
                onClick={() => setSelectedDocument(null)}
                className="close-button"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="document-info">
                <div className="info-row">
                  <span className="info-label">문서 해시:</span>
                  <span className="info-value">{selectedDocument.documentHash}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">소유자:</span>
                  <span className="info-value">{selectedDocument.owner}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">등록 시간:</span>
                  <span className="info-value">{formatTimestamp(selectedDocument.timestamp)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">문서 타입:</span>
                  <span className="info-value">{selectedDocument.documentType}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">검증 상태:</span>
                  <span className="info-value">
                    <span className={`status ${selectedDocument.isVerified ? 'verified' : 'pending'}`}>
                      {selectedDocument.isVerified ? '✅ 검증됨' : '⏳ 대기중'}
                    </span>
                  </span>
                </div>
                {selectedDocument.encryptedData && (
                  <div className="info-row">
                    <span className="info-label">암호화된 데이터:</span>
                    <span className="info-value">{formatHash(selectedDocument.encryptedData)}</span>
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
