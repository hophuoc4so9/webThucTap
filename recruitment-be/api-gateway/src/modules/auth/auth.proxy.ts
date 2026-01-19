import axios from 'axios';
import { services } from '../../config/service.config';

import { Request, Response } from 'express';

export async function proxyAuth(req: Request, res: Response) {
  // Forward request tới auth service
  const response = await axios.post(`${services.auth}/login`, req.body);
  res.json(response.data);
}
