import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  message: string;
  timestamp: number;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const data: ResponseData = {
    message: 'Hello from API!',
    timestamp: Date.now(),
  };

  res.status(200).json(data);
}
