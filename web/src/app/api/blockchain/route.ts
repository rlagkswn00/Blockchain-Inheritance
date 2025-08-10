import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Anvil 블록체인 상태 확인
    const response = await fetch('http://localhost:8545', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error('블록체인 연결 실패');
    }

    const data = await response.json();
    
    // 컨트랙트 배포 여부 확인
    const contractResponse = await fetch('http://localhost:8545', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: ['0x5FbDB2315678afecb367f032d93F642f64180aa3', 'latest'],
        id: 2,
      }),
    });

    const contractData = await contractResponse.json();
    const isDeployed = contractData.result !== '0x';
    
    return NextResponse.json({
      success: true,
      blockchain: {
        connected: true,
        blockNumber: data.result,
        network: 'Anvil Local',
        chainId: 31337,
      },
      contract: {
        address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        deployed: isDeployed,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      blockchain: {
        connected: false,
        blockNumber: null,
        network: 'Unknown',
        chainId: null,
      },
      contract: {
        address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        deployed: false,
      },
    }, { status: 500 });
  }
}
