import { Router } from 'express';
import { proxyAuth } from './auth.proxy';

const router = Router();
router.post('/login', proxyAuth);

export default router;
