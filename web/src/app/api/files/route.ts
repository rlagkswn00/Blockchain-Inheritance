import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const uploadDir = path.join(process.cwd(), 'web', 'uploads');
    
    if (!existsSync(uploadDir)) {
      return NextResponse.json([]);
    }

    const files = await readdir(uploadDir);
    const fileList = [];

    for (const file of files) {
      if (file.endsWith('.gitkeep')) continue; // .gitkeep 파일 제외
      
      const filePath = path.join(uploadDir, file);
      const fileStats = await stat(filePath);
      
      // 파일명에서 해시 추출 (0xhash_filename 형식)
      const hashMatch = file.match(/^(0x[a-f0-9]+)_(.+)$/);
      if (hashMatch) {
        const [, hash, originalName] = hashMatch;
        fileList.push({
          fileName: file,
          originalName,
          hash,
          size: fileStats.size,
          lastModified: fileStats.mtime.toISOString(),
          filePath: `/uploads/${file}`
        });
      }
    }

    return NextResponse.json(fileList);
  } catch (error) {
    console.error('Error reading files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
