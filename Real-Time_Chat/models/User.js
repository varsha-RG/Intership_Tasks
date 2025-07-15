const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  privateChats: [{
    with: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    unreadCount: {
      type: Number,
      default: 0
    }
  }],
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  joinedRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update user status
userSchema.methods.updateStatus = async function(status) {
  this.status = status;
  this.lastSeen = new Date();
  return this.save();
};

// Method to add contact
userSchema.methods.addContact = async function(userId) {
  if (!this.contacts.includes(userId)) {
    this.contacts.push(userId);
    await this.save();
  }
};

// Method to remove contact
userSchema.methods.removeContact = async function(userId) {
  this.contacts = this.contacts.filter(contact => !contact.equals(userId));
  await this.save();
};

// Method to handle private chat
userSchema.methods.getOrCreatePrivateChat = async function(userId) {
  let chat = this.privateChats.find(chat => chat.with.equals(userId));
  if (!chat) {
    chat = { with: userId };
    this.privateChats.push(chat);
    await this.save();
  }
  return chat;
};

// Method to update unread count
userSchema.methods.updateUnreadCount = async function(userId, increment = true) {
  const chat = this.privateChats.find(chat => chat.with.equals(userId));
  if (chat) {
    chat.unreadCount = increment ? chat.unreadCount + 1 : 0;
    await this.save();
  }
};

// Indexes
userSchema.index({ username: 'text', email: 'text' }); // For user search functionality

module.exports = mongoose.model('User', userSchema);