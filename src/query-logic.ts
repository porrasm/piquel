import { type PoolClient } from "./external-types";
import type { ClientMetadata, SQLDefinition } from "./types";
import sqlTemplateStrings from "sql-template-strings";

export const runUsingTransaction = async <T>(
  client: PoolClient,
  fn: () => Promise<T>
) => {
  try {
    await client.query("BEGIN");
    const result = await fn();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

type RunSqlParams = {
  client: PoolClient;
  sql: SQLDefinition;
  clientMetadata: ClientMetadata;
};

const sqlDefinitionToSqlStatement = (sql: SQLDefinition) => {
  if (sql.templateSqlQuery.length !== sql.sqlParameters.length + 1) {
    throw new Error("Template query parts and SQL parameters count mismatch");
  }

  return sqlTemplateStrings(sql.templateSqlQuery, ...sql.sqlParameters);
};

const runTransactionStatement = async ({ client, sql }: RunSqlParams) => {
  const sqlStatement = sqlDefinitionToSqlStatement(sql);
  return client.query(sqlStatement);
};

const runNormalStatement = ({ client, sql }: RunSqlParams) => {
  const sqlStatement = sqlDefinitionToSqlStatement(sql);
  try {
    return client.query(sqlStatement);
  } finally {
    client.release();
  }
};

export const runSqlStatement = async (params: RunSqlParams) =>
  params.clientMetadata.type === "transaction"
    ? runTransactionStatement(params)
    : runNormalStatement(params);
