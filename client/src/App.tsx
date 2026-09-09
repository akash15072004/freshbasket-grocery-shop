import React, { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import axios from "axios";
import {
  ShoppingCart,
  Search,
  Heart,
  User,
  MapPin,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Package,
  LayoutDashboard,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Truck,
  Leaf,
  BarChart3,
  Boxes,
  Users,
  X,
  Eye,
  RefreshCw,
  Ban,
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  ShoppingBag,
  History,
  PlusCircle,
  MinusCircle,
  Tag,
  Bell,
  Award,
  Gift,
  Settings,
  LockKeyhole,
  Save,
  Mail,
  Phone,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://freshbasket-grocery-shop.onrender.com");

const API = `${API_BASE}/api`;

type Product = {
  _id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  mrp: number;
  sellingPrice: number;
  unit: string;
  stock: number;
  rating: number;
  lowStockThreshold?: number;
  isActive?: boolean;
};

const demoCats = [
  "All",
  "Atta & Flour",
  "Rice",
  "Dal & Pulses",
  "Oil & Ghee",
  "Spices",
  "Dairy",
  "Snacks",
  "Beverages",
  "Instant Food",
  "Fruits",
  "Vegetables",
  "Personal Care",
  "Household",
];

const demoProducts: Product[] = Array.from({ length: 20 }, (_, i) => ({
  _id: "demo-" + i,
  name: [
    "Premium Wheat Atta",
    "Basmati Rice",
    "Toor Dal",
    "Sunflower Oil",
    "Tata Salt",
    "Fresh Milk",
    "Masala Noodles",
    "Classic Biscuits",
    "Fruit Juice",
    "Fresh Apples",
    "Farm Potatoes",
    "Bath Soap",
    "Dishwash Liquid",
    "Premium Tea",
    "Brown Sugar",
    "Moong Dal",
    "Red Chilli Powder",
    "Turmeric Powder",
    "Mixed Namkeen",
    "Corn Flakes",
  ][i],
  brand: ["FreshFarm", "DailyChoice", "Nature's Best", "PureHarvest"][i % 4],
  category: demoCats[(i % 13) + 1],
  description:
    "Fresh, quality grocery essential for your everyday kitchen.",
  image: `https://images.unsplash.com/photo-${
    [
      "1542838132-92c53300491e",
      "1586201375761-83865001e31c",
      "1601050690597-df0568f70950",
      "1474979266404-7eaacbcd87c3",
      "1604908176997-125f25cc6f3d",
    ][i % 5]
  }?auto=format&fit=crop&w=700&q=80`,
  mrp: 99 + i * 16,
  sellingPrice: 79 + i * 13,
  unit: i % 3 === 0 ? "5 kg" : i % 3 === 1 ? "1 kg" : "1 pack",
  stock: 10 + i,
  rating: 4 + (i % 5) / 10,
}));

const adminHeaders = () => {
  const token = localStorage.getItem("fb-token");
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-white border border-red-200 rounded-3xl p-10 text-center">
      <X className="mx-auto text-red-300" size={42} />
      <h3 className="font-bold text-xl mt-3">Something went wrong</h3>
      <p className="text-red-600 mt-2 text-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-5 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-2">
          <RefreshCw size={16} /> Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon = Package, title, text }: { icon?: any; title: string; text?: string }) {
  return (
    <div className="bg-white border rounded-3xl py-16 px-6 text-center">
      <Icon className="mx-auto text-slate-300" size={48} />
      <h3 className="font-bold text-xl mt-3">{title}</h3>
      {text && <p className="text-slate-500 mt-2 text-sm">{text}</p>}
    </div>
  );
}

function AccessibilityStyles() {
  return (
    <style>{`
      html { scroll-behavior: smooth; }
      body { overflow-x: hidden; }
      * { scrollbar-width: thin; }
      button, a, input, select, textarea { -webkit-tap-highlight-color: transparent; }
      button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
        outline: 3px solid rgba(16, 185, 129, 0.35);
        outline-offset: 2px;
      }
      input::placeholder, textarea::placeholder { color: #94a3b8; opacity: 1; }
      @media (max-width: 640px) {
        .fb-mobile-stack { flex-direction: column !important; align-items: stretch !important; }
        .fb-mobile-full { width: 100% !important; }
        .fb-mobile-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .fb-mobile-card { border-radius: 1.25rem !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
      }
    `}</style>
  );
}

function statusClass(status: string) {
  if (status === "Delivered")
    return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelled")
    return "bg-red-50 text-red-600";
  if (status === "Out for Delivery")
    return "bg-blue-50 text-blue-700";
  if (status === "Packed" || status === "Processing")
    return "bg-purple-50 text-purple-700";
  if (status === "Confirmed")
    return "bg-cyan-50 text-cyan-700";
  return "bg-amber-50 text-amber-700";
}

function useStore() {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [cart, setCart] = useState<any[]>(
    () => JSON.parse(localStorage.getItem("fb-cart") || "[]")
  );
  const [user, setUser] = useState<any>(
    () => JSON.parse(localStorage.getItem("fb-user") || "null")
  );
  const [wishlist, setWishlist] = useState<string[]>(
    () => JSON.parse(localStorage.getItem("fb-wishlist") || "[]")
  );

  useEffect(() => {
    localStorage.setItem("fb-wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  const toggleWishlist = (id: string) => {
    setWishlist((items) =>
      items.includes(id) ? items.filter((x) => x !== id) : [...items, id]
    );
  };

  const isWishlisted = (id: string) => wishlist.includes(id);

  useEffect(() => {
    localStorage.setItem("fb-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const onReorder = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (Array.isArray(detail)) setCart(detail);
    };
    window.addEventListener("freshbasket-reorder", onReorder);
    return () => window.removeEventListener("freshbasket-reorder", onReorder);
  }, []);

  useEffect(() => {
    axios
      .get(API + "/products")
      .then((r) => setProducts(r.data.data))
      .catch(() => {});
  }, []);

  const add = (p: Product) =>
    setCart((c) => {
      const x = c.find((i) => i.product._id === p._id);
      return x
        ? c.map((i) =>
            i.product._id === p._id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...c, { product: p, quantity: 1 }];
    });

  const qty = (id: string, n: number) =>
    setCart((c) =>
      c
        .map((i) =>
          i.product._id === id
            ? { ...i, quantity: Math.max(0, i.quantity + n) }
            : i
        )
        .filter((i) => i.quantity)
    );

  const clearCart = () => setCart([]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fb-user");
    localStorage.removeItem("fb-token");
  };

  return {
    products,
    cart,
    add,
    qty,
    clearCart,
    user,
    setUser,
    logout,
    setProducts,
    wishlist,
    toggleWishlist,
    isWishlisted,
  };
}

function Layout({
  children,
  store,
}: {
  children: React.ReactNode;
  store: ReturnType<typeof useStore>;
}) {
  const nav = useNavigate();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setCount(
      store.cart.reduce((s: number, i: any) => s + i.quantity, 0)
    );
  }, [store.cart]);

  const loadNotifications = async () => {
    if (!store.user) {
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }
    try {
      const r = await axios.get(API + "/notifications", { headers: adminHeaders() });
      setNotifications(Array.isArray(r.data.data) ? r.data.data : []);
      setUnreadNotifications(Number(r.data.unreadCount || 0));
    } catch {
      // Notifications are non-blocking; keep the rest of the app usable.
    }
  };

  useEffect(() => {
    loadNotifications();
    if (!store.user) return;
    const timer = window.setInterval(loadNotifications, 20000);
    return () => window.clearInterval(timer);
  }, [store.user]);

  const markNotificationRead = async (id: string) => {
    try {
      await axios.patch(API + "/notifications/" + id + "/read", {}, { headers: adminHeaders() });
      await loadNotifications();
    } catch {}
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.patch(API + "/notifications/read-all", {}, { headers: adminHeaders() });
      await loadNotifications();
    } catch {}
  };

  return (
    <>
      <AccessibilityStyles />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-slate-950 focus:text-white focus:px-4 focus:py-3 focus:rounded-xl focus:font-bold">
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-5">
          <Link to="/" className="flex items-center gap-2 min-w-fit">
            <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white grid place-items-center">
              <Leaf size={21} />
            </span>
            <span className="font-bold text-xl tracking-tight">
              Fresh<span className="text-emerald-600">Basket</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={17} className="text-emerald-600" />
            <span>
              Deliver to <b className="text-slate-900">Lucknow, UP</b>
            </span>
          </div>

          <div className="flex-1 hidden sm:block relative">
            <Search
              className="absolute left-4 top-3.5 text-slate-400"
              size={19}
            />
            <input
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  nav(
                    "/shop?q=" +
                      (e.target as HTMLInputElement).value
                  );
              }}
              placeholder="Search groceries, brands & more..."
              className="w-full rounded-2xl bg-slate-100 pl-11 pr-4 py-3 outline-none focus:ring-2 ring-emerald-200"
            />
          </div>

          <Link
            to="/wishlist"
            className="hidden sm:block p-2 text-slate-600"
          >
            <Heart />
          </Link>

          {store.user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 text-slate-600 hover:text-emerald-600"
                aria-label="Notifications"
              >
                <Bell size={21} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1 grid place-items-center">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-12 w-[340px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-xl z-[60] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div>
                      <b>Notifications</b>
                      <p className="text-xs text-slate-500">{unreadNotifications} unread</p>
                    </div>
                    {unreadNotifications > 0 && (
                      <button onClick={markAllNotificationsRead} className="text-xs font-bold text-emerald-700">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length ? notifications.slice(0, 8).map((n) => (
                      <button
                        key={n._id}
                        type="button"
                        onClick={() => markNotificationRead(String(n._id))}
                        className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${n.read ? "bg-white" : "bg-emerald-50/60"}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 w-8 h-8 rounded-full grid place-items-center ${n.read ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                            <Bell size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900">{n.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </button>
                    )) : (
                      <div className="py-10 text-center text-sm text-slate-500">
                        <Bell className="mx-auto text-slate-300" size={28} />
                        <p className="mt-2">No notifications yet.</p>
                      </div>
                    )}
                  </div>
                  {notifications.length > 8 && (
                    <Link to="/notifications" onClick={() => setShowNotifications(false)} className="block text-center py-3 text-sm font-bold text-emerald-700 hover:bg-slate-50">
                      View all notifications
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          <Link
            to={
              store.user?.role === "admin"
                ? "/admin"
                : store.user?.role === "delivery"
                ? "/delivery"
                : "/account"
            }
            className="p-2 text-slate-600"
          >
            <User />
          </Link>

          <Link
            to="/cart"
            className="relative p-2 text-slate-700"
          >
            <ShoppingCart />
            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] rounded-full min-w-5 h-5 grid place-items-center">
              {count}
            </span>
          </Link>
        </div>
      </header>

      <div id="main-content">
        {children}
      </div>

      <footer className="mt-20 bg-slate-950 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-white font-bold text-xl mb-3">
              FreshBasket
            </div>
            <p className="text-sm leading-6">
              Your neighborhood grocery store, now at your
              fingertips. Fresh products, fair prices and fast
              delivery.
            </p>
          </div>
          <div>
            <b className="text-white">Shop</b>
            <p className="mt-3 text-sm">All Products</p>
            <p className="text-sm">Fresh Produce</p>
            <p className="text-sm">Daily Essentials</p>
          </div>
          <div>
            <b className="text-white">Help</b>
            <p className="mt-3 text-sm">Delivery Information</p>
            <p className="text-sm">Returns & Refunds</p>
            <p className="text-sm">Contact Support</p>
          </div>
          <div>
            <b className="text-white">Why FreshBasket?</b>
            <p className="mt-3 text-sm">✓ Quality checked products</p>
            <p className="text-sm">✓ Same-day local delivery</p>
            <p className="text-sm">✓ Secure payments</p>
          </div>
        </div>
        <div className="border-t border-white/10 text-center text-xs py-5">
          © 2026 FreshBasket. Built for local grocery businesses.
        </div>
      </footer>
    </>
  );
}

function ProductCard({
  p,
  add,
  isWishlisted,
  onToggleWishlist,
}: {
  p: Product;
  add: (p: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
}) {
  const disc = Math.round((1 - p.sellingPrice / p.mrp) * 100);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-3 shadow-soft hover:-translate-y-1 transition group">
      <Link to={"/product/" + p._id}>
        <div className="relative rounded-2xl bg-slate-50 overflow-hidden aspect-square">
          <img
            src={p.image}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[11px] font-bold px-2 py-1 rounded-full">
            {disc}% OFF
          </span>
          {onToggleWishlist && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist();
              }}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 shadow-sm grid place-items-center ${
                isWishlisted ? "text-red-500" : "text-slate-500 hover:text-red-500"
              }`}
            >
              <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </Link>
      <div className="p-2">
        <p className="text-xs text-slate-400 mt-1">{p.brand}</p>
        <Link to={"/product/" + p._id}>
          <h3 className="font-semibold mt-1 line-clamp-1">
            {p.name}
          </h3>
        </Link>
        <p className="text-xs text-slate-500 mt-1">
          {p.unit} ·{" "}
          <span className="text-amber-500">★ {p.rating}</span>
        </p>
        <div className="flex items-end justify-between mt-3">
          <div>
            <b className="text-lg">{money(p.sellingPrice)}</b>{" "}
            <del className="text-xs text-slate-400">
              {money(p.mrp)}
            </del>
          </div>
          <button
            onClick={() => p.stock > 0 && p.isActive !== false && add(p)}
            disabled={p.stock <= 0 || p.isActive === false}
            className={`rounded-xl px-3 py-2 flex items-center gap-1 text-sm font-semibold ${
              p.stock <= 0 || p.isActive === false
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {p.stock <= 0 || p.isActive === false ? "Unavailable" : <><Plus size={16} /> Add</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Home({ store }: { store: ReturnType<typeof useStore> }) {
  const [banners, setBanners] = useState<any[]>([]);

  useEffect(() => {
    axios.get(API + "/banners")
      .then((r) => setBanners(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => setBanners([]));
  }, []);

  return (
    <Layout store={store}>
      <main>
        {banners.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 pt-6">
            <div className="space-y-4">
              {banners.map((b) => (
                <div key={b._id} className="relative overflow-hidden rounded-[2rem] bg-slate-900 min-h-[230px] md:min-h-[300px]">
                  <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="relative z-10 min-h-[230px] md:min-h-[300px] flex items-center p-7 md:p-12">
                    <div className="max-w-2xl text-white">
                      {b.offerLabel && <span className="inline-flex bg-emerald-500 px-3 py-1 rounded-full text-xs font-bold">{b.offerLabel}</span>}
                      <h2 className="text-3xl md:text-5xl font-bold mt-3">{b.title}</h2>
                      {b.subtitle && <p className="mt-3 text-white/85 text-sm md:text-base max-w-xl">{b.subtitle}</p>}
                      <Link to={b.link || "/shop"} className="inline-flex items-center gap-2 mt-6 bg-white text-emerald-700 px-5 py-3 rounded-xl font-bold">
                        {b.buttonText || "Shop now"} <ArrowRight size={17} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="gradient">
          <div className="max-w-7xl mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-xs font-bold">
                <Truck size={14} /> Same-day delivery available
              </span>
              <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] mt-5 tracking-tight">
                Your daily groceries.
                <br />
                <span className="text-emerald-600">
                  Fresh & simple.
                </span>
              </h1>
              <p className="text-slate-600 mt-5 max-w-lg text-lg">
                Everything your kitchen needs, delivered from your
                local store with care.
              </p>
              <div className="flex gap-3 mt-7">
                <Link
                  to="/shop"
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
                >
                  Shop now <ArrowRight size={18} />
                </Link>
                <Link
                  to="/shop?category=Fruits"
                  className="bg-white border px-6 py-3 rounded-2xl font-bold"
                >
                  Fresh produce
                </Link>
              </div>
              <div className="flex gap-7 mt-8 text-sm">
                <span>
                  <b>4.8/5</b>
                  <br />
                  <span className="text-slate-500">
                    customer rating
                  </span>
                </span>
                <span>
                  <b>30–60 min</b>
                  <br />
                  <span className="text-slate-500">
                    typical delivery
                  </span>
                </span>
                <span>
                  <b>₹499+</b>
                  <br />
                  <span className="text-slate-500">
                    free delivery
                  </span>
                </span>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85"
                alt="Fresh groceries"
                loading="lazy"
                className="rounded-[2.5rem] w-full h-[390px] object-cover shadow-2xl"
              />
              <div className="absolute bottom-5 left-5 glass rounded-2xl p-4 shadow-lg flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-emerald-100 grid place-items-center text-emerald-700">
                  <ShieldCheck />
                </span>
                <div>
                  <b className="text-sm">Quality guaranteed</b>
                  <p className="text-xs text-slate-500">
                    Freshness checked daily
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 pt-12">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-emerald-600 font-bold text-sm">
                EXPLORE
              </p>
              <h2 className="text-2xl md:text-3xl font-bold">
                Shop by category
              </h2>
            </div>
            <Link
              to="/shop"
              className="text-emerald-700 font-semibold flex gap-1 items-center"
            >
              View all <ChevronRight size={17} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {demoCats.slice(1, 8).map((c, i) => (
              <Link
                key={c}
                to={"/shop?category=" + encodeURIComponent(c)}
                className="bg-white border rounded-2xl p-4 text-center hover:border-emerald-300 hover:shadow-soft"
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 grid place-items-center text-emerald-600 text-xl">
                  {["🌾", "🍚", "🥣", "🫒", "🌶️", "🥛", "🍪"][i]}
                </div>
                <p className="text-xs font-semibold mt-3">{c}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 pt-14">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-emerald-600 font-bold text-sm">
                POPULAR PICKS
              </p>
              <h2 className="text-2xl md:text-3xl font-bold">
                Best sellers
              </h2>
            </div>
            <Link
              to="/shop"
              className="text-emerald-700 font-semibold"
            >
              See all →
            </Link>
          </div>
          {store.products.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {store.products.slice(0, 10).map((p) => (
                <ProductCard key={p._id} p={p} add={store.add} isWishlisted={store.isWishlisted(p._id)} onToggleWishlist={() => store.toggleWishlist(p._id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={ShoppingBag} title="Products are temporarily unavailable" text="Please refresh and try again." />
          )}
        </section>

        <section className="max-w-7xl mx-auto px-4 pt-14">
          <div className="rounded-[2rem] bg-emerald-600 text-white p-7 md:p-10 grid md:grid-cols-2 items-center gap-5">
            <div>
              <p className="text-emerald-100 text-sm font-bold">
                THIS WEEK
              </p>
              <h2 className="text-3xl font-bold mt-1">
                Fresh deals up to 30% off
              </h2>
              <p className="text-emerald-50 mt-2">
                Stock up on everyday essentials and save more.
              </p>
            </div>
            <Link
              to="/shop"
              className="justify-self-start md:justify-self-end bg-white text-emerald-700 px-6 py-3 rounded-2xl font-bold"
            >
              Explore deals
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}

function Shop({ store }: { store: ReturnType<typeof useStore> }) {
  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  const [cat, setCat] = useState(qs.get("category") || "All");
  const [q, setQ] = useState(qs.get("q") || "");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    axios.get(API + "/categories").then((r) => {
      if (Array.isArray(r.data.data)) setCategories(r.data.data);
    }).catch(() => {});
  }, []);

  const shopCats = categories.length ? ["All", ...categories.map((c) => c.name)] : demoCats;

  const filtered = useMemo(
    () =>
      store.products.filter(
        (p) =>
          (cat === "All" || p.category === cat) &&
          (!q ||
            `${p.name} ${p.brand} ${p.category}`
              .toLowerCase()
              .includes(q.toLowerCase()))
      ),
    [store.products, cat, q]
  );

  return (
    <Layout store={store}>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-emerald-600 text-sm font-bold">
              GROCERY AISLE
            </p>
            <h1 className="text-3xl font-bold">All products</h1>
            <p className="text-slate-500 mt-1">
              {filtered.length} products available
            </p>
          </div>
          <div className="relative md:w-80">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-white border rounded-xl py-2.5 pl-10 pr-3 outline-none focus:ring-2 ring-emerald-100"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto py-6">
          {shopCats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold ${
                cat === c
                  ? "bg-emerald-600 text-white"
                  : "bg-white border text-slate-600"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {filtered.map((p) => (
              <ProductCard
                key={p._id}
                p={p}
                add={store.add}
                isWishlisted={store.isWishlisted(p._id)}
                onToggleWishlist={() => store.toggleWishlist(p._id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="No products found"
            text="Try another product or category."
          />
        )}
      </main>
    </Layout>
  );
}

function ProductPage({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const id = useLocation().pathname.split("/").pop();
  const p = store.products.find((x) => x._id === id);

  if (!p) {
    return (
      <Layout store={store}>
        <main className="max-w-6xl mx-auto px-4 py-10">
          <EmptyState icon={Package} title="Product not found" text="This product may have been removed or is no longer available." />
        </main>
      </Layout>
    );
  }

  return (
    <Layout store={store}>
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="bg-white rounded-[2rem] p-4 border">
            <img
              src={p.image}
              alt={p.name}
              className="w-full aspect-square object-cover rounded-[1.5rem]"
            />
          </div>
          <div className="py-3">
            <p className="text-emerald-600 font-bold text-sm">
              {p.category.toUpperCase()}
            </p>
            <h1 className="text-4xl font-bold mt-2">{p.name}</h1>
            <p className="text-slate-500 mt-2">
              {p.brand} · {p.unit}
            </p>
            <div className="flex gap-2 mt-4">
              <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-bold">
                ★ {p.rating} rating
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${p.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
              </span>
            </div>
            <div className="mt-7">
              <b className="text-4xl">
                {money(p.sellingPrice)}
              </b>{" "}
              <del className="text-slate-400 ml-2">
                {money(p.mrp)}
              </del>
            </div>
            <p className="text-slate-600 leading-7 mt-6">
              {p.description} Carefully selected for freshness and
              reliable everyday quality.
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => p.stock > 0 && p.isActive !== false && store.add(p)}
                disabled={p.stock <= 0 || p.isActive === false}
                className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${p.stock > 0 && p.isActive !== false ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
              >
                <ShoppingCart size={19} /> Add to cart
              </button>
              <button
                type="button"
                onClick={() => store.toggleWishlist(p._id)}
                className={`px-5 py-4 border rounded-2xl font-bold inline-flex items-center justify-center gap-2 ${
                  store.isWishlisted(p._id) ? "text-red-500 border-red-200 bg-red-50" : "text-slate-700"
                }`}
              >
                <Heart size={19} fill={store.isWishlisted(p._id) ? "currentColor" : "none"} />
                {store.isWishlisted(p._id) ? "Saved" : "Wishlist"}
              </button>
              <Link
                to="/cart"
                className="px-6 py-4 border rounded-2xl font-bold"
              >
                View cart
              </Link>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

function Wishlist({ store }: { store: ReturnType<typeof useStore> }) {
  const saved = store.products.filter((p) => store.wishlist.includes(p._id));

  return (
    <Layout store={store}>
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-emerald-600 text-sm font-bold">SAVED FOR LATER</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">My Wishlist</h1>
            <p className="text-slate-500 mt-2">{saved.length} saved product{saved.length === 1 ? "" : "s"}</p>
          </div>
          <Link to="/shop" className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold">Continue shopping</Link>
        </div>

        {saved.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {saved.map((p) => (
              <ProductCard
                key={p._id}
                p={p}
                add={store.add}
                isWishlisted={true}
                onToggleWishlist={() => store.toggleWishlist(p._id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-3xl p-12 text-center">
            <Heart className="mx-auto text-slate-300" size={52} />
            <h2 className="text-xl font-bold mt-4">Your wishlist is empty</h2>
            <p className="text-slate-500 mt-2">Save products you love and find them here anytime.</p>
            <Link to="/shop" className="inline-block mt-5 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold">Browse products</Link>
          </div>
        )}
      </main>
    </Layout>
  );
}

function Cart({ store }: { store: ReturnType<typeof useStore> }) {
  const nav = useNavigate();
  const sub = store.cart.reduce(
    (s: number, i: any) =>
      s + i.product.sellingPrice * i.quantity,
    0
  );
  const delivery = sub >= 499 ? 0 : 39;
  const total = sub + delivery;

  return (
    <Layout store={store}>
      <main className="max-w-6xl mx-auto px-4 py-9">
        <h1 className="text-3xl font-bold">Your cart</h1>

        {!store.cart.length ? (
          <div className="bg-white border rounded-3xl text-center py-20 mt-6">
            <ShoppingCart
              className="mx-auto text-slate-300"
              size={55}
            />
            <h2 className="text-xl font-bold mt-4">
              Your cart is empty
            </h2>
            <Link
              to="/shop"
              className="inline-block mt-5 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6 mt-6">
            <div className="space-y-3">
              {store.cart.map((i) => (
                <div
                  key={i.product._id}
                  className="bg-white border rounded-3xl p-4 flex gap-4 items-center"
                >
                  <img
                    src={i.product.image}
                    alt={i.product.name}
                    loading="lazy"
                    className="w-20 h-20 rounded-2xl object-cover bg-slate-50"
                  />
                  <div className="flex-1">
                    <b>{i.product.name}</b>
                    <p className="text-sm text-slate-500">
                      {i.product.unit}
                    </p>
                    <b className="text-emerald-700">
                      {money(i.product.sellingPrice)}
                    </b>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() =>
                        store.qty(i.product._id, -1)
                      }
                      className="p-2"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="w-5 text-center font-bold">
                      {i.quantity}
                    </span>
                    <button
                      onClick={() =>
                        store.qty(i.product._id, 1)
                      }
                      className="p-2"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      store.qty(i.product._id, -99)
                    }
                    className="p-2 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white border rounded-3xl p-6 h-fit sticky top-24">
              <h2 className="font-bold text-lg">
                Order summary
              </h2>
              <div className="space-y-3 mt-5 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <b>{money(sub)}</b>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <b>{delivery ? money(delivery) : "FREE"}</b>
                </div>
                <div className="border-t pt-4 flex justify-between text-lg">
                  <b>Total</b>
                  <b>{money(total)}</b>
                </div>
              </div>
              <button
                onClick={() =>
                  store.user ? nav("/checkout") : nav("/login")
                }
                className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl mt-6 font-bold"
              >
                Proceed to checkout
              </button>
              {sub < 499 && (
                <p className="text-xs text-slate-500 text-center mt-3">
                  Add {money(499 - sub)} more for free delivery
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

function Login({ store }: { store: ReturnType<typeof useStore> }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("customer@grocery.com");
  const [password, setPassword] = useState("Customer@123");
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [loginRole, setLoginRole] = useState<"customer" | "admin" | "delivery">("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [mobileSent, setMobileSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const clearMessages = () => { setError(""); setMessage(""); setDevOtp(""); };

  const sendEmailOtp = async (purpose: "register" | "forgot") => {
    clearMessages(); setLoadingOtp("email");
    try {
      const r = await axios.post(API + "/auth/send-email-otp", { email, purpose });
      setEmailSent(true); setMessage(r.data.message || "Email OTP sent.");
      if (r.data.devOtp) setDevOtp(String(r.data.devOtp));
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to send email OTP."); }
    finally { setLoadingOtp(""); }
  };

  const verifyEmailOtp = async (purpose: "register" | "forgot") => {
    clearMessages(); setLoadingOtp("verify-email");
    try {
      await axios.post(API + "/auth/verify-email-otp", { email, otp: emailOtp, purpose });
      setEmailVerified(true); setMessage("Email verified successfully.");
    } catch (e: any) { setError(e?.response?.data?.message || "Invalid email OTP."); }
    finally { setLoadingOtp(""); }
  };

  const sendMobileOtp = async () => {
    clearMessages(); setLoadingOtp("mobile");
    try {
      const r = await axios.post(API + "/auth/send-mobile-otp", { phone, purpose: "register" });
      setMobileSent(true); setMessage(r.data.message || "Mobile OTP sent.");
      if (r.data.devOtp) setDevOtp(String(r.data.devOtp));
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to send mobile OTP."); }
    finally { setLoadingOtp(""); }
  };

  const verifyMobileOtp = async () => {
    clearMessages(); setLoadingOtp("verify-mobile");
    try {
      await axios.post(API + "/auth/verify-mobile-otp", { phone, otp: mobileOtp, purpose: "register" });
      setMobileVerified(true); setMessage("Mobile number verified successfully.");
    } catch (e: any) { setError(e?.response?.data?.message || "Invalid mobile OTP."); }
    finally { setLoadingOtp(""); }
  };

  const submit = async (e: any) => {
    e.preventDefault(); clearMessages();
    try {
      if (mode === "forgot") {
        if (!emailVerified) return setError("Verify the email OTP first.");
        if (resetPassword.length < 8) return setError("New password must be at least 8 characters.");
        if (resetPassword !== resetConfirm) return setError("Passwords do not match.");
        await axios.post(API + "/auth/reset-password", { email, newPassword: resetPassword });
        setMessage("Password reset successfully. You can now sign in.");
        setMode("login"); setPassword(""); setEmailOtp(""); setEmailSent(false); setEmailVerified(false);
        return;
      }

      if (mode === "register") {
        if (password.length < 8) return setError("Password must be at least 8 characters.");
        if (password !== confirmPassword) return setError("Passwords do not match.");
        if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""))) return setError("Enter a valid 10-digit mobile number.");
        if (!emailVerified || !mobileVerified) return setError("Please verify both email and mobile OTP before creating the account.");
      }

      if (mode === "register") {
        const registerResponse = await axios.post(API + "/auth/register", { name, email, password, phone: phone.replace(/\D/g, "") });
        store.setUser(registerResponse.data.data.user);
        localStorage.setItem("fb-user", JSON.stringify(registerResponse.data.data.user));
        localStorage.setItem("fb-token", registerResponse.data.data.token);
        nav("/");
        return;
      }
      const r = await axios.post(API + "/auth/login", { email, password, role: loginRole });
      store.setUser(r.data.data.user);
      localStorage.setItem("fb-user", JSON.stringify(r.data.data.user));
      localStorage.setItem("fb-token", r.data.data.token);
      const role = r.data.data.user.role;
      if (role === "admin") nav("/admin"); else if (role === "delivery") nav("/delivery"); else nav("/");
    } catch (err: any) {
      // Registration has its own endpoint; avoid an unnecessary login call for it.
      if (mode === "register") {
        try {
          const registerResponse = await axios.post(API + "/auth/register", { name, email, password, phone: phone.replace(/\D/g, "") });
          store.setUser(registerResponse.data.data.user);
          localStorage.setItem("fb-user", JSON.stringify(registerResponse.data.data.user));
          localStorage.setItem("fb-token", registerResponse.data.data.token);
          nav("/");
          return;
        } catch (registerErr: any) {
          setError(registerErr?.response?.data?.message || "Registration failed.");
          return;
        }
      }
      setError(err?.response?.data?.message || "Unable to login. Check backend and credentials.");
    }
  };

  const switchMode = (next: "login" | "register" | "forgot") => {
    clearMessages(); setMode(next); setEmailOtp(""); setMobileOtp(""); setEmailSent(false); setMobileSent(false); setEmailVerified(false); setMobileVerified(false);
    if (next === "register") { setEmail(""); setPassword(""); setName(""); setPhone(""); setConfirmPassword(""); }
  };

  return (
    <div className="min-h-screen gradient grid place-items-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-[2rem] border shadow-soft p-7">
        <Link to="/" className="flex justify-center items-center gap-2 font-bold text-xl">
          <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white grid place-items-center"><Leaf /></span>FreshBasket
        </Link>
        <h1 className="text-2xl font-bold text-center mt-7">{mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Forgot password"}</h1>

        {mode === "login" && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700 mb-3">Login as</p>
            <div className="grid grid-cols-3 gap-2">
              {[['customer','Customer'],['admin','Admin'],['delivery','Delivery']].map(([value,label]) => (
                <button key={value} type="button" onClick={() => { const role=value as any; setLoginRole(role); if(role==='customer'){setEmail('customer@grocery.com');setPassword('Customer@123')}else if(role==='admin'){setEmail('admin@grocery.com');setPassword('Admin@123')}else{setEmail('');setPassword('')} }} className={`border rounded-xl py-2.5 text-sm font-bold ${loginRole===value?'border-emerald-600 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-600'}`}>{label}</button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 mt-7">
          {mode === "register" && <>
            <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full border rounded-xl p-3 outline-none" />
            <input required value={phone} onChange={e=>{setPhone(e.target.value);setMobileVerified(false)}} placeholder="10-digit mobile number" className="w-full border rounded-xl p-3 outline-none" />
          </>}
          <input required type="email" value={email} onChange={e=>{setEmail(e.target.value);setEmailVerified(false)}} placeholder="Email" className="w-full border rounded-xl p-3 outline-none" />

          {mode === "register" && <div className="border rounded-2xl p-4 bg-slate-50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold"><Mail size={17}/> Email verification</div>
            {!emailVerified ? <>
              <div className="flex gap-2"><input value={emailOtp} onChange={e=>setEmailOtp(e.target.value)} placeholder="Email OTP" className="flex-1 border rounded-xl p-3 bg-white"/><button type="button" onClick={()=>sendEmailOtp("register")} disabled={loadingOtp==="email"} className="px-3 rounded-xl bg-slate-950 text-white font-bold">{emailSent?'Resend':'Send OTP'}</button></div>
              {emailSent && <button type="button" onClick={()=>verifyEmailOtp("register")} disabled={loadingOtp==="verify-email"} className="w-full bg-emerald-600 text-white rounded-xl py-2.5 font-bold">Verify email</button>}
            </> : <p className="text-emerald-700 text-sm font-bold">✓ Email verified</p>}
          </div>}

          {mode === "register" && <div className="border rounded-2xl p-4 bg-slate-50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold"><Phone size={17}/> Mobile verification</div>
            {!mobileVerified ? <>
              <div className="flex gap-2"><input value={mobileOtp} onChange={e=>setMobileOtp(e.target.value)} placeholder="Mobile OTP" className="flex-1 border rounded-xl p-3 bg-white"/><button type="button" onClick={sendMobileOtp} disabled={loadingOtp==="mobile"} className="px-3 rounded-xl bg-slate-950 text-white font-bold">{mobileSent?'Resend':'Send OTP'}</button></div>
              {mobileSent && <button type="button" onClick={verifyMobileOtp} disabled={loadingOtp==="verify-mobile"} className="w-full bg-emerald-600 text-white rounded-xl py-2.5 font-bold">Verify mobile</button>}
            </> : <p className="text-emerald-700 text-sm font-bold">✓ Mobile verified</p>}
          </div>}

          {mode !== "forgot" && <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full border rounded-xl p-3 outline-none" />}
          {mode === "register" && <input required type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full border rounded-xl p-3 outline-none" />}

          {mode === "forgot" && <>
            <div className="flex gap-2"><input value={emailOtp} onChange={e=>setEmailOtp(e.target.value)} placeholder="Email OTP" className="flex-1 border rounded-xl p-3"/><button type="button" onClick={()=>sendEmailOtp("forgot")} disabled={loadingOtp==="email"} className="px-3 rounded-xl bg-slate-950 text-white font-bold">{emailSent?'Resend':'Send OTP'}</button></div>
            {emailSent && !emailVerified && <button type="button" onClick={()=>verifyEmailOtp("forgot")} className="w-full bg-emerald-600 text-white rounded-xl py-3 font-bold">Verify OTP</button>}
            <input required type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} placeholder="New password (min 8 characters)" className="w-full border rounded-xl p-3" />
            <input required type="password" value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)} placeholder="Confirm new password" className="w-full border rounded-xl p-3" />
          </>}

          {devOtp && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Development OTP: <b>{devOtp}</b>. Configure the email/SMS provider in `.env` for real delivery.</div>}
          {message && <p className="text-emerald-700 text-sm font-semibold">{message}</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button className="w-full bg-emerald-600 text-white rounded-xl py-3.5 font-bold">{mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Reset password"}</button>
        </form>

        {mode === "login" && <button type="button" onClick={()=>switchMode("forgot")} className="w-full text-center text-emerald-700 font-bold text-sm mt-4">Forgot password?</button>}
        <div className="text-center text-sm mt-5 text-slate-500">{mode==='login'?'New here? ':mode==='register'?'Already have an account? ':'Remembered your password? '}<button type="button" onClick={()=>switchMode(mode==='login'?'register':'login')} className="text-emerald-700 font-bold">{mode==='login'?'Create account':'Sign in'}</button></div>
      </div>
    </div>
  );
}

function Checkout({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<any | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [rewardData, setRewardData] = useState<any | null>(null);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [rewardMessage, setRewardMessage] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "Lucknow",
    pincode: "226001",
    slot: "6 PM – 9 PM",
    payment: "COD",
  });

  const sub = store.cart.reduce(
    (s: number, i: any) =>
      s + Number(i.product.sellingPrice || 0) * Number(i.quantity || 0),
    0
  );
  const couponDiscount = Number(coupon?.discount || 0);
  const requestedRewardPoints = Math.max(0, Math.floor(Number(redeemPoints || 0)));
  const rewardDiscountPreview = rewardData?.settings?.enabled
    ? Math.min(
        requestedRewardPoints * Number(rewardData.settings.rupeesPerPoint || 0),
        Math.max(0, sub - couponDiscount),
        sub * (Number(rewardData.settings.maxRedeemPercent || 50) / 100)
      )
    : 0;
  const delivery = sub >= 499 ? 0 : 39;
  const total = Math.max(0, sub - couponDiscount - rewardDiscountPreview + delivery);

  useEffect(() => {
    if (!store.user) return;
    axios.get(API + "/rewards", { headers: adminHeaders() })
      .then((r) => setRewardData(r.data.data))
      .catch(() => setRewardData(null));
  }, [store.user]);

  useEffect(() => {
    if (!store.user) return;
    setForm((current) => ({
      ...current,
      name: current.name || store.user?.name || "",
      phone: current.phone || store.user?.phone || "",
    }));
    setAddressLoading(true);
    axios.get(API + "/addresses", { headers: adminHeaders() })
      .then((r) => {
        const list = Array.isArray(r.data.data) ? r.data.data : [];
        setSavedAddresses(list);
        const defaultAddress = list.find((a: any) => a.isDefault) || list[0];
        if (defaultAddress) {
          setSelectedAddressId(String(defaultAddress._id));
          setForm((current) => ({
            ...current,
            name: defaultAddress.name || store.user?.name || "",
            phone: defaultAddress.phone || store.user?.phone || "",
            address: defaultAddress.address || "",
            city: defaultAddress.city || "",
            pincode: defaultAddress.pincode || "",
          }));
        }
      })
      .catch(() => setSavedAddresses([]))
      .finally(() => setAddressLoading(false));
  }, [store.user]);

  const applyRewards = () => {
    const points = Number(redeemPoints || 0);
    if (!rewardData?.settings?.enabled) return setRewardMessage("Rewards are currently unavailable.");
    if (!Number.isInteger(points) || points <= 0) return setRewardMessage("Enter valid reward points.");
    if (points < Number(rewardData.settings.minRedeemPoints)) return setRewardMessage(`Minimum ${rewardData.settings.minRedeemPoints} points are required.`);
    if (points > Number(rewardData.points || 0)) return setRewardMessage("You do not have enough reward points.");
    if (rewardDiscountPreview <= 0) return setRewardMessage("These points cannot be redeemed on this order.");
    setRewardMessage(`${points} points selected — ${money(rewardDiscountPreview)} discount.`);
  };

  const removeRewards = () => {
    setRedeemPoints("");
    setRewardMessage("");
  };

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCoupon(null);
      setCouponMessage("Enter a coupon code.");
      return;
    }
    setCouponLoading(true);
    setCouponMessage("");
    try {
      const r = await axios.post(API + "/coupons/validate", { code, subtotal: sub }, { headers: adminHeaders() });
      setCoupon(r.data.data);
      setCouponMessage(`${r.data.data.code} applied — ${money(r.data.data.discount)} discount`);
    } catch (e: any) {
      setCoupon(null);
      setCouponMessage(e?.response?.data?.message || "Invalid coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode("");
    setCouponMessage("");
  };

  const selectAddress = (address: any) => {
    setSelectedAddressId(String(address._id));
    setForm((current) => ({
      ...current,
      name: address.name || current.name,
      phone: address.phone || current.phone,
      address: address.address || "",
      city: address.city || "",
      pincode: address.pincode || "",
    }));
  };

  const validate = () => {
    const name = form.name.trim();
    const phone = form.phone.replace(/\D/g, "");
    const address = form.address.trim();
    const city = form.city.trim();
    const pincode = form.pincode.replace(/\D/g, "");

    if (!store.user) return "Please sign in before placing an order.";
    if (!store.cart.length) return "Your cart is empty.";
    if (name.length < 2) return "Please enter your full name.";
    if (!/^[6-9]\d{9}$/.test(phone)) return "Please enter a valid 10-digit mobile number.";
    if (address.length < 5) return "Please enter a complete delivery address.";
    if (city.length < 2) return "Please enter your city.";
    if (!/^\d{6}$/.test(pincode)) return "Please enter a valid 6-digit pincode.";
    if (!form.slot) return "Please select a delivery slot.";
    if (!["COD", "ONLINE"].includes(form.payment)) return "Please select a valid payment method.";

    for (const item of store.cart) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return `Invalid quantity for ${item.product.name}.`;
      }
      if (Number(item.product.stock || 0) < quantity) {
        return `${item.product.name} has only ${Number(item.product.stock || 0)} unit(s) available.`;
      }
      if (item.product.isActive === false) {
        return `${item.product.name} is currently unavailable.`;
      }
    }

    return "";
  };

  const place = async () => {
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    const payload = {
      items: store.cart.map((i) => ({
        product: i.product._id,
        name: i.product.name,
        image: i.product.image,
        price: i.product.sellingPrice,
        quantity: Number(i.quantity),
        unit: i.product.unit,
      })),
      address: {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ""),
        address: form.address.trim(),
        city: form.city.trim(),
        pincode: form.pincode.replace(/\D/g, ""),
      },
      paymentMethod: form.payment,
      deliverySlot: form.slot,
      couponCode: coupon?.code || undefined,
      rewardPoints: requestedRewardPoints || undefined,
    };

    try {
      const token = localStorage.getItem("fb-token");
      const r = await axios.post(API + "/orders", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      localStorage.setItem(
        "fb-last-order",
        JSON.stringify({
          id: r.data.data?._id || "FB" + Date.now(),
          total: r.data.data?.total ?? total,
        })
      );

      store.clearCart();
      setSubmitting(false);
      nav("/order-success");
    } catch (e: any) {
      setSubmitting(false);
      setError(
        e?.response?.data?.message ||
          "Unable to place order. Please check your details and try again."
      );
    }
  };

  return (
    <Layout store={store}>
      <main className="max-w-6xl mx-auto px-4 py-9">
        <h1 className="text-3xl font-bold">Checkout</h1>

        {error && (
          <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_380px] gap-6 mt-6">
          <div className="space-y-5">
            <div className="bg-white border rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Delivery address</h2>
                  <p className="text-xs text-slate-500 mt-1">Choose a saved address or enter a new one.</p>
                </div>
                <Link to="/profile" className="text-emerald-700 text-sm font-bold">Manage addresses</Link>
              </div>
              {savedAddresses.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {savedAddresses.map((a: any) => (
                    <button
                      type="button"
                      key={a._id}
                      onClick={() => selectAddress(a)}
                      className={`min-w-[210px] text-left border rounded-2xl p-3 ${selectedAddressId === String(a._id) ? "border-emerald-600 bg-emerald-50" : "bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <b className="text-sm">{a.label}</b>
                        {a.isDefault && <span className="text-[10px] font-bold text-emerald-700">DEFAULT</span>}
                      </div>
                      <p className="text-xs font-semibold mt-1">{a.name}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">{a.address}, {a.city} - {a.pincode}</p>
                    </button>
                  ))}
                </div>
              )}
              {addressLoading && <p className="text-xs text-slate-400 mt-2">Loading saved addresses...</p>}
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {[
                  ["name", "Full name"],
                  ["phone", "Phone"],
                  ["address", "House, street, area"],
                  ["city", "City"],
                  ["pincode", "Pincode"],
                ].map(([key, placeholder], index) => (
                  <input
                    key={key}
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                    className={`border rounded-xl p-3 ${
                      index === 2 ? "sm:col-span-2" : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white border rounded-3xl p-6">
              <h2 className="font-bold">Delivery slot</h2>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  "9 AM – 12 PM",
                  "12 PM – 3 PM",
                  "3 PM – 6 PM",
                  "6 PM – 9 PM",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, slot: s })}
                    className={`border rounded-xl p-3 text-sm ${
                      form.slot === s
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : ""
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border rounded-3xl p-6">
              <h2 className="font-bold">Payment</h2>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {["COD", "ONLINE"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, payment: s })}
                    className={`border rounded-xl p-4 font-semibold ${
                      form.payment === s
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : ""
                    }`}
                  >
                    {s === "COD" ? "Cash on Delivery" : "UPI / Card"}
                  </button>
                ))}
              </div>
              {form.payment === "ONLINE" && (
                <p className="text-xs text-slate-500 mt-3">
                  Online payment is currently a test/placeholder flow.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border rounded-3xl p-6 h-fit">
            <h2 className="font-bold">Order summary</h2>
            <div className="mt-5 rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <p className="font-bold">Have a coupon?</p>
              <div className="flex gap-2 mt-3">
                <input value={couponCode} disabled={!!coupon} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" className="flex-1 border rounded-xl px-3 py-2.5 bg-white" />
                {coupon ? <button onClick={removeCoupon} className="border rounded-xl px-4 font-bold">Remove</button> : <button disabled={couponLoading} onClick={applyCoupon} className="bg-emerald-600 text-white rounded-xl px-4 font-bold disabled:opacity-50">{couponLoading ? "Checking..." : "Apply"}</button>}
              </div>
              {couponMessage && <p className={`text-xs mt-2 font-semibold ${coupon ? "text-emerald-700" : "text-red-600"}`}>{couponMessage}</p>}
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 p-4 bg-amber-50">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-600" />
                <p className="font-bold">Use reward points</p>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Balance: <b>{Number(rewardData?.points || 0)} points</b>
                {rewardData?.settings?.rupeesPerPoint ? ` · ${money(rewardData.settings.rupeesPerPoint)} per point` : ""}
              </p>
              {rewardData?.settings?.enabled ? (
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    min={rewardData.settings.minRedeemPoints}
                    step="1"
                    max={rewardData.points || 0}
                    value={redeemPoints}
                    onChange={(e) => { setRedeemPoints(e.target.value); setRewardMessage(""); }}
                    placeholder={`Min ${rewardData.settings.minRedeemPoints}`}
                    className="flex-1 border rounded-xl px-3 py-2.5 bg-white"
                  />
                  {requestedRewardPoints > 0 ? (
                    <button onClick={removeRewards} className="border rounded-xl px-4 font-bold bg-white">Remove</button>
                  ) : (
                    <button onClick={applyRewards} className="bg-amber-500 text-white rounded-xl px-4 font-bold">Use</button>
                  )}
                </div>
              ) : <p className="text-xs text-slate-500 mt-2">Rewards are currently disabled.</p>}
              {rewardMessage && <p className={`text-xs mt-2 font-semibold ${rewardMessage.includes("selected") ? "text-emerald-700" : "text-red-600"}`}>{rewardMessage}</p>}
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {store.cart.map((item: any) => (
                <div key={item.product._id} className="flex justify-between gap-3">
                  <span className="text-slate-600">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="font-semibold">
                    {money(Number(item.product.sellingPrice || 0) * Number(item.quantity || 0))}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between">
                <span>Subtotal</span>
                <span>{money(sub)}</span>
              </div>
              <div className="flex justify-between">
                <span>Coupon discount</span>
                <span className="text-emerald-600">{couponDiscount ? `-${money(couponDiscount)}` : money(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Reward discount</span>
                <span className="text-amber-600">{rewardDiscountPreview ? `-${money(rewardDiscountPreview)}` : money(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{delivery ? money(delivery) : "FREE"}</span>
              </div>
              <div className="border-t mt-3 pt-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <button
              disabled={submitting || !store.cart.length}
              onClick={place}
              className="w-full bg-emerald-600 disabled:opacity-50 text-white rounded-2xl py-4 font-bold mt-6"
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </div>
        </div>
      </main>
    </Layout>
  );
}

function Success({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const o = JSON.parse(
    localStorage.getItem("fb-last-order") || "{}"
  );

  return (
    <Layout store={store}>
      <div className="max-w-xl mx-auto text-center px-4 py-20">
        <div className="w-20 h-20 mx-auto bg-emerald-100 text-emerald-600 rounded-full grid place-items-center">
          <ShieldCheck size={42} />
        </div>
        <h1 className="text-3xl font-bold mt-6">
          Order placed successfully!
        </h1>
        <p className="text-slate-500 mt-2">
          Your order{" "}
          <b>#{String(o.id || "FB102938").slice(-10)}</b>{" "}
          has been confirmed.
        </p>
        <div className="bg-white border rounded-3xl p-5 mt-7 text-left">
          <div className="flex justify-between">
            <span>Total</span>
            <b>{money(o.total || 0)}</b>
          </div>
          <div className="flex justify-between mt-2">
            <span>Delivery</span>
            <span>Today · 6 PM – 9 PM</span>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-center">
          <Link
            to="/shop"
            className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold"
          >
            Continue shopping
          </Link>
          <Link
            to="/orders"
            className="border px-5 py-3 rounded-xl font-bold"
          >
            Track order
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function Account({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  return (
    <Layout store={store}>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-white border rounded-3xl p-7">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-2xl font-bold">
              {(store.user?.name || "G").charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {store.user?.name || "Guest"}
              </h1>
              <p className="text-slate-500">
                {store.user?.email ||
                  "Sign in to manage your account"}
              </p>
            </div>
          </div>

          {store.user ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
              <Link
                to="/profile"
                className="border rounded-2xl p-5"
              >
                <User className="text-emerald-600" />
                <b className="block mt-3">Profile & addresses</b>
                <span className="text-xs text-slate-500">Manage your details and saved addresses</span>
              </Link>

              <Link
                to="/orders"
                className="border rounded-2xl p-5"
              >
                <Package className="text-emerald-600" />
                <b className="block mt-3">My orders</b>
                <span className="text-xs text-slate-500">
                  Track and reorder
                </span>
              </Link>

              <Link
                to="/wishlist"
                className="border rounded-2xl p-5"
              >
                <Heart className="text-emerald-600" />
                <b className="block mt-3">Wishlist</b>
                <span className="text-xs text-slate-500">
                  Saved products
                </span>
              </Link>

              <Link
                to="/rewards"
                className="border rounded-2xl p-5"
              >
                <Award className="text-amber-500" />
                <b className="block mt-3">Rewards</b>
                <span className="text-xs text-slate-500">
                  Earn and redeem points
                </span>
              </Link>

              <button
                onClick={store.logout}
                className="border rounded-2xl p-5 text-left"
              >
                <LogOut className="text-red-500" />
                <b className="block mt-3">Sign out</b>
                <span className="text-xs text-slate-500">
                  End this session
                </span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-block mt-7 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold"
            >
              Sign in
            </Link>
          )}
        </div>
      </main>
    </Layout>
  );
}

function ProfilePage({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const [profile, setProfile] = useState({ name: "", phone: "", email: "" });
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingAccount, setSavingAccount] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [emailChangeOtp, setEmailChangeOtp] = useState("");
  const [emailChangeSent, setEmailChangeSent] = useState(false);
  const [mobileChangeOtp, setMobileChangeOtp] = useState("");
  const [mobileChangeSent, setMobileChangeSent] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyAddress = { label: "Home", name: "", phone: "", address: "", city: "", state: "", pincode: "", isDefault: false };
  const [addressForm, setAddressForm] = useState<any>(emptyAddress);

  const load = async () => {
    if (!store.user) return;
    setLoading(true); setError("");
    try {
      const [me, ar] = await Promise.all([
        axios.get(API + "/auth/me", { headers: adminHeaders() }),
        axios.get(API + "/addresses", { headers: adminHeaders() }),
      ]);
      const u = me.data.data || {};
      setProfile({ name: u.name || "", phone: u.phone || "", email: u.email || "" });
      setAccountEmail(u.email || "");
      setAddresses(Array.isArray(ar.data.data) ? ar.data.data : []);
      store.setUser({ ...store.user, name: u.name || store.user.name, phone: u.phone || store.user.phone, email: u.email || store.user.email });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load profile.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [store.user?.id]);

  const saveProfile = async () => {
    setSavingProfile(true); setMessage(""); setError("");
    try {
      const r = await axios.patch(API + "/profile", { name: profile.name }, { headers: adminHeaders() });
      const u = r.data.data;
      store.setUser({ ...store.user, name: u.name, phone: u.phone, email: u.email });
      localStorage.setItem("fb-user", JSON.stringify({ ...store.user, name: u.name, phone: u.phone, email: u.email }));
      setMessage("Profile updated successfully.");
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to update profile."); }
    finally { setSavingProfile(false); }
  };

  const sendAccountEmailOtp = async () => {
    setSavingAccount(true); setMessage(""); setError(""); setDevOtp("");
    try {
      const r = await axios.post(API + "/profile/send-email-otp", { email: accountEmail }, { headers: adminHeaders() });
      setEmailChangeSent(true); setMessage(r.data.message || "Email OTP sent.");
      if (r.data.devOtp) setDevOtp(String(r.data.devOtp));
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to send email OTP."); }
    finally { setSavingAccount(false); }
  };

  const verifyAccountEmailOtp = async () => {
    setSavingAccount(true); setMessage(""); setError("");
    try {
      const r = await axios.post(API + "/profile/verify-email-otp", { email: accountEmail, otp: emailChangeOtp }, { headers: adminHeaders() });
      const u = r.data.data || {};
      const nextUser = { ...store.user, email: u.email || accountEmail, emailVerified: true };
      store.setUser(nextUser as any);
      localStorage.setItem("fb-user", JSON.stringify(nextUser));
      setAccountEmail(u.email || accountEmail); setProfile((current) => ({ ...current, email: u.email || accountEmail }));
      setEmailChangeSent(false); setEmailChangeOtp(""); setDevOtp(""); setMessage("Login email verified and updated successfully.");
    } catch (e: any) { setError(e?.response?.data?.message || "Invalid email OTP."); }
    finally { setSavingAccount(false); }
  };

  const sendAccountMobileOtp = async () => {
    setSavingAccount(true); setMessage(""); setError(""); setDevOtp("");
    try {
      const r = await axios.post(API + "/profile/send-mobile-otp", { phone: profile.phone }, { headers: adminHeaders() });
      setMobileChangeSent(true); setMessage(r.data.message || "Mobile OTP sent.");
      if (r.data.devOtp) setDevOtp(String(r.data.devOtp));
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to send mobile OTP."); }
    finally { setSavingAccount(false); }
  };

  const verifyAccountMobileOtp = async () => {
    setSavingAccount(true); setMessage(""); setError("");
    try {
      const r = await axios.post(API + "/profile/verify-mobile-otp", { phone: profile.phone, otp: mobileChangeOtp }, { headers: adminHeaders() });
      const u = r.data.data || {};
      const nextUser = { ...store.user, phone: u.phone || profile.phone, phoneVerified: true };
      store.setUser(nextUser as any); localStorage.setItem("fb-user", JSON.stringify(nextUser));
      setProfile((current) => ({ ...current, phone: u.phone || current.phone }));
      setMobileChangeSent(false); setMobileChangeOtp(""); setDevOtp(""); setMessage("Mobile number verified and updated successfully.");
    } catch (e: any) { setError(e?.response?.data?.message || "Invalid mobile OTP."); }
    finally { setSavingAccount(false); }
  };

  const changeCustomerPassword = async () => {
    setMessage(""); setError("");
    if (accountPassword.newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (accountPassword.newPassword !== accountPassword.confirmPassword) return setError("New password and confirmation do not match.");
    setChangingPassword(true);
    try {
      await axios.patch(API + "/profile/password", {
        currentPassword: accountPassword.currentPassword,
        newPassword: accountPassword.newPassword,
      }, { headers: adminHeaders() });
      setAccountPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password changed successfully.");
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to change password."); }
    finally { setChangingPassword(false); }
  };

  const resetAddress = () => { setEditingId(null); setAddressForm({ ...emptyAddress, name: profile.name, phone: profile.phone }); setShowForm(false); };
  const saveAddress = async () => {
    setMessage(""); setError("");
    try {
      if (editingId) await axios.put(API + "/addresses/" + editingId, addressForm, { headers: adminHeaders() });
      else await axios.post(API + "/addresses", addressForm, { headers: adminHeaders() });
      await load(); resetAddress(); setMessage(editingId ? "Address updated successfully." : "Address added successfully.");
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to save address."); }
  };
  const editAddress = (a: any) => { setEditingId(String(a._id)); setAddressForm({ label: a.label || "Home", name: a.name || "", phone: a.phone || "", address: a.address || "", city: a.city || "", state: a.state || "", pincode: a.pincode || "", isDefault: !!a.isDefault }); setShowForm(true); };
  const deleteAddress = async (id: string) => {
    if (!window.confirm("Delete this saved address?")) return;
    try { await axios.delete(API + "/addresses/" + id, { headers: adminHeaders() }); await load(); setMessage("Address deleted successfully."); }
    catch (e: any) { setError(e?.response?.data?.message || "Unable to delete address."); }
  };
  const makeDefault = async (id: string) => {
    try { await axios.patch(API + "/addresses/" + id + "/default", {}, { headers: adminHeaders() }); await load(); setMessage("Default address updated."); }
    catch (e: any) { setError(e?.response?.data?.message || "Unable to update default address."); }
  };

  if (!store.user) return <NavigateToLogin />;

  return (
    <Layout store={store}>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-3xl font-bold">Customer Profile</h1><p className="text-slate-500 mt-1">Manage your profile and saved delivery addresses.</p></div>
          <button onClick={load} className="border rounded-xl p-2"><RefreshCw size={18} /></button>
        </div>
        {loading ? <div className="bg-white border rounded-3xl py-16 text-center mt-6 text-slate-500">Loading profile...</div> : (
          <>
            {message && <div className="mt-5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 text-sm font-semibold">{message}</div>}
            {error && <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>}
            <section className="bg-white border rounded-3xl p-6 mt-6">
              <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-slate-100 grid place-items-center"><ShieldCheck size={20} className="text-slate-700" /></div><div><h2 className="text-xl font-bold">Account & security</h2><p className="text-sm text-slate-500">Verify your email and mobile number with OTP and manage your password.</p></div></div>
              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <div className="border rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2"><label className="text-sm font-semibold">Login email</label><span className={`text-xs font-bold px-2 py-1 rounded-full ${store.user?.emailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{store.user?.emailVerified ? "Verified" : "Not verified"}</span></div>
                  <input type="email" value={accountEmail} onChange={e=>{setAccountEmail(e.target.value);setEmailChangeSent(false)}} className="mt-2 w-full border rounded-xl p-3" placeholder="you@example.com" />
                  {!store.user?.emailVerified || accountEmail.toLowerCase() !== String(store.user?.email || "").toLowerCase() ? <>
                    <div className="flex gap-2 mt-3"><input value={emailChangeOtp} onChange={e=>setEmailChangeOtp(e.target.value)} placeholder="Email OTP" className="flex-1 border rounded-xl p-3"/><button type="button" onClick={sendAccountEmailOtp} disabled={savingAccount} className="px-3 rounded-xl bg-slate-950 text-white font-bold">{emailChangeSent ? "Resend" : "Send OTP"}</button></div>
                    {emailChangeSent && <button type="button" onClick={verifyAccountEmailOtp} disabled={savingAccount} className="w-full mt-2 bg-emerald-600 text-white rounded-xl py-2.5 font-bold">Verify & update email</button>}
                  </> : <p className="text-xs text-slate-500 mt-2">Changing this email requires OTP verification.</p>}
                </div>
                <div className="border rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2"><label className="text-sm font-semibold">Mobile number</label><span className={`text-xs font-bold px-2 py-1 rounded-full ${store.user?.phoneVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{store.user?.phoneVerified ? "Verified" : "Not verified"}</span></div>
                  <input value={profile.phone} onChange={e=>{setProfile({...profile, phone:e.target.value});setMobileChangeSent(false)}} className="mt-2 w-full border rounded-xl p-3" placeholder="10-digit mobile" />
                  <div className="flex gap-2 mt-3"><input value={mobileChangeOtp} onChange={e=>setMobileChangeOtp(e.target.value)} placeholder="Mobile OTP" className="flex-1 border rounded-xl p-3"/><button type="button" onClick={sendAccountMobileOtp} disabled={savingAccount} className="px-3 rounded-xl bg-slate-950 text-white font-bold">{mobileChangeSent ? "Resend" : "Send OTP"}</button></div>
                  {mobileChangeSent && <button type="button" onClick={verifyAccountMobileOtp} disabled={savingAccount} className="w-full mt-2 bg-emerald-600 text-white rounded-xl py-2.5 font-bold">Verify & update mobile</button>}
                </div>
              </div>
              <div className="border rounded-2xl p-4 mt-5">
                <label className="text-sm font-semibold">Change password</label>
                <div className="grid md:grid-cols-3 gap-2 mt-2"><input type="password" value={accountPassword.currentPassword} onChange={e=>setAccountPassword({...accountPassword,currentPassword:e.target.value})} placeholder="Current password" className="w-full border rounded-xl p-3"/><input type="password" value={accountPassword.newPassword} onChange={e=>setAccountPassword({...accountPassword,newPassword:e.target.value})} placeholder="New password (min 8)" className="w-full border rounded-xl p-3"/><input type="password" value={accountPassword.confirmPassword} onChange={e=>setAccountPassword({...accountPassword,confirmPassword:e.target.value})} placeholder="Confirm password" className="w-full border rounded-xl p-3"/></div>
                <button onClick={changeCustomerPassword} disabled={changingPassword} className="mt-3 bg-slate-950 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{changingPassword ? "Changing..." : "Change password"}</button>
              </div>
              {devOtp && <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Development OTP: <b>{devOtp}</b>. Configure the email/SMS provider in `.env` for real delivery.</div>}
            </section>

            <section className="mt-6">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Saved addresses</h2><p className="text-sm text-slate-500">Use these addresses quickly during checkout.</p></div><button onClick={() => { setEditingId(null); setAddressForm({ ...emptyAddress, name: profile.name, phone: profile.phone, isDefault: addresses.length === 0 }); setShowForm(true); }} className="bg-emerald-600 text-white rounded-xl px-4 py-3 font-bold flex items-center gap-2"><Plus size={18} /> Add address</button></div>
              {showForm && <div className="bg-white border rounded-3xl p-6 mt-4"><div className="flex items-center justify-between"><h3 className="font-bold">{editingId ? "Edit address" : "Add address"}</h3><button onClick={resetAddress}><X /></button></div><div className="grid sm:grid-cols-2 gap-3 mt-4">{[["label","Label (Home / Work)"],["name","Full name"],["phone","Phone"],["address","House, street, area"],["city","City"],["state","State"],["pincode","Pincode"]].map(([k,p]) => <input key={k} placeholder={p} value={addressForm[k]} onChange={e => setAddressForm({ ...addressForm, [k]: e.target.value })} className={`border rounded-xl p-3 ${k === "address" ? "sm:col-span-2" : ""}`} />)}</div><label className="flex items-center gap-2 mt-4 text-sm font-semibold"><input type="checkbox" checked={!!addressForm.isDefault} onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })} /> Make this my default address</label><div className="flex gap-2 mt-5"><button onClick={saveAddress} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">{editingId ? "Update address" : "Save address"}</button><button onClick={resetAddress} className="border rounded-xl px-5 py-3 font-bold">Cancel</button></div></div>}
              {addresses.length ? <div className="grid md:grid-cols-2 gap-4 mt-4">{addresses.map((a: any) => <div key={a._id} className={`bg-white border rounded-3xl p-5 ${a.isDefault ? "border-emerald-300" : ""}`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><MapPin size={18} className="text-emerald-600" /><b>{a.label}</b></div>{a.isDefault && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Default</span>}</div><p className="font-semibold mt-4">{a.name}</p><p className="text-sm text-slate-600 mt-1">{a.phone}</p><p className="text-sm text-slate-600 mt-2">{a.address}</p><p className="text-sm text-slate-500 mt-1">{[a.city, a.state, a.pincode].filter(Boolean).join(", ")}</p><div className="flex flex-wrap gap-2 mt-5"><button onClick={() => editAddress(a)} className="border rounded-xl px-3 py-2 text-sm font-bold">Edit</button>{!a.isDefault && <button onClick={() => makeDefault(String(a._id))} className="border rounded-xl px-3 py-2 text-sm font-bold text-emerald-700">Make default</button>}<button onClick={() => deleteAddress(String(a._id))} className="border rounded-xl px-3 py-2 text-sm font-bold text-red-600">Delete</button></div></div>)}</div> : <div className="bg-white border rounded-3xl py-14 text-center mt-4"><MapPin className="mx-auto text-slate-300" size={42} /><p className="text-slate-500 mt-3">No saved addresses yet.</p><button onClick={() => { setAddressForm({ ...emptyAddress, name: profile.name, phone: profile.phone, isDefault: true }); setShowForm(true); }} className="text-emerald-700 font-bold mt-2">Add your first address →</button></div>}
            </section>
          </>
        )}
      </main>
    </Layout>
  );
}

function Orders({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reorderLoading, setReorderLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await axios.get(API + "/orders", {
        headers: adminHeaders(),
      });
      setOrders(r.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load your orders.");
      const last = localStorage.getItem("fb-last-order");
      setOrders(
        last
          ? [
              {
                _id: "local",
                status: "Confirmed",
                total: JSON.parse(last).total,
                createdAt: new Date(),
              },
            ]
          : []
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reorder = async (order: any) => {
    if (!Array.isArray(order.items) || !order.items.length) {
      window.alert("This order has no products to reorder.");
      return;
    }

    try {
      setReorderLoading(String(order._id));

      const nextItems: any[] = [];
      const unavailable: string[] = [];

      for (const item of order.items) {
        const productId =
          typeof item.product === "object"
            ? item.product?._id
            : item.product;

        if (!productId) {
          unavailable.push(item.name || "Product");
          continue;
        }

        let product = store.products.find(
          (p) => String(p._id) === String(productId)
        );

        if (!product) {
          try {
            const r = await axios.get(API + "/products/" + productId);
            product = r.data.data;
          } catch {
            product = undefined;
          }
        }

        if (!product || product.isActive === false || Number(product.stock || 0) <= 0) {
          unavailable.push(product?.name || item.name || "Product");
          continue;
        }

        const requestedQty = Math.max(1, Number(item.quantity || 1));
        const quantity = Math.min(requestedQty, Number(product.stock || 0));

        nextItems.push({
          product,
          quantity,
        });

        if (quantity < requestedQty) {
          unavailable.push(
            `${product.name} (only ${Number(product.stock || 0)} available)`
          );
        }
      }

      if (!nextItems.length) {
        window.alert("None of the products from this order are currently available.");
        return;
      }

      const existing = new Map(
        store.cart.map((item: any) => [String(item.product._id), item])
      );

      let merged = [...store.cart];
      for (const item of nextItems) {
        const key = String(item.product._id);
        const current = existing.get(key);

        if (current) {
          const maxStock = Number(item.product.stock || 0);
          const nextQty = Math.min(
            maxStock,
            Number(current.quantity || 0) + Number(item.quantity || 0)
          );
          merged = merged.map((x: any) =>
            String(x.product._id) === key
              ? { ...x, product: item.product, quantity: nextQty }
              : x
          );
        } else {
          merged.push(item);
        }
      }

      // Update the existing cart without changing the store's other cart actions.
      const cartEvent = new CustomEvent("freshbasket-reorder", {
        detail: merged,
      });
      window.dispatchEvent(cartEvent);
      localStorage.setItem("fb-cart", JSON.stringify(merged));

      if (unavailable.length) {
        window.alert(
          "Reorder added what was available. Skipped/limited: " +
            unavailable.join(", ")
        );
      }

      window.location.href = "/cart";
    } finally {
      setReorderLoading(null);
    }
  };

  const activeOrders = orders.filter(
    (o) => !["Delivered", "Cancelled"].includes(String(o.status))
  );
  const orderHistory = orders.filter(
    (o) => ["Delivered", "Cancelled"].includes(String(o.status))
  );

  const renderOrder = (o: any, history = false) => (
    <div
      key={String(o._id)}
      className="bg-white border rounded-3xl p-5"
    >
      <div className="flex justify-between gap-4">
        <div>
          <b>Order #{String(o._id).slice(-8)}</b>
          <p className="text-xs text-slate-500 mt-1">
            {new Date(o.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold h-fit ${statusClass(
            o.status
          )}`}
        >
          {o.status}
        </span>
      </div>

      {Array.isArray(o.items) && o.items.length > 0 && (
        <div className="mt-4 border-t pt-4 space-y-2">
          {o.items.map((item: any, index: number) => {
            const product = typeof item.product === "object" ? item.product : null;
            const name = product?.name || item.name || "Product";
            const image = product?.image || item.image;
            return (
              <div key={index} className="flex items-center gap-3">
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="w-12 h-12 rounded-xl object-cover border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Package size={20} className="text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{name}</p>
                  <p className="text-xs text-slate-500">
                    Qty: {item.quantity} × {money(item.price || product?.sellingPrice || 0)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t mt-4 pt-4 flex items-center justify-between gap-4">
        <div className="flex justify-between flex-1">
          <span>Total</span>
          <b>{money(o.total)}</b>
        </div>
        {o._id !== "local" && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              to={`/orders/${o._id}`}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700"
            >
              Track order
            </Link>
            <Link
              to={`/invoice/${o._id}`}
              className="border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-50"
            >
              Invoice
            </Link>
            {o.status === "Delivered" && (
              <button
                onClick={() => reorder(o)}
                disabled={reorderLoading === String(o._id)}
                className="border border-blue-200 text-blue-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-50 disabled:opacity-50"
              >
                {reorderLoading === String(o._id) ? "Adding..." : "Reorder"}
              </button>
            )}
            {o.status === "Delivered" && Array.isArray(o.items) && o.items.length > 0 && (
              <Link
                to={`/product/${typeof o.items[0].product === "object" ? o.items[0].product._id : o.items[0].product}`}
                className="border border-amber-200 text-amber-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-50"
              >
                Review product
              </Link>
            )}
            {["Pending", "Confirmed"].includes(o.status) && (
              <button
                onClick={async () => {
                  const ok = window.confirm(
                    "Are you sure you want to cancel this order?"
                  );
                  if (!ok) return;
                  try {
                    await axios.patch(
                      API + `/orders/${o._id}/cancel`,
                      {},
                      { headers: adminHeaders() }
                    );
                    await load();
                  } catch (e: any) {
                    window.alert(
                      e?.response?.data?.message || "Unable to cancel order."
                    );
                  }
                }}
                className="border border-red-200 text-red-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-50"
              >
                Cancel order
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Layout store={store}>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My orders</h1>
            <p className="text-slate-500 mt-1">
              Track your current orders and view your complete order history.
            </p>
          </div>
          <button onClick={load} className="border rounded-xl p-2">
            <RefreshCw size={18} />
          </button>
        </div>

        {loading ? (
          <div className="bg-white border rounded-3xl py-20 text-center mt-6">
            <RefreshCw className="mx-auto text-emerald-500 animate-spin" size={32} />
            <p className="text-slate-500 mt-3">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="mt-6"><PageError message={error} onRetry={load} /></div>
        ) : orders.length ? (
          <div className="space-y-8 mt-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Current Orders</h2>
                  <p className="text-sm text-slate-500">Orders that are still being processed or delivered.</p>
                </div>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
                  {activeOrders.length}
                </span>
              </div>
              {activeOrders.length ? (
                <div className="space-y-4">{activeOrders.map((o) => renderOrder(o))}</div>
              ) : (
                <div className="bg-white border rounded-3xl py-10 text-center">
                  <Package className="mx-auto text-slate-300" size={42} />
                  <p className="text-slate-500 mt-3">No current orders.</p>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Order History</h2>
                  <p className="text-sm text-slate-500">Delivered and cancelled orders.</p>
                </div>
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-bold">
                  {orderHistory.length}
                </span>
              </div>
              {orderHistory.length ? (
                <div className="space-y-4">{orderHistory.map((o) => renderOrder(o, true))}</div>
              ) : (
                <div className="bg-white border rounded-3xl py-10 text-center">
                  <Package className="mx-auto text-slate-300" size={42} />
                  <p className="text-slate-500 mt-3">No order history yet.</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="bg-white border rounded-3xl py-20 text-center mt-6">
            <Package className="mx-auto text-slate-300" size={50} />
            <h2 className="font-bold mt-4">No orders yet</h2>
            <Link to="/shop" className="text-emerald-700 font-bold mt-2 inline-block">Start shopping →</Link>
          </div>
        )}
      </main>
    </Layout>
  );
}


function RewardsPage({ store }: { store: ReturnType<typeof useStore> }) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await axios.get(API + "/rewards", { headers: adminHeaders() });
      setData(r.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load rewards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (!store.user) {
    return <Layout store={store}><main className="max-w-5xl mx-auto px-4 py-10"><EmptyState icon={Award} title="Sign in to view rewards" text="Earn points on delivered orders and use them on future purchases." /></main></Layout>;
  }

  return (
    <Layout store={store}>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-3xl font-bold">Loyalty & Rewards</h1><p className="text-slate-500 mt-1">Earn points when your orders are delivered and redeem them at checkout.</p></div>
          <button onClick={load} className="border rounded-xl p-2"><RefreshCw size={18} /></button>
        </div>
        {loading ? <div className="bg-white border rounded-3xl py-20 text-center mt-6"><RefreshCw className="mx-auto animate-spin text-amber-500" /><p className="text-slate-500 mt-3">Loading rewards...</p></div> : error ? <div className="mt-6"><PageError message={error} onRetry={load} /></div> : (
          <>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-3xl p-6"><Award className="text-amber-500" /><p className="text-sm text-slate-500 mt-5">Available points</p><b className="text-4xl">{Number(data?.points || 0)}</b></div>
              <div className="bg-white border rounded-3xl p-6"><Gift className="text-emerald-600" /><p className="text-sm text-slate-500 mt-5">Earning rate</p><b className="text-2xl">{Number(data?.settings?.pointsPer100 || 0)} pts</b><p className="text-xs text-slate-500 mt-1">per ₹100 spent</p></div>
              <div className="bg-white border rounded-3xl p-6"><CircleDollarSign className="text-blue-600" /><p className="text-sm text-slate-500 mt-5">Point value</p><b className="text-2xl">{money(Number(data?.settings?.rupeesPerPoint || 0))}</b><p className="text-xs text-slate-500 mt-1">per point</p></div>
            </div>
            <div className="bg-white border rounded-3xl p-6 mt-5"><h2 className="font-bold text-lg">How rewards work</h2><div className="grid md:grid-cols-3 gap-3 mt-4 text-sm"><div className="bg-slate-50 rounded-2xl p-4"><b>1. Shop</b><p className="text-slate-500 mt-1">Place your grocery order normally.</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>2. Get delivered</b><p className="text-slate-500 mt-1">Points are added when the order reaches Delivered.</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>3. Redeem</b><p className="text-slate-500 mt-1">Use eligible points as a discount at checkout.</p></div></div></div>
            <div className="bg-white border rounded-3xl overflow-hidden mt-5"><div className="p-6 border-b"><h2 className="font-bold text-lg">Points history</h2></div>{data?.transactions?.length ? <div className="divide-y">{data.transactions.map((t: any) => <div key={t._id} className="p-5 flex items-center justify-between gap-4"><div><b className="capitalize">{t.type}</b><p className="text-sm text-slate-500 mt-1">{t.description}</p><p className="text-xs text-slate-400 mt-1">{new Date(t.createdAt).toLocaleString("en-IN")}</p></div><span className={`font-bold ${Number(t.points) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{Number(t.points) > 0 ? "+" : ""}{t.points} pts</span></div>)}</div> : <div className="py-14 text-center text-slate-500">No reward activity yet. Complete a delivery to start earning.</div>}</div>
          </>
        )}
      </main>
    </Layout>
  );
}

function NotificationsPage({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!store.user) return;
    setLoading(true);
    setError("");
    try {
      const r = await axios.get(API + "/notifications", { headers: adminHeaders() });
      setNotifications(Array.isArray(r.data.data) ? r.data.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [store.user]);

  const markAll = async () => {
    try {
      await axios.patch(API + "/notifications/read-all", {}, { headers: adminHeaders() });
      await load();
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await axios.patch(API + "/notifications/" + id + "/read", {}, { headers: adminHeaders() });
      await load();
    } catch {}
  };

  return (
    <Layout store={store}>
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-slate-500 mt-1">Stay updated about your FreshBasket activity.</p>
          </div>
          <button onClick={markAll} className="border rounded-xl px-4 py-2 text-sm font-bold">Mark all read</button>
        </div>
        {loading ? (
          <div className="bg-white border rounded-3xl py-16 text-center mt-6 text-slate-500">Loading notifications...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mt-6">{error}</div>
        ) : notifications.length ? (
          <div className="mt-6 bg-white border rounded-3xl overflow-hidden">
            {notifications.map((n) => (
              <button key={n._id} onClick={() => markRead(String(n._id))} className={`w-full text-left p-5 border-b last:border-b-0 hover:bg-slate-50 ${n.read ? "" : "bg-emerald-50/50"}`}>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><Bell size={18} /></div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <b>{n.title}</b>
                      {!n.read && <span className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-full font-bold">NEW</span>}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-3xl py-20 text-center mt-6">
            <Bell className="mx-auto text-slate-300" size={48} />
            <h2 className="font-bold mt-4">No notifications yet</h2>
            <p className="text-slate-500 mt-1">Important order updates will appear here.</p>
          </div>
        )}
      </main>
    </Layout>
  );
}

function OrderTracking({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const { id } = useParams();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [paymentUpdating, setPaymentUpdating] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const r = await axios.get(API + `/orders/${id}`, {
        headers: adminHeaders(),
      });
      setOrder(r.data.data || null);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || "Unable to load this order."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [id]);

  if (!store.user) return <NavigateToLogin />;

  const steps = [
    "Pending",
    "Confirmed",
    "Processing",
    "Packed",
    "Out for Delivery",
    "Delivered",
  ];
  const currentIndex = order ? steps.indexOf(order.status) : -1;
  const isCancelled = order?.status === "Cancelled";

  const statusTime = (status: string) => {
    const history = Array.isArray(order?.statusHistory)
      ? order.statusHistory
      : [];

    const entry = history.find((item: any) => item.status === status);

    if (entry?.timestamp) {
      return new Date(entry.timestamp).toLocaleString();
    }

    if (status === "Pending" && order?.createdAt) {
      return new Date(order.createdAt).toLocaleString();
    }

    if (status === order?.status && order?.updatedAt) {
      return new Date(order.updatedAt).toLocaleString();
    }

    return "";
  };

  return (
    <Layout store={store}>
      <main className="max-w-4xl mx-auto px-4 py-10">
        <Link
          to="/orders"
          className="text-emerald-700 font-semibold text-sm"
        >
          ← Back to My Orders
        </Link>

        {loading ? (
          <div className="py-20 text-center text-slate-500">
            Loading order...
          </div>
        ) : error ? (
          <div className="bg-white border rounded-3xl p-8 mt-6 text-center">
            <Package className="mx-auto text-slate-300" size={48} />
            <h2 className="font-bold text-xl mt-4">Order not found</h2>
            <p className="text-slate-500 mt-2">{error}</p>
          </div>
        ) : order ? (
          <div className="space-y-5 mt-6">
            <section className="bg-white border rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Order details</p>
                  <h1 className="text-2xl font-bold mt-1">
                    Order #{String(order._id).slice(-8)}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Placed {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold h-fit ${statusClass(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
                <Link
                  to={`/invoice/${order._id}`}
                  className="border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-50"
                >
                  Invoice
                </Link>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-5 border-t">
                <div>
                  <p className="text-xs text-slate-500">Payment</p>
                  <p className="font-semibold mt-1">
                    {order.paymentMethod || "COD"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-semibold mt-1">{money(order.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Delivery slot</p>
                  <p className="font-semibold mt-1">
                    {order.deliverySlot || "Standard delivery"}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white border rounded-3xl p-6">
              <h2 className="text-xl font-bold">Items in this order</h2>
              <div className="mt-5 space-y-3">
                {(Array.isArray(order.items) ? order.items : []).map((item: any, index: number) => (
                  <div key={String(item.product || index)} className="flex items-center gap-3 border rounded-2xl p-3">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || "Product"}
                        className="w-14 h-14 rounded-xl object-cover bg-slate-50"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 grid place-items-center">
                        <Package size={20} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{item.name || "Product"}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.quantity} × {money(item.price)}{item.unit ? ` · ${item.unit}` : ""}
                      </p>
                    </div>
                    <b>{money(Number(item.price || 0) * Number(item.quantity || 0))}</b>
                  </div>
                ))}
              </div>
              <div className="border-t mt-5 pt-4 grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Delivery address</p>
                  <p className="font-semibold mt-1">
                    {order.address?.name || ""}
                    {order.address?.phone ? ` · ${order.address.phone}` : ""}
                  </p>
                  <p className="text-slate-600 mt-1">
                    {order.address?.address || ""}
                    {order.address?.city ? `, ${order.address.city}` : ""}
                    {order.address?.pincode ? ` - ${order.address.pincode}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Price breakdown</p>
                  <div className="mt-1 space-y-1">
                    <div className="flex justify-between"><span>Subtotal</span><b>{money(order.subtotal || 0)}</b></div>
                    <div className="flex justify-between"><span>Discount</span><b>{money(order.discount || 0)}</b></div>
                    <div className="flex justify-between"><span>Delivery</span><b>{Number(order.deliveryCharge || 0) ? money(order.deliveryCharge) : "FREE"}</b></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-bold">Track your order</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Status updates automatically every 15 seconds.
                  </p>
                </div>
                <button
                  onClick={load}
                  className="border rounded-xl p-2"
                  title="Refresh status"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {isCancelled ? (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
                  <div className="flex items-center gap-3 text-red-700">
                    <X size={22} />
                    <div>
                      <b>Order cancelled</b>
                      <p className="text-sm mt-1">
                        This order will not be delivered.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {steps.map((step, index) => {
                    const completed = index <= currentIndex;
                    const current = index === currentIndex;
                    return (
                      <div key={step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full grid place-items-center border-2 ${
                              completed
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "bg-white border-slate-200 text-slate-300"
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 size={20} />
                            ) : (
                              <Clock3 size={19} />
                            )}
                          </div>
                          {index < steps.length - 1 && (
                            <div
                              className={`w-0.5 h-12 ${
                                index < currentIndex
                                  ? "bg-emerald-500"
                                  : "bg-slate-200"
                              }`}
                            />
                          )}
                        </div>
                        <div className="pb-8 pt-1">
                          <p
                            className={`font-bold ${
                              completed ? "text-slate-900" : "text-slate-400"
                            }`}
                          >
                            {step}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            {current
                              ? "Current order status"
                              : completed
                              ? "Completed"
                              : "Pending"
                            }
                          </p>
                          {completed && statusTime(step) && (
                            <p className="text-xs text-slate-400 mt-1">
                              {statusTime(step)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid md:grid-cols-2 gap-5">
              <div className="bg-white border rounded-3xl p-6">
                <h2 className="font-bold text-lg">Delivery partner</h2>
                {order.deliveryPartner ? (
                  <div className="mt-4">
                    <p className="font-semibold">{order.deliveryPartner.name}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {order.deliveryPartner.email}
                    </p>
                    {order.deliveryPartner.phone && (
                      <p className="text-sm text-slate-500 mt-1">
                        {order.deliveryPartner.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-3">
                    Delivery partner will be assigned soon.
                  </p>
                )}
              </div>

              <div className="bg-white border rounded-3xl p-6">
                <h2 className="font-bold text-lg">Delivery address</h2>
                <div className="text-sm text-slate-600 mt-4 space-y-1">
                  <p>{order.address?.address || "Address not available"}</p>
                  <p>
                    {[order.address?.city, order.address?.state, order.address?.pincode]
                      .filter(Boolean)
                      .join(", ") || "Lucknow, 226001"}
                  </p>
                  {order.address?.phone && <p>Phone: {order.address.phone}</p>}
                </div>
              </div>
            </section>

            <section className="bg-white border rounded-3xl p-6">
              <h2 className="font-bold text-lg">Items</h2>
              <div className="divide-y mt-3">
                {(order.items || []).map((item: any, index: number) => (
                  <div
                    key={String(item.product || item.name) + index}
                    className="py-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-slate-500">
                        {item.quantity} × {money(item.price)}
                        {item.unit ? ` / ${item.unit}` : ""}
                      </p>
                    </div>
                    <b>{money(Number(item.price || 0) * Number(item.quantity || 0))}</b>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </Layout>
  );
}


function Invoice({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const { id } = useParams();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const r = await axios.get(API + `/orders/${id}`, {
        headers: adminHeaders(),
      });
      setOrder(r.data.data || null);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || "Unable to load this invoice."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!store.user) return <NavigateToLogin />;

  if (loading) {
    return (
      <Layout store={store}>
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <RefreshCw className="mx-auto text-emerald-500 animate-spin" size={32} />
          <p className="text-slate-500 mt-3">Loading invoice...</p>
        </main>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout store={store}>
        <main className="max-w-4xl mx-auto px-4 py-10">
          <PageError message={error || "Invoice not found."} onRetry={load} />
        </main>
      </Layout>
    );
  }

  const invoiceNumber =
    "FB-" +
    new Date(order.createdAt || Date.now()).getFullYear() +
    "-" +
    String(order._id).slice(-8).toUpperCase();

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const delivery = Number(order.deliveryCharge || 0);
  const total = Number(order.total || 0);

  return (
    <Layout store={store}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .invoice-print, .invoice-print * { visibility: visible !important; }
          .invoice-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="no-print flex items-center justify-between gap-3 mb-5">
          <Link
            to={`/orders/${order._id}`}
            className="text-emerald-700 font-semibold text-sm"
          >
            ← Back to Order
          </Link>

          <button
            onClick={() => window.print()}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 hover:bg-emerald-700"
          >
            Print / Save PDF
          </button>
        </div>

        <section className="invoice-print bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-7 sm:p-9 border-b">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white grid place-items-center">
                    <Leaf size={21} />
                  </span>
                  <h1 className="text-2xl font-bold">
                    Fresh<span className="text-emerald-600">Basket</span>
                  </h1>
                </div>
                <p className="text-sm text-slate-500 mt-3">
                  Your neighborhood grocery store
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-xs text-slate-400 uppercase font-bold">
                  Invoice
                </p>
                <h2 className="text-xl font-bold mt-1">{invoiceNumber}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Date: {new Date(order.createdAt).toLocaleDateString("en-IN")}
                </p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${statusClass(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-9 grid md:grid-cols-2 gap-6 border-b">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold">
                Bill To
              </p>
              <p className="font-bold mt-2">
                {order.address?.name || order.user?.name || "Customer"}
              </p>
              {order.user?.email && (
                <p className="text-sm text-slate-500 mt-1">{order.user.email}</p>
              )}
              {order.address?.phone && (
                <p className="text-sm text-slate-500 mt-1">
                  {order.address.phone}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase font-bold">
                Delivery Address
              </p>
              <p className="text-sm text-slate-600 mt-2 leading-6">
                {order.address?.address || "Address not available"}
                {order.address?.city ? `, ${order.address.city}` : ""}
                {order.address?.pincode ? ` - ${order.address.pincode}` : ""}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Slot: {order.deliverySlot || "Standard delivery"}
              </p>
            </div>
          </div>

          <div className="p-7 sm:p-9">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 pr-3">Item</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Price</th>
                    <th className="py-3 pl-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item: any, index: number) => (
                    <tr key={String(item.product || index) + index}>
                      <td className="py-4 pr-3">
                        <p className="font-semibold">{item.name || "Product"}</p>
                        {item.unit && (
                          <p className="text-xs text-slate-400 mt-1">
                            {item.unit}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center">{item.quantity}</td>
                      <td className="py-4 px-3 text-right">
                        {money(Number(item.price || 0))}
                      </td>
                      <td className="py-4 pl-3 text-right font-semibold">
                        {money(
                          Number(item.price || 0) * Number(item.quantity || 0)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto max-w-sm mt-7 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <b>{money(subtotal)}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <b>{money(discount)}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery</span>
                <b>{delivery ? money(delivery) : "FREE"}</b>
              </div>
              <div className="border-t pt-3 mt-3 flex justify-between text-lg">
                <span className="font-bold">Grand Total</span>
                <b className="text-emerald-700">{money(total)}</b>
              </div>
            </div>
          </div>

          <div className="px-7 sm:px-9 py-5 border-t bg-slate-50 text-sm">
            <div className="flex flex-col sm:flex-row justify-between gap-2">
              <span>
                Payment method: <b>{order.paymentMethod || "COD"}</b>
              </span>
              <span className="text-slate-500">
                Order #{String(order._id).slice(-8)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Thank you for shopping with FreshBasket.
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}

function ProductAdmin({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const emptyForm = () => ({
    name: "",
    brand: "",
    category: "Atta & Flour",
    description: "",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=80",
    sellingPrice: 99,
    mrp: 120,
    unit: "1 pack",
    stock: 20,
    lowStockThreshold: 5,
    isActive: true,
  });

  const [form, setForm] = useState<any>(emptyForm());
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  const loadCategories = async () => {
    try {
      const r = await axios.get(API + "/admin/categories", { headers: adminHeaders() });
      setCategories(Array.isArray(r.data.data) ? r.data.data.filter((c: any) => c.isActive !== false) : []);
    } catch (e) {
      console.error("PRODUCT CATEGORY LOAD ERROR:", e);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    setLoadError("");
    try {
      const r = await axios.get(API + "/admin/products", {
        headers: adminHeaders(),
      });
      store.setProducts(r.data.data);
    } catch (e: any) {
      console.error(e);
      setLoadError(e?.response?.data?.message || "Unable to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      brand: p.brand || "",
      category: p.category || "Atta & Flour",
      description: p.description || "",
      image: p.image || "",
      sellingPrice: p.sellingPrice || 0,
      mrp: p.mrp || 0,
      unit: p.unit || "1 pack",
      stock: p.stock || 0,
      lowStockThreshold: p.lowStockThreshold ?? 5,
      isActive: p.isActive !== false,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert("Product name is required.");
    if (Number(form.sellingPrice) < 0 || Number(form.mrp) < 0) {
      return alert("Price cannot be negative.");
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        sellingPrice: Number(form.sellingPrice),
        mrp: Number(form.mrp),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
      };

      if (editing) {
        const r = await axios.put(
          API + "/products/" + editing._id,
          payload,
          { headers: adminHeaders() }
        );
        store.setProducts(
          store.products.map((p) =>
            p._id === editing._id ? r.data.data : p
          )
        );
      } else {
        const r = await axios.post(API + "/products", payload, {
          headers: adminHeaders(),
        });
        store.setProducts([r.data.data, ...store.products]);
      }
      setShowForm(false);
      setEditing(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(API + "/products/" + p._id, {
        headers: adminHeaders(),
      });
      store.setProducts(store.products.filter((x) => x._id !== p._id));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to delete product.");
    }
  };

  const toggle = async (p: Product) => {
    try {
      const r = await axios.put(
        API + "/products/" + p._id,
        { isActive: p.isActive === false },
        { headers: adminHeaders() }
      );
      store.setProducts(
        store.products.map((x) =>
          x._id === p._id ? r.data.data : x
        )
      );
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to change product status.");
    }
  };

  const visible = store.products.filter((p) => {
    const q = query.toLowerCase().trim();
    const matchesQuery = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q);
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && p.isActive !== false) ||
      (filter === "inactive" && p.isActive === false) ||
      (filter === "low" && p.stock <= (p.lowStockThreshold ?? 5)) ||
      (filter === "out" && p.stock <= 0);
    return matchesQuery && matchesFilter;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-bold">Product catalog</h2>
          <p className="text-sm text-slate-500">
            Manage pricing, stock, visibility and product details.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold flex gap-2 items-center w-fit"
        >
          <Plus size={18} /> Add product
        </button>
      </div>

      <div className="bg-white border rounded-2xl p-4 mb-5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, brand or category..."
            className="w-full border rounded-xl py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-xl px-4 py-3 bg-white"
        >
          <option value="all">All products</option>
          <option value="active">Active</option>
          <option value="inactive">Disabled</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-white border rounded-3xl p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">
                {editing ? "Edit product" : "Add product"}
              </h3>
              <p className="text-sm text-slate-500">Fill the catalog details below.</p>
            </div>
            <button type="button" aria-label="Close product form" onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <input placeholder="Product name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-xl p-3" />
            <input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="border rounded-xl p-3" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded-xl p-3 bg-white">
              {!categories.some((c) => c.name === form.category) && form.category && (
                <option value={form.category}>{form.category} (current)</option>
              )}
              {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
            <input placeholder="Unit (e.g. 1 kg)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="border rounded-xl p-3" />
            <input placeholder="Selling price" type="number" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="border rounded-xl p-3" />
            <input placeholder="MRP" type="number" min="0" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="border rounded-xl p-3" />
            <input placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="border rounded-xl p-3" />
            <input placeholder="Low stock threshold" type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} className="border rounded-xl p-3" />
            <input placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="border rounded-xl p-3 md:col-span-2" />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded-xl p-3 md:col-span-2 min-h-24" />
            <label className="flex items-center gap-3 border rounded-xl p-3 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
              <span><b>Active product</b><span className="block text-xs text-slate-500">Visible in the customer store</span></span>
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 mt-5 fb-mobile-stack">
            <button onClick={() => setShowForm(false)} className="border px-5 py-2.5 rounded-xl">Cancel</button>
            <button disabled={saving} onClick={save} className="bg-emerald-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold">
              {saving ? "Saving..." : editing ? "Update product" : "Create product"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <b>{visible.length} products</b>
          <span className="text-xs text-slate-500">Active products are shown in the store</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left p-4">Product</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">Stock</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingProducts ? (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500">Loading products...</td></tr>
              ) : loadError ? (
                <tr><td colSpan={6} className="p-8"><PageError message={loadError} onRetry={loadProducts} /></td></tr>
              ) : visible.length ? visible.map((p) => (
                <tr key={p._id} className="border-t hover:bg-slate-50/70">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} loading="lazy" className="w-12 h-12 rounded-xl object-cover bg-slate-100" />
                      <div>
                        <b>{p.name}</b>
                        <p className="text-xs text-slate-400">{p.brand || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500">{p.category}</td>
                  <td className="p-4"><b>{money(p.sellingPrice)}</b><span className="block text-xs text-slate-400 line-through">{money(p.mrp)}</span></td>
                  <td className="p-4"><b>{p.stock}</b><span className="block text-xs text-slate-400">min {p.lowStockThreshold ?? 5}</span></td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.isActive === false ? "bg-slate-100 text-slate-500" : p.stock <= 0 ? "bg-red-50 text-red-600" : p.stock <= (p.lowStockThreshold ?? 5) ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {p.isActive === false ? "Disabled" : p.stock <= 0 ? "Out of stock" : p.stock <= (p.lowStockThreshold ?? 5) ? "Low stock" : "Active"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="border px-3 py-2 rounded-lg font-semibold hover:bg-white">Edit</button>
                      <button onClick={() => toggle(p)} className="border px-3 py-2 rounded-lg font-semibold">{p.isActive === false ? "Enable" : "Disable"}</button>
                      <button onClick={() => remove(p)} className="border border-red-200 text-red-600 px-3 py-2 rounded-lg font-semibold hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deliveryPartners, setDeliveryPartners] = useState<any[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);

  const loadPartners = async () => {
    try {
      const r = await axios.get(API + "/admin/delivery-partners", {
        headers: adminHeaders(),
      });
      setDeliveryPartners((r.data.data || []).filter((p: any) => !p.blocked));
    } catch (e) {
      console.error(e);
      setDeliveryPartners([]);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/orders", {
        headers: adminHeaders(),
        params: {
          page,
          limit: 10,
          search,
          status,
        },
      });
      setOrders(r.data.data || []);
      setMeta(r.data.meta || {});
    } catch (e: any) {
      console.error(e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadPartners();
  }, [page, status]);

  const assignPartner = async (id: string, partnerId: string) => {
    setAssigning(id);
    try {
      const r = await axios.patch(
        API + "/admin/orders/" + id + "/assign",
        { deliveryPartnerId: partnerId || null },
        { headers: adminHeaders() }
      );

      setOrders((current) =>
        current.map((o) =>
          String(o._id) === String(id) ? r.data.data : o
        )
      );

      if (selected && String(selected._id) === String(id)) {
        setSelected(r.data.data);
      }
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          "Unable to assign delivery partner"
      );
    } finally {
      setAssigning(null);
    }
  };

  const updateStatus = async (
    id: string,
    nextStatus: string
  ) => {
    setUpdating(id);
    try {
      const r = await axios.patch(
        API + "/orders/" + id + "/status",
        { status: nextStatus },
        { headers: adminHeaders() }
      );

      setOrders((current) =>
        current.map((o) =>
          String(o._id) === String(id)
            ? r.data.data
            : o
        )
      );

      if (
        selected &&
        String(selected._id) === String(id)
      ) {
        setSelected(r.data.data);
      }
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          "Unable to update order status"
      );
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-bold">
            Orders management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            View, search, filter and update customer orders.
          </p>
        </div>
        <button
          onClick={load}
          className="border bg-white rounded-xl px-4 py-2.5 flex items-center gap-2 font-semibold"
        >
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      <div className="bg-white border rounded-3xl p-4 mb-5">
        <div className="grid md:grid-cols-[1fr_220px_auto] gap-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  load();
                }
              }}
              placeholder="Search order ID, customer, email or phone..."
              className="w-full border rounded-xl pl-10 pr-3 py-2.5 outline-none focus:ring-2 ring-emerald-100"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border rounded-xl px-3 py-2.5"
          >
            <option value="">All statuses</option>
            {[
              "Pending",
              "Confirmed",
              "Processing",
              "Packed",
              "Out for Delivery",
              "Delivered",
              "Cancelled",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setPage(1);
              load();
            }}
            className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 font-bold"
          >
            Search
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            Loading orders...
          </div>
        ) : orders.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left p-4">Order</th>
                    <th className="text-left p-4">Customer</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Delivery partner</th>
                    <th className="text-right p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={String(o._id)}
                      className="border-t hover:bg-slate-50/70"
                    >
                      <td className="p-4">
                        <b>
                          #{String(o._id).slice(-8)}
                        </b>
                        <p className="text-xs text-slate-400">
                          {o.paymentMethod || "COD"}
                        </p>
                      </td>

                      <td className="p-4">
                        <b>
                          {o.user?.name || "Customer"}
                        </b>
                        <p className="text-xs text-slate-400">
                          {o.user?.email || "—"}
                        </p>
                      </td>

                      <td className="p-4 text-slate-500">
                        {new Date(
                          o.createdAt
                        ).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>

                      <td className="p-4 font-bold">
                        {money(o.total)}
                      </td>

                      <td className="p-4">
                        <select
                          value={o.status}
                          disabled={
                            updating === String(o._id)
                          }
                          onChange={(e) =>
                            updateStatus(
                              String(o._id),
                              e.target.value
                            )
                          }
                          className={`border-0 rounded-full px-3 py-1.5 text-xs font-bold outline-none ${statusClass(
                            o.status
                          )}`}
                        >
                          {[
                            "Pending",
                            "Confirmed",
                            "Processing",
                            "Packed",
                            "Out for Delivery",
                            "Delivered",
                            "Cancelled",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4 min-w-[190px]">
                        <select
                          value={String(o.deliveryPartner?._id || o.deliveryPartner || "")}
                          disabled={
                            assigning === String(o._id) ||
                            ["Delivered", "Cancelled"].includes(o.status)
                          }
                          onChange={(e) =>
                            assignPartner(String(o._id), e.target.value)
                          }
                          className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-white disabled:opacity-50"
                        >
                          <option value="">Unassigned</option>
                          {deliveryPartners.map((partner) => (
                            <option key={String(partner._id)} value={String(partner._id)}>
                              {partner.name} ({partner.email})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelected(o)}
                          className="inline-flex items-center gap-1 border rounded-xl px-3 py-2 font-semibold"
                        >
                          <Eye size={15} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t p-4 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                {meta.total || orders.length} total orders
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="border rounded-xl px-4 py-2 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-2">
                  Page {page} of {Math.max(1, meta.pages || 1)}
                </span>
                <button
                  disabled={
                    page >= (meta.pages || 1)
                  }
                  onClick={() => setPage((p) => p + 1)}
                  className="border rounded-xl px-4 py-2 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-20 text-center">
            <Package
              className="mx-auto text-slate-300"
              size={50}
            />
            <h3 className="font-bold text-xl mt-3">
              No orders found
            </h3>
            <p className="text-slate-500 mt-1">
              Try changing the search or status filter.
            </p>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/40 p-4 grid place-items-center">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">
                  Order details
                </p>
                <h3 className="text-xl font-bold">
                  #{String(selected._id).slice(-8)}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl hover:bg-slate-100"
              >
                <X />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400">
                    Customer
                  </p>
                  <b>
                    {selected.user?.name || "Customer"}
                  </b>
                  <p className="text-sm text-slate-500">
                    {selected.user?.email || "—"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selected.user?.phone || "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400">
                    Delivery
                  </p>
                  <b>
                    {selected.deliverySlot ||
                      "Selected delivery slot"}
                  </b>
                  <p className="text-sm text-slate-500 mt-1">
                    {selected.address?.address ||
                      selected.address?.street ||
                      "Address not available"}
                  </p>
                  <p className="text-sm mt-3">
                    <span className="text-slate-400">Delivery partner: </span>
                    <b>{selected.deliveryPartner?.name || "Unassigned"}</b>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-3">Items</h4>
                <div className="space-y-2">
                  {(selected.items || []).map(
                    (item: any, i: number) => (
                      <div
                        key={i}
                        className="border rounded-2xl p-3 flex justify-between"
                      >
                        <div>
                          <b>{item.name}</b>
                          <p className="text-xs text-slate-500">
                            {item.quantity} ×{" "}
                            {money(item.price)}
                          </p>
                        </div>
                        <b>
                          {money(
                            Number(item.price || 0) *
                              Number(item.quantity || 0)
                          )}
                        </b>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="bg-slate-950 text-white rounded-2xl p-5">
                <div className="flex justify-between">
                  <span>Total</span>
                  <b className="text-xl">
                    {money(selected.total)}
                  </b>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  to={`/invoice/${selected._id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700"
                >
                  View Invoice
                </Link>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-2">
                  Change status
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Confirmed",
                    "Processing",
                    "Packed",
                    "Out for Delivery",
                    "Delivered",
                    "Cancelled",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        updateStatus(
                          String(selected._id),
                          s
                        )
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-bold ${statusClass(
                        s
                      )}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/customers", {
        headers: adminHeaders(),
        params: {
          page,
          limit: 10,
          search,
        },
      });
      setCustomers(r.data.data || []);
      setMeta(r.data.meta || {});
    } catch (e) {
      console.error(e);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const toggleBlock = async (customer: any) => {
    try {
      await axios.patch(
        API +
          "/admin/customers/" +
          customer.id +
          "/block",
        { blocked: !customer.blocked },
        { headers: adminHeaders() }
      );
      setCustomers((current) =>
        current.map((c) =>
          String(c.id) === String(customer.id)
            ? { ...c, blocked: !c.blocked }
            : c
        )
      );
      if (
        selected &&
        String(selected.customer?._id) ===
          String(customer.id)
      ) {
        setSelected({
          ...selected,
          customer: {
            ...selected.customer,
            blocked: !customer.blocked,
          },
        });
      }
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          "Unable to update customer"
      );
    }
  };

  const viewCustomer = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await axios.get(
        API + "/admin/customers/" + id,
        {
          headers: adminHeaders(),
        }
      );
      setSelected(r.data.data);
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          "Unable to load customer details"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-bold">
            Customer management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            View customers, spending, orders and account status.
          </p>
        </div>
        <button
          onClick={load}
          className="border bg-white rounded-xl px-4 py-2.5 flex items-center gap-2 font-semibold"
        >
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      <div className="bg-white border rounded-3xl p-4 mb-5 flex gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-3 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                load();
              }
            }}
            placeholder="Search name, email or phone..."
            className="w-full border rounded-xl pl-10 pr-3 py-2.5"
          />
        </div>
        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="bg-emerald-600 text-white rounded-xl px-5 font-bold"
        >
          Search
        </button>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            Loading customers...
          </div>
        ) : customers.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left p-4">Customer</th>
                    <th className="text-left p-4">Phone</th>
                    <th className="text-left p-4">Joined</th>
                    <th className="text-left p-4">Orders</th>
                    <th className="text-left p-4">Spending</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={String(c.id)}
                      className="border-t hover:bg-slate-50/70"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center font-bold">
                            {(c.name || "C").charAt(0)}
                          </div>
                          <div>
                            <b>{c.name}</b>
                            <p className="text-xs text-slate-400">
                              {c.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500">
                        {c.phone || "—"}
                      </td>
                      <td className="p-4 text-slate-500">
                        {c.createdAt
                          ? new Date(
                              c.createdAt
                            ).toLocaleDateString(
                              "en-IN"
                            )
                          : "—"}
                      </td>
                      <td className="p-4 font-semibold">
                        {c.orders}
                      </td>
                      <td className="p-4 font-semibold">
                        {money(c.spending)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            c.blocked
                              ? "bg-red-50 text-red-600"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {c.blocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              viewCustomer(String(c.id))
                            }
                            className="border rounded-xl p-2"
                            title="View customer"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => toggleBlock(c)}
                            className={`rounded-xl p-2 ${
                              c.blocked
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-600"
                            }`}
                            title={
                              c.blocked
                                ? "Unblock"
                                : "Block"
                            }
                          >
                            {c.blocked ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <Ban size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t p-4 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                {meta.total || customers.length} customers
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="border rounded-xl px-4 py-2 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-2">
                  Page {page} of{" "}
                  {Math.max(1, meta.pages || 1)}
                </span>
                <button
                  disabled={
                    page >= (meta.pages || 1)
                  }
                  onClick={() => setPage((p) => p + 1)}
                  className="border rounded-xl px-4 py-2 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-20 text-center">
            <Users
              className="mx-auto text-slate-300"
              size={50}
            />
            <h3 className="font-bold text-xl mt-3">
              No customers found
            </h3>
          </div>
        )}
      </div>

      {detailLoading && (
        <div className="fixed inset-0 z-[100] bg-black/30 grid place-items-center">
          <div className="bg-white rounded-2xl px-6 py-4 font-semibold">
            Loading customer...
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/40 p-4 grid place-items-center">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">
                  Customer profile
                </p>
                <h3 className="text-xl font-bold">
                  {selected.customer?.name}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl hover:bg-slate-100"
              >
                <X />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400">
                    Email
                  </p>
                  <b>{selected.customer?.email}</b>
                  <p className="text-sm text-slate-500 mt-2">
                    Phone:{" "}
                    {selected.customer?.phone || "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400">
                    Lifetime stats
                  </p>
                  <b>
                    {selected.stats?.orders || 0} orders
                  </b>
                  <p className="text-sm text-slate-500 mt-2">
                    Spending:{" "}
                    {money(selected.stats?.spending || 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <b>Account status</b>
                  <p className="text-sm text-slate-500">
                    {selected.customer?.blocked
                      ? "This customer is blocked."
                      : "This customer can place orders."}
                  </p>
                </div>
                <button
                  onClick={() =>
                    toggleBlock({
                      id: selected.customer?._id,
                      blocked:
                        selected.customer?.blocked,
                    })
                  }
                  className={`px-4 py-2 rounded-xl font-bold ${
                    selected.customer?.blocked
                      ? "bg-emerald-600 text-white"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {selected.customer?.blocked
                    ? "Unblock customer"
                    : "Block customer"}
                </button>
              </div>

              <div>
                <h4 className="font-bold mb-3">
                  Order history
                </h4>
                <div className="space-y-2">
                  {(selected.orders || []).length ? (
                    selected.orders.map((o: any) => (
                      <div
                        key={String(o._id)}
                        className="border rounded-2xl p-3 flex justify-between items-center"
                      >
                        <div>
                          <b>
                            #{String(o._id).slice(-8)}
                          </b>
                          <p className="text-xs text-slate-500">
                            {new Date(
                              o.createdAt
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <b>{money(o.total)}</b>
                          <p
                            className={`text-xs font-bold ${
                              o.status === "Cancelled"
                                ? "text-red-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {o.status}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No orders for this customer.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminReports() {
  const [period, setPeriod] = useState<
    "7d" | "30d" | "90d"
  >("7d");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/reports", {
        headers: adminHeaders(),
        params: { period },
      });
      setData(r.data.data);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  const series = data?.series || [];
  const maxRevenue = Math.max(
    1,
    ...series.map((x: any) => Number(x.revenue || 0))
  );

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-emerald-600 text-sm font-bold">
            BUSINESS ANALYTICS
          </p>
          <h2 className="text-3xl font-bold">
            Reports & Analytics
          </h2>
          <p className="text-slate-500 mt-1">
            Real-time reports generated from your MongoDB orders.
          </p>
        </div>

        <div className="bg-white border rounded-xl p-1 flex">
          {[
            ["7d", "7 Days"],
            ["30d", "30 Days"],
            ["90d", "90 Days"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriod(value as any)}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm ${
                period === value
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border rounded-3xl py-24 text-center text-slate-500">
          Loading reports...
        </div>
      ) : !data ? (
        <div className="bg-white border rounded-3xl py-24 text-center">
          <BarChart3
            className="mx-auto text-slate-300"
            size={50}
          />
          <h3 className="font-bold text-xl mt-3">
            Unable to load report
          </h3>
          <button
            onClick={load}
            className="mt-4 bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              [
                "Revenue",
                money(data.revenue),
                CircleDollarSign,
                "Selected period",
              ],
              [
                "Orders",
                data.orders,
                ShoppingBag,
                "Orders in selected period",
              ],
              [
                "Average Order Value",
                money(data.averageOrderValue),
                BarChart3,
                "Revenue ÷ valid orders",
              ],
              [
                "Cancelled Orders",
                data.cancelled,
                Ban,
                "Cancelled in selected period",
              ],
            ].map(([label, value, Icon, sub]: any) => (
              <div
                key={label}
                className="bg-white border rounded-3xl p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
                  <Icon size={20} />
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  {label}
                </p>
                <b className="text-2xl block mt-1">
                  {value}
                </b>
                <p className="text-xs text-slate-400 mt-1">
                  {sub}
                </p>
              </div>
            ))}
          </div>

          <div className="grid xl:grid-cols-[1fr_360px] gap-5 mt-5">
            <div className="bg-white border rounded-3xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">
                    Revenue Overview
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Daily revenue for the selected period
                  </p>
                </div>
                <b className="text-emerald-600">
                  {money(data.revenue)}
                </b>
              </div>

              <div className="h-72 mt-8 flex items-end gap-1 sm:gap-2 overflow-hidden">
                {series.map((x: any) => {
                  const height =
                    (Number(x.revenue || 0) /
                      maxRevenue) *
                    230;

                  return (
                    <div
                      key={x.date}
                      className="flex-1 min-w-[8px] h-full flex flex-col justify-end"
                      title={`${x.label}: ${money(
                        x.revenue
                      )}`}
                    >
                      <div
                        style={{
                          height: `${Math.max(
                            x.revenue ? height : 4,
                            4
                          )}px`,
                        }}
                        className="bg-emerald-500 rounded-t-lg hover:bg-emerald-600 transition"
                      />
                      {(period === "7d" ||
                        series.length <= 15) && (
                        <span className="text-[9px] text-slate-400 text-center mt-2 whitespace-nowrap">
                          {x.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border rounded-3xl p-6">
              <h3 className="text-lg font-bold">
                Order Status
              </h3>
              <div className="space-y-3 mt-5">
                {Object.entries(
                  data.statusBreakdown || {}
                ).map(([name, value]: any) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm">
                      <span>{name}</span>
                      <b>{value}</b>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${
                            data.orders
                              ? Math.min(
                                  100,
                                  (Number(value) /
                                    data.orders) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-3xl p-6 mt-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold">
                  Top Selling Products
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Based on units sold in the selected period
                </p>
              </div>
              <ShoppingBag className="text-emerald-600" />
            </div>

            {(data.topProducts || []).length ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                {data.topProducts.map(
                  (p: any, i: number) => (
                    <div
                      key={String(p.productId) + i}
                      className="bg-slate-50 rounded-2xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center font-bold">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <b className="line-clamp-1">
                            {p.name}
                          </b>
                          <p className="text-xs text-slate-500">
                            {p.quantity} units sold
                          </p>
                        </div>
                      </div>
                      <p className="text-emerald-700 font-bold mt-3">
                        {money(p.revenue)}
                      </p>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500">
                No product sales in this period.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DeliveryDashboard({ store }: { store: ReturnType<typeof useStore> }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [paymentUpdating, setPaymentUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await axios.get(API + "/orders", {
        headers: adminHeaders(),
      });
      const data = r.data.data;
      setOrders(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.orders)
          ? data.orders
          : []
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load deliveries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (store.user?.role === "delivery") load();
  }, [store.user?.role]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.patch(
        API + `/orders/${id}/status`,
        { status },
        { headers: adminHeaders() }
      );
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to update order status.");
    }
  };

  const logout = () => {
    localStorage.removeItem("fb-token");
    localStorage.removeItem("fb-user");
    store.setUser(null);
    window.location.href = "/login";
  };

  if (store.user?.role !== "delivery") {
    return <NavigateToLogin />;
  }

  const active = orders.filter(
    (o) => o.status === "Packed" || o.status === "Out for Delivery"
  );
  const deliveredOrders = orders.filter((o) => o.status === "Delivered");
  const delivered = deliveredOrders.length;
  const searchTerm = search.trim().toLowerCase();
  const matchesSearch = (o: any) => {
    if (!searchTerm) return true;
    const orderId = String(o._id || "").toLowerCase();
    const shortOrderId = orderId.slice(-8);
    const customer = o.user || {};
    const name = String(customer.name || "").toLowerCase();
    const phone = String(customer.phone || "").toLowerCase();
    return (
      orderId.includes(searchTerm) ||
      shortOrderId.includes(searchTerm) ||
      name.includes(searchTerm) ||
      phone.includes(searchTerm)
    );
  };
  const filteredActive = active.filter(matchesSearch);
  const filteredDeliveredOrders = deliveredOrders.filter(matchesSearch);
  const markPaymentReceived = async (id: string) => {
    try {
      setPaymentUpdating(id);
      await axios.patch(
        API + `/orders/${id}/payment`,
        { paymentStatus: "Paid", paymentMode: "UPI" },
        { headers: adminHeaders() }
      );
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to update payment status.");
    } finally {
      setPaymentUpdating(null);
    }
  };

  const deliveredAt = (order: any) => {
    const history = Array.isArray(order.statusHistory)
      ? order.statusHistory
      : [];
    const entry = history.find((x: any) => x.status === "Delivered");
    const date = entry?.timestamp || order.updatedAt || order.createdAt;
    return date
      ? new Date(date).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Delivery time unavailable";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white grid place-items-center">
              <Truck size={22} />
            </div>
            <div>
              <h1 className="font-bold text-xl">FreshBasket Delivery</h1>
              <p className="text-xs text-slate-500">Delivery Partner Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="px-4 py-2 rounded-xl border bg-white font-semibold flex items-center gap-2">
              <RefreshCw size={16} /> Refresh
            </button>
            <button onClick={logout} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold flex items-center gap-2">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-slate-500">Active deliveries</p>
            <p className="text-3xl font-bold mt-1">{active.length}</p>
          </div>
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-slate-500">Delivered</p>
            <p className="text-3xl font-bold mt-1">{delivered}</p>
          </div>
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-slate-500">Total assigned</p>
            <p className="text-3xl font-bold mt-1">{orders.length}</p>
          </div>
        </div>

        <div className="bg-white border rounded-3xl overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Assigned Orders</h2>
            <p className="text-sm text-slate-500 mt-1">Packed and out-for-delivery orders assigned to you.</p>

            <div className="relative mt-5 max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Order ID, customer name or mobile number..."
                className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-3 outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  title="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading deliveries...</div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
              <button onClick={load} className="mt-4 px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold">Retry</button>
            </div>
          ) : (
            <>
              {filteredActive.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Truck}
                    title={search ? "No matching active deliveries" : "No active deliveries"}
                    text={search ? "Try another Order ID, customer name or mobile number." : "New delivery assignments will appear here."}
                  />
                </div>
              ) : (
                <div className="divide-y">
                  {filteredActive.map((o) => {
                    const customer = o.user || {};
                    const address = o.address || {};
                    return (
                      <div key={o._id} className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <b>#{String(o._id).slice(-8)}</b>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass(o.status)}`}>{o.status}</span>
                              <span className="text-sm text-slate-500">{money(o.total)}</span>
                            </div>
                            <div>
                              <p className="font-semibold">{customer.name || "Customer"}</p>
                              <p className="text-sm text-slate-500">{customer.phone || customer.email || "No contact details"}</p>
                            </div>
                            <div className="text-sm text-slate-600">
                              <p className="font-semibold text-slate-800">Delivery address</p>
                              <p>{address.address || address.line1 || "Address not available"}</p>
                              <p>{[address.city, address.state, address.pincode].filter(Boolean).join(", ")}</p>
                            </div>
                            <p className="text-sm"><span className="font-semibold">Payment:</span> {o.paymentMethod || "COD"}</p>
                        {o.paymentMethod === "COD" && o.status === "Out for Delivery" && (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-bold text-amber-900">COD Payment</p>
                                <p className="text-sm text-amber-800 mt-1">Payment status: <b>{o.paymentStatus === "Paid" ? "Paid" : "Pending"}</b></p>
                              </div>
                              {o.paymentStatus !== "Paid" && (
                                <button
                                  onClick={() => {
                                    const upi = `upi://pay?pa=freshbasket@upi&pn=FreshBasket&am=${Number(o.total || 0).toFixed(2)}&cu=INR`;
                                    window.open("https://quickchart.io/qr?text=" + encodeURIComponent(upi) + "&size=260", "_blank");
                                  }}
                                  className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold"
                                >
                                  Show QR
                                </button>
                              )}
                              {o.paymentStatus !== "Paid" && (
                                <button
                                  disabled={paymentUpdating === o._id}
                                  onClick={() => markPaymentReceived(o._id)}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"
                                >
                                  {paymentUpdating === o._id ? "Saving..." : "Payment Received"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {o.status === "Packed" && (
                              <button onClick={() => updateStatus(o._id, "Out for Delivery")} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">
                                Out for Delivery
                              </button>
                            )}
                            {o.status === "Out for Delivery" && (
                              <button onClick={() => updateStatus(o._id, "Delivered")} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                                Mark Delivered
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredDeliveredOrders.length > 0 && (
                <div className="border-t">
                  <div className="p-6 border-b bg-slate-50/70">
                    <h3 className="text-xl font-bold">Delivery History</h3>
                    <p className="text-sm text-slate-500 mt-1">Successfully delivered orders assigned to you.</p>
                  </div>

                  <div className="divide-y">
                    {filteredDeliveredOrders.map((o) => {
                      const customer = o.user || {};
                      const address = o.address || {};
                      return (
                        <div key={o._id} className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <b>#{String(o._id).slice(-8)}</b>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass(o.status)}`}>Delivered</span>
                                <span className="text-sm text-slate-500">{money(o.total)}</span>
                              </div>
                              <div>
                                <p className="font-semibold">{customer.name || "Customer"}</p>
                                <p className="text-sm text-slate-500">{customer.phone || customer.email || "No contact details"}</p>
                              </div>
                              <div className="text-sm text-slate-600">
                                <p className="font-semibold text-slate-800">Delivery address</p>
                                <p>{address.address || address.line1 || "Address not available"}</p>
                                <p>{[address.city, address.state, address.pincode].filter(Boolean).join(", ")}</p>
                              </div>
                              <div className="text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">Delivered:</span> {deliveredAt(o)}
                              </div>
                              <p className="text-sm"><span className="font-semibold">Payment:</span> {o.paymentMethod || "COD"}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function NavigateToLogin() {
  const nav = useNavigate();
  useEffect(() => { nav("/login", { replace: true }); }, [nav]);
  return null;
}

function BellAlertIcon() {
  return <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/70 border border-amber-200 text-amber-600 font-bold">!</span>;
}

function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("Restock");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [productsRes, historyRes] = await Promise.all([
        axios.get(API + "/admin/products", { headers: adminHeaders() }),
        axios.get(API + "/admin/inventory/history", { headers: adminHeaders() }),
      ]);
      setProducts(productsRes.data.data || []);
      setHistory(historyRes.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const adjustStock = async (value: number) => {
    if (!selectedProduct || selectedProduct === "all") {
      return alert("Select a product first.");
    }
    if (!Number.isInteger(value) || value === 0) {
      return alert("Enter a valid non-zero whole number.");
    }
    if (!reason.trim()) {
      return alert("Reason is required.");
    }

    setSaving(true);
    try {
      await axios.patch(
        API + "/admin/inventory/" + selectedProduct + "/adjust",
        { adjustment: value, reason: reason.trim() },
        { headers: adminHeaders() }
      );
      setAdjustment("");
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to adjust stock.");
    } finally {
      setSaving(false);
    }
  };

  const selected = products.find((p) => p._id === selectedProduct);
  const visibleHistory = selectedProduct === "all"
    ? history
    : history.filter((h) => String(h.product?._id || h.product) === selectedProduct);

  const statusOf = (p: Product) => {
    if (Number(p.stock || 0) <= 0) return "Out of Stock";
    if (Number(p.stock || 0) <= Number(p.lowStockThreshold ?? 5)) return "Low Stock";
    return "In Stock";
  };

  const statusClass = (status: string) =>
    status === "Out of Stock"
      ? "bg-red-50 text-red-700"
      : status === "Low Stock"
      ? "bg-amber-50 text-amber-700"
      : "bg-emerald-50 text-emerald-700";

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory & Stock History</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track every stock movement and adjust inventory safely.
          </p>
        </div>
        <button
          onClick={load}
          className="border bg-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 w-fit"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ["In Stock", products.filter((p) => statusOf(p) === "In Stock").length, "text-emerald-700"],
          ["Low Stock", products.filter((p) => statusOf(p) === "Low Stock").length, "text-amber-700"],
          ["Out of Stock", products.filter((p) => statusOf(p) === "Out of Stock").length, "text-red-700"],
        ].map(([label, value, cls]: any) => (
          <div key={label} className="bg-white border rounded-3xl p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <b className={`text-3xl ${cls}`}>{value}</b>
          </div>
        ))}
      </div>

      {products.length > 0 && (
        <div className={`border rounded-3xl p-5 ${
          products.some((p) => statusOf(p) === "Out of Stock")
            ? "bg-red-50 border-red-200"
            : products.some((p) => statusOf(p) === "Low Stock")
            ? "bg-amber-50 border-amber-200"
            : "bg-emerald-50 border-emerald-200"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-amber-600">
                <BellAlertIcon />
              </div>
              <div>
                <h2 className="font-bold">Low Stock Alerts</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {products.filter((p) => statusOf(p) === "Low Stock").length} low-stock product(s) and {products.filter((p) => statusOf(p) === "Out of Stock").length} out-of-stock product(s) need attention.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {products
                .filter((p) => ["Low Stock", "Out of Stock"].includes(statusOf(p)))
                .slice(0, 6)
                .map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setSelectedProduct(p._id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                      statusOf(p) === "Out of Stock"
                        ? "bg-white border-red-200 text-red-700"
                        : "bg-white border-amber-200 text-amber-700"
                    }`}
                  >
                    {p.name} · {p.stock}
                  </button>
                ))}
            </div>
          </div>
          {products.filter((p) => ["Low Stock", "Out of Stock"].includes(statusOf(p))).length > 6 && (
            <p className="text-xs text-slate-500 mt-3">
              Showing the first 6 alerts. Use Current Stock below to review all products.
            </p>
          )}
        </div>
      )}

      <div className="bg-white border rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Boxes size={19} className="text-emerald-600" />
          <h2 className="font-bold">Current Stock</h2>
        </div>
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-3 pr-4">Product</th>
                  <th className="py-3 pr-4">Stock</th>
                  <th className="py-3 pr-4">Low Level</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.length ? products.map((p) => {
                  const st = statusOf(p);
                  return (
                    <tr key={p._id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-semibold">{p.name}</td>
                      <td className="py-3 pr-4 font-bold">{p.stock}</td>
                      <td className="py-3 pr-4">{p.lowStockThreshold ?? 5}</td>
                      <td className="py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass(st)}`}>
                          {st}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={4} className="py-10 text-center text-slate-500">No inventory records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        <div className="bg-white border rounded-3xl p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Boxes size={19} className="text-emerald-600" />
            <h2 className="font-bold">Stock Adjustment</h2>
          </div>
          <label className="text-xs font-bold text-slate-500">Product</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full border rounded-xl px-3 py-3 mt-1 mb-4"
          >
            <option value="all">Select product</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name} — {p.stock} units</option>
            ))}
          </select>

          {selected && (
            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-slate-500">Current stock</p>
              <p className="text-2xl font-bold">{selected.stock} units</p>
            </div>
          )}

          <label className="text-xs font-bold text-slate-500">Quantity change</label>
          <input
            type="number"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
            placeholder="e.g. 20 or -5"
            className="w-full border rounded-xl px-3 py-3 mt-1 mb-3"
          />
          <label className="text-xs font-bold text-slate-500">Reason</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Restock / damaged / correction"
            className="w-full border rounded-xl px-3 py-3 mt-1 mb-4"
          />
          <button
            disabled={saving}
            onClick={() => adjustStock(Number(adjustment))}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <PlusCircle size={17} /> {saving ? "Updating..." : "Update Stock"}
          </button>
          <p className="text-xs text-slate-400 mt-3">
            Positive = add stock, negative = remove stock.
          </p>
        </div>

        <div className="bg-white border rounded-3xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <History size={19} className="text-emerald-600" />
              <h2 className="font-bold">Stock History</h2>
            </div>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
            >
              <option value="all">All products</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          {visibleHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <History className="mx-auto text-slate-300" size={42} />
              <p className="mt-3">No stock history available yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-auto">
              {visibleHistory.map((h) => {
                const positive = Number(h.change) > 0;
                return (
                  <div key={h._id} className="border rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{h.product?.name || "Product"}</p>
                      <p className="text-xs text-slate-500 mt-1">{h.reason}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(h.createdAt).toLocaleString()} {h.adjustedBy?.name ? `• by ${h.adjustedBy.name}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold ${positive ? "text-emerald-600" : "text-red-600"}`}>
                        {positive ? "+" : ""}{h.change}
                      </p>
                      <p className="text-xs text-slate-500">{h.previousStock} → {h.newStock}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function CouponAdmin() {
  const emptyForm = {
    code: "",
    discountType: "percentage",
    value: "",
    minOrderAmount: "0",
    maxDiscount: "",
    startDate: "",
    expiryDate: "",
    usageLimit: "",
    isActive: true,
  };
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/coupons", { headers: adminHeaders() });
      setCoupons(r.data.data || []);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const edit = (c: any) => {
    setEditingId(c._id);
    setForm({
      code: c.code || "",
      discountType: c.discountType || "percentage",
      value: String(c.value ?? ""),
      minOrderAmount: String(c.minOrderAmount ?? 0),
      maxDiscount: c.maxDiscount == null ? "" : String(c.maxDiscount),
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : "",
      expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().slice(0, 16) : "",
      usageLimit: c.usageLimit == null ? "" : String(c.usageLimit),
      isActive: c.isActive !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const minOrderAmount = Number(form.minOrderAmount || 0);
    const maxDiscount = form.maxDiscount === "" ? undefined : Number(form.maxDiscount);
    const usageLimit = form.usageLimit === "" ? undefined : Number(form.usageLimit);

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return alert("Coupon code must be 3-30 characters (letters, numbers, _ or -).");
    if (!Number.isFinite(value) || value <= 0) return alert("Enter a valid discount value.");
    if (form.discountType === "percentage" && value > 100) return alert("Percentage discount cannot exceed 100%.");
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) return alert("Minimum order amount is invalid.");
    if (maxDiscount !== undefined && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) return alert("Maximum discount is invalid.");
    if (usageLimit !== undefined && (!Number.isInteger(usageLimit) || usageLimit <= 0)) return alert("Usage limit must be a positive whole number.");
    if (!form.expiryDate) return alert("Expiry date is required.");

    const payload = {
      code,
      discountType: form.discountType,
      value,
      minOrderAmount,
      maxDiscount,
      startDate: form.startDate || undefined,
      expiryDate: form.expiryDate,
      usageLimit,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await axios.put(API + "/admin/coupons/" + editingId, payload, { headers: adminHeaders() });
      } else {
        await axios.post(API + "/admin/coupons", payload, { headers: adminHeaders() });
      }
      reset();
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: any) => {
    try {
      await axios.put(API + "/admin/coupons/" + c._id, { isActive: !c.isActive }, { headers: adminHeaders() });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to update coupon.");
    }
  };

  const remove = async (c: any) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try {
      await axios.delete(API + "/admin/coupons/" + c._id, { headers: adminHeaders() });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to delete coupon.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Coupons & discounts</h2>
        <p className="text-sm text-slate-500 mt-1">Create promotional codes and control their validity, limits and discounts.</p>
      </div>

      <div className="bg-white border rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center"><Tag size={19} /></div><div><h3 className="font-bold">{editingId ? "Edit coupon" : "Create coupon"}</h3><p className="text-xs text-slate-500">All discount rules are validated by the backend.</p></div></div>
          {editingId && <button onClick={reset} className="border rounded-xl px-4 py-2 font-semibold">Cancel edit</button>}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="text-sm font-semibold">Coupon code<input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="WELCOME50" className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Discount type<select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
          <label className="text-sm font-semibold">Discount value<input type="number" min="0" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder={form.discountType === "percentage" ? "10" : "100"} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Minimum order<input type="number" min="0" value={form.minOrderAmount} onChange={e => setForm({...form, minOrderAmount: e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Maximum discount<input type="number" min="0" value={form.maxDiscount} onChange={e => setForm({...form, maxDiscount: e.target.value})} placeholder="Optional" className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Start date<input type="datetime-local" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Expiry date<input type="datetime-local" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Usage limit<input type="number" min="1" value={form.usageLimit} onChange={e => setForm({...form, usageLimit: e.target.value})} placeholder="Unlimited" className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        </div>
        <label className="flex items-center gap-2 mt-4 text-sm font-semibold"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} /> Active coupon</label>
        <button disabled={saving} onClick={save} className="mt-5 bg-emerald-600 disabled:opacity-50 text-white rounded-xl px-5 py-3 font-bold">{saving ? "Saving..." : editingId ? "Update coupon" : "Create coupon"}</button>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden">
        {loading ? <div className="py-16 text-center text-slate-500">Loading coupons...</div> : !coupons.length ? <div className="py-16 text-center text-slate-500">No coupons created yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="text-left p-4">Code</th><th className="text-left p-4">Discount</th><th className="text-left p-4">Minimum</th><th className="text-left p-4">Validity</th><th className="text-left p-4">Usage</th><th className="text-left p-4">Status</th><th className="text-right p-4">Action</th></tr></thead><tbody>{coupons.map(c => <tr key={c._id} className="border-t"><td className="p-4 font-bold">{c.code}</td><td className="p-4">{c.discountType === "percentage" ? `${c.value}%` : money(c.value)}{c.maxDiscount ? ` · max ${money(c.maxDiscount)}` : ""}</td><td className="p-4">{money(c.minOrderAmount)}</td><td className="p-4 text-xs">{new Date(c.startDate).toLocaleString("en-IN")}<br/>to {new Date(c.expiryDate).toLocaleString("en-IN")}</td><td className="p-4">{c.usedCount || 0}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td><td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.isActive ? "Active" : "Inactive"}</span></td><td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => edit(c)} className="border rounded-lg px-3 py-1.5 font-semibold">Edit</button><button onClick={() => toggle(c)} className="border rounded-lg px-3 py-1.5 font-semibold">{c.isActive ? "Disable" : "Enable"}</button><button onClick={() => remove(c)} className="border border-red-200 text-red-600 rounded-lg px-3 py-1.5 font-semibold">Delete</button></div></td></tr>)}</tbody></table></div>}
      </div>
    </div>
  );
}


function CategoryAdmin() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/categories", { headers: adminHeaders() });
      setCategories(Array.isArray(r.data.data) ? r.data.data : []);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setName("");
    setImage("");
    setEditing(null);
  };

  const save = async () => {
    if (name.trim().length < 2) return alert("Category name is required.");
    setSaving(true);
    try {
      const payload = { name: name.trim(), image: image.trim() };
      const r = editing
        ? await axios.put(API + "/admin/categories/" + editing._id, payload, { headers: adminHeaders() })
        : await axios.post(API + "/admin/categories", payload, { headers: adminHeaders() });
      if (editing) {
        setCategories(categories.map((c) => c._id === editing._id ? r.data.data : c));
      } else {
        setCategories([...categories, r.data.data].sort((a, b) => a.name.localeCompare(b.name)));
      }
      reset();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: any) => {
    try {
      const r = await axios.put(API + "/admin/categories/" + c._id, { isActive: !c.isActive }, { headers: adminHeaders() });
      setCategories(categories.map((x) => x._id === c._id ? r.data.data : x));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to change category status.");
    }
  };

  const remove = async (c: any) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try {
      await axios.delete(API + "/admin/categories/" + c._id, { headers: adminHeaders() });
      setCategories(categories.filter((x) => x._id !== c._id));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to delete category.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-emerald-600 text-sm font-bold">STORE CATALOG</p>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-slate-500 text-sm mt-1">Manage the categories shown in the customer store.</p>
        </div>
        <div className="bg-white border rounded-2xl p-4 w-full lg:w-[520px]">
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name *" className="border rounded-xl p-3" />
            <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Image URL (optional)" className="border rounded-xl p-3" />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            {editing && <button onClick={reset} className="border px-4 py-2 rounded-xl">Cancel</button>}
            <button disabled={saving} onClick={save} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50">
              {saving ? "Saving..." : editing ? "Update category" : "Add category"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between">
          <b>{categories.length} categories</b>
          <button onClick={load} className="text-sm text-emerald-700 font-semibold">Refresh</button>
        </div>
        {loading ? <div className="p-10 text-center text-slate-500">Loading categories...</div> : categories.length ? (
          <div className="divide-y">
            {categories.map((c) => (
              <div key={c._id} className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 overflow-hidden shrink-0">
                  {c.image ? <img src={c.image} alt={c.name} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-emerald-600 font-bold">{c.name.slice(0, 1).toUpperCase()}</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <b>{c.name}</b>
                  <p className="text-xs text-slate-400 mt-1">{c.isActive ? "Visible in store" : "Hidden from store"}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.isActive ? "Active" : "Inactive"}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(c); setName(c.name || ""); setImage(c.image || ""); }} className="border px-3 py-2 rounded-lg font-semibold">Edit</button>
                  <button onClick={() => toggle(c)} className="border px-3 py-2 rounded-lg font-semibold">{c.isActive ? "Disable" : "Enable"}</button>
                  <button onClick={() => remove(c)} className="border border-red-200 text-red-600 px-3 py-2 rounded-lg font-semibold">Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Tag} title="No categories" text="Add your first store category above." />}
      </div>
    </div>
  );
}

function BannerAdmin() {
  const [banners, setBanners] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    offerLabel: "",
    image: "",
    buttonText: "Shop now",
    link: "/shop",
    startDate: "",
    endDate: "",
    sortOrder: "0",
    isActive: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/banners", { headers: adminHeaders() });
      setBanners(Array.isArray(r.data.data) ? r.data.data : []);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to load banners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setEditing(null);
    setForm({ title: "", subtitle: "", offerLabel: "", image: "", buttonText: "Shop now", link: "/shop", startDate: "", endDate: "", sortOrder: "0", isActive: true });
  };

  const localDateTime = (value: any) => value ? new Date(value).toISOString().slice(0, 16) : "";

  const edit = (b: any) => {
    setEditing(b);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      offerLabel: b.offerLabel || "",
      image: b.image || "",
      buttonText: b.buttonText || "Shop now",
      link: b.link || "/shop",
      startDate: localDateTime(b.startDate),
      endDate: localDateTime(b.endDate),
      sortOrder: String(b.sortOrder ?? 0),
      isActive: b.isActive !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (form.title.trim().length < 2) return alert("Banner title is required.");
    if (!form.image.trim()) return alert("Banner image URL is required.");
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) return alert("End date must be after start date.");

    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        offerLabel: form.offerLabel.trim(),
        image: form.image.trim(),
        buttonText: form.buttonText.trim() || "Shop now",
        link: form.link.trim() || "/shop",
        sortOrder: Number(form.sortOrder || 0),
        startDate: form.startDate,
        endDate: form.endDate,
      };
      const r = editing
        ? await axios.put(API + "/admin/banners/" + editing._id, payload, { headers: adminHeaders() })
        : await axios.post(API + "/admin/banners", payload, { headers: adminHeaders() });
      if (editing) setBanners(banners.map((x) => x._id === editing._id ? r.data.data : x));
      else setBanners([...banners, r.data.data].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)));
      reset();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to save banner.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (b: any) => {
    try {
      const r = await axios.put(API + "/admin/banners/" + b._id, { isActive: !b.isActive }, { headers: adminHeaders() });
      setBanners(banners.map((x) => x._id === b._id ? r.data.data : x));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to change banner status.");
    }
  };

  const remove = async (b: any) => {
    if (!window.confirm(`Delete "${b.title}"?`)) return;
    try {
      await axios.delete(API + "/admin/banners/" + b._id, { headers: adminHeaders() });
      setBanners(banners.filter((x) => x._id !== b._id));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to delete banner.");
    }
  };

  const status = (b: any) => {
    const now = Date.now();
    if (!b.isActive) return "Inactive";
    if (b.startDate && new Date(b.startDate).getTime() > now) return "Scheduled";
    if (b.endDate && new Date(b.endDate).getTime() < now) return "Expired";
    return "Live";
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-emerald-600 text-sm font-bold">STORE MARKETING</p>
        <h2 className="text-2xl font-bold">Banners & Offers</h2>
        <p className="text-slate-500 text-sm mt-1">Create promotional banners that appear on the customer home page.</p>
      </div>

      <div className="bg-white border rounded-3xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-lg">{editing ? "Edit banner" : "Create banner"}</h3>
            <p className="text-xs text-slate-500 mt-1">Use an image URL and optionally schedule when the offer is visible.</p>
          </div>
          {editing && <button onClick={reset} className="border rounded-xl px-4 py-2 font-semibold">Cancel edit</button>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-sm font-semibold">Title *<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Fresh deals up to 30% off" className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Offer label<input value={form.offerLabel} onChange={(e) => setForm({ ...form, offerLabel: e.target.value })} placeholder="LIMITED TIME" className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold md:col-span-2">Subtitle<textarea value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Save more on everyday groceries." rows={2} className="mt-2 w-full border rounded-xl px-3 py-2.5 resize-none" /></label>
          <label className="text-sm font-semibold md:col-span-2">Image URL *<input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://images.unsplash.com/..." className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Button text<input value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} placeholder="Shop now" className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Button link<input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/shop" className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Start date<input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">End date<input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="text-sm font-semibold">Display order<input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
          <label className="flex items-center gap-3 text-sm font-semibold mt-7"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" /> Active</label>
        </div>

        {form.image && <img src={form.image} alt="Banner preview" className="mt-5 w-full h-44 md:h-56 object-cover rounded-2xl border" />}

        <div className="flex justify-end mt-5">
          <button disabled={saving} onClick={save} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-50">{saving ? "Saving..." : editing ? "Update banner" : "Create banner"}</button>
        </div>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between"><b>{banners.length} banners</b><button onClick={load} className="text-sm text-emerald-700 font-semibold">Refresh</button></div>
        {loading ? <div className="p-10 text-center text-slate-500">Loading banners...</div> : banners.length ? (
          <div className="divide-y">
            {banners.map((b) => {
              const s = status(b);
              return (
                <div key={b._id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                  <img src={b.image} alt={b.title} className="w-full lg:w-40 h-24 object-cover rounded-xl border" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><b>{b.title}</b><span className={`px-2 py-1 rounded-full text-[11px] font-bold ${s === "Live" ? "bg-emerald-50 text-emerald-700" : s === "Scheduled" ? "bg-blue-50 text-blue-700" : s === "Expired" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{s}</span></div>
                    {b.offerLabel && <p className="text-xs text-emerald-700 font-bold mt-1">{b.offerLabel}</p>}
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.subtitle || "No subtitle"}</p>
                    <p className="text-[11px] text-slate-400 mt-2">Order: {b.sortOrder ?? 0} · Link: {b.link || "/shop"}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => edit(b)} className="border px-3 py-2 rounded-lg font-semibold">Edit</button>
                    <button onClick={() => toggle(b)} className="border px-3 py-2 rounded-lg font-semibold">{b.isActive ? "Disable" : "Enable"}</button>
                    <button onClick={() => remove(b)} className="border border-red-200 text-red-600 px-3 py-2 rounded-lg font-semibold">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyState icon={Tag} title="No banners yet" text="Create your first promotional banner above." />}
      </div>
    </div>
  );
}


function AdminRewards() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await axios.get(API + "/admin/rewards/settings", { headers: adminHeaders() });
      setSettings(r.data.data);
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to load reward settings."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await axios.patch(API + "/admin/rewards/settings", settings, { headers: adminHeaders() });
      alert("Reward settings updated successfully.");
      await load();
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to update reward settings."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="bg-white border rounded-3xl py-16 text-center text-slate-500">Loading reward settings...</div>;
  if (error) return <PageError message={error} onRetry={load} />;
  return <div className="space-y-5"><div><h2 className="text-2xl font-bold">Loyalty & Rewards</h2><p className="text-sm text-slate-500 mt-1">Control how customers earn and redeem reward points.</p></div><div className="bg-white border rounded-3xl p-6"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={settings?.enabled !== false} onChange={e => setSettings({...settings, enabled: e.target.checked})} /> Enable loyalty program</label><div className="grid md:grid-cols-2 gap-4 mt-5"><label className="text-sm font-semibold">Points per ₹100<input type="number" min="0" value={settings?.pointsPer100 ?? ""} onChange={e => setSettings({...settings, pointsPer100: Number(e.target.value)})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label><label className="text-sm font-semibold">Rupees per point<input type="number" min="0.01" step="0.01" value={settings?.rupeesPerPoint ?? ""} onChange={e => setSettings({...settings, rupeesPerPoint: Number(e.target.value)})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label><label className="text-sm font-semibold">Minimum redeem points<input type="number" min="1" value={settings?.minRedeemPoints ?? ""} onChange={e => setSettings({...settings, minRedeemPoints: Number(e.target.value)})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label><label className="text-sm font-semibold">Maximum redeem per order (%)<input type="number" min="1" max="100" value={settings?.maxRedeemPercent ?? ""} onChange={e => setSettings({...settings, maxRedeemPercent: Number(e.target.value)})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label></div><div className="mt-5 p-4 rounded-2xl bg-amber-50 text-sm text-amber-800"><b>Default:</b> 10 points per ₹100 · ₹0.10 per point · minimum 100 points · maximum 50% of merchandise subtotal redeemable.</div><button disabled={saving} onClick={save} className="mt-5 bg-emerald-600 disabled:opacity-50 text-white rounded-xl px-5 py-3 font-bold">{saving ? "Saving..." : "Save reward settings"}</button></div></div>;
}

function AdminDeliveryPartners() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await axios.get(API + "/admin/delivery-partners", { headers: adminHeaders() });
      setPartners(r.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load delivery partners.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) return alert("Name, email and password are required.");
    if (form.password.length < 8) return alert("Password must be at least 8 characters.");
    setSaving(true);
    try {
      await axios.post(API + "/admin/delivery-partners", form, { headers: adminHeaders() });
      alert("Delivery partner created successfully. Share the login credentials securely.");
      setForm({ name: "", email: "", phone: "", password: "" });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to create delivery partner.");
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, blocked: boolean) => {
    try {
      await axios.patch(
        API + "/admin/delivery-partners/" + id + "/status",
        { blocked },
        { headers: adminHeaders() }
      );
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to update delivery partner.");
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete delivery partner ${name}? This cannot be undone.`)) return;
    try {
      await axios.delete(API + "/admin/delivery-partners/" + id, { headers: adminHeaders() });
      alert("Delivery partner deleted successfully.");
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to delete delivery partner.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-emerald-600 text-sm font-bold">TEAM MANAGEMENT</p>
        <h2 className="text-2xl font-bold">Delivery Partners</h2>
        <p className="text-sm text-slate-500 mt-1">Create delivery accounts and give each partner their own login credentials.</p>
      </div>

      <div className="bg-white border rounded-3xl p-6">
        <h3 className="font-bold text-lg">Create delivery account</h3>
        <div className="grid md:grid-cols-2 gap-4 mt-5">
          <label className="text-sm font-semibold">Full name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Delivery partner name" className="mt-2 w-full border rounded-xl p-3" /></label>
          <label className="text-sm font-semibold">Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="delivery@example.com" className="mt-2 w-full border rounded-xl p-3" /></label>
          <label className="text-sm font-semibold">Mobile<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" className="mt-2 w-full border rounded-xl p-3" /></label>
          <label className="text-sm font-semibold">Login password<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Minimum 8 characters" className="mt-2 w-full border rounded-xl p-3" /></label>
        </div>
        <button disabled={saving} onClick={create} className="mt-5 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{saving ? "Creating..." : "Create delivery account"}</button>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between"><b>{partners.length} delivery partners</b><button onClick={load} className="text-sm text-emerald-700 font-semibold">Refresh</button></div>
        {loading ? <div className="p-10 text-center text-slate-500">Loading delivery partners...</div> : error ? <div className="p-6"><PageError message={error} onRetry={load} /></div> : partners.length ? (
          <div className="divide-y">
            {partners.map(p => (
              <div key={p._id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <b>{p.name}</b>
                  <p className="text-sm text-slate-500 mt-1">{p.email} {p.phone ? `· ${p.phone}` : ""}</p>
                  <p className="text-xs text-slate-400 mt-1">Role: Delivery · {p.blocked ? "Login disabled" : "Can login and receive assigned orders"}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.blocked ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{p.blocked ? "Blocked" : "Active"}</span>
                  <button
                    onClick={() => updateStatus(p._id, !p.blocked)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border ${p.blocked ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"}`}
                  >
                    {p.blocked ? "Activate" : "Block"}
                  </button>
                  <button
                    onClick={() => remove(p._id, p.name)}
                    className="px-3 py-2 rounded-lg text-xs font-bold border border-red-200 text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Truck} title="No delivery partners" text="Create your first delivery account above." />}
      </div>
    </div>
  );
}

function AdminManagement({ store }: { store: ReturnType<typeof useStore> }) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/admins", { headers: adminHeaders() });
      setAdmins(Array.isArray(r.data.data) ? r.data.data : []);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to load admin accounts.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createAdmin = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.replace(/\D/g, "");
    if (name.length < 2) return alert("Please enter a valid name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("Please enter a valid email.");
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return alert("Please enter a valid 10-digit mobile number.");
    if (form.password.length < 8) return alert("Password must be at least 8 characters.");
    if (form.password !== form.confirmPassword) return alert("Passwords do not match.");
    setSaving(true);
    try {
      await axios.post(API + "/admin/admins", { name, email, phone, password: form.password }, { headers: adminHeaders() });
      alert("Admin account created successfully.");
      setForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
      await load();
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to create admin account."); }
    finally { setSaving(false); }
  };

  const toggle = async (admin: any) => {
    try {
      await axios.patch(API + "/admin/admins/" + admin._id + "/status", { blocked: !admin.blocked }, { headers: adminHeaders() });
      await load();
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to update admin account."); }
  };

  return <div className="space-y-5">
    <div><h2 className="text-2xl font-bold">Admin Management</h2><p className="text-sm text-slate-500 mt-1">Only the main admin can create or manage other admin accounts.</p></div>
    <div className="bg-white border rounded-3xl p-6">
      <h3 className="font-bold text-lg">Create Admin</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        <label className="text-sm font-semibold">Full name<input value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Email<input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Mobile<input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Password<input type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Confirm password<input type="password" value={form.confirmPassword} onChange={e => setForm({...form,confirmPassword:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
      </div>
      <button disabled={saving} onClick={createAdmin} className="mt-5 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{saving ? "Creating..." : "Create Admin"}</button>
    </div>
    <div className="bg-white border rounded-3xl p-6">
      <h3 className="font-bold text-lg">Admin Accounts</h3>
      {loading ? <div className="py-10 text-center text-slate-500">Loading...</div> : <div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{admins.map(a => { const main = String(a.email || "").toLowerCase() === "admin@grocery.com"; return <tr key={a._id} className="border-b"><td className="p-3 font-semibold">{a.name}</td><td className="p-3">{a.email}</td><td className="p-3">{a.phone || "—"}</td><td className="p-3">{main ? "Main Admin" : "Admin"}</td><td className="p-3">{a.blocked ? "Blocked" : "Active"}</td><td className="p-3">{String(a._id) === String(store.user?.id) ? <span className="text-slate-400">Current account</span> : <button onClick={() => toggle(a)} className="font-semibold text-emerald-700">{a.blocked ? "Activate" : "Block"}</button>}</td></tr>})}</tbody></table></div>}
    </div>
  </div>;
}

function AdminSettings() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await axios.get(API + "/auth/me", { headers: adminHeaders() });
      const u = r.data.data || {};
      setProfile({ name: u.name || "", email: u.email || "", phone: u.phone || "" });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load admin settings.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const r = await axios.patch(API + "/admin/settings/profile", { name: profile.name, phone: profile.phone }, { headers: adminHeaders() });
      const u = r.data.data || {};
      setProfile({ name: u.name || "", email: u.email || "", phone: u.phone || "" });
      alert("Admin profile updated successfully.");
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to update admin profile."); }
    finally { setSavingProfile(false); }
  };

  const changePassword = async () => {
    if (passwords.newPassword.length < 8) return alert("New password must be at least 8 characters.");
    if (passwords.newPassword !== passwords.confirmPassword) return alert("New password and confirmation do not match.");
    setChangingPassword(true);
    try {
      await axios.patch(API + "/admin/settings/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }, { headers: adminHeaders() });
      alert("Password changed successfully.");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to change password."); }
    finally { setChangingPassword(false); }
  };

  if (loading) return <div className="bg-white border rounded-3xl py-16 text-center text-slate-500">Loading admin settings...</div>;
  if (error) return <PageError message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-emerald-600 text-sm font-bold">ACCOUNT CONTROL</p>
        <h2 className="text-2xl font-bold">Admin Settings & Security</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your admin profile and protect your store account.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center"><Settings size={20} /></div>
            <div><h3 className="font-bold text-lg">Admin profile</h3><p className="text-sm text-slate-500">Update your store administrator details.</p></div>
          </div>
          <div className="space-y-4 mt-5">
            <label className="block text-sm font-semibold">Full name<input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className="mt-2 w-full border rounded-xl p-3" /></label>
            <label className="block text-sm font-semibold">Email<input value={profile.email} disabled className="mt-2 w-full border rounded-xl p-3 bg-slate-50 text-slate-500" /></label>
            <label className="block text-sm font-semibold">Mobile<input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="10-digit mobile" className="mt-2 w-full border rounded-xl p-3" /></label>
          </div>
          <button disabled={savingProfile} onClick={saveProfile} className="mt-5 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold flex items-center gap-2 disabled:opacity-50"><Save size={17} />{savingProfile ? "Saving..." : "Save profile"}</button>
        </div>

        <div className="bg-white border rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 grid place-items-center"><LockKeyhole size={20} /></div>
            <div><h3 className="font-bold text-lg">Change password</h3><p className="text-sm text-slate-500">Use a strong password of at least 8 characters.</p></div>
          </div>
          <div className="space-y-4 mt-5">
            <label className="block text-sm font-semibold">Current password<input type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} className="mt-2 w-full border rounded-xl p-3" /></label>
            <label className="block text-sm font-semibold">New password<input type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} className="mt-2 w-full border rounded-xl p-3" /></label>
            <label className="block text-sm font-semibold">Confirm new password<input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} className="mt-2 w-full border rounded-xl p-3" /></label>
          </div>
          <button disabled={changingPassword} onClick={changePassword} className="mt-5 bg-slate-950 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{changingPassword ? "Changing..." : "Change password"}</button>
          <div className="mt-5 p-4 rounded-2xl bg-amber-50 text-sm text-amber-800">For security, never share your admin password. After changing it, sign in again on any other device using the new password.</div>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-6">
        <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-600" /><div><h3 className="font-bold">Security checklist</h3><p className="text-sm text-slate-500">Basic protections currently enabled for the admin account.</p></div></div>
        <div className="grid md:grid-cols-3 gap-3 mt-5">
          <div className="bg-slate-50 rounded-2xl p-4"><b>JWT authentication</b><p className="text-xs text-slate-500 mt-1">Protected admin API routes require a valid login token.</p></div>
          <div className="bg-slate-50 rounded-2xl p-4"><b>Role protection</b><p className="text-xs text-slate-500 mt-1">Admin endpoints reject non-admin users.</p></div>
          <div className="bg-slate-50 rounded-2xl p-4"><b>Password hashing</b><p className="text-xs text-slate-500 mt-1">Passwords are stored using bcrypt hashing.</p></div>
        </div>
      </div>
    </div>
  );
}

function Admin({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const nav = useNavigate();
  const location = useLocation();

  const initialTab =
    new URLSearchParams(location.search).get("tab") ||
    "dashboard";

  const [tab, setTab] = useState(initialTab);
  const [stats, setStats] = useState<any>({
    revenue: 0,
    todayRevenue: 0,
    orders: 0,
    customers: 0,
    products: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    lowStock: 0,
    sales7d: [],
  });

  const loadStats = async () => {
    try {
      const r = await axios.get(API + "/admin/stats", {
        headers: adminHeaders(),
      });
      setStats(r.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const q =
      new URLSearchParams(location.search).get("tab");
    if (q && q !== tab) setTab(q);
  }, [location.search]);

  const changeTab = (next: string) => {
    setTab(next);
    nav(
      next === "dashboard"
        ? "/admin"
        : "/admin?tab=" + next
    );
  };

  const navs: any[] = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["orders", Package, "Orders"],
    ["products", Boxes, "Products"],
    ["categories", Tag, "Categories"],
    ["banners", Tag, "Banners / Offers"],
    ["inventory", History, "Inventory"],
    ["customers", Users, "Customers"],
    ["delivery-partners", Truck, "Delivery Partners"],
    ["coupons", Tag, "Coupons"],
    ["rewards", Award, "Loyalty / Rewards"],
    ...(store.user?.isMainAdmin ? [["admin-management", ShieldCheck, "Admin Management"]] : []),
    ["settings", Settings, "Settings / Security"],
    ["reports", BarChart3, "Reports"],
  ];

  const isMainAdmin = Boolean(
    store.user?.isMainAdmin ||
    String(store.user?.email || "").trim().toLowerCase() === "admin@grocery.com"
  );

  const visibleNavs = isMainAdmin
    ? navs
    : navs.filter((x) => !["coupons", "rewards", "settings", "admin-management"].includes(x[0]));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AccessibilityStyles />
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-slate-950 focus:text-white focus:px-4 focus:py-3 focus:rounded-xl focus:font-bold">
        Skip to main content
      </a>
      <aside className="hidden md:flex w-64 bg-slate-950 text-white flex-col fixed inset-y-0 z-40">
        <div className="p-6 text-xl font-bold flex items-center gap-2">
          <span className="w-9 h-9 bg-emerald-500 rounded-xl grid place-items-center">
            <Leaf size={18} />
          </span>
          FreshBasket
        </div>

        <p className="px-6 text-[10px] uppercase text-slate-500 font-bold tracking-widest mt-2">
          Store management
        </p>

        <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 mt-3">
          {visibleNavs.map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                tab === id
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="shrink-0 p-4 border-t border-white/10 bg-slate-950">
          <button
            onClick={() => {
              store.logout();
              nav("/");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-300"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main id="admin-main" className="md:ml-64 flex-1 min-w-0">
        <header className="min-h-16 bg-white border-b px-3 sm:px-5 md:px-8 py-2 flex items-center gap-3 justify-between sticky top-0 z-30">
          <div className="min-w-0">
            <p className="text-xs text-slate-400">
              STORE CONTROL
            </p>
            <h1 className="font-bold truncate">
              {visibleNavs.find((x) => x[0] === tab)?.[2]}
            </h1>
          </div>

          <div className="md:hidden flex-1 max-w-[190px]">
            <label htmlFor="admin-mobile-tab" className="sr-only">Admin section</label>
            <select
              id="admin-mobile-tab"
              value={tab}
              onChange={(e) => changeTab(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 bg-white text-sm font-semibold"
            >
              {visibleNavs.map(([id, , label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>

          <Link
            to="/"
            className="text-sm text-emerald-700 font-semibold"
          >
            View store →
          </Link>
        </header>

        <div className="p-5 md:p-8">
          {tab === "dashboard" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  [
                    "Revenue",
                    money(stats.revenue),
                    BarChart3,
                  ],
                  ["Orders", stats.orders, Package],
                  [
                    "Customers",
                    stats.customers,
                    Users,
                  ],
                  [
                    "Products",
                    stats.products,
                    Boxes,
                  ],
                ].map(([label, value, Icon]: any) => (
                  <div
                    key={label}
                    className="bg-white border rounded-3xl p-5"
                  >
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl grid place-items-center">
                      <Icon size={19} />
                    </div>
                    <p className="text-sm text-slate-500 mt-4">
                      {label}
                    </p>
                    <b className="text-2xl">{value}</b>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-5 mt-5">
                <div className="lg:col-span-2 bg-white border rounded-3xl p-6">
                  <div className="flex justify-between">
                    <div>
                      <h2 className="font-bold text-lg">
                        Sales overview
                      </h2>
                      <p className="text-xs text-slate-400">
                        Last 7 days
                      </p>
                    </div>
                    <span className="text-emerald-600 font-bold">
                      {money(
                        (stats.sales7d || []).reduce(
                          (s: number, x: any) =>
                            s + Number(x.revenue || 0),
                          0
                        )
                      )}
                    </span>
                  </div>

                  <div className="h-56 mt-6 flex items-end gap-3">
                    {(stats.sales7d || []).map(
                      (x: any) => {
                        const max = Math.max(
                          1,
                          ...(stats.sales7d || []).map(
                            (v: any) =>
                              Number(v.revenue || 0)
                          )
                        );
                        const h =
                          (Number(x.revenue || 0) /
                            max) *
                          180;

                        return (
                          <div
                            key={x.date}
                            className="flex-1"
                            title={`${x.label}: ${money(
                              x.revenue
                            )}`}
                          >
                            <div
                              style={{
                                height: `${Math.max(
                                  h,
                                  4
                                )}px`,
                              }}
                              className="bg-emerald-500 rounded-t-xl opacity-80"
                            />
                            <p className="text-[10px] text-slate-400 text-center mt-2">
                              {x.label}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="bg-white border rounded-3xl p-6">
                  <h2 className="font-bold">
                    Store alerts
                  </h2>
                  <div className="mt-5 space-y-4 text-sm">
                    <button
                      onClick={() =>
                        changeTab("products")
                      }
                      className="w-full text-left p-3 bg-amber-50 rounded-xl"
                    >
                      <b>{stats.lowStock} products</b>
                      <p className="text-xs text-slate-500">
                        running low on stock
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        changeTab("orders")
                      }
                      className="w-full text-left p-3 bg-emerald-50 rounded-xl"
                    >
                      <b>{stats.pending} orders</b>
                      <p className="text-xs text-slate-500">
                        need confirmation
                      </p>
                    </button>

                    <div className="p-3 bg-blue-50 rounded-xl">
                      <b>₹499+</b>
                      <p className="text-xs text-slate-500">
                        free delivery threshold
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-3xl p-6 mt-5">
                <div className="flex justify-between">
                  <h2 className="font-bold">
                    Recent products
                  </h2>
                  <button
                    onClick={() =>
                      changeTab("products")
                    }
                    className="text-emerald-700 text-sm font-semibold"
                  >
                    Manage products
                  </button>
                </div>

                <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {store.products
                    .slice(0, 8)
                    .map((p) => (
                      <div
                        key={p._id}
                        className="flex gap-3 items-center bg-slate-50 rounded-2xl p-3"
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div className="min-w-0">
                          <b className="text-sm line-clamp-1">
                            {p.name}
                          </b>
                          <p className="text-xs text-slate-500">
                            {money(p.sellingPrice)} ·{" "}
                            {p.stock} in stock
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          {tab === "orders" && <AdminOrders />}
          {tab === "products" && (
            <ProductAdmin store={store} />
          )}
          {tab === "categories" && <CategoryAdmin />}
          {tab === "banners" && <BannerAdmin />}
          {tab === "inventory" && <AdminInventory />}
          {tab === "customers" && <AdminCustomers />}
          {tab === "delivery-partners" && <AdminDeliveryPartners />}
          {tab === "admin-management" && isMainAdmin && <AdminManagement store={store} />}
          {tab === "coupons" && <CouponAdmin />}
          {tab === "rewards" && <AdminRewards />}
          {tab === "settings" && <AdminSettings />}
          {tab === "reports" && <AdminReports />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const store = useStore();

  return (
    <>
      <AccessibilityStyles />
      <Routes>
      <Route
        path="/"
        element={<Home store={store} />}
      />
      <Route
        path="/shop"
        element={<Shop store={store} />}
      />
      <Route
        path="/product/:id"
        element={<ProductPage store={store} />}
      />
      <Route
        path="/cart"
        element={<Cart store={store} />}
      />
      <Route
        path="/checkout"
        element={<Checkout store={store} />}
      />
      <Route
        path="/invoice/:id"
        element={<Invoice store={store} />}
      />
      <Route
        path="/order-success"
        element={<Success store={store} />}
      />
      <Route
        path="/login"
        element={<Login store={store} />}
      />
      <Route
        path="/account"
        element={<Account store={store} />}
      />
      <Route
        path="/profile"
        element={<ProfilePage store={store} />}
      />
      <Route
        path="/delivery"
        element={<DeliveryDashboard store={store} />}
      />
      <Route
        path="/orders/:id"
        element={<OrderTracking store={store} />}
      />
      <Route
        path="/rewards"
        element={<RewardsPage store={store} />}
      />
      <Route
        path="/notifications"
        element={<NotificationsPage store={store} />}
      />
      <Route
        path="/orders"
        element={<Orders store={store} />}
      />
      <Route
        path="/wishlist"
        element={<Wishlist store={store} />}
      />
      <Route
        path="/admin"
        element={<Admin store={store} />}
      />
      <Route
        path="*"
        element={<Home store={store} />}
      />
      </Routes>
    </>
  );
}
