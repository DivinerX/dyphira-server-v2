import express from 'express';
import {
  findSections,
  createSection,
  findSectionQuestions,
} from '@/controllers/sections';
import { auth } from '@/middleware/auth';
import { isAdmin } from '@/middleware/isAdmin';
import { validateObjectId } from '@/middleware/validateId';

const router = express.Router();
router.get('/', auth, findSections);
router.post('/', auth, isAdmin, createSection);
router.get(
  '/:sectionId/questions',
  validateObjectId('sectionId'),
  auth,
  findSectionQuestions,
);

export default router;
