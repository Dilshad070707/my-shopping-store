require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 5000);

const DATABASE_URL = String(
  process.env.DATABASE_URL || ""
).trim();

const FRONTEND_URL = String(
  process.env.FRONTEND_URL || "*"
).trim();

const JWT_SECRET = String(
  process.env.JWT_SECRET || ""
).trim();

const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || ""
).trim().toLowerCase();

const ADMIN_PASSWORD = String(
  process.env.ADMIN_PASSWORD || ""
);

const ADMIN_PASSWORD_HASH = String(
  process.env.ADMIN_PASSWORD_HASH || ""
).trim();

/* =========================================================
   REQUIRED ENVIRONMENT VARIABLES
   ========================================================= */

if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is missing.");
  process.exit(1);
}

if (
  !JWT_SECRET ||
  !ADMIN_EMAIL ||
  (!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH)
) {
  console.error(
    "FATAL: Set JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD."
  );

  process.exit(1);
}

/* =========================================================
   POSTGRESQL
   ========================================================= */

const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000,
});

/* =========================================================
   SECURITY / MIDDLEWARE
   ========================================================= */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

const allowedOrigins =
  FRONTEND_URL === "*"
    ? true
    : FRONTEND_URL
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "100mb",
  })
);

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many admin login attempts. Please try again later." },
});

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizePhone(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

function validatePincode(pincode) {
  return /^\d{6}$/.test(
    String(pincode || "").trim()
  );
}

function money(value) {
  return Number(
    Number(value).toFixed(2)
  );
}

function positiveInt(value, fallback = 0) {
  const number = Number(value);

  if (
    Number.isInteger(number) &&
    number >= 0
  ) {
    return number;
  }

  return fallback;
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${crypto
    .randomBytes(5)
    .toString("hex")}`;
}

function sanitizeAddress(address) {
  return {
    line1: String(
      address?.line1 || ""
    ).trim(),

    city: String(
      address?.city || ""
    ).trim(),

    state: String(
      address?.state || ""
    ).trim(),

    pincode: String(
      address?.pincode || ""
    ).trim(),
  };
}

function validateAddress(address) {
  const clean =
    sanitizeAddress(address);

  if (!clean.line1) {
    return "Address is required.";
  }

  if (!clean.city) {
    return "City is required.";
  }

  if (!clean.state) {
    return "State is required.";
  }

  if (
    !validatePincode(
      clean.pincode
    )
  ) {
    return "A valid 6-digit PIN code is required.";
  }

  return null;
}

function sanitizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) =>
      String(image || "").trim()
    )
    .filter(Boolean)
    .slice(0, 20);
}

function sanitizeSizes(sizes) {
  if (!Array.isArray(sizes)) return [];

  return sizes
    .map((entry) => ({
      size: String(entry?.size || "").trim().toUpperCase(),
      stock: Math.max(0, Math.floor(Number(entry?.stock || 0))),
    }))
    .filter((entry) => entry.size)
    .slice(0, 30);
}

function totalSizeStock(sizes) {
  return sanitizeSizes(sizes).reduce(
    (sum, entry) => sum + Number(entry.stock || 0),
    0
  );
}

function productFromRow(row) {
  return {
    id: row.id,

    name: row.name,

    sku: row.sku,

    category: row.category,

    price: Number(row.price),

    mrp: Number(row.mrp),

    discount: Number(
      row.discount
    ),

    rating: Number(
      row.rating
    ),

    reviews: Number(
      row.reviews
    ),

    stock: Number(
      row.stock
    ),

    sizes: Array.isArray(row.sizes)
      ? row.sizes
      : [],

    images: Array.isArray(
      row.images
    )
      ? row.images
      : [],

    description:
      row.description || "",

    active: Boolean(
      row.active
    ),

    best_selling: Boolean(row.best_selling),
    new_arrival: Boolean(row.new_arrival),
    featured: Boolean(row.featured),

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,
  };
}

/* =========================================================
   ADMIN AUTH
   ========================================================= */

function adminTokenPayload() {
  return {
    role: "admin",
    email: ADMIN_EMAIL,
  };
}

function requireAdmin(
  req,
  res,
  next
) {
  try {
    const header = String(
      req.headers.authorization || ""
    );

    const token =
      header.startsWith(
        "Bearer "
      )
        ? header
            .slice(7)
            .trim()
        : "";

    if (!token) {
      return res.status(401).json({
        message:
          "Admin login required.",
      });
    }

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    if (
      decoded?.role !==
        "admin" ||
      decoded?.email !==
        ADMIN_EMAIL
    ) {
      return res.status(403).json({
        message:
          "Invalid admin session.",
      });
    }

    req.admin = decoded;

    next();
  } catch {
    return res.status(401).json({
      message:
        "Admin session expired. Please login again.",
    });
  }
}

async function passwordMatches(
  password
) {
  if (ADMIN_PASSWORD_HASH) {
    return bcrypt.compare(
      password,
      ADMIN_PASSWORD_HASH
    );
  }

  const a = Buffer.from(
    String(password)
  );

  const b = Buffer.from(
    String(ADMIN_PASSWORD)
  );

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    a,
    b
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */

async function getSetting(
  key,
  fallback = null
) {
  const result =
    await pool.query(
      `
      SELECT value
      FROM store_settings
      WHERE key = $1
      `,
      [key]
    );

  if (!result.rows.length) {
    return fallback;
  }

  return result.rows[0].value;
}

async function setSetting(
  key,
  value
) {
  await pool.query(
    `
    INSERT INTO store_settings
      (key, value, updated_at)
    VALUES
      ($1, $2::jsonb, CURRENT_TIMESTAMP)

    ON CONFLICT (key)
    DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      key,
      JSON.stringify(value),
    ]
  );
}

/* =========================================================
   DATABASE INITIALIZATION
   ========================================================= */

