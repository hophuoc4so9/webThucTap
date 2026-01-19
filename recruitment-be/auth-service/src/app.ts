import express from 'express';
import authRouter from './modules/auth/auth.route';
import errorMiddleware from './middlewares/error.middleware';

const app = express();

app.use(express.json());

app.use('/auth', authRouter);

app.use(errorMiddleware);

export default app;
