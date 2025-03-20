const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  imageFileId: { type: Schema.Types.ObjectId, required: true }, // GridFS file ID
  caption: { type: String, default: "" },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