async function initializeDatabase() {
  /* USERS */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_users (
      id SERIAL PRIMARY KEY,

      email VARCHAR(255)
        UNIQUE NOT NULL,

      name VARCHAR(150),

      phone VARCHAR(20),

      created_at
        TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ORDERS */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_orders (
      id VARCHAR(100) PRIMARY KEY,

      email VARCHAR(255)
        NOT NULL,

      customer_name VARCHAR(150)
        NOT NULL,

      phone VARCHAR(20)
        NOT NULL,

      address JSONB
        NOT NULL,

      items JSONB
        NOT NULL,

      amount NUMERIC(10,2)
        NOT NULL,

      payment_status VARCHAR(30)
        NOT NULL
        DEFAULT 'PENDING_PAYMENT',

      payment_method VARCHAR(30)
        NOT NULL
        DEFAULT 'UPI',

      transaction_reference VARCHAR(150),

      payment_screenshot_url TEXT,

      payment_id VARCHAR(150),

      order_status VARCHAR(30)
        NOT NULL
        DEFAULT 'NEW',

      admin_note TEXT,

      stock_released BOOLEAN
        NOT NULL
        DEFAULT FALSE,

      cashfree_order_id VARCHAR(100),

      created_at
        TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at
        TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* MIGRATE OLD ORDERS */

  await pool.query(`
    ALTER TABLE store_orders

      ADD COLUMN IF NOT EXISTS
        payment_method VARCHAR(30)
        NOT NULL
        DEFAULT 'UPI',

      ADD COLUMN IF NOT EXISTS
        transaction_reference VARCHAR(150),

      ADD COLUMN IF NOT EXISTS
        payment_screenshot_url TEXT,

      ADD COLUMN IF NOT EXISTS
        order_status VARCHAR(30)
        NOT NULL
        DEFAULT 'NEW',

      ADD COLUMN IF NOT EXISTS
        admin_note TEXT,

      ADD COLUMN IF NOT EXISTS
        stock_released BOOLEAN
        NOT NULL
        DEFAULT FALSE
  `);

  /* PRODUCTS */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_products (
      id VARCHAR(100)
        PRIMARY KEY,

      name VARCHAR(255)
        NOT NULL,

      sku VARCHAR(100)
        UNIQUE,

      category VARCHAR(100)
        NOT NULL,

      price NUMERIC(10,2)
        NOT NULL,

      mrp NUMERIC(10,2)
        NOT NULL,

      discount NUMERIC(5,2)
        NOT NULL
        DEFAULT 0,

      rating NUMERIC(3,1)
        NOT NULL
        DEFAULT 4.5,

      reviews INTEGER
        NOT NULL
        DEFAULT 0,

      stock INTEGER
        NOT NULL
        DEFAULT 0,

      sizes JSONB
        NOT NULL
        DEFAULT '[]'::jsonb,

      images TEXT[]
        NOT NULL
        DEFAULT ARRAY[]::TEXT[],

      description TEXT
        NOT NULL
        DEFAULT '',

      active BOOLEAN
        NOT NULL
        DEFAULT TRUE,

      best_selling BOOLEAN
        NOT NULL
        DEFAULT FALSE,

      new_arrival BOOLEAN
        NOT NULL
        DEFAULT FALSE,

      featured BOOLEAN
        NOT NULL
        DEFAULT FALSE,

      created_at
        TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at
        TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
      store_products_category_index
    ON store_products(category)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
      store_products_active_index
    ON store_products(active)
  `);

  await pool.query(`ALTER TABLE store_products ADD COLUMN IF NOT EXISTS best_selling BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE store_products ADD COLUMN IF NOT EXISTS new_arrival BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE store_products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE store_products ADD COLUMN IF NOT EXISTS sizes JSONB NOT NULL DEFAULT '[]'::jsonb`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_login_audit (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(255),
      ip_address VARCHAR(100),
      user_agent TEXT,
      success BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* SETTINGS */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_settings (
      key VARCHAR(100)
        PRIMARY KEY,

      value JSONB
        NOT NULL,

      updated_at
        TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ORDER INDEXES */

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
      store_orders_email_index
    ON store_orders(email)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
      store_orders_payment_index
    ON store_orders(payment_status)
  `);

  /* =======================================================
     INITIAL PRODUCTS
     Only inserted when product table is empty.
     ======================================================= */

  const countResult =
    await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM store_products
    `);

  if (
    countResult.rows[0].count ===
    0
  ) {
    const seedProducts = [
      {
        id: "p1",
        name:
          "Premium Cotton Floral Kurti",
        sku: "MSH-P001",
        category: "Women",
        price: 599,
        mrp: 1299,
        stock: 50,
        images: [
          "https://images.unsplash.com/photo-1604929846387-a365f57a3e7b?w=900&q=85",
        ],
        description:
          "Comfortable breathable cotton kurti for everyday wear.",
      },

      {
        id: "p2",
        name:
          "Men Classic Black Smartwatch",
        sku: "MSH-P002",
        category: "Electronics",
        price: 1499,
        mrp: 3999,
        stock: 120,
        images: [
          "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=900&q=85",
        ],
        description:
          "Modern smartwatch with activity tracking and notifications.",
      },

      {
        id: "p3",
        name:
          "Women's Casual Handbag",
        sku: "MSH-P003",
        category: "Women",
        price: 799,
        mrp: 1999,
        stock: 35,
        images: [
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85",
        ],
        description:
          "Spacious everyday handbag with a practical premium look.",
      },

      {
        id: "p4",
        name:
          "Premium Wireless Headphones",
        sku: "MSH-P004",
        category: "Electronics",
        price: 1299,
        mrp: 2499,
        stock: 80,
        images: [
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=85",
        ],
        description:
          "Wireless headphones with a comfortable over-ear design.",
      },

      {
        id: "p5",
        name:
          "Classic Men's Casual Shirt",
        sku: "MSH-P005",
        category: "Men",
        price: 699,
        mrp: 1299,
        stock: 60,
        images: [
          "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=85",
        ],
        description:
          "Classic casual shirt suitable for everyday wear.",
      },

      {
        id: "p6",
        name:
          "Minimal Women's Sneakers",
        sku: "MSH-P006",
        category: "Footwear",
        price: 999,
        mrp: 1799,
        stock: 42,
        images: [
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85",
        ],
        description:
          "Lightweight everyday sneakers with a minimal design.",
      },
    ];

    for (
      const product of seedProducts
    ) {
      const discount =
        product.mrp > 0
          ? Math.round(
              ((product.mrp -
                product.price) /
                product.mrp) *
                100
            )
          : 0;

      await pool.query(
        `
        INSERT INTO store_products
          (
            id,
            name,
            sku,
            category,
            price,
            mrp,
            discount,
            images,
            description,
            stock
          )
        VALUES
          (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,$10
          )

        ON CONFLICT DO NOTHING
        `,
        [
          product.id,
          product.name,
          product.sku,
          product.category,
          product.price,
          product.mrp,
          discount,
          product.images,
          product.description,
          product.stock,
        ]
      );
    }
  }

  /* =======================================================
     DEFAULT HOMEPAGE SETTINGS
     ======================================================= */

  const existingHomepage = await getSetting("homepage", null);
  if (!existingHomepage) {
    await setSetting("homepage", {
      offer_enabled: true,
      offer_title: "Welcome to MeeshooShopping",
      offer_text: "Special offers are waiting for you.",
      offer_button: "Shop Now",
      offer_image: "",
      best_selling_title: "🔥 Best Selling Products",
    });
  }

  /* =======================================================
     DEFAULT UPI SETTINGS
     ======================================================= */

  const existingPayment =
    await getSetting(
      "payment",
      null
    );

  if (!existingPayment) {
    await setSetting(
      "payment",
      {
        method: "UPI",

        enabled: true,

        upi_id: String(
          process.env.UPI_ID || ""
        ).trim(),

        upi_name: String(
          process.env.UPI_NAME ||
            "MEESHOO STORE"
        ).trim(),

        qr_image: String(
          process.env.UPI_QR_URL ||
            ""
        ).trim(),

        instructions:
          "Pay using UPI and submit the UTR/transaction reference after payment.",
      }
    );
  }

  console.log(
    "Database initialized successfully."
  );
}

/* =========================================================
   HEALTH
   ========================================================= */

app.get(
  "/health",
  async (req, res) => {
    try {
      await pool.query(
        "SELECT 1"
      );

      return res.json({
        ok: true,

        service:
          "meeshoo-backend",

        database:
          "connected",

        payment_method:
          "UPI",
      });
    } catch {
      return res
        .status(503)
        .json({
          ok: false,

          service:
            "meeshoo-backend",

          database:
            "disconnected",
        });
    }
  }
);

app.get(
  "/api/health",
  async (req, res) => {
    try {
      await pool.query(
        "SELECT 1"
      );

      return res.json({
        ok: true,
        database:
          "connected",
      });
    } catch {
      return res
        .status(503)
        .json({
          ok: false,
          database:
            "disconnected",
        });
    }
  }
);

async function auditAdminLogin(req, email, success) {
  try {
    await pool.query(
      `INSERT INTO admin_login_audit (email, ip_address, user_agent, success) VALUES ($1,$2,$3,$4)`,
      [email || null, req.ip || req.headers["x-forwarded-for"] || null, String(req.headers["user-agent"] || "").slice(0,1000), success]
    );
  } catch (error) {
    console.error("Admin audit log error:", error.message);
  }
}

/* =========================================================
   ADMIN LOGIN
   ========================================================= */

app.post(
  "/api/admin/login",
  adminLoginLimiter,
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );

      const password =
        String(
          req.body.password || ""
        );

      if (
        email !==
          ADMIN_EMAIL ||
        !password
      ) {
        await auditAdminLogin(req, email, false);
        return res
          .status(401)
          .json({
            message:
              "Invalid admin email or password.",
          });
      }

      const valid =
        await passwordMatches(
          password
        );

      if (!valid) {
        await auditAdminLogin(req, email, false);
        return res
          .status(401)
          .json({
            message:
              "Invalid admin email or password.",
          });
      }

      await auditAdminLogin(req, email, true);

      const token =
        jwt.sign(
          adminTokenPayload(),
          JWT_SECRET,
          {
            expiresIn:
              "7d",
          }
        );

      return res.json({
        success: true,

        token,

        admin: {
          email:
            ADMIN_EMAIL,
        },
      });
    } catch (error) {
      console.error(
        "Admin login error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to login as admin.",
        });
    }
  }
);

app.get(
  "/api/admin/me",
  requireAdmin,
  (req, res) => {
    return res.json({
      success: true,

      admin: {
        email:
          req.admin.email,
      },
    });
  }
);

/* =========================================================
   CUSTOMER EMAIL LOGIN
   ========================================================= */

app.post(
  "/api/auth/email-login",
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );

      if (
        !validateEmail(email)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Please enter a valid email address.",
          });
      }

      const result =
        await pool.query(
          `
          INSERT INTO store_users
            (email)
          VALUES
            ($1)

          ON CONFLICT (email)
          DO UPDATE SET
            email =
              EXCLUDED.email

          RETURNING
            id,
            email,
            name,
            phone,
            created_at
          `,
          [email]
        );

      return res.json({
        success: true,
        user:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Email login error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to continue with email.",
        });
    }
  }
);

/* =========================================================
   PUBLIC PRODUCTS
   ========================================================= */

app.get(
  "/api/products",
  async (req, res) => {
    try {
      const category =
        String(
          req.query.category ||
            ""
        ).trim();

      const search =
        String(
          req.query.search ||
            ""
        ).trim();

      const params = [];

      const where = [
        "active = TRUE",
      ];

      if (
        category &&
        category.toLowerCase() !==
          "all"
      ) {
        params.push(
          category
        );

        where.push(
          `LOWER(category) = LOWER($${params.length})`
        );
      }

      if (search) {
        params.push(
          `%${search}%`
        );

        where.push(
          `(name ILIKE $${params.length}
            OR category ILIKE $${params.length}
            OR COALESCE(sku, '') ILIKE $${params.length})`
        );
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            sku,
            category,
            price,
            mrp,
            discount,
            rating,
            reviews,
            stock,
            images,
            description,
            active,
            created_at,
            updated_at

          FROM store_products

          WHERE
            ${where.join(
              " AND "
            )}

          ORDER BY
            created_at DESC
          `,
          params
        );

      return res.json({
        products:
          result.rows.map(
            productFromRow
          ),
      });
    } catch (error) {
      console.error(
        "Products error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load products.",
        });
    }
  }
);

