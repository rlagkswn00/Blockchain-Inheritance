import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, decodeFunctionResult } from 'viem';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

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
  },
  {
    "inputs": [],
    "name": "getTotalDocuments",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentHash = searchParams.get('hash');

    if (!documentHash) {
      return NextResponse.json(
        { success: false, error: 'Document hash is required' },
        { status: 400 }
      );
    }

    // 먼저 총 문서 수를 가져옵니다
    const totalResponse = await fetch('http://localhost:8545', {
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

    const totalResult = await totalResponse.json();
    if (totalResult.error) {
      console.error('Error getting total documents:', totalResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to get total documents' },
        { status: 500 }
      );
    }

    const totalDocuments = parseInt(totalResult.result, 16);

    // 모든 문서를 순회하면서 해당 해시를 찾습니다
    for (let i = 0; i < totalDocuments; i++) {
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

      if (result.error) {
        console.error(`Error getting document ${i}:`, result.error);
        continue;
      }

      if (result.result && result.result !== '0x') {
        try {
          const decoded = decodeFunctionResult({
            abi: CONTRACT_ABI,
            functionName: 'getDocumentByIndex',
            data: result.result as `0x${string}`
          });

          const docHash = decoded[0] as string;
          
          if (docHash.toLowerCase() === documentHash.toLowerCase()) {
            const documentData = {
              documentHash: docHash,
              owner: decoded[1] as string,
              timestamp: Number(decoded[2]),
              isVerified: decoded[3] as boolean,
              documentType: decoded[4] as string,
              encryptedData: decoded[5] as string,
              bankPublicKey: decoded[6] as string
            };

            return NextResponse.json({
              success: true,
              data: documentData
            });
          }
        } catch (decodeError) {
          console.error(`Error decoding document ${i}:`, decodeError);
          // 해시만 직접 추출해보기
          try {
            const docHashHex = result.result.slice(2 + 64, 2 + 64 + 64);
            const docHash = `0x${docHashHex}`;
            
            if (docHash.toLowerCase() === documentHash.toLowerCase()) {
              const documentData = {
                documentHash: docHash,
                owner: '0x0000000000000000000000000000000000000000',
                timestamp: 0,
                isVerified: false,
                documentType: '',
                encryptedData: '0x',
                bankPublicKey: '0x'
              };

              return NextResponse.json({
                success: true,
                data: documentData
              });
            }
          } catch (extractError) {
            console.error(`Error extracting hash from document ${i}:`, extractError);
            continue;
          }
        }
      }
    }

    return NextResponse.json(
      { success: false, error: 'Document not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

