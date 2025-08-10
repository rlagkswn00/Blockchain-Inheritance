import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;
    const uploadDir = path.join(process.cwd(), 'web', 'uploads');
    
    if (!existsSync(uploadDir)) {
      return NextResponse.json({ error: 'Upload directory not found' }, { status: 404 });
    }

    // 해시로 파일 찾기
    const files = await readdir(uploadDir);
    const targetFile = files.find(file => file.startsWith(hash + '_'));
    
    if (!targetFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const filePath = path.join(uploadDir, targetFile);
    const fileStats = await stat(filePath);
    const fileContent = await readFile(filePath, 'utf-8');

    return NextResponse.json({
      success: true,
      fileName: targetFile,
      filePath: `/uploads/${targetFile}`,
      size: fileStats.size,
      content: fileContent,
      lastModified: fileStats.mtime.toISOString()
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
