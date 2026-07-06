// frontend/src/App.jsx

import { useEffect, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000';

function App() {
  const [habitName, setHabitName] = useState('');
  const [habits, setHabits] = useState([]);
  const [checkinsByHabit, setCheckinsByHabit] = useState({});
  const [loading, setLoading] = useState(true);

  // Helper function to format a Date object as YYYY-MM-DD.
  const formatDate = (date) => {
    return date.toISOString().slice(0, 10);
  };

  // Helper function to return the last 7 calendar days including today.
  const getLast7Days = () => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        fullDate: formatDate(date),
        dayNumber: date.getDate(),
      });
    }

    return days;
  };

  // This function fetches all habits, then fetches check-ins for each habit,
  // and updates both pieces of state in one place for consistency.
  const refreshAll = async () => {
    try {
      const habitsResponse = await fetch(`${API_URL}/habits`);
      const habitsData = await habitsResponse.json();

      if (!habitsResponse.ok) {
        throw new Error('Failed to fetch habits');
      }

      const nextCheckinsByHabit = {};

      for (const habit of habitsData) {
        try {
          const checkinsResponse = await fetch(
            `${API_URL}/habits/${habit.id}/checkins`
          );
          const checkinsData = await checkinsResponse.json();

          if (!checkinsResponse.ok) {
            throw new Error(`Failed to fetch checkins for habit ${habit.id}`);
          }

          nextCheckinsByHabit[habit.id] = checkinsData;
        } catch (error) {
          console.error(error);
        }
      }

      setHabits(habitsData);
      setCheckinsByHabit(nextCheckinsByHabit);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all habits and their check-ins once when the page loads.
  useEffect(() => {
    refreshAll();
  }, []);

  // Add a new habit if the input is not empty after trimming.
  const handleAddHabit = async () => {
    const trimmedName = habitName.trim();

    if (!trimmedName) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/habits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        throw new Error('Failed to add habit');
      }

      setHabitName('');
      await refreshAll();
    } catch (error) {
      console.error(error);
    }
  };

  // Allow Enter key in the new habit input to submit the habit.
  const handleInputKeyDown = async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await handleAddHabit();
    }
  };

  // Check in a habit for today, then refresh all data so streaks and history update.
  const handleCheckIn = async (habitId) => {
    try {
      const response = await fetch(`${API_URL}/habits/${habitId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to check in habit');
      }

      await refreshAll();
    } catch (error) {
      console.error(error);
    }
  };

  // Delete a habit and refresh the full list afterward.
  const handleDeleteHabit = async (habitId) => {
    try {
      const response = await fetch(`${API_URL}/habits/${habitId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete habit');
      }

      await refreshAll();
    } catch (error) {
      console.error(error);
    }
  };

  const todayString = formatDate(new Date());

  return (
    <div className="app">
      <h1>🔥 Habit Tracker</h1>

      {/* New habit input card */}
      <div className="habit-card new-habit-card">
        <h2>New Habit</h2>

        <div className="new-habit-row">
          <input
            type="text"
            placeholder="e.g. Drink 2L water"
            value={habitName}
            onChange={(e) => setHabitName(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <button onClick={handleAddHabit}>Add Habit</button>
        </div>
      </div>

      {/* Habit list section */}
      <div className="habits-section">
        {loading ? (
          <p>Loading your habits...</p>
        ) : habits.length === 0 ? (
          <p>No habits yet. Add one above to get started!</p>
        ) : (
          habits.map((habit) => {
            const checkinDates = checkinsByHabit[habit.id] || [];
            const checkedInToday = checkinDates.includes(todayString);
            const last7Days = getLast7Days();

            return (
              <div className="habit-card" key={habit.id}>
                <h3>{habit.name}</h3>

                {habit.streak > 0 ? (
                  <p className="streak-text active-streak">
                    🔥 {habit.streak} day streak
                  </p>
                ) : (
                  <p className="streak-text">No streak yet — check in today!</p>
                )}

                <button
                  className="checkin-button"
                  onClick={() => handleCheckIn(habit.id)}
                  disabled={checkedInToday}
                >
                  {checkedInToday ? '✅ Checked in today' : 'Check In'}
                </button>

                <div className="history-row">
                  {last7Days.map((day) => {
                    const done = checkinDates.includes(day.fullDate);

                    return (
                      <div
                        key={day.fullDate}
                        className={`day-box ${done ? 'done' : 'not-done'}`}
                        title={day.fullDate}
                      >
                        {day.dayNumber}
                      </div>
                    );
                  })}
                </div>

                <button
                  className="delete-button"
                  onClick={() => handleDeleteHabit(habit.id)}
                >
                  Delete Habit
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;