const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');



// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const user = new User({ username, email, password });
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('joinedRooms', 'name description type lastMessage roomCode members')
      .populate('contacts', 'username email avatar status')
      .populate('privateChats.with', 'username email avatar status')
      .populate('privateChats.lastMessage')
      .select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user contacts
router.get('/contacts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts', 'username email avatar status lastSeen')
      .populate('privateChats.with', 'username email avatar status')
      .populate('privateChats.lastMessage');
    res.json({
      contacts: user.contacts,
      privateChats: user.privateChats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sign out
router.post('/signout', auth, async (req, res) => {
  try {
    await req.user.updateStatus('offline');
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['username', 'email', 'password', 'avatar'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));
  
  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates' });
  }
  
  try {
    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user status
router.post('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['online', 'offline', 'away'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await req.user.updateStatus(status);
    res.json({ status: req.user.status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get private chat messages (ensure chat exists)
router.get('/chat/:userId', auth, async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.userId);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const chat = await req.user.getOrCreatePrivateChat(otherUser._id);
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user._id }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'username avatar');
    // Mark messages as read
    await req.user.updateUnreadCount(otherUser._id, false);
    res.json({
      chat,
      messages: messages.reverse()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: new RegExp(searchQuery, 'i') },
            { email: new RegExp(searchQuery, 'i') }
          ]
        }
      ]
    }).select('username email avatar');
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;