const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const rideRoutes = require('./routes/ride.routes');

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.status(200).json({ name: 'Rapido API', status: 'ok' });
});

app.use('/rides', rideRoutes);
app.use('/users', userRoutes);
app.use('/captains', captainRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

app.use((error, req, res, next) => {
    console.error('Request failed:', error.message);

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ message: 'Request body must contain valid JSON' });
    }

    if (error.message === 'Origin is not allowed by CORS') {
        return res.status(403).json({ message: error.message });
    }

    if (error.code === 11000) {
        return res.status(409).json({ message: 'An account with this email already exists' });
    }

    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'An unexpected server error occurred' });
});

module.exports = app;
