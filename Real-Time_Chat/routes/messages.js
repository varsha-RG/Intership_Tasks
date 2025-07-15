const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get room messages with pagination and chat history
router.get('/room/:roomId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!room.members.includes(req.user._id)) {
      return res.status(403).json({ error: 'Not a member of this room' });
    }
    
    const messages = await Message.find({
      room: req.params.roomId,
      messageType: 'room'
    })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Message.countDocuments({
      room: req.params.roomId,
      messageType: 'room'
    });
    
    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get private messages between two users with chat history
router.get('/private/:userId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const messages = await Message.find({
      messageType: 'private',
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Message.countDocuments({
      messageType: 'private',
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    });
    
    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.post('/read', auth, async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date()
          }
        }
      }
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete message (sender only)
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      sender: req.user._id
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }
    
    // If this was the last message in a room, update the room's lastMessage
    if (message.room) {
      const room = await Room.findById(message.room);
      if (room && room.lastMessage.equals(message._id)) {
        const newLastMessage = await Message.findOne({
          room: room._id,
          _id: { $ne: message._id }
        }).sort({ createdAt: -1 });
        
        room.lastMessage = newLastMessage ? newLastMessage._id : null;
        await room.save();
      }
    }
    
    await message.remove();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;