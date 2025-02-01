import { Question } from '@/models/question';
import { Section, validateSection } from '@/models/section';
import type { RequestHandler } from 'express';

export const findSections: RequestHandler = async (_req, res, next) => {
  try {
    const sections = await Section.find().select('-__v');
    return res.status(200).json(sections);
  } catch (error) {
    return next(error);
  }
};

export const createSection: RequestHandler = async (req, res, next) => {
  const { error } = validateSection(req.body);

  if (error) return next(error);

  try {
    const { title, description, order } = req.body;
    const newSection = new Section({ title, description, order });
    await newSection.save();
    return res.status(201).json(newSection);
  } catch (error) {
    return next(error);
  }
};

export const findSectionQuestions: RequestHandler = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const questions = await Question.find({ sectionId }).sort('order');

    return res.status(200).json(questions);
  } catch (error) {
    return next(error);
  }
};
