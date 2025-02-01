import mongoose from 'mongoose';
import env from './env';

mongoose
  .connect(env.DB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.log('Error connecting to MongoDB', err);
  });
