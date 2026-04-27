import { Pool } from 'pg';
import type { QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const PG_URI = process.env.DATABASE_URL;

if(!PG_URI) {
    throw new Error('DATABASE_URL is not set in .env');
}

const pool = new Pool({
  connectionString: PG_URI,
});

// FlowList database schema (Supabase):
// users, sessions, class_templates, class_events, bookings

export default {
  query: (text: string, params?: any[]): Promise<QueryResult<any>> => {
    console.log('executed query', text);
    return pool.query(text, params);
  },
};
