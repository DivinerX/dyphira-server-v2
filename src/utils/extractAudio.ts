import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';

ffmpeg.setFfmpegPath(ffmpegPath);

export async function extractAudio(
  inputPath: string,
  outputPath: string,
): Promise<string> {
  try {
    // Verify input file exists
    await fs.access(inputPath);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions('-vn')
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .save(outputPath)
        .on('end', () => resolve('Audio extraction complete'))
        .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .on('start', (commandLine) =>
          console.log('FFmpeg process started:', commandLine),
        );
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Audio extraction failed: ${error.message}`);
    } else {
      throw new Error('Audio extraction failed due to an unknown error');
    }
  }
}
