import express from 'express';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import { createServer } from 'http';
import '@/config/dotenv';
import '@/config/db';
import env from '@/config/env';
import passport from '@/config/passport';
import auth from '@/routes/auth';
import users from '@/routes/users';
import funds from '@/routes/funds';
import social from '@/routes/social';
import assessments from '@/routes/assessments';
import videos from '@/routes/videos';
import clicks from '@/routes/clicks';
import notifications from '@/routes/notifications';
import apikey from '@/routes/apikey';
import APIUsage from '@/routes/apiUsage'
import openaiProxy from '@/routes/openai';

import { apiKeyMiddleware } from './middleware/apikey';
import { errorHandler } from '@/middleware/error';
import { shutdownGracefully } from '@/utils/gracefulShutdown';
const app = express();
const server = createServer(app);

const logger = morgan('tiny');
app.use(logger);

app.use(express.json());
app.use(cors());
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: env.DB_URI }),
    cookie: { maxAge: 15 * 24 * 60 * 60 * 1000 },
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/v1/auth', auth);
app.use('/api/v1/clicks', clicks);
app.use('/api/v1/users', users);
app.use('/api/v1/funds', funds);
app.use('/api/v1/social', social);
app.use('/api/v1/assessments', assessments);
app.use('/api/v1/notifications', notifications);
app.use('/api/v1/videos', videos);
app.use('/api/v1/apiusage', APIUsage)
app.use('/api/v1/apikey', apikey);
app.use('/api/v1/proxy/openai', apiKeyMiddleware, openaiProxy);
app.use(errorHandler);

app.get('/healthz', (_, res) => {
  res.send('I am healthy!');
});

const port = process.env.PORT || 8000;

server.listen(port, async () => {
  console.log(`Express app is listening on port ${port}`);
});

process.on('SIGINT', (signal) => shutdownGracefully(signal, server));
process.on('SIGTERM', (signal) => shutdownGracefully(signal, server));
