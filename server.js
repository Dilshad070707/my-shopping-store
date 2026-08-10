require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
const PORT = Number(process.env.PORT || 5000);

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "*";
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`;

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV = String(process.env.CASHFREE_ENV || "sandbox").toLowerCase();
const CASHFREE_API_VERSION =
  process.env.CASHFREE_API_VERSION || "2025-01-01";
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();

if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is missing.");
  process.exit(1);
}

if (!JWT_SECRET || JWT_SECRET.length < 32 || JWT_SECRET.toLowerCase().includes("secret")) {
  console.error(
    "FATAL: JWT_SECRET must be a random value of at least 32 characters."
  );
  process.exit(1);
}

if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
  console.error(
    "FATAL: CASHFREE_APP_ID and CASHFREE_SECRET_KEY are required."
  );
  process.exit(1);
}

if (!["sandbox", "production"].includes(CASHFREE_ENV)) {
  console.error("FATAL: CASHFREE_ENV must be sandbox or production.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

app.use(helmet());

const allowedOrigins =
  FRONTEND_URL === "*"
    ? true
    : FRONTEND_URL.split(",")
        .map((x) => x.trim())
        .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(express.json({ limit: "15mb" }));

/* =========================================================
   DATABASE INITIALIZATION
   ========================================================= */

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        phone VARCHAR(15),
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(120) UNIQUE NOT NULL,
        image_url TEXT,
        published BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        description TEXT,
        specifications JSONB,
        price NUMERIC(10,2) NOT NULL,
        mrp NUMERIC(10,2) NOT NULL,
        discount NUMERIC(5,2) DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        published BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        size VARCHAR(50),
        color VARCHAR(50),
        sku VARCHAR(60) UNIQUE NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(100) NOT NULL,
        mobile VARCHAR(15) NOT NULL,
        house_flat VARCHAR(100) NOT NULL,
        street VARCHAR(200) NOT NULL,
        locality VARCHAR(100),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        address_type VARCHAR(20) NOT NULL DEFAULT 'HOME',
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0)
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS cart_user_product_unique
      ON cart(user_id, product_id)
      WHERE variant_id IS NULL
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS cart_user_product_variant_unique
      ON cart(user_id, product_id, variant_id)
      WHERE variant_id IS NOT NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(60) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        total_amount NUMERIC(10,2) NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'PENDING_PAYMENT',
        shipping_address JSONB NOT NULL,
        payment_id VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(60) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        quantity INTEGER NOT NULL,
        price NUMERIC(10,2) NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        moderated BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title VARCHAR(150),
        image_url TEXT NOT NULL,
        link_url TEXT,
        published BOOLEAN NOT NULL DEFAULT TRUE,
        position INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS products_published_index
      ON products(published)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS products_category_index
      ON products(category_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS orders_user_index
      ON orders(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS addresses_user_index
      ON addresses(user_id)
    `);

    await client.query(`
      INSERT INTO store_settings (key, value)
      VALUES ('telegram_support_username', 'MeeshooSupport')
      ON CONFLICT (key) DO NOTHING
    `);

    await client.query("COMMIT");

    console.log("Database initialized successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database initialization failed:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   AUTH HELPERS
   ========================================================= */

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: "Login required."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      error: "Session expired. Please login again."
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      error: "Admin access required."
    });
  }

  next();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email
