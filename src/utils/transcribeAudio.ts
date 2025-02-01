import fs from 'fs';
import { openai } from '@/config/openai';

export async function transcribeAudio(audioPath: string) {
  return await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
  });
}
