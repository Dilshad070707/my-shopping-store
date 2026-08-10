import React, { useEffect, useMemo, useState } from "react";

const PRODUCTS_PER_PAGE = 40;

const CATEGORIES = [
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

const CATEGORY_DATA = {
  Women: {
    names: [
      "Premium Cotton Kurti",
      "Floral Printed Kurti",
      "Women's Casual Top",
      "Elegant Saree",
      "Cotton Anarkali Suit",
      "Women's Palazzo Set",
      "Designer Ethnic Dress",
      "Casual Women's Shirt",
    ],
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=85",
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=900&q=85",
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=900&q=85",
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=900&q=85",
    ],
  },

  Men: {
    names: [
      "Classic Men's Casual Shirt",
      "Premium Cotton T-Shirt",
      "Men's Regular Fit Shirt",
      "Classic Denim Jeans",
      "Men's Casual Jacket",
      "Premium Polo T-Shirt",
      "Men's Ethnic Kurta",
      "Slim Fit Casual Trousers",
    ],
    images: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=85",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=85",
      "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=900&q=85",
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=900&q=85",
    ],
  },

  Electronics: {
    names: [
      "Premium Wireless Headphones",
      "Classic Smartwatch",
      "Wireless Bluetooth Speaker",
      "Fast Charging Power Bank",
      "Smart LED Light",
      "Wireless Earbuds",
      "Portable Bluetooth Speaker",
      "Digital Smart Watch",
    ],
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=85",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=900&q=85",
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=900&q=85",
      "https://images.unsplash.com/photo-1609592424619-3c9a7c2d9c7f?w=900&q=85",
    ],
  },

  Beauty: {
    names: [
      "Daily Face Care Kit",
      "Premium Makeup Set",
      "Hydrating Face Cream",
      "Beauty Essentials Kit",
      "Natural Lip Care Set",
      "Hair Care Combo",
      "Skin Care Essentials",
      "Daily Beauty Kit",
    ],
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=85",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=900&q=85",
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=900&q=85",
      "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=900&q=85",
    ],
  },

  Footwear: {
    names: [
      "Minimal Casual Sneakers",
      "Comfort Walking Shoes",
      "Classic Running Shoes",
      "Women's Casual Flats",
      "Men's Casual Sneakers",
      "Daily Wear Sandals",
      "Sports Training Shoes",
      "Classic Slip-On Shoes",
    ],
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85",
      "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?w=900&q=85",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85",
      "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=900&q=85",
    ],
  },

  Home: {
    names: [
      "Premium Decorative Cushion",
      "Modern Table Lamp",
      "Soft Home Curtain",
      "Decorative Wall Art",
      "Premium Bedsheet Set",
      "Modern Storage Basket",
      "Home Decoration Set",
      "Elegant Floor Mat",
    ],
    images: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=85",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=85",
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=85",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=85",
    ],
  },

  Kitchen: {
    names: [
      "Premium Kitchen Storage Set",
      "Stainless Steel Cookware Set",
      "Modern Kitchen Organizer",
      "Non Stick Frying Pan",
      "Kitchen Container Set",
      "Premium Dinner Set",
      "Manual Vegetable Chopper",
      "Kitchen Essentials Combo",
    ],
    images: [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=900&q=85",
      "https://images.unsplash.com/photo-1584990347449-ae5f6c8e2f7a?w=900&q=85",
      "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=900&q=85",
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=900&q=85",
    ],
  },

  Grocery: {
    names: [
      "Premium Grocery Essentials",
      "Daily Kitchen Essentials",
      "Healthy Breakfast Combo",
      "Premium Dry Fruits Pack",
      "Everyday Food Essentials",
      "Family Grocery Combo",
      "Healthy Snacks Combo",
      "Daily Household Essentials",
    ],
    images: [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=85",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=85",
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=900&q=85",
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=85",
    ],
  },

  Accessories: {
    names: [
      "Premium Everyday Wallet",
      "Classic Leather Belt",
      "Fashion Sunglasses",
      "Minimal Card Holder",
      "Premium Travel Wallet",
      "Classic Men's Belt",
      "Fashion Accessory Set",
      "Everyday Utility Pouch",
    ],
    images: [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?w=900&q=85",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=85",
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=900&q=85",
      "https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?w=900&q=85",
    ],
  },

  Kids: {
    names: [
      "Kids Casual Cotton T-Shirt",
      "Children's Printed Dress",
      "Kids Comfortable Sneakers",
      "Kids Casual Shirt",
      "Children's Ethnic Wear",
      "Kids Winter Jacket",
      "Kids Everyday Shorts",
      "Kids Fashion Set",
    ],
    images: [
      "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=900&q=85",
      "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=900&q=85",
      "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?w=900&q=85",
      "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=900&q=85",
    ],
  },

  Sports: {
    names: [
      "Premium Sports Training Shoes",
      "Fitness Resistance Band Set",
      "Sports Water Bottle",
      "Yoga Exercise Mat",
      "Running Training T-Shirt",
      "Gym Workout Gloves",
      "Sports Training Bag",
      "Home Fitness Kit",
    ],
    images: [
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=85",
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=85",
      "https://images.unsplash.com/photo-1526401485004-2aa7a9b1e0a1?w=900&q=85",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=85",
    ],
  },

  Bags: {
    names: [
      "Women's Casual Handbag",
      "Premium Shoulder Bag",
      "Classic Travel Backpack",
      "Women's Fashion Tote",
      "Laptop Backpack",
      "Everyday Sling Bag",
      "Travel Duffle Bag",
      "Premium Handbag",
    ],
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=85",
      "https://images.unsplash.com/photo-1556306535-38febf6782e7?w=900&q=85",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=900&q=85",
    ],
  },

  Jewellery: {
    names: [
      "Elegant Fashion Necklace",
      "Classic Women's Earrings",
      "Minimal Bracelet Set",
      "Premium Fashion Ring",
      "Traditional Jewellery Set",
      "Elegant Pendant",
      "Fashion Jewellery Combo",
      "Classic Earrings Set",
    ],
    images: [
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&q=85",
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&q=85",
      "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=900&q=85",
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=85",
    ],
  },

  Watches: {
    names: [
      "Classic Analog Watch",
      "Premium Men's Watch",
      "Elegant Women's Watch",
      "Minimal Fashion Watch",
      "Classic Leather Watch",
      "Modern Digital Watch",
      "Premium Couple Watch",
      "Everyday Wrist Watch",
    ],
    images: [
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=900&q=85",
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=900&q=85",
      "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=900&q=85",
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=900&q=85",
    ],
  },
};

