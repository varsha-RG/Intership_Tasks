const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    unique: true,
    sparse: true, // Allows null values and maintains uniqueness for non-null values
    validate: {
      validator: function(v) {
        // Only validate if it's a private room
        return this.type !== 'private' || (v && v.length === 6);
      },
      message: 'Room code must be 6 characters for private rooms'
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxMembers: {
    type: Number,
    default: 50
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate room code for private rooms
roomSchema.pre('save', function(next) {
  if (this.isModified('type') && this.type === 'private' && !this.roomCode) {
    // Generate 6 character room code
    this.roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Method to check if a room is joinable
roomSchema.methods.isJoinable = function(roomCode) {
  if (!this.isActive) return false;
  if (this.members.length >= this.maxMembers) return false;
  if (this.type === 'private' && this.roomCode !== roomCode) return false;
  return true;
};

// Method to add member to room
roomSchema.methods.addMember = function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
  }
  return this.save();
};

// Method to remove member from room
roomSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => !member.equals(userId));
  return this.save();
};

// Indexes
roomSchema.index({ name: 'text', description: 'text' }); // For room search functionality

module.exports = mongoose.model('Room', roomSchema);