/* =========================================================
   HOMEPAGE
   ========================================================= */
app.get("/api/homepage", async (req, res) => {
  try {
    const settings = await getSetting("homepage", {
      offer_enabled: true,
      offer_title: "Welcome to MeeshooShopping",
      offer_text: "Special offers are waiting for you.",
      offer_button: "Shop Now",
      offer_image: "",
      best_selling_title: "🔥 Best Selling Products",
    });
    const best = await pool.query(`SELECT * FROM store_products WHERE active = TRUE AND best_selling = TRUE ORDER BY updated_at DESC, created_at DESC LIMIT 20`);
    const featured = await pool.query(`SELECT * FROM store_products WHERE active = TRUE AND featured = TRUE ORDER BY updated_at DESC, created_at DESC LIMIT 20`);
    const arrivals = await pool.query(`SELECT * FROM store_products WHERE active = TRUE AND new_arrival = TRUE ORDER BY created_at DESC LIMIT 20`);
    return res.json({ success:true, settings, best_selling: best.rows.map(productFromRow), featured: featured.rows.map(productFromRow), new_arrivals: arrivals.rows.map(productFromRow) });
  } catch (error) {
    console.error("Homepage error:", error.message);
    return res.status(500).json({ message: "Unable to load homepage." });
  }
});

