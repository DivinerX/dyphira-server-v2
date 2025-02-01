import express from 'express';
import { createQuestion, findQuestions } from '@/controllers/questions';
import { isAdmin } from '@/middleware/isAdmin';
import { auth } from '@/middleware/auth';

const router = express.Router();

router.get('/', auth, isAdmin, findQuestions);
router.post('/', auth, isAdmin, createQuestion);

export default router;
