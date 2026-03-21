import { z } from "zod";
import type { ForeignKey } from "./schema-generator";
import { SchemaGenerationConfig } from "../types";
import { ZOD_ARRAY_TYPE_MAP, ZOD_TYPE_MAP } from "./psql-zod-types";

const ARRAY_DATA_TYPE = "ARRAY";

const IGNORE_TABLES = new Set([
  "pg_stat_statements",
  "pg_stat_statements_info",
  "pgmigrations",
  "pg_stat_activity",
  "pg_stat_bgwriter",
  "pg_stat_database",
  "pg_stat_database_conflicts",
  "migrations",
]);

const ZOD_NULLABLE_SUFFIX = ".nullable()";

export type ColumnToGenerate = {
  name: string;
  isPrimaryKey: boolean;
  zodType: string;
  zodTypeWithoutNullable: string;
};

export type TableToGenerate = {
  name: string;
  columns: ColumnToGenerate[];
};

export const publicSchemaValidator = z.object({
  table_schema: z.string(),
  table_name: z.string(),
  column_name: z.string(),
  data_type: z.string(),
  is_nullable: z.string(),
  udt_name: z.string(),
});

export type PublicSchemaRow = z.infer<typeof publicSchemaValidator>;

const getZodType = (row: PublicSchemaRow): string | null => {
  // Array type information does not contain the element type
  if (row.data_type === ARRAY_DATA_TYPE) {
    return ZOD_ARRAY_TYPE_MAP[row.udt_name] ?? null;
  }
  return ZOD_TYPE_MAP[row.data_type] ?? null;
};

const parseColumn = (row: PublicSchemaRow): ColumnToGenerate => {
  const zodType = getZodType(row);
  if (!zodType) {
    throw new Error(
      `Unknown data type: ${row.data_type}: \n${JSON.stringify(row, null, 2)}`,
    );
  }

  const suffix = row.is_nullable === "YES" ? ZOD_NULLABLE_SUFFIX : "";

  return {
    name: row.column_name,
    zodType: `${zodType}${suffix}`,
    zodTypeWithoutNullable: `${zodType}`,
    isPrimaryKey: row.column_name === `${row.table_name}_id`,
  };
};

export const parsePublicSchema = (
  rows: PublicSchemaRow[],
  foreignKeys: ForeignKey[],
  config: SchemaGenerationConfig,
): TableToGenerate[] => {
  const tableIds = rows
    .filter((row) => row.column_name === `${row.table_name}_id`)
    .map((row) => row.column_name);

  const tables = new Map<string, TableToGenerate>();

  rows.forEach((row) => {
    if (IGNORE_TABLES.has(row.table_name)) {
      return;
    }

    const table = tables.get(row.table_name) ?? {
      name: row.table_name,
      columns: [],
    };

    const foreignKey = foreignKeys.find(
      (foreignKey) =>
        foreignKey.table_name === row.table_name &&
        foreignKey.column_name === row.column_name,
    );
    if (foreignKey && tableIds.includes(foreignKey.foreign_column_name)) {
      const transformedForeignKeyTableName = config.tableNameTransform(
        foreignKey.foreign_table_name,
      );
      const suffix = row.is_nullable === "YES" ? ZOD_NULLABLE_SUFFIX : "";
      table.columns.push({
        name: row.column_name,
        zodType: `${transformedForeignKeyTableName}${config.primaryKeySuffix}Schema${suffix}`,
        zodTypeWithoutNullable: `${transformedForeignKeyTableName}${config.primaryKeySuffix}Schema`,
        // Todo: recognize primary key automatically
        isPrimaryKey: row.column_name === `${row.table_name}_id`,
      });
    } else {
      table.columns.push(parseColumn(row));
    }

    tables.set(row.table_name, table);
  });
  for (const table of tables.values()) {
    table.columns.sort((a, b) => a.name.localeCompare(b.name));
  }
  return Array.from(tables.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
};
