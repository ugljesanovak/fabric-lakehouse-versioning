/**
 * DuckDB WASM Client for querying CSV and Parquet files
 * Provides initialization, file loading, and query execution capabilities
 */

import * as duckdb from '@duckdb/duckdb-wasm';

// Import WASM bundles - using dynamic imports to avoid TypeScript errors
const duckdb_wasm = new URL('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm', import.meta.url).href;
const mvp_worker = new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js', import.meta.url).href;
const duckdb_wasm_eh = new URL('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm', import.meta.url).href;
const eh_worker = new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).href;

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: mvp_worker,
    },
    eh: {
        mainModule: duckdb_wasm_eh,
        mainWorker: eh_worker,
    },
};

export interface QueryResult {
    columns: string[];
    rows: any[][];
    rowCount: number;
}

/**
 * DuckDB client for ephemeral file querying
 */
export class DuckDBClient {
    private db: duckdb.AsyncDuckDB | null = null;
    private connection: duckdb.AsyncDuckDBConnection | null = null;
    private initialized = false;

    /**
     * Initialize DuckDB WASM instance
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
            if (!bundle.mainWorker) {
                throw new Error('Could not initialize DuckDB: no worker found');
            }

            const worker = new Worker(bundle.mainWorker);
            const logger = new duckdb.VoidLogger();
            this.db = new duckdb.AsyncDuckDB(logger, worker);
            
            await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
            this.connection = await this.db.connect();
            
            this.initialized = true;
            console.log('DuckDB WASM initialized successfully');
        } catch (error) {
            console.error('Failed to initialize DuckDB:', error);
            throw error;
        }
    }

    /**
     * Load a file into DuckDB from a blob
     * @param fileName Name for the file in DuckDB
     * @param fileContent Blob or ArrayBuffer containing file data
     * @param fileType 'csv' or 'parquet'
     */
    async loadFile(fileName: string, fileContent: Blob | ArrayBuffer, fileType: 'csv' | 'parquet'): Promise<void> {
        if (!this.db || !this.connection) {
            throw new Error('DuckDB not initialized. Call initialize() first.');
        }

        try {
            // Convert Blob to ArrayBuffer if needed
            const arrayBuffer = fileContent instanceof Blob 
                ? await fileContent.arrayBuffer() 
                : fileContent;
            
            const buffer = new Uint8Array(arrayBuffer);
            
            // Drop any previously registered file with same name
            try {
                await this.db.dropFile(fileName);
            } catch {
                // File doesn't exist, ignore error
            }
            
            // Register file in DuckDB
            await this.db.registerFileBuffer(fileName, buffer);
            
            console.log(`File ${fileName} loaded into DuckDB (${fileType})`);
        } catch (error) {
            console.error('Failed to load file into DuckDB:', error);
            throw error;
        }
    }

    /**
     * Execute a SQL query against loaded files
     * @param sql SQL query string
     * @returns Query result with columns, rows, and row count
     */
    async executeQuery(sql: string): Promise<QueryResult> {
        if (!this.connection) {
            throw new Error('DuckDB not initialized. Call initialize() first.');
        }

        try {
            // Execute query
            const arrowResult = await this.connection.query(sql);
            
            // Convert Arrow table to plain JavaScript structure
            const columns = arrowResult.schema.fields.map(f => f.name);
            const rows: any[][] = [];
            
            for (let i = 0; i < arrowResult.numRows; i++) {
                const row: any[] = [];
                for (let j = 0; j < columns.length; j++) {
                    const column = arrowResult.getChildAt(j);
                    row.push(column?.get(i));
                }
                rows.push(row);
            }
            
            return {
                columns,
                rows,
                rowCount: arrowResult.numRows,
            };
        } catch (error) {
            console.error('Query execution failed:', error);
            throw error;
        }
    }

    /**
     * Create a table from a file
     * @param tableName Name for the table
     * @param fileName File name registered in DuckDB
     * @param fileType 'csv' or 'parquet'
     */
    async createTableFromFile(tableName: string, fileName: string, fileType: 'csv' | 'parquet'): Promise<void> {
        if (!this.connection) {
            throw new Error('DuckDB not initialized. Call initialize() first.');
        }

        try {
            let createQuery: string;
            
            if (fileType === 'parquet') {
                createQuery = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_parquet('${fileName}')`;
            } else if (fileType === 'csv') {
                createQuery = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv('${fileName}', AUTO_DETECT=TRUE)`;
            } else {
                throw new Error(`Unsupported file type: ${fileType}`);
            }
            
            await this.connection.query(createQuery);
            console.log(`Table ${tableName} created from ${fileName}`);
        } catch (error) {
            console.error('Failed to create table from file:', error);
            throw error;
        }
    }

    /**
     * Read a file from DuckDB's virtual filesystem
     * @param fileName Name of the file to read
     * @returns File content as Uint8Array
     */
    async readFile(fileName: string): Promise<Uint8Array> {
        if (!this.db) {
            throw new Error('DuckDB not initialized. Call initialize() first.');
        }

        try {
            const fileHandle = await this.db.copyFileToBuffer(fileName);
            return fileHandle;
        } catch (error) {
            console.error('Failed to read file from DuckDB:', error);
            throw error;
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        try {
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
            if (this.db) {
                await this.db.terminate();
                this.db = null;
            }
            this.initialized = false;
            console.log('DuckDB resources cleaned up');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    /**
     * Check if DuckDB is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }
}

/**
 * Helper to get file extension from file path
 */
export function getFileExtension(filePath: string): 'csv' | 'parquet' | null {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (extension === 'csv') return 'csv';
    if (extension === 'parquet' || extension === 'pq') return 'parquet';
    return null;
}

/**
 * Helper to generate table name from file path
 */
export function getTableNameFromPath(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'data';
    // Remove extension and sanitize for SQL
    const tableName = fileName
        .replace(/\.(csv|parquet|pq)$/i, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase();
    return tableName || 'data_table';
}
