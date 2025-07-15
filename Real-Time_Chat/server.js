const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/messages', require('./routes/messages'));

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// MongoDB Connection
const connectDB = async () => {
  try {
    // Use ChatDB/realchat as database name
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realchat', {
      dbName: 'ChatDB',
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection errors after initial connection
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
      setTimeout(connectDB, 5000);
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Initialize database connection
connectDB();

// Socket.IO Connection Handler
io.on('connection', async (socket) => {
  let currentUser = null;

  // Authenticate user
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      currentUser = await User.findById(decoded.userId);
      if (currentUser) {
        socket.userId = currentUser._id;
        await currentUser.updateStatus('online');
        socket.join(`user_${currentUser._id}`);

        // Join all rooms the user is a member of
        const rooms = await Room.find({ members: currentUser._id });
        rooms.forEach(room => socket.join(`room_${room._id}`));

        // Notify contacts about online status
        if (currentUser.contacts && currentUser.contacts.length > 0) {
          io.to(currentUser.contacts.map(id => `user_${id}`)).emit('userStatus', {
            userId: currentUser._id,
            status: 'online'
          });
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  });
  console.log('New client connected');

  // Join Room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // Leave Room
  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    console.log(`User left room: ${roomId}`);
  });

  // Handle Messages
  socket.on('sendMessage', async (data) => {
    if (!currentUser) return;

    const { roomId, content } = data;
    try {
      const room = await Room.findById(roomId);
      if (!room || !room.members.includes(currentUser._id)) return;

      const message = new Message({
        content,
        sender: currentUser._id,
        room: roomId,
        messageType: 'room'
      });
      await message.save();

      // Update room's last message
      room.lastMessage = message._id;
      await room.save();

      // Emit message to room
      await message.populate('sender', 'username avatar');
      io.to(`room_${roomId}`).emit('message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle Private Messages
  socket.on('privateMessage', async (data) => {
    if (!currentUser) return;

    const { toUserId, content } = data;
    try {
      const toUser = await User.findById(toUserId);
      if (!toUser) return;

      const message = new Message({
        content,
        sender: currentUser._id,
        receiver: toUserId,
        messageType: 'private'
      });
      await message.save();

      // Update private chat for both users
      const senderChat = await currentUser.getOrCreatePrivateChat(toUserId);
      const receiverChat = await toUser.getOrCreatePrivateChat(currentUser._id);
      
      senderChat.lastMessage = message._id;
      receiverChat.lastMessage = message._id;
      await currentUser.save();
      await toUser.save();

      // Increment unread count for receiver
      await toUser.updateUnreadCount(currentUser._id, true);

      // Reset unread count for sender
      await currentUser.updateUnreadCount(toUserId, false);

      // Emit message to both users
      await message.populate('sender', 'username avatar');
      io.to(`user_${toUserId}`).to(`user_${currentUser._id}`).emit('privateMessage', message);
      io.to(`user_${currentUser._id}`).emit('unreadCount', { userId: toUserId, count: 0 });
    } catch (error) {
      console.error('Error handling private message:', error);
      socket.emit('error', { message: 'Failed to send private message' });
    }
  });

  socket.on('disconnect', async () => {
    if (currentUser) {
      await currentUser.updateStatus('offline');
      
      // Notify contacts about offline status
      if (currentUser.contacts && currentUser.contacts.length > 0) {
        io.to(currentUser.contacts.map(id => `user_${id}`)).emit('userStatus', {
          userId: currentUser._id,
          status: 'offline'
        });
      }
    }
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});