/* =========================================================
   CATEGORIES
   ========================================================= */

app.get(
  "/api/categories",
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT DISTINCT
            category

          FROM store_products

          WHERE
            active = TRUE

          ORDER BY
            category
          `
        );

      return res.json({
        categories: [
          "All",
          ...result.rows.map(
            (row) =>
              row.category
          ),
        ],
      });
    } catch (error) {
      console.error(
        "Categories error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load categories.",
        });
    }
  }
);

/* =========================================================
   PUBLIC UPI SETTINGS
   ========================================================= */

app.get(
  "/api/payment-settings",
  async (req, res) => {
    try {
      const payment =
        await getSetting(
          "payment",
          {
            method: "UPI",

            enabled: false,

            upi_id: "",

            upi_name: "",

            qr_image: "",

            instructions: "",
          }
        );

      return res.json({
        success: true,

        payment: {
          method: "UPI",

          enabled:
            Boolean(
              payment.enabled
            ),

          upi_id: String(
            payment.upi_id ||
              ""
          ),

          upi_name: String(
            payment.upi_name ||
              ""
          ),

          qr_image: String(
            payment.qr_image ||
              ""
          ),

          instructions:
            String(
              payment.instructions ||
                ""
            ),
        },
      });
    } catch (error) {
      console.error(
        "Payment settings error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load payment settings.",
        });
    }
  }
);

/* =========================================================
   CREATE UPI ORDER
   ========================================================= */

app.post(
  "/api/payments/create-order",
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const customer =
        req.body.customer ||
        {};

      const address =
        req.body.address ||
        {};

      const incomingItems =
        Array.isArray(
          req.body.items
        )
          ? req.body.items
          : [];

      const email =
        normalizeEmail(
          customer.email
        );

      const name =
        String(
          customer.name || ""
        ).trim();

      const phone =
        normalizePhone(
          customer.phone
        );

      if (
        !validateEmail(
          email
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "A valid email address is required.",
          });
      }

      if (!name) {
        return res
          .status(400)
          .json({
            message:
              "Full name is required.",
          });
      }

      if (
        !validatePhone(
          phone
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "A valid 10-digit mobile number is required.",
          });
      }

      const addressError =
        validateAddress(
          address
        );

      if (addressError) {
        return res
          .status(400)
          .json({
            message:
              addressError,
          });
      }

      if (
        !incomingItems.length
      ) {
        return res
          .status(400)
          .json({
            message:
              "Your cart is empty.",
          });
      }

      const payment =
        await getSetting(
          "payment",
          null
        );

      if (
        !payment?.enabled ||
        !payment?.upi_id
      ) {
        return res
          .status(503)
          .json({
            message:
              "UPI payment is not configured yet. Please contact the store.",
          });
      }

      await client.query(
        "BEGIN"
      );

      const verifiedItems =
        [];

      let calculatedAmount =
        0;

      /* ================================================
         VERIFY PRODUCTS FROM DATABASE
         ================================================ */

      for (
        const item of
          incomingItems
      ) {
        const result =
          await client.query(
            `
            SELECT *

            FROM store_products

            WHERE
              id = $1
              AND active = TRUE

            FOR UPDATE
            `,
            [
              String(
                item.id
              ),
            ]
          );

        if (
          !result.rows.length
        ) {
          throw new Error(
            "One of the selected products is no longer available."
          );
        }

        const product =
          result.rows[0];

        const quantity =
          Number(
            item.quantity
          );

        if (
          !Number.isInteger(
            quantity
          ) ||
          quantity < 1
        ) {
          throw new Error(
            `Invalid quantity for ${product.name}.`
          );
        }

        const productSizes = Array.isArray(product.sizes)
          ? product.sizes
          : [];
        const requestedSize = String(item.size || "").trim().toUpperCase();
        let nextSizes = productSizes;
        let availableStock = Number(product.stock || 0);

        if (productSizes.length) {
          if (!requestedSize) {
            throw new Error(`Please select a size for ${product.name}.`);
          }
          const sizeEntry = productSizes.find((entry) => String(entry.size || "").toUpperCase() === requestedSize);
          if (!sizeEntry) {
            throw new Error(`${product.name} is not available in size ${requestedSize}.`);
          }
          availableStock = Number(sizeEntry.stock || 0);
          if (quantity > availableStock) {
            throw new Error(`${product.name} (${requestedSize}) has only ${availableStock} item(s) left in stock.`);
          }
          nextSizes = productSizes.map((entry) =>
            String(entry.size || "").toUpperCase() === requestedSize
              ? { ...entry, stock: availableStock - quantity }
              : entry
          );
        } else if (quantity > availableStock) {
          throw new Error(`${product.name} has only ${availableStock} item(s) left in stock.`);
        }

        const lineTotal =
          money(
            Number(
              product.price
            ) *
              quantity
          );

        calculatedAmount +=
          lineTotal;

        verifiedItems.push(
          {
            id:
              product.id,

            name:
              product.name,

            sku:
              product.sku,

            size: requestedSize || null,

            quantity,

            price:
              Number(
                product.price
              ),

            line_total:
              lineTotal,

            images:
              Array.isArray(
                product.images
              )
                ? [
                    product
                      .images[0],
                  ].filter(
                    Boolean
                  )
                : [],
          }
        );

        /*
          Reserve stock immediately.
          If payment is cancelled/failed,
          admin can release it.
        */

        await client.query(
          `
          UPDATE store_products

          SET
            stock =
              stock - $1,

            sizes = $2::jsonb,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE
            id = $3
          `,
          [
            quantity,
            JSON.stringify(nextSizes),
            product.id,
          ]
        );
      }

      calculatedAmount =
        money(
          calculatedAmount
        );

      if (
        calculatedAmount <=
        0
      ) {
        throw new Error(
          "Invalid order amount."
        );
      }

      const orderId =
        generateId("MSH");

      /* CUSTOMER */

      await client.query(
        `
        INSERT INTO store_users
          (
            email,
            name,
            phone
          )

        VALUES
          ($1,$2,$3)

        ON CONFLICT (email)
        DO UPDATE SET
          name =
            EXCLUDED.name,

          phone =
            EXCLUDED.phone
        `,
        [
          email,
          name,
          phone,
        ]
      );

      /* ORDER */

      await client.query(
        `
        INSERT INTO store_orders
          (
            id,
            email,
            customer_name,
            phone,
            address,
            items,
            amount,
            payment_status,
            payment_method,
            order_status
          )

        VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            'PENDING_PAYMENT',
            'UPI',
            'NEW'
          )
        `,
        [
          orderId,

          email,

          name,

          phone,

          JSON.stringify(
            sanitizeAddress(
              address
            )
          ),

          JSON.stringify(
            verifiedItems
          ),

          calculatedAmount,
        ]
      );

      await client.query(
        "COMMIT"
      );

      return res
        .status(201)
        .json({
          success: true,

          order_id:
            orderId,

          amount:
            calculatedAmount,

          payment: {
            method:
              "UPI",

            upi_id:
              String(
                payment.upi_id ||
                  ""
              ),

            upi_name:
              String(
                payment.upi_name ||
                  ""
              ),

            qr_image:
              String(
                payment.qr_image ||
                  ""
              ),

            instructions:
              String(
                payment.instructions ||
                  ""
              ),
          },

          items:
            verifiedItems,
        });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Create UPI order error:",
        error.message
      );

      return res
        .status(400)
        .json({
          message:
            error.message ||
            "Unable to create order.",
        });
    } finally {
      client.release();
    }
  }
);

/* =========================================================
   CUSTOMER SUBMITS UTR
   ========================================================= */

app.post(
  "/api/payments/upi/submit",
  async (req, res) => {
    try {
      const orderId =
        String(
          req.body.order_id ||
            ""
        ).trim();

      const email =
        normalizeEmail(
          req.body.email
        );

      const utr =
        String(
          req.body
            .transaction_reference ||
            ""
        ).trim();

      const screenshot =
        String(
          req.body
            .payment_screenshot_url ||
            ""
        ).trim();

      if (
        !orderId ||
        !validateEmail(
          email
        ) ||
        !utr
      ) {
        return res
          .status(400)
          .json({
            message:
              "Order ID, email and UTR/transaction reference are required.",
          });
      }

      const result =
        await pool.query(
          `
          UPDATE store_orders

          SET
            payment_status =
              'SUBMITTED',

            transaction_reference =
              $1,

            payment_screenshot_url =
              $2,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE
            id = $3

            AND email = $4

            AND payment_status =
              'PENDING_PAYMENT'

          RETURNING
            id,
            payment_status,
            transaction_reference
          `,
          [
            utr,

            screenshot ||
              null,

            orderId,

            email,
          ]
        );

      if (
        !result.rows.length
      ) {
        return res
          .status(404)
          .json({
            message:
              "Order not found or payment has already been submitted.",
          });
      }

      return res.json({
        success: true,

        order:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "UPI submit error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to submit payment reference.",
        });
    }
  }
);

/* =========================================================
   CUSTOMER ORDER
   ========================================================= */

app.get(
  "/api/orders/:orderId",
  async (req, res) => {
    try {
      const orderId =
        String(
          req.params.orderId ||
            ""
        ).trim();

      const email =
        normalizeEmail(
          req.query.email
        );

      const params = [
        orderId,
      ];

      let extra = "";

      if (email) {
        params.push(email);

        extra =
          "AND email = $2";
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            email,
            customer_name,
            phone,
            address,
            items,
            amount,
            payment_status,
            payment_method,
            transaction_reference,
            payment_screenshot_url,
            payment_id,
            order_status,
            admin_note,
            created_at,
            updated_at

          FROM store_orders

          WHERE
            id = $1
            ${extra}
          `,
          params
        );

      if (
        !result.rows.length
      ) {
        return res
          .status(404)
          .json({
            message:
              "Order not found.",
          });
      }

      return res.json({
        success: true,

        order:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Get order error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load order.",
        });
    }
  }
);

