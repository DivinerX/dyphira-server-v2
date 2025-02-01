import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(`.env.${process.env.NODE_ENV}`),
});