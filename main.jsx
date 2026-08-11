import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactDOM from "react-dom/client";

const API =
  import.meta.env.VITE_API_URL ||
  "";

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
];

function formatPrice(value) {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN"
  )}`;
}

async function apiFetch(
  path,
  options = {}
) {
  const response = await fetch(
    `${API}${path}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
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

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    selectedImage,
    setSelectedImage,
  ] = useState(0);

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
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    category,
    sort,
  ]);

  useEffect(() => {
    if (!notice) return;

    const timer =
      setTimeout(() => {
        setNotice("");
      }, 3500);

    return () =>
      clearTimeout(timer);
  }, [notice]);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const data =
        await apiFetch(
          "/api/products"
        );

      setProducts(
        Array.isArray(
          data.products
        )
          ? data.products
          : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Products could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const data =
        await apiFetch(
          "/api/categories"
        );

      if (
        Array.isArray(
          data.categories
        )
      ) {
        setCategories(
          data.categories
        );
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

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      let result =
        products.filter(
          (product) => {
            const categoryMatch =
              category === "All" ||
              product.category ===
                category;

            const searchMatch =
              !query ||
              String(
                product.name
              )
                .toLowerCase()
                .includes(query) ||
              String(
                product.category
              )
                .toLowerCase()
                .includes(query) ||
              String(
                product.sku || ""
              )
                .toLowerCase()
                .includes(query);

            return (
              categoryMatch &&
              searchMatch
            );
          }
        );

      if (
        sort === "price-low"
      ) {
        result =