/* =========================================================
   CUSTOMER ORDERS
   ========================================================= */

app.get(
  "/api/orders",
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.query.email
        );

      if (
        !validateEmail(
          email
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Valid email is required.",
          });
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            customer_name,
            phone,
            address,
            items,
            amount,
            payment_status,
            payment_method,
            transaction_reference,
            payment_id,
            order_status,
            admin_note,
            created_at,
            updated_at

          FROM store_orders

          WHERE
            email = $1

          ORDER BY
            created_at DESC
          `,
          [email]
        );

      return res.json({
        success: true,

        orders:
          result.rows,
      });
    } catch (error) {
      console.error(
        "Get orders error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load orders.",
        });
    }
  }
);

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

app.get(
  "/api/admin/dashboard",
  requireAdmin,
  async (req, res) => {
    try {
      const [
        products,
        customers,
        orders,
        pending,
      ] =
        await Promise.all([
          pool.query(`
            SELECT COUNT(*)::int AS count
            FROM store_products
            WHERE active = TRUE
          `),

          pool.query(`
            SELECT COUNT(*)::int AS count
            FROM store_users
          `),

          pool.query(`
            SELECT COUNT(*)::int AS count
            FROM store_orders
          `),

          pool.query(`
            SELECT COUNT(*)::int AS count
            FROM store_orders

            WHERE
              payment_status IN
              (
                'PENDING_PAYMENT',
                'SUBMITTED'
              )
          `),
        ]);

      return res.json({
        success: true,

        stats: {
          products:
            products.rows[0]
              .count,

          customers:
            customers.rows[0]
              .count,

          orders:
            orders.rows[0]
              .count,

          pending_payments:
            pending.rows[0]
              .count,
        },
      });
    } catch (error) {
      console.error(
        "Admin dashboard error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load dashboard.",
        });
    }
  }
);

/* =========================================================
   ADMIN PRODUCTS - LIST
   ========================================================= */

app.get(
  "/api/admin/products",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT *
          FROM store_products
          ORDER BY created_at DESC
          `
        );

      return res.json({
        success: true,

        products:
          result.rows.map(
            productFromRow
          ),
      });
    } catch (error) {
      console.error(
        "Admin products error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load admin products.",
        });
    }
  }
);

