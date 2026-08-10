import React, { useEffect, useMemo, useState } from "react";

const PRODUCTS = [
  {
    id: "p1",
    name: "Premium Cotton Floral Kurti",
    category: "Women",
    price: 599,
    mrp: 1299,
    rating: 4.4,
    reviews: 1248,
    stock: 50,
    image:
      "https://images.unsplash.com/photo-1604929846387-a365f57a3e7b?w=900&q=85",
    description:
      "Comfortable breathable cotton kurti designed for everyday wear with a soft and elegant finish.",
  },
  {
    id: "p2",
    name: "Men Classic Black Smartwatch",
    category: "Electronics",
    price: 1499,
    mrp: 3999,
    rating: 4.3,
    reviews: 982,
    stock: 120,
    image:
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=900&q=85",
    description:
      "Modern smartwatch with activity tracking, notifications and an elegant black design.",
  },
  {
    id: "p3",
    name: "Women's Casual Handbag",
    category: "Women",
    price: 799,
    mrp: 1999,
    rating: 4.5,
    reviews: 734,
    stock: 35,
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85",
    description:
      "Spacious everyday handbag with a clean premium look and practical storage.",
  },
  {
    id: "p4",
    name: "Premium Wireless Headphones",
    category: "Electronics",
    price: 1299,
    mrp: 2999,
    rating: 4.2,
    reviews: 1651,
    stock: 80,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=85",
    description:
      "Comfortable wireless headphones with immersive sound and a lightweight design.",
  },
  {
    id: "p5",
    name: "Classic Men's Casual Shirt",
    category: "Men",
    price: 699,
    mrp: 1499,
    rating: 4.3,
    reviews: 621,
    stock: 60,
    image:
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=85",
    description:
      "Easy-to-style casual shirt made for comfortable everyday use.",
  },
  {
    id: "p6",
    name: "Minimal Women's Sneakers",
    category: "Footwear",
    price: 999,
    mrp: 2199,
    rating: 4.5,
    reviews: 893,
    stock: 42,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85",
    description:
      "Comfortable lightweight sneakers suitable for everyday walking and casual outfits.",
  },
];

const CATEGORIES = [
  "All",
  "Women",
  "Men",
  "Electronics",
  "Footwear",
];

