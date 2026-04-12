/**
 * SQLite Database Service
 * 
 * Handles initialization, migrations, and direct database access
 */

import * as SQLite from 'expo-sqlite';
import { DATABASE_SCHEMA } from '@/constants/database-schema';

let db: SQLite.Database | null = null;

/**
 * Initialize the SQLite database
 * Creates tables and indexes on first run
 */
export async function initializeDatabase(): Promise<SQLite.Database> {
  try {
    // Open or create database
    db = await SQLite.openDatabaseAsync('prosight.db');

    // Run schema creation
    await db.execAsync(DATABASE_SCHEMA.createDocumentsTable);
    await db.execAsync(DATABASE_SCHEMA.createChunksTable);
    await db.execAsync(DATABASE_SCHEMA.createSectionsTable);
    await db.execAsync(DATABASE_SCHEMA.createFilesTable);
    await db.execAsync(DATABASE_SCHEMA.createIndexes);

    console.log('✓ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    throw new Error(`Database init failed: ${error}`);
  }
}

/**
 * Get the database instance
 * Ensures database is initialized before use
 */
export async function getDatabase(): Promise<SQLite.Database> {
  if (!db) {
    db = await initializeDatabase();
  }
  return db;
}

/**
 * Execute raw SQL query
 * @param sql SQL query string
 * @param params Query parameters (optional)
 */
export async function executeQuery(
  sql: string,
  params: any[] = []
): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(sql, params);
}

/**
 * Execute insert/update/delete query
 * @param sql SQL query string
 * @param params Query parameters (optional)
 */
export async function executeUpdate(
  sql: string,
  params: any[] = []
): Promise<SQLite.RunResult> {
  const database = await getDatabase();
  return database.runAsync(sql, params);
}

/**
 * Get single row from database
 */
export async function getOne(
  sql: string,
  params: any[] = []
): Promise<any | null> {
  const database = await getDatabase();
  return database.getFirstAsync(sql, params);
}

/**
 * Clear all tables (dangerous - use with caution)
 */
export async function clearDatabase(): Promise<void> {
  const database = await getDatabase();
  try {
    await database.execAsync('DELETE FROM chunks');
    await database.execAsync('DELETE FROM sections');
    await database.execAsync('DELETE FROM documents');
    await database.execAsync('DELETE FROM files');
    console.log('✓ Database cleared');
  } catch (error) {
    console.error('✗ Failed to clear database:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('✓ Database closed');
  }
}