/* =========================================================
   ADMIN PRODUCTS - ADD
   ========================================================= */

app.post(
  "/api/admin/products",
  requireAdmin,
  async (req, res) => {
    try {
      const body =
        req.body || {};

      const id = String(
        body.id ||
          generateId(
            "PROD"
          )
      ).trim();

      const name =
        String(
          body.name || ""
        ).trim();

      const sku =
        String(
          body.sku ||
            `SKU-${Date.now()}`
        ).trim();

      const category =
        String(
          body.category ||
            ""
        ).trim();

      const price =
        money(body.price);

      const mrp =
        money(body.mrp);

      const sizes = sanitizeSizes(body.sizes);
      const stock = sizes.length
        ? totalSizeStock(sizes)
        : positiveInt(body.stock);

      const images =
        sanitizeImages(
          body.images
        );

      const description =
        String(
          body.description ||
            ""
        ).trim();

      const rating =
        Number(
          body.rating ??
            4.5
        );

      const reviews =
        positiveInt(
          body.reviews
        );

      const active =
        body.active !==
        false;

      const bestSelling = Boolean(body.best_selling);
      const newArrival = Boolean(body.new_arrival);
      const featured = Boolean(body.featured);

      if (
        !name ||
        !category ||
        price <= 0 ||
        mrp <= 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "Name, category, price and MRP are required.",
          });
      }

      if (
        price > mrp
      ) {
        return res
          .status(400)
          .json({
            message:
              "Price cannot be greater than MRP.",
          });
      }

      if (
        !images.length
      ) {
        return res
          .status(400)
          .json({
            message:
              "At least one product image is required.",
          });
      }

      const discount =
        mrp > 0
          ? Math.max(
              0,
              Math.round(
                ((mrp -
                  price) /
                  mrp) *
                  100
              )
            )
          : 0;

      const result =
        await pool.query(
          `
          INSERT INTO store_products
            (
              id,
              name,
              sku,
              category,
              price,
              mrp,
              discount,
              rating,
              reviews,
              stock,
              sizes,
              images,
              description,
              active,
              best_selling,
              new_arrival,
              featured
            )

          VALUES
            (
              $1,$2,$3,$4,$5,
              $6,$7,$8,$9,$10,$11,
              $12,$13,$14,$15,$16,$17
            )

          RETURNING *
          `,
          [
            id,

            name,

            sku,

            category,

            price,

            mrp,

            discount,

            Math.min(
              5,
              Math.max(
                0,
                rating
              )
            ),

            reviews,

            stock,

            JSON.stringify(sizes),

            images,

            description,

            active,
            bestSelling,
            newArrival,
            featured,
          ]
        );

      return res
        .status(201)
        .json({
          success: true,

          product:
            productFromRow(
              result.rows[0]
            ),
        });
    } catch (error) {
      console.error(
        "Create product error:",
        error.message
      );

      return res
        .status(400)
        .json({
          message:
            error.code ===
            "23505"
              ? "Product ID or SKU already exists."
              : "Unable to create product.",
        });
    }
  }
);

/* =========================================================
   ADMIN PRODUCTS - UPDATE
   ========================================================= */

app.put(
  "/api/admin/products/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        String(
          req.params.id ||
            ""
        ).trim();

      const body =
        req.body || {};

      const currentResult =
        await pool.query(
          `
          SELECT *
          FROM store_products
          WHERE id = $1
          `,
          [id]
        );

      if (
        !currentResult.rows
          .length
      ) {
        return res
          .status(404)
          .json({
            message:
              "Product not found.",
          });
      }

      const current =
        currentResult
          .rows[0];

      const name =
        String(
          body.name ??
            current.name
        ).trim();

      const sku =
        String(
          body.sku ??
            current.sku ??
            ""
        ).trim() ||
        null;

      const category =
        String(
          body.category ??
            current.category
        ).trim();

      const price =
        money(
          body.price ??
            current.price
        );

      const mrp =
        money(
          body.mrp ??
            current.mrp
        );

      const incomingSizes = body.sizes === undefined
        ? (Array.isArray(current.sizes) ? current.sizes : [])
        : sanitizeSizes(body.sizes);
      const sizes = sanitizeSizes(incomingSizes);
      const stock = sizes.length
        ? totalSizeStock(sizes)
        : positiveInt(body.stock ?? current.stock);

      const images =
        body.images ===
        undefined
          ? current.images
          : sanitizeImages(
              body.images
            );

      const description =
        String(
          body.description ??
            current.description ??
            ""
        ).trim();

      const rating =
        Number(
          body.rating ??
            current.rating
        );

      const reviews =
        positiveInt(
          body.reviews ??
            current.reviews
        );

      const active =
        body.active ===
        undefined
          ? current.active
          : Boolean(
              body.active
            );

      const bestSelling = body.best_selling === undefined ? Boolean(current.best_selling) : Boolean(body.best_selling);
      const newArrival = body.new_arrival === undefined ? Boolean(current.new_arrival) : Boolean(body.new_arrival);
      const featured = body.featured === undefined ? Boolean(current.featured) : Boolean(body.featured);

      if (
        !name ||
        !category ||
        price <= 0 ||
        mrp <= 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "Name, category, price and MRP are required.",
          });
      }

      if (
        price > mrp
      ) {
        return res
          .status(400)
          .json({
            message:
              "Price cannot be greater than MRP.",
          });
      }

      if (
        !images.length
      ) {
        return res
          .status(400)
          .json({
            message:
              "At least one product image is required.",
          });
      }

      const discount =
        mrp > 0
          ? Math.max(
              0,
              Math.round(
                ((mrp -
                  price) /
                  mrp) *
                  100
              )
            )
          : 0;

      const result =
        await pool.query(
          `
          UPDATE store_products

          SET
            name = $1,
            sku = $2,
            category = $3,
            price = $4,
            mrp = $5,
            discount = $6,
            rating = $7,
            reviews = $8,
            stock = $9,
            sizes = $10,
            images = $11,
            description = $12,
            active = $13,
            best_selling = $14,
            new_arrival = $15,
            featured = $16,
            updated_at = CURRENT_TIMESTAMP

          WHERE
            id = $17

          RETURNING *
          `,
          [
            name,
            sku,
            category,
            price,
            mrp,
            discount,

            Math.min(
              5,
              Math.max(
                0,
                rating
              )
            ),

            reviews,

            stock,

            JSON.stringify(sizes),

            images,

            description,

            active,
            bestSelling,
            newArrival,
            featured,

            id,
          ]
        );

      return res.json({
        success: true,

        product:
          productFromRow(
            result.rows[0]
          ),
      });
    } catch (error) {
      console.error(
        "Update product error:",
        error.message
      );

      return res
        .status(400)
        .json({
          message:
            error.code ===
            "23505"
              ? "SKU already exists."
              : "Unable to update product.",
        });
    }
  }
);

