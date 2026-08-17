import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactDOM from "react-dom/client";

const API =
  import.meta.env.VITE_API_URL ||
  "";

const SITE_MODE =
  import.meta.env.VITE_SITE_MODE ||
  "customer";

const SIZE_PRESETS = {
  clothing: ["S", "M", "L", "XL", "XXL"],
  pants: ["28", "30", "32", "34", "36", "38", "40", "42"],
  shoes: ["6", "7", "8", "9", "10", "11"],
  belt: ["30", "32", "34", "36", "38", "40"],
  oneSize: ["ONE SIZE"],
};

const DEFAULT_CATEGORIES = [
  "All",
  "Women",
  "Men",
  "Electronics",
  "Beauty",
  "Footwear",
  "Home",
  "Kitchen",
  "Grocery",
  "Accessories",
  "Kids",
  "Sports",
  "Bags",
  "Jewellery",
  "Watches",
  "Mobiles",
  "Mobile Accessories",
  "Laptops",
  "Laptop Accessories",
];

function formatPrice(value) {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN"
  )}`;
}

function getProductSizes(product) {
  return Array.isArray(product?.sizes)
    ? product.sizes.filter((entry) => String(entry?.size || "").trim())
    : [];
}

function getSizePrice(product, size) {
  const entry = getProductSizes(product).find(
    (item) => String(item.size).toUpperCase() === String(size || "").toUpperCase()
  );
  return entry?.price === null || entry?.price === undefined || entry?.price === ""
    ? Number(product?.price || 0)
    : Number(entry.price);
}

function buildUpiUri({ upiId, name, amount, orderId }) {
  const params = new URLSearchParams({
    pa: String(upiId || "").trim(),
    pn: String(name || "Meeshoo Store").trim(),
    am: Number(amount || 0).toFixed(2),
    cu: "INR",
    tr: String(orderId || `ORDER-${Date.now()}`),
  });
  return `upi://pay?${params.toString()}`;
}

function buildQrUrl(upiUri) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(upiUri)}`;
}

async function compressProductImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please select image files only.");
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to open image."));
    img.src = dataUrl;
  });

  const maxSide = 1600;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is not supported by this browser.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.82);
}

function openUpiApp(app, upiUri) {
  const packages = {
    gpay: "com.google.android.apps.nbu.paisa.user",
    phonepe: "com.phonepe.app",
    paytm: "net.one97.paytm",
  };
  const query = upiUri.split("?")[1] || "";
  if (app === "other") {
    window.location.href = upiUri;
    return;
  }
  const intent = `intent://pay?${query}#Intent;scheme=upi;package=${packages[app]};end`;
  try {
    window.location.href = intent;
    setTimeout(() => {
      if (document.visibilityState === "visible") window.location.href = upiUri;
    }, 1200);
  } catch {
    window.location.href = upiUri;
  }
}

