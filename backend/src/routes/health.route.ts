import { Router, Request, Response } from 'express';

export const healthRouter = Router();

/**
 * Health Check Endpoint
 * GET /health
 */
healthRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'clipto-backend',
  });
});
