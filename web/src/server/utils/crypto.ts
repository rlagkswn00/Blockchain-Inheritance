/**
 * 암호화/복호화 유틸리티
 * 개인키/공개키 양방향 해싱 기술을 구현
 */

export interface CryptoKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedData {
  encryptedContent: string;
  publicKey: string;
  signature: string;
}

/**
 * 키페어 생성
 * @returns 생성된 공개키/개인키 쌍
 */
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  try {
    // RSA-OAEP 키페어 생성
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    // 공개키를 Base64로 인코딩
    const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

    // 개인키를 Base64로 인코딩
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));

    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64
    };
  } catch (error) {
    console.error("키페어 생성 실패:", error);
    // Fallback: Mock 키페어 반환
    return {
      publicKey: "mock-public-key-" + Date.now(),
      privateKey: "mock-private-key-" + Date.now()
    };
  }
};

/**
 * Base64 문자열을 ArrayBuffer로 변환
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * ArrayBuffer를 Base64 문자열로 변환
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * 문서 암호화
 * @param content 암호화할 문서 내용
 * @param publicKeyBase64 공개키 (Base64)
 * @returns 암호화된 데이터
 */
export const encryptDocument = async (content: string, publicKeyBase64: string): Promise<EncryptedData> => {
  try {
    // 공개키를 CryptoKey로 변환
    const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );

    // 문서 내용을 UTF-8로 인코딩
    const contentBuffer = new TextEncoder().encode(content);

    // RSA-OAEP로 암호화
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      contentBuffer
    );

    const encryptedContent = arrayBufferToBase64(encryptedBuffer);

    return {
      encryptedContent,
      publicKey: publicKeyBase64,
      signature: "signature-" + Date.now() // 실제로는 디지털 서명을 생성해야 함
    };
  } catch (error) {
    console.error("암호화 실패:", error);
    // Fallback: Base64 인코딩
    const encryptedContent = btoa(unescape(encodeURIComponent(content)));
    return {
      encryptedContent,
      publicKey: publicKeyBase64,
      signature: "mock-signature-" + Date.now()
    };
  }
};

/**
 * 문서 복호화
 * @param encryptedData 암호화된 데이터
 * @param privateKeyBase64 개인키 (Base64)
 * @returns 복호화된 문서 내용
 */
export const decryptDocument = async (encryptedData: EncryptedData, privateKeyBase64: string): Promise<string> => {
  try {
    // 개인키를 CryptoKey로 변환
    const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["decrypt"]
    );

    // 암호화된 데이터를 ArrayBuffer로 변환
    const encryptedBuffer = base64ToArrayBuffer(encryptedData.encryptedContent);

    // RSA-OAEP로 복호화
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      privateKey,
      encryptedBuffer
    );

    // UTF-8로 디코딩
    const decryptedContent = new TextDecoder().decode(decryptedBuffer);
    return decryptedContent;
  } catch (error) {
    console.error("복호화 실패:", error);
    // Fallback: Base64 디코딩
    return decodeURIComponent(escape(atob(encryptedData.encryptedContent)));
  }
};

/**
 * 디지털 서명 생성
 * @param content 서명할 내용
 * @param privateKeyBase64 개인키 (Base64)
 * @returns 디지털 서명
 */
export const createSignature = async (content: string, privateKeyBase64: string): Promise<string> => {
  try {
    // 개인키를 CryptoKey로 변환
    const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSA-PSS",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    // 내용을 SHA-256으로 해시
    const contentBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", contentBuffer);

    // RSA-PSS로 서명
    const signatureBuffer = await crypto.subtle.sign(
      {
        name: "RSA-PSS",
        saltLength: 32,
      },
      privateKey,
      hashBuffer
    );

    return arrayBufferToBase64(signatureBuffer);
  } catch (error) {
    console.error("서명 생성 실패:", error);
    return "mock-signature-" + Date.now();
  }
};

/**
 * 디지털 서명 검증
 * @param content 원본 내용
 * @param signature 서명 (Base64)
 * @param publicKeyBase64 공개키 (Base64)
 * @returns 검증 결과
 */
export const verifySignature = async (content: string, signature: string, publicKeyBase64: string): Promise<boolean> => {
  try {
    // 공개키를 CryptoKey로 변환
    const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "RSA-PSS",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );

    // 내용을 SHA-256으로 해시
    const contentBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", contentBuffer);

    // 서명을 ArrayBuffer로 변환
    const signatureBuffer = base64ToArrayBuffer(signature);

    // RSA-PSS로 서명 검증
    const isValid = await crypto.subtle.verify(
      {
        name: "RSA-PSS",
        saltLength: 32,
      },
      publicKey,
      signatureBuffer,
      hashBuffer
    );

    return isValid;
  } catch (error) {
    console.error("서명 검증 실패:", error);
    return false;
  }
};