const FALLBACK_DATA = {
  names: [
    "Premium Everyday Product",
    "Classic Lifestyle Essential",
    "Modern Daily Use Product",
    "Premium Value Product",
  ],
  images: [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=85",
    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=85",
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=85",
    "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=900&q=85",
  ],
};

function getCategoryData(category) {
  return CATEGORY_DATA[category] || FALLBACK_DATA;
}

function generateProducts() {
  const products = [];

  for (let index = 1; index <= 10000; index += 1) {
    const category =
      CATEGORIES[1 + ((index - 1) % (CATEGORIES.length - 1))];

    const data = getCategoryData(category);

    const nameIndex = Math.floor(
      (index - 1) / (CATEGORIES.length - 1)
    ) % data.names.length;

    const variationNumber =
      Math.floor(
        (index - 1) /
          ((CATEGORIES.length - 1) * data.names.length)
      ) + 1;

    const basePrice =
      299 +
      ((index * 137) % 4200);

    const mrp =
      Math.ceil(
        (basePrice * (1.35 + ((index % 5) * 0.15))) / 10
      ) * 10;

    const discount = Math.round(
      ((mrp - basePrice) / mrp) * 100
    );

    const images = data.images.map((image) => image);

    products.push({
      id: `p${index}`,
      sku: `MSH-${String(index).padStart(6, "0")}`,
      name:
        variationNumber > 1
          ? `${data.names[nameIndex]} - Edition ${variationNumber}`
          : data.names[nameIndex],
      category,
      price: basePrice,
      mrp,
      discount,
      rating: Number((4 + ((index % 10) / 10)).toFixed(1)),
      reviews: 100 + ((index * 37) % 4900),
      stock: 10 + ((index * 17) % 190),
      images,
      description: `Premium ${category.toLowerCase()} product with a practical design, attractive finish and everyday usability.`,
    });
  }

  return products;
}

