import type { RequestHandler } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import env from '@/config/env';

export const generateVideoURL: RequestHandler = async (req, res) => {
  const filename = req.params.filename as string;
  const expiresIn = 60 * 60 * 24; // 1 day

  const expiry = Math.floor(Date.now() / 1000) + expiresIn;

  const signature = crypto
    .createHmac('sha256', env.SECRET_KEY)
    .update(`${filename}${expiry}`)
    .digest('hex');

  const signedUrl = `${env.API_BASE_URL}api/v1/videos/${filename}?expiry=${expiry}&signature=${signature}`;

  return res.status(200).json({ url: signedUrl });
};

// eslint-disable-next-line
// @ts-ignore
export const findVideo: RequestHandler = async (req, res) => {
  const filename = req.params.filename as string;
  const { expiry, signature } = req.query;

  if (!expiry || !signature) {
    return res.status(403).send('Forbidden');
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (currentTimestamp > parseInt(expiry as string, 10)) {
    return res.status(403).send('Link expired');
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.SECRET_KEY)
    .update(`${filename}${expiry}`)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(403).send('Invalid signature');
  }

  const filePath = path.join('./data/uploads', filename);
  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).send('File not found');
      }
      return res.status(500).send(err.message);
    }

    const range = req.headers.range;
    if (!range) {
      return res.status(416).send('Requires Range header');
    }

    const positions = range.replace(/bytes=/, '').split('-');
    const start = parseInt(positions[0] as string, 10);
    const total = stats.size;
    const end = positions[1] ? parseInt(positions[1], 10) : total - 1;
    const chunksize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    });

    const stream = fs.createReadStream(filePath, { start, end });
    return stream.pipe(res);
  });
};
