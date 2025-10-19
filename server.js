require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ✅ MongoDB Connection
const uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// ✅ Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// ✅ Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// ✅ POST /api/users → create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /api/users → get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find().select('_id username');
  res.json(users);
});

// ✅ POST /api/users/:_id/exercises → add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = new Exercise({
      user_id: _id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /api/users/:_id/logs → retrieve logs with filters
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Filter by date
    let dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    let filter = { user_id: _id };
    if (Object.keys(dateFilter).length > 0) filter.date = dateFilter;

    // Fetch exercises
    let exercises = await Exercise.find(filter).limit(parseInt(limit) || 0);

    // Format logs
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));

