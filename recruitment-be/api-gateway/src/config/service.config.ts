export const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  job: process.env.JOB_SERVICE_URL || 'http://localhost:4002',
  application: process.env.APPLICATION_SERVICE_URL || 'http://localhost:4003',
  user: process.env.USER_SERVICE_URL || 'http://localhost:4004',
};
