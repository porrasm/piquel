type SQLStatementLike = {
  text: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any[];
};

type QueryResultLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
};

export type PoolClientLike = {
  release: () => void;
  query: (sql: string | SQLStatementLike) => Promise<QueryResultLike>;
};
export type PoolLike = {
  connect: () => Promise<PoolClientLike>;
};
