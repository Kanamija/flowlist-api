import express from 'express';
import { Request, Response, NextFunction } from 'express';
import db from './config/db.ts';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

// Health check — tests that the DB connection works

app.get('/api/health', async (req, res, next) => {
  try {
    const result = await db.query('SELECT NOW()');
    return res.status(200).json({
      status: 'ok',
      db_time: result.rows[0].now,
    });
  } catch (err) {
    return next(err);
  }
});

// catch-all 404
app.use((req, res) => res.status(404).send('This is not the page you\'re looking for...'));

// global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const defaultErr = {
    log: 'Express error handler caught unknown middleware error',
    status: 500,
    message: { err: 'An error occurred' },
  };
  const errorObj = Object.assign({}, defaultErr, err);
  console.log(errorObj.log, err);
  return res.status(errorObj.status).json(errorObj.message);
});

app.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}...`);
});

export default app;

