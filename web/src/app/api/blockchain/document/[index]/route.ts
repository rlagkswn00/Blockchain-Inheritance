import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';

// Anvil 체인 설정
const client = createPublicClient({
  chain: foundry,
  transport: http('http://localhost:8545'),
});

// 스마트 컨트랙트 ABI
const CONTRACT_ABI = [
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

export async function GET(
  request: NextRequest,
  { params }: { params: { index: string } }
) {
  try {
    const index = parseInt(params.index);
    
    if (isNaN(index) || index < 0) {
      return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
    }

    // 컨트랙트 인스턴스 생성
    const contract = getContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      client,
    });

    // 블록체인에서 문서 정보 가져오기
    const documentData = await contract.read.getDocumentByIndex([BigInt(index)]);

    if (!documentData) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 문서 데이터 구조화
    const [documentHash, owner, timestamp, isVerified, documentType, encryptedData, bankPublicKey] = documentData;

    const document = {
      documentHash: documentHash as string,
      owner: owner as string,
      timestamp: timestamp as bigint,
      isVerified: isVerified as boolean,
      documentType: documentType as string,
      encryptedData: encryptedData as string,
      bankPublicKey: bankPublicKey as string
    };

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error('Error fetching blockchain document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
