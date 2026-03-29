import { sql } from "../src/index";
import { db } from "./db";

export const resetAndSeed = async () => {
  console.log("Resetting database...");

  await db.client.nonQuery(sql`DROP TABLE IF EXISTS film_actor`);
  await db.client.nonQuery(sql`DROP TABLE IF EXISTS film_category`);
  await db.client.nonQuery(sql`DROP TABLE IF EXISTS film`);
  await db.client.nonQuery(sql`DROP TABLE IF EXISTS actor`);
  await db.client.nonQuery(sql`DROP TABLE IF EXISTS category`);

  await db.client.nonQuery(sql`
    CREATE TABLE actor (
      actor_id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL
    )
  `);

  await db.client.nonQuery(sql`
    CREATE TABLE film (
      film_id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      release_year INTEGER NOT NULL,
      rental_rate NUMERIC(4,2) NOT NULL DEFAULT 4.99
    )
  `);

  await db.client.nonQuery(sql`
    CREATE TABLE category (
      category_id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  await db.client.nonQuery(sql`
    CREATE TABLE film_actor (
      actor_id INTEGER NOT NULL REFERENCES actor(actor_id),
      film_id INTEGER NOT NULL REFERENCES film(film_id),
      PRIMARY KEY (actor_id, film_id)
    )
  `);

  await db.client.nonQuery(sql`
    CREATE TABLE film_category (
      film_id INTEGER NOT NULL REFERENCES film(film_id),
      category_id INTEGER NOT NULL REFERENCES category(category_id),
      PRIMARY KEY (film_id, category_id)
    )
  `);

  console.log("Seeding data...");

  // Actors
  await db.client.nonQuery(
    sql`INSERT INTO actor (first_name, last_name) VALUES
      (${"Penelope"}, ${"Guiness"}),
      (${"Nick"}, ${"Wahlberg"}),
      (${"Ed"}, ${"Chase"}),
      (${"Jennifer"}, ${"Davis"}),
      (${"Johnny"}, ${"Lollobrigida"})`,
  );

  // Films
  await db.client.nonQuery(
    sql`INSERT INTO film (title, release_year, rental_rate) VALUES
      (${"Academy Dinosaur"}, ${2006}, ${0.99}),
      (${"Ace Goldfinger"}, ${2006}, ${4.99}),
      (${"Adaptation Holes"}, ${2006}, ${2.99}),
      (${"Affair Prejudice"}, ${2006}, ${2.99}),
      (${"African Egg"}, ${2006}, ${2.99})`,
  );

  // Categories
  await db.client.nonQuery(
    sql`INSERT INTO category (name) VALUES
      (${"Action"}), (${"Comedy"}), (${"Drama"})`,
  );

  // Film-actor links
  await db.client.nonQuery(
    sql`INSERT INTO film_actor (actor_id, film_id) VALUES
      (${1}, ${1}), (${1}, ${2}),
      (${2}, ${1}), (${2}, ${3}),
      (${3}, ${2}), (${3}, ${4}),
      (${4}, ${3}), (${4}, ${5}),
      (${5}, ${4}), (${5}, ${5})`,
  );

  // Film-category links
  await db.client.nonQuery(
    sql`INSERT INTO film_category (film_id, category_id) VALUES
      (${1}, ${1}), (${2}, ${1}),
      (${3}, ${2}), (${4}, ${3}),
      (${5}, ${2})`,
  );

  console.log("Database seeded.");
};
