import express from 'express';
import { Request, Response, NextFunction } from 'express';
import db from './config/db.ts';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.ts';


const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// GET /api/classes — list all class events with their template name

app.get('/api/classes', async (req, res, next) => {
  try {
    const result = await db.query(
    `SELECT 
        ce.id,
        ce.starts_at,
        ce.duration_minutes,
        ce.instructor,
        ce.max_capacity,
        ce.spots_remaining,
        ce.is_cancelled,
        ct.name,
        ct.description
    FROM class_events ce
    JOIN class_templates ct ON ce.template_id = ct.id
    WHERE ce.starts_at > NOW()
    AND ce.is_cancelled = false
    ORDER BY ce.starts_at ASC`
    );
    return res.status(200).json({ classes: result.rows });
  } catch (error) {
    return next(error);
  }
});

// GET /api/classes/:id — get a single class by its ID
app.get('/api/classes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM class_events WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'class not found'})
    }
    return res.status(200).json({ class: result.rows[0] });
  } catch (error) {
    return next(error);
  }
})

app.use('/api/auth', authRouter);

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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}...`);
  });
}

export default app;

