const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'fitness_secret_key_2025';

app.use(cors());
app.use(express.json());

// ========== ПОЛЬЗОВАТЕЛИ ==========
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }
    try {
        const password_hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
            [username, email, password_hash]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Неверный пароль' });
        }
        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
        res.json({ success: true, token, userId: user.id, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== УПРАЖНЕНИЯ ==========
app.get('/api/exercises', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exercises ORDER BY muscle_group, name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== ГРАФИК ТРЕНИРОВОК ==========
app.get('/api/schedule/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM user_schedule WHERE user_id = $1 ORDER BY day_of_week',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/schedule', async (req, res) => {
    const { user_id, day_of_week, workout_name } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO user_schedule (user_id, day_of_week, workout_name)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, day_of_week) 
             DO UPDATE SET workout_name = EXCLUDED.workout_name
             RETURNING *`,
            [user_id, day_of_week, workout_name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== ДНЕВНИК ==========
app.get('/api/logs/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            `SELECT wl.*, e.name as exercise_name, e.muscle_group
             FROM workout_logs wl
             JOIN exercises e ON wl.exercise_id = e.id
             WHERE wl.user_id = $1
             ORDER BY wl.log_date DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs', async (req, res) => {
    const { user_id, exercise_id, log_date, sets, reps, weight_kg } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO workout_logs (user_id, exercise_id, log_date, sets, reps, weight_kg)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [user_id, exercise_id, log_date, sets, reps, weight_kg]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/logs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM workout_logs WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Бэкенд запущен на http://localhost:${PORT}`);
});
