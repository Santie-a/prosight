/**
 * SQLite Database Service
 *
 * Handles initialization, migrations, and direct database access.
 */

import * as SQLite from 'expo-sqlite';
import { DATABASE_SCHEMA } from '@/constants/database-schema';

let db: SQLite.SQLiteDatabase | null = null;

// ---------------------------------------------------------------------------
// Individual index statements split out from DATABASE_SCHEMA.createIndexes.
// expo-sqlite's execAsync on Android does not support multiple statements in
// a single call — each statement must be executed separately.
// ---------------------------------------------------------------------------
const INDEX_STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS idx_documents_created
     ON documents(created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_blocks_document_order
     ON content_blocks(document_id, block_index);`,
  `CREATE INDEX IF NOT EXISTS idx_blocks_page
     ON content_blocks(document_id, page_number);`,
  `CREATE INDEX IF NOT EXISTS idx_sections_document
     ON sections(document_id, section_index);`,
];

/**
 * Initialize the SQLite database.
 * Creates tables and indexes on first run.
 * Table creation order respects foreign key dependencies:
 *   files → documents → content_blocks → block_tables
 *                     → sections
 */
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    db = await SQLite.openDatabaseAsync('prosight.db');

    // Enable foreign key enforcement (off by default in SQLite)
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Tables — order matters due to FK dependencies
    await db.execAsync(DATABASE_SCHEMA.createFilesTable);
    await db.execAsync(DATABASE_SCHEMA.createDocumentsTable);
    await db.execAsync(DATABASE_SCHEMA.createContentBlocksTable);
    await db.execAsync(DATABASE_SCHEMA.createBlockTablesTable);
    await db.execAsync(DATABASE_SCHEMA.createSectionsTable);

    // Indexes — one statement per execAsync call
    for (const statement of INDEX_STATEMENTS) {
      await db.execAsync(statement);
    }

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw new Error(`Database init failed: ${error}`);
  }
}

/**
 * Get the database instance, initializing it if necessary.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await initializeDatabase();
  }
  return db;
}

/**
 * Execute a SELECT query and return all matching rows.
 */
export async function executeQuery<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const database = await getDatabase();
  return database.getAllAsync<T>(sql, params);
}

/**
 * Execute an INSERT, UPDATE, or DELETE statement.
 */
export async function executeUpdate(
  sql: string,
  params: any[] = []
): Promise<SQLite.SQLiteRunResult> {
  const database = await getDatabase();
  return database.runAsync(sql, params);
}

/**
 * Return the first matching row, or null if none found.
 */
export async function getOne<T = any>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const database = await getDatabase();
  return database.getFirstAsync<T>(sql, params);
}

/**
 * Delete all rows from all tables.
 * Cascade deletes handle dependent rows automatically.
 * Use only during development.
 */
export async function clearDatabase(): Promise<void> {
  const database = await getDatabase();
  try {
    // Deleting documents cascades to content_blocks, block_tables, and sections.
    // Deleting files separately since documents has a FK to files, not the reverse.
    await database.execAsync('DELETE FROM sections;');
    await database.execAsync('DELETE FROM block_tables;');
    await database.execAsync('DELETE FROM content_blocks;');
    await database.execAsync('DELETE FROM documents;');
    await database.execAsync('DELETE FROM files;');
    console.log('Database cleared');
  } catch (error) {
    console.error('Failed to clear database:', error);
    throw error;
  }
}

/**
 * Close the database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('Database closed');
  }
}