/* =========================================================
   ADMIN PRODUCTS - DELETE
   Soft delete
   ========================================================= */

app.delete(
  "/api/admin/products/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        String(
          req.params.id ||
            ""
        ).trim();

      const result =
        await pool.query(
          `
          UPDATE store_products

          SET
            active = FALSE,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE
            id = $1

          RETURNING id
          `,
          [id]
        );

      if (
        !result.rows.length
      ) {
        return res
          .status(404)
          .json({
            message:
              "Product not found.",
          });
      }

      return res.json({
        success: true,

        message:
          "Product removed from the store.",
      });
    } catch (error) {
      console.error(
        "Delete product error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to delete product.",
        });
    }
  }
);

/* =========================================================
   ADMIN CUSTOMERS
   ========================================================= */

app.get(
  "/api/admin/customers",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT

            u.id,
            u.email,
            u.name,
            u.phone,
            u.created_at,

            COUNT(o.id)::int
              AS order_count,

            COALESCE(
              SUM(o.amount),
              0
            )::numeric(12,2)
              AS total_spent

          FROM store_users u

          LEFT JOIN store_orders o
            ON LOWER(
              o.email
            ) =
            LOWER(
              u.email
            )

          GROUP BY
            u.id

          ORDER BY
            u.created_at DESC
          `
        );

      return res.json({
        success: true,

        customers:
          result.rows.map(
            (row) => ({
              ...row,

              order_count:
                Number(
                  row.order_count
                ),

              total_spent:
                Number(
                  row.total_spent
                ),
            })
          ),
      });
    } catch (error) {
      console.error(
        "Admin customers error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load customers.",
        });
    }
  }
);

/* =========================================================
   ADMIN ORDERS
   ========================================================= */

app.get(
  "/api/admin/orders",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT *
          FROM store_orders
          ORDER BY
            created_at DESC
          `
        );

      return res.json({
        success: true,

        orders:
          result.rows,
      });
    } catch (error) {
      console.error(
        "Admin orders error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load orders.",
        });
    }
  }
);

/* =========================================================
   ADMIN HOMEPAGE SETTINGS / LOGIN AUDIT
   ========================================================= */
app.get("/api/admin/homepage", requireAdmin, async (req,res)=>{
  try { const homepage = await getSetting("homepage", {offer_enabled:true,offer_title:"Welcome to MeeshooShopping",offer_text:"Special offers are waiting for you.",offer_button:"Shop Now",offer_image:"",best_selling_title:"🔥 Best Selling Products"}); return res.json({success:true,homepage}); }
  catch(error){ return res.status(500).json({message:"Unable to load homepage settings."}); }
});
app.put("/api/admin/homepage", requireAdmin, async (req,res)=>{
  try { const current = await getSetting("homepage",{}); const homepage={...current,...(req.body||{})}; await setSetting("homepage",homepage); return res.json({success:true,homepage}); }
  catch(error){ return res.status(500).json({message:"Unable to save homepage settings."}); }
});
app.get("/api/admin/security-log", requireAdmin, async (req,res)=>{
  try { const result=await pool.query(`SELECT id,email,ip_address,user_agent,success,created_at FROM admin_login_audit ORDER BY created_at DESC LIMIT 100`); return res.json({success:true,logs:result.rows}); }
  catch(error){ return res.status(500).json({message:"Unable to load security log."}); }
});

/* =========================================================
   ADMIN PAYMENT SETTINGS
   ========================================================= */

app.get(
  "/api/admin/payment-settings",
  requireAdmin,
  async (req, res) => {
    try {
      const payment =
        await getSetting(
          "payment",
          null
        );

      return res.json({
        success: true,
        payment,
      });
    } catch (error) {
      console.error(
        "Admin payment settings error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load payment settings.",
        });
    }
  }
);

/* =========================================================
   ADMIN CHANGE UPI
   ========================================================= */

app.put(
  "/api/admin/payment-settings",
  requireAdmin,
  async (req, res) => {
    try {
      const current =
        (await getSetting(
          "payment",
          {}
        )) || {};

      const next = {
        method: "UPI",

        enabled:
          req.body.enabled ===
          undefined
            ? Boolean(
                current.enabled
              )
            : Boolean(
                req.body.enabled
              ),

        upi_id:
          String(
            req.body.upi_id ??
              current.upi_id ??
              ""
          ).trim(),

        upi_name:
          String(
            req.body.upi_name ??
              current.upi_name ??
              ""
          ).trim(),

        qr_image:
          String(
            req.body.qr_image ??
              current.qr_image ??
              ""
          ).trim(),

        instructions:
          String(
            req.body.instructions ??
              current.instructions ??
              ""
          ).trim(),
      };

      if (
        next.enabled &&
        !next.upi_id
      ) {
        return res
          .status(400)
          .json({
            message:
              "UPI ID is required when UPI is enabled.",
          });
      }

      await setSetting(
        "payment",
        next
      );

      return res.json({
        success: true,
        payment: next,
      });
    } catch (error) {
      console.error(
        "Update payment settings error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to update UPI settings.",
        });
    }
  }
);