async function apiFetch(
  path,
  options = {}
) {
  const response = await fetch(
    `${API}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  const data =
    await response.json().catch(
      () => ({})
    );

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Something went wrong."
    );
  }

  return data;
}

function getAdminToken() {
  return localStorage.getItem(
    "meeshoo_admin_token"
  );
}

function adminHeaders() {
  const token =
    getAdminToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

/* =====================================================
   CUSTOMER STORE
   ===================================================== */

function StoreApp() {
  const [products, setProducts] =
    useState([]);

  const [categories, setCategories] =
    useState(
      DEFAULT_CATEGORIES
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [sort, setSort] =
    useState("popular");

  const [page, setPage] =
    useState(1);

  const [totalProducts, setTotalProducts] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    selectedImage,
    setSelectedImage,
  ] = useState(0);

  const [selectedSize, setSelectedSize] = useState("");

  const [cart, setCart] =
    useState([]);

  const [wishlist, setWishlist] =
    useState([]);

  const [cartOpen, setCartOpen] =
    useState(false);

  const [loginOpen, setLoginOpen] =
    useState(false);

  const [
    checkoutOpen,
    setCheckoutOpen,
  ] = useState(false);

  const [
    paymentOpen,
    setPaymentOpen,
  ] = useState(false);

  const [email, setEmail] =
    useState("");

  const [user, setUser] =
    useState(null);

  const [notice, setNotice] =
    useState("");

  const [address, setAddress] =
    useState({
      name: "",
      phone: "",
      line1: "",
      city: "",
      state: "",
      pincode: "",
    });

  const [orderInfo, setOrderInfo] =
    useState(null);

  const [paymentSettings, setPaymentSettings] =
    useState(null);

  const [utr, setUtr] =
    useState("");

  const [
    paymentScreenshot,
    setPaymentScreenshot,
  ] = useState("");

  const [
    paymentSubmitting,
    setPaymentSubmitting,
  ] = useState(false);

  const [homepage, setHomepage] = useState({
    settings: {},
    best_selling: [],
    featured: [],
    new_arrivals: [],
  });

  const [offerOpen, setOfferOpen] = useState(false);
  const [pendingBuyNow, setPendingBuyNow] = useState(false);

  const PRODUCTS_PER_PAGE = 40;

  useEffect(() => {
    const savedCart =
      localStorage.getItem(
        "meeshoo_cart"
      );

    const savedWishlist =
      localStorage.getItem(
        "meeshoo_wishlist"
      );

    const savedUser =
      localStorage.getItem(
        "meeshoo_user"
      );

    try {
      if (savedCart) {
        setCart(
          JSON.parse(savedCart)
        );
      }

      if (savedWishlist) {
        setWishlist(
          JSON.parse(
            savedWishlist
          )
        );
      }

      if (savedUser) {
        setUser(
          JSON.parse(savedUser)
        );
      }
    } catch {
      localStorage.removeItem(
        "meeshoo_cart"
      );

      localStorage.removeItem(
        "meeshoo_wishlist"
      );

      localStorage.removeItem(
        "meeshoo_user"
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "meeshoo_cart",
      JSON.stringify(cart)
    );
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(
      "meeshoo_wishlist",
      JSON.stringify(wishlist)
    );
  }, [wishlist]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(
        "meeshoo_user",
        JSON.stringify(user)
      );
    }
  }, [user]);

  useEffect(() => {
    // Render the last known first page immediately on repeat visits.
    // The live API request below always refreshes it without changing database data.
    try {
      const cached = JSON.parse(localStorage.getItem("meeshoo_products_cache") || "null");
      if (cached && Array.isArray(cached.products) && cached.products.length) {
        setProducts(cached.products.slice(0, PRODUCTS_PER_PAGE));
        setTotalProducts(Number(cached.total || cached.products.length));
        setTotalPages(Number(cached.totalPages || Math.max(1, Math.ceil((cached.total || cached.products.length) / PRODUCTS_PER_PAGE))));
        setLoading(false);
      }
    } catch {}

    loadCategories();
    loadHomepage();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(true);
    }, search.trim() ? 250 : 0);

    return () => clearTimeout(timer);
  }, [search, category, sort, page]);

  useEffect(() => {
    if (!notice) return;

    const timer =
      setTimeout(() => {
        setNotice("");
      }, 3500);

    return () =>
      clearTimeout(timer);
  }, [notice]);

  async function loadHomepage() {
    try {
      const data = await apiFetch("/api/homepage");
      setHomepage({
        settings: data.settings || {},
        best_selling: data.best_selling || [],
        featured: data.featured || [],
        new_arrivals: data.new_arrivals || [],
      });
      const settings = data.settings || {};
      if (settings.offer_enabled && !sessionStorage.getItem("meeshoo_offer_seen")) {
        setOfferOpen(true);
        sessionStorage.setItem("meeshoo_offer_seen", "1");
      }
    } catch (error) {
      console.error("Homepage load error:", error);
    }
  }

  async function loadProducts(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PRODUCTS_PER_PAGE));
      params.set("sort", sort);
      if (category && category !== "All") params.set("category", category);
      if (search.trim()) params.set("search", search.trim());

      const data = await apiFetch(`/api/products?${params.toString()}`);
      const nextProducts = Array.isArray(data.products) ? data.products : [];

      setProducts(nextProducts);
      setTotalProducts(Number(data.total || 0));
      setTotalPages(Math.max(1, Number(data.totalPages || 1)));

      // Only cache the first/default page. This stays small and makes repeat visits fast.
      if (page === 1 && category === "All" && !search.trim() && sort === "popular") {
        try {
          localStorage.setItem(
            "meeshoo_products_cache",
            JSON.stringify({
              products: nextProducts,
              total: Number(data.total || 0),
              totalPages: Number(data.totalPages || 1),
              savedAt: Date.now(),
            })
          );
        } catch {}
      }
    } catch (err) {
      if (!products.length) {
        setError(err.message || "Products could not be loaded.");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const data =
        await apiFetch(
          "/api/categories"
        );

      if (Array.isArray(data.categories)) {
        const serverCategories = data.categories.filter(Boolean);
        setCategories([
          ...new Set([
            ...DEFAULT_CATEGORIES,
            ...serverCategories,
          ]),
        ]);
      }
    } catch {
      setCategories(
        DEFAULT_CATEGORIES
      );
    }
  }

  function notify(message) {
    setNotice(message);
  }

  const filteredProducts = products;

  const visibleProducts = products;

  const cartCount =
    cart.reduce(
      (sum, item) =>
        sum + Number(item.qty),
      0
    );

  const subtotal =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price) *
          Number(item.qty),
      0
    );

  const total =
    subtotal;

  function toggleWishlist(
    productId
  ) {
    setWishlist(
      (current) =>
        current.includes(productId)
          ? current.filter(
              (id) =>
                id !== productId
            )
          : [
              ...current,
              productId,
            ]
    );
  }

  function addToCart(product, requestedSize = "") {
    const sizes = getProductSizes(product);
    const cleanSize = String(requestedSize || "").trim().toUpperCase();
    const sizeEntry = sizes.find((entry) => String(entry.size).toUpperCase() === cleanSize);

    if (sizes.length && !sizeEntry) {
      openProduct(product);
      notify("Please select a size first.");
      return;
    }

    const availableStock = sizeEntry
      ? Number(sizeEntry.stock || 0)
      : Number(product.stock || 0);

    if (availableStock <= 0) {
      notify(sizeEntry ? `Size ${cleanSize} is out of stock.` : "This product is out of stock.");
      return;
    }

    const price = sizeEntry
      ? getSizePrice(product, cleanSize)
      : Number(product.price || 0);

    const cartKey = `${product.id}__${cleanSize || "NOSIZE"}`;

    setCart((current) => {
      const existing = current.find((item) => (item.cartKey || `${item.id}__${item.size || "NOSIZE"}`) === cartKey);

      if (existing) {
        return current.map((item) =>
          (item.cartKey || `${item.id}__${item.size || "NOSIZE"}`) === cartKey
            ? { ...item, qty: Math.min(Number(item.qty) + 1, availableStock), stock: availableStock, price }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          cartKey,
          size: cleanSize || null,
          price,
          stock: availableStock,
          qty: 1,
        },
      ];
    });

    notify(sizeEntry ? `Size ${cleanSize} added to cart.` : "Added to cart.");
  }

  function buyNow(product, requestedSize = "") {
    const sizes = getProductSizes(product);
    const cleanSize = String(requestedSize || "").trim().toUpperCase();
    const sizeEntry = sizes.find((entry) => String(entry.size).toUpperCase() === cleanSize);
    if (sizes.length && !sizeEntry) {
      openProduct(product);
      notify("Please select a size first.");
      return;
    }
    const availableStock = sizeEntry ? Number(sizeEntry.stock || 0) : Number(product.stock || 0);
    if (availableStock <= 0) {
      notify(sizeEntry ? `Size ${cleanSize} is out of stock.` : "This product is out of stock.");
      return;
    }
    const price = sizeEntry ? getSizePrice(product, cleanSize) : Number(product.price || 0);
    const cartKey = `${product.id}__${cleanSize || "NOSIZE"}`;
    const item = { ...product, cartKey, size: cleanSize || null, price, stock: availableStock, qty: 1 };
    setCart((current) => {
      const other = current.filter((x) => (x.cartKey || `${x.id}__${x.size || "NOSIZE"}`) !== cartKey);
      return [...other, item];
    });
    setSelectedProduct(null);
    if (!user) {
      setPendingBuyNow(true);
      setLoginOpen(true);
    } else {
      setCheckoutOpen(true);
    }
  }

  function removeFromCart(
    id,
    size = ""
  ) {
    const cartKey = `${id}__${String(size || "").toUpperCase() || "NOSIZE"}`;
    setCart(
      (current) =>
        current.filter(
          (item) =>
            (item.cartKey || `${item.id}__${item.size || "NOSIZE"}`) !== cartKey
        )
    );

    notify(
      "Product removed."
    );
  }

  function changeQuantity(
    id,
    amount,
    size = ""
  ) {
    const cartKey = `${id}__${String(size || "").toUpperCase() || "NOSIZE"}`;
    setCart(
      (current) =>
        current
          .map((item) => {
            if (
              (item.cartKey || `${item.id}__${item.size || "NOSIZE"}`) !== cartKey
            ) {
              return item;
            }

            const quantity =
              Math.max(
                0,
                Math.min(
                  Number(
                    item.qty
                  ) +
                    amount,
                  Number(
                    item.stock
                  )
                )
              );

            return {
              ...item,
              qty: quantity,
            };
          })
          .filter(
            (item) =>
              item.qty > 0
          )
    );
  }

  function openProduct(
    product
  ) {
    setSelectedProduct(product);
    setSelectedImage(0);
    const firstAvailable = getProductSizes(product).find((entry) => Number(entry.stock || 0) > 0);
    setSelectedSize(String(firstAvailable?.size || "").trim().toUpperCase());
  }

  function updateAddress(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setAddress(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  async function loginWithEmail(
    event
  ) {
    event.preventDefault();

    try {
      const clean =
        email
          .trim()
          .toLowerCase();

      const data =
        await apiFetch(
          "/api/auth/email-login",
          {
            method: "POST",
            body: JSON.stringify({
              email: clean,
            }),
          }
        );

      setUser(
        data.user
      );

      setLoginOpen(false);
      setEmail("");
      if (pendingBuyNow) {
        setPendingBuyNow(false);
        setCheckoutOpen(true);
      }

      notify(
        "Login successful."
      );
    } catch (err) {
      notify(
        err.message
      );
    }
  }

  function openCheckout() {
    if (!cart.length) {
      notify(
        "Your cart is empty."
      );
      return;
    }

    if (!user) {
      setCartOpen(false);
      setLoginOpen(true);
      return;
    }

    setCartOpen(false);
    setCheckoutOpen(true);
  }

  async function createOrder() {
    if (!user) {
      setLoginOpen(true);
      return;
    }

    if (
      !address.name.trim()
    ) {
      notify(
        "Enter your full name."
      );
      return;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        address.phone.trim()
      )
    ) {
      notify(
        "Enter a valid 10-digit mobile number."
      );
      return;
    }

    if (
      !address.line1.trim()
    ) {
      notify(
        "Enter your address."
      );
      return;
    }

    if (
      !address.city.trim()
    ) {
      notify(
        "Enter your city."
      );
      return;
    }

    if (
      !address.state.trim()
    ) {
      notify(
        "Enter your state."
      );
      return;
    }

    if (
      !/^\d{6}$/.test(
        address.pincode.trim()
      )
    ) {
      notify(
        "Enter a valid 6-digit PIN."
      );
      return;
    }

    try {
      const data =
        await apiFetch(
          "/api/payments/create-order",
          {
            method: "POST",
            body: JSON.stringify({
              customer: {
                email:
                  user.email,
                name:
                  address.name.trim(),
                phone:
                  address.phone.trim(),
              },

              address: {
                line1:
                  address.line1.trim(),
                city:
                  address.city.trim(),
                state:
                  address.state.trim(),
                pincode:
                  address.pincode.trim(),
              },

              items: cart.map(
                (item) => ({
                  id: item.id,
                  size: item.size || null,
                  quantity: Number(item.qty),
                })
              ),
            }),
          }
        );

      setOrderInfo(data);

      setCheckoutOpen(false);
      setPaymentOpen(true);

      setPaymentSettings(
        data.payment
      );

      await loadProducts(false);
    } catch (err) {
      notify(
        err.message
      );
    }
  }

  async function submitUPI() {
    if (!orderInfo?.order_id) {
      notify(
        "Order information is missing."
      );
      return;
    }

    if (!utr.trim()) {
      notify(
        "Enter your UTR / transaction reference."
      );
      return;
    }

    try {
      setPaymentSubmitting(
        true
      );

      await apiFetch(
        "/api/payments/upi/submit",
        {
          method: "POST",
          body: JSON.stringify({
            order_id:
              orderInfo.order_id,

            email:
              user?.email,

            transaction_reference:
              utr.trim(),

            payment_screenshot_url:
              paymentScreenshot.trim(),
          }),
        }
      );

      setCart([]);

      setPaymentOpen(false);

      setUtr("");

      setPaymentScreenshot(
        ""
      );

      notify(
        "Payment details submitted. Your order is waiting for verification."
      );
    } catch (err) {
      notify(
        err.message
      );
    } finally {
      setPaymentSubmitting(
        false
      );
    }
  }

  function goToPage(
    number
  ) {
    setPage(
      Math.max(
        1,
        Math.min(
          number,
          totalPages
        )
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const bannerText = String(homepage.settings.offer_text || "Up to 60% OFF on Fashion, Footwear, Electronics & more");
  const bannerDiscount = (bannerText.match(/(?:up\s*to\s*)?(\d{1,3})\s*%/i) || [])[1] || "60";

  return (
    <div className="store">
      <style>{STORE_CSS}</style>

      <div className="topbar">
        📣 <strong>{homepage.settings.offer_title || "BIG FESTIVAL SALE"}</strong>
        <span> • 🇮🇳 Made for India • UPI Payments • Easy Checkout</span>
        <button
          className="topbar-button"
          onClick={() => document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"})}
        >
          {homepage.settings.offer_button || "Shop Now"}
        </button>
      </div>

      <header className="header">
        <div className="header-inner">
          <button
            className="logo"
            onClick={() => {
              setCategory("All");
              setSearch("");
              setPage(1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="logo-mark">M</span>
            <span>MEESHOO <small>SHOPPING</small></span>
            <span className="india-mark">🇮🇳</span>
          </button>

          <div className="search">
            <input
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search for products, categories or brands..."
            />
            <span className="search-icon">⌕</span>
          </div>

          <div className="header-actions">
            <button className="header-button" onClick={() => setLoginOpen(true)}>
              <span>♙</span>
              <small>My Account</small>
            </button>
            <button className="header-button wishlist-head" onClick={() => setNotice("Wishlist is ready.")}>
              <span>♡</span>
              <small>Wishlist</small>
            </button>
            <button className="header-button cart-head" onClick={() => setCartOpen(true)}>
              <span>🛒</span>
              <small>Cart <b>({cartCount})</b></small>
            </button>
          </div>
        </div>

        <nav className="main-nav">
          <button className="all-categories" onClick={() => document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"})}>☰ All Categories⌄</button>
          <button className="nav-link active" onClick={() => window.scrollTo({top:0,behavior:"smooth"})}>Home</button>
          <button className="nav-link" onClick={() => document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"})}>Categories</button>
          <button className="nav-link" onClick={() => document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"})}>New Arrivals</button>
          <button className="nav-link" onClick={() => document.getElementById("best-selling")?.scrollIntoView({behavior:"smooth"})}>Best Selling</button>
          <button className="nav-link hot" onClick={() => document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"})}>Offers <em>HOT</em></button>
          <button className="nav-link" onClick={() => setNotice("Track Order is available from the Orders section.")}>Track Order</button>
          <button className="nav-link" onClick={() => window.location.href=`mailto:${homepage.settings.contact_email || "meeshoshoppinginfo@gmail.com"}`}>Contact Us</button>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-card">
          <div className="hero-copy">
            <span className="hero-kicker">LIMITED TIME ONLY</span>
            <h1>{homepage.settings.offer_title || "DIWALI SPECIAL MEGA SALE"}</h1>
            <p>{bannerText}</p>
            <button
              className="hero-button"
              onClick={() => document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"})}
            >
              {homepage.settings.offer_button || "Shop Now"} <span>→</span>
            </button>
          </div>

          <div className="hero-art">
            {homepage.settings.offer_image ? (
              <img src={homepage.settings.offer_image} alt="Festival offer" />
            ) : (
              <>
                <div className="hero-spark">✦</div>
                <div className="hero-diya">🪔</div>
                <div className="hero-discount"><small>UP TO</small><strong>{bannerDiscount}%</strong><b>OFF</b></div>
                <div className="hero-gift">🎁</div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div><span>🛡️</span><strong>100% Original Products</strong><small>Quality You Can Trust</small></div>
        <div><span>↩️</span><strong>Easy Returns</strong><small>7 Days Return Policy</small></div>
        <div><span>🚚</span><strong>Fast Delivery</strong><small>Across India</small></div>
        <div><span>🔐</span><strong>Secure Payments</strong><small>UPI, Card, Netbanking</small></div>
      </section>

      {offerOpen && (
        <div className="offer-overlay" onClick={() => setOfferOpen(false)}>
          <div className="offer-popup" onClick={(e) => e.stopPropagation()}>
            <button className="offer-close" onClick={() => setOfferOpen(false)}>×</button>
            {homepage.settings.offer_image && <img src={homepage.settings.offer_image} alt="Offer" />}
            <div className="offer-body">
              <div className="offer-badge">SPECIAL OFFER</div>
              <h2>{homepage.settings.offer_title || "Welcome to MeeshooShopping"}</h2>
              <p>{homepage.settings.offer_text || "Shop our latest deals today."}</p>
              <button className="hero-button" onClick={() => { setOfferOpen(false); document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"}); }}>
                {homepage.settings.offer_button || "Shop Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="category-showcase">
        <div className="section-title">
          <h2>Shop By Categories</h2>
          <button className="text-link" onClick={() => document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"})}>View All →</button>
        </div>
        <div className="category-showcase-grid">
          {categories.slice(0, 8).map((item) => (
            <button key={`show-${item}`} className="category-tile" onClick={() => { setCategory(item); document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"}); }}>
              <span>{({All:"🛍️",Women:"👗",Men:"👔",Electronics:"🎧",Beauty:"💄",Footwear:"👟",Home:"🛋️",Kitchen:"🍳",Grocery:"🛒",Accessories:"👜",Kids:"🧸",Sports:"⚽",Bags:"👜",Jewellery:"💎",Watches:"⌚"})[item] || "🛍️"}</span>
              <b>{item}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="deals-section">
        <div className="section-title">
          <h2>⚡ Deals of the Day</h2>
          <span className="deal-timer">Limited stock • Today only</span>
        </div>
        <div className="deals-grid">
          {products.slice(0, 5).map((product) => (
            <article className="deal-card" key={`deal-${product.id}`} onClick={() => openProduct(product)}>
              <div className="deal-image">
                <span>SALE</span>
                <img src={product.images?.[0] || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=85"} alt={product.name} />
              </div>
              <div className="deal-body">
                <strong>{product.name}</strong>
                <span>★ {product.rating || 4.5}</span>
                <div><b>{formatPrice(product.price)}</b> <del>{formatPrice(product.mrp || product.price)}</del></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section slider-section" id="best-selling">
        <div className="section-title">
          <h2>{homepage.settings.best_selling_title || "🔥 Best Selling Products"}</h2>
          <span className="result-count">Swipe to explore</span>
        </div>
        <div className="product-slider">
          {(homepage.best_selling.length ? homepage.best_selling : products.slice(0, 10)).map((product) => (
            <article className="mini-card" key={`best-${product.id}`} onClick={() => openProduct(product)}>
              <img src={product.images?.[0] || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=85"} alt={product.name} />
              <div className="mini-card-body">
                <strong>{product.name}</strong>
                <span>★ {product.rating || 4.5}</span>
                <b>{formatPrice(product.price)}</b>
              </div>
            </article>
          ))}
        </div>
      </section>

      <main
        className="content"
        id="catalog"
      >
        <div className="section-title">
          <h2>
            Explore Products
          </h2>

          <span className="result-count">
            {products.length.toLocaleString(
              "en-IN"
            )}{" "}
            products
          </span>
        </div>

        <div className="categories">
          {categories.map(
            (item) => (
              <button
                key={item}
                className={`category ${
                  category === item
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setCategory(item);
                  setPage(1);
                }}
              >
                <span className="category-icon">{({All:"🛍️",Women:"👗",Men:"👔",Electronics:"📱",Mobiles:"📱","Mobile Accessories":"📱",Laptops:"💻","Laptop Accessories":"💻",Beauty:"💄",Footwear:"👟",Home:"🏠",Kitchen:"🍳",Grocery:"🛒",Accessories:"👜",Kids:"🧸",Sports:"⚽",Bags:"👜",Jewellery:"💎",Watches:"⌚"})[item] || "🛍️"}</span> {item}
              </button>
            )
          )}
        </div>

        <div className="toolbar">
          <span className="result-count">
            Showing{" "}
            {totalProducts
              ? (page - 1) * PRODUCTS_PER_PAGE + 1
              : 0}
            –
            {Math.min(
              page * PRODUCTS_PER_PAGE,
              totalProducts
            )}{" "}
            of{" "}
            {totalProducts}
          </span>

          <select
            className="sort"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
          >
            <option value="popular">
              Popular
            </option>

            <option value="rating">
              Highest Rated
            </option>

            <option value="discount">
              Biggest Discount
            </option>

            <option value="price-low">
              Price: Low to High
            </option>

            <option value="price-high">
              Price: High to Low
            </option>
          </select>
        </div>

        {loading ? (
          <div className="empty">
            <h3>
              Loading products...
            </h3>

            <p>
              Please wait.
            </p>
          </div>
        ) : error ? (
          <div className="empty">
            <h3>
              Products could not
              be loaded
            </h3>

            <p>{error}</p>

            <button
              className="primary"
              onClick={
                loadProducts
              }
            >
              Try Again
            </button>
          </div>
        ) : visibleProducts.length ===
          0 ? (
          <div className="empty">
            <h3>
              No products found
            </h3>

            <p>
              Try another category
              or search.
            </p>
          </div>
        ) : (
          <div className="grid">
            {visibleProducts.map(
              (product) => (
                <article
                  className="card"
                  key={product.id}
                >
                  <div className="image-wrap">
                    <img
                      src={
                        product.images?.[0]
                      }
                      alt={
                        product.name
                      }
                      loading="lazy"
                    />

                    {Number(
                      product.discount
                    ) > 0 && (
                      <span className="discount">
                        {
                          product.discount
                        }
                        % OFF
                      </span>
                    )}

                    <button
                      className="heart"
                      onClick={() =>
                        toggleWishlist(
                          product.id
                        )
                      }
                    >
                      {wishlist.includes(
                        product.id
                      )
                        ? "♥"
                        : "♡"}
                    </button>
                  </div>

                  <div className="card-body">
                    <div className="category-label">
                      {
                        product.category
                      }
                    </div>

                    <div className="product-name">
                      {
                        product.name
                      }
                    </div>

                    {getProductSizes(selectedProduct).length > 0 && !selectedSize && (
                    <p className="stock-detail" style={{ marginTop: 8 }}>Select an available size to continue.</p>
                  )}

                  <div className="rating">
                      ★{" "}
                      {
                        product.rating
                      }{" "}
                      ·{" "}
                      {
                        product.reviews
                      }{" "}
                      reviews
                    </div>

                    <div className="price-line">
                      <span className="price">
                        {formatPrice(
                          product.price
                        )}
                      </span>

                      {Number(
                        product.mrp
                      ) >
                        Number(
                          product.price
                        ) && (
                        <span className="mrp">
                          {formatPrice(
                            product.mrp
                          )}
                        </span>
                      )}
                    </div>

                    <div className="stock-small">
                      {Number(
                        product.stock
                      ) > 0
                        ? `In stock: ${product.stock}`
                        : "Out of stock"}
                    </div>

                    <div className="actions">
                      <button
                        className="primary buy-now-card"
                        onClick={() => buyNow(product)}
                      >
                        ⚡ Buy Now
                      </button>
                      <button
                        className="secondary"
                        onClick={() => openProduct(product)}
                      >
                        View Details
                      </button>
                      <button
                        className="secondary cart-card-button"
                        disabled={Number(product.stock) <= 0 && getProductSizes(product).length === 0}
                        onClick={() => addToCart(product)}
                      >
                        🛒 Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-button"
              disabled={
                page === 1
              }
              onClick={() =>
                goToPage(
                  page - 1
                )
              }
            >
              ‹
            </button>

            {Array.from(
              {
                length:
                  Math.min(
                    totalPages,
                    7
                  ),
              },
              (_, index) => {
                let number;

                if (
                  totalPages <=
                  7
                ) {
                  number =
                    index + 1;
                } else if (
                  page <= 4
                ) {
                  number =
                    index + 1;
                } else if (
                  page >=
                  totalPages - 3
                ) {
                  number =
                    totalPages -
                    6 +
                    index;
                } else {
                  number =
                    page -
                    3 +
                    index;
                }

                return (
                  <button
                    key={number}
                    className={`page-button ${
                      page === number
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      goToPage(
                        number
                      )
                    }
                  >
                    {number}
                  </button>
                );
              }
            )}

            <button
              className="page-button"
              disabled={
                page ===
                totalPages
              }
              onClick={() =>
                goToPage(
                  page + 1
                )
              }
            >
              ›
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-brand">🇮🇳 <strong>{homepage.settings.company_name || "MEESHO SHOPPING"}</strong></div>
        <p>{homepage.settings.company_about || "Your trusted online shopping destination."}</p>
        <div className="footer-contact">
          <a href={`mailto:${homepage.settings.contact_email || "meeshoshoppinginfo@gmail.com"}`}>📧 {homepage.settings.contact_email || "meeshoshoppinginfo@gmail.com"}</a>
          <a href={homepage.settings.telegram_url || "https://t.me/MeeshooShopping"} target="_blank" rel="noreferrer">✈️ Telegram</a>
        </div>
        <div className="footer-links">About Us • Product Details • Shipping • Returns • Privacy • Terms</div>
      </footer>

      {notice && (
        <div className="notice">
          {notice}
        </div>
      )}

      {selectedProduct && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setSelectedProduct(
              null
            )
          }
        >
          <div
            className="modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h2>
                Product Details
              </h2>

              <button
                className="close"
                onClick={() =>
                  setSelectedProduct(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="detail">
                <div>
                  <div className="gallery-main">
                    <img
                      src={
                        selectedProduct.images?.[selectedImage] ||
                        selectedProduct.images?.[0] ||
                        "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=85"
                      }
                      alt={
                        selectedProduct.name
                      }
                    />
                  </div>

                  <div className="thumbnails">
                    {(
                      selectedProduct
                        .images ||
                      []
                    )
                      .slice(
                        0,
                        8
                      )
                      .map(
                        (
                          image,
                          index
                        ) => (
                          <button
                            key={`${image}-${index}`}
                            className={`thumbnail ${
                              selectedImage ===
                              index
                                ? "active"
                                : ""
                            }`}
                            onClick={() =>
                              setSelectedImage(
                                index
                              )
                            }
                          >
                            <img
                              src={image}
                              alt={`${selectedProduct.name} ${index + 1}`}
                            />
                          </button>
                        )
                      )}
                  </div>
                </div>

                <div className="detail-info">
                  <div className="category-label">
                    {
                      selectedProduct.category
                    }
                  </div>

                  <h2>
                    {
                      selectedProduct.name
                    }
                  </h2>

                  {getProductSizes(selectedProduct).length > 0 && (
                    <div className="size-picker">
                      <div className="size-picker-title">Select Size</div>
                      <div className="size-options">
                        {getProductSizes(selectedProduct).map((entry) => (
                          <button
                            key={entry.size}
                            type="button"
                            className={`size-option ${selectedSize === String(entry.size).toUpperCase() ? "active" : ""}`}
                            disabled={Number(entry.stock || 0) <= 0}
                            onClick={() => setSelectedSize(String(entry.size).toUpperCase())}
                          >
                            {entry.size}
                            {entry.price !== null && entry.price !== undefined && entry.price !== "" && (
                              <small>{formatPrice(entry.price)}</small>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="detail-buy detail-buy-top">
                    <button
                      className="primary buy-now-large"
                      disabled={
                        getProductSizes(selectedProduct).length > 0
                          ? !getProductSizes(selectedProduct).some((x) => String(x.size).toUpperCase() === selectedSize && Number(x.stock || 0) > 0)
                          : Number(selectedProduct.stock) <= 0
                      }
                      onClick={() => buyNow(selectedProduct, selectedSize)}
                    >
                      ⚡ BUY NOW
                    </button>
                    <button
                      className="secondary cart-large"
                      disabled={
                        getProductSizes(selectedProduct).length > 0
                          ? !getProductSizes(selectedProduct).some((x) => String(x.size).toUpperCase() === selectedSize && Number(x.stock || 0) > 0)
                          : Number(selectedProduct.stock) <= 0
                      }
                      onClick={() => addToCart(selectedProduct, selectedSize)}
                    >
                      🛒 ADD TO CART
                    </button>
                  </div>

                  <div className="rating">
                    ★{" "}
                    {
                      selectedProduct.rating
                    }{" "}
                    ·{" "}
                    {
                      selectedProduct.reviews
                    }{" "}
                    reviews
                  </div>

                  <div className="price-line">
                    <span className="price">
                      {formatPrice(getSizePrice(selectedProduct, selectedSize))}
                    </span>

                    <span className="mrp">
                      {formatPrice(
                        selectedProduct.mrp
                      )}
                    </span>
                  </div>

                  <p className="description">
                    {selectedProduct.description || "Product details will be shown here."}
                  </p>

                  {Array.isArray(homepage.settings.reviews_catalog) && homepage.settings.reviews_catalog.filter((r) => String(r.product_id) === String(selectedProduct.id) && r.active !== false).length > 0 && (
                    <div className="review-list">
                      <h3>Customer Reviews</h3>
                      {homepage.settings.reviews_catalog.filter((r) => String(r.product_id) === String(selectedProduct.id) && r.active !== false).map((r) => (
                        <div className="review-card" key={r.id}>
                          <strong>{r.name}</strong> <span>{"★".repeat(Number(r.stars || 5))}</span>
                          <p>{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}


                  <p className="stock-detail">
                    {getProductSizes(selectedProduct).length > 0
                      ? (() => {
                          const entry = getProductSizes(selectedProduct).find((x) => String(x.size).toUpperCase() === selectedSize);
                          return entry && Number(entry.stock || 0) > 0
                            ? `Size ${selectedSize} · ${entry.stock} available`
                            : "Select an available size";
                        })()
                      : Number(selectedProduct.stock) > 0
                      ? `In Stock · ${selectedProduct.stock} available`
                      : "Currently out of stock"}
                  </p>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <Modal
          title={`Your Cart (${cartCount})`}
          close={() =>
            setCartOpen(false)
          }
        >
          {!cart.length ? (
            <div className="empty">
              <h3>
                Your cart is empty
              </h3>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map(
                  (item) => (
                    <div
                      className="cart-item"
                      key={item.cartKey || `${item.id}__${item.size || "NOSIZE"}`}
                    >
                      <img
                        src={
                          item.images?.[0]
                        }
                        alt={
                          item.name
                        }
                      />

                      <div>
                        <h4>
                          {
                            item.name
                          }
                        </h4>

                        <strong>
                          {formatPrice(item.price)}
                        </strong>
                        {item.size && <small className="cart-size">Size: {item.size}</small>}

                        <div className="qty">
                          <button
                            onClick={() =>
                              changeQuantity(item.id, -1, item.size)
                            }
                          >
                            −
                          </button>

                          <strong>
                            {
                              item.qty
                            }
                          </strong>

                          <button
                            onClick={() =>
                              changeQuantity(item.id, 1, item.size)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        className="secondary"
                        onClick={() => removeFromCart(item.id, item.size)}
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>

              <div className="summary">
                <div className="summary-row">
                  <span>
                    Subtotal
                  </span>

                  <strong>
                    {formatPrice(
                      subtotal
                    )}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>
                    Delivery
                  </span>

                  <strong>
                    FREE
                  </strong>
                </div>

                <div className="summary-row total-row">
                  <span>
                    Total
                  </span>

                  <strong>
                    {formatPrice(
                      total
                    )}
                  </strong>
                </div>

                <button
                  className="primary full"
                  onClick={
                    openCheckout
                  }
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {loginOpen && (
        <Modal
          title="Continue with Email"
          close={() =>
            setLoginOpen(
              false
            )
          }
          small
        >
          <form
            onSubmit={
              loginWithEmail
            }
          >
            <div className="field">
              <label>
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target
                      .value
                  )
                }
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              className="primary full"
              type="submit"
            >
              Continue
            </button>
          </form>
        </Modal>
      )}

      {checkoutOpen && (
        <Modal
          title="Checkout"
          close={() =>
            setCheckoutOpen(
              false
            )
          }
          small
        >
          <div className="login-info">
            Logged in as{" "}
            {user?.email}
          </div>

          <h3>
            Delivery Details
          </h3>

          {[
            [
              "name",
              "Full Name",
              "Full name",
            ],
            [
              "phone",
              "Mobile Number",
              "10-digit mobile number",
            ],
            [
              "line1",
              "Address",
              "House number, street, area",
            ],
            [
              "city",
              "City",
              "City",
            ],
            [
              "state",
              "State",
              "State",
            ],
            [
              "pincode",
              "PIN Code",
              "6-digit PIN code",
            ],
          ].map(
            ([
              name,
              label,
              placeholder,
            ]) => (
              <div
                className="field"
                key={name}
              >
                <label>
                  {label}
                </label>

                <input
                  name={name}
                  value={
                    address[name]
                  }
                  onChange={
                    updateAddress
                  }
                  placeholder={
                    placeholder
                  }
                  maxLength={
                    name ===
                    "phone"
                      ? 10
                      : name ===
                        "pincode"
                      ? 6
                      : undefined
                  }
                />
              </div>
            )
          )}

          <div className="summary">
            <div className="summary-row">
              <span>
                Items
              </span>

              <strong>
                {cartCount}
              </strong>
            </div>

            <div className="summary-row total-row">
              <span>
                Total
              </span>

              <strong>
                {formatPrice(
                  total
                )}
              </strong>
            </div>
          </div>

          <button
            className="primary full"
            onClick={
              createOrder
            }
          >
            Continue to UPI Payment
          </button>
        </Modal>
      )}

      {paymentOpen && (
        <Modal
          title="UPI Payment"
          close={() =>
            setPaymentOpen(
              false
            )
          }
          small
        >
          <div className="upi-box">
            <h3>Pay {formatPrice(orderInfo?.amount)}</h3>
            <p className="payment-subtitle">Scan the QR code or choose your UPI app</p>

            {paymentSettings?.upi_id && (() => {
              const upiUri = buildUpiUri({
                upiId: paymentSettings.upi_id,
                name: paymentSettings.upi_name,
                amount: orderInfo?.amount,
                orderId: orderInfo?.order_id,
              });
              const qrUrl = paymentSettings.qr_image || buildQrUrl(upiUri);
              return (
                <>
                  <div className="qr-card">
                    <img className="qr" src={qrUrl} alt="UPI payment QR code" loading="eager" />
                    <strong>{formatPrice(orderInfo?.amount)}</strong>
                    <span>Scan with any UPI app</span>
                  </div>

                  <div className="upi-id-wrap">
                    <span>UPI ID</span>
                    <div className="upi-id">{paymentSettings.upi_id}</div>
                  </div>

                  {paymentSettings?.upi_name && <p className="upi-name">{paymentSettings.upi_name}</p>}

                  <div className="upi-apps-title">Pay with UPI App</div>
                  <div className="upi-app-grid">
                    <button type="button" className="upi-app-button" onClick={() => openUpiApp("gpay", upiUri)}>
                      <span className="upi-logo"><img src="https://cdn.simpleicons.org/googlepay" alt="" /></span><span>Google Pay</span>
                    </button>
                    <button type="button" className="upi-app-button" onClick={() => openUpiApp("phonepe", upiUri)}>
                      <span className="upi-logo"><img src="https://cdn.simpleicons.org/phonepe" alt="" /></span><span>PhonePe</span>
                    </button>
                    <button type="button" className="upi-app-button" onClick={() => openUpiApp("paytm", upiUri)}>
                      <span className="upi-logo"><img src="https://cdn.simpleicons.org/paytm" alt="" /></span><span>Paytm</span>
                    </button>
                    <button type="button" className="upi-app-button" onClick={() => openUpiApp("other", upiUri)}>
                      <span className="upi-logo other-logo">UPI</span><span>Other UPI Apps</span>
                    </button>
                  </div>
                </>
              );
            })()}

            <p className="description">
              {paymentSettings?.instructions || "Complete the payment, then enter your UTR below. Your order will remain pending until payment is verified."}
            </p>
          </div>

          <div className="field">
            <label>
              UTR / Transaction
              Reference
            </label>

            <input
              value={utr}
              onChange={(event) =>
                setUtr(
                  event.target
                    .value
                )
              }
              placeholder="Enter UTR / transaction ID"
            />
          </div>

          <div className="field">
            <label>
              Payment Screenshot
              URL (optional)
            </label>

            <input
              value={
                paymentScreenshot
              }
              onChange={(event) =>
                setPaymentScreenshot(
                  event.target
                    .value
                )
              }
              placeholder="Paste image URL if available"
            />
          </div>

          <button
            className="primary full"
            disabled={
              paymentSubmitting
            }
            onClick={
              submitUPI
            }
          >
            {paymentSubmitting
              ? "Submitting..."
              : "I Have Paid - Submit UTR"}
          </button>
        </Modal>
      )}
    </div>
  );
}

/* =====================================================
   MODAL
   ===================================================== */

function Modal({
  title,
  close,
  children,
  small = false,
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={close}
    >
      <div
        className={`modal ${
          small
            ? "small-modal"
            : ""
        }`}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-header">
          <h2>{title}</h2>

          <button
            className="close"
            onClick={close}
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   ADMIN APP
   ===================================================== */

function AdminApp() {
  const [
    adminToken,
    setAdminToken,
  ] = useState(
    getAdminToken()
  );

  const [
    adminEmail,
    setAdminEmail,
  ] = useState("");

  const [
    adminPassword,
    setAdminPassword,
  ] = useState("");

  const [
    adminLoading,
    setAdminLoading,
  ] = useState(false);

  const [tab, setTab] =
    useState("dashboard");

  const [
    dashboard,
    setDashboard,
  ] = useState(null);

  const [
    adminProducts,
    setAdminProducts,
  ] = useState([]);

  const [
    customers,
    setCustomers,
  ] = useState([]);

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [homepageAdmin, setHomepageAdmin] = useState({
    offer_enabled: true,
    offer_title: "Welcome to MeeshooShopping",
    offer_text: "Special offers are waiting for you.",
    offer_button: "Shop Now",
    offer_image: "",
    best_selling_title: "🔥 Best Selling Products",
    company_name: "MEESHO SHOPPING",
    company_about: "Your trusted online shopping destination.",
    contact_email: "meeshoshoppinginfo@gmail.com",
    telegram_url: "https://t.me/MeeshooShopping",
    reviews_catalog: [],
  });

  const [securityLogs, setSecurityLogs] = useState([]);

  const [
    payment,
    setPayment,
  ] = useState({
    method: "UPI",
    enabled: true,
    upi_id: "",
    upi_name: "",
    qr_image: "",
    instructions: "",
  });

  const [
    productForm,
    setProductForm,
  ] = useState(
    emptyProduct()
  );

  const [
    editingProduct,
    setEditingProduct,
  ] = useState(null);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    formLoading,
    setFormLoading,
  ] = useState(false);

  useEffect(() => {
    if (adminToken) {
      loadDashboard();
      loadAdminProducts();
      loadCustomers();
      loadOrders();
      loadPayment();
      loadHomepageAdmin();
      loadSecurityLogs();
    }
  }, [adminToken]);

  function notify(text) {
    setMessage(text);

    setTimeout(
      () => setMessage(""),
      3500
    );
  }

  async function login(
    event
  ) {
    event.preventDefault();

    try {
      setAdminLoading(true);

      const data =
        await apiFetch(
          "/api/admin/login",
          {
            method: "POST",

            body: JSON.stringify({
              email:
                adminEmail,
              password:
                adminPassword,
            }),
          }
        );

      localStorage.setItem(
        "meeshoo_admin_token",
        data.token
      );

      setAdminToken(
        data.token
      );

      setAdminPassword("");

      notify(
        "Admin login successful."
      );
    } catch (err) {
      notify(
        err.message
      );
    } finally {
      setAdminLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(
      "meeshoo_admin_token"
    );

    setAdminToken(null);
  }

  async function loadDashboard() {
    try {
      const data =
        await apiFetch(
          "/api/admin/dashboard",
          {
            headers:
              adminHeaders(),
          }
        );

      setDashboard(
        data.stats
      );
    } catch (err) {
      handleAdminError(err);
    }
  }

  async function loadAdminProducts() {
    try {
      const data =
        await apiFetch(
          "/api/admin/products",
          {
            headers:
              adminHeaders(),
          }
        );

      setAdminProducts(
        data.products || []
      );
    } catch (err) {
      handleAdminError(err);
    }
  }

  async function loadCustomers() {
    try {
      const data =
        await apiFetch(
          "/api/admin/customers",
          {
            headers:
              adminHeaders(),
          }
        );

      setCustomers(
        data.customers || []
      );
    } catch (err) {
      handleAdminError(err);
    }
  }

  async function loadOrders() {
    try {
      const data =
        await apiFetch(
          "/api/admin/orders",
          {
            headers:
              adminHeaders(),
          }
        );

      setOrders(
        data.orders || []
      );
    } catch (err) {
      handleAdminError(err);
    }
  }

  async function loadHomepageAdmin() {
    try {
      const data = await apiFetch("/api/admin/homepage", {headers: adminHeaders()});
      if (data.homepage) setHomepageAdmin(data.homepage);
    } catch (err) { handleAdminError(err); }
  }

  async function saveHomepageAdmin() {
    try {
      setFormLoading(true);
      const data = await apiFetch("/api/admin/homepage", {method:"PUT", headers: adminHeaders(), body: JSON.stringify(homepageAdmin)});
      setHomepageAdmin(data.homepage);
      notify("Homepage offer settings saved.");
    } catch (err) { handleAdminError(err); }
    finally { setFormLoading(false); }
  }

  async function loadSecurityLogs() {
    try {
      const data = await apiFetch("/api/admin/security-log", {headers: adminHeaders()});
      setSecurityLogs(data.logs || []);
    } catch (err) { handleAdminError(err); }
  }

  async function loadPayment() {
    try {
      const data =
        await apiFetch(
          "/api/admin/payment-settings",
          {
            headers:
              adminHeaders(),
          }
        );

      if (data.payment) {
        setPayment(
          data.payment
        );
      }
    } catch (err) {
      handleAdminError(err);
    }
  }

  function handleAdminError(
    err
  ) {
    if (
      String(
        err.message || ""
      ).toLowerCase().includes(
        "session"
      )
    ) {
      logout();
      return;
    }

    notify(
      err.message
    );
  }

  function updateProductForm(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setProductForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  async function handleProductImageFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setFormLoading(true);
      const uploaded = [];
      for (const file of files) {
        uploaded.push(await compressProductImage(file));
      }

      setProductForm((current) => ({
        ...current,
        images: [
          ...(current.images || []).filter(Boolean),
          ...uploaded,
        ],
      }));

      notify(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} added.`);
    } catch (err) {
      notify(err.message || "Unable to upload images.");
    } finally {
      setFormLoading(false);
      event.target.value = "";
    }
  }

  function removeImageField(index) {
    setProductForm((current) => ({
      ...current,
      images: (current.images || []).filter((_, i) => i !== index),
    }));
  }

  function updateSize(index, field, value) {
    setProductForm((current) => {
      const sizes = [...(current.sizes || [])];
      sizes[index] = { ...sizes[index], [field]: value };
      return { ...current, sizes };
    });
  }

  function addPresetSizes(type) {
    const preset = SIZE_PRESETS[type] || [];
    setProductForm((current) => {
      const existing = new Set((current.sizes || []).map((x) => String(x.size || "").trim().toUpperCase()));
      const additions = preset.filter((size) => !existing.has(size)).map((size) => ({ size, stock: 0, price: "" }));
      return { ...current, sizes: [...(current.sizes || []), ...additions] };
    });
  }

  function addSizeField() {
    setProductForm((current) => ({
      ...current,
      sizes: [...(current.sizes || []), { size: "", stock: 0, price: "" }],
    }));
  }

  function removeSizeField(index) {
    setProductForm((current) => ({
      ...current,
      sizes: (current.sizes || []).filter((_, i) => i !== index),
    }));
  }

  function editProduct(
    product
  ) {
    setEditingProduct(
      product.id
    );

    setProductForm({
      name:
        product.name ||
        "",

      sku:
        product.sku ||
        "",

      category:
        product.category ||
        "",

      price:
        product.price ||
        "",

      mrp:
        product.mrp ||
        "",

      stock:
        product.stock ||
        0,

      rating:
        product.rating ||
        4.5,

      reviews:
        product.reviews ||
        0,

      sizes: Array.isArray(product.sizes) ? product.sizes : [],

      description:
        product.description ||
        "",

      images:
        product.images?.length
          ? product.images
          : [""],

      active:
        product.active !==
        false,

      best_selling: Boolean(product.best_selling),
      new_arrival: Boolean(product.new_arrival),
      featured: Boolean(product.featured),
    });

    setTab("products");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetProduct() {
    setEditingProduct(
      null
    );

    setProductForm(
      emptyProduct()
    );
  }

  async function saveProduct(
    event
  ) {
    event.preventDefault();

    try {
      setFormLoading(true);

      const payload = {
        ...productForm,

        price:
          Number(
            productForm.price
          ),

        mrp:
          Number(
            productForm.mrp
          ),

        stock:
          Number(
            productForm.stock
          ),

        rating:
          Number(
            productForm.rating
          ),

        reviews:
          Number(
            productForm.reviews
          ),

        sizes: (productForm.sizes || [])
          .map((entry) => ({
            size: String(entry.size || "").trim().toUpperCase(),
            stock: Number(entry.stock || 0),
            price: entry.price === "" || entry.price === null || entry.price === undefined ? null : Number(entry.price),
          }))
          .filter((entry) => entry.size),

        images:
          productForm.images
            .map(
              (x) =>
                String(
                  x
                ).trim()
            )
            .filter(Boolean),
      };

      if (!payload.images.length) {
        throw new Error("Please upload at least one product photo.");
      }

      const data =
        await apiFetch(
          editingProduct
            ? `/api/admin/products/${editingProduct}`
            : "/api/admin/products",
          {
            method:
              editingProduct
                ? "PUT"
                : "POST",

            headers:
              adminHeaders(),

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      notify(
        editingProduct
          ? "Product updated."
          : "Product added."
      );

      resetProduct();

      await loadAdminProducts();
      await loadDashboard();
    } catch (err) {
      handleAdminError(err);
    } finally {
      setFormLoading(false);
    }
  }

  async function deleteProduct(
    id
  ) {
    const confirmed =
      window.confirm(
        "Remove this product from the store?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(
        `/api/admin/products/${id}`,
        {
          method: "DELETE",

          headers:
            adminHeaders(),
        }
      );

      notify(
        "Product removed."
      );

      await loadAdminProducts();
      await loadDashboard();
    } catch (err) {
      handleAdminError(err);
    }
  }

  async function changePayment() {
    try {
      setFormLoading(true);

      await apiFetch(
        "/api/admin/payment-settings",
        {
          method: "PUT",

          headers:
            adminHeaders(),

          body:
            JSON.stringify(
              payment
            ),
        }
      );

      notify(
        "UPI settings saved."
      );
    } catch (err) {
      handleAdminError(err);
    } finally {
      setFormLoading(false);
    }
  }

  async function updatePaymentStatus(
    orderId,
    status
  ) {
    try {
      await apiFetch(
        `/api/admin/orders/${orderId}/payment`,
        {
          method: "PUT",

          headers:
            adminHeaders(),

          body:
            JSON.stringify({
              status,
            }),
        }
      );

      notify(
        `Payment marked ${status}.`
      );

      await loadOrders();
      await loadAdminProducts();
      await loadDashboard();
    } catch (err) {
      handleAdminError(err);
    }
  }

  async function updateOrderStatus(
    orderId,
    status
  ) {
    try {
      await apiFetch(
        `/api/admin/orders/${orderId}/status`,
        {
          method: "PUT",

          headers:
            adminHeaders(),

          body:
            JSON.stringify({
              order_status:
                status,
            }),
        }
      );

      notify(
        "Order status updated."
      );

      await loadOrders();
    } catch (err) {
      handleAdminError(err);
    }
  }

  if (!adminToken) {
    return (
      <div className="admin-page">
        <style>{ADMIN_CSS}</style>

        <div className="admin-login">
          <div className="admin-brand">
            MEESHOO
          </div>

          <h1>
            Admin Panel
          </h1>

          <p>
            Manage products,
            stock, customers,
            orders and UPI
            payments.
          </p>

          <form
            onSubmit={login}
          >
            <div className="field">
              <label>
                Admin Email
              </label>

              <input
                type="email"
                value={
                  adminEmail
                }
                onChange={(
                  event
                ) =>
                  setAdminEmail(
                    event.target
                      .value
                  )
                }
                placeholder="Admin email"
                required
              />
            </div>

            <div className="field">
              <label>
                Admin Password
              </label>

              <input
                type="password"
                value={
                  adminPassword
                }
                onChange={(
                  event
                ) =>
                  setAdminPassword(
                    event.target
                      .value
                  )
                }
                placeholder="Admin password"
                required
              />
            </div>

            <button
              className="primary full"
              disabled={
                adminLoading
              }
            >
              {adminLoading
                ? "Logging in..."
                : "Login to Admin"}
            </button>
          </form>

          {message && (
            <div className="notice static">
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <style>{ADMIN_CSS}</style>

      <header className="admin-header">
        <div>
          <div className="admin-brand">
            MEESHOO
          </div>

          <span>
            Admin Panel
          </span>
        </div>

        <div className="admin-header-actions">
          <button
            className="secondary"
            onClick={() =>
              (window.location.href =
                "/")
            }
          >
            View Store
          </button>

          <button
            className="danger"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          {[
            [
              "dashboard",
              "Dashboard",
            ],
            [
              "products",
              "Products",
            ],
            [
              "customers",
              "Customers",
            ],
            [
              "orders",
              "Orders",
            ],
            [
              "payment",
              "UPI Payment",
            ],
            [
              "homepage",
              "Homepage & Offers",
            ],
            [
              "reviews",
              "Reviews",
            ],
            [
              "security",
              "Security Log",
            ],
          ].map(
            ([key, label]) => (
              <button
                key={key}
                className={
                  tab === key
                    ? "admin-nav active"
                    : "admin-nav"
                }
                onClick={() =>
                  setTab(key)
                }
              >
                {label}
              </button>
            )
          )}
        </aside>

        <main className="admin-main">
          {message && (
            <div className="admin-message">
              {message}
            </div>
          )}

          {tab ===
            "dashboard" && (
            <section>
              <AdminTitle
                title="Dashboard"
                subtitle="Your store overview."
              />

              <div className="stats">
                <Stat
                  label="Products"
                  value={
                    dashboard?.products ??
                    "—"
                  }
                />

                <Stat
                  label="Customers"
                  value={
                    dashboard?.customers ??
                    "—"
                  }
                />

                <Stat
                  label="Orders"
                  value={
                    dashboard?.orders ??
                    "—"
                  }
                />

                <Stat
                  label="Pending Payments"
                  value={
                    dashboard?.pending_payments ??
                    "—"
                  }
                />
              </div>

              <div className="admin-card">
                <h2>
                  Store Management
                </h2>

                <p>
                  Add products from
                  the Products section.
                  Customers will see
                  the same live products
                  on the website.
                </p>

                <button
                  className="primary"
                  onClick={() =>
                    setTab(
                      "products"
                    )
                  }
                >
                  Manage Products
                </button>
              </div>
            </section>
          )}

          {tab ===
            "products" && (
            <section>
              <AdminTitle
                title={
                  editingProduct
                    ? "Edit Product"
                    : "Add Product"
                }
                subtitle="Manage your live product catalog."
              />

              <div className="admin-card">
                <form
                  onSubmit={
                    saveProduct
                  }
                >
                  <div className="form-grid">
                    <AdminField
                      label="Product Name"
                      name="name"
                      value={
                        productForm.name
                      }
                      onChange={
                        updateProductForm
                      }
                      required
                    />

                    <AdminField
                      label="SKU"
                      name="sku"
                      value={
                        productForm.sku
                      }
                      onChange={
                        updateProductForm
                      }
                    />

                    <AdminField
                      label="Category"
                      name="category"
                      value={
                        productForm.category
                      }
                      onChange={
                        updateProductForm
                      }
                      placeholder="Women, Men, Electronics..."
                      required
                    />

                    <AdminField
                      label="Selling Price"
                      name="price"
                      type="number"
                      value={
                        productForm.price
                      }
                      onChange={
                        updateProductForm
                      }
                      required
                    />

                    <AdminField
                      label="MRP"
                      name="mrp"
                      type="number"
                      value={
                        productForm.mrp
                      }
                      onChange={
                        updateProductForm
                      }
                      required
                    />

                    <AdminField
                      label="Stock"
                      name="stock"
                      type="number"
                      value={
                        productForm.stock
                      }
                      onChange={
                        updateProductForm
                      }
                      required
                    />

                    <AdminField
                      label="Rating"
                      name="rating"
                      type="number"
                      step="0.1"
                      value={
                        productForm.rating
                      }
                      onChange={
                        updateProductForm
                      }
                    />

                    <AdminField
                      label="Reviews"
                      name="reviews"
                      type="number"
                      value={productForm.reviews}
                      onChange={updateProductForm}
                    />
                  </div>

                  <div className="field">
                    <label>Product Description / Details</label>
                    <textarea
                      rows="5"
                      name="description"
                      value={productForm.description || ""}
                      onChange={updateProductForm}
                      placeholder="Product ke baare mein complete details likho..."
                    />
                  </div>

                  <div className="field">
                    <label>Sizes, Stock & Optional Size Price</label>
                    <p className="muted">Add S, M, L, XL, XXL or any other size. Leave size price empty to use the main selling price.</p>
                    {(productForm.sizes || []).map((entry, index) => (
                      <div className="size-admin-row" key={index}>
                        <input value={entry.size || ""} onChange={(e) => updateSize(index, "size", e.target.value)} placeholder="Size (S/M/L/XL/XXL)" />
                        <input type="number" min="0" value={entry.stock ?? 0} onChange={(e) => updateSize(index, "stock", e.target.value)} placeholder="Stock" />
                        <input type="number" min="0" step="0.01" value={entry.price ?? ""} onChange={(e) => updateSize(index, "price", e.target.value)} placeholder="Price (optional)" />
                        <button type="button" className="danger" onClick={() => removeSizeField(index)}>Remove</button>
                      </div>
                    ))}
                    <div className="size-preset-bar">
                      <span className="muted">Quick sizes:</span>
                      <button type="button" className="secondary" onClick={() => addPresetSizes("clothing")}>S M L XL XXL</button>
                      <button type="button" className="secondary" onClick={() => addPresetSizes("pants")}>28 30 32 34 36</button>
                      <button type="button" className="secondary" onClick={() => addPresetSizes("shoes")}>Shoes 6–11</button>
                      <button type="button" className="secondary" onClick={() => addPresetSizes("belt")}>Belt</button>
                      <button type="button" className="secondary" onClick={() => addPresetSizes("oneSize")}>One Size</button>
                    </div>
                    <button type="button" className="secondary" onClick={addSizeField}>+ Add Custom Size</button>
                  </div>

                  <div className="admin-note">
                  <strong>Automatic QR</strong>
                  <p>Customers automatically get a QR for the exact order amount. You only need to maintain the UPI ID and UPI name.</p>
                </div>

                <div className="field">
                  <label>Product Images</label>

                  <p className="muted">
                    Phone/Gallery se photos directly upload karo. Image URL ki zarurat nahi.
                    Ek product ke liye jitni photos chaho ek saath select kar sakte ho.
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleProductImageFiles}
                    disabled={formLoading}
                  />

                  {productForm.images?.length > 0 && (
                    <div className="product-upload-preview">
                      {productForm.images.map((image, index) => (
                        <div className="upload-preview-card" key={`${index}-${String(image).slice(0, 30)}`}>
                          <img src={image} alt={`Product ${index + 1}`} />
                          <button
                            type="button"
                            className="danger"
                            onClick={() => removeImageField(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={
                        productForm.active
                      }
                      onChange={(
                        event
                      ) =>
                        setProductForm(
                          (
                            current
                          ) => ({
                            ...current,
                            active:
                              event
                                .target
                                .checked,
                          })
                        )
                      }
                    />

                    Show this product
                    on website
                  </label>

                  <div className="form-actions">
                    <button
                      className="primary"
                      disabled={
                        formLoading
                      }
                    >
                      {formLoading
                        ? "Saving..."
                        : editingProduct
                        ? "Update Product"
                        : "Add Product"}
                    </button>

                    {editingProduct && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={
                          resetProduct
                        }
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="admin-card">
                <div className="table-title">
                  <h2>
                    All Products
                  </h2>

                  <button
                    className="secondary"
                    onClick={
                      loadAdminProducts
                    }
                  >
                    Refresh
                  </button>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Product
                        </th>
                        <th>
                          Category
                        </th>
                        <th>
                          Price
                        </th>
                        <th>
                          Stock / Sizes
                        </th>
                        <th>
                          Status
                        </th>
                        <th>
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {adminProducts.map(
                        (product) => (
                          <tr
                            key={
                              product.id
                            }
                          >
                            <td>
                              <div className="product-admin">
                                <img
                                  src={
                                    product
                                      .images?.[0]
                                  }
                                  alt=""
                                />

                                <div>
                                  <strong>
                                    {
                                      product.name
                                    }
                                  </strong>

                                  <small>
                                    {
                                      product.sku
                                    }
                                  </small>
                                </div>
                              </div>
                            </td>

                            <td>
                              {
                                product.category
                              }
                            </td>

                            <td>
                              {formatPrice(
                                product.price
                              )}
                            </td>

                            <td>
                              <strong>{product.stock}</strong>
                              {getProductSizes(product).length > 0 && (
                                <small className="muted">{getProductSizes(product).map((x) => `${x.size}:${x.stock}`).join(" · ")}</small>
                              )}
                            </td>

                            <td>
                              {product.active ? (
                                <span className="badge success">
                                  Active
                                </span>
                              ) : (
                                <span className="badge">
                                  Hidden
                                </span>
                              )}
                            </td>

                            <td>
                              <div className="row-actions">
                                <button
                                  className="secondary"
                                  onClick={() =>
                                    editProduct(
                                      product
                                    )
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  className="danger"
                                  onClick={() =>
                                    deleteProduct(
                                      product.id
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {tab ===
            "customers" && (
            <section>
              <AdminTitle
                title="Customers"
                subtitle="Customer information from your store."
              />

              <div className="admin-card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Name
                        </th>
                        <th>
                          Email
                        </th>
                        <th>
                          Phone
                        </th>
                        <th>
                          Orders
                        </th>
                        <th>
                          Total Spent
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {customers.map(
                        (customer) => (
                          <tr
                            key={
                              customer.id
                            }
                          >
                            <td>
                              {
                                customer.name
                              }
                            </td>

                            <td>
                              {
                                customer.email
                              }
                            </td>

                            <td>
                              {
                                customer.phone
                              }
                            </td>

                            <td>
                              {
                                customer.order_count
                              }
                            </td>

                            <td>
                              {formatPrice(
                                customer.total_spent
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {tab ===
            "orders" && (
            <section>
              <AdminTitle
                title="Orders"
                subtitle="Manage customer orders and payment verification."
              />

              <div className="admin-card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Order
                        </th>
                        <th>
                          Customer
                        </th>
                        <th>
                          Amount
                        </th>
                        <th>
                          Payment
                        </th>
                        <th>
                          Order Status
                        </th>
                        <th>
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders.map(
                        (order) => (
                          <tr
                            key={
                              order.id
                            }
                          >
                            <td>
                              <strong>
                                {
                                  order.id
                                }
                              </strong>

                              <small>
                                {
                                  order.created_at
                                }
                              </small>
                            </td>

                            <td>
                              <strong>
                                {
                                  order.customer_name
                                }
                              </strong>

                              <small>
                                {
                                  order.email
                                }
                              </small>

                              <small>{order.phone}</small>
                              {order.address && (
                                <small className="order-detail-text">
                                  {typeof order.address === "string" ? order.address : [order.address.line1, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(", ")}
                                </small>
                              )}
                              {Array.isArray(order.items) && order.items.length > 0 && (
                                <details className="order-items-details">
                                  <summary>View items</summary>
                                  {order.items.map((item, idx) => (
                                    <div key={idx}>{item.name}{item.size ? ` · ${item.size}` : ""} × {item.quantity} — {formatPrice(item.line_total ?? Number(item.price || 0) * Number(item.quantity || 0))}</div>
                                  ))}
                                </details>
                              )}
                            </td>

                            <td>
                              {formatPrice(
                                order.amount
                              )}
                            </td>

                            <td>
                              <span className="badge">
                                {
                                  order.payment_status
                                }
                              </span>

                              {order.transaction_reference && (
                                <small>
                                  UTR:{" "}
                                  {
                                    order.transaction_reference
                                  }
                                </small>
                              )}
                            </td>

                            <td>
                              <select
                                value={
                                  order.order_status
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateOrderStatus(
                                    order.id,
                                    event
                                      .target
                                      .value
                                  )
                                }
                              >
                                {[
                                  "NEW",
                                  "CONFIRMED",
                                  "PACKED",
                                  "SHIPPED",
                                  "DELIVERED",
                                  "CANCELLED",
                                ].map(
                                  (
                                    status
                                  ) => (
                                    <option
                                      key={
                                        status
                                      }
                                      value={
                                        status
                                      }
                                    >
                                      {
                                        status
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </td>

                            <td>
                              <div className="row-actions">
                                {[
                                  "PENDING_PAYMENT",
                                  "SUBMITTED",
                                ].includes(
                                  order.payment_status
                                ) && (
                                  <>
                                    <button
                                      className="primary"
                                      onClick={() =>
                                        updatePaymentStatus(
                                          order.id,
                                          "PAID"
                                        )
                                      }
                                    >
                                      Mark Paid
                                    </button>

                                    <button
                                      className="danger"
                                      onClick={() => updatePaymentStatus(order.id, "FAILED")}
                                    >
                                      Reject
                                    </button>
                                    <button
                                      className="danger"
                                      onClick={() => updatePaymentStatus(order.id, "CANCELLED")}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {tab === "homepage" && (
            <section>
              <AdminTitle title="Homepage & Festival Banner" subtitle="Control the top offer bar, large homepage banner, popup and company information." />
              <div className="admin-card">
                <div className="form-grid">
                  <AdminField label="Big Banner Headline / Festival Title" name="offer_title" value={homepageAdmin.offer_title || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,offer_title:e.target.value}))} />
                  <AdminField label="Banner Button Text" name="offer_button" value={homepageAdmin.offer_button || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,offer_button:e.target.value}))} />
                </div>
                <div className="field"><label>Banner Description / Discount Text</label><textarea rows="3" value={homepageAdmin.offer_text || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,offer_text:e.target.value}))}/></div>
                <AdminField label="Big Banner Image URL (optional)" name="offer_image" value={homepageAdmin.offer_image || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,offer_image:e.target.value}))} />
                <AdminField label="Best Selling Section Title" name="best_selling_title" value={homepageAdmin.best_selling_title || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,best_selling_title:e.target.value}))} />
                <div className="section-divider"><strong>Company / Contact</strong></div>
                <div className="form-grid">
                  <AdminField label="Company Name" value={homepageAdmin.company_name || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,company_name:e.target.value}))} />
                  <AdminField label="Company Email" value={homepageAdmin.contact_email || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,contact_email:e.target.value}))} />
                  <AdminField label="Telegram Link" value={homepageAdmin.telegram_url || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,telegram_url:e.target.value}))} />
                </div>
                <div className="field"><label>About Company</label><textarea rows="4" value={homepageAdmin.company_about || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,company_about:e.target.value}))}/></div>
                <label className="checkbox-row"><input type="checkbox" checked={Boolean(homepageAdmin.offer_enabled)} onChange={(e)=>setHomepageAdmin(v=>({...v,offer_enabled:e.target.checked}))}/> Show offer popup</label>
                <button className="primary" onClick={saveHomepageAdmin} disabled={formLoading}>Save Homepage</button>
              </div>
            </section>
          )}

          {tab === "reviews" && (
            <section>
              <AdminTitle title="Review Management" subtitle="Add, edit, hide or delete product reviews from one place." />
              <div className="admin-card">
                <div className="form-grid">
                  <div className="field"><label>Product</label><select value={homepageAdmin.review_product_id || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,review_product_id:e.target.value}))}><option value="">Select product</option>{adminProducts.map((p)=><option key={p.id} value={p.id}>{p.name} — {p.id}</option>)}</select></div>
                  <AdminField label="Customer Name" value={homepageAdmin.review_name || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,review_name:e.target.value}))} placeholder="Customer name" />
                  <AdminField label="Stars (1-5)" type="number" value={homepageAdmin.review_stars || 5} onChange={(e)=>setHomepageAdmin(v=>({...v,review_stars:Math.max(1,Math.min(5,Number(e.target.value)||5))}))} />
                </div>
                <div className="field"><label>Review Text</label><textarea rows="4" value={homepageAdmin.review_text || ""} onChange={(e)=>setHomepageAdmin(v=>({...v,review_text:e.target.value}))} placeholder="Review likho..." /></div>
                <button className="primary" onClick={()=>{
                  const review={id:`REV-${Date.now()}`,product_id:String(homepageAdmin.review_product_id||""),name:String(homepageAdmin.review_name||"Customer"),stars:Number(homepageAdmin.review_stars||5),text:String(homepageAdmin.review_text||""),active:true};
                  if(!review.product_id || !review.text.trim()){notify("Product ID and review text are required.");return;}
                  setHomepageAdmin(v=>({...v,reviews_catalog:[...(Array.isArray(v.reviews_catalog)?v.reviews_catalog:[]),review],review_product_id:"",review_name:"",review_text:"",review_stars:5}));
                  notify("Review added. Click Save Homepage to publish it.");
                }}>+ Add Review</button>
                <div className="table-wrap" style={{marginTop:16}}>
                  <table><thead><tr><th>Product ID</th><th>Name</th><th>Stars</th><th>Review</th><th>Status</th><th>Action</th></tr></thead><tbody>
                    {(homepageAdmin.reviews_catalog||[]).map((r,i)=><tr key={r.id||i}><td>{r.product_id}</td><td>{r.name}</td><td>{"★".repeat(Number(r.stars||5))}</td><td>{r.text}</td><td>{r.active===false?"Hidden":"Visible"}</td><td><button className="secondary" onClick={()=>setHomepageAdmin(v=>({...v,reviews_catalog:(v.reviews_catalog||[]).map((x,j)=>j===i?{...x,active:x.active===false}:x)}))}>{r.active===false?"Show":"Hide"}</button> <button className="danger" onClick={()=>setHomepageAdmin(v=>({...v,reviews_catalog:(v.reviews_catalog||[]).filter((_,j)=>j!==i)}))}>Delete</button></td></tr>)}
                  </tbody></table>
                </div>
                <button className="primary" style={{marginTop:14}} onClick={saveHomepageAdmin} disabled={formLoading}>Save Reviews</button>
              </div>
            </section>
          )}

          {tab === "security" && (
            <section>
              <AdminTitle title="Security Log" subtitle="Recent admin login attempts. Passwords are never stored here." />
              <div className="admin-card table-wrap">
                <table><thead><tr><th>Time</th><th>Email</th><th>IP</th><th>Status</th><th>User Agent</th></tr></thead><tbody>{securityLogs.map(log=><tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.email || "—"}</td><td>{log.ip_address || "—"}</td><td>{log.success ? "🟢 Success" : "🔴 Failed"}</td><td>{log.user_agent || "—"}</td></tr>)}</tbody></table></div>
            </section>
          )}

          {tab ===
            "payment" && (
            <section>
              <AdminTitle
                title="UPI Payment"
                subtitle="Change the UPI payment details shown to customers."
              />

              <div className="admin-card">
                <div className="form-grid">
                  <AdminField
                    label="UPI ID"
                    value={
                      payment.upi_id
                    }
                    onChange={(event) =>
                      setPayment(
                        (current) => ({
                          ...current,
                          upi_id:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="yourname@upi"
                  />

                  <AdminField
                    label="UPI Name"
                    value={
                      payment.upi_name
                    }
                    onChange={(event) =>
                      setPayment(
                        (current) => ({
                          ...current,
                          upi_name:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="Your Store Name"
                  />
                </div>

                <div className="field">
                  <label>
                    QR Image URL
                  </label>

                  <input
                    value={
                      payment.qr_image
                    }
                    onChange={(
                      event
                    ) =>
                      setPayment(
                        (current) => ({
                          ...current,
                          qr_image:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="Paste your UPI QR image URL"
                  />
                </div>

                <div className="field">
                  <label>
                    Payment Instructions
                  </label>

                  <textarea
                    rows="5"
                    value={
                      payment.instructions
                    }
                    onChange={(
                      event
                    ) =>
                      setPayment(
                        (current) => ({
                          ...current,
                          instructions:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="Tell customers how to pay and submit UTR."
                  />
                </div>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={
                      payment.enabled
                    }
                    onChange={(
                      event
                    ) =>
                      setPayment(
                        (current) => ({
                          ...current,
                          enabled:
                            event
                              .target
                              .checked,
                        })
                      )
                    }
                  />

                  Enable UPI payments
                </label>

                <button
                  className="primary"
                  disabled={
                    formLoading
                  }
                  onClick={
                    changePayment
                  }
                >
                  {formLoading
                    ? "Saving..."
                    : "Save UPI Settings"}
                </button>
              </div>

              <div className="admin-card">
                <h2>
                  Current UPI
                </h2>

                <div className="upi-preview">
                  <strong>
                    {
                      payment.upi_id
                    }
                  </strong>

                  <span>
                    {
                      payment.upi_name
                    }
                  </span>

                  <span className="auto-qr-badge">Automatic QR enabled</span>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function AdminTitle({
  title,
  subtitle,
}) {
  return (
    <div className="admin-title">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

function Stat({
  label,
  value,
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  step,
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        step={step}
      />
    </div>
  );
}

function emptyProduct() {
  return {
    name: "",
    sku: "",
    category: "",
    price: "",
    mrp: "",
    stock: 0,
    sizes: [],
    rating: 4.5,
    reviews: 0,
    description: "",
    images: [],
    active: true,
    best_selling: false,
    new_arrival: false,
    featured: false,
  };
}

/* =====================================================
   STORE CSS
   ===================================================== */

const STORE_CSS = `
* { box-sizing: border-box; }

:root {
  --primary: #6d28d9;
  --primary-2: #8b5cf6;
  --primary-dark: #4c1d95;
  --accent: #ec4899;
  --green: #16a34a;
  --ink: #111827;
  --muted: #6b7280;
  --line: #e5e7eb;
  --shadow-sm: 0 4px 18px rgba(17,24,39,.06);
  --shadow-md: 0 14px 38px rgba(17,24,39,.10);
  --shadow-lg: 0 28px 70px rgba(17,24,39,.16);
}

html { scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: Inter, Arial, Helvetica, sans-serif;
  background:
    radial-gradient(circle at 10% 0%, rgba(139,92,246,.07), transparent 25%),
    radial-gradient(circle at 90% 12%, rgba(236,72,153,.05), transparent 22%),
    #f8fafc;
  color: var(--ink);
}

button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; }

.topbar {
  background: linear-gradient(90deg, #4c1d95, #7c3aed 48%, #db2777);
  color: #fff;
  text-align: center;
  padding: 9px 15px;
  font-size: 12px;
  font-weight: 850;
  letter-spacing: .15px;
  box-shadow: 0 2px 12px rgba(76,29,149,.22);
}

.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255,255,255,.94);
  border-bottom: 1px solid rgba(229,231,235,.8);
  backdrop-filter: blur(18px);
  box-shadow: 0 5px 24px rgba(17,24,39,.045);
}

.header-inner {
  max-width: 1380px;
  min-height: 76px;
  margin: auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  border: 0;
  background: linear-gradient(135deg, #5b21b6, #db2777);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-size: 28px;
  font-weight: 950;
  letter-spacing: -1.7px;
  white-space: nowrap;
}

.search { flex: 1; position: relative; }

.search input {
  width: 100%;
  height: 48px;
  border: 1px solid #ddd6fe;
  border-radius: 15px;
  padding: 0 18px;
  outline: none;
  background: #fff;
  color: var(--ink);
  transition: .2s ease;
}

.search input:focus,
.field input:focus,
.field textarea:focus {
  border-color: var(--primary-2);
  box-shadow: 0 0 0 4px rgba(139,92,246,.12);
}

.header-actions { display: flex; gap: 8px; }

.header-button,
.secondary {
  border: 1px solid #ddd6fe;
  background: #fff;
  color: #5b21b6;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 850;
  transition: .2s ease;
}

.header-button:hover,
.secondary:hover {
  transform: translateY(-1px);
  border-color: #c4b5fd;
  box-shadow: var(--shadow-sm);
}

.hero {
  max-width: 1380px;
  margin: auto;
  padding: 24px 20px 8px;
}

.hero-card {
  min-height: 350px;
  border-radius: 30px;
  padding: 48px;
  color: #fff;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 18%, rgba(255,255,255,.24), transparent 25%),
    radial-gradient(circle at 70% 100%, rgba(236,72,153,.32), transparent 35%),
    linear-gradient(120deg, #3b0764 0%, #6d28d9 48%, #a855f7 100%);
  box-shadow: 0 22px 55px rgba(91,33,182,.25);
}

.hero-card::before {
  content: "";
  position: absolute;
  width: 300px;
  height: 300px;
  right: -90px;
  bottom: -150px;
  border-radius: 50%;
  border: 55px solid rgba(255,255,255,.08);
}

.hero-card > div { position: relative; z-index: 1; }

.hero-card h1 {
  margin: 0 0 16px;
  font-size: clamp(36px, 5vw, 64px);
  line-height: .98;
  letter-spacing: -3px;
  max-width: 760px;
}

.hero-card p {
  max-width: 680px;
  color: #f3e8ff;
  line-height: 1.7;
  font-size: 16px;
  margin: 0 0 22px;
}

.hero-button {
  border: 0;
  background: linear-gradient(135deg, #fff, #fdf4ff);
  color: #5b21b6;
  padding: 13px 23px;
  border-radius: 13px;
  font-weight: 950;
  box-shadow: 0 9px 25px rgba(0,0,0,.14);
  transition: .2s ease;
}

.hero-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 13px 30px rgba(0,0,0,.18);
}

.content {
  max-width: 1380px;
  margin: auto;
  padding: 25px 20px 60px;
}

.section-title,
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.section-title { margin-bottom: 16px; }

.section-title h2 {
  margin: 0;
  font-size: 27px;
  letter-spacing: -.7px;
}

.result-count,
.muted {
  color: var(--muted);
  font-size: 13px;
  font-weight: 750;
}

.categories {
  display: flex;
  gap: 9px;
  overflow-x: auto;
  padding: 3px 2px 16px;
  scrollbar-width: none;
}

.categories::-webkit-scrollbar,
.product-slider::-webkit-scrollbar { display: none; }

.category {
  flex: 0 0 auto;
  border: 1px solid #e5e7eb;
  background: rgba(255,255,255,.95);
  color: #374151;
  border-radius: 999px;
  padding: 10px 17px;
  font-weight: 850;
  box-shadow: 0 3px 12px rgba(17,24,39,.04);
  transition: .2s ease;
}

.category:hover { transform: translateY(-1px); border-color: #c4b5fd; }

.category.active {
  background: linear-gradient(135deg, #6d28d9, #a855f7);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 20px rgba(109,40,217,.22);
}

.toolbar { margin: 8px 0 18px; }

.sort {
  height: 42px;
  border: 1px solid #ddd6fe;
  border-radius: 11px;
  padding: 0 13px;
  background: #fff;
  outline: none;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 18px;
}

.card {
  background: #fff;
  border: 1px solid rgba(229,231,235,.9);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-md);
  border-color: #ddd6fe;
}

.image-wrap {
  position: relative;
  aspect-ratio: 1;
  background: linear-gradient(135deg,#f8fafc,#f1f5f9);
  overflow: hidden;
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .45s ease;
}

.card:hover .image-wrap img { transform: scale(1.045); }

.discount {
  position: absolute;
  top: 11px;
  left: 11px;
  background: linear-gradient(135deg,#16a34a,#22c55e);
  color: #fff;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 950;
  box-shadow: 0 5px 13px rgba(22,163,74,.2);
}

.heart {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 39px;
  height: 39px;
  border: 1px solid rgba(229,231,235,.9);
  border-radius: 50%;
  background: rgba(255,255,255,.94);
  color: #4b5563;
  font-size: 20px;
  box-shadow: 0 5px 16px rgba(17,24,39,.1);
  transition: .2s ease;
}

.heart:hover { transform: scale(1.08); color: #db2777; }

.card-body { padding: 14px; }

.category-label {
  color: #7c3aed;
  text-transform: uppercase;
  letter-spacing: .65px;
  font-size: 10px;
  font-weight: 950;
}

.product-name {
  margin: 7px 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 850;
  min-height: 42px;
}

.rating {
  color: #b45309;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 8px;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 5px;
}

.price { font-size: 21px; font-weight: 950; }

.mrp { color: #9ca3af; text-decoration: line-through; font-size: 12px; }

.stock-small {
  color: #16a34a;
  font-size: 12px;
  font-weight: 850;
  margin-bottom: 11px;
}

.actions,
.detail-buy {
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 8px;
}

.primary {
  min-height: 42px;
  border-radius: 11px;
  background: linear-gradient(135deg,#6d28d9,#9333ea);
  color: #fff;
  border: 1px solid transparent;
  font-weight: 900;
  padding: 10px 13px;
  box-shadow: 0 7px 18px rgba(109,40,217,.2);
  transition: .2s ease;
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(109,40,217,.28);
}

.full { width: 100%; margin-top: 12px; }

.pagination {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin-top: 32px;
}

.page-button {
  min-width: 40px;
  height: 40px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 11px;
  font-weight: 850;
}

.page-button.active {
  color: #fff;
  background: linear-gradient(135deg,#6d28d9,#a855f7);
  border-color: transparent;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15,23,42,.68);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal {
  width: min(940px,100%);
  max-height: 94vh;
  overflow: auto;
  background: #fff;
  border: 1px solid rgba(255,255,255,.8);
  border-radius: 24px;
  box-shadow: var(--shadow-lg);
}

.small-modal { width: min(540px,100%); }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 22px;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(12px);
}

.modal-header h2 { margin: 0; letter-spacing: -.5px; }

.close {
  width: 38px;
  height: 38px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 50%;
  font-size: 21px;
}

.modal-content { padding: 22px; }

.detail {
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  gap: 26px;
}

.gallery-main {
  aspect-ratio: 1;
  border-radius: 18px;
  overflow: hidden;
  background: #f1f5f9;
  box-shadow: var(--shadow-sm);
}

.gallery-main img { width:100%; height:100%; object-fit:cover; }

.thumbnails {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 8px;
  margin-top: 10px;
}

.thumbnail {
  aspect-ratio: 1;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  background: #f1f5f9;
}

.thumbnail.active { border-color: #8b5cf6; }
.thumbnail img { width:100%; height:100%; object-fit:cover; }

.detail-info h2 {
  font-size: 30px;
  line-height: 1.18;
  margin-top: 0;
  letter-spacing: -.8px;
}

.size-picker { margin: 18px 0; }
.size-picker-title { font-weight: 950; margin-bottom: 9px; }
.size-options { display:flex; flex-wrap:wrap; gap:8px; }

.size-option {
  min-width: 56px;
  min-height: 43px;
  padding: 7px 12px;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 11px;
  font-weight: 900;
}

.size-option.active {
  background: linear-gradient(135deg,#6d28d9,#9333ea);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 15px rgba(109,40,217,.2);
}

.size-option:disabled { opacity:.42; cursor:not-allowed; }
.size-option small { display:block; font-size:10px; margin-top:2px; }
.cart-size { display:block; margin-top:3px; color:#6b7280; }

.description { color:#5f6672; line-height:1.75; white-space:pre-line; }
.stock-detail { color:#16a34a; font-weight:850; }

.field { margin-bottom:14px; }
.field label { display:block; margin-bottom:6px; font-size:13px; font-weight:900; }

.field input,
.field textarea {
  width:100%;
  border:1px solid #d1d5db;
  border-radius:11px;
  padding:11px 12px;
  outline:none;
  background:#fff;
}

.field input { height:46px; }

.cart-items { display:grid; gap:10px; }

.cart-item {
  display:grid;
  grid-template-columns:70px 1fr auto;
  gap:11px;
  align-items:center;
  padding:10px;
  border:1px solid #e5e7eb;
  border-radius:13px;
  background:#fff;
  box-shadow:0 3px 12px rgba(17,24,39,.035);
}

.cart-item img { width:70px; height:70px; object-fit:cover; border-radius:10px; }
.cart-item h4 { margin:0 0 5px; }

.qty { display:flex; align-items:center; gap:7px; margin-top:6px; }

.qty button {
  width:30px;
  height:30px;
  border:1px solid #d1d5db;
  background:#fff;
  border-radius:8px;
}

.summary { border-top:1px solid #e5e7eb; margin-top:17px; padding-top:15px; }
.summary-row { display:flex; justify-content:space-between; margin-bottom:9px; }
.total-row { border-top:1px solid #e5e7eb; padding-top:13px; font-size:20px; font-weight:950; }

.notice {
  position:fixed;
  z-index:300;
  left:50%;
  bottom:20px;
  transform:translateX(-50%);
  background:#111827;
  color:#fff;
  padding:12px 18px;
  border-radius:999px;
  box-shadow:0 12px 35px rgba(0,0,0,.25);
  max-width:calc(100% - 24px);
  text-align:center;
}

.notice.static { position:static; transform:none; margin-top:15px; }

.empty {
  padding:48px 20px;
  text-align:center;
  color:#6b7280;
  background:#fff;
  border:1px dashed #cbd5e1;
  border-radius:18px;
}

.footer {
  background:
    radial-gradient(circle at 20% 0%, rgba(139,92,246,.25), transparent 30%),
    linear-gradient(135deg,#111827,#1f1235);
  color:#cbd5e1;
  padding:46px 18px;
  text-align:center;
}

.admin-link { background:transparent; border:0; color:#c4b5fd; font-weight:850; }

.login-info,
.upi-box {
  background:linear-gradient(135deg,#f5f3ff,#fdf4ff);
  color:#5b21b6;
  padding:14px;
  border:1px solid #ede9fe;
  border-radius:12px;
  margin-bottom:16px;
}

.upi-id { font-size:22px; font-weight:950; word-break:break-all; }

.qr {
  width:min(300px,100%);
  aspect-ratio:1/1;
  display:block;
  margin:12px auto;
  border-radius:17px;
  background:#fff;
  padding:10px;
  border:1px solid #e5e7eb;
  box-shadow:var(--shadow-sm);
}

.payment-subtitle { margin:4px 0 10px; color:#6b7280; }

.qr-card {
  text-align:center;
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:18px;
  padding:13px;
  color:#111827;
}

.qr-card strong { display:block; font-size:20px; }
.qr-card span { display:block; color:#6b7280; font-size:13px; margin-top:3px; }
.upi-id-wrap { margin-top:12px; }
.upi-id-wrap > span { display:block; font-size:12px; color:#6b7280; margin-bottom:4px; }
.upi-name { margin:6px 0 12px; font-weight:850; }
.upi-apps-title { font-weight:950; color:#111827; margin:14px 0 9px; }

.upi-app-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }

.upi-app-button {
  min-height:58px;
  display:flex;
  align-items:center;
  gap:9px;
  padding:8px 10px;
  border:1px solid #e5e7eb;
  border-radius:13px;
  background:#fff;
  color:#111827;
  font-weight:850;
  cursor:pointer;
  text-align:left;
  transition:.18s ease;
}

.upi-app-button:hover { border-color:#a78bfa; transform:translateY(-1px); box-shadow:var(--shadow-sm); }

.upi-logo {
  width:36px;
  height:36px;
  border-radius:10px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  flex:0 0 36px;
  font-weight:950;
  font-size:11px;
  background:#f3f4f6;
  overflow:hidden;
}

.upi-logo img { width:25px; height:25px; display:block; }
.other-logo { background:#eef2ff; color:#4f46e5; font-size:11px; }

.admin-note {
  margin:14px 0;
  padding:12px 14px;
  border-radius:12px;
  background:linear-gradient(135deg,#f5f3ff,#fdf2f8);
  color:#5b21b6;
  border:1px solid #ede9fe;
}

.admin-note p { margin:4px 0 0; font-size:13px; }
.auto-qr-badge { display:inline-block; margin-top:10px; padding:6px 9px; border-radius:999px; background:#ecfdf5; color:#047857; font-size:12px; font-weight:850; }

.category-icon { font-size:20px; display:inline-block; margin-right:5px; }

.offer-overlay {
  position:fixed;
  inset:0;
  background:rgba(15,23,42,.72);
  backdrop-filter:blur(6px);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
  z-index:9999;
}

.offer-popup {
  width:min(560px,100%);
  background:#fff;
  border-radius:26px;
  overflow:hidden;
  box-shadow:var(--shadow-lg);
  position:relative;
}

.offer-popup img { width:100%; max-height:260px; object-fit:cover; }
.offer-body { padding:30px; }
.offer-body h2 { margin:8px 0; font-size:30px; letter-spacing:-.8px; }
.offer-body p { color:#666; line-height:1.65; }

.offer-close {
  position:absolute;
  right:13px;
  top:13px;
  width:39px;
  height:39px;
  border:1px solid #e5e7eb;
  border-radius:50%;
  background:rgba(255,255,255,.95);
  font-size:26px;
  cursor:pointer;
  box-shadow:0 5px 16px rgba(0,0,0,.12);
}

.offer-badge { font-size:11px; font-weight:950; letter-spacing:.14em; color:#7c3aed; }

.slider-section { max-width:1380px; margin:28px auto; padding:0 20px; }

.product-slider {
  display:flex;
  gap:16px;
  overflow-x:auto;
  padding:4px 2px 15px;
  scroll-snap-type:x mandatory;
  scrollbar-width:none;
}

.mini-card {
  min-width:225px;
  max-width:225px;
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:19px;
  overflow:hidden;
  box-shadow:var(--shadow-sm);
  scroll-snap-align:start;
  cursor:pointer;
  transition:.22s ease;
}

.mini-card:hover { transform:translateY(-4px); box-shadow:var(--shadow-md); }
.mini-card img { width:100%; height:195px; object-fit:cover; display:block; }
.mini-card-body { padding:13px; display:grid; gap:7px; }
.mini-card-body strong { font-size:14px; line-height:1.35; }
.mini-card-body span { color:#666; font-size:13px; }
.mini-card-body b { font-size:18px; }

.checkbox-group { display:flex; flex-wrap:wrap; gap:12px; margin:14px 0; }
.checkbox-row { display:flex; align-items:center; gap:8px; }

.table-wrap { overflow:auto; }
.table-wrap table { width:100%; border-collapse:collapse; }
.table-wrap th,.table-wrap td { padding:10px; border-bottom:1px solid #eee; text-align:left; font-size:13px; }

@media(max-width:1050px) {
  .grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
}

@media(max-width:760px) {
  .header-inner { flex-wrap:wrap; }
  .search { order:3; flex-basis:100%; }
  .hero-card { min-height:320px; padding:34px 25px; }
  .grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px; }
  .detail { grid-template-columns:1fr; }
  .toolbar { align-items:flex-start; flex-direction:column; }
  .actions,.detail-buy { display:grid; grid-template-columns:1fr 1fr; }
  .section-title h2 { font-size:23px; }
}

@media(max-width:460px) {
  .topbar { font-size:10px; padding:8px 9px; }
  .header-inner { padding:9px 12px; gap:9px; }
  .logo { font-size:23px; }
  .header-actions { width:100%; }
  .header-button { flex:1; }
  .hero,.content,.slider-section { padding-left:12px; padding-right:12px; }
  .hero-card { border-radius:23px; padding:28px 21px; min-height:300px; }
  .hero-card h1 { font-size:35px; letter-spacing:-2px; }
  .hero-card p { font-size:14px; }
  .grid { gap:9px; }
  .card { border-radius:15px; }
  .card-body { padding:10px; }
  .product-name { font-size:13px; min-height:38px; }
  .price { font-size:18px; }
  .actions,.detail-buy { display:grid; grid-template-columns:1fr; }
  .cart-item { grid-template-columns:58px 1fr; }
  .cart-item img { width:58px; height:58px; }
  .upi-app-grid { grid-template-columns:1fr; }
}

/* =====================================================
   PREMIUM HOMEPAGE OVERRIDES
   ===================================================== */
.topbar {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  position: relative;
}
.topbar-button {
  border: 0;
  border-radius: 999px;
  padding: 6px 15px;
  margin-left: 9px;
  background: #fff;
  color: #5b21b6;
  font-weight: 950;
  font-size: 11px;
  box-shadow: 0 5px 16px rgba(0,0,0,.16);
}
.header {
  background: rgba(255,255,255,.98);
}
.header-inner {
  min-height: 72px;
  max-width: 1440px;
  padding: 10px 28px;
}
.logo {
  display:flex;
  align-items:center;
  gap:7px;
  font-size: 25px;
  letter-spacing: -.9px;
}
.logo-mark {
  display:grid;
  place-items:center;
  width:38px;
  height:38px;
  border-radius:10px;
  background:linear-gradient(135deg,#7c3aed,#ec4899);
  color:#fff;
  font-size:23px;
  box-shadow:0 7px 18px rgba(124,58,237,.25);
}
.logo span:last-child:not(.india-mark) { display:flex; flex-direction:column; }
.logo small {
  display:block;
  font-size:8px;
  letter-spacing:2px;
  margin-top:-2px;
  color:#8b5cf6;
}
.india-mark { margin-left:3px; font-size:19px; }
.search {
  max-width: 600px;
}
.search input {
  height: 50px;
  padding-right: 50px;
  border-radius: 13px;
  background:#fafafa;
  border-color:#e5e7eb;
}
.search-icon {
  position:absolute;
  right:6px;
  top:5px;
  width:40px;
  height:40px;
  border-radius:10px;
  display:grid;
  place-items:center;
  background:linear-gradient(135deg,#6d28d9,#9333ea);
  color:#fff;
  font-size:24px;
  font-weight:900;
}
.header-actions {
  gap:4px;
  margin-left:auto;
}
.header-button {
  border:0;
  background:transparent;
  color:#312e81;
  min-width:65px;
  padding:6px 7px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:2px;
  border-radius:12px;
}
.header-button > span { font-size:21px; line-height:1; color:#7c3aed; }
.header-button small { font-size:10px; font-weight:900; color:#1f2937; white-space:nowrap; }
.header-button:hover { background:#f5f3ff; transform:none; box-shadow:none; }
.main-nav {
  max-width:1440px;
  margin:auto;
  padding:0 28px 11px;
  display:flex;
  align-items:center;
  gap:7px;
  overflow-x:auto;
  scrollbar-width:none;
}
.main-nav::-webkit-scrollbar { display:none; }
.main-nav button { white-space:nowrap; }
.all-categories {
  border:0;
  border-radius:10px;
  background:linear-gradient(135deg,#5b21b6,#7c3aed);
  color:#fff;
  padding:10px 17px;
  font-size:12px;
  font-weight:950;
  box-shadow:0 7px 18px rgba(91,33,182,.2);
}
.nav-link {
  border:0;
  background:transparent;
  padding:10px 13px;
  color:#374151;
  font-size:12px;
  font-weight:850;
  position:relative;
}
.nav-link:hover { color:#6d28d9; }
.nav-link.active { color:#6d28d9; }
.nav-link.active::after {
  content:"";
  position:absolute;
  left:13px;
  right:13px;
  bottom:2px;
  height:2px;
  border-radius:3px;
  background:#7c3aed;
}
.nav-link.hot em {
  font-style:normal;
  font-size:8px;
  background:#ec4899;
  color:#fff;
  border-radius:5px;
  padding:2px 4px;
  margin-left:3px;
}
.hero {
  max-width:1440px;
  padding:15px 28px 8px;
}
.hero-card {
  min-height:330px;
  border-radius:22px;
  padding:42px 48px;
  background:
    radial-gradient(circle at 82% 20%,rgba(255,180,70,.32),transparent 18%),
    radial-gradient(circle at 15% 75%,rgba(255,85,120,.18),transparent 25%),
    linear-gradient(115deg,#250052 0%,#5b0aa8 48%,#df2678 100%);
  box-shadow:0 18px 45px rgba(91,33,182,.22);
}
.hero-copy {
  width:57%;
  position:relative;
  z-index:2;
}
.hero-kicker {
  display:inline-block;
  background:linear-gradient(90deg,#ffb000,#ff5b8a);
  color:#fff;
  padding:7px 12px;
  border-radius:999px;
  font-size:10px;
  font-weight:950;
  letter-spacing:.7px;
  margin-bottom:13px;
}
.hero-card h1 {
  font-size:clamp(36px,4.4vw,61px);
  line-height:1.01;
  letter-spacing:-2.8px;
  max-width:640px;
  text-transform:none;
  margin-bottom:13px;
}
.hero-card p {
  font-size:16px;
  max-width:590px;
  margin-bottom:20px;
}
.hero-button {
  padding:12px 19px;
  border-radius:10px;
}
.hero-art {
  position:absolute;
  right:25px;
  top:15px;
  bottom:15px;
  width:43%;
  display:grid;
  place-items:center;
  overflow:hidden;
}
.hero-art img {
  width:100%;
  height:100%;
  object-fit:cover;
  border-radius:18px;
  box-shadow:0 16px 40px rgba(0,0,0,.18);
}
.hero-discount {
  width:220px;
  height:220px;
  border-radius:50%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  color:#fff;
  background:radial-gradient(circle,#ef476f 0 42%,#b40f58 43% 62%,#f8b22d 63% 68%,#9d1258 69%);
  border:8px solid #ffca57;
  box-shadow:0 0 0 12px rgba(255,202,87,.12),0 20px 45px rgba(0,0,0,.22);
  transform:rotate(5deg);
}
.hero-discount small { font-weight:900; font-size:16px; }
.hero-discount strong { font-size:68px; line-height:.9; }
.hero-discount b { font-size:29px; }
.hero-diya { position:absolute; left:15%; bottom:10%; font-size:78px; filter:drop-shadow(0 10px 15px rgba(0,0,0,.2)); }
.hero-gift { position:absolute; left:30%; bottom:6%; font-size:52px; }
.hero-spark { position:absolute; top:10%; left:12%; font-size:70px; color:#ffd166; }
.trust-strip {
  max-width:1440px;
  margin:10px auto 8px;
  padding:0 28px;
  display:grid;
  grid-template-columns:repeat(4,1fr);
}
.trust-strip > div {
  background:#fff;
  min-height:66px;
  display:grid;
  grid-template-columns:42px 1fr;
  align-content:center;
  padding:9px 18px;
  border-right:1px solid #eee;
  box-shadow:0 7px 22px rgba(17,24,39,.05);
}
.trust-strip > div:first-child { border-radius:14px 0 0 14px; }
.trust-strip > div:last-child { border-radius:0 14px 14px 0; border-right:0; }
.trust-strip span { grid-row:span 2; font-size:26px; }
.trust-strip strong { font-size:12px; }
.trust-strip small { font-size:10px; color:#6b7280; }
.home-section,.category-showcase,.deals-section {
  max-width:1440px;
  margin:0 auto;
  padding:23px 28px 8px;
}
.category-showcase-grid {
  display:grid;
  grid-template-columns:repeat(8,1fr);
  gap:13px;
}
.category-tile {
  min-height:96px;
  border:1px solid #ececf2;
  background:#fff;
  border-radius:15px;
  box-shadow:0 7px 20px rgba(17,24,39,.06);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:7px;
  color:#1f2937;
  transition:.2s ease;
}
.category-tile span {
  width:45px;height:45px;border-radius:50%;
  display:grid;place-items:center;
  background:linear-gradient(135deg,#faf5ff,#fce7f3);
  font-size:24px;
}
.category-tile b { font-size:11px; }
.category-tile:hover { transform:translateY(-4px); border-color:#c4b5fd; box-shadow:0 13px 28px rgba(109,40,217,.12); }
.text-link { border:0; background:transparent; color:#6d28d9; font-weight:900; font-size:12px; }
.deals-section { padding-top:18px; }
.deal-timer {
  background:#fff7ed;
  color:#c2410c;
  border-radius:999px;
  padding:7px 11px;
  font-size:11px;
  font-weight:900;
}
.deals-grid {
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:14px;
}
.deal-card {
  background:#fff;
  border:1px solid #eee;
  border-radius:15px;
  overflow:hidden;
  box-shadow:0 6px 20px rgba(17,24,39,.06);
  transition:.2s ease;
  cursor:pointer;
}
.deal-card:hover { transform:translateY(-4px); box-shadow:0 14px 30px rgba(17,24,39,.11); }
.deal-image { aspect-ratio:1.08; position:relative; background:#f8fafc; overflow:hidden; }
.deal-image img { width:100%;height:100%;object-fit:cover;transition:.3s; }
.deal-card:hover .deal-image img { transform:scale(1.04); }
.deal-image span {
  position:absolute;left:9px;top:9px;z-index:2;
  background:#16a34a;color:#fff;padding:5px 7px;border-radius:6px;
  font-size:9px;font-weight:950;
}
.deal-body { padding:10px 11px 13px; display:grid; gap:4px; }
.deal-body strong { font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.deal-body span { color:#b45309; font-size:11px; font-weight:800; }
.deal-body b { font-size:16px; }
.deal-body del { color:#9ca3af; font-size:10px; margin-left:4px; }
.slider-section .section-title { margin-bottom:12px; }
.footer {
  background:linear-gradient(135deg,#160b2f,#27134f);
  color:#f5f3ff;
  padding:34px max(28px,calc((100vw - 1384px)/2));
}
.footer-brand { font-size:22px; }
.footer p { color:#c4b5fd; max-width:620px; line-height:1.65; }
.footer-contact { display:flex; flex-wrap:wrap; gap:12px; }
.footer-contact a { color:#fff; text-decoration:none; font-weight:800; }
.footer-links { color:#c4b5fd; margin-top:18px; font-size:12px; }

/* Make the existing product catalog feel like the reference storefront. */
.content {
  max-width:1440px;
  padding-left:28px;
  padding-right:28px;
}
.grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
.card { border-radius:15px; }
.primary { border-radius:9px; }
.actions,.detail-buy { grid-template-columns:1fr 1fr; }

@media(max-width:900px) {
  .header-inner { flex-wrap:wrap; }
  .logo { flex:1 0 auto; }
  .search { order:3; flex-basis:100%; max-width:none; }
  .header-actions { margin-left:0; }
  .main-nav { padding-left:14px; padding-right:14px; }
  .hero { padding-left:14px; padding-right:14px; }
  .hero-card { min-height:360px; padding:28px; }
  .hero-copy { width:100%; }
  .hero-art { opacity:.38; width:58%; right:-10px; }
  .trust-strip { padding:0 14px; grid-template-columns:repeat(2,1fr); gap:2px; }
  .trust-strip > div { border-radius:0 !important; }
  .category-showcase,.deals-section,.home-section { padding-left:14px; padding-right:14px; }
  .category-showcase-grid { grid-template-columns:repeat(4,1fr); }
  .deals-grid { grid-template-columns:repeat(2,1fr); }
}
@media(max-width:560px) {
  .topbar { padding:8px 7px; font-size:9px; flex-wrap:wrap; }
  .topbar-button { padding:5px 10px; margin-left:3px; }
  .header-inner { padding:9px 12px 7px; }
  .logo { font-size:20px; }
  .logo-mark { width:34px; height:34px; font-size:20px; }
  .india-mark { font-size:15px; }
  .header-actions { width:auto; }
  .header-button { min-width:45px; padding:4px; }
  .header-button small { font-size:8px; }
  .header-button > span { font-size:18px; }
  .wishlist-head { display:none; }
  .search input { height:46px; }
  .main-nav { padding-bottom:8px; }
  .nav-link { padding:8px 10px; font-size:10px; }
  .all-categories { padding:8px 11px; font-size:10px; }
  .hero { padding-top:10px; }
  .hero-card { min-height:335px; padding:25px 20px; border-radius:20px; }
  .hero-copy { width:100%; }
  .hero-kicker { font-size:8px; }
  .hero-card h1 { font-size:35px; letter-spacing:-1.9px; max-width:85%; }
  .hero-card p { font-size:13px; line-height:1.55; max-width:78%; }
  .hero-art { width:70%; opacity:.3; right:-70px; }
  .hero-discount { width:165px;height:165px; }
  .hero-discount strong { font-size:50px; }
  .hero-discount b { font-size:21px; }
  .trust-strip { grid-template-columns:1fr 1fr; padding:0 12px; }
  .trust-strip > div { padding:8px 9px; grid-template-columns:29px 1fr; }
  .trust-strip span { font-size:19px; }
  .trust-strip strong { font-size:9px; }
  .trust-strip small { font-size:8px; }
  .category-showcase,.deals-section,.home-section { padding-left:12px; padding-right:12px; }
  .category-showcase-grid { grid-template-columns:repeat(4,1fr); gap:7px; }
  .category-tile { min-height:78px; border-radius:11px; }
  .category-tile span { width:35px;height:35px;font-size:19px; }
  .category-tile b { font-size:9px; }
  .deals-grid { grid-template-columns:repeat(2,1fr); gap:8px; }
  .deal-body { padding:8px; }
  .deal-body strong { font-size:10px; }
  .deal-body b { font-size:14px; }
  .content { padding-left:12px; padding-right:12px; }
  .footer { padding:28px 15px; }
}

`;

/* =====================================================
   ADMIN CSS
   ===================================================== */

const ADMIN_CSS = `
.admin-page {
  min-height: 100vh;
  background: #f3f4f6;
  color: #111827;
  font-family: Inter, Arial, sans-serif;
}

.admin-login {
  width: min(460px, calc(100% - 30px));
  margin: 8vh auto;
  background: white;
  border-radius: 18px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0,0,0,.1);
}

.admin-brand {
  color: #7c3aed;
  font-size: 27px;
  font-weight: 950;
}

.admin-login h1 {
  margin-bottom: 6px;
}

.admin-login p {
  color: #6b7280;
  line-height: 1.6;
}

.admin-header {
  min-height: 70px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 22px;
}

.admin-header-actions {
  display: flex;
  gap: 8px;
}

.admin-layout {
  display: grid;
  grid-template-columns: 230px 1fr;
  min-height: calc(100vh - 70px);
}

.admin-sidebar {
  background: #111827;
  padding: 18px 12px;
}

.admin-nav {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  color: #d1d5db;
  text-align: left;
  padding: 13px;
  border-radius: 8px;
  margin-bottom: 5px;
  font-weight: 800;
}

.admin-nav.active {
  background: #7c3aed;
  color: white;
}

.admin-main {
  padding: 25px;
  max-width: 1500px;
  width: 100%;
}

.admin-title {
  margin-bottom: 20px;
}

.admin-title h1 {
  margin: 0 0 5px;
}

.admin-title p {
  color: #6b7280;
  margin: 0;
}

.stats {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat {
  background: white;
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 3px 15px rgba(0,0,0,.04);
}

.stat span {
  color: #6b7280;
  display: block;
  font-size: 13px;
  font-weight: 800;
}

.stat strong {
  display: block;
  margin-top: 8px;
  font-size: 32px;
}

.admin-card {
  background: white;
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 3px 15px rgba(0,0,0,.04);
}

.admin-card h2 {
  margin-top: 0;
}

.admin-message {
  background: #111827;
  color: white;
  border-radius: 9px;
  padding: 11px 14px;
  margin-bottom: 15px;
}

.form-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0,1fr));
  gap: 14px;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 15px;
}

.checkbox {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 800;
  margin: 15px 0;
}

.checkbox input {
  width: 18px;
  height: 18px;
}

.image-input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
}

.product-upload-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.upload-preview-card {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 6px;
  background: #fff;
}

.upload-preview-card img {
  display: block;
  width: 100%;
  height: 130px;
  object-fit: cover;
  border-radius: 7px;
  margin-bottom: 6px;
}

.upload-preview-card .danger {
  width: 100%;
}

.image-input-row input {
  height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
}

.table-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

th,
td {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

th {
  font-size: 12px;
  text-transform: uppercase;
  color: #6b7280;
}

.product-admin {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 230px;
}

.product-admin img {
  width: 55px;
  height: 55px;
  border-radius: 8px;
  object-fit: cover;
  background: #f3f4f6;
}

.product-admin small,
td small {
  display: block;
  color: #6b7280;
  margin-top: 3px;
}

.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.danger {
  border: 1px solid #fecaca;
  background: #fff;
  color: #dc2626;
  border-radius: 8px;
  padding: 9px 12px;
  font-weight: 800;
}

.badge {
  display: inline-block;
  background: #f3f4f6;
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 900;
}

.badge.success {
  background: #dcfce7;
  color: #166534;
}

.upi-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upi-preview strong {
  font-size: 22px;
}

.upi-preview img {
  width: 220px;
  max-width: 100%;
  margin-top: 10px;
}

.size-admin-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
}

.size-admin-row input {
  min-height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  padding: 0 10px;
}

.order-detail-text {
  white-space: normal;
  line-height: 1.45;
}

.order-items-details {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
}

.upi-preview img {
  width: 220px;
  max-width: 100%;
  margin-top: 10px;
}

select {
  min-height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  padding: 0 8px;
  background: white;
}

@media(max-width:900px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    display: flex;
    overflow-x: auto;
    gap: 6px;
  }

  .admin-nav {
    white-space: nowrap;
    width: auto;
  }

  .stats {
    grid-template-columns:
      repeat(2,1fr);
  }
}

@media(max-width:600px) {
  .admin-main {
    padding: 15px;
  }

  .form-grid,
  .stats {
    grid-template-columns: 1fr;
  }

  .admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .image-input-row {
    grid-template-columns: 1fr;
  }

  .size-admin-row {
    grid-template-columns: 1fr;
  }
}

/* PREMIUM SHOPPING ADDITIONS */
.buy-now-card, .buy-now-large { background: linear-gradient(135deg,#ff4d6d,#ff8a00); color:#fff; border:0; box-shadow:0 8px 20px rgba(255,77,109,.22); }
.detail-buy { display:flex; flex-direction:column; gap:10px; margin-top:18px; }
.detail-buy button { width:100%; min-height:48px; font-size:16px; font-weight:900; }
.actions { display:flex; flex-direction:column; gap:8px; }
.size-preset-bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:10px 0; }
.footer-brand { font-size:20px; margin-bottom:8px; }
.footer-contact { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; margin:12px 0; }
.footer-contact a { color:inherit; text-decoration:none; font-weight:800; }
.footer-links { opacity:.8; font-size:13px; }
.review-list { margin-top:18px; }
.review-card { padding:12px; margin:8px 0; border:1px solid #eee; border-radius:12px; background:#fff; }
.review-card span { color:#f59e0b; }
.review-card p { margin:6px 0 0; }
.section-divider { margin:18px 0 8px; padding-top:14px; border-top:1px solid #eee; }
`;

/* =====================================================
   ENTRY
   ===================================================== */

function RootApp() {
  if (SITE_MODE === "admin") return <AdminApp />;
  if (SITE_MODE === "customer") return <StoreApp />;
  const isAdmin = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
  return isAdmin ? <AdminApp /> : <StoreApp />;
}

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <RootApp />
);
