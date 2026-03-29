# Operations

`createOperation` pairs a SQL preparer function with a Zod validator, producing a reusable, context-agnostic query unit.

## Creating an operation

```ts
import { z } from "zod";
import { createOperation, sql } from "piquel";

const userSchema = z.object({
  user_id: z.number(),
  name: z.string(),
});

const getUserById = createOperation(
  ({ id }: { id: number }) =>
    sql`SELECT user_id, name FROM users WHERE user_id = ${id}`,
  userSchema,
);
```

## Using an operation

Pass the prepared operation directly to any query method:

```ts
const user = await db.client.queryOne(getUserById({ id: 1 }));
```

The same operation works with both a normal client and a transaction client:

```ts
await db.transact(async (tx) => {
  const user = await tx.queryOne(getUserById({ id: 1 }));
});
```

## Static SQL operations

If the query doesn't need arguments, you can pass a static `sql` definition:

```ts
const getAllUsers = createOperation(
  sql`SELECT user_id, name FROM users`,
  userSchema,
);

const users = await db.client.query(getAllUsers({}));
```

## Type utilities

- `OperationBuilder<Args, R>` — the type of the function returned by `createOperation`
- `OperationResult<T>` — extracts the row result type from an `OperationBuilder`

```ts
import type { OperationResult } from "piquel";

type UserRow = OperationResult<typeof getUserById>;
// { user_id: number; name: string }
```

See [`examples/operations.ts`](../examples/operations.ts) and [`examples/services.ts`](../examples/services.ts) for a runnable demo.