function formatPrice(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function getDiscount(price, mrp) {
  return Math.round(((mrp - price) / mrp) * 100);
}

function App() {
  const [products] = useState(PRODUCTS);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);

  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [address, setAddress] = useState({
    name: "",
    phone: "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [orderLoading, setOrderLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("meeshoo_user");
      const savedCart = localStorage.getItem("meeshoo_cart");
      const savedWishlist = localStorage.getItem("meeshoo_wishlist");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }

      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }
    } catch {
      localStorage.removeItem("meeshoo_user");
      localStorage.removeItem("meeshoo_cart");
      localStorage.removeItem("meeshoo_wishlist");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("meeshoo_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("meeshoo_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("meeshoo_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("meeshoo_user");
    }
  }, [user]);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [notice]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.qty,
    0
  );

  const delivery = subtotal > 0 ? 0 : 0;
  const total = subtotal + delivery;

  function showNotice(message) {
    setNotice(message);
  }

  function addToCart(product) {
    if (product.stock <= 0) {
      showNotice("This product is currently out of stock.");
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: Math.min(item.qty + 1, product.stock),
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          qty: 1,
        },
      ];
    });

    showNotice("Product added to cart.");
  }

  function updateQuantity(productId, quantity) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                qty: Math.max(0, Math.min(quantity, item.stock)),
              }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function removeFromCart(productId) {
    setCart((current) => current.filter((item) => item.id !== productId));
    showNotice("Product removed from cart.");
  }

  function toggleWishlist(product) {
    setWishlist((current) => {
      const exists = current.includes(product.id);

      if (exists) {
        return current.filter((id) => id !== product.id);
      }

      return [...current, product.id];
    });
  }

  function startBuyNow(product) {
    setCart([
      {
        ...product,
        qty: 1,
      },
    ]);

    setSelectedProduct(null);
    setCheckoutOpen(true);
  }

  function openCheckout() {
    if (cart.length === 0) {
      showNotice("Your cart is empty.");
      return;
    }

    setCheckoutOpen(true);
  }

  function handleEmailLogin(event) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setLoginMessage("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setLoginMessage("Please enter a valid email address.");
      return;
    }

    /*
      This is intentionally a frontend-only login state.
      Real passwordless email verification must be completed
      through the backend email-auth API in server.js.
    */
    setUser({
      email: cleanEmail,
    });

    setLoginMessage("");
    setLoginOpen(false);
    setEmail("");
    showNotice("Email added successfully.");
  }

  function logout() {
    setUser(null);
    showNotice("You have been logged out.");
  }

  function updateAddress(event) {
    const { name, value } = event.target;

    setAddress((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handlePayment() {
    if (!user) {
      setCheckoutOpen(false);
      setLoginOpen(true);
      showNotice("Please continue with your email before checkout.");
      return;
    }

    const requiredFields = [
      "name",
      "phone",
      "line1",
      "city",
      "state",
      "pincode",
    ];

    const missing = requiredFields.some(
      (field) => !String(address[field]).trim()
    );

    if (missing) {
      showNotice("Please complete your delivery address.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(address.phone.trim())) {
      showNotice("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!/^\d{6}$/.test(address.pincode.trim())) {
      showNotice("Please enter a valid 6-digit PIN code.");
      return;
    }

    setOrderLoading(true);

    try {
      /*
        The frontend expects the backend to create a secure
        payment order. Cashfree credentials must NEVER be placed
        inside this React file.
      */
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            email: user.email,
            name: address.name.trim(),
            phone: address.phone.trim(),
          },
          address: {
            line1: address.line1.trim(),
            city: address.city.trim(),
            state: address.state.trim(),
            pincode: address.pincode.trim(),
          },
          items: cart.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.qty,
            price: item.price,
          })),
          amount: total,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Payment service is not available yet. Please try again."
        );
      }

      if (data.payment_session_id && window.Cashfree) {
        const cashfree = window.Cashfree({
          mode: data.mode === "production" ? "production" : "sandbox",
        });

        await cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          redirectTarget: "_self",
        });

        return;
      }

      if (data.payment_url) {
        window.location.href = data.payment_url;
        return;
      }

      throw new Error(
        "Payment order was created without a payment session."
      );
    } catch (error) {
      showNotice(
        error.message ||
          "Payment could not be started. Please try again."
      );
    } finally {
      setOrderLoading(false);
    }
  }

  return (
    <div className="store-app">
      <style>{`
        .store-app {
          min-height: 100vh;
          background: #f8fafc;
          color: #111827;
        }

        .top-strip {
          background: #5b21b6;
          color: #fff;
          font-size: 13px;
          padding: 8px 20px;
          text-align: center;
        }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(255,255,255,.97);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #e5e7eb;
        }

        .nav-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .brand {
          border: 0;
          background: transparent;
          color: #7c3aed;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -1px;
          cursor: pointer;
          white-space: nowrap;
        }

        .search-box {
          flex: 1;
          position: relative;
          max-width: 620px;
        }

        .search-box input {
          width: 100%;
          height: 44px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 18px;
          background: #f8fafc;
          color: #111827;
        }

        .nav-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-button {
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          border-radius: 10px;
          min-height: 42px;
          padding: 0 13px;
          font-weight: 700;
        }

        .nav-button:hover {
          border-color: #c4b5fd;
          color: #6d28d9;
        }

        .hero {
          max-width: 1280px;
          margin: 0 auto;
          padding: 38px 20px 24px;
        }

        .hero-card {
          min-height: 280px;
          border-radius: 22px;
          padding: 42px;
          background:
            linear-gradient(110deg, rgba(76,29,149,.98), rgba(124,58,237,.9)),
            radial-gradient(circle at right, #ddd6fe, transparent 50%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
        }

        .hero-copy {
          max-width: 620px;
        }

        .hero-copy h1 {
          margin: 0 0 14px;
          font-size: clamp(32px, 5vw, 56px);
          line-height: 1.02;
          letter-spacing: -2px;
        }

        .hero-copy p {
          margin: 0 0 24px;
          font-size: 17px;
          line-height: 1.6;
          color: #ede9fe;
        }

        .hero-button {
          border: 0;
          background: #fff;
          color: #5b21b6;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 800;
        }

        .section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 20px;
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 18px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 26px;
          letter-spacing: -.6px;
        }

        .categories {
          display: flex;
          gap: 9px;
          overflow-x: auto;
          padding-bottom: 4px;
          margin-bottom: 22px;
        }

        .category {
          flex: 0 0 auto;
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          padding: 9px 16px;
          border-radius: 999px;
          font-weight: 700;
        }

        .category.active {
          background: #7c3aed;
          color: #fff;
          border-color: #7c3aed;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .product-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(15,23,42,.04);
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 32px rgba(15,23,42,.10);
        }

        .product-image-wrap {
          position: relative;
          aspect-ratio: 1 / 1;
          background: #f1f5f9;
          overflow: hidden;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .discount {
          position: absolute;
          left: 10px;
          top: 10px;
          background: #16a34a;
          color: #fff;
          border-radius: 6px;
          padding: 5px 7px;
          font-size: 12px;
          font-weight: 800;
        }

        .heart {
          position: absolute;
          right: 10px;
          top: 10px;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 50%;
          background: rgba(255,255,255,.94);
          font-size: 18px;
        }

        .product-content {
          padding: 14px;
        }

        .product-category {
          color: #7c3aed;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .product-name {
          margin: 6px 0;
          font-size: 16px;
          font-weight: 750;
          line-height: 1.35;
          min-height: 43px;
        }

        .rating {
          color: #a16207;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 12px;
        }

        .price {
          font-size: 20px;
          font-weight: 900;
        }

        .mrp {
          color: #9ca3af;
          text-decoration: line-through;
          font-size: 13px;
        }

        .card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .outline-button,
        .primary-button {
          border-radius: 9px;
          padding: 10px 8px;
          font-weight: 800;
        }

        .outline-button {
          background: #fff;
          border: 1px solid #c4b5fd;
          color: #6d28d9;
        }

        .primary-button {
          background: #7c3aed;
          border: 1px solid #7c3aed;
          color: #fff;
        }

        .empty {
          background: #fff;
          border: 1px dashed #cbd5e1;
          border-radius: 16px;
          padding: 50px 20px;
          text-align: center;
          color: #6b7280;
        }

        .overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15,23,42,.58);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .modal {
          width: min(560px, 100%);
          max-height: 92vh;
          overflow: auto;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 25px 70px rgba(0,0,0,.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 22px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 21px;
        }

        .close {
          width: 36px;
          height: 36px;
          border: 0;
          background: #f3f4f6;
          border-radius: 50%;
          font-size: 20px;
        }

        .modal-body {
          padding: 22px;
        }

        .field {
          margin-bottom: 15px;
        }

        .field label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 800;
          color: #374151;
        }

        .field input {
          width: 100%;
          height: 46px;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          padding: 0 13px;
        }

        .full-button {
          width: 100%;
          min-height: 46px;
          border: 0;
          border-radius: 9px;
          background: #7c3aed;
          color: #fff;
          font-weight: 850;
        }

        .login-note {
          margin-top: 12px;
          font-size: 12px;
          line-height: 1.5;
          color: #6b7280;
        }

        .error {
          margin: 10px 0;
          color: #dc2626;
          font-size: 13px;
          font-weight: 700;
        }

        .cart-list {
          display: grid;
          gap: 12px;
        }

        .cart-item {
          display: grid;
          grid-template-columns: 72px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        .cart-item img {
          width: 72px;
          height: 72px;
          border-radius: 9px;
          object-fit: cover;
        }

        .cart-item h4 {
          margin: 0 0 5px;
          font-size: 14px;
        }

        .quantity {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .quantity button {
          width: 28px;
          height: 28px;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          background: #fff;
        }

        .summary {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 10px;
        }

        .summary-total {
          font-size: 19px;
          font-weight: 900;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
        }

        .product-detail {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
        }

        .detail-image {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          border-radius: 14px;
          background: #f1f5f9;
        }

        .detail-info h2 {
          margin: 0 0 10px;
          font-size: 27px;
          line-height: 1.2;
        }

        .detail-description {
          color: #6b7280;
          line-height: 1.65;
          margin: 15px 0;
        }

        .notice {
          position: fixed;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          z-index: 200;
          max-width: calc(100% - 30px);
          background: #111827;
          color: #fff;
          padding: 12px 18px;
          border-radius: 999px;
          box-shadow: 0 12px 30px rgba(0,0,0,.2);
          font-size: 14px;
          font-weight: 700;
        }

        .footer {
          margin-top: 50px;
          padding: 36px 20px;
          background: #111827;
          color: #d1d5db;
        }

        .footer-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .footer strong {
          color: #fff;
        }

        @media (max-width: 1000px) {
          .product-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .nav-actions .desktop-only {
            display: none;
          }
        }

        @media (max-width: 760px) {
          .nav-inner {
            flex-wrap: wrap;
            gap: 10px;
          }

          .brand {
            font-size: 22px;
          }

          .search-box {
            order: 3;
            flex-basis: 100%;
            max-width: none;
          }

          .hero-card {
            padding: 28px 22px;
            min-height: 250px;
          }

          .product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .product-content {
            padding: 11px;
          }

          .product-name {
            font-size: 14px;
          }

          .card-actions {
            grid-template-columns: 1fr;
          }

          .product-detail {
            grid-template-columns: 1fr;
          }

          .cart-item {
            grid-template-columns: 58px 1fr;
          }

          .cart-item img {
            width: 58px;
            height: 58px;
          }

          .cart-item > :last-child {
            grid-column: 2;
          }
        }

        @media (max-width: 430px) {
          .top-strip {
            font-size: 11px;
          }

          .nav-inner {
            padding: 11px 12px;
          }

          .hero,
          .section {
            padding-left: 12px;
            padding-right: 12px;
          }

          .hero-copy h1 {
            font-size: 34px;
          }

          .product-grid {
            gap: 9px;
          }

          .price {
            font-size: 17px;
          }

          .outline-button,
          .primary-button {
            font-size: 12px;
          }
        }
      `}</style>

      <div className="top-strip">
        100% Secure Online Shopping • Free Delivery on Eligible Orders
      </div>

      <header className="navbar">
        <div className="nav-inner">
          <button
            className="brand"
            onClick={() => {
              setCategory("All");
              setSearch("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            MEESHOO
          </button>

          <div className="search-box">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search for products, categories or keywords"
              aria-label="Search products"
            />
          </div>

          <div className="nav-actions">
            <button
              className="nav-button desktop-only"
              onClick={() => setLoginOpen(true)}
            >
              {user ? user.email : "Login"}
            </button>

            <button
              className="nav-button"
              onClick={openCheckout}
              aria-label="Open cart"
            >
              Cart ({cartCount})
            </button>

            {user && (
              <button className="nav-button desktop-only" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-card">
            <div className="hero-copy">
              <h1>Shop smarter. Shop better.</h1>
              <p>
                Discover fashion, electronics, footwear and everyday products
                with great prices and a simple secure checkout experience.
              </p>

              <button
                className="hero-button"
                onClick={() =>
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore Products
              </button>
            </div>
          </div>
        </section>

        <section className="section" id="products">
          <div className="section-heading">
            <h2>Trending Products</h2>
            <span style={{ color: "#6b7280", fontSize: 14 }}>
              {filteredProducts.length} products
            </span>
          </div>

          <div className="categories">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                className={`category ${
                  category === item ? "active" : ""
                }`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty">
              <h3>No products found</h3>
              <p>Try another search or category.</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => {
                const discount = getDiscount(product.price, product.mrp);
                const wished = wishlist.includes(product.id);

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-image-wrap">
                      <img
                        className="product-image"
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                      />

                      <span className="discount">{discount}% OFF</span>

                      <button
                        className="heart"
                        onClick={() => toggleWishlist(product)}
                        aria-label={
                          wished
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                      >
                        {wished ? "♥" : "♡"}
                      </button>
                    </div>

                    <div className="product-content">
                      <div className="product-category">
                        {product.category}
                      </div>

                      <div className="product-name">{product.name}</div>

                      <div className="rating">
                        ★ {product.rating} · {product.reviews} reviews
                      </div>

                      <div className="price-row">
                        <span className="price">
                          {formatPrice(product.price)}
                        </span>

                        <span className="mrp">
                          {formatPrice(product.mrp)}
                        </span>
                      </div>

                      <div className="card-actions">
                        <button
                          className="outline-button"
                          onClick={() => setSelectedProduct(product)}
                        >
                          View
                        </button>

                        <button
                          className="primary-button"
                          onClick={() => addToCart(product)}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>MEESHOO</strong>
            <div style={{ marginTop: 7 }}>
              Your everyday online shopping destination.
            </div>
          </div>

          <div>
            Secure online payments • Fast delivery • Easy shopping
          </div>
        </div>
      </footer>

      {notice && <div className="notice">{notice}</div>}

      {loginOpen && (
        <div className="overlay" onMouseDown={() => setLoginOpen(false)}>
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Continue with Email</h2>

              <button
                className="close"
                onClick={() => setLoginOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p style={{ color: "#6b7280", lineHeight: 1.55 }}>
                Enter your email to continue shopping and manage your orders.
              </p>

              <form onSubmit={handleEmailLogin}>
                <div className="field">
                  <label htmlFor="login-email">Email address</label>

                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                {loginMessage && (
                  <div className="error">{loginMessage}</div>
                )}

                <button className="full-button" type="submit">
                  Continue with Email
                </button>
              </form>

              <div className="login-note">
                A real passwordless email verification link must be generated
                and verified by the secure backend. No email password or OTP
                is stored in this frontend.
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div
          className="overlay"
          onMouseDown={() => setSelectedProduct(null)}
        >
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Product Details</h2>

              <button
                className="close"
                onClick={() => setSelectedProduct(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="product-detail">
                <img
                  className="detail-image"
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                />

                <div className="detail-info">
                  <div className="product-category">
                    {selectedProduct.category}
                  </div>

                  <h2>{selectedProduct.name}</h2>

                  <div className="rating">
                    ★ {selectedProduct.rating} ·{" "}
                    {selectedProduct.reviews} reviews
                  </div>

                  <div className="price-row">
                    <span className="price">
                      {formatPrice(selectedProduct.price)}
                    </span>

                    <span className="mrp">
                      {formatPrice(selectedProduct.mrp)}
                    </span>
                  </div>

                  <p className="detail-description">
                    {selectedProduct.description}
                  </p>

                  <button
                    className="full-button"
                    onClick={() => addToCart(selectedProduct)}
                  >
                    Add to Cart
                  </button>

                  <div style={{ height: 9 }} />

                  <button
                    className="full-button"
                    style={{
                      background: "#fff",
                      color: "#6d28d9",
                      border: "1px solid #c4b5fd",
                    }}
                    onClick={() => startBuyNow(selectedProduct)}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div
          className="overlay"
          onMouseDown={() => setCheckoutOpen(false)}
        >
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Secure Checkout</h2>

              <button
                className="close"
                onClick={() => setCheckoutOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {!user ? (
                <div className="empty">
                  <h3>Continue with Email</h3>
                  <p>
                    Please enter your email before placing the order.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => {
                      setCheckoutOpen(false);
                      setLoginOpen(true);
                    }}
                  >
                    Continue with Email
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "#f5f3ff",
                      color: "#5b21b6",
                      marginBottom: 18,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Logged in as {user.email}
                  </div>

                  <h3 style={{ marginTop: 0 }}>Delivery Details</h3>

                  <div className="field">
                    <label htmlFor="checkout-name">Full name</label>
                    <input
                      id="checkout-name"
                      name="name"
                      value={address.name}
                      onChange={updateAddress}
                      placeholder="Full name"
                      autoComplete="name"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="checkout-phone">
                      Mobile number
                    </label>
                    <input
                      id="checkout-phone"
                      name="phone"
                      value={address.phone}
                      onChange={updateAddress}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="checkout-address">
                      Address
                    </label>
                    <input
                      id="checkout-address"
                      name="line1"
                      value={address.line1}
                      onChange={updateAddress}
                      placeholder="House no., street, area"
                      autoComplete="street-address"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="checkout-city">City</label>
                    <input
                      id="checkout-city"
                      name="city"
                      value={address.city}
                      onChange={updateAddress}
                      placeholder="City"
                      autoComplete="address-level2"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="checkout-state">State</label>
                    <input
                      id="checkout-state"
                      name="state"
                      value={address.state}
                      onChange={updateAddress}
                      placeholder="State"
                      autoComplete="address-level1"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="checkout-pincode">
                      PIN code
                    </label>
                    <input
                      id="checkout-pincode"
                      name="pincode"
                      value={address.pincode}
                      onChange={updateAddress}
                      placeholder="6-digit PIN code"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                    />
                  </div>

                  <div className="summary">
                    <div className="summary-row">
                      <span>Items</span>
                      <span>{cartCount}</span>
                    </div>

                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>

                    <div className="summary-row">
                      <span>Delivery</span>
                      <span>FREE</span>
                    </div>

                    <div className="summary-row summary-total">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  <button
                    className="full-button"
                    style={{ marginTop: 18 }}
                    onClick={handlePayment}
                    disabled={orderLoading}
                  >
                    {orderLoading
                      ? "Preparing Secure Payment..."
                      : `Pay ${formatPrice(total)}`}
                  </button>

                  <p className="login-note">
                    Your mobile number is collected for delivery. No OTP is
                    requested at checkout.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
