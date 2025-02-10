import express from 'express';
import { upload } from '@/config/multer';
import { auth } from '@/middleware/auth';
import { validateObjectId } from '@/middleware/validateId';
import {
  createAssessment,
  updateAssessment,
  uploadAssessmentVideo,
  findNextAssessmentDate,
  findCompletedAssessmentsCount,
  findLastAssessmentCompletionDate,
  findAssessment,
  findAssessmentAnswers,
  findAssessmentDetails,
  findAllAssessments,
  findAUsersAssessment,
  findAverageScore,
  findUserScore,
} from '@/controllers/assessments';
import { isAdmin } from '@/middleware/isAdmin';
import { isAdminOrReferredFund } from '@/middleware/isAdminOrReferredFund';

const router = express.Router();

router.post('/', auth, createAssessment);
router.patch(
  '/:assessmentId',
  validateObjectId('assessmentId'),
  auth,
  updateAssessment,
);
router.post(
  '/:assessmentId/upload-video',
  auth,
  validateObjectId('assessmentId'),
  upload.single('video'),
  uploadAssessmentVideo,
);
router.get('/next-date', auth, findNextAssessmentDate);
router.get('/completed-count', auth, findCompletedAssessmentsCount);
router.get('/last-completion-date', auth, findLastAssessmentCompletionDate);
router.get('/rank-interview-performance', auth, findAUsersAssessment);
router.get('/average-score', auth, findAverageScore);
router.get('/user-score', auth, findUserScore);

router.get('/all', auth, isAdmin, findAllAssessments);

router.get(
  '/:assessmentId',
  validateObjectId('assessmentId'),
  auth,
  isAdmin,
  findAssessment,
);

router.get(
  '/:assessmentId/answers',
  validateObjectId('assessmentId'),
  auth,
  isAdmin,
  findAssessmentAnswers,
);

router.get(
  '/:assessmentId/details',
  validateObjectId('assessmentId'),
  auth,
  isAdminOrReferredFund,
  findAssessmentDetails,
);

export default router;
