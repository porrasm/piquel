import { createDatabase, Database } from "../db-definition";
import { z } from "zod";
import { parsePublicSchema, publicSchemaValidator } from "./table-parser";
import { generateSchemaTypescript } from "./schema.template";
import fs from "fs";
import { execSync } from "child_process";
import pg from "pg";
import { sql } from "../sql/sql-builder";
import { SchemaGenerationConfig } from "../types";

const DEFAULT_SCHEMA_GENERATION_CONFIG: SchemaGenerationConfig = {
  schemaExportName: "schema",
  primaryKeySuffix: "_id",
  tableTypeSuffix: "Type",
  tableNameTransform: (tableName: string) => tableName,
  columnNameTransform: (columnName: string) => columnName,
};

const foreignKeyValidator = z.object({
  table_name: z.string(),
  column_name: z.string(),
  foreign_table_name: z.string(),
  foreign_column_name: z.string(),
});

export type ForeignKey = z.infer<typeof foreignKeyValidator>;

const runPrettierOnSchemaFile = async (outputTypescriptFile: string) => {
  try {
    console.log("Running prettier on generated schema file...");
    execSync(`npx prettier --write ${outputTypescriptFile}`, {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    console.log("Schema file formatted successfully!");
  } catch (error) {
    console.error("Failed to format schema file with prettier:", error);
    throw error;
  }
};

type SchemaGenerationParams = {
  dbConnectionString: string;
  outputTypescriptFile: string;
  config?: Partial<SchemaGenerationConfig>;
};

const dbHealthCheck = async (db: Database) => {
  try {
    await db.client.queryOne(sql`SELECT 1`);
  } catch (error) {
    console.error("Error: Database health check failed");
    throw error;
  }
};

export const runSchemaGeneration = async (params: SchemaGenerationParams) => {
  const finalConfig = { ...DEFAULT_SCHEMA_GENERATION_CONFIG, ...params.config };

  const db = createDatabase({
    pool: new pg.Pool({
      connectionString: params.dbConnectionString,
    }),
    useZodValidation: true,
  });

  await dbHealthCheck(db);

  const rows = await db.client.query(
    sql`SELECT * FROM information_schema.columns WHERE table_schema = 'public'`,
    publicSchemaValidator,
  );

  const foreignKeys = await db.client.query(
    sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema='public'`,
    foreignKeyValidator,
  );

  const tables = parsePublicSchema(rows, foreignKeys, finalConfig);
  const schemaDefinition = generateSchemaTypescript(tables, finalConfig);

  fs.writeFileSync(params.outputTypescriptFile, schemaDefinition);
  await runPrettierOnSchemaFile(params.outputTypescriptFile);
};
