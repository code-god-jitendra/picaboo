const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }], // Array of 2 user IDs
  lastMessage: { type: String },
  updatedAt: { type: Date, default: Date.now },
  unreadCounts: { // Map of userId to unread count
    type: Map,
    of: Number,
    default: {}
  }
});

module.exports = mongoose.model('Conversation', conversationSchema);
