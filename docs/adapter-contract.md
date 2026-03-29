# Adapter Contract

`createDatabase` accepts any pool that implements the `PoolLike` interface. This makes Piquel compatible with different PostgreSQL client libraries.

## Interfaces

```ts
interface PoolLike {
  connect(): Promise<PoolClientLike>;
}

interface PoolClientLike {
  release(): void;
  query(sql: string | { text: string; values: any[] }): Promise<{ rows: any[] }>;
}
```

## Using with `pg`

`pg.Pool` satisfies `PoolLike` out of the box:

```ts
import pg from "pg";
import { createDatabase } from "piquel";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = createDatabase({ pool, useZodValidation: true });
```

## Using with other drivers

Any driver that implements `connect() → client` with `query()` and `release()` will work. Wrap your driver if needed:

```ts
import { createDatabase, type PoolLike } from "piquel";

const pool: PoolLike = {
  connect: async () => {
    const conn = await myDriver.getConnection();
    return {
      query: (sql) => conn.execute(sql),
      release: () => conn.close(),
    };
  },
};

const db = createDatabase({ pool, useZodValidation: true });
```
