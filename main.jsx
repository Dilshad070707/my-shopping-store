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
        result = [
          ...result,
        ].sort(
          (a, b) =>
            Number(a.price) -
            Number(b.price)
        );
      }

      if (
        sort === "price-high"
      ) {
        result = [
          ...result,
        ].sort(
          (a, b) =>
            Number(b.price) -
            Number(a.price)
        );
      }

      if (
        sort === "rating"
      ) {
        result = [
          ...result,
        ].sort(
          (a, b) =>
            Number(b.rating) -
            Number(a.rating)
        );
      }

      if (
        sort === "discount"
      ) {
        result = [
          ...result,
        ].sort(
          (a, b) =>
            Number(b.discount) -
            Number(a.discount)
        );
      }

      return result;
    }, [
      products,
      search,
      category,
      sort,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredProducts.length /
          PRODUCTS_PER_PAGE
      )
    );

  const visibleProducts =
    filteredProducts.slice(
      (page - 1) *
        PRODUCTS_PER_PAGE,
      page *
        PRODUCTS_PER_PAGE
    );

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

  function addToCart(
    product
  ) {
    if (
      Number(product.stock) <=
      0
    ) {
      notify(
        "This product is out of stock."
      );
      return;
    }

    setCart(
      (current) => {
        const existing =
          current.find(
            (item) =>
              item.id ===
              product.id
          );

        if (existing) {
          return current.map(
            (item) =>
              item.id ===
              product.id
                ? {
                    ...item,
                    qty: Math.min(
                      Number(
                        item.qty
                      ) + 1,
                      Number(
                        product.stock
                      )
                    ),
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
      }
    );

    notify(
      "Added to cart."
    );
  }

  function removeFromCart(
    id
  ) {
    setCart(
      (current) =>
        current.filter(
          (item) =>
            item.id !== id
        )
    );

    notify(
      "Product removed."
    );
  }

  function changeQuantity(
    id,
    amount
  ) {
    setCart(
      (current) =>
        current
          .map((item) => {
            if (
              item.id !== id
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
    setSelectedProduct(
      product
    );

    setSelectedImage(0);
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
                  quantity:
                    Number(
                      item.qty
                    ),
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

      await loadProducts();
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

  return (
    <div className="store">
      <style>{STORE_CSS}</style>

      <div className="topbar">
        100% Secure Shopping •
        UPI Payments • Easy
        Checkout
      </div>

      <header className="header">
        <div className="header-inner">
          <button
            className="logo"
            onClick={() => {
              setCategory("All");
              setSearch("");
              setPage(1);

              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            MEESHOO
          </button>

          <div className="search">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search products, categories or SKU..."
            />
          </div>

          <div className="header-actions">
            <button
              className="header-button"
              onClick={() =>
                setLoginOpen(
                  true
                )
              }
            >
              {user
                ? user.email
                : "Login"}
            </button>

            <button
              className="header-button"
              onClick={() =>
                setCartOpen(
                  true
                )
              }
            >
              Cart ({cartCount})
            </button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-card">
          <div>
            <h1>
              Everything you need,
              <br />
              all in one place.
            </h1>

            <p>
              Shop products directly
              from our live catalog.
              Products, stock, prices
              and categories are managed
              from the Admin Panel.
            </p>

            <button
              className="hero-button"
              onClick={() =>
                document
                  .getElementById(
                    "catalog"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
            >
              Shop Now
            </button>
          </div>
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
                onClick={() =>
                  setCategory(
                    item
                  )
                }
              >
                {item}
              </button>
            )
          )}
        </div>

        <div className="toolbar">
          <span className="result-count">
            Showing{" "}
            {filteredProducts
              .length
              ? (page - 1) *
                  PRODUCTS_PER_PAGE +
                1
              : 0}
            –
            {Math.min(
              page *
                PRODUCTS_PER_PAGE,
              filteredProducts.length
            )}{" "}
            of{" "}
            {
              filteredProducts.length
            }
          </span>

          <select
            className="sort"
            value={sort}
            onChange={(event) =>
              setSort(
                event.target
                  .value
              )
            }
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
                        className="secondary"
                        onClick={() =>
                          openProduct(
                            product
                          )
                        }
                      >
                        View
                      </button>

                      <button
                        className="primary"
                        disabled={
                          Number(
                            product.stock
                          ) <= 0
                        }
                        onClick={() =>
                          addToCart(
                            product
                          )
                        }
                      >
                        Add to Cart
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
        <strong>
          MEESHOO
        </strong>

        <p>
          Products and stock are
          managed from the Admin
          Panel.
        </p>

        <button
          className="admin-link"
          onClick={() =>
            (window.location.href =
              "/admin")
          }
        >
          Admin
        </button>
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
                        selectedProduct
                          .images?.[
                          selectedImage
                        ]
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
                      {formatPrice(
                        selectedProduct.price
                      )}
                    </span>

                    <span className="mrp">
                      {formatPrice(
                        selectedProduct.mrp
                      )}
                    </span>
                  </div>

                  <p className="description">
                    {
                      selectedProduct.description
                    }
                  </p>

                  <p className="stock-detail">
                    {Number(
                      selectedProduct.stock
                    ) > 0
                      ? `In Stock · ${selectedProduct.stock} available`
                      : "Currently out of stock"}
                  </p>

                  <div className="detail-buy">
                    <button
                      className="primary"
                      disabled={
                        Number(
                          selectedProduct.stock
                        ) <= 0
                      }
                      onClick={() =>
                        addToCart(
                          selectedProduct
                        )
                      }
                    >
                      Add to Cart
                    </button>
                  </div>
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
                      key={item.id}
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
                          {formatPrice(
                            item.price
                          )}
                        </strong>

                        <div className="qty">
                          <button
                            onClick={() =>
                              changeQuantity(
                                item.id,
                                -1
                              )
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
                              changeQuantity(
                                item.id,
                                1
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        className="secondary"
                        onClick={() =>
                          removeFromCart(
                            item.id
                          )
                        }
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
            <h3>
              Pay{" "}
              {formatPrice(
                orderInfo?.amount
              )}
            </h3>

            <p>
              UPI ID
            </p>

            <div className="upi-id">
              {
                paymentSettings?.upi_id
              }
            </div>

            {paymentSettings?.upi_name && (
              <p>
                Name:{" "}
                {
                  paymentSettings.upi_name
                }
              </p>
            )}

            {paymentSettings?.qr_image && (
              <img
                className="qr"
                src={
                  paymentSettings.qr_image
                }
                alt="UPI QR"
              />
            )}

            <p className="description">
              {
                paymentSettings?.instructions
              }
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

  function updateImage(
    index,
    value
  ) {
    setProductForm(
      (current) => {
        const images = [
          ...(current.images ||
            []),
        ];

        images[index] =
          value;

        return {
          ...current,
          images,
        };
      }
    );
  }

  function addImageField() {
    setProductForm(
      (current) => ({
        ...current,
        images: [
          ...(current.images ||
            []),
          "",
        ],
      })
    );
  }

  function removeImageField(
    index
  ) {
    setProductForm(
      (current) => ({
        ...current,

        images: (
          current.images ||
          []
        ).filter(
          (_, i) =>
            i !== index
        ),
      })
    );
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
                      value={
                        productForm.reviews
                      }
                      onChange={
                        updateProductForm
                      }
                    />
                  </div>

                  <div className="field">
                    <label>
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={
                        productForm.description
                      }
                      onChange={
                        updateProductForm
                      }
                      rows="4"
                      placeholder="Product description"
                    />
                  </div>

                  <div className="field">
                    <label>
                      Product Images
                    </label>

                    <p className="muted">
                      Add image URLs.
                      You can add multiple
                      images for the same
                      product.
                    </p>

                    {productForm.images.map(
                      (
                        image,
                        index
                      ) => (
                        <div
                          className="image-input-row"
                          key={index}
                        >
                          <input
                            value={
                              image
                            }
                            onChange={(
                              event
                            ) =>
                              updateImage(
                                index,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder={`Image URL ${index + 1}`}
                          />

                          <button
                            type="button"
                            className="danger"
                            onClick={() =>
                              removeImageField(
                                index
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      )
                    )}

                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        addImageField
                      }
                    >
                      + Add Another Image
                    </button>
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
                          Stock
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
                              <strong>
                                {
                                  product.stock
                                }
                              </strong>
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

                              <small>
                                {
                                  order.phone
                                }
                              </small>
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
                                      onClick={() =>
                                        updatePaymentStatus(
                                          order.id,
                                          "FAILED"
                                        )
                                      }
                                    >
                                      Reject
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

                  {payment.qr_image && (
                    <img
                      src={
                        payment.qr_image
                      }
                      alt="UPI QR"
                    />
                  )}
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
    rating: 4.5,
    reviews: 0,
    description: "",
    images: [""],
    active: true,
  };
}

/* =====================================================
   STORE CSS
   ===================================================== */

const STORE_CSS = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    Inter,
    Arial,
    Helvetica,
    sans-serif;
  background: #f7f7f8;
  color: #171717;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.topbar {
  background: #6d28d9;
  color: white;
  text-align: center;
  padding: 8px 15px;
  font-size: 13px;
  font-weight: 800;
}

.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255,255,255,.97);
  border-bottom: 1px solid #e5e7eb;
  backdrop-filter: blur(12px);
}

.header-inner {
  max-width: 1320px;
  min-height: 70px;
  margin: auto;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.logo {
  border: 0;
  background: transparent;
  color: #7c3aed;
  font-size: 27px;
  font-weight: 950;
  letter-spacing: -1.5px;
  white-space: nowrap;
}

.search {
  flex: 1;
}

.search input {
  width: 100%;
  height: 46px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 16px;
  outline: none;
  background: #fafafa;
}

.search input:focus,
.field input:focus,
.field textarea:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px #ede9fe;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-button,
.secondary {
  border: 1px solid #ddd6fe;
  background: white;
  color: #6d28d9;
  border-radius: 9px;
  padding: 10px 13px;
  font-weight: 800;
}

.hero {
  max-width: 1320px;
  margin: auto;
  padding: 24px 18px 10px;
}

.hero-card {
  min-height: 310px;
  border-radius: 22px;
  padding: 45px;
  color: white;
  display: flex;
  align-items: center;
  background:
    radial-gradient(circle at 85% 20%, rgba(255,255,255,.2), transparent 30%),
    linear-gradient(115deg, #4c1d95, #7c3aed 60%, #8b5cf6);
}

.hero-card h1 {
  margin: 0 0 15px;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1;
  letter-spacing: -2.5px;
}

.hero-card p {
  max-width: 650px;
  color: #ede9fe;
  line-height: 1.65;
  font-size: 17px;
}

.hero-button {
  border: 0;
  background: white;
  color: #5b21b6;
  padding: 13px 22px;
  border-radius: 10px;
  font-weight: 900;
}

.content {
  max-width: 1320px;
  margin: auto;
  padding: 22px 18px 50px;
}

.section-title,
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.section-title {
  margin-bottom: 15px;
}

.section-title h2 {
  margin: 0;
  font-size: 26px;
}

.result-count,
.muted {
  color: #6b7280;
  font-size: 14px;
  font-weight: 700;
}

.categories {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 15px;
}

.category {
  flex: 0 0 auto;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 999px;
  padding: 9px 16px;
  font-weight: 800;
}

.category.active {
  background: #7c3aed;
  color: white;
  border-color: #7c3aed;
}

.toolbar {
  margin: 8px 0 18px;
}

.sort {
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  background: white;
}

.grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 17px;
}

.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 15px;
  overflow: hidden;
  box-shadow:
    0 2px 10px rgba(0,0,0,.035);
}

.image-wrap {
  position: relative;
  aspect-ratio: 1;
  background: #f1f5f9;
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.discount {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #16a34a;
  color: white;
  border-radius: 6px;
  padding: 5px 7px;
  font-size: 11px;
  font-weight: 900;
}

.heart {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 37px;
  height: 37px;
  border: 0;
  border-radius: 50%;
  background: white;
  font-size: 20px;
}

.card-body {
  padding: 13px;
}

.category-label {
  color: #7c3aed;
  text-transform: uppercase;
  letter-spacing: .5px;
  font-size: 11px;
  font-weight: 900;
}

.product-name {
  margin: 6px 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 800;
  min-height: 42px;
}

.rating {
  color: #a16207;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 6px;
}

.price {
  font-size: 20px;
  font-weight: 950;
}

.mrp {
  color: #9ca3af;
  text-decoration: line-through;
  font-size: 12px;
}

.stock-small {
  color: #16a34a;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 10px;
}

.actions,
.detail-buy {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.primary {
  min-height: 40px;
  border-radius: 8px;
  background: #7c3aed;
  color: white;
  border: 1px solid #7c3aed;
  font-weight: 850;
  padding: 10px 14px;
}

.full {
  width: 100%;
  margin-top: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin-top: 30px;
}

.page-button {
  min-width: 40px;
  height: 40px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  font-weight: 800;
}

.page-button.active {
  color: white;
  background: #7c3aed;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15,23,42,.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal {
  width: min(920px, 100%);
  max-height: 94vh;
  overflow: auto;
  background: white;
  border-radius: 18px;
  box-shadow: 0 30px 80px rgba(0,0,0,.28);
}

.small-modal {
  width: min(520px, 100%);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 19px 21px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
}

.close {
  width: 36px;
  height: 36px;
  border: 0;
  background: #f3f4f6;
  border-radius: 50%;
  font-size: 21px;
}

.modal-content {
  padding: 21px;
}

.detail {
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  gap: 24px;
}

.gallery-main {
  aspect-ratio: 1;
  border-radius: 14px;
  overflow: hidden;
  background: #f1f5f9;
}

.gallery-main img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnails {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);
  gap: 8px;
  margin-top: 9px;
}

.thumbnail {
  aspect-ratio: 1;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
}

.thumbnail.active {
  border-color: #7c3aed;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-info h2 {
  font-size: 29px;
  line-height: 1.18;
}

.description {
  color: #6b7280;
  line-height: 1.65;
}

.stock-detail {
  color: #16a34a;
  font-weight: 800;
}

.field {
  margin-bottom: 14px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 850;
}

.field input,
.field textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 11px 12px;
  outline: none;
  background: white;
}

.field input {
  height: 45px;
}

.cart-items {
  display: grid;
  gap: 10px;
}

.cart-item {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  gap: 11px;
  align-items: center;
  padding: 9px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.cart-item img {
  width: 70px;
  height: 70px;
  object-fit: cover;
  border-radius: 8px;
}

.cart-item h4 {
  margin: 0 0 5px;
}

.qty {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 6px;
}

.qty button {
  width: 28px;
  height: 28px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
}

.summary {
  border-top: 1px solid #e5e7eb;
  margin-top: 17px;
  padding-top: 15px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 9px;
}

.total-row {
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
  font-size: 19px;
  font-weight: 950;
}

.notice {
  position: fixed;
  z-index: 300;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  background: #111827;
  color: white;
  padding: 12px 18px;
  border-radius: 999px;
  box-shadow: 0 12px 35px rgba(0,0,0,.25);
  max-width: calc(100% - 24px);
  text-align: center;
}

.notice.static {
  position: static;
  transform: none;
  margin-top: 15px;
}

.empty {
  padding: 45px 20px;
  text-align: center;
  color: #6b7280;
  background: white;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
}

.footer {
  background: #111827;
  color: #cbd5e1;
  padding: 38px 18px;
  text-align: center;
}

.admin-link {
  background: transparent;
  border: 0;
  color: #a78bfa;
  font-weight: 800;
}

.login-info,
.upi-box {
  background: #f5f3ff;
  color: #5b21b6;
  padding: 13px;
  border-radius: 9px;
  margin-bottom: 16px;
}

.upi-id {
  font-size: 22px;
  font-weight: 950;
  word-break: break-all;
}

.qr {
  width: min(260px, 100%);
  display: block;
  margin: 15px auto;
}

@media(max-width:1050px) {
  .grid {
    grid-template-columns:
      repeat(3, minmax(0,1fr));
  }
}

@media(max-width:760px) {
  .header-inner {
    flex-wrap: wrap;
  }

  .search {
    order: 3;
    flex-basis: 100%;
  }

  .hero-card {
    padding: 30px 23px;
  }

  .grid {
    grid-template-columns:
      repeat(2, minmax(0,1fr));
    gap: 10px;
  }

  .detail {
    grid-template-columns: 1fr;
  }

  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .actions,
  .detail-buy {
    grid-template-columns: 1fr;
  }
}

@media(max-width:460px) {
  .header-inner {
    padding: 10px 12px;
  }

  .logo {
    font-size: 23px;
  }

  .hero,
  .content {
    padding-left: 12px;
    padding-right: 12px;
  }

  .hero-card h1 {
    font-size: 35px;
  }

  .cart-item {
    grid-template-columns: 58px 1fr;
  }

  .cart-item img {
    width: 58px;
    height: 58px;
  }
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
}
`;

/* =====================================================
   ENTRY
   ===================================================== */

function RootApp() {
  const isAdmin =
    window.location.pathname ===
      "/admin" ||
    window.location.pathname.startsWith(
      "/admin/"
    );

  return isAdmin ? (
    <AdminApp />
  ) : (
    <StoreApp />
  );
}

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <RootApp />
);
