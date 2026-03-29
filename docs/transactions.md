# Transactions

`db.transact()` runs a callback inside a `BEGIN`/`COMMIT` block. If the callback throws, the transaction is automatically rolled back.

## Usage

```ts
await db.transact(async (tx) => {
  await tx.nonQuery(
    sql`UPDATE accounts SET balance = balance - ${100} WHERE user_id = ${1}`,
  );
  await tx.nonQuery(
    sql`UPDATE accounts SET balance = balance + ${100} WHERE user_id = ${2}`,
  );
});
```

## Return values

The transaction callback can return a value:

```ts
const user = await db.transact(async (tx) => {
  await tx.nonQuery(sql`UPDATE users SET name = ${"John"} WHERE id = ${1}`);
  return tx.queryOne(getUserById({ id: 1 }));
});
```

## Transaction client

The `tx` parameter is a full `DBClient` — it supports all four query methods (`query`, `queryOne`, `queryOneOrNone`, `nonQuery`). Operations created with `createOperation` work seamlessly inside transactions.

## Semantics

- **Commit:** automatic on successful callback return
- **Rollback:** automatic if the callback throws

See `hireActorForFilm` in [`examples/services.ts`](../examples/services.ts) for a runnable demo.
