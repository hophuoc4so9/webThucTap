import app from './app';

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
  console.log(`Job Service running on port ${PORT}`);
});
