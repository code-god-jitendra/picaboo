const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up EJS templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// -----------------------
// SESSION SETUP
// -----------------------
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false
}));

// -----------------------
// BODY PARSER & STATIC FILES
// -----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// -----------------------
// MONGODB CONNECTION
// -----------------------
mongoose.connect('mongodb+srv://picaboobyjitendra:picaboobyjitendra@hexgames.jvjoh.mongodb.net/picaboo?retryWrites=true&w=majority&appName=hexGames', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// -----------------------
// IMPORT MODELS & BCRYPT
// -----------------------
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Post = require('./models/Post');
const ChatMessage = require('./models/ChatMessage');
const Conversation = require('./models/Conversation');

// -----------------------
// GRIDFS SETUP
// -----------------------
let gfsBucket;
mongoose.connection.once('open', () => {
  console.log('MongoDB connection open for GridFS');
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'images'
  });
});

// -----------------------
// MULTER CONFIGURATION (MEMORY STORAGE)
// -----------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// -----------------------
// ROUTES TO SERVE HTML PAGES
// -----------------------
app.get('/', (req, res) => res.send('Welcome to Picaboo!'));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'views', 'signup.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/explore', (req, res) => res.sendFile(path.join(__dirname, 'views', 'explore.html')));

// Render inbox using EJS with injected user data
app.get('/inbox', async (req, res) => {
  const currentUserId = req.session.userId;
  if (!currentUserId) {
    return res.redirect('/login');
  }
  try {
    const user = await User.findById(currentUserId);
    res.render('inbox', {
      currentUserId: user._id.toString(),
      currentUsername: user.username
    });
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});

// -----------------------
// AUTHENTICATION ROUTES (SIGNUP & LOGIN)
// -----------------------
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).send('Username is already taken.');
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    req.session.userId = newUser._id;
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).send('Invalid credentials.');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid credentials.');
    req.session.userId = user._id;
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// -----------------------
// POSTS ROUTES
// -----------------------
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().populate('user', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

app.post('/posts/:id/like', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.likes += 1;
    await post.save();
    res.json({ message: 'Post liked', likes: post.likes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error liking post' });
  }
});

app.get('/profile', async (req, res) => {
    const currentUserId = req.session.userId;
    if (!currentUserId) return res.redirect('/login');
    try {
      const user = await User.findById(currentUserId);
      // Get the user's posts
      const posts = await Post.find({ user: currentUserId }).sort({ createdAt: -1 });
      // Calculate friend count (assuming friends is an array on the user document)
      const userFriendsCount = user.friends ? user.friends.length : 0;
      res.render('profile', {
        currentUsername: user.username,
        userFriendsCount,
        posts
      });
    } catch (err) {
      console.error(err);
      res.redirect('/login');
    }
  });
  
// -----------------------
// UPLOAD IMAGE WITH CAPTION (GRIDFS)
// -----------------------
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const userId = req.session.userId;
    if (!userId) return res.status(403).send('User not authenticated.');
    const caption = req.body.caption || "";

    const processedBuffer = await sharp(req.file.buffer)
      .resize(800)
      .jpeg({ quality: 80 })
      .toBuffer();

    const uploadStream = gfsBucket.openUploadStream(
      `${Date.now()}-${req.file.originalname}`,
      { contentType: 'image/jpeg' }
    );
    uploadStream.end(processedBuffer);

    uploadStream.on('finish', async () => {
      const newPost = new Post({
        user: userId,
        imageFileId: uploadStream.id,
        caption: caption
      });
      await newPost.save();
      res.redirect('/profile');
    });

    uploadStream.on('error', (err) => {
      console.error('Error uploading to GridFS:', err);
      res.status(500).send('Error uploading image to database');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error uploading image');
  }
});

