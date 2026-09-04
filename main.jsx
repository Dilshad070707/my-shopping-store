import React, {
  useEffect,
  useMemo,
  useRef,
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
  "All", "Women", "Men", "Electronics", "Beauty", "Footwear", "Home", "Kitchen",
  "Accessories", "Kids", "Sports", "Bags", "Jewellery", "Watches", "Mobiles",
  "Mobile Accessories", "Laptops", "Laptop Accessories",
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

function getProductVariants(product) {
  if (!Array.isArray(product?.variants)) return [];
  return product.variants
    .map((group) => ({
      name: String(group?.name || "").trim(),
      options: Array.isArray(group?.options)
        ? group.options.map((option) => ({
            label: String(option?.label || "").trim(),
            price: option?.price === null || option?.price === undefined || option?.price === "" ? null : Number(option.price),
          })).filter((option) => option.label)
        : [],
    }))
    .filter((group) => group.name && group.options.length);
}

function getVariantPrice(product, selectedVariants = {}) {
  const groups = getProductVariants(product);
  if (!groups.length) return Number(product?.price || 0);
  let price = Number(product?.price || 0);
  groups.forEach((group) => {
    const selected = String(selectedVariants[group.name] || "");
    const index = group.options.findIndex((option) => option.label === selected);
    if (index < 0) return;
    const option = group.options[index];
    if (option.price !== null) {
      const firstPriced = group.options.find((entry) => entry.price !== null);
      if (firstPriced && index !== group.options.indexOf(firstPriced)) {
        price += Number(option.price) - Number(firstPriced.price);
      } else if (firstPriced) {
        price += Number(firstPriced.price) - Number(product?.price || 0);
      }
    }
  });
  return Math.max(0, price);
}

function getVariantSelectionKey(variants = {}) {
  return Object.entries(variants)
    .filter(([, value]) => String(value || "").trim())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}:${value}`)
    .join("|");
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
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedVariants, setSelectedVariants] = useState({});
  const [suggestedProducts, setSuggestedProducts] = useState([]);

  const [cart, setCart] =
    useState([]);

  const [wishlist, setWishlist] =
    useState([]);

  const [cartOpen, setCartOpen] =
    useState(false);

  const [loginOpen, setLoginOpen] =
    useState(false);

  const [accountOpen, setAccountOpen] =
    useState(false);

  const [profilePhoto, setProfilePhoto] =
    useState("");

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

  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);

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
    settings: { show_banner:true, show_categories:true, show_deals:true, show_best_selling:true, show_trust_strip:true },
    best_selling: [],
    featured: [],
    new_arrivals: [],
  });

  const [offerOpen, setOfferOpen] = useState(false);
  const [pendingBuyNow, setPendingBuyNow] = useState(false);
  const bestSellingSliderRef = useRef(null);

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

      const savedProfile = localStorage.getItem("meeshoo_profile");
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          if (profile && typeof profile === "object") {
            setAddress((current) => ({ ...current, ...profile }));
            if (profile.photo) setProfilePhoto(String(profile.photo));
          }
        } catch {}
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
    try {
      localStorage.setItem(
        "meeshoo_profile",
        JSON.stringify({ ...address, photo: profilePhoto })
      );
    } catch {}
  }, [address, profilePhoto]);

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
    const match = window.location.pathname.match(/^\/product\/([^/]+)\/?$/i);
    if (!match) return;
    const slug = decodeURIComponent(match[1]);
    apiFetch(`/api/products/${encodeURIComponent(slug)}`).then((data) => {
      if (data.product) openProduct(data.product);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (!window.location.pathname.startsWith('/product/')) setSelectedProduct(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
      if (!localStorage.getItem("meeshoo_user") && !localStorage.getItem("meeshoo_login_prompt_seen")) {
        const offerShown = settings.offer_enabled && !sessionStorage.getItem("meeshoo_offer_seen");
        if (offerShown) {
          setOfferOpen(true);
          sessionStorage.setItem("meeshoo_offer_seen", "1");
          window.setTimeout(() => {
            setOfferOpen(false);
            if (!localStorage.getItem("meeshoo_user") && !localStorage.getItem("meeshoo_login_prompt_seen")) {
              setLoginOpen(true);
              localStorage.setItem("meeshoo_login_prompt_seen", "1");
            }
          }, 2000);
        } else {
          setLoginOpen(true);
          localStorage.setItem("meeshoo_login_prompt_seen", "1");
        }
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
    // Public navigation is intentionally fixed. Never merge arbitrary DB categories into the UI.
    setCategories(DEFAULT_CATEGORIES);
  }

  function notify(message) {
    setNotice(message);
  }

  function selectCategory(nextCategory) {
    const clean = String(nextCategory || "All").trim();
    setCategory(DEFAULT_CATEGORIES.includes(clean) ? clean : "All");
    setSearch("");
    setPage(1);
  }

  const filteredProducts = products;

  const visibleProducts = products;
  const filteredBrowse = Boolean(search.trim() || (category && category !== "All"));
  const homeMixedProducts = useMemo(() => {
    const combined = [
      ...(homepage.best_selling || []),
      ...(homepage.featured || []),
      ...(homepage.new_arrivals || []),
      ...products,
    ];
    const seen = new Set();
    return combined.filter((product) => {
      const key = String(product?.id || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 40);
  }, [homepage.best_selling, homepage.featured, homepage.new_arrivals, products]);

  // Auto-slide the homepage product rail every 2 seconds.
  // It uses the existing product cards and does not touch cart/payment logic.
  useEffect(() => {
    const slider = bestSellingSliderRef.current;
    if (!slider) return;

    let paused = false;
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };

    slider.addEventListener("mouseenter", pause);
    slider.addEventListener("mouseleave", resume);
    slider.addEventListener("touchstart", pause, { passive: true });
    slider.addEventListener("touchend", resume, { passive: true });

    const timer = window.setInterval(() => {
      if (paused || document.hidden) return;
      const card = slider.querySelector(".mini-card");
      if (!card) return;
      const step = card.getBoundingClientRect().width + 16;
      const atEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 8;
      slider.scrollTo({ left: atEnd ? 0 : slider.scrollLeft + step, behavior: "smooth" });
    }, 2000);

    return () => {
      window.clearInterval(timer);
      slider.removeEventListener("mouseenter", pause);
      slider.removeEventListener("mouseleave", resume);
      slider.removeEventListener("touchstart", pause);
      slider.removeEventListener("touchend", resume);
    };
  }, [homeMixedProducts]);

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

  function addToCart(product, requestedSize = "", requestedColor = "", requestedVariants = {}) {
    const sizes = getProductSizes(product);
    const variantGroups = getProductVariants(product);
    const cleanSize = String(requestedSize || "").trim().toUpperCase();
    const cleanColor = String(requestedColor || "").trim();
    const cleanVariants = Object.fromEntries(Object.entries(requestedVariants || {}).map(([key, value]) => [String(key).trim(), String(value || "").trim()]));
    const colorEntry = Array.isArray(product.colors) ? product.colors.find((entry) => String(entry.name || "").trim() === cleanColor) : null;
    const sizeEntry = sizes.find((entry) => String(entry.size).toUpperCase() === cleanSize);

    if (variantGroups.some((group) => !cleanVariants[group.name] || !group.options.some((option) => option.label === cleanVariants[group.name]))) {
      openProduct(product);
      notify("Please select all variants first.");
      return;
    }
    if (Array.isArray(product.colors) && product.colors.length && !colorEntry) {
      openProduct(product);
      notify("Please select a color first.");
      return;
    }
    if (sizes.length && !sizeEntry) {
      openProduct(product);
      notify("Please select a size first.");
      return;
    }

    const colorStock = colorEntry ? Number(colorEntry.stock || 0) : Infinity;
    const sizeStock = sizeEntry ? Number(sizeEntry.stock || 0) : Number(product.stock || 0);
    const availableStock = Math.min(sizeStock, colorStock);
    if (availableStock <= 0) {
      notify(colorEntry ? `Color ${cleanColor} is out of stock.` : "This product is out of stock.");
      return;
    }

    const basePrice = sizeEntry ? getSizePrice(product, cleanSize) : Number(product.price || 0);
    const price = colorEntry?.price !== null && colorEntry?.price !== undefined && colorEntry?.price !== ""
      ? Number(colorEntry.price)
      : getVariantPrice({ ...product, price: basePrice }, cleanVariants);

    const variantKey = getVariantSelectionKey(cleanVariants);
    const cartKey = `${product.id}__${cleanColor || "NOCOLOR"}__${cleanSize || "NOSIZE"}__${variantKey || "NOVARIANT"}`;
    setCart((current) => {
      const existing = current.find((item) => (item.cartKey || `${item.id}__${item.color || "NOCOLOR"}__${item.size || "NOSIZE"}__${getVariantSelectionKey(item.variants || {})}`) === cartKey);
      if (existing) {
        return current.map((item) => (item.cartKey || `${item.id}__${item.color || "NOCOLOR"}__${item.size || "NOSIZE"}__${getVariantSelectionKey(item.variants || {})}`) === cartKey
          ? { ...item, qty: Math.min(Number(item.qty) + 1, availableStock), stock: availableStock, price }
          : item);
      }
      return [...current, { ...product, cartKey, color: cleanColor || null, size: cleanSize || null, variants: cleanVariants, price, stock: availableStock, qty: 1 }];
    });
    notify(`${Object.values(cleanVariants).filter(Boolean).join(" / ")}${cleanColor ? `${cleanVariants && Object.keys(cleanVariants).length ? " / " : ""}${cleanColor}` : ""}${cleanSize ? ` / Size ${cleanSize}` : ""} added to cart.`.replace(/^ \/ /, ""));
  }

  function buyNow(product, requestedSize = "", requestedColor = "", requestedVariants = {}) {
    const sizes = getProductSizes(product);
    const variantGroups = getProductVariants(product);
    const cleanSize = String(requestedSize || "").trim().toUpperCase();
    const cleanColor = String(requestedColor || "").trim();
    const cleanVariants = Object.fromEntries(Object.entries(requestedVariants || {}).map(([key, value]) => [String(key).trim(), String(value || "").trim()]));
    const colorEntry = Array.isArray(product.colors) ? product.colors.find((entry) => String(entry.name || "").trim() === cleanColor) : null;
    const sizeEntry = sizes.find((entry) => String(entry.size).toUpperCase() === cleanSize);
    if (variantGroups.some((group) => !cleanVariants[group.name] || !group.options.some((option) => option.label === cleanVariants[group.name]))) { openProduct(product); notify("Please select all variants first."); return; }
    if (Array.isArray(product.colors) && product.colors.length && !colorEntry) { openProduct(product); notify("Please select a color first."); return; }
    if (sizes.length && !sizeEntry) { openProduct(product); notify("Please select a size first."); return; }
    const availableStock = Math.min(sizeEntry ? Number(sizeEntry.stock || 0) : Number(product.stock || 0), colorEntry ? Number(colorEntry.stock || 0) : Infinity);
    if (availableStock <= 0) { notify("This selected variant is out of stock."); return; }
    const basePrice = sizeEntry ? getSizePrice(product, cleanSize) : Number(product.price || 0);
    const price = colorEntry?.price !== null && colorEntry?.price !== undefined && colorEntry?.price !== ""
      ? Number(colorEntry.price) : getVariantPrice({ ...product, price: basePrice }, cleanVariants);
    const variantKey = getVariantSelectionKey(cleanVariants);
    const cartKey = `${product.id}__${cleanColor || "NOCOLOR"}__${cleanSize || "NOSIZE"}__${variantKey || "NOVARIANT"}`;
    const item = { ...product, cartKey, color: cleanColor || null, size: cleanSize || null, variants: cleanVariants, price, stock: availableStock, qty: 1 };
    setCart((current) => {
      const other = current.filter((x) => (x.cartKey || `${x.id}__${x.color || "NOCOLOR"}__${x.size || "NOSIZE"}__${getVariantSelectionKey(x.variants || {})}`) !== cartKey);
      return [...other, item];
    });
    setSelectedProduct(null);
    if (!user) { setPendingBuyNow(true); setLoginOpen(true); } else { setCheckoutOpen(true); }
  }

  function removeFromCart(
    id,
    size = "",
    color = "",
    variants = {}
  ) {
    const cartKey = `${id}__${String(color || "").trim() || "NOCOLOR"}__${String(size || "").toUpperCase() || "NOSIZE"}__${getVariantSelectionKey(variants) || "NOVARIANT"}`;
    setCart(
      (current) =>
        current.filter(
          (item) =>
            (item.cartKey || `${item.id}__${item.color || "NOCOLOR"}__${item.size || "NOSIZE"}__${getVariantSelectionKey(item.variants || {}) || "NOVARIANT"}`) !== cartKey
        )
    );

    notify(
      "Product removed."
    );
  }

  function changeQuantity(
    id,
    amount,
    size = "",
    color = "",
    variants = {}
  ) {
    const cartKey = `${id}__${String(color || "").trim() || "NOCOLOR"}__${String(size || "").toUpperCase() || "NOSIZE"}__${getVariantSelectionKey(variants) || "NOVARIANT"}`;
    setCart(
      (current) =>
        current
          .map((item) => {
            if (
              (item.cartKey || `${item.id}__${item.color || "NOCOLOR"}__${item.size || "NOSIZE"}__${getVariantSelectionKey(item.variants || {}) || "NOVARIANT"}`) !== cartKey
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

  async function openProduct(
    product
  ) {
    setSelectedProduct(product);
    setSelectedImage(0);
    const productSlug = String(product?.slug || product?.sku || product?.id || "").trim();
    if (productSlug) window.history.pushState({ productSlug }, "", `/product/${encodeURIComponent(productSlug)}`);
    setSuggestedProducts([]);
    setSelectedColor(String(product?.colors?.[0]?.name || ""));
    const initialVariants = Object.fromEntries(getProductVariants(product).map((group) => [group.name, group.options[0]?.label]));
    setSelectedVariants(initialVariants);
    const firstAvailable = getProductSizes(product).find((entry) => Number(entry.stock || 0) > 0);
    setSelectedSize(String(firstAvailable?.size || "").trim().toUpperCase());

    // Product cards intentionally carry only the first image to keep the catalog response small.
    // Fetch the complete product only when the customer opens its details.
    try {
      const lookup = product.slug || product.sku || product.id;
      const data = await apiFetch(`/api/products/${encodeURIComponent(lookup)}`);
      if (data.product && String(data.product.id) === String(product.id)) {
        setSelectedProduct(data.product);
        setSelectedImage(0);
        setSelectedColor(String(data.product?.colors?.[0]?.name || ""));
        const detailVariants = Object.fromEntries(getProductVariants(data.product).map((group) => [group.name, group.options[0]?.label]));
        setSelectedVariants(detailVariants);
        const detailSize = getProductSizes(data.product).find((entry) => Number(entry.stock || 0) > 0);
        setSelectedSize(String(detailSize?.size || "").trim().toUpperCase());
        try {
          const suggestionData = await apiFetch(`/api/products/${encodeURIComponent(data.product.slug || data.product.sku || data.product.id)}/suggestions`);
          setSuggestedProducts(Array.isArray(suggestionData.products) ? suggestionData.products : []);
        } catch { setSuggestedProducts([]); }
      }
    } catch (error) {
      console.warn("Product detail refresh failed:", error);
    }
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

  function handleProfilePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify("Profile photo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfilePhoto(String(reader.result || ""));
    reader.onerror = () => notify("Unable to load profile photo.");
    reader.readAsDataURL(file);
  }

  function changeEmailFromAccount() {
    setAccountOpen(false);
    setLoginOpen(true);
    setOtpStep(false);
    setOtp("");
    setEmail("");
    notify("Enter your new email. OTP verification is required.");
  }

  async function loginWithEmail(event) {
    event.preventDefault();
    try {
      const clean = email.trim().toLowerCase();
      const data = await apiFetch("/api/auth/email-login", {
        method: "POST", body: JSON.stringify({ email: clean })
      });
      if (data.otp_required) {
        setEmail(clean);
        setOtp("");
        setOtpStep(true);
        notify("OTP sent to your email.");
        return;
      }
      // Backward-compatible fallback only if the server explicitly says OTP is not required.
      setUser(data.user);
      setLoginOpen(false);
      setEmail("");
      if (pendingBuyNow) { setPendingBuyNow(false); setCheckoutOpen(true); }
      notify("Login successful.");
    } catch (err) { notify(err.message); }
  }

  async function verifyEmailOtp(event) {
    event.preventDefault();
    try {
      const data = await apiFetch("/api/auth/verify-otp", {
        method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() })
      });
      setUser(data.user);
      try {
        const savedProfile = JSON.parse(localStorage.getItem("meeshoo_profile") || "null");
        if (savedProfile && typeof savedProfile === "object") {
          setAddress((current) => ({ ...current, ...savedProfile }));
        }
      } catch {}
      setLoginOpen(false); setOtpStep(false); setOtp(""); setEmail("");
      if (pendingBuyNow) { setPendingBuyNow(false); setCheckoutOpen(true); }
      notify("Login successful.");
    } catch (err) { notify(err.message); }
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
      try {
        localStorage.setItem("meeshoo_profile", JSON.stringify(address));
      } catch {}

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
                  color: item.color || null,
                  size: item.size || null,
                  variants: item.variants || {},
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

  const bannerText = String(homepage.settings.offer_text || "Up to 90% OFF on Fashion, Footwear, Electronics & more");
  const bannerDiscount = Math.max(0, Math.min(99, Number(homepage.settings.offer_discount ?? ((bannerText.match(/(?:up\s*to\s*)?(\d{1,3})\s*%/i) || [])[1] || 90))));

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
            <button
              className="header-button"
              onClick={() => {
                if (user) {
                  setAccountOpen(true);
                } else {
                  setLoginOpen(true);
                }
              }}
            >
              <span>♙</span>
              <small>{user ? "My Account" : "Login"}</small>
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
          <button className="nav-link" onClick={() => { setCategory("All"); setSearch(""); setSort("new-arrival"); setPage(1); document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"}); }}>New Arrivals</button>
          <button className="nav-link" onClick={() => document.getElementById("best-selling")?.scrollIntoView({behavior:"smooth"})}>Best Selling</button>
          <button className="nav-link hot" onClick={() => { setCategory("All"); setSearch(""); setSort("discount"); setPage(1); document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"}); }}>Offers <em>HOT</em></button>
          <button className="nav-link" onClick={() => setNotice("Track Order is available from the Orders section.")}>Track Order</button>
          <button className="nav-link" onClick={() => window.location.href=`mailto:${homepage.settings.contact_email || "meeshoshoppinginfo@gmail.com"}`}>Contact Us</button>
        </nav>
      </header>

      {!filteredBrowse && homepage.settings.show_banner !== false && <section className="hero">
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
            {(homepage.settings.desktop_banner || homepage.settings.mobile_banner || homepage.settings.offer_image) ? (
              <picture>
                <source media="(max-width: 767px)" srcSet={homepage.settings.mobile_banner || homepage.settings.desktop_banner || homepage.settings.offer_image} />
                <img src={homepage.settings.desktop_banner || homepage.settings.offer_image || homepage.settings.mobile_banner} alt="Festival offer" />
              </picture>
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
      </section>}

      {!filteredBrowse && homepage.settings.show_trust_strip !== false && <section className="trust-strip">
        <div><span>🛡️</span><strong>100% Original Products</strong><small>Quality You Can Trust</small></div>
        <div><span>👥</span><strong>10 Million+ Trusted Customers</strong><small>Shopping with confidence</small></div>
        <div><span>↩️</span><strong>Easy Returns</strong><small>7 Days Return Policy</small></div>
        <div><span>🚚</span><strong>Fast Delivery</strong><small>Across India</small></div>
        <div><span>🔐</span><strong>Secure Payments</strong><small>UPI, Card, Netbanking</small></div>
      </section>}

      {offerOpen && (
        <div className="offer-overlay" onClick={() => setOfferOpen(false)}>
          <div className="offer-popup" onClick={(e) => e.stopPropagation()}>
            <button
              className="offer-close"
              onClick={() => {
                setOfferOpen(false);
                if (!user && !localStorage.getItem("meeshoo_login_prompt_seen")) {
                  setTimeout(() => {
                    if (!localStorage.getItem("meeshoo_user")) {
                      setLoginOpen(true);
                      localStorage.setItem("meeshoo_login_prompt_seen", "1");
                    }
                  }, 700);
                }
              }}
            >×</button>
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

      {!filteredBrowse && homepage.settings.show_categories !== false && <section className="home-section shop-categories-section" id="shop-categories">
        <div className="section-title">
          <h2>Shop By Categories</h2>
          <button className="text-link" onClick={() => document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"})}>View All →</button>
        </div>
        <div className="category-showcase-grid">
          {categories.filter((item) => item !== "All").map((item) => (
            <button key={`show-${item}`} className="category-tile" onClick={() => { selectCategory(item); document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"}); }}>
              <span>{({All:"🛍️",Women:"👗",Men:"👔",Electronics:"🎧",Beauty:"💄",Footwear:"👟",Home:"🛋️",Kitchen:"🍳",Accessories:"👜",Kids:"🧸",Sports:"⚽",Bags:"👜",Jewellery:"💎",Watches:"⌚"})[item] || "🛍️"}</span>
              <b>{item}</b>
            </button>
          ))}
        </div>
      </section>}

      {!filteredBrowse && homepage.settings.show_deals !== false && <section className="deals-section">
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
      </section>}

      {!filteredBrowse && homepage.settings.show_best_selling !== false && <section className="home-section slider-section" id="best-selling">
        <div className="section-title">
          <h2>{homepage.settings.best_selling_title || "🔥 Best Selling Products"}</h2>
          <span className="result-count">Swipe to explore</span>
        </div>
        <div className="product-slider" ref={bestSellingSliderRef}>
          {homeMixedProducts.map((product) => (
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
      </section>}

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
                onClick={() => selectCategory(item)}
              >
                <span className="category-icon">{({All:"🛍️",Women:"👗",Men:"👔",Electronics:"📱",Mobiles:"📱","Mobile Accessories":"📱",Laptops:"💻","Laptop Accessories":"💻",Beauty:"💄",Footwear:"👟",Home:"🏠",Kitchen:"🍳",Accessories:"👜",Kids:"🧸",Sports:"⚽",Bags:"👜",Jewellery:"💎",Watches:"⌚"})[item] || "🛍️"}</span> {item}
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
                        (selectedProduct.colors?.find((c) => c.name === selectedColor)?.images?.[selectedImage]) ||
                        (selectedProduct.colors?.find((c) => c.name === selectedColor)?.images?.[0]) ||
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
                    {(selectedProduct.colors?.find((c) => c.name === selectedColor)?.images?.length ? selectedProduct.colors.find((c) => c.name === selectedColor).images : (selectedProduct.images || []))
                      .slice(0, 8)
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

                  {getProductVariants(selectedProduct).map((group) => (
                    <div className="size-picker variant-picker" key={group.name}>
                      <div className="size-picker-title">{group.name}: <strong>{selectedVariants[group.name] || group.options[0]?.label}</strong></div>
                      <div className="size-options">
                        {group.options.map((option) => (
                          <button
                            key={`${group.name}-${option.label}`}
                            type="button"
                            className={`size-option ${selectedVariants[group.name] === option.label ? "active" : ""}`}
                            onClick={() => setSelectedVariants((current) => ({ ...current, [group.name]: option.label }))}
                          >
                            {option.label}
                            {option.price !== null && <small>{formatPrice(option.price)}</small>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0 && (
                    <div className="color-picker">
                      <div className="size-picker-title">Color: <strong>{selectedColor || selectedProduct.colors[0]?.name}</strong></div>
                      <div className="color-options">
                        {selectedProduct.colors.map((color) => (
                          <button key={color.name} type="button" className={`color-option ${selectedColor === color.name ? "active" : ""}`} onClick={() => { setSelectedColor(color.name); setSelectedImage(0); }}>
                            {color.images?.[0] ? <img src={color.images[0]} alt={color.name} /> : <span className="color-dot" style={{background: color.hex || "#ddd"}} />}
                            <span>{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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

                  <div className="detail-stock-top">
                    {(() => {
                      const sizeEntry = getProductSizes(selectedProduct).find((x) => String(x.size).toUpperCase() === selectedSize);
                      const colorEntry = selectedProduct.colors?.find((x) => String(x.name) === String(selectedColor));
                      const sizeStock = sizeEntry ? Number(sizeEntry.stock || 0) : Number(selectedProduct.stock || 0);
                      const colorStock = colorEntry ? Number(colorEntry.stock || 0) : Infinity;
                      const available = Math.min(sizeStock, colorStock);
                      return available > 0 ? `Available Stock: ${available}` : "Currently out of stock";
                    })()}
                  </div>

                  <div className="detail-buy detail-buy-top">
                    <button
                      className="primary buy-now-large"
                      disabled={
                        getProductSizes(selectedProduct).length > 0
                          ? !getProductSizes(selectedProduct).some((x) => String(x.size).toUpperCase() === selectedSize && Number(x.stock || 0) > 0)
                          : Number(selectedProduct.stock) <= 0
                      }
                      onClick={() => buyNow(selectedProduct, selectedSize, selectedColor, selectedVariants)}
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
                      onClick={() => addToCart(selectedProduct, selectedSize, selectedColor, selectedVariants)}
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
                      {formatPrice((selectedProduct.colors?.find((c) => c.name === selectedColor)?.price ?? getSizePrice(selectedProduct, selectedSize)))}
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

                  {(selectedProduct.specifications?.length > 0 || selectedProduct.manufacturer_info || selectedProduct.warranty) && (
                    <div className="detail-info-boxes">
                      {selectedProduct.specifications?.length > 0 && <section className="detail-box"><h3>Specifications</h3><div className="spec-grid">{selectedProduct.specifications.map((spec, index) => <div className="spec-row" key={`${spec.key}-${index}`}><strong>{spec.key}</strong><span>{spec.value}</span></div>)}</div></section>}
                      {selectedProduct.manufacturer_info && <section className="detail-box"><h3>Manufacturer Info</h3><p>{selectedProduct.manufacturer_info}</p></section>}
                      {selectedProduct.warranty && <section className="detail-box"><h3>Warranty</h3><p>{selectedProduct.warranty}</p></section>}
                    </div>
                  )}

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

              {suggestedProducts.length > 0 && (
                <section className="suggestions-section">
                  <div className="section-title"><h2>More from {selectedProduct.category}</h2><span className="result-count">Same category</span></div>
                  <div className="product-slider suggestion-slider">
                    {suggestedProducts.map((product) => (
                      <article className="mini-card" key={`suggest-${product.id}`} onClick={() => openProduct(product)}>
                        <img src={product.images?.[0] || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=85"} alt={product.name} />
                        <div className="mini-card-body"><strong>{product.name}</strong><span>★ {product.rating || 4.5}</span><b>{formatPrice(product.price)}</b></div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
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
                      key={item.cartKey || `${item.id}__${item.color || "NOCOLOR"}__${item.size || "NOSIZE"}__${getVariantSelectionKey(item.variants || {}) || "NOVARIANT"}`}
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
                        {item.color && <small className="cart-size">Color: {item.color}</small>}{item.size && <small className="cart-size">Size: {item.size}</small>}{Object.entries(item.variants || {}).map(([name, value]) => <small className="cart-size" key={`${item.cartKey}-${name}`}>{name}: {value}</small>)}

                        <div className="qty">
                          <button
                            onClick={() =>
                              changeQuantity(item.id, -1, item.size, item.color, item.variants)
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
                              changeQuantity(item.id, 1, item.size, item.color, item.variants)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        className="secondary"
                        onClick={() => removeFromCart(item.id, item.size, item.color, item.variants)}
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

      {accountOpen && user && (
        <Modal title="My Account" close={() => setAccountOpen(false)} small>
          <div className="premium-profile-card">
            <div className="profile-photo-wrap">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="profile-photo" />
              ) : (
                <div className="profile-photo-fallback">
                  {String(user.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <label className="profile-photo-edit" title="Change profile photo">
                ✎
                <input type="file" accept="image/*" onChange={handleProfilePhoto} hidden />
              </label>
            </div>
            <div className="profile-main">
              <div className="profile-name">{address.name || "Meeshoo Customer"}</div>
              <div className="profile-email">{user.email}</div>
              <span className="profile-badge">✓ Verified Account</span>
            </div>
          </div>

          <div className="account-section-title">
            <span>👤</span>
            <div><strong>Personal Details</strong><small>Edit your account information</small></div>
          </div>

          <div className="field">
            <label>Email Address</label>
            <input type="email" value={user.email || ""} readOnly className="readonly-input" />
            <button type="button" className="account-edit-link" onClick={changeEmailFromAccount}>
              Change email with OTP →
            </button>
          </div>

          {[
            ["name", "Full Name", "Full name"],
            ["phone", "Mobile Number", "10-digit mobile number"],
            ["line1", "Address", "House number, street, area"],
            ["city", "City", "City"],
            ["state", "State", "State"],
            ["pincode", "PIN Code", "6-digit PIN code"],
          ].map(([name, label, placeholder]) => (
            <div className="field" key={name}>
              <label>{label}</label>
              <input
                name={name}
                value={address[name] || ""}
                onChange={updateAddress}
                placeholder={placeholder}
                maxLength={name === "phone" ? 10 : name === "pincode" ? 6 : undefined}
                inputMode={name === "phone" || name === "pincode" ? "numeric" : undefined}
              />
            </div>
          ))}

          <button
            className="primary full account-save-button"
            type="button"
            onClick={() => {
              try {
                localStorage.setItem("meeshoo_profile", JSON.stringify({ ...address, photo: profilePhoto }));
              } catch {}
              setAccountOpen(false);
              notify("Profile details saved successfully.");
            }}
          >
            Save Profile
          </button>

          <button
            type="button"
            className="text-link"
            onClick={() => {
              localStorage.removeItem("meeshoo_user");
              setUser(null);
              setAccountOpen(false);
              setLoginOpen(true);
              setOtpStep(false);
              setOtp("");
              setEmail("");
              notify("You have been logged out.");
            }}
          >
            Logout
          </button>
        </Modal>
      )}

      {loginOpen && (
        <Modal title={otpStep ? "Verify Email OTP" : "Continue with Email"} close={() => { setLoginOpen(false); setOtpStep(false); }} small>
          {!otpStep ? (
            <form onSubmit={loginWithEmail}>
              <div className="field"><label>Email Address</label><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" /></div>
              <button className="primary full" type="submit">Send OTP</button>
              <p className="login-helper">A one-time verification code will be sent to your email.</p>
            </form>
          ) : (
            <form onSubmit={verifyEmailOtp}>
              <div className="login-info">OTP sent to <strong>{email}</strong></div>
              <div className="field"><label>6-digit OTP</label><input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(e)=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="Enter OTP" required autoComplete="one-time-code" /></div>
              <button className="primary full" type="submit">Verify & Login</button>
              <button type="button" className="text-link" onClick={()=>{setOtpStep(false);setOtp("");}}>Change email</button>
            </form>
          )}
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
    offer_discount: 90,
    offer_text: "Special offers are waiting for you.",
    offer_button: "Shop Now",
    offer_image: "",
    desktop_banner: "",
    mobile_banner: "",
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

  async function handleHomepageImageFile(event, target) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setFormLoading(true);
      const compressed = await compressProductImage(file);
      setHomepageAdmin((current) => ({ ...current, [target]: compressed }));
      notify("Banner image selected. Click Save Homepage to publish it.");
    } catch (err) {
      notify(err.message || "Unable to process banner image.");
    } finally {
      setFormLoading(false);
      event.target.value = "";
    }
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

  function updateColor(index, field, value) {
    setProductForm((current) => {
      const colors = [...(current.colors || [])];
      colors[index] = { ...colors[index], [field]: value };
      return { ...current, colors };
    });
  }

  async function handleColorImageFiles(index, event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      setFormLoading(true);
      const uploaded = [];
      for (const file of files) uploaded.push(await compressProductImage(file));
      setProductForm((current) => {
        const colors = [...(current.colors || [])];
        colors[index] = { ...colors[index], images: [...(colors[index]?.images || []), ...uploaded] };
        return { ...current, colors };
      });
      notify(`${uploaded.length} color image${uploaded.length === 1 ? "" : "s"} added.`);
    } catch (err) {
      notify(err.message || "Unable to upload color images.");
    } finally {
      setFormLoading(false);
      event.target.value = "";
    }
  }

  function removeColor(index) {
    setProductForm((current) => ({ ...current, colors: (current.colors || []).filter((_, i) => i !== index) }));
  }

  function addColor() {
    setProductForm((current) => ({ ...current, colors: [...(current.colors || []), { name: "", hex: "#ffffff", price: "", stock: 0, images: [] }] }));
  }

  function updateVariantGroup(index, field, value) {
    setProductForm((current) => {
      const variants = [...(current.variants || [])];
      variants[index] = { ...variants[index], [field]: value };
      return { ...current, variants };
    });
  }

  function updateVariantOption(groupIndex, optionIndex, value) {
    setProductForm((current) => {
      const variants = [...(current.variants || [])];
      const group = { ...(variants[groupIndex] || {}), options: [...(variants[groupIndex]?.options || [])] };
      group.options[optionIndex] = { ...(group.options[optionIndex] || {}), label: value };
      variants[groupIndex] = group;
      return { ...current, variants };
    });
  }

  function updateVariantOptionPrice(groupIndex, optionIndex, value) {
    setProductForm((current) => {
      const variants = [...(current.variants || [])];
      const group = { ...(variants[groupIndex] || {}), options: [...(variants[groupIndex]?.options || [])] };
      group.options[optionIndex] = { ...(group.options[optionIndex] || {}), price: value };
      variants[groupIndex] = group;
      return { ...current, variants };
    });
  }

  function addVariantGroup() {
    setProductForm((current) => ({ ...current, variants: [...(current.variants || []), { name: "", options: [{ label: "" }] }] }));
  }

  function addVariantOption(groupIndex) {
    setProductForm((current) => {
      const variants = [...(current.variants || [])];
      const group = { ...(variants[groupIndex] || {}), options: [...(variants[groupIndex]?.options || []), { label: "" }] };
      variants[groupIndex] = group;
      return { ...current, variants };
    });
  }

  function removeVariantOption(groupIndex, optionIndex) {
    setProductForm((current) => {
      const variants = [...(current.variants || [])];
      const group = { ...(variants[groupIndex] || {}), options: (variants[groupIndex]?.options || []).filter((_, i) => i !== optionIndex) };
      variants[groupIndex] = group;
      return { ...current, variants };
    });
  }

  function removeVariantGroup(groupIndex) {
    setProductForm((current) => ({ ...current, variants: (current.variants || []).filter((_, i) => i !== groupIndex) }));
  }

  function updateSpecification(index, field, value) {
    setProductForm((current) => {
      const specifications = [...(current.specifications || [])];
      specifications[index] = { ...specifications[index], [field]: value };
      return { ...current, specifications };
    });
  }

  function addSpecification() {
    setProductForm((current) => ({ ...current, specifications: [...(current.specifications || []), { key: "", value: "" }] }));
  }

  function removeSpecification(index) {
    setProductForm((current) => ({ ...current, specifications: (current.specifications || []).filter((_, i) => i !== index) }));
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

      slug:
        product.slug ||
        "",

      category:
        product.category ||
        "",

      gender:
        product.gender ||
        "",

      subcategory:
        product.subcategory ||
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
      colors: Array.isArray(product.colors) ? product.colors : [],
      variants: Array.isArray(product.variants) ? product.variants : [],
      specifications: Array.isArray(product.specifications) ? product.specifications : [],
      manufacturer_info: product.manufacturer_info || "",
      warranty: product.warranty || "",

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

        variants: (productForm.variants || []).map((group) => ({
          name: String(group.name || "").trim(),
          options: (group.options || []).map((option) => ({
            label: String(option.label || "").trim(),
            price: option.price === "" || option.price === null || option.price === undefined ? null : Number(option.price),
          })).filter((option) => option.label),
        })).filter((group) => group.name && group.options.length),

        colors: (productForm.colors || []).map((entry) => ({
          name: String(entry.name || "").trim(),
          hex: String(entry.hex || "").trim(),
          price: entry.price === "" || entry.price === null || entry.price === undefined ? null : Number(entry.price),
          stock: Number(entry.stock || 0),
          images: Array.isArray(entry.images) ? entry.images.filter(Boolean) : [],
        })).filter((entry) => entry.name),
        specifications: (productForm.specifications || []).map((entry) => ({
          key: String(entry.key || "").trim(), value: String(entry.value || "").trim()
        })).filter((entry) => entry.key && entry.value),
        manufacturer_info: String(productForm.manufacturer_info || "").trim(),
        warranty: String(productForm.warranty || "").trim(),

        sizes: (productForm.sizes || [])
          .map((entry) => ({
            size: String(entry.size || "").trim().toUpperCase(),
            stock: Number(entry.stock || 0),
            price: entry.price === "" || entry.price === null || entry.price === undefined ? null : Number(entry.price),
          }))
          .filter((entry) => entry.size),

        gender: String(productForm.gender || "").trim(),
        subcategory: String(productForm.subcategory || "").trim(),

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
                      label="Product URL / Slug"
                      name="slug"
                      value={productForm.slug || ""}
                      onChange={updateProductForm}
                      placeholder="iphone-15-pro"
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
                      placeholder="Footwear, Electronics, Mobiles..."
                      required
                    />

                    <div className="field">
                      <label>Gender / Audience</label>
                      <select name="gender" value={productForm.gender || ""} onChange={updateProductForm}>
                        <option value="">All / Unisex</option>
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                        <option value="Kids">Kids</option>
                      </select>
                    </div>

                    <AdminField
                      label="Subcategory"
                      name="subcategory"
                      value={productForm.subcategory || ""}
                      onChange={updateProductForm}
                      placeholder="Shoes, Slippers, T-Shirt, Jeans, Watch..."
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

                  <div className="field">
                    <label>Product Variants (RAM / ROM / Storage / Model)</label>
                    <p className="muted">Ek product me RAM, ROM, Storage, Model ya koi bhi variant group banao. Customer ko product page ke upar box me options milenge.</p>
                    {(productForm.variants || []).map((group, groupIndex) => (
                      <div className="color-admin-card" key={groupIndex}>
                        <div className="form-grid">
                          <input value={group.name || ""} onChange={(e) => updateVariantGroup(groupIndex, "name", e.target.value)} placeholder="Variant name e.g. RAM / ROM / Storage" />
                          <button type="button" className="danger" onClick={() => removeVariantGroup(groupIndex)}>Remove Variant Group</button>
                        </div>
                        {(group.options || []).map((option, optionIndex) => (
                          <div className="size-admin-row" key={optionIndex}>
                            <input value={option.label || ""} onChange={(e) => updateVariantOption(groupIndex, optionIndex, e.target.value)} placeholder="Option e.g. 8 GB / 512 GB / 1 TB" />
                            <input type="number" min="0" step="0.01" value={option.price ?? ""} onChange={(e) => updateVariantOptionPrice(groupIndex, optionIndex, e.target.value)} placeholder="Price (optional)" />
                            <button type="button" className="danger" onClick={() => removeVariantOption(groupIndex, optionIndex)}>Remove</button>
                          </div>
                        ))}
                        <button type="button" className="secondary" onClick={() => addVariantOption(groupIndex)}>+ Add Option</button>
                      </div>
                    ))}
                    <button type="button" className="secondary" onClick={addVariantGroup}>+ Add Variant Group</button>
                  </div>

                  <div className="field">
                    <label>Color Variants (Flipkart-style)</label>
                    <p className="muted">Ek hi product me multiple colors add karo. Har color ke liye naam, stock, optional price aur photos de sakte ho.</p>
                    {(productForm.colors || []).map((color, index) => (
                      <div className="color-admin-card" key={index}>
                        <div className="form-grid">
                          <input value={color.name || ""} onChange={(e) => updateColor(index, "name", e.target.value)} placeholder="Color name e.g. Black" />
                          <input value={color.hex || "#ffffff"} onChange={(e) => updateColor(index, "hex", e.target.value)} placeholder="#000000" />
                          <input type="number" min="0" value={color.stock ?? 0} onChange={(e) => updateColor(index, "stock", e.target.value)} placeholder="Color stock" />
                          <input type="number" min="0" step="0.01" value={color.price ?? ""} onChange={(e) => updateColor(index, "price", e.target.value)} placeholder="Color price (optional)" />
                        </div>
                        <input type="file" accept="image/*" multiple onChange={(e) => handleColorImageFiles(index, e)} disabled={formLoading} />
                        {color.images?.length > 0 && <div className="product-upload-preview">{color.images.map((image, imageIndex) => <div className="upload-preview-card" key={`${index}-${imageIndex}`}><img src={image} alt={color.name} /><button type="button" className="danger" onClick={() => updateColor(index, "images", color.images.filter((_, i) => i !== imageIndex))}>Remove</button></div>)}</div>}
                        <button type="button" className="danger" onClick={() => removeColor(index)}>Remove Color</button>
                      </div>
                    ))}
                    <button type="button" className="secondary" onClick={addColor}>+ Add Color</button>
                  </div>

                  <div className="field">
                    <label>Specifications</label>
                    {(productForm.specifications || []).map((spec, index) => (
                      <div className="spec-admin-row" key={index}>
                        <input value={spec.key || ""} onChange={(e) => updateSpecification(index, "key", e.target.value)} placeholder="Specification e.g. Material" />
                        <input value={spec.value || ""} onChange={(e) => updateSpecification(index, "value", e.target.value)} placeholder="Value e.g. Cotton" />
                        <button type="button" className="danger" onClick={() => removeSpecification(index)}>Remove</button>
                      </div>
                    ))}
                    <button type="button" className="secondary" onClick={addSpecification}>+ Add Specification</button>
                  </div>

                  <div className="form-grid">
                    <div className="field"><label>Manufacturer Info</label><textarea rows="4" name="manufacturer_info" value={productForm.manufacturer_info || ""} onChange={updateProductForm} placeholder="Manufacturer, address, country, brand info..." /></div>
                    <div className="field"><label>Warranty</label><textarea rows="4" name="warranty" value={productForm.warranty || ""} onChange={updateProductForm} placeholder="Warranty period and terms..." /></div>
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
                                    <div key={idx}>{item.name}{item.size ? ` · ${item.size}` : ""}{item.color ? ` · ${item.color}` : ""}{Object.entries(item.variants || {}).map(([name, value]) => ` · ${name}: ${value}`).join("")} × {item.quantity} — {formatPrice(item.line_total ?? Number(item.price || 0) * Number(item.quantity || 0))}</div>
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
                <div className="form-grid"><AdminField label="Offer Discount %" type="number" value={homepageAdmin.offer_discount ?? 90} onChange={(e)=>setHomepageAdmin(v=>({...v,offer_discount:Math.max(0,Math.min(99,Number(e.target.value)||0))}))} /><div className="field"><label>Popup Offer Image — Direct Photo Upload</label><input type="file" accept="image/*" onChange={(e)=>handleHomepageImageFile(e,"offer_image")} disabled={formLoading}/>{homepageAdmin.offer_image && <img className="admin-banner-preview" src={homepageAdmin.offer_image} alt="Offer popup preview"/>}</div></div>
                <div className="banner-upload-grid">
                  <div className="field"><label>Desktop Banner — Direct Photo Upload</label><input type="file" accept="image/*" onChange={(e)=>handleHomepageImageFile(e,"desktop_banner")} disabled={formLoading}/><small className="muted">Computer/Desktop banner photo. URL की जरूरत नहीं।</small>{homepageAdmin.desktop_banner && <img className="admin-banner-preview" src={homepageAdmin.desktop_banner} alt="Desktop banner preview"/>}</div>
                  <div className="field"><label>Mobile Banner — Direct Photo Upload</label><input type="file" accept="image/*" onChange={(e)=>handleHomepageImageFile(e,"mobile_banner")} disabled={formLoading}/><small className="muted">Phone/mobile banner photo. URL की जरूरत नहीं।</small>{homepageAdmin.mobile_banner && <img className="admin-banner-preview mobile" src={homepageAdmin.mobile_banner} alt="Mobile banner preview"/>}</div>
                </div>
                <div className="admin-control-grid">
                  <label className="checkbox-row"><input type="checkbox" checked={homepageAdmin.show_banner !== false} onChange={(e)=>setHomepageAdmin(v=>({...v,show_banner:e.target.checked}))}/> Show big homepage banner</label>
                  <button type="button" className="danger" onClick={()=>setHomepageAdmin(v=>({...v,desktop_banner:"",mobile_banner:"",offer_image:""}))}>Remove Banner Images</button>
                </div>
                <div className="section-divider"><strong>Homepage Sections</strong></div>
                <div className="admin-control-grid">
                  <label className="checkbox-row"><input type="checkbox" checked={homepageAdmin.show_categories !== false} onChange={(e)=>setHomepageAdmin(v=>({...v,show_categories:e.target.checked}))}/> Shop By Categories</label>
                  <label className="checkbox-row"><input type="checkbox" checked={homepageAdmin.show_deals !== false} onChange={(e)=>setHomepageAdmin(v=>({...v,show_deals:e.target.checked}))}/> Deals of the Day</label>
                  <label className="checkbox-row"><input type="checkbox" checked={homepageAdmin.show_best_selling !== false} onChange={(e)=>setHomepageAdmin(v=>({...v,show_best_selling:e.target.checked}))}/> Best Selling Products</label>
                  <label className="checkbox-row"><input type="checkbox" checked={homepageAdmin.show_trust_strip !== false} onChange={(e)=>setHomepageAdmin(v=>({...v,show_trust_strip:e.target.checked}))}/> Trust / Benefits Strip</label>
                </div>
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
    slug: "",
    category: "",
    gender: "",
    subcategory: "",
    price: "",
    mrp: "",
    stock: 0,
    sizes: [],
    colors: [],
    variants: [],
    specifications: [],
    manufacturer_info: "",
    warranty: "",
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
/* =========================================================
   MEESHOOSHOPPING V5 — COMPLETE STOREFRONT REDESIGN
   Logic/API untouched. This block is the customer visual system.
   ========================================================= */

*{box-sizing:border-box}
:root{
  --v5-ink:#15151b;
  --v5-muted:#73737f;
  --v5-line:#e9e7ee;
  --v5-surface:#fff;
  --v5-bg:#f7f5f2;
  --v5-purple:#6d28d9;
  --v5-purple2:#8b5cf6;
  --v5-pink:#e11d74;
  --v5-orange:#f97316;
  --v5-green:#169447;
  --v5-shadow:0 10px 30px rgba(30,20,50,.07);
  --v5-shadow2:0 22px 55px rgba(30,20,50,.13);
}
.store{
  min-height:100vh;
  color:var(--v5-ink);
  background:
    radial-gradient(circle at 0 0,rgba(139,92,246,.07),transparent 24rem),
    linear-gradient(180deg,#fff 0,#f8f6f3 42%,#f7f5f2 100%);
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
}
.store button,.store input,.store select,.store textarea{font:inherit}
.store button{cursor:pointer}
.store img{max-width:100%}

/* ---------- SALE STRIP ---------- */
.topbar{
  min-height:38px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:8px 14px;
  background:#17131d;
  color:#fff;
  font-size:12px;
  font-weight:800;
  letter-spacing:.15px;
}
.topbar strong{color:#ffd66b}
.topbar-button{
  margin-left:8px;
  border:0;
  border-radius:999px;
  padding:5px 12px;
  color:#17131d;
  background:#fff;
  font-size:11px;
  font-weight:900;
}

/* ---------- HEADER ---------- */
.header{
  position:sticky;
  top:0;
  z-index:60;
  background:rgba(255,255,255,.94);
  border-bottom:1px solid rgba(226,223,232,.9);
  box-shadow:0 4px 20px rgba(31,20,48,.045);
  backdrop-filter:blur(20px);
}
.header-inner{
  width:min(1440px,100%);
  min-height:78px;
  margin:auto;
  padding:13px 24px;
  display:grid;
  grid-template-columns:auto minmax(280px,1fr) auto;
  align-items:center;
  gap:24px;
}
.logo{
  display:flex;
  align-items:center;
  gap:9px;
  border:0;
  background:none;
  color:var(--v5-ink);
  padding:0;
  font-size:20px;
  line-height:1;
  font-weight:950;
  letter-spacing:-.8px;
}
.logo-mark{
  width:43px;height:43px;border-radius:14px;
  display:grid;place-items:center;
  color:#fff;
  background:linear-gradient(135deg,var(--v5-purple),var(--v5-pink));
  box-shadow:0 8px 20px rgba(109,40,217,.22);
  font-size:22px;
}
.logo small{
  display:block;
  margin-top:4px;
  color:var(--v5-muted);
  font-size:8px;
  letter-spacing:2px;
  font-weight:900;
}
.india-mark{font-size:16px}
.search{
  position:relative;
  width:100%;
}
.search input{
  width:100%;
  height:50px;
  padding:0 52px 0 20px;
  border:1px solid #ddd9e5;
  border-radius:16px;
  outline:0;
  background:#f8f7fa;
  color:var(--v5-ink);
  transition:.2s ease;
}
.search input::placeholder{color:#9b99a5}
.search input:focus{
  background:#fff;
  border-color:#a78bfa;
  box-shadow:0 0 0 4px rgba(139,92,246,.10);
}
.search-icon{
  position:absolute;
  right:17px;
  top:50%;
  transform:translateY(-50%);
  color:var(--v5-purple);
  font-size:24px;
  pointer-events:none;
}
.header-actions{display:flex;gap:8px}
.header-button{
  min-width:74px;
  min-height:48px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
  border:1px solid #e6e2eb;
  border-radius:14px;
  background:#fff;
  color:#34313b;
  padding:6px 11px;
  transition:.18s ease;
}
.header-button span{font-size:20px;line-height:1}
.header-button small{font-size:10px;font-weight:850}
.header-button b{color:var(--v5-pink)}
.header-button:hover{
  transform:translateY(-1px);
  border-color:#c4b5fd;
  box-shadow:var(--v5-shadow);
  color:var(--v5-purple);
}

/* ---------- NAVIGATION ---------- */
.main-nav{
  width:min(1440px,100%);
  margin:auto;
  padding:0 24px 11px;
  display:flex;
  align-items:center;
  gap:7px;
  overflow-x:auto;
  scrollbar-width:none;
}
.main-nav::-webkit-scrollbar{display:none}
.all-categories,.nav-link{
  flex:0 0 auto;
  height:36px;
  border:0;
  border-radius:10px;
  background:transparent;
  color:#686571;
  padding:0 13px;
  font-size:12px;
  font-weight:900;
}
.all-categories{
  color:#fff;
  background:var(--v5-ink);
}
.nav-link:hover,.nav-link.active{
  color:var(--v5-purple);
  background:#f1ecff;
}
.nav-link.hot{color:#c2410c}
.nav-link em{
  margin-left:4px;
  border-radius:999px;
  padding:2px 5px;
  color:#fff;
  background:var(--v5-orange);
  font-style:normal;
  font-size:8px;
}

/* ---------- HERO ---------- */
.hero{
  width:min(1440px,100%);
  margin:auto;
  padding:22px 24px 8px;
}
.hero-card{
  min-height:390px;
  position:relative;
  overflow:hidden;
  display:grid;
  grid-template-columns:minmax(0,1.05fr) minmax(280px,.95fr);
  align-items:center;
  border-radius:30px;
  padding:50px 58px;
  color:#fff;
  background:
    radial-gradient(circle at 80% 20%,rgba(255,255,255,.18),transparent 20%),
    radial-gradient(circle at 72% 92%,rgba(225,29,116,.28),transparent 28%),
    linear-gradient(118deg,#21102e 0%,#4c1d72 43%,#7027a8 100%);
  box-shadow:0 25px 70px rgba(61,25,87,.22);
}
.hero-card::after{
  content:"";
  position:absolute;
  width:430px;height:430px;
  right:-110px;bottom:-230px;
  border:70px solid rgba(255,255,255,.07);
  border-radius:50%;
}
.hero-copy{position:relative;z-index:2;max-width:690px}
.hero-kicker{
  display:inline-flex;
  margin-bottom:14px;
  padding:7px 11px;
  border:1px solid rgba(255,255,255,.25);
  border-radius:999px;
  background:rgba(255,255,255,.10);
  color:#ffe4f1;
  font-size:10px;
  font-weight:950;
  letter-spacing:1.6px;
}
.hero-card h1{
  max-width:720px;
  margin:0 0 15px;
  font-size:clamp(38px,5.5vw,68px);
  line-height:.94;
  letter-spacing:-3.5px;
}
.hero-card p{
  max-width:620px;
  margin:0 0 25px;
  color:#eee4f7;
  line-height:1.7;
  font-size:16px;
}
.hero-button{
  border:0;
  border-radius:13px;
  padding:14px 22px;
  background:#fff;
  color:#3f1660;
  font-weight:950;
  box-shadow:0 12px 28px rgba(0,0,0,.18);
  transition:.18s ease;
}
.hero-button:hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(0,0,0,.23)}
.hero-art{
  min-height:270px;
  position:relative;
  display:grid;
  place-items:center;
  z-index:2;
}
.hero-art picture,.hero-art img{
  width:100%;
  height:100%;
  display:block;
}
.hero-art img{
  max-height:310px;
  object-fit:contain;
  border-radius:22px;
}
.hero-discount{
  width:205px;height:205px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  border:12px solid rgba(255,255,255,.85);
  border-radius:50%;
  background:linear-gradient(145deg,#ffb703,#f97316);
  box-shadow:0 22px 50px rgba(0,0,0,.2);
  transform:rotate(-8deg);
}
.hero-discount small{font-size:13px;font-weight:950;letter-spacing:2px}
.hero-discount strong{font-size:70px;line-height:.85;font-weight:1000;letter-spacing:-5px}
.hero-discount b{font-size:18px;letter-spacing:2px}
.hero-spark{position:absolute;top:8%;right:12%;font-size:32px;color:#ffd66b}
.hero-diya{position:absolute;left:8%;bottom:4%;font-size:48px}
.hero-gift{position:absolute;right:4%;bottom:5%;font-size:48px}

/* ---------- TRUST STRIP ---------- */
.trust-strip{
  width:min(1440px,100%);
  margin:16px auto 0;
  padding:0 24px;
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:10px;
}
.trust-strip>div{
  min-height:76px;
  display:grid;
  grid-template-columns:34px 1fr;
  grid-template-rows:auto auto;
  column-gap:9px;
  align-items:center;
  padding:12px 15px;
  border:1px solid #e7e3eb;
  border-radius:16px;
  background:#fff;
}
.trust-strip span{grid-row:1/3;font-size:22px}
.trust-strip strong{font-size:11px}
.trust-strip small{color:var(--v5-muted);font-size:9px;font-weight:700}

/* ---------- HOME SECTIONS ---------- */
.home-section,.deals-section,.slider-section{
  width:min(1440px,100%);
  margin:auto;
  padding:30px 24px 0;
}
.section-title{
  display:flex;
  align-items:end;
  justify-content:space-between;
  gap:16px;
  margin-bottom:15px;
}
.section-title h2{
  margin:0;
  font-size:27px;
  letter-spacing:-1.2px;
}
.section-subtitle{margin:5px 0 0;color:var(--v5-muted);font-size:12px;font-weight:700}
.text-link,.view-all-button{
  border:0;background:none;color:var(--v5-purple);
  font-size:12px;font-weight:950;padding:8px 0;
}

/* ---------- CATEGORY SHOWCASE ---------- */
.category-showcase-grid{
  display:flex;
  gap:12px;
  overflow-x:auto;
  padding:3px 2px 12px;
  scrollbar-width:none;
}
.category-showcase-grid::-webkit-scrollbar{display:none}
.category-tile{
  flex:0 0 128px;
  min-height:126px;
  border:1px solid #e6e1ed;
  border-radius:20px;
  background:#fff;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:9px;
  color:var(--v5-ink);
  box-shadow:0 5px 17px rgba(30,20,50,.045);
  transition:.2s ease;
}
.category-tile>span:first-child{
  width:55px;height:55px;
  display:grid;place-items:center;
  border-radius:17px;
  background:linear-gradient(145deg,#f2ecff,#fff1f7);
  font-size:28px;
}
.category-tile b{font-size:12px}
.category-tile:hover,.category-tile.active{
  transform:translateY(-4px);
  border-color:#c4b5fd;
  box-shadow:0 15px 30px rgba(109,40,217,.12);
}
.category-showcase-grid .category-tile:nth-child(3n) span:first-child{background:#fff1e9}

/* ---------- DEALS ---------- */
.deals-grid{
  display:flex;
  gap:14px;
  overflow-x:auto;
  padding:3px 2px 12px;
  scrollbar-width:none;
}
.deals-grid::-webkit-scrollbar{display:none}
.deal-card{
  flex:0 0 225px;
  overflow:hidden;
  border:1px solid #e7e2ea;
  border-radius:19px;
  background:#fff;
  box-shadow:var(--v5-shadow);
  cursor:pointer;
  transition:.2s ease;
}
.deal-card:hover{transform:translateY(-4px);box-shadow:var(--v5-shadow2)}
.deal-image{height:180px;background:#f3f1f4}
.deal-image img{width:100%;height:100%;object-fit:cover}
.deal-body{padding:13px}
.deal-body strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}
.deal-body b{display:block;margin-top:8px;font-size:18px}
.deal-timer{
  color:#c2410c;
  background:#fff1e8;
  border-radius:999px;
  padding:7px 10px;
  font-size:10px;
  font-weight:900;
}

/* ---------- PRODUCT SLIDER ---------- */
.product-slider{
  display:flex;
  gap:14px;
  overflow-x:auto;
  padding:2px 2px 14px;
  scrollbar-width:none;
}
.product-slider::-webkit-scrollbar{display:none}
.mini-card{
  flex:0 0 205px;
  overflow:hidden;
  border:1px solid #e7e2ea;
  border-radius:18px;
  background:#fff;
  box-shadow:var(--v5-shadow);
  cursor:pointer;
  transition:.2s ease;
}
.mini-card:hover{transform:translateY(-3px)}
.mini-card>img{width:100%;height:190px;object-fit:cover;background:#f2f0f2}
.mini-card-body{padding:12px}
.mini-card-body strong{
  display:block;height:36px;overflow:hidden;
  font-size:12px;line-height:1.45;
}
.mini-card-body span{display:block;margin:7px 0;color:#b45309;font-size:10px;font-weight:900}
.mini-card-body b{font-size:18px}

/* ---------- CATALOG ---------- */
.content{
  width:min(1440px,100%);
  margin:auto;
  padding:34px 24px 65px;
}
.content>.section-title{margin-bottom:14px}
.categories{
  display:flex;
  gap:8px;
  overflow-x:auto;
  padding:2px 2px 14px;
  scrollbar-width:none;
}
.categories::-webkit-scrollbar{display:none}
.category{
  flex:0 0 auto;
  display:inline-flex;
  align-items:center;
  gap:6px;
  height:40px;
  padding:0 14px;
  border:1px solid #e5e1e9;
  border-radius:12px;
  background:#fff;
  color:#4e4a55;
  font-size:11px;
  font-weight:900;
  box-shadow:0 3px 10px rgba(30,20,50,.035);
}
.category-icon{font-size:16px}
.category:hover{border-color:#c4b5fd;color:var(--v5-purple)}
.category.active{
  color:#fff;
  border-color:transparent;
  background:linear-gradient(135deg,var(--v5-purple),var(--v5-pink));
  box-shadow:0 9px 22px rgba(109,40,217,.20);
}
.toolbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin:5px 0 18px;
}
.result-count{color:var(--v5-muted);font-size:12px;font-weight:800}
.sort{
  height:40px;
  border:1px solid #ddd8e3;
  border-radius:11px;
  padding:0 12px;
  background:#fff;
  color:#37333e;
  font-size:12px;
  font-weight:800;
  outline:0;
}

/* ---------- PRODUCT GRID/CARDS ---------- */
.grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:18px;
}
.card{
  position:relative;
  overflow:hidden;
  border:1px solid #e6e2e9;
  border-radius:20px;
  background:#fff;
  box-shadow:0 6px 22px rgba(30,20,50,.055);
  transition:.22s ease;
}
.card:hover{
  transform:translateY(-5px);
  border-color:#d5c8ec;
  box-shadow:0 20px 45px rgba(30,20,50,.12);
}
.image-wrap{
  position:relative;
  aspect-ratio:1/1.05;
  overflow:hidden;
  background:#f2f0f2;
}
.image-wrap img{
  width:100%;height:100%;display:block;object-fit:cover;
  transition:transform .45s ease;
}
.card:hover .image-wrap img{transform:scale(1.055)}
.discount{
  position:absolute;left:10px;top:10px;
  padding:6px 8px;
  border-radius:8px;
  color:#fff;
  background:#159447;
  font-size:10px;font-weight:950;
}
.heart{
  position:absolute;right:10px;top:10px;
  width:37px;height:37px;
  display:grid;place-items:center;
  border:1px solid rgba(255,255,255,.75);
  border-radius:50%;
  background:rgba(255,255,255,.93);
  color:#4d4854;
  font-size:20px;
  box-shadow:0 7px 17px rgba(0,0,0,.10);
}
.heart:hover{color:var(--v5-pink);transform:scale(1.06)}
.card-body{padding:14px}
.category-label{
  color:var(--v5-purple);
  font-size:9px;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:1px;
}
.product-name{
  min-height:43px;
  margin:7px 0;
  color:#222029;
  font-size:14px;
  line-height:1.45;
  font-weight:850;
}
.rating{margin-bottom:8px;color:#b45309;font-size:11px;font-weight:900}
.price-line{display:flex;align-items:baseline;gap:7px;margin-bottom:9px}
.price{font-size:21px;font-weight:1000;letter-spacing:-.5px}
.mrp{color:#a19da8;font-size:12px;text-decoration:line-through}
.card .discount+.heart{}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.primary,.secondary{
  min-height:40px;
  border-radius:11px;
  font-size:11px;
  font-weight:950;
}
.primary{
  border:0;
  color:#fff;
  background:linear-gradient(135deg,var(--v5-purple),var(--v5-pink));
  box-shadow:0 7px 17px rgba(109,40,217,.16);
}
.secondary{
  border:1px solid #ded9e5;
  color:#49444f;
  background:#fff;
}
.primary:hover{filter:brightness(1.04);transform:translateY(-1px)}
.secondary:hover{border-color:#c4b5fd;color:var(--v5-purple)}

/* ---------- EMPTY / NOTICE / FOOTER ---------- */
.empty{
  padding:58px 20px;
  border:1px dashed #cbc5d4;
  border-radius:20px;
  background:#fff;
  text-align:center;
  color:var(--v5-muted);
}
.notice{
  position:fixed;
  left:50%;bottom:22px;
  z-index:300;
  transform:translateX(-50%);
  max-width:calc(100% - 24px);
  padding:12px 18px;
  border-radius:999px;
  background:#17131d;
  color:#fff;
  box-shadow:0 16px 38px rgba(0,0,0,.22);
  font-size:12px;font-weight:850;
  text-align:center;
}
.footer{
  margin-top:20px;
  padding:48px 24px;
  background:#17131d;
  color:#c9c4cf;
}
.footer-inner{
  width:min(1440px,100%);
  margin:auto;
  display:flex;
  justify-content:space-between;
  gap:35px;
  flex-wrap:wrap;
}
.footer strong{color:#fff;font-size:21px}
.footer a,.footer button{color:#d8b4fe}

/* ---------- OFFER POPUP ---------- */
.offer-overlay{
  position:fixed;inset:0;z-index:250;
  display:grid;place-items:center;
  padding:18px;
  background:rgba(20,14,27,.66);
  backdrop-filter:blur(8px);
}
.offer-popup{
  position:relative;
  width:min(540px,100%);
  overflow:hidden;
  border-radius:26px;
  background:#fff;
  box-shadow:0 30px 90px rgba(0,0,0,.28);
}
.offer-popup>img{width:100%;max-height:280px;object-fit:cover}
.offer-body{padding:23px}
.offer-badge{
  display:inline-block;
  padding:6px 9px;
  border-radius:999px;
  background:#f4edff;
  color:var(--v5-purple);
  font-size:9px;font-weight:950;letter-spacing:1px;
}
.offer-body h2{margin:11px 0 7px;font-size:26px;letter-spacing:-1px}
.offer-body p{margin:0 0 18px;color:var(--v5-muted);line-height:1.6;font-size:13px}
.offer-close{
  position:absolute;right:12px;top:12px;
  width:36px;height:36px;
  border:0;border-radius:50%;
  background:rgba(255,255,255,.94);
  font-size:23px;
  box-shadow:0 5px 15px rgba(0,0,0,.12);
}

/* ---------- PRODUCT DETAIL ---------- */
.detail{
  width:min(1200px,100%);
  margin:auto;
  padding:30px 24px 60px;
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:32px;
}
.gallery-main{
  overflow:hidden;
  border:1px solid #e5e0e9;
  border-radius:24px;
  background:#f2f0f2;
}
.gallery-main img{width:100%;aspect-ratio:1;object-fit:cover;display:block}
.thumbnails{display:flex;gap:9px;overflow-x:auto;padding:10px 0}
.thumbnails img{
  width:65px;height:65px;object-fit:cover;border-radius:10px;
  border:2px solid transparent;cursor:pointer;
}
.thumbnails img.active{border-color:var(--v5-purple)}
.detail-info h1{margin:0 0 10px;font-size:clamp(26px,4vw,42px);letter-spacing:-1.5px}
.detail-info .price{font-size:30px}
.detail-box,.detail-info-boxes{
  margin-top:18px;
  border:1px solid #e6e1ea;
  border-radius:18px;
  background:#fff;
  padding:16px;
}
.detail-stock-top,.stock-detail{color:var(--v5-green);font-weight:900}
.size-options,.color-options{display:flex;gap:8px;flex-wrap:wrap}
.size-picker,.color-picker{margin-top:15px}
.size-picker-title{font-size:11px;font-weight:950;margin-bottom:8px}
.size-options button{
  min-width:43px;height:39px;
  border:1px solid #ddd8e3;border-radius:10px;background:#fff;font-weight:850;
}
.size-options button.active{border-color:var(--v5-purple);color:var(--v5-purple);background:#f4efff}
.detail-buy{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}
.detail-buy .primary,.detail-buy .secondary{min-height:47px}
.description{color:#66616d;line-height:1.7;font-size:13px}
.spec-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.spec-row{padding:9px 10px;border-radius:9px;background:#f7f5f8}
.spec-row strong{display:block;font-size:10px;color:#77727e}.spec-row span{font-size:12px}

/* ---------- CART / CHECKOUT MODALS ---------- */
.modal-backdrop,.modal{
  position:fixed;inset:0;z-index:220;
  display:grid;place-items:center;
  padding:16px;
  background:rgba(20,14,27,.60);
  backdrop-filter:blur(7px);
}
.modal-content{
  width:min(620px,100%);
  max-height:calc(100vh - 32px);
  overflow:auto;
  border-radius:24px;
  background:#fff;
  box-shadow:0 28px 90px rgba(0,0,0,.25);
}
.modal-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:18px 20px;border-bottom:1px solid #ece8ef;
}
.modal-header h2{margin:0;font-size:19px}
.close{
  width:35px;height:35px;border:0;border-radius:50%;
  background:#f3f0f5;font-size:20px;
}
.cart-items{display:grid;gap:9px;padding:16px 20px}
.cart-item{
  display:grid;
  grid-template-columns:68px 1fr auto;
  gap:11px;
  align-items:center;
  padding:9px;
  border:1px solid #e7e2ea;
  border-radius:14px;
}
.cart-item img{width:68px;height:68px;object-fit:cover;border-radius:10px}
.cart-item h4{margin:0 0 5px;font-size:13px}
.qty{display:flex;align-items:center;gap:6px;margin-top:6px}
.qty button{width:28px;height:28px;border:1px solid #ddd8e3;background:#fff;border-radius:7px}
.summary{margin:0 20px;padding:15px 0;border-top:1px solid #e8e4eb}
.summary-row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}
.total-row{padding-top:11px;border-top:1px solid #e8e4eb;font-size:18px;font-weight:950}

/* ---------- LOGIN / OTP ---------- */
.login-info,.login-helper{
  border-radius:12px;
  font-size:12px;
  line-height:1.55;
}
.login-info{padding:11px 12px;margin-bottom:14px;background:#f5efff;color:#4c1d95}
.login-helper{margin:11px 0 0;color:#77727e}
.field{margin-bottom:13px}
.field label{display:block;margin-bottom:6px;font-size:11px;font-weight:900}
.field input,.field select,.field textarea{
  width:100%;
  min-height:44px;
  padding:10px 12px;
  border:1px solid #ddd8e3;
  border-radius:11px;
  outline:0;
  background:#fff;
}
.field input:focus,.field select:focus,.field textarea:focus{
  border-color:#a78bfa;
  box-shadow:0 0 0 4px rgba(139,92,246,.10);
}

/* ---------- PAYMENT ---------- */
.upi-box,.qr-card{
  border:1px solid #e4ddec;
  border-radius:18px;
  background:#fbf9fd;
  padding:15px;
}
.upi-id{color:var(--v5-purple);font-weight:950}
.upi-name{color:#5f5966;font-size:11px}
.upi-app-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.upi-app-button{min-height:42px;border:1px solid #ddd8e3;border-radius:10px;background:#fff;font-size:11px;font-weight:900}
.upi-app-button:hover{border-color:#c4b5fd;color:var(--v5-purple)}

/* ---------- RESPONSIVE: TABLET ---------- */
@media(max-width:1100px){
  .header-inner{grid-template-columns:auto minmax(220px,1fr) auto;gap:12px;padding-left:16px;padding-right:16px}
  .header-button{min-width:55px;padding:6px 8px}
  .header-button small{font-size:9px}
  .main-nav{padding-left:16px;padding-right:16px}
  .hero,.content,.home-section,.deals-section,.slider-section,.trust-strip{padding-left:16px;padding-right:16px}
  .hero-card{padding:42px}
  .trust-strip{grid-template-columns:repeat(3,1fr)}
  .grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}

/* ---------- RESPONSIVE: PHONE ---------- */
@media(max-width:760px){
  .topbar{min-height:34px;padding:7px 10px;font-size:10px}
  .topbar>span{display:none}
  .topbar-button{font-size:9px;padding:4px 9px}
  .header-inner{
    min-height:auto;
    padding:10px 12px 9px;
    display:grid;
    grid-template-columns:auto 1fr auto;
    gap:8px;
  }
  .logo{font-size:14px;gap:6px}
  .logo-mark{width:37px;height:37px;border-radius:11px;font-size:18px}
  .logo small,.india-mark{display:none}
  .header-actions{gap:5px}
  .header-button{
    min-width:38px;width:38px;height:38px;min-height:38px;
    padding:0;border-radius:11px;
  }
  .header-button span{font-size:18px}
  .header-button small{display:none}
  .search{grid-column:1/-1;grid-row:2}
  .search input{height:44px;border-radius:13px;padding-left:14px;font-size:13px}
  .search-icon{right:14px;font-size:22px}
  .main-nav{padding:0 12px 9px;gap:5px}
  .all-categories,.nav-link{height:33px;padding:0 10px;font-size:10px}
  .hero{padding:12px 12px 4px}
  .hero-card{
    min-height:470px;
    grid-template-columns:1fr;
    padding:28px 23px 22px;
    border-radius:24px;
  }
  .hero-copy{text-align:left}
  .hero-card h1{font-size:clamp(35px,11vw,48px);letter-spacing:-2.5px}
  .hero-card p{font-size:13px;line-height:1.55}
  .hero-button{padding:12px 18px}
  .hero-art{min-height:190px;margin-top:0}
  .hero-art img{max-height:185px}
  .hero-discount{width:145px;height:145px;border-width:8px}
  .hero-discount strong{font-size:50px}
  .hero-discount small{font-size:9px}.hero-discount b{font-size:13px}
  .hero-spark{font-size:24px}.hero-diya,.hero-gift{font-size:35px}
  .trust-strip{
    grid-template-columns:repeat(5,160px);
    overflow-x:auto;
    padding:10px 12px 2px;
    scrollbar-width:none;
  }
  .trust-strip::-webkit-scrollbar{display:none}
  .trust-strip>div{min-height:68px;padding:9px 10px}
  .trust-strip strong{font-size:9px}.trust-strip small{font-size:8px}
  .home-section,.deals-section,.slider-section{padding:22px 12px 0}
  .section-title{margin-bottom:11px}
  .section-title h2{font-size:21px}
  .section-subtitle{font-size:10px}
  .category-showcase-grid{gap:9px;margin-right:-12px;padding-right:15px}
  .category-tile{flex-basis:112px;min-height:110px;border-radius:17px}
  .category-tile>span:first-child{width:46px;height:46px;border-radius:14px;font-size:23px}
  .category-tile b{font-size:10px}
  .deals-grid{gap:10px;margin-right:-12px;padding-right:15px}
  .deal-card{flex-basis:175px}
  .deal-image{height:145px}
  .mini-card{flex-basis:155px}
  .mini-card>img{height:150px}
  .content{padding:24px 12px 45px}
  .content>.section-title h2{font-size:22px}
  .categories{gap:7px;margin-right:-12px;padding-right:15px}
  .category{height:37px;padding:0 11px;font-size:10px;border-radius:10px}
  .category-icon{font-size:14px}
  .toolbar{align-items:flex-start;flex-direction:column;gap:9px}
  .sort{width:100%;height:38px}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
  .card{border-radius:15px}
  .image-wrap{aspect-ratio:1/1.08}
  .discount{left:7px;top:7px;padding:5px 6px;font-size:8px}
  .heart{right:7px;top:7px;width:32px;height:32px;font-size:17px}
  .card-body{padding:9px}
  .category-label{font-size:8px}
  .product-name{min-height:37px;margin:5px 0;font-size:11px}
  .rating{font-size:9px;margin-bottom:6px}
  .price{font-size:17px}.mrp{font-size:10px}
  .actions{grid-template-columns:1fr;gap:5px}
  .primary,.secondary{min-height:35px;font-size:9px;border-radius:9px}
  .footer{padding:34px 14px}
  .detail{
    grid-template-columns:1fr;
    gap:16px;
    padding:18px 12px 45px;
  }
  .gallery-main{border-radius:18px}
  .detail-info h1{font-size:26px}
  .detail-info .price{font-size:26px}
  .detail-buy{grid-template-columns:1fr 1fr}
  .spec-grid{grid-template-columns:1fr}
  .modal,.modal-backdrop{padding:9px}
  .modal-content{border-radius:19px;max-height:calc(100vh - 18px)}
  .modal-header{padding:14px 15px}
  .cart-items{padding:12px 14px}
  .summary{margin:0 14px}
  .cart-item{grid-template-columns:55px 1fr;gap:9px}
  .cart-item img{width:55px;height:55px}
  .cart-item>:last-child{grid-column:2}
  .offer-overlay{padding:10px}
  .offer-popup{border-radius:20px}
  .offer-body{padding:18px}
  .offer-body h2{font-size:22px}
  .upi-app-grid{grid-template-columns:1fr}
}

/* very small phones */
@media(max-width:390px){
  .grid{gap:7px}
  .product-name{font-size:10px}
  .price{font-size:16px}
  .category-tile{flex-basis:104px}
  .deal-card{flex-basis:165px}
  .hero-card{min-height:445px;padding:24px 18px 18px}
}

/* V7: mobile-safe modal + premium customer profile */
.modal-backdrop{
  position:fixed !important; inset:0 !important; z-index:300 !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  width:100vw !important; height:100dvh !important; padding:12px !important;
  overflow:hidden !important; background:rgba(20,14,27,.68) !important;
}
.modal-backdrop > .modal{
  position:relative !important; inset:auto !important;
  width:min(620px,100%) !important; max-width:100% !important;
  max-height:calc(100dvh - 24px) !important; margin:auto !important;
  overflow:hidden !important; display:flex !important; flex-direction:column !important;
  background:#fff !important; border-radius:24px !important;
}
.modal-backdrop > .modal .modal-header{flex:0 0 auto !important}
.modal-backdrop > .modal .modal-content{
  width:100% !important; max-width:none !important; max-height:none !important;
  overflow-y:auto !important; -webkit-overflow-scrolling:touch !important;
  flex:1 1 auto !important;
}
.premium-profile-card{
  display:flex; align-items:center; gap:14px; padding:16px; margin-bottom:18px;
  border-radius:20px; background:linear-gradient(135deg,#25123f,#5b21b6 58%,#7c3aed);
  color:#fff; box-shadow:0 14px 35px rgba(91,33,182,.22);
}
.profile-photo-wrap{position:relative;flex:0 0 auto}
.profile-photo,.profile-photo-fallback{
  width:72px;height:72px;border-radius:50%;border:3px solid rgba(255,255,255,.9);
  box-shadow:0 6px 20px rgba(0,0,0,.2);
}
.profile-photo{object-fit:cover;display:block}
.profile-photo-fallback{
  display:grid;place-items:center;background:#fff;color:#6d28d9;
  font-size:28px;font-weight:950;
}
.profile-photo-edit{
  position:absolute;right:-2px;bottom:-2px;width:28px;height:28px;border-radius:50%;
  display:grid;place-items:center;background:#fff;color:#5b21b6;font-weight:900;
  cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.2);
}
.profile-main{min-width:0}
.profile-name{font-size:20px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.profile-email{margin-top:3px;font-size:12px;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.profile-badge{
  display:inline-flex;margin-top:9px;padding:5px 8px;border-radius:999px;
  background:rgba(255,255,255,.15);font-size:10px;font-weight:900;
}
.account-section-title{
  display:flex;align-items:center;gap:10px;margin:4px 0 14px;padding-bottom:10px;
  border-bottom:1px solid #eee8f3;
}
.account-section-title span{font-size:22px}
.account-section-title strong{display:block;font-size:15px}
.account-section-title small{display:block;color:#777;font-size:11px;margin-top:2px}
.readonly-input{background:#f5f3f7 !important;color:#666}
.account-edit-link{
  border:0;background:transparent;padding:7px 0 0;color:#6d28d9;
  font-size:12px;font-weight:850;cursor:pointer;
}
.account-save-button{margin-top:4px}
.offer-overlay{
  position:fixed !important;inset:0 !important;z-index:400 !important;
  width:100vw !important;height:100dvh !important;display:flex !important;
  align-items:center !important;justify-content:center !important;padding:12px !important;
  overflow:hidden !important;
}
.offer-popup{
  width:min(540px,100%) !important;max-height:calc(100dvh - 24px) !important;
  overflow:auto !important;
}
.offer-popup>img{max-height:35dvh !important;object-fit:contain !important}
@media(max-width:767px){
  .modal-backdrop{padding:8px !important}
  .modal-backdrop > .modal{
    width:100% !important;max-height:calc(100dvh - 16px) !important;border-radius:20px !important;
  }
  .modal-backdrop > .modal .modal-header{padding:14px 15px !important}
  .modal-backdrop > .modal .modal-content{padding:15px !important}
  .premium-profile-card{padding:14px}
  .profile-photo,.profile-photo-fallback{width:62px;height:62px}
  .profile-name{font-size:17px}
  .offer-overlay{padding:8px !important}
  .offer-popup{max-height:calc(100dvh - 16px) !important;border-radius:20px !important}
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

/* PRODUCT DETAIL / COLOR / INFO / SUGGESTION ADDITIONS */
.color-picker { margin:16px 0; }
.color-options { display:flex; gap:10px; overflow-x:auto; padding:4px 2px 8px; }
.color-option { flex:0 0 auto; width:86px; border:2px solid #e5e7eb; background:#fff; border-radius:12px; padding:6px; display:flex; flex-direction:column; gap:5px; align-items:center; font-weight:800; cursor:pointer; }
.color-option.active { border-color:#6d28d9; box-shadow:0 0 0 2px rgba(109,40,217,.12); }
.color-option img,.color-dot { width:54px; height:54px; object-fit:cover; border-radius:9px; border:1px solid #e5e7eb; display:block; }
.color-option span:last-child { font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:74px; }
.detail-info-boxes { display:grid; gap:12px; margin-top:18px; }
.detail-box { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px; }
.detail-box h3 { margin:0 0 12px; font-size:17px; }
.detail-box p { margin:0; line-height:1.55; color:#4b5563; white-space:pre-wrap; }
.spec-grid { display:grid; gap:0; }
.spec-row { display:grid; grid-template-columns:38% 62%; gap:10px; padding:10px 0; border-top:1px solid #f1f5f9; }
.spec-row:first-child { border-top:0; padding-top:0; }
.spec-row span { color:#4b5563; }
.suggestions-section { margin-top:22px; padding-top:18px; border-top:1px solid #e5e7eb; }
.color-admin-card { border:1px solid #e5e7eb; border-radius:14px; padding:14px; margin:12px 0; background:#fafafa; }
.spec-admin-row { display:grid; grid-template-columns:1fr 1fr auto; gap:8px; margin:8px 0; }
@media(max-width:600px){ .spec-admin-row{grid-template-columns:1fr;} .spec-row{grid-template-columns:1fr;} }

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

.banner-upload-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.admin-banner-preview { display:block; width:100%; max-height:220px; object-fit:cover; border-radius:10px; margin-top:10px; border:1px solid #e5e7eb; }
.admin-banner-preview.mobile { max-height:360px; object-fit:contain; background:#f8fafc; }
@media (max-width:767px) { .banner-upload-grid { grid-template-columns:1fr; } }

/* Final responsive safety overrides: uploaded banners are never cropped. */
.hero-art picture { display:block; width:100%; height:100%; }
.hero-art img { object-fit:contain !important; }
@media (max-width:767px) {
  .hero-card { display:flex; flex-direction:column; align-items:stretch; min-height:0; }
  .hero-copy { width:100%; }
  .hero-art { position:relative; inset:auto; width:100%; height:auto; min-height:0; opacity:1 !important; overflow:hidden; margin-top:14px; }
  .hero-art picture { height:auto; }
  .hero-art img { width:100%; height:auto; max-height:48vh; object-fit:contain !important; display:block; }
}


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
