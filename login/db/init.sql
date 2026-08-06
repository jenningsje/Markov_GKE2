CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

INSERT INTO users (email, password_hash)
VALUES (
  'drcd@wellspringcv.com',
  '$2b$10$oDkmDQag5BqGw1xjyb9X7.xCVATrxlLppFR9QKuWruFzncjM8nUA6'
)
ON CONFLICT (email) DO NOTHING;
