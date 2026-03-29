import { z } from "zod";
import { createOperation, sql } from "../src/index";

// -- Schemas --

const actorSchema = z.object({
  actor_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
});

const filmSchema = z.object({
  film_id: z.number(),
  title: z.string(),
  release_year: z.number(),
  rental_rate: z.coerce.number(),
});

const filmWithCategorySchema = z.object({
  film_id: z.number(),
  title: z.string(),
  release_year: z.number(),
  rental_rate: z.coerce.number(),
  category: z.string(),
});

// -- Operations --

export const getActorById = createOperation(
  ({ actorId }: { actorId: number }) =>
    sql`SELECT * FROM actor WHERE actor_id = ${actorId}`,
  actorSchema,
);

export const getAllActors = createOperation(
  sql`SELECT * FROM actor ORDER BY actor_id`,
  actorSchema,
);

export const getFilmsByActor = createOperation(
  ({ actorId }: { actorId: number }) =>
    sql`SELECT f.*
        FROM film f
        JOIN film_actor fa ON f.film_id = fa.film_id
        WHERE fa.actor_id = ${actorId}
        ORDER BY f.title`,
  filmSchema,
);

export const getFilmsWithCategory = createOperation(
  ({ categoryName }: { categoryName: string }) =>
    sql`SELECT f.*, c.name AS category
        FROM film f
        JOIN film_category fc ON f.film_id = fc.film_id
        JOIN category c ON fc.category_id = c.category_id
        WHERE c.name = ${categoryName}
        ORDER BY f.title`,
  filmWithCategorySchema,
);

export const insertActor = createOperation(
  ({ firstName, lastName }: { firstName: string; lastName: string }) =>
    sql`INSERT INTO actor (first_name, last_name)
        VALUES (${firstName}, ${lastName})
        RETURNING *`,
  actorSchema,
);

export const linkActorToFilm = createOperation(
  ({ actorId, filmId }: { actorId: number; filmId: number }) =>
    sql`INSERT INTO film_actor (actor_id, film_id)
        VALUES (${actorId}, ${filmId})`,
  z.void(),
);
