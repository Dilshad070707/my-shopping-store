import React, { useEffect, useMemo, useState } from "react";

const FALLBACK_CATEGORIES = [
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
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getImage(product) {
  if (product?.image) return product.image;

  if (product?.images?.length) {
    return Array.isArray(product.images)
      ? product.images[0]
      : product.images;
  }

  if (product?.image_url) return product.image_url;

  return "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=85";
}

function normalizeProduct(product) {
  return {
    ...product,
    id: product.id,
    name: product.name || "Product",
    category:
      product.category ||
      product.category_name ||
      "Other",
    price: Number(product.price || 0),
    mrp: Number(product.mrp || product.price || 0),
    stock: Number(product.stock || 0),
    rating: Number(product.rating || 0),
    reviews: Number(product.reviews || 0),
    image: getImage(product),
  };
}

function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(
    FALLBACK_CATEGORIES
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [user, setUser] = useState(null);

  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const savedCart =
        localStorage.getItem("meeshoo_cart");

      const savedWishlist =
        localStorage.getItem("meeshoo_wishlist");

      const savedUser =
        localStorage.getItem("meeshoo_user");

      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem("meeshoo_cart");
      localStorage.removeItem("meeshoo_wishlist");
      localStorage.removeItem("meeshoo_user");
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
    } else {
      localStorage.removeItem("meeshoo_user");
    }
  }, [user]);

  useEffect(() => {
    loadStore();
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [notice]);

  async function loadStore() {
    setLoading(true);
    setError("");

    try {
      const [
        productsResponse,
        categoriesResponse,
      ] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);

      if (!productsResponse.ok) {
        throw new Error(
          "Unable to load products."
        );
      }

      const productsData =
        await productsResponse.json();

      const normalizedProducts = Array.isArray(
        productsData
      )
        ? productsData.map(normalizeProduct)
        : Array.isArray(productsData.products)
        ? productsData.products.map(
            normalizeProduct
          )
        : [];

      setProducts(normalizedProducts);

      if (categoriesResponse.ok) {
        const categoriesData =
          await categoriesResponse.json();

        const rawCategories =
          Array.isArray(categoriesData)
            ? categoriesData
            : Array.isArray(
                categoriesData.categories
              )
            ? categoriesData.categories
            : [];

        const categoryNames =
          rawCategories
            .map((item) =>
              typeof item === "string"
                ? item
                : item.name ||
                  item.category_name
            )
            .filter(Boolean);

        if (categoryNames.length) {
          setCategories([
            "All",
            ...Array.from(
              new Set(categoryNames)
            ),
          ]);
        }
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatch =
        category === "All" ||
        product.category === category;

      const searchMatch =
        !query ||
        product.name
          .toLowerCase()
          .includes(query) ||
        product.category
          .toLowerCase()
          .includes(query) ||
        String(product.sku || "")
          .toLowerCase()
          .includes(query);

      return (
        categoryMatch && searchMatch
      );
    });
  }, [
    products,
    search,
    category,
  ]);

  const cartCount = cart.reduce(
    (sum, item) =>
      sum + Number(item.qty || 0),
    0
  );

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
        Number(item.qty || 0),
    0
  );

  function notify(message) {
    setNotice(message);
  }

  function addToCart(product) {
    if (product.stock <= 0) {
      notify(
        "This product is out of stock."
      );
      return;
    }

    setCart((current) => {
      const existing =
        current.find(
          (item) =>
            item.id === product.id
        );

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: Math.min(
                  item.qty + 1,
                  product.stock
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
    });

    notify("Added to cart.");
  }

  function removeFromCart(productId) {
    setCart((current) =>
      current.filter(
        (item) =>
          item.id !== productId
      )
    );

    notify("Removed from cart.");
  }

  function changeQuantity(
    productId,
    amount
  ) {
    setCart((current) =>
      current
        .map((item) => {
          if (
            item.id !== productId
          ) {
            return item;
          }

          const next =
            item.qty + amount;

          return {
            ...item,
            qty: Math.max(
              0,
              Math.min(
                next,
                item.stock
              )
            ),
          };
        })
        .filter(
          (item) => item.qty > 0
        )
    );
  }

  function toggleWishlist(
    productId
  ) {
    setWishlist((current) =>
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

  function handleLogin(event) {
    event.preventDefault();

    const cleanEmail =
      email.trim().toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      notify(
        "Enter a valid email address."
      );
      return;
    }

    const nextUser = {
      email: cleanEmail,
    };

    setUser(nextUser);
    setEmail("");
    setLoginOpen(false);

    notify("Login successful.");
  }

  return (
    <div className="store">
      <div className="topbar">
        100% Secure Online Shopping •
        Free Delivery on Eligible Orders
      </div>

      <header className="header">
        <div className="header-inner">
          <button
            className="logo"
            onClick={() => {
              setCategory("All");
              setSearch("");
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            MEESHO
          </button>

          <div className="search">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search products, categories or SKU..."
            />
          </div>

          <div className="header-actions">
            <button
              className="header-button"
              onClick={() =>
                setLoginOpen(true)
              }
            >
              {user
                ? user.email
                : "Login"}
            </button>

            <button
              className="header-button"
              onClick={() =>
                setCartOpen(true)
              }
            >
              Cart ({cartCount})
            </button>

            <button
              className="header-button"
              onClick={() => {
                window.location.href =
                  "/admin";
              }}
            >
              Admin
            </button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-card">
          <div className="hero-content">
            <h1>
              Everything you need,
              <br />
              all in one place.
            </h1>

            <p>
              Shop products managed
              directly from your
              store database.
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
            {products.length} products
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
                  setCategory(item)
                }
              >
                {item}
              </button>
            )
          )}
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
              Products could not be
              loaded
            </h3>

            <p>{error}</p>

            <button
              className="primary"
              onClick={
                loadStore
              }
            >
              Try Again
            </button>
          </div>
        ) : filteredProducts.length ===
          0 ? (
          <div className="empty">
            <h3>
              No products found
            </h3>

            <p>
              Try another search
              or category.
            </p>
          </div>
        ) : (
          <div className="grid">
            {filteredProducts.map(
              (product) => {
                const discount =
                  product.mrp >
                  product.price
                    ? Math.round(
                        ((product.mrp -
                          product.price) /
                          product.mrp) *
                          100
                      )
                    : 0;

                return (
                  <article
                    className="card"
                    key={product.id}
                  >
                    <div className="image-wrap">
                      <img
                        src={getImage(
                          product
                        )}
                        alt={
                          product.name
                        }
                        loading="lazy"
                      />

                      {discount >
                        0 && (
                        <span className="discount">
                          {discount}%
                          OFF
                        </span>
                      )}

                      <button
                        className="heart"
                        onClick={() =>
                          toggleWishlist(
                            product.id
                          )
                        }
                        aria-label="Wishlist"
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
                        {product.rating
                          ? `★ ${product.rating}`
                          : "New Product"}{" "}
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

                        {product.mrp >
                          product.price && (
                          <span className="mrp">
                            {formatPrice(
                              product.mrp
                            )}
                          </span>
                        )}
                      </div>

                      <div className="actions">
                        <button
                          className="secondary"
                          onClick={() =>
                            setSelectedProduct(
                              product
                            )
                          }
                        >
                          View
                        </button>

                        <button
                          className="primary"
                          onClick={() =>
                            addToCart(
                              product
                            )
                          }
                          disabled={
                            product.stock <=
                            0
                          }
                        >
                          {product.stock <=
                          0
                            ? "Out of Stock"
                            : "Add to Cart"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>
              MEESHO
            </strong>

            <div
              style={{
                marginTop: 8,
              }}
            >
              A modern online
              shopping experience.
            </div>
          </div>

          <div>
            Secure Shopping •
            Easy Checkout •
            Quality Products
          </div>
        </div>
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
                <div className="gallery-main">
                  <img
                    src={getImage(
                      selectedProduct
                    )}
                    alt={
                      selectedProduct.name
                    }
                  />
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
                    {selectedProduct.description ||
                      "Quality product available from our store."}
                  </p>

                  <div
                    style={{
                      color:
                        selectedProduct.stock >
                        0
                          ? "#16a34a"
                          : "#dc2626",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {selectedProduct.stock >
                    0
                      ? `In Stock · ${selectedProduct.stock} available`
                      : "Out of Stock"}
                  </div>

                  <div className="detail-buy">
                    <button
                      className="primary"
                      style={{
                        minHeight: 46,
                      }}
                      disabled={
                        selectedProduct.stock <=
                        0
                      }
                      onClick={() =>
                        addToCart(
                          selectedProduct
                        )
                      }
                    >
                      Add to Cart
                    </button>

                    <button
                      className="secondary"
                      style={{
                        minHeight: 46,
                      }}
                      onClick={() => {
                        addToCart(
                          selectedProduct
                        );
                        setSelectedProduct(
                          null
                        );
                        setCartOpen(
                          true
                        );
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setCartOpen(false)
          }
        >
          <div
            className="modal small-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h2>
                Your Cart ({cartCount})
              </h2>

              <button
                className="close"
                onClick={() =>
                  setCartOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              {!cart.length ? (
                <div className="empty">
                  <h3>
                    Your cart is empty
                  </h3>

                  <p>
                    Add products to
                    continue.
                  </p>
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
                            src={getImage(
                              item
                            )}
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

                            <div
                              style={{
                                fontWeight:
                                  900,
                              }}
                            >
                              {formatPrice(
                                item.price
                              )}
                            </div>

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

                      <span>
                        {formatPrice(
                          subtotal
                        )}
                      </span>
                    </div>

                    <button
                      className="primary"
                      style={{
                        width: "100%",
                        minHeight: 46,
                        marginTop: 12,
                      }}
                      onClick={() => {
                        setCartOpen(
                          false
                        );
                        notify(
                          "Open checkout from the main store."
                        );
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {loginOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setLoginOpen(false)
          }
        >
          <div
            className="modal small-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h2>
                Continue with Email
              </h2>

              <button
                className="close"
                onClick={() =>
                  setLoginOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <p
                style={{
                  color: "#6b7280",
                  lineHeight: 1.6,
                  marginTop: 0,
                }}
              >
                Enter your email to
                continue shopping.
              </p>

              <form
                onSubmit={handleLogin}
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
                    autoComplete="email"
                    required
                  />
                </div>

                <button
                  className="primary"
                  type="submit"
                  style={{
                    width: "100%",
                    minHeight: 46,
                  }}
                >
                  Continue with Email
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
