import express from 'express';
import userRouter from './modules/user/user.route';
import errorMiddleware from './middlewares/error.middleware';

const app = express();

app.use(express.json());

app.use('/user', userRouter);

app.use(errorMiddleware);

export default app;
