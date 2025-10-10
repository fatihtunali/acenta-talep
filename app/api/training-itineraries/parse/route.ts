import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get file extension
    const fileName = file.name.toLowerCase();
    let text = '';

    if (fileName.endsWith('.txt')) {
      // Simple text file
      text = await file.text();
    } else if (fileName.endsWith('.docx')) {
      // Word document - extract text
      const buffer = await file.arrayBuffer();

      try {
        // Use mammoth to extract text from .docx
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
        text = result.value;
      } catch (error) {
        console.error('Error parsing docx:', error);
        return NextResponse.json(
          { error: 'Failed to parse Word document. Please ensure it is a valid .docx file.' },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith('.doc')) {
      // Old Word format - not easily parseable, ask user to save as .docx or copy paste
      return NextResponse.json(
        { error: 'Old .doc format is not supported. Please save as .docx or copy and paste the content.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Please use .txt or .docx files.' },
        { status: 400 }
      );
    }

    // Clean up the text (remove excessive newlines, trim whitespace)
    text = text.trim();
    text = text.replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with 2

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error parsing file:', error);
    return NextResponse.json(
      { error: 'Failed to parse file' },
      { status: 500 }
    );
  }
}
