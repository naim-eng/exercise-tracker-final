require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));

const mongoUri = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.log('❌ MongoDB connection error:', err.message));

// Schemas
const userSchema = new mongoose.Schema({ username: { type: String, required: true } });
const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: String
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => {
  res.send('Exercise Tracker API is working!');
});

// POST create user
app.post('/api/users', async (req, res) => {
  const user = new User({ username: req.body.username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

// GET all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

// POST create exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  const date = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();

  const exercise = new Exercise({
    userId: user._id,
    description: req.body.description,
    duration: req.body.duration,
    date
  });
  await exercise.save();

  res.json({
    username: user.username,
    description: exercise.description,
    duration: Number(exercise.duration),
    date: exercise.date,
    _id: user._id
  });
});

// GET exercise logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  let dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  let filter = { userId: user._id };
  if (from || to) filter.date = dateFilter;

  const exercises = await Exercise.find(filter).limit(+limit || 0);

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log: exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date
    }))
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
