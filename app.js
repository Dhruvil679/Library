const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 1. Connect to MongoDB ---
mongoose.connect('mongodb://localhost:27017/chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// --- 2. Define Message model ---
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// --- 3. Serve static front‑end ---
app.use(express.static('public'));

// --- 4. Socket.IO real‑time + persistence ---
io.on('connection', socket => {
  // Send last 100 messages to newly connected client
  Message.find().sort({ timestamp: 1 }).limit(100).exec((err, msgs) => {
    if (!err) socket.emit('chat history', msgs);
  });

  // Listen for chat messages from clients
  socket.on('chat message', data => {
    const msg = new Message({ user: data.user, text: data.text });
    msg.save()
       .then(() => io.emit('chat message', { user: data.user, text: data.text }))
       .catch(console.error);
  });
});

// --- 5. Start server ---
const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));