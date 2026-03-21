import z from "zod";

export const templateQuerySchema = z.union([z.string(), z.array(z.string())]);

export const sqlDefinitionSchema = z.object({
  templateSqlQuery: z.array(z.string()),
  sqlParameters: z.array(z.any()),
});

const jsonPropertyTypeSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const jsonPropertySchema = z.union([
  jsonPropertyTypeSchema,
  z.array(jsonPropertyTypeSchema),
  z.record(z.string(), jsonPropertyTypeSchema),
]);

export const sqlParameterSchema = z.union([
  jsonPropertySchema,
  sqlDefinitionSchema,
  z.date(),
]);