/* =========================================================
   ADMIN VERIFY PAYMENT
   ========================================================= */

app.put(
  "/api/admin/orders/:id/payment",
  requireAdmin,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const id =
        String(
          req.params.id ||
            ""
        ).trim();

      const status =
        String(
          req.body.status ||
            ""
        )
          .trim()
          .toUpperCase();

      const paymentId =
        String(
          req.body.payment_id ||
            ""
        ).trim();

      const note =
        String(
          req.body.admin_note ||
            ""
        ).trim();

      if (
        ![
          "PAID",
          "FAILED",
          "CANCELLED",
        ].includes(status)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Payment status must be PAID, FAILED or CANCELLED.",
          });
      }

      await client.query(
        "BEGIN"
      );

      const orderResult =
        await client.query(
          `
          SELECT *
          FROM store_orders

          WHERE
            id = $1

          FOR UPDATE
          `,
          [id]
        );

      if (
        !orderResult.rows
          .length
      ) {
        throw new Error(
          "Order not found."
        );
      }

      const order =
        orderResult.rows[0];

      /*
        Don't turn an already paid order
        into failed/cancelled.
      */

      if (
        order.payment_status ===
          "PAID" &&
        status !== "PAID"
      ) {
        throw new Error(
          "A paid order cannot be marked failed or cancelled."
        );
      }

      if (
        status === "PAID"
      ) {
        await client.query(
          `
          UPDATE store_orders

          SET
            payment_status =
              'PAID',

            payment_id =
              COALESCE(
                NULLIF(
                  $1,
                  ''
                ),
                payment_id
              ),

            order_status =
              CASE

                WHEN order_status =
                  'NEW'

                THEN
                  'CONFIRMED'

                ELSE
                  order_status

              END,

            admin_note =
              COALESCE(
                NULLIF(
                  $2,
                  ''
                ),
                admin_note
              ),

            updated_at =
              CURRENT_TIMESTAMP

          WHERE
            id = $3
          `,
          [
            paymentId,
            note,
            id,
          ]
        );
      } else {
        /*
          Return reserved stock exactly once.
        */

        if (
          !order.stock_released
        ) {
          const items =
            Array.isArray(
              order.items
            )
              ? order.items
              : [];

          for (
            const item of
              items
          ) {
            const quantity =
              Number(
                item.quantity ||
                  0
              );

            if (quantity > 0) {
              const size = String(item.size || "").trim().toUpperCase();
              if (size) {
                await client.query(
                  `
                  UPDATE store_products
                  SET
                    stock = stock + $1,
                    sizes = COALESCE((
                      SELECT jsonb_agg(
                        CASE
                          WHEN UPPER(COALESCE(elem->>'size','')) = $2
                          THEN jsonb_set(elem, '{stock}', to_jsonb((COALESCE((elem->>'stock')::int,0) + $1)))
                          ELSE elem
                        END
                      ) FROM jsonb_array_elements(COALESCE(sizes,'[]'::jsonb)) elem
                    ), '[]'::jsonb),
                    updated_at = CURRENT_TIMESTAMP
                  WHERE id = $3
                  `,
                  [quantity, size, String(item.id)]
                );
              } else {
                await client.query(
                  `UPDATE store_products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                  [quantity, String(item.id)]
                );
              }
            }
          }
        }

        await client.query(
          `
          UPDATE store_orders

          SET
            payment_status =
              $1,

            order_status =
              'CANCELLED',

            admin_note =
              COALESCE(
                NULLIF(
                  $2,
                  ''
                ),
                admin_note
              ),

            stock_released =
              TRUE,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE
            id = $3
          `,
          [
            status,
            note,
            id,
          ]
        );
      }

      await client.query(
        "COMMIT"
      );

      return res.json({
        success: true,

        payment_status:
          status,
      });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Admin payment update error:",
        error.message
      );

      return res
        .status(400)
        .json({
          message:
            error.message ||
            "Unable to update payment.",
        });
    } finally {
      client.release();
    }
  }
);

/* =========================================================
   ADMIN ORDER STATUS
   ========================================================= */

app.put(
  "/api/admin/orders/:id/status",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        String(
          req.params.id ||
            ""
        ).trim();

      const status =
        String(
          req.body
            .order_status ||
            ""
        )
          .trim()
          .toUpperCase();

      const note =
        String(
          req.body.admin_note ||
            ""
        ).trim();

      const allowed = [
        "NEW",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ];

      if (
        !allowed.includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              `Invalid order status. Allowed: ${allowed.join(
                ", "
              )}`,
          });
      }

      const result =
        await pool.query(
          `
          UPDATE store_orders

          SET
            order_status =
              $1,

            admin_note =
              COALESCE(
                NULLIF(
                  $2,
                  ''
                ),
                admin_note
              ),

            updated_at =
              CURRENT_TIMESTAMP

          WHERE
            id = $3

          RETURNING
            id,
            order_status,
            admin_note
          `,
          [
            status,
            note,
            id,
          ]
        );

      if (
        !result.rows.length
      ) {
        return res
          .status(404)
          .json({
            message:
              "Order not found.",
          });
      }

      return res.json({
        success: true,

        order:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Admin order status error:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to update order status.",
        });
    }
  }
);

/* =========================================================
   404
   ========================================================= */

app.use(
  (req, res) => {
    res
      .status(404)
      .json({
        message:
          "API route not found.",
      });
  }
);

/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error.message
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    return res
      .status(500)
      .json({
        message:
          "Internal server error.",
      });
  }
);

/* =========================================================
   START SERVER
   ========================================================= */

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(
      PORT,
      () => {
        console.log(
          `MEESHOO server running on port ${PORT}`
        );

        console.log(
          "Payment method: UPI"
        );

        console.log(
          `Admin account: ${ADMIN_EMAIL}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
