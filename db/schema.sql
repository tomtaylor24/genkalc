CREATE TABLE users (
  id            CHAR(36)     NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_demo       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_key (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ingredients (
  id                BIGINT        NOT NULL AUTO_INCREMENT,
  user_id           CHAR(36)      NOT NULL,
  name              VARCHAR(30)   NOT NULL,
  name_kana         VARCHAR(50)       NULL,
  purchase_price    DECIMAL(10,2) NOT NULL,
  purchase_quantity DECIMAL(10,2) NOT NULL,
  unit              VARCHAR(10)   NOT NULL,
  yield_rate        DECIMAL(10,2) NOT NULL DEFAULT 100,
  tax_add_rate      DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier          VARCHAR(50)       NULL,
  note              VARCHAR(500)      NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ingredients_user_id_name_key (user_id, name),
  CONSTRAINT ingredients_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ingredients_yield_rate_check CHECK (yield_rate > 0 AND yield_rate <= 100),
  CONSTRAINT ingredients_tax_add_rate_check CHECK (tax_add_rate IN (0, 8, 10))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dishes (
  id            BIGINT        NOT NULL AUTO_INCREMENT,
  user_id       CHAR(36)      NOT NULL,
  name          VARCHAR(30)   NOT NULL,
  selling_price DECIMAL(10,2)     NULL,
  note          VARCHAR(500)      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY dishes_user_id_name_key (user_id, name),
  CONSTRAINT dishes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  user_id    CHAR(36)    NOT NULL,
  name       VARCHAR(20) NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY categories_user_id_name_key (user_id, name),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dish_ingredients (
  id            BIGINT        NOT NULL AUTO_INCREMENT,
  dish_id       BIGINT        NOT NULL,
  ingredient_id BIGINT        NOT NULL,
  quantity      DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY dish_ingredients_dish_id_ingredient_id_key (dish_id, ingredient_id),
  CONSTRAINT dish_ingredients_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
  CONSTRAINT dish_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dish_categories (
  id          BIGINT   NOT NULL AUTO_INCREMENT,
  dish_id     BIGINT   NOT NULL,
  category_id BIGINT   NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY dish_categories_dish_id_category_id_key (dish_id, category_id),
  CONSTRAINT dish_categories_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
  CONSTRAINT dish_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  user_id    CHAR(36)    NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME    NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY password_reset_tokens_token_hash_key (token_hash),
  CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ingredient_price_history (
  id                BIGINT        NOT NULL AUTO_INCREMENT,
  ingredient_id     BIGINT        NOT NULL,
  purchase_price    DECIMAL(10,2) NOT NULL,
  purchase_quantity DECIMAL(10,2) NOT NULL,
  yield_rate        DECIMAL(10,2) NOT NULL,
  tax_add_rate      DECIMAL(10,2) NOT NULL,
  changed_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT ingredient_price_history_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
