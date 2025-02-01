import {
  Answer,
  validateCreateAnswer,
  validateUpdateAnswer,
} from '@/models/answer';
import type { RequestHandler } from 'express';
import type { JwtPayload } from 'jsonwebtoken';

export const createAnswer: RequestHandler = async (req, res, next) => {
  const userId = (req.user as JwtPayload)._id;
  // Ensure userId is appended last to prevent users from sending a userId in the request body
  // that could override the authenticated userId, allowing them to create an answer for a different user.
  const { error } = validateCreateAnswer({ ...req.body, userId });

  if (error) return next(error);

  try {
    const {
      assessmentId,
      sectionId,
      questionId,
      text,
      videoStartTimestamp,
      videoEndTimestamp,
    } = req.body;
    const newAnswer = new Answer({
      userId,
      assessmentId,
      sectionId,
      questionId,
      text,
      videoStartTimestamp,
      videoEndTimestamp,
    });
    await newAnswer.save();
    return res.status(201).json(newAnswer);
  } catch (error) {
    return next(error);
  }
};

export const updateAnswer: RequestHandler = async (req, res, next) => {
  const userId = (req.user as JwtPayload)._id;
  const { error } = validateUpdateAnswer({ ...req.body, userId });

  if (error) return next(error);

  try {
    const { text, videoEndTimestamp } = req.body;

    const updatedAnswer = await Answer.findOneAndUpdate(
      { _id: req.params.answerId },
      { ...(text && { $push: { text } }), videoEndTimestamp },
      { new: true },
    );

    return res.status(200).json(updatedAnswer);
  } catch (error) {
    return next(error);
  }
};
