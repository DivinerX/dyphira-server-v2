import {
  ASSESSMENTS_START_DATE,
  MAX_ASSESSMENT_DURATION,
} from '@/config/constants';
import { getSocketIO } from '@/config/socket-io';
import { Answer } from '@/models/answer';
import { Assessment, validateAssessment } from '@/models/assessment';
import { Notification } from '@/models/notification';
import { Question } from '@/models/question';
import { Section } from '@/models/section';
import { User } from '@/models/user';
import { addProcessAssessmentJob } from '@/queues/processAssessmentQueue';
import { calculateRanking } from '@/utils/calculateRanking';
import {
  addMonths,
  differenceInSeconds,
  isBefore,
  startOfMonth,
} from 'date-fns';
import type { RequestHandler } from 'express';
import type { JwtPayload } from 'jsonwebtoken';

export interface MulterS3File extends Express.Multer.File {
  location: string;
  key: string;
  bucket: string;
  etag: string;
}

export const createAssessment: RequestHandler = async (req, res, next) => {
  const userId = (req.user as JwtPayload)._id;
  // Ensure userId is appended last to avoid override by user input
  const { error } = validateAssessment({ ...req.body, userId });

  if (error) return next(error);

  try {
    const now = new Date();
    const startDate = ASSESSMENTS_START_DATE;

    const currentMonthStart = startOfMonth(now);
    const nextMonthStart = addMonths(currentMonthStart, 1);

    const nextStartDate = isBefore(startDate, now) ? nextMonthStart : startDate;

    const existingAssessment = await Assessment.findOne({
      userId,
      createdAt: { $gte: currentMonthStart },
    });

    if (existingAssessment) {
      return res.status(409).json({
        message: 'Already took an assessment this month',
        details: `A new assessment can be created after ${nextStartDate.toISOString()}`,
      });
    }

    const newAssessment = new Assessment({ userId });
    await newAssessment.save();

    return res.status(201).json({
      ...newAssessment.toObject(),
      duration: MAX_ASSESSMENT_DURATION,
    });
  } catch (error) {
    return next(error);
  }
};

