import { Router } from 'express';
import authRoutes from '../modules/auth/auth.route';
// import các route khác

const router = Router();
router.use('/auth', authRoutes);
// router.use('/job', jobRoutes);
// router.use('/application', applicationRoutes);
// router.use('/user', userRoutes);

export default router;
