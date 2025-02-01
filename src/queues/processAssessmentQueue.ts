import path from 'path';
import connection from '@/config/redis';
import { Worker, Queue, Job } from 'bullmq';
import { Types, startSession } from 'mongoose';
import { extractAudio } from '@/utils/extractAudio';
import { transcribeAudio } from '@/utils/transcribeAudio';
import { rankInterviewPerformance } from '@/utils/rankInterviewPerformance';
import { Assessment } from '@/models/assessment';
import { calculateRanking } from '@/utils/calculateRanking';
import { Reward } from '@/models/reward';
import { Notification } from '@/models/notification';
import { getSocketIO } from '@/config/socket-io';
import { User } from '@/models/user';
import fs from 'fs';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: "AKIAU5LH55ZKQYO7FNMR",
  secretAccessKey: "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",
  region: "eu-north-1"
});

const audioExtractionQueue = new Queue('process assessment', { connection });

export async function addProcessAssessmentJob(
  userId: string,
  filename: string,
  assessmentId: Types.ObjectId,
) {
  console.log('Processing assessment...');
  try {
    const job = await audioExtractionQueue.add('processAssessment', {
      userId,
      filename,
      assessmentId,
    });
    console.log(`Job added successfully. Job ID: ${job.id}`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
}

const worker = new Worker(
  'process assessment',
  async (job: Job) => {
    const { filename, assessmentId } = job.data;
    if (!filename) throw new Error('No video filename provided.');

    const s3Url = filename;
    console.log(s3Url.split('.com/')[1], `${path.basename(s3Url).split('.')[0]}.mp3`)
    const localVideoPath = path.join('./data/uploads', s3Url.split('.com/')[1]);
    const localAudioPath = path.join('./data/uploads', `${path.basename(s3Url).split('.')[0]}.mp3`);

    await downloadFileFromS3(s3Url, localVideoPath);
    console.log(fs.existsSync(localVideoPath))

    const audioExtractionResult = await extractAudio(localVideoPath, localAudioPath);
    if (!audioExtractionResult) throw new Error('Failed to extract audio.');

    const transcriptionResult = await transcribeAudio(localAudioPath);
    const transcript = transcriptionResult?.text;

    fs.unlink(localVideoPath, (err) => {
      if (err) throw err;
      console.log('The video file was deleted');
    }); 
    fs.unlink(localAudioPath, (err) => {
      if (err) throw err;
      console.log('The audio file was deleted');
    });

    const rankResult = await rankInterviewPerformance(transcript);

    const assessment = await Assessment.findById(assessmentId);

    if (!assessment) throw new Error('Assessment not found');

    assessment.transcript = transcript;
    assessment.audioUrl = localAudioPath;
    assessment.ranking = rankResult.choices[0]?.message?.content as string;
    assessment.score = calculateRanking(rankResult.choices[0]?.message?.content as string).avgScore

    await assessment.save();
  },
  {
    connection,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
);

worker.on('error', (err) => {
  console.log('Worker error:', err);
});

worker.on('failed', (job, error) => {
  console.log('Processing assessment failed:', job?.id, error);
});

worker.on('completed', async (job: Job) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { userId, assessmentId } = job.data;
    const assessment = await Assessment.findById(assessmentId);
    const rankingContent = assessment?.ranking;
    const user = await User.findById(userId);
    if (user!.verified === false) {
      const notification = new Notification({
        userId: userId,
        message:
          'You are not verified, please complete the verification process by clicking the twitter button.',
        type: 'user-should-be-verified',
      });

      await notification.save({ session });
      const io = getSocketIO();
      io.to(userId).emit('notification', notification);
    }
    if (rankingContent !== undefined && rankingContent !== null) {
      if (calculateRanking(rankingContent).avgScore >= 80) {
        if (user?.referredBy) {
          const newReward = new Reward({
            userId: user.referredBy,
            amount: 9,
            isClaimed: false,
            earnedAt: new Date(),
          });
          const referralReward = new Reward({
            userId: user.referredBy,
            amount: 1,
            isClaimed: false,
            earnedAt: new Date(),
            referralEarned: true,
          });
          await newReward.save({ session });
          await referralReward.save({ session });
        } else {
          const newReward = new Reward({
            userId,
            amount: 10,
            isClaimed: false,
            earnedAt: new Date(),
          });
          await newReward.save({ session });
        }

        const notification = new Notification({
          userId: userId,
          message:
            'Congratulations, you have successfully received 10USDC as a reward for the assessment',
          type: 'new-reward-available',
        });

        await notification.save({ session });
        const io = getSocketIO();
        io.to(userId).emit('notification', notification);
      }
    }
    await assessment!.save({ session });
    await session.commitTransaction();
    session.endSession();
  }
  catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error processing assessment:', error);
  }
  finally {
    console.log('Processing assessment completed:', job.data);
  }
});

const downloadFileFromS3 = async (s3Url: string, localPath: string): Promise<void> => {
  const s3Key = s3Url.split('.com/')[1];
  const bucketName = "nkx-video-87hy238h9g78f";

  const params: AWS.S3.GetObjectRequest = {
    Bucket: bucketName,
    Key: s3Key!,
  };

  console.log("localPath: ", localPath);
  const fileStream = fs.createWriteStream(localPath);
  return new Promise((resolve, reject) => {
    s3.getObject(params)
      .createReadStream()
      .pipe(fileStream)
      .on('error', reject)
      .on('close', resolve);
  });
};