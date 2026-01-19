import { Router } from 'express';

const router = Router();

// Example route
router.get('/', (req, res) => {
  res.json({ message: 'Job route' });
});

export default router;
