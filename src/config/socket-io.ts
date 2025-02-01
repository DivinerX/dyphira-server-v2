import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

let io: SocketIOServer;

export const configureSocketIO = (server: http.Server): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Adjust the CORS settings as needed
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinNotificationRoom', (userId: string) => {
      socket.join(userId);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });

    // Add more socket event listeners here
  });

  return io;
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
