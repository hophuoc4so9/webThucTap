import express from 'express';
import jobRouter from './modules/job/job.route';
import errorMiddleware from './middlewares/error.middleware';

const app = express();

app.use(express.json());

app.use('/job', jobRouter);

app.use(errorMiddleware);

export default app;
