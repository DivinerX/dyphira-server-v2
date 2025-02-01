import express from 'express';
import { createAnswer, updateAnswer } from '@/controllers/answers';
import { auth } from '@/middleware/auth';
import { validateObjectId } from '@/middleware/validateId';

const router = express.Router();

router.post('/', auth, createAnswer);
router.patch('/:answerId', validateObjectId('answerId'), auth, updateAnswer);

export default router;
