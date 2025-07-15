const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Create new room
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, type, maxMembers } = req.body;
    const room = new Room({
      name,
      description,
      type,
      creator: req.user._id,
      members: [req.user._id],
      maxMembers: maxMembers || 50
    });
    await room.save();
    // Add room to user's joinedRooms
    if (!req.user.joinedRooms.includes(room._id)) {
      req.user.joinedRooms.push(room._id);
      await req.user.save();
    }
    await room.populate('creator', 'username');
    const response = room.toObject();
    if (room.type === 'private') {
      response.roomCode = room.roomCode;
    }
    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all public rooms
router.get('/public', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ type: 'public' })
      .populate('creator', 'username')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's rooms
router.get('/my', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate('creator', 'username')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search rooms
router.get('/search', auth, async (req, res) => {
  try {
    const { query, type } = req.query;
    const searchQuery = {};
    if (query) {
      searchQuery.$text = { $search: query };
    }
    if (type && ['public', 'private'].includes(type)) {
      searchQuery.type = type;
    }
    const rooms = await Room.find(searchQuery)
      .populate('creator', 'username')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all available rooms (public and private, not already joined)
router.get('/available', auth, async (req, res) => {
  try {
    // Find all active rooms where the user is NOT a member
    const rooms = await Room.find({
      isActive: true,
      members: { $nin: [req.user._id] }
    })
    .select('name description type roomCode members');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join room (public: direct, private: require code)
router.post('/:roomId/join', auth, async (req, res) => {
  try {
    const { roomCode } = req.body;
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.members.includes(req.user._id)) {
      return res.status(400).json({ error: 'Already a member of this room' });
    }
    if (!room.isActive) {
      return res.status(403).json({ error: 'Room is inactive' });
    }
    if (room.members.length >= room.maxMembers) {
      return res.status(403).json({ error: 'Room is full' });
    }
    if (room.type === 'private') {
      if (!roomCode || room.roomCode !== roomCode) {
        return res.status(403).json({ error: 'Invalid room code' });
      }
    }
    await room.addMember(req.user._id);
    if (!req.user.joinedRooms.includes(room._id)) {
      req.user.joinedRooms.push(room._id);
      await req.user.save();
    }
    await room.populate('creator', 'username');
    await room.populate('members', 'username email avatar');
    await room.populate('lastMessage');
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Leave room
router.post('/:roomId/leave', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    room.members = room.members.filter(memberId => !memberId.equals(req.user._id));
    await room.save();
    
    req.user.joinedRooms = req.user.joinedRooms.filter(roomId => !roomId.equals(room._id));
    await req.user.save();
    
    res.json({ message: 'Successfully left the room' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete room (creator only)
router.delete('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.roomId,
      creator: req.user._id
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found or unauthorized' });
    }
    
    // Remove room from all members' joinedRooms
    await User.updateMany(
      { _id: { $in: room.members } },
      { $pull: { joinedRooms: room._id } }
    );
    
    // Delete all messages in the room
    await Message.deleteMany({ room: room._id });
    
    await room.remove();
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;