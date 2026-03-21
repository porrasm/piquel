import type { SqlParameter, SQLDefinition, TemplateQuery } from "../types";

const assertDefined = <T>(value: T | undefined | null, errorMessage: string): T => {
  if (value === undefined || value === null) {
    throw new Error(errorMessage);
  }
  return value;
};
import {
  sqlDefinitionSchema,
  sqlParameterSchema,
  templateQuerySchema,
} from "./sql-schema";

class SqlDefinitionBuilder {
  private previousQueryParts: string[];
  private currentQueryPart: string;
  private sqlParameters: SqlParameter[];

  constructor() {
    this.previousQueryParts = [];
    this.currentQueryPart = "";
    this.sqlParameters = [];
  }

  appendRawSql(sql: string) {
    this.currentQueryPart += sql;
  }

  appendSubQuery({ templateSqlQuery, sqlParameters }: SQLDefinition) {
    for (let i = 0; i < templateSqlQuery.length; i++) {
      this.appendRawSql(
        assertDefined(templateSqlQuery[i], "Template SQL query is undefined")
      );
      if (i >= sqlParameters.length) {
        continue;
      }

      const parameter = sqlParameters[i];

      // Null values are allowed here so we check for undefined only
      if (parameter === undefined) {
        throw new Error("Undefined SQL parameter");
      }

      const subQueryParameter = sqlDefinitionSchema.safeParse(parameter);

      if (subQueryParameter.success) {
        this.appendSubQuery(subQueryParameter.data);
      } else {
        this.appendSqlParameter(parameter);
      }
    }
  }

  appendSqlParameter(sqlParameter: SqlParameter) {
    this.previousQueryParts.push(this.currentQueryPart);
    this.currentQueryPart = "";
    this.sqlParameters.push(sqlParameter);
  }

  build(): SQLDefinition {
    return {
      templateSqlQuery: [...this.previousQueryParts, this.currentQueryPart],
      sqlParameters: this.sqlParameters,
    };
  }
}

const combineQueryAndParameters = (
  templateQueryParts: string[],
  sqlParameters: SqlParameter[]
): SQLDefinition => {
  if (templateQueryParts.length !== sqlParameters.length + 1) {
    throw new Error("Template query parts and SQL parameters count mismatch");
  }

  const builder = new SqlDefinitionBuilder();
  builder.appendSubQuery({
    templateSqlQuery: templateQueryParts,
    sqlParameters,
  });

  return builder.build();
};

const generateSqlDefinition = (
  templateQuery: TemplateQuery,
  sqlParameters: SqlParameter[]
): SQLDefinition => {
  if (typeof templateQuery === "string") {
    return {
      templateSqlQuery: [templateQuery],
      sqlParameters: [],
    };
  }

  return combineQueryAndParameters(templateQuery, sqlParameters);
};

/** Creates a SQL definition from a template query and SQL parameters. */
export const sql = (
  templateQueryRaw: TemplateStringsArray,
  ...sqlParametersRaw: SqlParameter[]
): SQLDefinition => {
  const templateQuery = templateQuerySchema.parse(templateQueryRaw);
  const sqlParameters = sqlParameterSchema.array().parse(sqlParametersRaw);
  return generateSqlDefinition(templateQuery, sqlParameters);
};
