import { z } from "zod";
import { sql } from "../database/sql/sql-builder";
import { createOperation } from "../database/operations";
import type { EnumType } from "./table-parser";

export const publicSchemaValidator = z.object({
  table_schema: z.string(),
  table_name: z.string(),
  column_name: z.string(),
  data_type: z.string(),
  is_nullable: z.string(),
  udt_name: z.string(),
});

export type PublicSchemaRow = z.infer<typeof publicSchemaValidator>;

const foreignKeyValidator = z.object({
  table_name: z.string(),
  column_name: z.string(),
  foreign_table_name: z.string(),
  foreign_column_name: z.string(),
});

export type ForeignKey = z.infer<typeof foreignKeyValidator>;

const primaryKeyValidator = z.object({
  table_name: z.string(),
  column_name: z.string(),
});

export type PrimaryKey = z.infer<typeof primaryKeyValidator>;

const enumRowValidator = z.object({
  typname: z.string(),
  enumlabel: z.string(),
});

type EnumRow = z.infer<typeof enumRowValidator>;

export const fetchColumns = createOperation(
  sql`SELECT * FROM information_schema.columns WHERE table_schema = 'public'`,
  publicSchemaValidator,
);

export const fetchForeignKeys = createOperation(
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

export const fetchPrimaryKeys = createOperation(
  sql`
    SELECT
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema='public'`,
  primaryKeyValidator,
);

export const fetchEnumRows = createOperation(
  sql`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder`,
  enumRowValidator,
);

export const groupEnumRows = (enumRows: EnumRow[]): EnumType[] => {
  const enumMap = new Map<string, string[]>();
  for (const row of enumRows) {
    const labels = enumMap.get(row.typname) ?? [];
    labels.push(row.enumlabel);
    enumMap.set(row.typname, labels);
  }

  const enumTypes: EnumType[] = [];
  for (const [name, labels] of enumMap) {
    enumTypes.push({ name, labels });
  }

  return enumTypes;
};
