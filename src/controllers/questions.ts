import { Question, validateQuestion } from '@/models/question';
import type { RequestHandler } from 'express';

export const findQuestions: RequestHandler = async (_req, res, next) => {
  try {
    const questions = await Question.find().sort('order');
    return res.status(200).json(questions);
  } catch (error) {
    return next(error);
  }
};

export const createQuestion: RequestHandler = async (req, res, next) => {
  const { error } = validateQuestion(req.body);

  if (error) return next(error);

  try {
    const { sectionId, text, responseType, order } = req.body;
    const newQuestion = new Question({ sectionId, text, responseType, order });
    await newQuestion.save();
    return res.status(201).json(newQuestion);
  } catch (error) {
    return next(error);
  }
};
