require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
const axios = require("axios");
const crypto = require("crypto");

const app = express();

const PORT = Number(process.env.PORT || 5000);

const DATABASE_URL = process.env.DATABASE_URL || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "*";

const CASHFREE_APP_ID = String(
  process.env.CASHFREE_APP_ID || ""
).trim();

const CASHFREE_SECRET_KEY = String(
  process.env.CASHFREE_SECRET_KEY || ""
).trim();

const CASHFREE_ENV = String(
  process.env.CASHFREE_ENV || "sandbox"
).trim().toLowerCase();

const CASHFREE_API_VERSION = String(
  process.env.CASHFREE_API_VERSION || "2025-01-01"
).trim();

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`;

const FRONTEND_RETURN_URL =
  process.env.FRONTEND_RETURN_URL ||
  `${BACKEND_URL}/api/payments/return`;

if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is missing.");
  process.exit(1);
}

if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
  console.error(
    "FATAL: CASHFREE_APP_ID and CASHFREE_SECRET_KEY are required."
  );
  process.exit(1);
}

if (!["sandbox", "production"].includes(CASHFREE_ENV)) {
  console.error(
    "FATAL: CASHFREE_ENV must be sandbox or production."
  );
  process.exit(1);
}

const CASHFREE_BASE_URL =
  CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

app.use(helmet());

const allowedOrigins =
  FRONTEND_URL === "*"
    ? true
    : FRONTEND_URL.split(",")
        .map((value) => value.trim())
        .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

/* =========================================================
   PRODUCT CATALOG
   These IDs intentionally match the current App.jsx:
   p1, p2, p3, p4, p5, p6
   ========================================================= */

const PRODUCTS = {
  p1: {
    id: "p1",
    name: "Premium Cotton Floral Kurti",
    price: 599,
    stock: 50,
  },

  p2: {
    id: "p2",
    name: "Men Classic Black Smartwatch",
    price: 1499,
    stock: 120,
  },

  p3: {
    id: "p3",
    name: "Women's Casual Handbag",
    price: 799,
    stock: 35,
  },

  p4: {
    id: "p4",
    name: "Premium Wireless Headphones",
    price: 1299,
    stock: 80,
  },

  p5: {
    id: "p5",
    name: "Classic Men's Casual Shirt",
    price: 699,
    stock: 60,
  },

  p6: {
    id: "p6",
    name: "Minimal Women's Sneakers",
    price: 999,
    stock: 42,
  },
};

/* =========================================================
   DATABASE
   ========================================================= */

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(150),
      phone VARCHAR(20),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_orders (
      id VARCHAR(100) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      customer_name VARCHAR(150) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address JSONB NOT NULL,
      items JSONB NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      cashfree_order_id VARCHAR(100),
      payment_id VARCHAR(150),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS store_orders_email_index
    ON store_orders(email)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS store_orders_payment_index
    ON store_orders(payment_status)
  `);

  console.log("Database initialized successfully.");
}

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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
  return /^\d{6}$/.test(String(pincode || "").trim());
}

function money(value) {
  return Number(Number(value).toFixed(2));
}

function generateOrderId() {
  return `MSH_${Date.now()}_${crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase()}`;
}

function cashfreeHeaders() {
  return {
    "x-client-id": CASHFREE_APP_ID,
    "x-client-secret": CASHFREE_SECRET_KEY,
    "x-api-version": CASHFREE_API_VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function sanitizeAddress(address) {
  return {
    line1: String(address?.line1 || "").trim(),
    city: String(address?.city || "").trim(),
    state: String(address?.state || "").trim(),
    pincode: String(address?.pincode || "").trim(),
  };
}

function validateAddress(address) {
  const clean = sanitizeAddress(address);

  if (!clean.line1) {
    return "Address is required.";
  }

  if (!clean.city) {
    return "City is required.";
  }

  if (!clean.state) {
    return "State is required.";
  }

  if (!validatePincode(clean.pincode)) {
    return "A valid 6-digit PIN code is required.";
  }

  return null;
}

/* =========================================================
   HEALTH
   ========================================================= */

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.json({
      ok: true,
      service: "meeshoo-backend",
      database: "connected",
      payment_environment: CASHFREE_ENV,
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      service: "meeshoo-backend",
      database: "disconnected",
      error: "Database unavailable.",
    });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.json({
      ok: true,
      database: "connected",
    });
  } catch {
    return res.status(503).json({
      ok: false,
      database: "disconnected",
    });
  }
});

