import { Server } from 'http';
import mongoose from 'mongoose';

export async function shutdownGracefully(signal: string, server: Server) {
  console.log(`Received signal to terminate: ${signal}`);

  try {
    await mongoose.disconnect();
    console.log('Mongoose connection closed');
  } catch (error) {
    console.log('Error closing mongoose connection', error);
  }

  server.close((err) => {
    if (err) {
      console.log('Error closing server', err);
      process.exit(1);
    }
    console.log('Server closed');
    process.exit(0);
  });

  const shutdownTimeout = 5000; // 5 seconds

  // Force shutdown after timeout
  setTimeout(() => {
    console.error(
      `Could not close connections in time, forcefully shutting down`,
    );
    process.exit(1);
  }, shutdownTimeout);
}
