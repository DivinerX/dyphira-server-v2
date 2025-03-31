import express from 'express';
import { proxyOpenAI } from '../controllers/openai';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Chat and Completions
router.post('/responses', proxyOpenAI);
router.post('/chat/completions', proxyOpenAI);
router.post('/completions', proxyOpenAI);

// Images
router.post('/images/generations', proxyOpenAI);
router.post('/images/edits', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mask', maxCount: 1 }
]), proxyOpenAI);
router.post('/images/variations', upload.single('image'), proxyOpenAI);

// Embeddings
router.post('/embeddings', proxyOpenAI);

// Audio
router.post('/audio/transcriptions', upload.single('file'), proxyOpenAI);
router.post('/audio/translations', upload.single('file'), proxyOpenAI);
router.post('/audio/speech', proxyOpenAI);

// Files
router.get('/files', proxyOpenAI);
router.post('/files', upload.single('file'), proxyOpenAI);
router.delete('/files/:file_id', proxyOpenAI);
router.get('/files/:file_id', proxyOpenAI);
router.get('/files/:file_id/content', proxyOpenAI);

// Fine-tuning
router.post('/fine-tuning/jobs', proxyOpenAI);
router.get('/fine-tuning/jobs', proxyOpenAI);
router.get('/fine-tuning/jobs/:fine_tuning_id', proxyOpenAI);
router.post('/fine-tuning/jobs/:fine_tuning_id/cancel', proxyOpenAI);
router.get('/fine-tuning/jobs/:fine_tuning_id/events', proxyOpenAI);

// Moderations
router.post('/moderations', proxyOpenAI);

// Assistants API
router.post('/assistants', proxyOpenAI);
router.get('/assistants/:assistant_id', proxyOpenAI);
router.post('/assistants/:assistant_id', proxyOpenAI);
router.delete('/assistants/:assistant_id', proxyOpenAI);
router.get('/assistants', proxyOpenAI);

export default router;