const PRODUCTS = generateProducts();

function formatPrice(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [selectedImage, setSelectedImage] = useState(0);

  const [cartOpen, setCartOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] =
    useState(false);

  const [loginOpen, setLoginOpen] = useState(false);

  const [email, setEmail] = useState("");

  const [user, setUser] = useState(null);

  const [address, setAddress] = useState({
    name: "",
    phone: "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [notice, setNotice] = useState("");

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(
        "meeshoo_cart"
      );

      const savedWishlist = localStorage.getItem(
        "meeshoo_wishlist"
      );

      const savedUser = localStorage.getItem(
        "meeshoo_user"
      );

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
    setPage(1);
  }, [search, category, sort]);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [notice]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = PRODUCTS.filter((product) => {
      const categoryMatch =
        category === "All" ||
        product.category === category;

      const searchMatch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);

      return categoryMatch && searchMatch;
    });

    if (sort === "price-low") {
      result = [...result].sort(
        (a, b) => a.price - b.price
      );
    }

    if (sort === "price-high") {
      result = [...result].sort(
        (a, b) => b.price - a.price
      );
    }

    if (sort === "rating") {
      result = [...result].sort(
        (a, b) => b.rating - a.rating
      );
    }

    if (sort === "discount") {
      result = [...result].sort(
        (a, b) => b.discount - a.discount
      );
    }

    return result;
  }, [search, category, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredProducts.length / PRODUCTS_PER_PAGE
    )
  );

  const visibleProducts = filteredProducts.slice(
    (page - 1) * PRODUCTS_PER_PAGE,
    page * PRODUCTS_PER_PAGE
  );

  const cartCount = cart.reduce(
    (sum, item) => sum + item.qty,
    0
  );

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + item.price * item.qty,
    0
  );

  const delivery = subtotal > 0 ? 0 : 0;

  const total = subtotal + delivery;

  function notify(message) {
    setNotice(message);
  }

  function addToCart(product) {
    if (product.stock <= 0) {
      notify("This product is out of stock.");
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
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

    notify("Added to cart successfully.");
  }

  function removeFromCart(productId) {
    setCart((current) =>
      current.filter(
        (item) => item.id !== productId
      )
    );

    notify("Product removed from cart.");
  }

  function changeQuantity(productId, amount) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          const nextQuantity =
            item.qty + amount;

          return {
            ...item,
            qty: Math.max(
              0,
              Math.min(
                nextQuantity,
                item.stock
              )
            ),
          };
        })
        .filter((item) => item.qty > 0)
    );
  }

  function toggleWishlist(productId) {
    setWishlist((current) =>
      current.includes(productId)
        ? current.filter(
            (id) => id !== productId
          )
        : [...current, productId]
    );
  }

  function openProduct(product) {
    setSelectedProduct(product);
    setSelectedImage(0);
  }

  function buyNow(product) {
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
    if (!cart.length) {
      notify("Your cart is empty.");
      return;
    }

    setCartOpen(false);

    if (!user) {
      setLoginOpen(true);
      return;
    }

    setCheckoutOpen(true);
  }

  function loginWithEmail(event) {
    event.preventDefault();

    const cleanEmail =
      email.trim().toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      notify("Enter a valid email address.");
      return;
    }

    const newUser = {
      email: cleanEmail,
    };

    setUser(newUser);
    setEmail("");
    setLoginOpen(false);

    notify("Email login successful.");
  }

  function updateAddress(event) {
    const { name, value } =
      event.target;

    setAddress((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function startPayment() {
    if (!user) {
      setCheckoutOpen(false);
      setLoginOpen(true);
      return;
    }

    if (!address.name.trim()) {
      notify("Enter your full name.");
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

    if (!address.line1.trim()) {
      notify("Enter your complete address.");
      return;
    }

    if (!address.city.trim()) {
      notify("Enter your city.");
      return;
    }

    if (!address.state.trim()) {
      notify("Enter your state.");
      return;
    }

    if (
      !/^\d{6}$/.test(
        address.pincode.trim()
      )
    ) {
      notify(
        "Enter a valid 6-digit PIN code."
      );
      return;
    }

    if (!cart.length) {
      notify("Your cart is empty.");
      return;
    }

    setPaymentLoading(true);

    try {
      const response = await fetch(
        "/api/payments/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            customer: {
              email: user.email,
              name: address.name.trim(),
              phone: address.phone.trim(),
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

            items: cart.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.qty,
              price: item.price,
            })),

            amount: total,
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to start payment."
        );
      }

      if (
        data.payment_session_id &&
        window.Cashfree
      ) {
        const cashfree =
          window.Cashfree({
            mode:
              data.mode ===
              "production"
                ? "production"
                : "sandbox",
          });

        await cashfree.checkout({
          paymentSessionId:
            data.payment_session_id,
          redirectTarget: "_self",
        });

        return;
      }

      if (data.payment_url) {
        window.location.href =
          data.payment_url;
        return;
      }

      throw new Error(
        "Secure payment session was not returned."
      );
    } catch (error) {
      notify(
        error.message ||
          "Payment could not be started."
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  function goToPage(nextPage) {
    const safePage = Math.max(
      1,
      Math.min(nextPage, totalPages)
    );

    setPage(safePage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="store">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Inter, Arial, Helvetica, sans-serif;
          background: #f7f7f8;
          color: #171717;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .topbar {
          background: #6d28d9;
          color: white;
          padding: 8px 18px;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
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
          margin: auto;
          min-height: 70px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 20px;
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
          position: relative;
        }

        .search input {
          width: 100%;
          height: 46px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 17px;
          outline: none;
          background: #fafafa;
        }

        .search input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px #ede9fe;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-button {
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 9px;
          padding: 10px 13px;
          font-weight: 800;
          color: #374151;
        }

        .header-button:hover {
          color: #6d28d9;
          border-color: #c4b5fd;
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
            radial-gradient(circle at 85% 20%, rgba(255,255,255,.20), transparent 30%),
            linear-gradient(115deg, #4c1d95, #7c3aed 60%, #8b5cf6);
          overflow: hidden;
        }

        .hero-content {
          max-width: 650px;
        }

        .hero-content h1 {
          margin: 0 0 15px;
          font-size: clamp(34px, 5vw, 58px);
          line-height: 1;
          letter-spacing: -2.5px;
        }

        .hero-content p {
          margin: 0 0 24px;
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

        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .section-title h2 {
          margin: 0;
          font-size: 26px;
          letter-spacing: -.7px;
        }

        .categories {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 0 15px;
        }

        .category {
          flex: 0 0 auto;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 999px;
          padding: 9px 16px;
          font-weight: 800;
          color: #374151;
        }

        .category.active {
          color: white;
          background: #7c3aed;
          border-color: #7c3aed;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin: 8px 0 18px;
        }

        .result-count {
          color: #6b7280;
          font-size: 14px;
          font-weight: 700;
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
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 17px;
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          overflow: hidden;
          transition: .2s ease;
          box-shadow: 0 2px 10px rgba(0,0,0,.035);
        }

        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(0,0,0,.09);
        }

        .image-wrap {
          position: relative;
          aspect-ratio: 1 / 1;
          background: #f1f5f9;
          overflow: hidden;
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
          background: rgba(255,255,255,.95);
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
          margin-bottom: 12px;
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

        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .secondary,
        .primary {
          min-height: 40px;
          border-radius: 8px;
          font-weight: 850;
        }

        .secondary {
          background: white;
          border: 1px solid #c4b5fd;
          color: #6d28d9;
        }

        .primary {
          background: #7c3aed;
          color: white;
          border: 1px solid #7c3aed;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          margin-top: 30px;
          flex-wrap: wrap;
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
          border-color: #7c3aed;
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
          width: min(900px, 100%);
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
          font-size: 21px;
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
          width: 100%;
          aspect-ratio: 1 / 1;
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
          grid-template-columns: repeat(4, 1fr);
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
          margin: 5px 0 10px;
          font-size: 29px;
          line-height: 1.18;
        }

        .description {
          color: #6b7280;
          line-height: 1.65;
          margin: 15px 0;
        }

        .detail-buy {
          display: grid;
          gap: 9px;
          margin-top: 18px;
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

        .field input {
          width: 100%;
          height: 45px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 12px;
          outline: none;
        }

        .field input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px #ede9fe;
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
          font-size: 14px;
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
          z-index: 200;
          left: 50%;
          bottom: 20px;
          transform: translateX(-50%);
          background: #111827;
          color: white;
          padding: 12px 18px;
          border-radius: 999px;
          box-shadow: 0 12px 35px rgba(0,0,0,.25);
          font-size: 14px;
          font-weight: 750;
          max-width: calc(100% - 24px);
          text-align: center;
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
          margin-top: 25px;
        }

        .footer-inner {
          max-width: 1320px;
          margin: auto;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .footer strong {
          color: white;
          font-size: 20px;
        }

        @media (max-width: 1050px) {
          .grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .header-inner {
            flex-wrap: wrap;
          }

          .search {
            order: 3;
            flex-basis: 100%;
          }

          .hero-card {
            padding: 30px 23px;
            min-height: 270px;
          }

          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .actions {
            grid-template-columns: 1fr;
          }

          .detail {
            grid-template-columns: 1fr;
          }

          .toolbar {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 460px) {
          .topbar {
            font-size: 11px;
          }

          .header-inner {
            padding: 10px 12px;
          }

          .logo {
            font-size: 23px;
          }

          .header-button {
            padding: 8px 10px;
            font-size: 12px;
          }

          .hero,
          .content {
            padding-left: 12px;
            padding-right: 12px;
          }

          .hero-content h1 {
            font-size: 35px;
          }

          .product-name {
            font-size: 13px;
          }

          .price {
            font-size: 17px;
          }

          .card-body {
            padding: 10px;
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
      `}</style>

      <div className="topbar">
        100% Secure Online Shopping • Free Delivery on
        Eligible Orders
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
                setSearch(event.target.value)
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
              Explore thousands of products across
              fashion, electronics, beauty, home,
              footwear and everyday essentials.
            </p>

            <button
              className="hero-button"
              onClick={() =>
                document
                  .getElementById("catalog")
                  ?.scrollIntoView({
                    behavior: "smooth",
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
          <h2>Explore Products</h2>

          <span className="result-count">
            10,000 products
          </span>
        </div>

        <div className="categories">
          {CATEGORIES.map((item) => (
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
          ))}
        </div>

        <div className="toolbar">
          <span className="result-count">
            Showing{" "}
            {filteredProducts.length
              ? (page - 1) *
                  PRODUCTS_PER_PAGE +
                1
              : 0}
            –
            {Math.min(
              page * PRODUCTS_PER_PAGE,
              filteredProducts.length
            )}{" "}
            of {filteredProducts.length}
          </span>

          <select
            className="sort"
            value={sort}
            onChange={(event) =>
              setSort(event.target.value)
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

        {visibleProducts.length === 0 ? (
          <div className="empty">
            <h3>No products found</h3>
            <p>
              Try another search or category.
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
                      src={product.images[0]}
                      alt={product.name}
                      loading="lazy"
                    />

                    <span className="discount">
                      {product.discount}% OFF
                    </span>

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
                      {product.category}
                    </div>

                    <div className="product-name">
                      {product.name}
                    </div>

                    <div className="rating">
                      ★ {product.rating} ·{" "}
                      {product.reviews} reviews
                    </div>

                    <div className="price-line">
                      <span className="price">
                        {formatPrice(
                          product.price
                        )}
                      </span>

                      <span className="mrp">
                        {formatPrice(
                          product.mrp
                        )}
                      </span>
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
              disabled={page === 1}
              onClick={() =>
                goToPage(page - 1)
              }
            >
              ‹
            </button>

            {Array.from(
              {
                length: Math.min(
                  totalPages,
                  7
                ),
              },
              (_, index) => {
                let pageNumber;

                if (totalPages <= 7) {
                  pageNumber =
                    index + 1;
                } else if (page <= 4) {
                  pageNumber =
                    index + 1;
                } else if (
                  page >=
                  totalPages - 3
                ) {
                  pageNumber =
                    totalPages -
                    6 +
                    index;
                } else {
                  pageNumber =
                    page - 3 + index;
                }

                return (
                  <button
                    key={pageNumber}
                    className={`page-button ${
                      page === pageNumber
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      goToPage(
                        pageNumber
                      )
                    }
                  >
                    {pageNumber}
                  </button>
                );
              }
            )}

            <button
              className="page-button"
              disabled={
                page === totalPages
              }
              onClick={() =>
                goToPage(page + 1)
              }
            >
              ›
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>
              MEESHOO
            </strong>

            <div style={{ marginTop: 8 }}>
              A modern online shopping
              experience.
            </div>
          </div>

          <div>
            Secure Shopping • Easy Checkout
            • Quality Products
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
            setSelectedProduct(null)
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
                          .images[
                          selectedImage
                        ]
                      }
                      alt={
                        selectedProduct.name
                      }
                    />
                  </div>

                  <div className="thumbnails">
                    {selectedProduct.images
                      .slice(0, 4)
                      .map(
                        (
                          image,
                          index
                        ) => (
                          <button
                            key={image}
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
                              src={
                                image
                              }
                              alt={`${selectedProduct.name} ${
                                index +
                                1
                              }`}
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

                  <div
                    style={{
                      color:
                        "#16a34a",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    In Stock ·{" "}
                    {
                      selectedProduct.stock
                    }{" "}
                    available
                  </div>

                  <div className="detail-buy">
                    <button
                      className="primary"
                      style={{
                        minHeight: 46,
                      }}
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
                      onClick={() =>
                        buyNow(
                          selectedProduct
                        )
                      }
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
                            src={
                              item.images[0]
                            }
                            alt={
                              item.name
                            }
                          />

                          <div>
                            <h4>
                              {item.name}
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
                                {item.qty}
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
                          total
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
                      onClick={
                        openCheckout
                      }
                    >
                      Proceed to Checkout
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
                    onChange={(
                      event
                    ) =>
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

      {checkoutOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setCheckoutOpen(false)
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
                Secure Checkout
              </h2>

              <button
                className="close"
                onClick={() =>
                  setCheckoutOpen(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div
                style={{
                  background:
                    "#f5f3ff",
                  color:
                    "#5b21b6",
                  padding: 12,
                  borderRadius: 9,
                  marginBottom: 17,
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Logged in as{" "}
                {user?.email}
              </div>

              <h3>
                Delivery Details
              </h3>

              <div className="field">
                <label>
                  Full Name
                </label>

                <input
                  name="name"
                  value={
                    address.name
                  }
                  onChange={
                    updateAddress
                  }
                  placeholder="Full name"
                  autoComplete="name"
                />
              </div>

              <div className="field">
                <label>
                  Mobile Number
                </label>

                <input
                  name="phone"
                  value={
                    address.phone
                  }
                  onChange={
                    updateAddress
                  }
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel"
                />
              </div>

              <div className="field">
                <label>
                  Address
                </label>

                <input
                  name="line1"
                  value={
                    address.line1
                  }
                  onChange={
                    updateAddress
                  }
                  placeholder="House number, street, area"
                  autoComplete="street-address"
                />
              </div>

              <div className="field">
                <label>
                  City
                </label>

                <input
                  name="city"
                  value={
                    address.city
                  }
                  onChange={
                    updateAddress
                  }
                  placeholder="City"
                />
              </div>

              <div className="field">
                <label>
                  State
                </label>

                <input
                  name="state"
                  value={
                    address.state
                  }
                  onChange={
                    updateAddress
                  }
                  placeholder="State"
                />
              </div>

              <div className="field">
                <label>
                  PIN Code
                </label>

                <input
                  name="pincode"
                  value={
                    address.pincode
                  }
                  onChange={
                    updateAddress
                  }
                  placeholder="6-digit PIN code"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>

              <div className="summary">
                <div className="summary-row">
                  <span>
                    Items
                  </span>

                  <strong>
                    {cartCount}
                  </strong>
                </div>

                <div className="summary-row">
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
                className="primary"
                style={{
                  width: "100%",
                  minHeight: 48,
                  marginTop: 12,
                }}
                onClick={
                  startPayment
                }
                disabled={
                  paymentLoading
                }
              >
                {paymentLoading
                  ? "Preparing Secure Payment..."
                  : `Pay ${formatPrice(
                      total
                    )}`}
              </button>

              <p
                style={{
                  color: "#6b7280",
                  fontSize: 12,
                  lineHeight: 1.5,
                  marginBottom: 0,
                }}
              >
                Mobile number is used
                for delivery details.
                No OTP is requested at
                checkout.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