export const formatDuration = (duration: number): string => {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const updateAssessment: RequestHandler = async (req, res, next) => {
  const userId = (req.user as JwtPayload)._id;
  // Ensure userId is appended last to avoid override by user input
  const { error } = validateAssessment({ ...req.body, userId });

  if (error) return next(error);

  try {
    const { status } = req.body;
    const completedAt = new Date()
    const currentAssessment = await Assessment.findById(
      req.params.assessmentId,
    );

    if (!currentAssessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    if (currentAssessment.status !== 'in-progress') {
      return res.status(403).json({
        message: 'Cannot update assessment',
        details: `Assessment is already ${currentAssessment.status}`,
      });
    }

    const timeSinceStart = differenceInSeconds(
      Date.now(),
      currentAssessment.startedAt.getTime(),
    );

    if (timeSinceStart > MAX_ASSESSMENT_DURATION) {
      return res.status(403).json({
        message: 'Assessment update time has expired',
        details: `Updates are only allowed within ${formatDuration(MAX_ASSESSMENT_DURATION)} (MM:SS) of starting the assessment`,
      });
    }

    currentAssessment.completedAt = completedAt;
    currentAssessment.status = status;

    await currentAssessment.save();

    if (currentAssessment.status === 'completed') {
      const notification = new Notification({
        userId,
        message:
          "Congratulations, you have successfully completed the assessment. You'll receive USDC in a few hours if you qualify",
        type: 'assessment-completion',
      });
      await notification.save();

      const io = getSocketIO();
      io.to(userId).emit('notification', notification);
    }

    return res.status(200).json({
      ...currentAssessment.toObject(),
      duration: MAX_ASSESSMENT_DURATION,
    });
  } catch (error) {
    return next(error);
  }
};

export const uploadAssessmentVideo: RequestHandler = async (req, res, next) => {
  const userId = (req.user as JwtPayload)._id;
  const currentMonthStart = startOfMonth(new Date());
  try {
    const assessment = await Assessment.findOneAndUpdate(
      { userId, createdAt: { $gte: currentMonthStart } },
      {
        videoUrl: (req.file as MulterS3File).location,
      },
      { new: true },
    );

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    await addProcessAssessmentJob(userId, assessment.videoUrl, assessment._id);
    return res.status(201).json(assessment);
  } catch (error) {
    return next(error);
  }
};

export const findNextAssessmentDate: RequestHandler = async (
  req,
  res,
  next,
) => {
  const userId = (req.user as JwtPayload)._id;

  try {
    const now = new Date();
    const startDate = ASSESSMENTS_START_DATE;
    const currentMonthStart = startOfMonth(now);
    const nextMonthStart = addMonths(currentMonthStart, 1);

    const existingAssessment = await Assessment.findOne({
      userId,
      createdAt: { $gte: currentMonthStart },
    });

    const nextStartDate = isBefore(startDate, now) ? nextMonthStart : startDate;

    return res.status(200).json({
      nextAssessmentDate: existingAssessment
        ? nextStartDate.toISOString()
        : currentMonthStart.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
};

export const findCompletedAssessmentsCount: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const completedAssessmentsCount = await Assessment.countDocuments({
      userId,
      status: 'completed',
    });
    res.json({ completedAssessmentsCount });
  } catch (error) {
    return next(error);
  }
};

export const findLastAssessmentCompletionDate: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const userId = (req.user as JwtPayload)._id;

    const lastAssessment = await Assessment.findOne({ userId }).sort({
      completedAt: -1,
    });

    if (!lastAssessment) {
      return res.status(404).json({ message: 'No assessments found' });
    }

    return res
      .status(200)
      .json({ lastAssessmentCompletionDate: lastAssessment.completedAt });
  } catch (error) {
    return next(error);
  }
};

export const findAssessment: RequestHandler = async (req, res) => {
  const assessment = await Assessment.findById(req.params.assessmentId);

  return res.status(200).json(assessment);
};

export const findAllAssessments: RequestHandler = async (_, res) => {
  const assessments = await Assessment.find();
  return res.status(200).json(assessments);
};

export const findAssessmentAnswers: RequestHandler = async (req, res) => {
  const answers = await Answer.find({
    assessmentId: req.params.assessmentId,
  })
    .sort({ createdAt: 1 })
    .populate('questionId');

  return res.status(200).json(answers);
};

export const findAUsersAssessment: RequestHandler = async (req, res) => {
  const userId = (req.user as JwtPayload)._id;

  const assessment = await Assessment.find({
    userId: userId,
  });
  return res.status(200).json(assessment);
};

export const findAverageScore: RequestHandler = async (_req, res) => {
  const assessments = await Assessment.find({ status: 'completed' });
  const parsedDatas = assessments.map((assessment) => calculateRanking(assessment.ranking));
  const scoreList = parsedDatas.map((parsedData) => parsedData.parsedData);
  const accScoreList = scoreList.reduce((acc, curr) => {
    return {
      IQ: acc.IQ + getScore(curr, "IQ"),
      evangelism: acc.evangelism + getScore(curr, "Evangelism"),
      determination: acc.determination + getScore(curr, "Determination"),
      effectiveness: acc.effectiveness + getScore(curr, "Effectiveness"),
      vision: acc.vision + getScore(curr, "Vision"),
    };
  }, {
    IQ: 0,
    evangelism: 0,
    determination: 0,
    effectiveness: 0,
    vision: 0,
  });
  const users = await User.find({ role: 'user', verified: true });
  const averageSocialScore = users.reduce((acc, user) => {
    acc += user?.twitterScore || 0;
    return acc;
  }, 0) / users.length;
  const avgScoreList = Object.fromEntries(Object.entries(accScoreList).map(([key, value]) => [key, value / assessments.length]));
  return res.status(200).json({
    ...avgScoreList,
    socialCapital: averageSocialScore,
  });
};

export const findUserScore: RequestHandler = async (req, res) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const user = await User.findById(userId);
    console.log(user)
    const assessments = await Assessment.find({ status: 'completed', userId });
    const parsedDatas = assessments.map((assessment) => calculateRanking(assessment.ranking));
    const scoreList = parsedDatas.map((parsedData) => parsedData.parsedData);
    const accScoreList = scoreList.reduce((acc, curr) => {
      return {
        IQ: acc.IQ + getScore(curr, "IQ"),
        evangelism: acc.evangelism + getScore(curr, "Evangelism"),
        determination: acc.determination + getScore(curr, "Determination"),
        effectiveness: acc.effectiveness + getScore(curr, "Effectiveness"),
        vision: acc.vision + getScore(curr, "Vision"),
      };
    }, {
      IQ: 0,
      evangelism: 0,
      determination: 0,
      effectiveness: 0,
      vision: 0,
    });
    return res.status(200).json({ ...accScoreList, socialCapital: user?.twitterScore || 0 });
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Error fetching user score' });
  }
};

export const findAssessmentDetails: RequestHandler = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const assessment = await Assessment.findById(assessmentId);
    const answers = await Answer.find({ assessmentId });
    const sections = await Section.find();
    const questions = await Question.find({
      sectionId: { $in: sections.map((s) => s._id) },
    });

    res.json({
      assessment,
      answers,
      sections,
      questions,
    });
  } catch (error) {
    next(error);
  }
};

const getScore = (jsonScores: any[], scoreName: string) => {
  return jsonScores.find((score) => score.category.toLowerCase() === scoreName.toLowerCase())?.score || 0;
};
