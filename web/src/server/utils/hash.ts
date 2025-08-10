import { keccak256, encodePacked } from 'viem';

/**
 * 스마트 컨트랙트와 동일한 방식으로 문서 해시 생성
 * @param documentContent 문서 내용
 * @returns 해시값 (0x 접두사 포함)
 */
export function generateDocumentHash(documentContent: string): string {
  return keccak256(encodePacked(['string'], [documentContent]));
}

/**
 * 파일 내용을 읽어서 해시 생성
 * @param fileContent 파일 내용
 * @returns 해시값 (0x 접두사 포함)
 */
export function generateFileHash(fileContent: string): string {
  return generateDocumentHash(fileContent);
}
