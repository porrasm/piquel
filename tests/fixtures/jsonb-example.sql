CREATE TABLE simple_jsonb_example (
  id SERIAL PRIMARY KEY,
  payload JSONB NOT NULL
);

INSERT INTO simple_jsonb_example (payload)
VALUES (
  '{
    "user": {
      "name": "Alice",
      "profile": {
        "city": "Berlin"
      }
    }
  }'::jsonb
);
