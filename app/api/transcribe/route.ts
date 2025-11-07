import { NextRequest, NextResponse } from 'next/server';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export async function POST(request: NextRequest) {
  console.log('📥 [Transcribe API] Request received');

  if (!DEEPGRAM_API_KEY) {
    console.error('❌ [Transcribe API] DEEPGRAM_API_KEY not configured');
    return NextResponse.json(
      { success: false, error: 'Deepgram API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Get audio file from form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      console.error('❌ [Transcribe API] No audio file provided');
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('📁 [Transcribe API] Audio file received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    // Convert file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('📤 [Transcribe API] Sending to Deepgram...');

    // Call Deepgram API
    const deepgramUrl = 'https://api.deepgram.com/v1/listen';
    const params = new URLSearchParams({
      model: 'nova-2',
      language: 'pt-BR',
      smart_format: 'true',
      punctuate: 'true',
      diarize: 'false'
    });

    const deepgramResponse = await fetch(`${deepgramUrl}?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': audioFile.type || 'audio/webm',
      },
      body: buffer,
    });

    console.log('📥 [Transcribe API] Deepgram response status:', deepgramResponse.status);

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error('❌ [Transcribe API] Deepgram error:', errorText);
      throw new Error(`Deepgram API error: ${deepgramResponse.status} - ${errorText}`);
    }

    const result = await deepgramResponse.json();
    console.log('✅ [Transcribe API] Deepgram result:', JSON.stringify(result, null, 2));

    // Extract transcript
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;

    if (!transcript || transcript.trim().length === 0) {
      console.warn('⚠️ [Transcribe API] No transcript found in response');
      return NextResponse.json({
        success: false,
        error: 'No speech detected in audio'
      });
    }

    console.log('📝 [Transcribe API] Transcript extracted:', transcript);

    return NextResponse.json({
      success: true,
      transcript: transcript.trim(),
      confidence: result.results?.channels?.[0]?.alternatives?.[0]?.confidence,
      words: result.results?.channels?.[0]?.alternatives?.[0]?.words?.length || 0
    });

  } catch (error) {
    console.error('❌ [Transcribe API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
