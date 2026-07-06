// backend/index.js

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database('data.db');

// Create the habits table to store each habit's basic information.
db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

// Create the checkins table to store one check-in per habit per date.
db.exec(`
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    UNIQUE(habit_id, date)
  )
`);

// This function calculates the current streak by checking whether the habit has
// a check-in for today; if not, it allows the streak to start from yesterday,
// then counts consecutive daily check-ins going backward one day at a time.
function calculateStreak(habitId) {
  const rows = db
    .prepare(
      `
      SELECT date
      FROM checkins
      WHERE habit_id = ?
      ORDER BY date DESC
    `
    )
    .all(habitId);

  const checkinDates = new Set(rows.map((row) => row.date));

  const today = new Date();
  const formatDate = (dateObj) => dateObj.toISOString().slice(0, 10);

  const todayStr = formatDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  let currentDate;

  if (checkinDates.has(todayStr)) {
    currentDate = new Date(today);
  } else if (checkinDates.has(yesterdayStr)) {
    currentDate = new Date(yesterday);
  } else {
    return 0;
  }

  let streak = 0;

  while (true) {
    const currentDateStr = formatDate(currentDate);

    if (!checkinDates.has(currentDateStr)) {
      break;
    }

    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

// Create a new habit with a name and a created timestamp.
app.post('/habits', (req, res) => {
  const name = req.body?.name?.trim();

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const createdAt = new Date().toISOString();

  const result = db
    .prepare(
      `
      INSERT INTO habits (name, created_at)
      VALUES (?, ?)
    `
    )
    .run(name, createdAt);

  const newHabit = db
    .prepare('SELECT * FROM habits WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json({
    ...newHabit,
    streak: 0,
  });
});

// Return all habits with their current streak values.
app.get('/habits', (req, res) => {
  const habits = db
    .prepare(
      `
      SELECT * FROM habits
      ORDER BY created_at ASC
    `
    )
    .all();

  const habitsWithStreaks = habits.map((habit) => ({
    ...habit,
    streak: calculateStreak(habit.id),
  }));

  res.status(200).json(habitsWithStreaks);
});

// Add a check-in for a habit on a specific date or today by default.
app.post('/habits/:id/checkin', (req, res) => {
  const habitId = Number(req.params.id);

  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const resolvedDate =
    req.body?.date || new Date().toISOString().slice(0, 10);
  const checkedAt = new Date().toISOString();

  try {
    const result = db
      .prepare(
        `
        INSERT INTO checkins (habit_id, date, checked_at)
        VALUES (?, ?, ?)
      `
      )
      .run(habitId, resolvedDate, checkedAt);

    const newCheckin = db
      .prepare('SELECT * FROM checkins WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({
      ...newCheckin,
      streak: calculateStreak(habitId),
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Already checked in for this date' });
    }

    if (
      typeof error.message === 'string' &&
      error.message.toLowerCase().includes('unique')
    ) {
      return res.status(409).json({ error: 'Already checked in for this date' });
    }

    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Return all check-in dates for a single habit in descending date order.
app.get('/habits/:id/checkins', (req, res) => {
  const habitId = Number(req.params.id);

  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const checkins = db
    .prepare(
      `
      SELECT date
      FROM checkins
      WHERE habit_id = ?
      ORDER BY date DESC
    `
    )
    .all(habitId);

  const dates = checkins.map((row) => row.date);

  res.status(200).json(dates);
});

// Remove one specific check-in for a habit on a given date.
app.delete('/habits/:id/checkin/:date', (req, res) => {
  const habitId = Number(req.params.id);
  const { date } = req.params;

  db.prepare(
    `
    DELETE FROM checkins
    WHERE habit_id = ? AND date = ?
  `
  ).run(habitId, date);

  res.status(200).json({ message: 'Checkin removed' });
});

// Delete a habit and all of its check-in history.
app.delete('/habits/:id', (req, res) => {
  const habitId = Number(req.params.id);

  db.prepare('DELETE FROM checkins WHERE habit_id = ?').run(habitId);
  db.prepare('DELETE FROM habits WHERE id = ?').run(habitId);

  res
    .status(200)
    .json({ message: `Habit ${habitId} and its checkins deleted` });
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});