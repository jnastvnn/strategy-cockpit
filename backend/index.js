import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initDb } from './db/index.js';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize DB
initDb();

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend app listening on port ${port}`);
});