/* =========================================================
   EMAIL LOGIN
   No mobile OTP.
   ========================================================= */

app.post("/api/auth/email-login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO store_users (email)
      VALUES ($1)
      ON CONFLICT (email)
      DO UPDATE SET email = EXCLUDED.email
      RETURNING id, email, name, phone
      `,
      [email]
    );

    return res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Email login error:", error.message);

    return res.status(500).json({
      message: "Unable to continue with email.",
    });
  }
});

/* =========================================================
   PRODUCTS
   ========================================================= */

app.get("/api/products", (req, res) => {
  return res.json({
    products: Object.values(PRODUCTS),
  });
});

/* =========================================================
   CREATE PAYMENT ORDER
   Current App.jsx calls this endpoint.
   ========================================================= */

app.post("/api/payments/create-order", async (req, res) => {
  const client = await pool.connect();

  try {
    const customer = req.body.customer || {};
    const address = req.body.address || {};
    const incomingItems = Array.isArray(req.body.items)
      ? req.body.items
      : [];

    const email = normalizeEmail(customer.email);
    const name = String(customer.name || "").trim();
    const phone = normalizePhone(customer.phone);

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "A valid email address is required.",
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Full name is required.",
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({
        message: "A valid 10-digit mobile number is required.",
      });
    }

    const addressError = validateAddress(address);

    if (addressError) {
      return res.status(400).json({
        message: addressError,
      });
    }

    if (incomingItems.length === 0) {
      return res.status(400).json({
        message: "Your cart is empty.",
      });
    }

    /*
      Never trust the amount sent by the browser.
      Recalculate everything from the server-side catalog.
    */

    const verifiedItems = [];
    let calculatedAmount = 0;

    for (const item of incomingItems) {
      const product = PRODUCTS[String(item.id)];

      if (!product) {
        return res.status(400).json({
          message: "One of the selected products is invalid.",
        });
      }

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > product.stock
      ) {
        return res.status(400).json({
          message: `Invalid quantity for ${product.name}.`,
        });
      }

      const lineTotal = money(product.price * quantity);

      calculatedAmount += lineTotal;

      verifiedItems.push({
        id: product.id,
        name: product.name,
        quantity,
        price: product.price,
        line_total: lineTotal,
      });
    }

    calculatedAmount = money(calculatedAmount);

    if (calculatedAmount <= 0) {
      return res.status(400).json({
        message: "Invalid order amount.",
      });
    }

    const orderId = generateOrderId();

    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO store_users (email, name, phone)
      VALUES ($1, $2, $3)
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone
      `,
      [email, name, phone]
    );

    await client.query(
      `
      INSERT INTO store_orders (
        id,
        email,
        customer_name,
        phone,
        address,
        items,
        amount,
        payment_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
      `,
      [
        orderId,
        email,
        name,
        phone,
        JSON.stringify(sanitizeAddress(address)),
        JSON.stringify(verifiedItems),
        calculatedAmount,
      ]
    );

    const cashfreePayload = {
      order_id: orderId,
      order_amount: calculatedAmount,
      order_currency: "INR",

      customer_details: {
        customer_id: `customer_${crypto
          .createHash("sha256")
          .update(email)
          .digest("hex")
          .slice(0, 20)}`,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
      },

      order_meta: {
        return_url: `${FRONTEND_RETURN_URL}?order_id={order_id}`,
        notify_url: `${BACKEND_URL}/api/payments/webhook`,
      },

      order_note: "MEESHOO online order",
    };

    const cashfreeResponse = await axios.post(
      `${CASHFREE_BASE_URL}/orders`,
      cashfreePayload,
      {
        headers: cashfreeHeaders(),
        timeout: 15000,
      }
    );

    const cashfreeOrder = cashfreeResponse.data;

    if (!cashfreeOrder?.payment_session_id) {
      throw new Error(
        "Cashfree did not return a payment_session_id."
      );
    }

    await client.query(
      `
      UPDATE store_orders
      SET cashfree_order_id = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        cashfreeOrder.order_id || orderId,
        orderId,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      order_id: orderId,
      payment_session_id: cashfreeOrder.payment_session_id,
      mode: CASHFREE_ENV,
      amount: calculatedAmount,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create payment order error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message:
        error.response?.data?.message ||
        "Unable to create secure payment order.",
    });
  } finally {
    client.release();
  }
});

/* =========================================================
   CASHFREE RETURN URL
   Cashfree redirects customer here after checkout.
   We verify payment server-side before marking order paid.
   ========================================================= */

app.get("/api/payments/return", async (req, res) => {
  const orderId = String(req.query.order_id || "").trim();

  if (!orderId) {
    return res.redirect(`${FRONTEND_URL}/?payment=missing`);
  }

  try {
    const status = await getCashfreePaymentStatus(orderId);

    if (status === "SUCCESS") {
      await markOrderPaid(orderId);
      return res.redirect(
        `${FRONTEND_URL}/?payment=success&order_id=${encodeURIComponent(
          orderId
        )}`
      );
    }

    if (status === "PENDING") {
      return res.redirect(
        `${FRONTEND_URL}/?payment=pending&order_id=${encodeURIComponent(
          orderId
        )}`
      );
    }

    await markOrderFailed(orderId);

    return res.redirect(
      `${FRONTEND_URL}/?payment=failed&order_id=${encodeURIComponent(
        orderId
      )}`
    );
  } catch (error) {
    console.error(
      "Payment return verification error:",
      error.message
    );

    return res.redirect(
      `${FRONTEND_URL}/?payment=verification_error&order_id=${encodeURIComponent(
        orderId
      )}`
    );
  }
});

/* =========================================================
   GET CASHFREE PAYMENT STATUS
   ========================================================= */

async function getCashfreePaymentStatus(orderId) {
  const response = await axios.get(
    `${CASHFREE_BASE_URL}/orders/${encodeURIComponent(
      orderId
    )}/payments`,
    {
      headers: cashfreeHeaders(),
      timeout: 15000,
    }
  );

  const payments = Array.isArray(response.data)
    ? response.data
    : [];

  if (
    payments.some(
      (payment) => payment.payment_status === "SUCCESS"
    )
  ) {
    return "SUCCESS";
  }

  if (
    payments.some(
      (payment) =>
        payment.payment_status === "PENDING" ||
        payment.payment_status === "NOT_ATTEMPTED"
    )
  ) {
    return "PENDING";
  }

  return "FAILED";
}

/* =========================================================
   MARK ORDER PAID
   ========================================================= */

async function markOrderPaid(orderId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT *
      FROM store_orders
      WHERE id = $1
      FOR UPDATE
      `,
      [orderId]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const order = result.rows[0];

    if (order.payment_status === "PAID") {
      await client.query("COMMIT");
      return true;
    }

    const paymentsResponse = await axios.get(
      `${CASHFREE_BASE_URL}/orders/${encodeURIComponent(
        orderId
      )}/payments`,
      {
        headers: cashfreeHeaders(),
        timeout: 15000,
      }
    );

    const payments = Array.isArray(paymentsResponse.data)
      ? paymentsResponse.data
      : [];

    const successfulPayment = payments.find(
      (payment) => payment.payment_status === "SUCCESS"
    );

    if (!successfulPayment) {
      await client.query("ROLLBACK");
      return false;
    }

    const paymentId =
      successfulPayment.cf_payment_id ||
      successfulPayment.payment_id ||
      successfulPayment.cf_order_id ||
      null;

    await client.query(
      `
      UPDATE store_orders
      SET payment_status = 'PAID',
          payment_id = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [String(paymentId || ""), orderId]
    );

    await client.query("COMMIT");

    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   MARK FAILED
   ========================================================= */

async function markOrderFailed(orderId) {
  await pool.query(
    `
    UPDATE store_orders
    SET payment_status = 'FAILED',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND payment_status <> 'PAID'
    `,
    [orderId]
  );
}

/* =========================================================
   CASHFREE WEBHOOK
   ========================================================= */

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = String(
        req.headers["x-webhook-signature"] || ""
      );

      const timestamp = String(
        req.headers["x-webhook-timestamp"] || ""
      );

      if (!signature || !timestamp) {
        return res.status(400).json({
          message: "Missing Cashfree webhook signature.",
        });
      }

      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);

      const signedPayload = `${timestamp}${rawBody}`;

      const expectedSignature = crypto
        .createHmac("sha256", CASHFREE_SECRET_KEY)
        .update(signedPayload)
        .digest("base64");

      const signaturesMatch =
        expectedSignature.length === signature.length &&
        crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(signature)
        );

      if (!signaturesMatch) {
        return res.status(401).json({
          message: "Invalid webhook signature.",
        });
      }

      const payload = JSON.parse(rawBody);

      const orderId =
        payload?.data?.order?.order_id ||
        payload?.data?.order_id ||
        null;

      const paymentStatus =
        payload?.data?.payment?.payment_status ||
        null;

      if (!orderId) {
        return res.status(200).json({
          received: true,
        });
      }

      if (paymentStatus === "SUCCESS") {
        await markOrderPaid(orderId);
      } else if (
        paymentStatus === "FAILED" ||
        paymentStatus === "CANCELLED"
      ) {
        await markOrderFailed(orderId);
      }

      return res.status(200).json({
        received: true,
      });
    } catch (error) {
      console.error(
        "Cashfree webhook error:",
        error.message
      );

      return res.status(500).json({
        message: "Webhook processing failed.",
      });
    }
  }
);

/* =========================================================
   ORDER STATUS
   ========================================================= */

app.get("/api/orders/:orderId", async (req, res) => {
  try {
    const orderId = String(req.params.orderId || "").trim();

    const result = await pool.query(
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
        payment_id,
        created_at,
        updated_at
      FROM store_orders
      WHERE id = $1
      `,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get order error:",
      error.message
    );

    return res.status(500).json({
      message: "Unable to load order.",
    });
  }
});

/* =========================================================
   USER ORDERS
   ========================================================= */

app.get("/api/orders", async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Valid email is required.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        customer_name,
        phone,
        address,
        items,
        amount,
        payment_status,
        payment_id,
        created_at,
        updated_at
      FROM store_orders
      WHERE email = $1
      ORDER BY created_at DESC
      `,
      [email]
    );

    return res.json({
      success: true,
      orders: result.rows,
    });
  } catch (error) {
    console.error(
      "Get orders error:",
      error.message
    );

    return res.status(500).json({
      message: "Unable to load orders.",
    });
  }
});

/* =========================================================
   404
   ========================================================= */

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found.",
  });
});

/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use((error, req, res, next) => {
  console.error(
    "Unhandled server error:",
    error.message
  );

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: "Internal server error.",
  });
});

/* =========================================================
   START SERVER
   ========================================================= */

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(
        `MEESHOO server running on port ${PORT}`
      );

      console.log(
        `Cashfree environment: ${CASHFREE_ENV}`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
