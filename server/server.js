import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
import feedRoutes from './routes/feed.js';
import voteRoutes from './routes/vote.js';
import rumorRoutes from './routes/rumor.js';
import authRoutes from './routes/auth.js';

const app = express();
const prisma = new PrismaClient();
const PORT = 4001; // Updated to match Client (4001)

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/feed', feedRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/rumor', rumorRoutes);
app.use('/api/auth', authRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('Campus Veritas API is Running');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Export prisma for usage in routes if needed,
// though routes usually import their own instance or we pass it.
// Better to export it from a db.js or utils.js, but for now routes can import new PrismaClient.
