# Student Registration App

A full-stack CRUD application for registering, searching, editing, and managing student records — built with Express + SQLite on the backend and React on the frontend.

## Features

- Register new students with name, email, phone, and course
- View all registered students in a searchable, paginated list
- Edit existing student details inline
- Delete a student registration
- Search by name or course
- Dark mode toggle
- Avatar initials, character counter, loading states, and "last updated" timestamp

## Project Structure

```
student-registration/
├── backend/
│   └── index.js              # Express server + SQLite CRUD routes
├── frontend/
│   └── src/
│       ├── App.jsx           # Registration form + student list UI
│       └── App.css           # Styling (light/dark theme)
└── postman/
    ├── Student-Registration-API.postman_collection.json
    └── Student-Registration.postman_environment.json
```

## Tech Stack

- **Backend:** Node.js, Express, better-sqlite3
- **Frontend:** React (Vite)
- **Testing:** Postman / Newman

## Getting Started

### 1. Backend Setup

```bash
cd backend
npm install express cors better-sqlite3
node index.js
```

The server starts on `http://localhost:5000` and automatically creates a `data.db` SQLite file (with a `students` table) on first run.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`) in your browser.

## API Reference

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/students` | Register a new student. Requires `name`, `email`, `course`. Returns `409` if email already exists, `400` if a required field is missing. |
| GET | `/students?page=&limit=&search=` | List students, paginated. `search` filters by name or course (partial match). |
| GET | `/students/:id` | Fetch a single student by ID. |
| PUT | `/students/:id` | Update a student's `name`, `email`, `phone`, and/or `course`. |
| DELETE | `/students/:id` | Delete a student by ID. |

### Example: Register a student

```bash
curl -X POST http://localhost:5000/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane.doe@example.com","phone":"9876543210","course":"B.Sc Computer Science"}'
```

## Database Schema

**Table: `students`**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key, auto-increment |
| name | TEXT | Required |
| email | TEXT | Required, unique |
| phone | TEXT | Optional |
| course | TEXT | Required |
| registered_at | TEXT | ISO timestamp, set on creation |

## Testing the API

### Option A: Postman (VS Code extension or desktop)

1. Import `postman/Student-Registration-API.postman_collection.json` as a collection.
2. Import `postman/Student-Registration.postman_environment.json` as an environment.
3. Select **"Student Registration - Local"** as the active environment.
4. Run requests in order: Create → Read (all) → Read (single) → Update → Delete.

### Option B: Newman (command line)

```bash
npm install -g newman
cd postman
newman run Student-Registration-API.postman_collection.json \
  -e Student-Registration.postman_environment.json
```

## Notes

- CORS is enabled on the backend so the frontend (running on a different port) can call the API.
- The frontend expects the backend to be running on `http://localhost:5000`; update the `API_URL` constant in `App.jsx` if you change the backend port.
- This is a local, single-user learning project — no authentication is implemented.
