import { runSchemaGeneration, sql } from "../src/index";
import { pool, db } from "./db";
import { resetAndSeed } from "./seed";
import {
  getActorFilmography,
  findActor,
  listActors,
  listFilmsByCategory,
  searchFilms,
  hireActorForFilm,
} from "./services";

const runSchemaGen = async () => {
  console.log("Running schema generation...");
  await runSchemaGeneration({
    pool,
    outputTypescriptFile: "examples/generated-schema.ts",
  });
  console.log("Schema written to examples/generated-schema.ts");
};

const runQueries = async () => {
  // List all actors
  const actors = await listActors();
  console.log("\n--- All actors ---");
  console.table(actors);

  // Get a single actor's filmography
  const { actor, films } = await getActorFilmography(1);
  console.log(`\n--- Filmography: ${actor.first_name} ${actor.last_name} ---`);
  console.table(films);

  // queryOneOrNone — actor that doesn't exist
  const ghost = await findActor(999);
  console.log("\n--- Find actor 999 ---");
  console.log(ghost); // null

  // Films by category
  const actionFilms = await listFilmsByCategory("Action");
  console.log("\n--- Action films ---");
  console.table(actionFilms);

  // Dynamic search with nested sql composition
  const cheapFilms = await searchFilms({ maxRate: 1 });
  console.log("\n--- Films with rental_rate <= 1.00 ---");
  console.table(cheapFilms);

  const filtered = await searchFilms({ title: "ac", minRate: 2 });
  console.log('\n--- Films matching "ac" with rate >= 2.00 ---');
  console.table(filtered);

  // Transaction: hire a new actor for a film
  const newActor = await hireActorForFilm("Burt", "Reynolds", 1);
  console.log("\n--- Hired new actor (transaction) ---");
  console.log(newActor);

  // Verify the new actor shows up in the filmography
  const { actor: burt, films: burtFilms } = await getActorFilmography(
    newActor.actor_id,
  );
  console.log(`\n--- Filmography: ${burt.first_name} ${burt.last_name} ---`);
  console.table(burtFilms);

  // Raw query without a validator
  const timeResult = await db.client.query(sql`SELECT now() AS server_time`);
  console.log("\n--- Raw query (no validator) ---");
  console.log(timeResult);
};

const main = async () => {
  try {
    await resetAndSeed();

    if (process.env.RUN_SCHEMA_GEN === "true") {
      await runSchemaGen();
    } else {
      await runQueries();
    }
  } finally {
    await pool.end();
  }
};

void main();
