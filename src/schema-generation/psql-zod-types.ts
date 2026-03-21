export const ZOD_TYPE_MAP: { [key: string]: string } = {
  bigint: "z.string()",
  text: "z.string()",
  "timestamp with time zone": "z.date()",
  "timestamp without time zone": "z.date()",
  date: "z.date()",
  integer: "z.number().int()",
  boolean: "z.boolean()",
  uuid: "z.uuid()",
  "double precision": "z.number()",
  "character varying": "z.string()",
  point: `z.object({
    x: z.number(),
    y: z.number(),
  })`,
  oid: "z.number()",
  bytea: "z.instanceof(Buffer)",
  numeric: "z.number()",
  jsonb: "z.object({})",
};

export const ZOD_ARRAY_TYPE_MAP: { [key: string]: string } = {
  _int4: "z.array(z.number().int())",
  _text: "z.array(z.string())",
  _polygon: "z.array(z.any())",
};
