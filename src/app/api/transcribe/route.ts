import { openai } from "~/server/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the form data containing the audio file
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }
    
    // Validate file size (5 minutes max at reasonable quality ~25MB)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json({ error: 'Audio file too large. Maximum 5 minutes supported.' }, { status: 400 });
    }
    
    // More flexible file type validation - check if it's any audio type
    const isAudioFile = audioFile.type.startsWith('audio/') || 
                       audioFile.name.match(/\.(wav|mp3|m4a|ogg|webm|aac|flac)$/i);
    
    if (!isAudioFile) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload an audio file.' 
      }, { status: 400 });
    }
    
    console.log(`[Transcription] Processing audio file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`);
    
    // Get the audio data and prepare it for the OpenAI API
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type || 'audio/webm' });
    
    // Create a File object from the Blob with the original name
    const file = new File(
      [audioBlob], 
      audioFile.name || 'audio.webm', 
      { type: audioFile.type || 'audio/webm' }
    );
    
    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en", // Can be made dynamic if needed
      response_format: "text"
    });
    
    console.log(`[Transcription] Success: ${transcription.substring(0, 100)}...`);
    
    return NextResponse.json({ 
      text: transcription,
      success: true 
    });
    
  } catch (error) {
    console.error('[Transcription] Error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('audio file is too long')) {
        return NextResponse.json({ 
          error: 'Audio file is too long. Please keep recordings under 5 minutes.' 
        }, { status: 400 });
      }
      
      if (error.message.includes('Invalid file format')) {
        return NextResponse.json({ 
          error: 'Invalid audio format. Please try recording again.' 
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to transcribe audio. Please try again.' 
    }, { status: 500 });
  }
} 