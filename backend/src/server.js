import dotenv from 'dotenv';

// Load environment variables before anything else
dotenv.config();

import app from './app.js';
import { initCronJobs } from './services/cronService.js';

const port = process.env.PORT || 5000;

// Initialize automated background tasks
initCronJobs();

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
