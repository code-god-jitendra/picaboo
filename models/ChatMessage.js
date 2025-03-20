const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatMessageSchema = new Schema({
  conversationId: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