app.delete('/post/:id', async (req, res) => {
    const currentUserId = req.session.userId;
    if (!currentUserId) return res.status(403).json({ message: 'Not authenticated' });
    try {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Post not found' });
      // Check if current user is the owner
      if (post.user.toString() !== currentUserId) {
        return res.status(403).json({ message: 'You can only delete your own posts' });
      }
      // Optionally, delete the image file from GridFS
      gfsBucket.delete(post.imageFileId, (err) => {
        if (err) console.error('Error deleting file from GridFS:', err);
      });
      await post.remove();
      res.json({ message: 'Post deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error deleting post' });
    }
  });
  

// -----------------------
// IMAGE RETRIEVAL ROUTE (GRIDFS)
// -----------------------
app.get('/image/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    res.set('Content-Type', 'image/jpeg');
    gfsBucket.openDownloadStream(fileId).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(404).send('Image not found');
  }
});

// -----------------------
// FRIEND ROUTE: ADD FRIEND BY USERNAME
// -----------------------
app.post('/add-friend', async (req, res) => {
  const { friendUsername } = req.body;
  const userId = req.session.userId;
  try {
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) return res.status(404).json({ message: 'User not found' });
    await User.findByIdAndUpdate(userId, { $addToSet: { friends: friend._id } });
    res.json({ message: 'Friend added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding friend' });
  }
});

// -----------------------
// SEARCH USERS BY USERNAME (EXCLUDING CURRENT USER)
// -----------------------
app.get('/search-users', async (req, res) => {
  const searchTerm = req.query.username || "";
  const currentUserId = req.session.userId;
  try {
    const users = await User.find({
      username: new RegExp(searchTerm, 'i'),
      _id: { $ne: currentUserId }
    }).select('username');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error searching users' });
  }
});

// -----------------------
// CONVERSATION & CHAT HISTORY ENDPOINTS
// -----------------------
app.post('/mark-read', async (req, res) => {
  // Expects: { conversationId, userId }
  const { conversationId, userId } = req.body;
  try {
    const participantIds = conversationId.split('_');
    const conv = await Conversation.findOne({ participants: { $all: participantIds } });
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    conv.unreadCounts.set(userId, 0);
    await conv.save();
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error marking conversation as read' });
  }
});

app.get('/conversations', async (req, res) => {
  const currentUserId = req.session.userId;
  try {
    const convs = await Conversation.find({ participants: currentUserId })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username');
    res.json(convs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
});

app.get('/chat-history/:conversationId', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ conversationId: req.params.conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username');
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching chat history' });
  }
});

// -----------------------
// REAL-TIME CHAT WITH SOCKET.IO (WITH PERSISTENCE)
// -----------------------
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('chat message', async (data) => {
    // data should include: { room, sender, senderId, text }
    try {
      if (!data.text || !data.senderId) {
        console.error('Missing text or senderId');
        return;
      }
      const newMessage = new ChatMessage({
        conversationId: data.room,
        sender: new mongoose.Types.ObjectId(data.senderId),
        text: data.text
      });
      await newMessage.save();

      // Update or create conversation
      const participantIds = data.room.split('_');
      let conv = await Conversation.findOne({ participants: { $all: participantIds } });
      if (!conv) {
        conv = new Conversation({
          participants: participantIds,
          lastMessage: data.text,
          updatedAt: new Date(),
          unreadCounts: {}
        });
        conv.unreadCounts.set(data.senderId, 0);
        const recipientId = participantIds.find(id => id !== data.senderId);
        conv.unreadCounts.set(recipientId, 1);
      } else {
        conv.lastMessage = data.text;
        conv.updatedAt = new Date();
        const recipientId = participantIds.find(id => id !== data.senderId);
        const currentUnread = conv.unreadCounts.get(recipientId) || 0;
        conv.unreadCounts.set(recipientId, currentUnread + 1);
      }
      await conv.save();

      io.to(data.room).emit('chat message', data);
      console.log(`Message from ${data.sender} in room ${data.room}: ${data.text}`);
    } catch (err) {
      console.error('Error saving chat message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// -----------------------
// LOGOUT ROUTE
// -----------------------
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error logging out');
    }
    res.redirect('/login');
  });
});

// -----------------------
// START THE SERVER
// -----------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
