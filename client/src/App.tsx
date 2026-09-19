import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import axios from "axios";
import { App as CapacitorApp } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";
import { Printer as CapacitorPrinter } from "@capgo/capacitor-printer";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Compatibility aliases for the installed react-leaflet typings.
// Runtime behavior is unchanged; these aliases only prevent version-specific
// prop typing conflicts in the existing map components.
const FBMapContainer: any = MapContainer;
const FBTileLayer: any = TileLayer;
const FBCircleMarker: any = CircleMarker;
const FBMarker: any = Marker;
const FBPopup: any = Popup;
const FBPolyline: any = Polyline;
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
  Sun,
  Moon,
  Globe,
  LockKeyhole,
  Menu,
  Briefcase,
  Save,
  Mail,
  Store,
  BadgeCheck,
  Printer,
  Upload,
  Camera,
  ScanLine,
  Headphones,
  Ticket,
  UserRoundSearch,
  AlertTriangle,
  Phone,
  MessageCircle,
  Sparkles,
} from "lucide-react";

const IS_NATIVE_APP =
  Boolean((window as any).Capacitor?.isNativePlatform?.());

const API_BASE = IS_NATIVE_APP
  ? "https://freshbasket-grocery-shop.onrender.com"
  : import.meta.env.VITE_API_URL ||
    (window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://freshbasket-grocery-shop.onrender.com");

const API = `${API_BASE}/api`;

type ProductVariant = {
  _id?: string;
  name: string;
  unit?: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  sku?: string;
  barcode?: string;
  image?: string;
};

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
  variants?: ProductVariant[];
  storeAdmin?: string;
  rating: number;
  reviewCount?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  refundAllowed?: boolean;
  replacementAllowed?: boolean;
  refundWindowHours?: number;
  replacementWindowHours?: number;
  refundEligible?: boolean;
  replacementEligible?: boolean;
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

// Keep the existing JWT/localStorage auth contract, while isolating each browser
// tab's active session so two authenticated accounts can safely use the same
// origin at the same time. No JWT format or backend authentication is changed.
const getAuthToken = () => {
  try {
    return sessionStorage.getItem("fb-token") || localStorage.getItem("fb-token") || "";
  } catch {
    return localStorage.getItem("fb-token") || "";
  }
};

const getAuthUser = () => {
  try {
    const raw = sessionStorage.getItem("fb-user") || localStorage.getItem("fb-user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    try { return JSON.parse(localStorage.getItem("fb-user") || "null"); } catch { return null; }
  }
};

const persistAuthSession = (user:any, token:string) => {
  try {
    sessionStorage.setItem("fb-user", JSON.stringify(user));
    sessionStorage.setItem("fb-token", String(token || ""));
  } catch {}
  // Preserve existing persistent login behavior for the rest of the app.
  localStorage.setItem("fb-user", JSON.stringify(user));
  localStorage.setItem("fb-token", String(token || ""));
};

const clearAuthSession = (sessionToken?:string) => {
  try {
    sessionStorage.removeItem("fb-user");
    sessionStorage.removeItem("fb-token");
    sessionStorage.removeItem("fb-login-history-id");
  } catch {}
  // Do not log out another account that is active in a different browser tab.
  // Clear the legacy persistent session only when it belongs to this tab.
  const persistentToken = localStorage.getItem("fb-token") || "";
  if (!sessionToken || !persistentToken || persistentToken === sessionToken) {
    localStorage.removeItem("fb-user");
    localStorage.removeItem("fb-token");
    localStorage.removeItem("fb-login-history-id");
  }
};

const adminHeaders = () => {
  const token = getAuthToken();
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



type FBTheme = "light" | "dark";
type FBLanguage = "en" | "hi" | "hinglish";

function GlobalPreferences({ store }: { store: ReturnType<typeof useStore> }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<FBTheme>(() => {
    try { return localStorage.getItem("fb-theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
  });
  const languageAllowed = Boolean(store.user && ["customer", "delivery"].includes(String(store.user.role)));
  const [language, setLanguage] = useState<FBLanguage>(() => {
    try {
      const uid = String(store.user?.id || "");
      const saved = localStorage.getItem(uid ? `fb-language-${uid}` : "fb-language");
      return saved === "hi" || saved === "hinglish" ? saved : ((store.user?.language === "hi" || store.user?.language === "hinglish") ? store.user.language : "en");
    } catch { return "en"; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("fb-dark-mode", theme === "dark");
    document.documentElement.setAttribute("data-fb-theme", theme);
    try { localStorage.setItem("fb-theme", theme); } catch {}
  }, [theme]);
  useEffect(() => {
    if (!languageAllowed) return;
    const serverLanguage = store.user?.language;
    if (serverLanguage === "hi" || serverLanguage === "hinglish") setLanguage(serverLanguage);
    else {
      try {
        const saved = localStorage.getItem(`fb-language-${String(store.user?.id || "")}`);
        if (saved === "hi" || saved === "hinglish") setLanguage(saved); else setLanguage("en");
      } catch { setLanguage("en"); }
    }
  }, [store.user?.id, store.user?.language, languageAllowed]);
  const changeLanguage = async (next: FBLanguage) => {
    setLanguage(next);
    try { localStorage.setItem(`fb-language-${String(store.user?.id || "")}`, next); } catch {}
    window.dispatchEvent(new CustomEvent("fb-language-changed", { detail: next }));
    if (languageAllowed) {
      try { await axios.patch(API + "/preferences/language", { language: next }, { headers: adminHeaders() }); store.setUser({ ...store.user, language: next }); } catch {}
    }
  };
  const labels = language === "hi"
    ? { preferences: "प्राथमिकताएँ", language: "भाषा", theme: "थीम", light: "लाइट", dark: "डार्क", english: "अंग्रेज़ी", hindi: "हिंदी", hinglish: "हिंग्लिश" }
    : { preferences: "Preferences", language: "Language", theme: "Theme", light: "Light", dark: "Dark", english: "English", hindi: "Hindi", hinglish: "Hinglish" };
  return (
    <div className="fixed right-4 bottom-4 z-[120]">
      {open && <div className="mb-3 w-72 rounded-2xl border bg-white shadow-2xl p-4 text-slate-800 fb-preferences-panel">
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2 font-bold"><Settings size={18}/>{labels.preferences}</div><button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100" aria-label="Close preferences"><X size={17}/></button></div>
        <div className="space-y-4">
          {languageAllowed && <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2"><Globe size={14}/>{labels.language}</p><div className="grid grid-cols-3 gap-2">{([['en', labels.english], ['hi', labels.hindi], ['hinglish', labels.hinglish]] as [FBLanguage,string][]).map(([value,label]) => <button key={value} type="button" onClick={() => changeLanguage(value)} className={`rounded-xl border px-2 py-2 text-xs font-semibold ${language === value ? "bg-emerald-600 text-white border-emerald-600" : "hover:bg-slate-50"}`}>{label}</button>)}</div></div>}
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">{labels.theme}</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setTheme("light")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${theme === "light" ? "bg-emerald-600 text-white border-emerald-600" : "hover:bg-slate-50"}`}><Sun size={16}/>{labels.light}</button><button type="button" onClick={() => setTheme("dark")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${theme === "dark" ? "bg-slate-900 text-white border-slate-900" : "hover:bg-slate-50"}`}><Moon size={16}/>{labels.dark}</button></div></div>
        </div>
      </div>}
      <button type="button" onClick={() => setOpen(v => !v)} className="fb-preferences-trigger flex items-center gap-2 rounded-full bg-slate-900 text-white shadow-xl px-4 py-3 font-bold text-sm hover:scale-[1.02] transition-transform" aria-expanded={open} aria-label="Open preferences">{theme === "dark" ? <Moon size={17}/> : <Sun size={17}/>} {languageAllowed && <Globe size={16}/>}<span className="hidden sm:inline">{labels.preferences}</span></button>
    </div>
  );
}

const FB_TRANSLATIONS: Record<string, { hi: string; hinglish: string }> = {
  "Choose a store": {hi:"स्टोर चुनें",hinglish:"Apna store choose karein"},
  "Visit store & shop": {hi:"स्टोर देखें और खरीदारी करें",hinglish:"Store visit karein aur shop karein"},
  "Visit Store & Shop": {hi:"स्टोर देखें और खरीदारी करें",hinglish:"Store visit karein aur shop karein"},
  "Search groceries, brands & more...": {hi:"किराने का सामान, ब्रांड और बहुत कुछ खोजें...",hinglish:"Groceries, brands aur bahut kuch search karein..."},
  "Deliver to": {hi:"यहाँ डिलीवर करें",hinglish:"Yahan deliver karein"},
  "Select location": {hi:"स्थान चुनें",hinglish:"Location choose karein"},
  "Stores": {hi:"स्टोर",hinglish:"Stores"}, "Wishlist": {hi:"विशलिस्ट",hinglish:"Wishlist"}, "Cart": {hi:"कार्ट",hinglish:"Cart"},
  "Notifications": {hi:"सूचनाएँ",hinglish:"Notifications"}, "Mark all read": {hi:"सभी पढ़े हुए करें",hinglish:"Sabko read karein"}, "View all notifications": {hi:"सभी सूचनाएँ देखें",hinglish:"Sab notifications dekhein"},
  "No notifications yet.": {hi:"अभी कोई सूचना नहीं है।",hinglish:"Abhi koi notification nahi hai."},
  "Shop now": {hi:"अभी खरीदें",hinglish:"Abhi shop karein"}, "Fresh produce": {hi:"ताज़ी उपज",hinglish:"Fresh produce"},
  "All Products": {hi:"सभी उत्पाद",hinglish:"Saare products"}, "Fresh Produce": {hi:"ताज़ी उपज",hinglish:"Fresh produce"}, "Daily Essentials": {hi:"रोज़मर्रा की ज़रूरतें",hinglish:"Daily essentials"},
  "Help": {hi:"मदद",hinglish:"Help"}, "Delivery Information": {hi:"डिलीवरी जानकारी",hinglish:"Delivery information"}, "Returns & Refunds": {hi:"रिटर्न और रिफंड",hinglish:"Returns aur refunds"}, "Contact Support": {hi:"सपोर्ट से संपर्क करें",hinglish:"Support se contact karein"},
  "Why FreshBasket?": {hi:"FreshBasket क्यों?",hinglish:"FreshBasket kyun?"}, "Secure payments": {hi:"सुरक्षित भुगतान",hinglish:"Secure payments"},
  "Add": {hi:"जोड़ें",hinglish:"Add karein"}, "Unavailable": {hi:"उपलब्ध नहीं",hinglish:"Available nahi"}, "Saved": {hi:"सहेजा गया",hinglish:"Saved"}, "View cart": {hi:"कार्ट देखें",hinglish:"Cart dekhein"},
  "Your daily groceries.": {hi:"आपका रोज़मर्रा का सामान।",hinglish:"Aapka daily grocery samaan."}, "Fresh & simple.": {hi:"ताज़ा और आसान।",hinglish:"Fresh aur simple."},
  "Everything your kitchen needs, delivered from your local store with care.": {hi:"आपकी रसोई की हर ज़रूरत, आपके स्थानीय स्टोर से सावधानी के साथ डिलीवर।",hinglish:"Aapki kitchen ki har zaroorat, local store se care ke saath delivered."},
  "Your Local Market, Right at Your Doorstep": {hi:"आपका स्थानीय बाज़ार, आपके दरवाज़े तक",hinglish:"Aapka local market, seedha aapke doorstep par"},
  "FreshBasket helps local stores sell online while making everyday shopping easier for nearby customers.": {hi:"FreshBasket स्थानीय स्टोर को ऑनलाइन बेचने में मदद करता है और आसपास के ग्राहकों की रोज़मर्रा की खरीदारी आसान बनाता है।",hinglish:"FreshBasket local stores ko online sell karne mein help karta hai aur nearby customers ki shopping easy banata hai."},
  "How FreshBasket Works": {hi:"FreshBasket कैसे काम करता है",hinglish:"FreshBasket kaise kaam karta hai"}, "Choose your location": {hi:"अपना स्थान चुनें",hinglish:"Apni location choose karein"}, "Choose a local store": {hi:"स्थानीय स्टोर चुनें",hinglish:"Local store choose karein"}, "Browse products": {hi:"उत्पाद देखें",hinglish:"Products browse karein"}, "Add products to cart": {hi:"उत्पाद कार्ट में जोड़ें",hinglish:"Products cart mein add karein"}, "Confirm address": {hi:"पता पक्का करें",hinglish:"Address confirm karein"}, "Place order": {hi:"ऑर्डर करें",hinglish:"Order place karein"}, "Track delivery": {hi:"डिलीवरी ट्रैक करें",hinglish:"Delivery track karein"}, "Receive your order": {hi:"अपना ऑर्डर प्राप्त करें",hinglish:"Apna order receive karein"}, "Rate your experience": {hi:"अपने अनुभव को रेट करें",hinglish:"Apna experience rate karein"},
  "Your Local Market, Online": {hi:"आपका स्थानीय बाज़ार, ऑनलाइन",hinglish:"Aapka local market, online"}, "Own a Store?": {hi:"क्या आपका स्टोर है?",hinglish:"Apna store hai?"}, "Contact Us": {hi:"संपर्क करें",hinglish:"Contact karein"}, "Become a Delivery Partner": {hi:"डिलीवरी पार्टनर बनें",hinglish:"Delivery Partner banein"},
  "Shop from nearby stores": {hi:"पास के स्टोर से खरीदारी करें",hinglish:"Nearby stores se shop karein"}, "Support local businesses": {hi:"स्थानीय व्यवसायों का समर्थन करें",hinglish:"Local businesses ko support karein"}, "Easy order tracking": {hi:"आसान ऑर्डर ट्रैकिंग",hinglish:"Easy order tracking"}, "Simple refunds and replacements": {hi:"आसान रिफंड और रिप्लेसमेंट",hinglish:"Simple refunds aur replacements"},
  "Local marketplace": {hi:"स्थानीय मार्केटप्लेस",hinglish:"Local marketplace"}, "LOCAL MARKETPLACE": {hi:"स्थानीय मार्केटप्लेस",hinglish:"LOCAL MARKETPLACE"}, "FreshBasket Updates": {hi:"FreshBasket अपडेट्स",hinglish:"FreshBasket updates"}, "Need help?": {hi:"मदद चाहिए?",hinglish:"Help chahiye?"}, "Secure Staff Access": {hi:"सुरक्षित स्टाफ एक्सेस",hinglish:"Secure staff access"}, "Welcome back": {hi:"वापसी पर स्वागत है",hinglish:"Welcome back"}, "Create your account": {hi:"अपना अकाउंट बनाएँ",hinglish:"Apna account banayein"}, "Login as": {hi:"इस रूप में लॉगिन करें",hinglish:"Login as"}, "Customer": {hi:"ग्राहक",hinglish:"Customer"}, "Delivery Partner": {hi:"डिलीवरी पार्टनर",hinglish:"Delivery Partner"}, "Sign in": {hi:"साइन इन",hinglish:"Sign in"}, "New here?": {hi:"नए हैं?",hinglish:"Yahan naye hain?"}, "Already have an account?": {hi:"पहले से अकाउंट है?",hinglish:"Account pehle se hai?"},
  "Email": {hi:"ईमेल",hinglish:"Email"}, "Password": {hi:"पासवर्ड",hinglish:"Password"}, "Full name": {hi:"पूरा नाम",hinglish:"Full name"}, "Confirm password": {hi:"पासवर्ड की पुष्टि करें",hinglish:"Password confirm karein"},
  "My Earnings & Performance": {hi:"मेरी कमाई और प्रदर्शन",hinglish:"Meri earnings aur performance"}, "Back to deliveries": {hi:"डिलीवरी पर वापस जाएँ",hinglish:"Deliveries par wapas jayein"}, "Recent ratings": {hi:"हाल की रेटिंग",hinglish:"Recent ratings"}, "Earnings history": {hi:"कमाई का इतिहास",hinglish:"Earnings history"},
};

function translateFBText(value: string, language: FBLanguage) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return value;
  const match = Object.entries(FB_TRANSLATIONS).find(([key, item]) => clean === key || clean === item.hi || clean === item.hinglish);
  if (!match) return value;
  const canonical = match[0];
  const found = match[1];
  const translated = language === "en" ? canonical : language === "hi" ? found.hi : found.hinglish;
  const lead = value.match(/^\s*/)?.[0] || "";
  const trail = value.match(/\s*$/)?.[0] || "";
  return lead + translated + trail;
}

function LocalizedUI({ store }: { store: ReturnType<typeof useStore> }) {
  useEffect(() => {
    const allowed = ["customer", "delivery"].includes(String(store.user?.role || ""));
    if (!allowed) return;
    const apply = () => {
      const language = (document.documentElement.getAttribute("data-fb-language") || "en") as FBLanguage;
      document.querySelectorAll("body *:not(script):not(style)").forEach((el: Element) => {
        if ((el as HTMLElement).dataset.fbNoTranslate === "true") return;
        Array.from(el.childNodes).forEach(node => {
          if (node.nodeType !== Node.TEXT_NODE) return;
          const text = node.nodeValue || "";
          const translated = translateFBText(text, language);
          if (translated !== text) node.nodeValue = translated;
        });
      });
      document.querySelectorAll<HTMLInputElement>("input[placeholder],textarea[placeholder]").forEach(input => {
        const translated = translateFBText(input.placeholder, language);
        if (translated !== input.placeholder) input.placeholder = translated;
      });
    };
    apply();
    let scheduled = false;
    const observer = new MutationObserver(() => { if(scheduled) return; scheduled = true; window.requestAnimationFrame(() => { scheduled = false; apply(); }); });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const handler = () => apply();
    window.addEventListener("fb-language-changed", handler);
    return () => { observer.disconnect(); window.removeEventListener("fb-language-changed", handler); };
  }, [store.user?.id, store.user?.role]);
  return null;
}

function LiveClock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  return <div className={className} aria-label="Current local time"><div className="font-semibold">{now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div><div className="text-lg md:text-xl font-bold tracking-wide">{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</div></div>;
}

function AccessibilityStyles() {
  return (
    <style>{`
      html { scroll-behavior: smooth; }
      body { overflow-x: hidden; }

      /* Global role-dashboard visual layer: presentation only. Existing
         layout, cards, data, APIs and interactions remain unchanged. */
      .fb-dashboard-shell {
        position: relative;
        isolation: isolate;
        min-height: 100vh;
        overflow: hidden;
        background:
          radial-gradient(circle at 8% 10%, rgba(16,185,129,.14), transparent 24%),
          radial-gradient(circle at 92% 8%, rgba(59,130,246,.12), transparent 25%),
          radial-gradient(circle at 86% 78%, rgba(139,92,246,.10), transparent 28%),
          radial-gradient(circle at 12% 86%, rgba(245,158,11,.08), transparent 25%),
          linear-gradient(135deg, #f4fbf8 0%, #f5f8ff 48%, #faf7ff 100%) !important;
      }
      .fb-dashboard-shell::before,
      .fb-dashboard-shell::after {
        content: "";
        position: fixed;
        z-index: -1;
        width: 280px;
        height: 280px;
        border-radius: 999px;
        pointer-events: none;
        filter: blur(8px);
        opacity: .55;
        animation: fb-dashboard-float 14s ease-in-out infinite alternate;
      }
      .fb-dashboard-shell::before {
        top: 12vh;
        right: -90px;
        background: radial-gradient(circle, rgba(16,185,129,.17), transparent 68%);
      }
      .fb-dashboard-shell::after {
        bottom: 6vh;
        left: -100px;
        background: radial-gradient(circle, rgba(99,102,241,.13), transparent 68%);
        animation-delay: -5s;
      }
      .fb-dashboard-shell > main,
      .fb-dashboard-shell > .flex,
      .fb-dashboard-shell #admin-main {
        position: relative;
        z-index: 1;
      }
      .fb-dashboard-shell > header,
      .fb-dashboard-shell #admin-main > header {
        backdrop-filter: blur(12px);
      }
      .fb-dashboard-shell .bg-white {
        background: rgba(255,255,255,.88) !important;
        backdrop-filter: blur(8px);
        box-shadow: 0 10px 28px rgba(15,23,42,.045);
      }
      .fb-dashboard-shell .bg-slate-50 {
        background: rgba(248,250,252,.70) !important;
      }
      .fb-dashboard-shell .bg-slate-100 {
        background: rgba(241,245,249,.78) !important;
      }
      .fb-dashboard-shell .border {
        border-color: rgba(148,163,184,.24) !important;
      }
      .fb-dashboard-shell .bg-white:hover {
        box-shadow: 0 14px 34px rgba(15,23,42,.065);
      }
      .fb-dashboard-shell.fb-admin-shell {
        background:
          radial-gradient(circle at 7% 14%, rgba(16,185,129,.12), transparent 22%),
          radial-gradient(circle at 90% 16%, rgba(14,165,233,.10), transparent 23%),
          radial-gradient(circle at 78% 88%, rgba(99,102,241,.09), transparent 25%),
          linear-gradient(135deg, #f4faf8, #f4f7fb 55%, #f8f7fc) !important;
      }
      .fb-dashboard-shell.fb-delivery-shell {
        background:
          radial-gradient(circle at 6% 10%, rgba(16,185,129,.15), transparent 23%),
          radial-gradient(circle at 94% 20%, rgba(14,165,233,.13), transparent 25%),
          radial-gradient(circle at 75% 90%, rgba(59,130,246,.09), transparent 28%),
          linear-gradient(135deg, #f2fbf7, #f4f8ff 55%, #f7f9ff) !important;
      }
      .fb-dashboard-shell.fb-care-shell {
        background:
          radial-gradient(circle at 8% 12%, rgba(16,185,129,.14), transparent 24%),
          radial-gradient(circle at 91% 13%, rgba(168,85,247,.10), transparent 24%),
          radial-gradient(circle at 82% 84%, rgba(59,130,246,.09), transparent 27%),
          linear-gradient(135deg, #f5fbf9, #f5f8ff 52%, #faf7ff) !important;
      }
      .fb-dashboard-shell.fb-finance-shell {
        background:
          radial-gradient(circle at 7% 10%, rgba(16,185,129,.13), transparent 23%),
          radial-gradient(circle at 92% 12%, rgba(59,130,246,.11), transparent 24%),
          radial-gradient(circle at 78% 86%, rgba(16,185,129,.08), transparent 27%),
          linear-gradient(135deg, #f3faf8, #f5f8fc 52%, #f8f8fb) !important;
      }
      @keyframes fb-dashboard-float {
        0% { transform: translate3d(0, 0, 0) scale(1); }
        100% { transform: translate3d(0, -18px, 0) scale(1.06); }
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-dashboard-shell::before,
        .fb-dashboard-shell::after { animation: none !important; }
      }
      html.fb-dark-mode .fb-dashboard-shell {
        background:
          radial-gradient(circle at 8% 10%, rgba(16,185,129,.13), transparent 25%),
          radial-gradient(circle at 92% 8%, rgba(59,130,246,.12), transparent 25%),
          radial-gradient(circle at 84% 80%, rgba(139,92,246,.10), transparent 29%),
          radial-gradient(circle at 12% 88%, rgba(245,158,11,.055), transparent 25%),
          linear-gradient(135deg, #071715 0%, #0b1220 50%, #120e1d 100%) !important;
        color: #e5e7eb !important;
      }
      html.fb-dark-mode .fb-dashboard-shell::before {
        background: radial-gradient(circle, rgba(16,185,129,.12), transparent 68%);
        opacity: .65;
      }
      html.fb-dark-mode .fb-dashboard-shell::after {
        background: radial-gradient(circle, rgba(99,102,241,.10), transparent 68%);
        opacity: .65;
      }
      html.fb-dark-mode .fb-dashboard-shell .bg-white {
        background: rgba(15,23,42,.90) !important;
        color: #e5e7eb !important;
        border-color: #263449 !important;
        box-shadow: 0 14px 36px rgba(0,0,0,.20);
      }
      html.fb-dark-mode .fb-dashboard-shell .bg-slate-50 {
        background: rgba(15,23,42,.72) !important;
      }
      html.fb-dark-mode .fb-dashboard-shell .bg-slate-100 {
        background: rgba(30,41,59,.76) !important;
      }
      html.fb-dark-mode .fb-dashboard-shell .border,
      html.fb-dark-mode .fb-dashboard-shell .border-slate-200,
      html.fb-dark-mode .fb-dashboard-shell .border-slate-300 {
        border-color: #334155 !important;
      }
      html.fb-dark-mode .fb-dashboard-shell .text-slate-950,
      html.fb-dark-mode .fb-dashboard-shell .text-slate-900,
      html.fb-dark-mode .fb-dashboard-shell .text-slate-800,
      html.fb-dark-mode .fb-dashboard-shell .text-slate-700,
      html.fb-dark-mode .fb-dashboard-shell .text-gray-900,
      html.fb-dark-mode .fb-dashboard-shell .text-gray-800,
      html.fb-dark-mode .fb-dashboard-shell .text-gray-700 {
        color: #f1f5f9 !important;
      }
      html.fb-dark-mode .fb-dashboard-shell .text-slate-600,
      html.fb-dark-mode .fb-dashboard-shell .text-slate-500,
      html.fb-dark-mode .fb-dashboard-shell .text-slate-400,
      html.fb-dark-mode .fb-dashboard-shell .text-gray-600,
      html.fb-dark-mode .fb-dashboard-shell .text-gray-500 {
        color: #a8b4c7 !important;
      }
      html.fb-dark-mode .fb-dashboard-shell .bg-slate-200 { background: #334155 !important; }
      html.fb-dark-mode .fb-dashboard-shell input,
      html.fb-dark-mode .fb-dashboard-shell select,
      html.fb-dark-mode .fb-dashboard-shell textarea {
        background: rgba(2,6,23,.72) !important;
        color: #f1f5f9 !important;
        border-color: #475569 !important;
      }
      html.fb-dark-mode .fb-dashboard-shell input::placeholder,
      html.fb-dark-mode .fb-dashboard-shell textarea::placeholder { color: #64748b !important; }
      html.fb-dark-mode .fb-dashboard-shell .hover\\:bg-slate-50:hover { background: #1e293b !important; }
      html.fb-dark-mode .fb-dashboard-shell .hover\\:bg-slate-100:hover { background: #334155 !important; }
      html.fb-dark-mode .fb-dashboard-shell > header,
      html.fb-dark-mode .fb-dashboard-shell #admin-main > header {
        background: rgba(7,18,31,.88) !important;
        border-color: rgba(52,211,153,.18) !important;
      }

      /* Customer post-login visual refresh: keep the existing layout and
         functionality intact while replacing the plain white canvas with a
         soft, colorful FreshBasket background. Employee/admin screens are not
         affected because the shell is applied only to customer Layout pages. */
      .fb-customer-shell {
        min-height: 100vh;
        background:
          radial-gradient(circle at 8% 8%, rgba(16,185,129,.16), transparent 28%),
          radial-gradient(circle at 92% 12%, rgba(59,130,246,.14), transparent 27%),
          radial-gradient(circle at 78% 72%, rgba(168,85,247,.10), transparent 30%),
          radial-gradient(circle at 18% 88%, rgba(245,158,11,.10), transparent 28%),
          linear-gradient(135deg, #f0fdf9 0%, #f4f8ff 48%, #faf7ff 100%);
      }
      .fb-customer-shell #main-content {
        min-height: 52vh;
        background: transparent;
      }
      .fb-customer-shell header {
        background: rgba(255,255,255,.88) !important;
        border-color: rgba(16,185,129,.16) !important;
        box-shadow: 0 8px 28px rgba(15,23,42,.06);
      }
      .fb-customer-shell main {
        position: relative;
      }
      /* Keep fixed customer overlays (Delivery Chat, location selectors, etc.)
         above the page content. The previous overflow clipping could hide a
         fixed chat modal behind/clipped by later order cards such as Items. */
      .fb-customer-shell { position: relative; isolation: isolate; overflow: visible; }
      .fb-customer-shell::after {
        content: ""; position: fixed; z-index: -1; width: 300px; height: 300px;
        border-radius: 999px; right: -110px; bottom: 8vh; pointer-events: none;
        background: radial-gradient(circle, rgba(99,102,241,.10), transparent 68%);
        filter: blur(8px); opacity: .65; animation: fb-customer-float 16s ease-in-out infinite alternate;
      }
      @keyframes fb-customer-float {
        0% { transform: translate3d(0, 0, 0) scale(1); }
        100% { transform: translate3d(-18px, -14px, 0) scale(1.07); }
      }
      @media (prefers-reduced-motion: reduce) { .fb-customer-shell::after { animation: none !important; } }
      .fb-customer-shell main::before {
        content: "";
        position: absolute;
        width: 180px;
        height: 180px;
        border-radius: 999px;
        top: 30px;
        right: -80px;
        background: rgba(16,185,129,.08);
        filter: blur(2px);
        pointer-events: none;
      }
      .fb-customer-shell .bg-white {
        background: rgba(255,255,255,.86) !important;
        backdrop-filter: blur(8px);
      }
      .fb-customer-shell .bg-slate-50 {
        background: rgba(239,246,255,.72) !important;
      }
      .fb-customer-shell .bg-slate-100 {
        background: rgba(226,232,240,.72) !important;
      }
      .fb-customer-shell .border {
        border-color: rgba(148,163,184,.25) !important;
      }
      .fb-customer-shell .fb-depth-card {
        box-shadow: 0 14px 34px rgba(15,23,42,.07), 0 2px 8px rgba(16,185,129,.05);
      }
      .fb-customer-shell .bg-emerald-50 {
        background: rgba(209,250,229,.72) !important;
      }
      .fb-customer-shell footer {
        position: relative;
      }

      /* Customer dark mode: keep every customer-facing surface readable.
         Scoped to .fb-customer-shell so employee/admin screens are untouched. */
      html.fb-dark-mode .fb-customer-shell::after { background: radial-gradient(circle, rgba(99,102,241,.08), transparent 68%); opacity: .45; }
      html.fb-dark-mode .fb-customer-shell {
        background:
          radial-gradient(circle at 8% 8%, rgba(16,185,129,.13), transparent 28%),
          radial-gradient(circle at 92% 12%, rgba(59,130,246,.12), transparent 27%),
          radial-gradient(circle at 78% 72%, rgba(168,85,247,.10), transparent 30%),
          radial-gradient(circle at 18% 88%, rgba(245,158,11,.07), transparent 28%),
          linear-gradient(135deg, #071a17 0%, #0b1220 48%, #130d1f 100%) !important;
        color: #e5e7eb !important;
      }
      html.fb-dark-mode .fb-customer-shell header {
        background: rgba(7,18,31,.88) !important;
        border-color: rgba(52,211,153,.18) !important;
        box-shadow: 0 10px 32px rgba(0,0,0,.28) !important;
      }
      html.fb-dark-mode .fb-customer-shell footer {
        background: #020617 !important;
        color: #e2e8f0 !important;
        border-top-color: #1e293b !important;
      }
      html.fb-dark-mode .fb-customer-shell .bg-white {
        background: rgba(15,23,42,.88) !important;
        color: #e5e7eb !important;
        border-color: #263449 !important;
        box-shadow: 0 16px 40px rgba(0,0,0,.20);
      }
      html.fb-dark-mode .fb-customer-shell .bg-slate-50 { background: rgba(15,23,42,.78) !important; }
      html.fb-dark-mode .fb-customer-shell .bg-slate-100 { background: rgba(30,41,59,.78) !important; }
      html.fb-dark-mode .fb-customer-shell .bg-slate-200 { background: #334155 !important; }
      html.fb-dark-mode .fb-customer-shell .bg-emerald-50 { background: rgba(6,78,59,.30) !important; }
      html.fb-dark-mode .fb-customer-shell .bg-blue-50 { background: rgba(30,64,175,.20) !important; }
      html.fb-dark-mode .fb-customer-shell .bg-red-50 { background: rgba(127,29,29,.22) !important; }
      html.fb-dark-mode .fb-customer-shell .bg-yellow-50 { background: rgba(113,63,18,.22) !important; }
      html.fb-dark-mode .fb-customer-shell .bg-purple-50 { background: rgba(88,28,135,.22) !important; }
      html.fb-dark-mode .fb-customer-shell .text-slate-950,
      html.fb-dark-mode .fb-customer-shell .text-slate-900,
      html.fb-dark-mode .fb-customer-shell .text-slate-800,
      html.fb-dark-mode .fb-customer-shell .text-slate-700,
      html.fb-dark-mode .fb-customer-shell .text-gray-900,
      html.fb-dark-mode .fb-customer-shell .text-gray-800,
      html.fb-dark-mode .fb-customer-shell .text-gray-700 { color: #f1f5f9 !important; }
      html.fb-dark-mode .fb-customer-shell .text-slate-600,
      html.fb-dark-mode .fb-customer-shell .text-slate-500,
      html.fb-dark-mode .fb-customer-shell .text-slate-400,
      html.fb-dark-mode .fb-customer-shell .text-gray-600,
      html.fb-dark-mode .fb-customer-shell .text-gray-500,
      html.fb-dark-mode .fb-customer-shell .text-gray-400 { color: #a8b4c7 !important; }
      html.fb-dark-mode .fb-customer-shell .text-slate-300,
      html.fb-dark-mode .fb-customer-shell .text-gray-300 { color: #cbd5e1 !important; }
      html.fb-dark-mode .fb-customer-shell .border,
      html.fb-dark-mode .fb-customer-shell .border-slate-100,
      html.fb-dark-mode .fb-customer-shell .border-slate-200,
      html.fb-dark-mode .fb-customer-shell .border-slate-300,
      html.fb-dark-mode .fb-customer-shell .border-gray-200,
      html.fb-dark-mode .fb-customer-shell .border-gray-300 { border-color: #334155 !important; }
      html.fb-dark-mode .fb-customer-shell input,
      html.fb-dark-mode .fb-customer-shell select,
      html.fb-dark-mode .fb-customer-shell textarea {
        background: rgba(2,6,23,.72) !important;
        color: #f1f5f9 !important;
        border-color: #475569 !important;
      }
      html.fb-dark-mode .fb-customer-shell input::placeholder,
      html.fb-dark-mode .fb-customer-shell textarea::placeholder { color: #64748b !important; }
      html.fb-dark-mode .fb-customer-shell button:not(.bg-emerald-600):not(.bg-slate-900),
      html.fb-dark-mode .fb-customer-shell a {
        border-color: #334155;
      }
      html.fb-dark-mode .fb-customer-shell .hover\:bg-slate-50:hover { background: #1e293b !important; }
      html.fb-dark-mode .fb-customer-shell .hover\:bg-slate-100:hover { background: #334155 !important; }
      html.fb-dark-mode .fb-customer-shell .shadow-sm,
      html.fb-dark-mode .fb-customer-shell .shadow-md,
      html.fb-dark-mode .fb-customer-shell .shadow-lg { box-shadow: 0 12px 30px rgba(0,0,0,.24) !important; }

      /* Make the floating Preferences control look intentional in both modes. */
      .fb-preferences-trigger {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.14);
        letter-spacing: .01em;
        box-shadow: 0 12px 30px rgba(2,6,23,.28), 0 0 0 1px rgba(16,185,129,.08);
        background: linear-gradient(135deg, #0f172a 0%, #064e3b 100%) !important;
      }
      .fb-preferences-trigger::before {
        content: "";
        position: absolute;
        inset: 1px;
        border-radius: inherit;
        background: linear-gradient(120deg, rgba(255,255,255,.12), transparent 42%, rgba(16,185,129,.10));
        pointer-events: none;
      }
      .fb-preferences-trigger span { position: relative; }
      .fb-preferences-trigger svg { position: relative; filter: drop-shadow(0 0 6px rgba(52,211,153,.35)); }
      html.fb-dark-mode .fb-preferences-trigger {
        background: linear-gradient(135deg, #020617 0%, #064e3b 55%, #0f172a 100%) !important;
        border-color: rgba(52,211,153,.30) !important;
        box-shadow: 0 14px 34px rgba(0,0,0,.42), 0 0 20px rgba(16,185,129,.08);
      }
      html.fb-dark-mode .fb-preferences-panel {
        background: rgba(8,15,28,.96) !important;
        color: #f1f5f9 !important;
        border-color: #334155 !important;
        box-shadow: 0 24px 60px rgba(0,0,0,.46), 0 0 0 1px rgba(52,211,153,.08);
        backdrop-filter: blur(16px);
      }
      html.fb-dark-mode .fb-preferences-panel .text-slate-500 { color: #94a3b8 !important; }
      html.fb-dark-mode .fb-preferences-panel button:not(.bg-emerald-600) {
        color: #dbe4ef !important;
        background: rgba(15,23,42,.72);
        border-color: #334155 !important;
      }
      html.fb-dark-mode .fb-preferences-panel button:not(.bg-emerald-600):hover { background: #1e293b !important; }
      html.fb-dark-mode .fb-preferences-panel .hover\:bg-slate-100:hover { background: #1e293b !important; }
      * { scrollbar-width: thin; }
      button, a, input, select, textarea { -webkit-tap-highlight-color: transparent; }
      button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
        outline: 3px solid rgba(16, 185, 129, 0.35);
        outline-offset: 2px;
      }
      input::placeholder, textarea::placeholder { color: #94a3b8; opacity: 1; }
      html.fb-dark-mode, html.fb-dark-mode body { background: #0f172a !important; color: #e2e8f0 !important; }
      html.fb-dark-mode body .bg-white { background-color: #111827 !important; }
      html.fb-dark-mode body .bg-slate-50 { background-color: #0f172a !important; }
      html.fb-dark-mode body .bg-slate-100 { background-color: #1e293b !important; }
      html.fb-dark-mode body .bg-slate-200 { background-color: #334155 !important; }
      html.fb-dark-mode body .text-slate-900, html.fb-dark-mode body .text-slate-800, html.fb-dark-mode body .text-slate-700 { color: #e2e8f0 !important; }
      html.fb-dark-mode body .text-slate-600, html.fb-dark-mode body .text-slate-500 { color: #94a3b8 !important; }
      html.fb-dark-mode body .border, html.fb-dark-mode body .border-slate-200, html.fb-dark-mode body .border-slate-300 { border-color: #334155 !important; }
      html.fb-dark-mode body input, html.fb-dark-mode body select, html.fb-dark-mode body textarea { background-color: #0f172a !important; color: #e2e8f0 !important; border-color: #475569 !important; }
      html.fb-dark-mode body .hover\\:bg-slate-50:hover { background-color: #1e293b !important; }
      html.fb-dark-mode .fb-preferences-panel { background: #111827 !important; color: #e2e8f0 !important; border-color: #334155 !important; }
      /* Login page dark-theme contrast: keep the existing layout/functionality,
         but give the login card a true dark surface so inherited light text remains readable. */
      html.fb-dark-mode #fb-login-page .fb-login-card {
        background: rgba(17,24,39,.96) !important;
        border-color: #334155 !important;
        box-shadow: 0 24px 70px rgba(0,0,0,.42), 0 0 0 1px rgba(16,185,129,.10);
        color: #e2e8f0 !important;
      }
      html.fb-dark-mode #fb-login-page .fb-login-card input,
      html.fb-dark-mode #fb-login-page .fb-login-card select {
        background: #0f172a !important;
        color: #e2e8f0 !important;
        border-color: #475569 !important;
      }
      html.fb-dark-mode #fb-login-page .fb-login-card input::placeholder { color: #94a3b8 !important; }
      html.fb-dark-mode #fb-login-page .fb-login-card option {
        background: #0f172a !important;
        color: #e2e8f0 !important;
      }
      html.fb-dark-mode #fb-login-page .fb-login-card .bg-emerald-50 {
        background: rgba(6,78,59,.32) !important;
        border-color: #065f46 !important;
      }
      html.fb-dark-mode #fb-login-page .fb-login-card .bg-slate-950 {
        background: #1e293b !important;
      }
      html.fb-dark-mode #fb-login-page .fb-login-card .bg-slate-300 {
        background: #475569 !important;
      }
      html.fb-dark-mode #fb-login-page .fb-login-card .border-t { border-color: #334155 !important; }
      html:not(.fb-dark-mode) #fb-login-page {
        background:
          radial-gradient(circle at 10% 18%, rgba(16, 185, 129, 0.20), transparent 30%),
          radial-gradient(circle at 88% 18%, rgba(59, 130, 246, 0.14), transparent 32%),
          radial-gradient(circle at 78% 86%, rgba(16, 185, 129, 0.16), transparent 34%),
          linear-gradient(135deg, #e4f5ee 0%, #edf4fb 52%, #f4f7f8 100%) !important;
      }
      html:not(.fb-dark-mode) #fb-login-page::before {
        content: ""; position: absolute; inset: 0; pointer-events: none;
        background: linear-gradient(120deg, rgba(255,255,255,.55), transparent 35%, rgba(255,255,255,.32) 72%, transparent);
      }
      html:not(.fb-dark-mode) #fb-login-page .fb-login-hero { color: #0f172a !important; }
      html:not(.fb-dark-mode) #fb-login-page .fb-login-hero .text-emerald-200 { color: #047857 !important; }
      html:not(.fb-dark-mode) #fb-login-page .fb-login-hero .text-emerald-300 { color: #059669 !important; }
      html:not(.fb-dark-mode) #fb-login-page .fb-login-hero p.text-slate-300 { color: #334155 !important; }
      html:not(.fb-dark-mode) #fb-login-page .fb-login-hero-grid > div {
        background: rgba(255,255,255,.66) !important; border-color: rgba(15,23,42,.08) !important;
        box-shadow: 0 10px 30px rgba(15,23,42,.07); backdrop-filter: blur(12px);
      }
      html:not(.fb-dark-mode) #fb-login-page .fb-login-hero-grid > div:hover {
        background: rgba(255,255,255,.84) !important; transform: translateY(-3px);
      }
      html:not(.fb-dark-mode) #fb-login-page .fb-login-card {
        background: rgba(255,255,255,.82) !important; border-color: rgba(255,255,255,.92) !important;
        box-shadow: 0 24px 70px rgba(15,23,42,.14), 0 0 0 1px rgba(59,130,246,.08);
      }
      html:not(.fb-dark-mode) #fb-login-page .fb-login-card input,
      html:not(.fb-dark-mode) #fb-login-page .fb-login-card select {
        background: rgba(248,250,252,.90) !important; border-color: #dbe4ee !important;
      }

      /* Global FreshBasket typography polish: visual-only styling.  It does not
         change copy, layout, routing, state, APIs, or interaction behaviour. */
      :root {
        --fb-font-ui: Inter, "Plus Jakarta Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        --fb-font-display: "Plus Jakarta Sans", Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      body {
        font-family: var(--fb-font-ui) !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
      body button,
      body input,
      body select,
      body textarea {
        font-family: var(--fb-font-ui) !important;
      }
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--fb-font-display) !important;
        letter-spacing: -0.025em;
        text-wrap: balance;
      }
      h1 { font-weight: 800; line-height: 1.12; }
      h2 { font-weight: 800; line-height: 1.18; }
      h3 { font-weight: 750; line-height: 1.22; }
      h4, h5, h6 { font-weight: 700; line-height: 1.28; }
      p, li, label, th, td {
        letter-spacing: -0.006em;
      }
      button, a {
        font-weight: 600;
        letter-spacing: -0.008em;
      }
      input, select, textarea {
        letter-spacing: -0.006em;
      }
      /* Give page titles and major section headings a restrained editorial look. */
      main h1:not(.text-emerald-600),
      main h2,
      main h3 {
        text-shadow: 0 1px 0 rgba(255,255,255,.28);
      }
      html.fb-dark-mode main h1:not(.text-emerald-600),
      html.fb-dark-mode main h2,
      html.fb-dark-mode main h3 {
        text-shadow: 0 1px 18px rgba(0,0,0,.22);
      }
      /* Keep small metadata readable while making it feel less plain. */
      .text-xs {
        letter-spacing: .015em;
      }
      .uppercase {
        letter-spacing: .075em;
      }
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


type DeliveryCoordinate = {
  latitude: number;
  longitude: number;
};

const isValidCoordinate = (latitude: any, longitude: any) =>
  Number.isFinite(Number(latitude)) &&
  Number.isFinite(Number(longitude)) &&
  Number(latitude) >= -90 &&
  Number(latitude) <= 90 &&
  Number(longitude) >= -180 &&
  Number(longitude) <= 180;

const isLikelyIndiaCoordinate = (latitude: any, longitude: any) =>
  isValidCoordinate(latitude, longitude) &&
  Number(latitude) >= 6 && Number(latitude) <= 37.5 &&
  Number(longitude) >= 68 && Number(longitude) <= 97.7;

function ImagePickerButtons({
  onFile,
  disabled = false,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  compact = false,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  accept?: string;
  compact?: boolean;
}) {
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const button = compact ? "px-3 py-2 rounded-lg text-xs" : "px-3 py-2.5 rounded-xl text-sm";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} onClick={() => uploadRef.current?.click()} className={`border font-bold inline-flex items-center gap-2 ${button} disabled:opacity-50`}>
        <Upload size={15}/> Upload Image
      </button>
      <button type="button" disabled={disabled} onClick={() => cameraRef.current?.click()} className={`border border-emerald-200 text-emerald-700 bg-emerald-50 font-bold inline-flex items-center gap-2 ${button} disabled:opacity-50`}>
        <Camera size={15}/> Capture Image
      </button>
      <input ref={uploadRef} type="file" accept={accept} className="hidden" disabled={disabled} onChange={e => { const f=e.target.files?.[0]; if(f) onFile(f); e.currentTarget.value=""; }}/>
      <input ref={cameraRef} type="file" accept={accept} capture="environment" className="hidden" disabled={disabled} onChange={e => { const f=e.target.files?.[0]; if(f) onFile(f); e.currentTarget.value=""; }}/>
    </div>
  );
}

function useDeliveryRealtime(onEvent: (payload:any) => void, orderId?: string, enabled = true) {
  const callbackRef = useRef(onEvent);
  useEffect(() => { callbackRef.current = onEvent; }, [onEvent]);
  useEffect(() => {
    if (!enabled) return;
    const token = getAuthToken();
    if (!token) return;
    const controller = new AbortController();
    let buffer = "";
    const connect = async () => {
      try {
        const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : "";
        const response = await fetch(API + "/realtime/delivery" + query, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream:true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";
          for (const chunk of chunks) {
            const line = chunk.split("\n").find(x => x.startsWith("data:"));
            if (!line) continue;
            try { callbackRef.current(JSON.parse(line.slice(5).trim())); } catch {}
          }
        }
      } catch {}
    };
    void connect();
    return () => controller.abort();
  }, [orderId, enabled]);
}

function FitDeliveryMap({
  points,
}: {
  points: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points as any, {
        padding: [35, 35],
        maxZoom: 15,
      });
    }
  }, [map, points]);

  return null;
}

async function geocodeDeliveryAddress(_address: string, _city: string, _pincode: string): Promise<DeliveryCoordinate | null> {
  // Destination geocoding is intentionally server-side. This prevents browser
  // CORS/rate-limit/timeouts and keeps one authoritative destination resolver.
  return null;
}

function DeliveryRouteMap({
  origin,
  destination,
  originLabel = "Your location",
  destinationLabel = "Customer",
  waypoint,
  waypointLabel = "Store",
  orderId,
}: {
  origin: DeliveryCoordinate;
  destination: DeliveryCoordinate;
  originLabel?: string;
  destinationLabel?: string;
  waypoint?: DeliveryCoordinate;
  waypointLabel?: string;
  orderId?: string;
}) {
  const [route, setRoute] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState("");

  const points: [number, number][] = [
    [Number(origin.latitude), Number(origin.longitude)],
    [Number(destination.latitude), Number(destination.longitude)],
    ...(waypoint ? [[Number(waypoint.latitude), Number(waypoint.longitude)] as [number,number]] : []),
  ];

  useEffect(() => {
    let cancelled = false;
    const loadRoute = async () => {
      setRouteLoading(true);
      setRouteError("");
      setRoute([]);
      try {
        if (!orderId) throw new Error("Order route context unavailable");
        const response = await axios.get(`${API}/orders/${encodeURIComponent(orderId)}/tracking/route`, { headers: adminHeaders(), timeout: 15000 });
        const candidate = response.data?.data?.coordinates;
        if (!Array.isArray(candidate) || candidate.length < 2) {
          throw new Error(response.data?.data?.message || "Route unavailable");
        }
        const converted: [number, number][] = candidate
          .filter((point: any) => Array.isArray(point) && point.length >= 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])))
          .map((point: any) => [Number(point[0]), Number(point[1])] as [number, number]);
        if (converted.length < 2) throw new Error("Route unavailable");
        if (!cancelled) setRoute(converted);
      } catch {
        if (!cancelled) setRouteError("Live road route is currently unavailable. You can still open navigation.");
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };
    void loadRoute();
    return () => { cancelled = true; };
  }, [orderId, origin.latitude, origin.longitude, destination.latitude, destination.longitude, waypoint?.latitude, waypoint?.longitude]);

  const openNavigation = () => {
    const url =
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${Number(origin.latitude)},${Number(origin.longitude)}` +
      `&destination=${Number(destination.latitude)},${Number(destination.longitude)}` +
      "&travelmode=driving";

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-5 rounded-2xl border overflow-hidden bg-slate-50">
      <div className="p-4 bg-white border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">Delivery route</p>
          <p className="text-xs text-slate-500 mt-1">
            {originLabel === destinationLabel ? destinationLabel : `${originLabel} → ${destinationLabel}`}
          </p>
        </div>

        <button
          type="button"
          onClick={openNavigation}
          className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2"
        >
          <MapPin size={16} />
          Start Navigation
        </button>
      </div>

      <FBMapContainer
        center={points[0]}
        zoom={13}
        scrollWheelZoom={false}
        className="w-full h-[300px] sm:h-[360px]"
      >
        <FBTileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitDeliveryMap points={points} />

        <FBCircleMarker
          center={points[0]}
          radius={10}
          pathOptions={{
            color: "#047857",
            fillColor: "#10b981",
            fillOpacity: 0.95,
            weight: 3,
          }}
        >
          <FBPopup>
            <b>{originLabel}</b>
          </FBPopup>
        </FBCircleMarker>

        <FBCircleMarker
          center={points[1]}
          radius={10}
          pathOptions={{
            color: "#b91c1c",
            fillColor: "#ef4444",
            fillOpacity: 0.95,
            weight: 3,
          }}
        >
          <FBPopup>
            <b>{destinationLabel}</b>
            <br />
            Delivery destination
          </FBPopup>
        </FBCircleMarker>

        {waypoint && (
          <FBCircleMarker
            center={[Number(waypoint.latitude), Number(waypoint.longitude)]}
            radius={8}
            pathOptions={{ color: "#92400e", fillColor: "#f59e0b", fillOpacity: 0.95, weight: 3 }}
          >
            <FBPopup><b>{waypointLabel}</b><br/>Store location</FBPopup>
          </FBCircleMarker>
        )}

        {route.length > 1 && (
          <FBPolyline
            positions={route}
            pathOptions={{
              color: "#2563eb",
              weight: 5,
              opacity: 0.85,
            }}
          />
        )}
      </FBMapContainer>

      <div className="p-3 bg-white border-t">
        {routeLoading ? (
          <p className="text-xs text-slate-500">
            Loading driving route...
          </p>
        ) : routeError ? (
          <p className="text-xs text-amber-700">{routeError}</p>
        ) : (
          <p className="text-xs text-emerald-700 font-semibold">
            Route loaded. Follow the blue route from the store to the customer.
          </p>
        )}
      </div>
    </div>
  );
}

function useNativeFreshBasketPush(store: ReturnType<typeof useStore>) {
  const nav = useNavigate();
  const userId = String(store.user?.id || "");

  useEffect(() => {
    if (!IS_NATIVE_APP || !userId) return;
    let active = true;
    const handles: any[] = [];

    const openDeepLink = (value: any) => {
      if (!active) return;
      const raw = String(value || "").trim();
      if (!raw) return;
      try {
        const target = raw.startsWith("http://") || raw.startsWith("https://")
          ? new URL(raw).pathname + new URL(raw).search + new URL(raw).hash
          : raw.startsWith("freshbasket://")
            ? (() => { const u = new URL(raw); return u.pathname || "/notifications"; })()
            : raw;
        if (target.startsWith("/")) nav(target);
      } catch {
        if (raw.startsWith("/")) nav(raw);
      }
    };

   const setup = async () => {
  try {
    console.log("[FreshBasket Push] setup started");

    const permission = await PushNotifications.checkPermissions();
    console.log("[FreshBasket Push] permission:", permission);

    let receive = permission.receive;

    if (receive !== "granted") {
      const requested = await PushNotifications.requestPermissions();
      receive = requested.receive;
      console.log("[FreshBasket Push] requested permission:", requested);
    }

    if (receive !== "granted") {
      console.warn("[FreshBasket Push] notification permission not granted");
      return;
    }

    handles.push(
      await PushNotifications.addListener("registration", async (token) => {
       console.log("[FreshBasket Push] FCM TOKEN:", token?.value);

        const value = String(token?.value || "").trim();

        if (!value) {
          console.warn("[FreshBasket Push] registration event returned empty token");
          return;
        }

        if (!active) {
          console.warn("[FreshBasket Push] registration received after cleanup");
          return;
        }

        localStorage.setItem("fb-fcm-token", value);
        console.log("[FreshBasket Push] FCM token saved");

        try {
          const response = await axios.post(
            API + "/push/register",
            {
              token: value,
              platform: "android",
              appId: "com.freshbasket.grocery",
            },
            { headers: adminHeaders() }
          );

          console.log(
            "[FreshBasket Push] token registered with server:",
            response?.status
          );
        } catch (error: any) {
          console.error(
            "[FreshBasket Push] server token registration failed:",
            error?.response?.status,
            error?.response?.data || error?.message || error
          );
        }
      })
    );

    handles.push(
      await PushNotifications.addListener("registrationError", (error) => {
        console.error(
          "[FreshBasket Push] REGISTRATION ERROR:",
          error
        );
      })
    );

    handles.push(
      await PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          console.log(
            "[FreshBasket Push] notification received:",
            notification
          );
        }
      )
    );

    handles.push(
      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (event: any) => {
          console.log(
            "[FreshBasket Push] notification action:",
            event
          );

          const data = event?.notification?.data || {};

          openDeepLink(
            data?.deepLink ||
            data?.url ||
            data?.route ||
            ""
          );
        }
      )
    );

    handles.push(
      await CapacitorApp.addListener("appUrlOpen", (event) => {
        console.log(
          "[FreshBasket Push] app URL opened:",
          event?.url
        );

        openDeepLink(event?.url || "");
      })
    );

    console.log("[FreshBasket Push] calling PushNotifications.register()");

    await PushNotifications.register();

    console.log("[FreshBasket Push] register() completed");
  } catch (error: any) {
    console.error(
      "[FreshBasket Push] setup failed:",
      error?.message || error,
      error
    );
  }
};

void setup();

    void setup();
    return () => {
      active = false;
      handles.forEach((h) => { try { void h.remove(); } catch {} });
    };
  }, [userId]);
}

function useStore() {
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [cart, setCart] = useState<any[]>(
    () => JSON.parse(localStorage.getItem("fb-cart") || "[]")
  );
  const [user, setUser] = useState<any>(() => {
    const existing = getAuthUser();
    try {
      if (existing && !sessionStorage.getItem("fb-user")) sessionStorage.setItem("fb-user", JSON.stringify(existing));
      if (existing && !sessionStorage.getItem("fb-token")) {
        const token = localStorage.getItem("fb-token");
        if (token) sessionStorage.setItem("fb-token", token);
      }
    } catch {}
    return existing;
  });
  const [wishlist, setWishlist] = useState<string[]>(
    () => JSON.parse(localStorage.getItem("fb-wishlist") || "[]")
  );
  const [favoriteStores, setFavoriteStores] = useState<string[]>([]);

  // Point 23: keep the existing local wishlist, while also syncing saved
  // products to the authenticated customer account so price-drop alerts can
  // be delivered by the existing server-side notification system.
  useEffect(() => {
    if (user?.role !== "customer") return;
    const localIds = Array.from(new Set(wishlist.map((id) => String(id)).filter(Boolean)));
    axios.get(API + "/customer/wishlist", { headers: adminHeaders() })
      .then(async (r) => {
        const serverIds = Array.isArray(r.data?.savedProductIds) ? r.data.savedProductIds.map((x:any) => String(x)) : [];
        const merged = Array.from(new Set([...serverIds, ...localIds]));
        if (merged.length !== serverIds.length || merged.some((id, i) => id !== serverIds[i])) {
          await axios.post(API + "/customer/wishlist/sync", { productIds: merged }, { headers: adminHeaders() });
        }
        setWishlist(merged);
      })
      .catch(() => {});
  }, [user?.role, user?.id]);

  useEffect(() => {
    if (user?.role !== "customer") { setFavoriteStores([]); return; }
    axios.get(API + "/customer/favorite-stores", { headers: adminHeaders() })
      .then((r) => setFavoriteStores(Array.isArray(r.data?.favoriteStoreIds) ? r.data.favoriteStoreIds.map((x:any) => String(x)) : []))
      .catch(() => setFavoriteStores([]));
  }, [user?.role, user?.id]);

  const toggleFavoriteStore = async (id: string) => {
    const storeId = String(id || "").trim();
    if (!storeId || user?.role !== "customer") return;
    try {
      const r = await axios.patch(API + "/customer/favorite-stores/" + encodeURIComponent(storeId), {}, { headers: adminHeaders() });
      setFavoriteStores(Array.isArray(r.data?.favoriteStoreIds) ? r.data.favoriteStoreIds.map((x:any) => String(x)) : []);
    } catch (e:any) {
      alert(e?.response?.data?.message || "Unable to update favorite store");
    }
  };

  const isFavoriteStore = (id: string) => favoriteStores.includes(String(id));

  useEffect(() => {
    localStorage.setItem("fb-wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  const toggleWishlist = (id: string) => {
    const productId = String(id || "").trim();
    if (!productId) return;
    const alreadySaved = wishlist.includes(productId);
    const next = alreadySaved
      ? wishlist.filter((x) => x !== productId)
      : Array.from(new Set([...wishlist, productId]));
    setWishlist(next);
    if (user?.role === "customer") {
      axios.patch(API + "/customer/wishlist/" + encodeURIComponent(productId), {}, { headers: adminHeaders() }).catch(() => {});
    }
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
    const params = new URLSearchParams(location.search);
    const requestedStore = params.get("storeAdminId");
    const previousStore = localStorage.getItem("fb-store-admin-id") || "";
    const storeAdminId = requestedStore !== null ? requestedStore : previousStore;
    if (storeAdminId) localStorage.setItem("fb-store-admin-id", storeAdminId);
    else localStorage.removeItem("fb-store-admin-id");
    if (previousStore !== storeAdminId) {
      setCart([]);
      localStorage.setItem("fb-cart", "[]");
    }
    const url = storeAdminId
      ? API + "/products?storeAdminId=" + encodeURIComponent(storeAdminId)
      : API + "/products";
    axios.get(url).then((r) => setProducts(Array.isArray(r.data.data) ? r.data.data : [])).catch(() => setProducts([]));
  }, [location.search]);

  const cartItemKey = (item: any) =>
    `${String(item?.product?._id ?? "")}::${String(item?.variant?._id ?? "")}`;

  const add = (p: Product, variant?: ProductVariant) =>
    setCart((c) => {
      const key = `${String(p._id)}::${String(variant?._id ?? "")}`;
      const x = c.find((i) => cartItemKey(i) === key);
      return x
        ? c.map((i) =>
            cartItemKey(i) === key
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...c, { product: p, variant: variant || null, quantity: 1 }];
    });

  const qty = (id: string, n: number) => {
    setCart((currentCart) => {
      const targetId = String(id ?? "");
      const delta = Number(n) || 0;

      return currentCart
        .map((item) => {
          const productId = String(item?.product?._id ?? "");
          const itemId = cartItemKey(item);
          if (itemId !== targetId && productId !== targetId) return item;

          const currentQuantity = Math.max(0, Number(item?.quantity) || 0);
          const nextQuantity = Math.max(0, currentQuantity + delta);

          return { ...item, quantity: nextQuantity };
        })
        .filter((item) => Number(item?.quantity) > 0);
    });
  };

  const clearCart = () => setCart([]);



  const logout = () => {
    const token = getAuthToken();
    const pushToken = localStorage.getItem("fb-fcm-token") || "";
    if (IS_NATIVE_APP && token && pushToken) {
      axios.post(API + "/push/unregister", { token: pushToken }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    let loginHistoryId = "";
    try { loginHistoryId = sessionStorage.getItem("fb-login-history-id") || localStorage.getItem("fb-login-history-id") || ""; } catch { loginHistoryId = localStorage.getItem("fb-login-history-id") || ""; }
    if (token && loginHistoryId) axios.post(API + "/auth/logout", { loginHistoryId }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setUser(null);
    clearAuthSession(token);
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
    cartItemKey,
    toggleWishlist,
    isWishlisted,
    favoriteStores,
    toggleFavoriteStore,
    isFavoriteStore,
  };
}

const saveSelectedDeliveryAddress = (address: any, userId?: string) => {
  try {
    const value = JSON.stringify(address || {});
    localStorage.setItem("fb-delivery-address", value);
    if (userId) localStorage.setItem(`fb-delivery-address:${String(userId)}`, value);
    window.dispatchEvent(new Event("fb-delivery-address-changed"));
  } catch {}
};

const deliveryHeaderLabel = (address: any) => {
  const city = String(address?.city || "").trim();
  const state = String(address?.state || "").trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (address?.address) return String(address.address).split(",")[0].trim();
  return "Select location";
};

function MapPicker({ value, onConfirm, onClose }: { value?: { latitude?: number | null; longitude?: number | null } | null; onConfirm: (latitude: number, longitude: number) => void; onClose: () => void }) {
  const initial = isValidCoordinate(value?.latitude, value?.longitude) ? [Number(value!.latitude), Number(value!.longitude)] as [number, number] : [20.5937, 78.9629] as [number, number];
  const [position, setPosition] = useState<[number, number] | null>(isValidCoordinate(value?.latitude, value?.longitude) ? [Number(value!.latitude), Number(value!.longitude)] : null);
  const PickerEvents = () => { useMapEvents({ click: (e: any) => setPosition([e.latlng.lat, e.latlng.lng]) }); return null; };
  return <div className="fixed inset-0 z-[120] bg-black/50 p-4 grid place-items-center"><div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"><div className="p-4 border-b flex items-center justify-between"><div><h3 className="font-bold text-lg">Choose delivery location</h3><p className="text-xs text-slate-500">Click the map or drag the pin to the exact delivery point.</p></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X size={20}/></button></div><div className="h-[55vh] min-h-[320px]"><FBMapContainer center={initial} zoom={position ? 16 : 5} className="h-full w-full"><FBTileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><PickerEvents/>{position && <FBMarker position={position} draggable eventHandlers={{ dragend: (e:any) => { const p=e.target.getLatLng(); setPosition([p.lat,p.lng]); } }}><FBPopup>Delivery location</FBPopup></FBMarker>}</FBMapContainer></div><div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><p className="text-xs text-slate-500">{position ? `${position[0].toFixed(6)}, ${position[1].toFixed(6)}` : "No location selected yet"}</p><div className="flex gap-2"><button onClick={onClose} className="border rounded-xl px-4 py-2.5 font-bold">Cancel</button><button disabled={!position} onClick={()=>position&&onConfirm(position[0],position[1])} className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 font-bold disabled:opacity-40">Confirm location</button></div></div></div></div>;
}


function LocationSelector({
  store,
  initialAddress,
  onClose,
  onSaved,
}: {
  store: ReturnType<typeof useStore>;
  initialAddress?: any;
  onClose: () => void;
  onSaved: (address: any) => void;
}) {
  const [form, setForm] = useState<any>(() => ({
    label: initialAddress?.label || "Home",
    name: initialAddress?.name || store.user?.name || "",
    phone: initialAddress?.phone || store.user?.phone || "",
    address: initialAddress?.address || "",
    city: initialAddress?.city || "",
    state: initialAddress?.state || "",
    pincode: initialAddress?.pincode || "",
    latitude: isValidCoordinate(initialAddress?.latitude, initialAddress?.longitude) ? Number(initialAddress.latitude) : null,
    longitude: isValidCoordinate(initialAddress?.latitude, initialAddress?.longitude) ? Number(initialAddress.longitude) : null,
    isDefault: true,
  }));
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);

  const applyGeoResult = (item: any, latitude?: number, longitude?: number) => {
    const a = item?.address || {};
    const lat = latitude ?? Number(item?.lat);
    const lng = longitude ?? Number(item?.lon);
    const display = String(item?.display_name || "").trim();
    const locality = String(a.city || a.town || a.village || a.municipality || a.county || "").trim();
    const state = String(a.state || "").trim();
    const pincode = String(a.postcode || "").replace(/\D/g, "").slice(0, 6);
    const street = [a.house_number, a.road, a.neighbourhood || a.suburb].filter(Boolean).join(", ");
    setForm((f: any) => ({
      ...f,
      address: street || display || f.address,
      city: locality || f.city,
      state: state || f.state,
      pincode: pincode || f.pincode,
      latitude: Number.isFinite(lat) ? lat : f.latitude,
      longitude: Number.isFinite(lng) ? lng : f.longitude,
    }));
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error("Reverse geocoding failed");
      const item = await r.json();
      applyGeoResult(item, latitude, longitude);
    } catch {
      setForm((f: any) => ({ ...f, latitude, longitude }));
      setMessage("Coordinates captured. Please complete the address fields before saving.");
    }
  };

  const useCurrentLocation = () => {
    setError(""); setMessage("");
    if (!navigator.geolocation) {
      setError("Current location is not supported by this browser. You can search, use the map, or enter the address manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      (e) => {
        setLocating(false);
        setError(e.code === 1 ? "Location permission was denied. You can still search, use the map, or enter the address manually." : "Unable to get your current location. Please use search, map pin, or manual address.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const searchPlaces = async () => {
    const q = search.trim();
    if (q.length < 3) { setError("Enter at least 3 characters to search for a place or address."); return; }
    setSearching(true); setError("");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error("Search failed");
      const data = await r.json();
      setResults(Array.isArray(data) ? data : []);
      if (!data?.length) setMessage("No matching place found. Try a nearby landmark, locality, city, or pincode.");
    } catch {
      setError("Unable to search this place right now. You can use the map pin or enter the address manually.");
    } finally { setSearching(false); }
  };

  const save = async () => {
    setSaving(true); setError(""); setMessage("");
    try {
      const payload = { ...form, phone: String(form.phone || "").replace(/\D/g, ""), isDefault: true };
      if (!payload.name || String(payload.name).trim().length < 2) throw new Error("Please enter your full name.");
      if (!/^[6-9]\d{9}$/.test(payload.phone)) throw new Error("Please enter a valid 10-digit mobile number.");
      if (!payload.address || String(payload.address).trim().length < 5) throw new Error("Please enter a complete delivery address.");
      if (!payload.city || String(payload.city).trim().length < 2) throw new Error("Please enter your city/town/village.");
      if (!/^\d{6}$/.test(String(payload.pincode || ""))) throw new Error("Please enter a valid 6-digit pincode.");
      let saved: any;
      if (initialAddress?._id) {
        const r = await axios.put(API + "/addresses/" + initialAddress._id, payload, { headers: adminHeaders() });
        saved = r.data?.data;
        await axios.patch(API + "/addresses/" + initialAddress._id + "/default", {}, { headers: adminHeaders() });
      } else {
        const r = await axios.post(API + "/addresses", payload, { headers: adminHeaders() });
        saved = r.data?.data;
      }
      const latest = await axios.get(API + "/addresses", { headers: adminHeaders() });
      const list = Array.isArray(latest.data?.data) ? latest.data.data : [];
      const selected = list.find((a: any) => a.isDefault) || saved || list[0];
      if (!selected) throw new Error("Location was not returned by the server after saving.");
      saveSelectedDeliveryAddress(selected, store.user?.id);
      onSaved(selected);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to save location.");
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[110] bg-slate-950/55 backdrop-blur-sm p-3 sm:p-5 grid place-items-center" role="dialog" aria-modal="true" aria-label="Select delivery location">
    <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-[2rem] border border-white/30 bg-white shadow-2xl">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-4 flex items-center justify-between gap-3">
        <div><p className="text-[11px] font-black uppercase tracking-[.18em] text-emerald-600">DELIVERY LOCATION</p><h2 className="text-xl sm:text-2xl font-black">Where should we deliver?</h2><p className="text-xs sm:text-sm text-slate-500 mt-1">Use your current location, search a place, choose a map pin, or enter the address manually.</p></div>
        <button type="button" onClick={onClose} className="shrink-0 w-10 h-10 rounded-xl border grid place-items-center hover:bg-slate-50" aria-label="Close"><X size={19}/></button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid md:grid-cols-[1fr_auto] gap-3">
          <div className="flex gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")searchPlaces();}} placeholder="Search address, area, city or pincode" className="flex-1 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200" />
            <button type="button" onClick={searchPlaces} disabled={searching} className="bg-slate-950 text-white rounded-xl px-4 py-3 font-bold disabled:opacity-50">{searching?"Searching...":"Search"}</button>
          </div>
          <button type="button" onClick={useCurrentLocation} disabled={locating} className="border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-xl px-4 py-3 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"><MapPin size={17}/>{locating?"Getting location...":"Use Current Location"}</button>
        </div>
        {results.length>0 && <div className="grid gap-2">{results.map((r:any)=><button type="button" key={`${r.place_id}-${r.lat}-${r.lon}`} onClick={()=>{applyGeoResult(r);setResults([]);setSearch(String(r.display_name||""));setMessage("Location selected. Review the address below and confirm.");}} className="text-left border rounded-xl p-3 hover:border-emerald-300 hover:bg-emerald-50/50"><p className="text-sm font-bold">{r.name || r.display_name?.split(",")[0] || "Selected place"}</p><p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.display_name}</p></button>)}</div>}

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><p className="text-sm font-black text-emerald-900">Exact map pin</p><p className="text-xs text-emerald-800 mt-1">Place the pin exactly where the delivery should arrive.</p>{isValidCoordinate(form.latitude,form.longitude)&&<p className="text-[11px] text-emerald-700 mt-1 font-semibold">{Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}</p>}</div>
          <button type="button" onClick={()=>setShowMap(true)} className="border border-emerald-300 bg-white text-emerald-800 rounded-xl px-4 py-2.5 font-bold inline-flex items-center justify-center gap-2"><MapPin size={16}/> Choose on Map</button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-600">Address label<input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} className="mt-1.5 w-full border rounded-xl p-3 text-sm" placeholder="Home / Work"/></label>
          <label className="text-xs font-bold text-slate-600">Full name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1.5 w-full border rounded-xl p-3 text-sm" placeholder="Your name"/></label>
          <label className="text-xs font-bold text-slate-600">Mobile number<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-1.5 w-full border rounded-xl p-3 text-sm" inputMode="numeric" placeholder="10-digit mobile number"/></label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-1">Pincode<input value={form.pincode} onChange={e=>setForm({...form,pincode:e.target.value.replace(/\D/g,"").slice(0,6)})} className="mt-1.5 w-full border rounded-xl p-3 text-sm" inputMode="numeric" placeholder="6-digit pincode"/></label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">House / street / area<textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="mt-1.5 w-full border rounded-xl p-3 text-sm min-h-[82px]" placeholder="Complete delivery address"/></label>
          <label className="text-xs font-bold text-slate-600">City / Town / Village<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="mt-1.5 w-full border rounded-xl p-3 text-sm"/></label>
          <label className="text-xs font-bold text-slate-600">State<input value={form.state} onChange={e=>setForm({...form,state:e.target.value})} className="mt-1.5 w-full border rounded-xl p-3 text-sm"/></label>
        </div>

        {message&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm font-semibold">{message}</div>}
        {error&&<div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold">{error}</div>}
      </div>

      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t px-5 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button type="button" onClick={onClose} disabled={saving} className="border rounded-xl px-5 py-3 font-bold">Cancel</button>
        <button type="button" onClick={save} disabled={saving} className="bg-emerald-600 text-white rounded-xl px-6 py-3 font-black disabled:opacity-50 inline-flex items-center justify-center gap-2">{saving?<RefreshCw size={16} className="animate-spin"/>:<CheckCircle2 size={16}/>} {saving?"Saving location...":"Confirm & Save Location"}</button>
      </div>
    </div>
    {showMap && <MapPicker value={form} onClose={()=>setShowMap(false)} onConfirm={async (latitude,longitude)=>{setForm((f:any)=>({...f,latitude,longitude}));setShowMap(false);await reverseGeocode(latitude,longitude);}} />}
  </div>;
}

function WebsiteBackButton({ fallback, label = "Back" }: { fallback?: string; label?: string }) {
  const nav = useNavigate();
  const location = useLocation();
  const canGoBack = Number((window.history.state as any)?.idx ?? 0) > 0;
  const goBack = () => {
    if (canGoBack) nav(-1);
    else if (fallback && location.pathname !== fallback) nav(fallback);
    else nav("/");
  };
  return <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 hover:text-emerald-800 hover:-translate-x-0.5 transition-transform" aria-label={label}><ArrowRight size={16} className="rotate-180"/>{label}</button>;
}

function RoleRoute({ store, roles, children }: { store: ReturnType<typeof useStore>; roles: string[]; children: React.ReactNode }) {
  if (!store.user) return <NavigateToLogin />;
  if (roles.includes(String(store.user.role))) return <>{children}</>;
  const role = String(store.user.role);
  const target = role === "admin" ? "/admin" : role === "delivery" ? "/delivery" : role === "customer_care" ? "/customer-care" : (role === "finance_manager" || role === "finance_executive") ? "/finance" : "/stores";
  return <Navigate to={target} replace />;
}


function useRoleNotificationVoiceAlerts(store: ReturnType<typeof useStore>, notifications: any[]) {
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
  const seenVoiceEventKeys = useRef<Set<string>>(new Set());
  const pendingVoiceEvents = useRef<Map<string, any>>(new Map());
  const voiceSpokenKeys = useRef<Set<string>>(new Set());
  const voiceInitialized = useRef(false);
  const voiceUnlocked = useRef(false);
  const speakingVoice = useRef(false);

  const userId = store.user?.id ? String(store.user.id) : "";
  const role = String(store.user?.role || "");
  const storageKey = userId ? `fb-voice-spoken-events:${userId}:${role}` : "";

  const loadSpokenKeys = () => {
    const set = new Set<string>();
    if (!storageKey) return set;
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(raw)) raw.slice(-150).forEach((x:any) => set.add(String(x)));
    } catch {}
    return set;
  };

  const persistSpokenKey = (key: string) => {
    if (!storageKey) return;
    try {
      const current = loadSpokenKeys();
      current.add(key);
      localStorage.setItem(storageKey, JSON.stringify(Array.from(current).slice(-150)));
    } catch {}
  };

  const eventKey = (n: any) => {
    const type = String(n?.type || "").toLowerCase();
    const orderId = String(n?.order || "");
    const relatedId = String(n?.relatedEntityId || "");
    const batchId = String(n?.relatedEntity === "DELIVERY_BATCH" ? relatedId : "");
    // Assignment notifications should be tied to the actual assignment/batch,
    // not the notification document id. This prevents duplicate voice announcements
    // when the same delivery assignment has multiple notification records.
    const assignmentId = String(n?.relatedEntity === "DELIVERY_ASSIGNMENT" ? n?.relatedEntityId || "" : "");
    const identity = role === "delivery" && type === "assignment" ? (assignmentId || batchId || orderId || "event") : (batchId || orderId || "event");
    return `${role}:${type}:${identity}`;
  };

  const voiceText = (n: any) => {
    const type = String(n?.type || "").toLowerCase();
    if (role === "admin" && type === "order") {
      const match = String(n?.message || "").match(/Customer:\s*([^·]+)/i);
      const customerName = match?.[1]?.trim();
      return customerName ? `New order received from ${customerName}.` : "New customer order received.";
    }
    if (role === "delivery" && type === "assignment") {
      const count = Number(String(n?.message || "").match(/(\d+)\s+new orders/i)?.[1] || 1);
      return count > 1 ? `${count} new orders have been assigned to you for delivery.` : "New order assigned for delivery.";
    }
    return "";
  };

  const flushVoiceQueue = () => {
    if (!voiceAlertsEnabled || !voiceUnlocked.current || speakingVoice.current || !pendingVoiceEvents.current.size) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const first = pendingVoiceEvents.current.entries().next().value as [string, any] | undefined;
    if (!first) return;
    const [key, n] = first;
    pendingVoiceEvents.current.delete(key);
    const text = voiceText(n);
    if (!text) { seenVoiceEventKeys.current.add(key); return flushVoiceQueue(); }
    try {
      speakingVoice.current = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => {
        seenVoiceEventKeys.current.add(key);
        voiceSpokenKeys.current.add(key);
        persistSpokenKey(key);
      };
      utterance.onend = () => { speakingVoice.current = false; flushVoiceQueue(); };
      utterance.onerror = () => { speakingVoice.current = false; pendingVoiceEvents.current.set(key, n); };
      window.speechSynthesis.speak(utterance);
    } catch {
      speakingVoice.current = false;
      pendingVoiceEvents.current.set(key, n);
    }
  };

  useEffect(() => {
    const key = userId ? `fb-voice-alerts:${userId}` : "";
    setVoiceAlertsEnabled(key ? localStorage.getItem(key) !== "false" : true);
    seenVoiceEventKeys.current = new Set();
    pendingVoiceEvents.current = new Map();
    voiceSpokenKeys.current = loadSpokenKeys();
    voiceInitialized.current = false;
    voiceUnlocked.current = false;
    speakingVoice.current = false;
    if (typeof window === "undefined") return;
    const unlock = () => {
      voiceUnlocked.current = true;
      window.setTimeout(flushVoiceQueue, 0);
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [userId, role]);

  useEffect(() => {
    if (!userId || !["admin", "delivery"].includes(role) || !notifications.length) return;
    const relevant = notifications.filter((n:any) => {
      const type = String(n?.type || "").toLowerCase();
      return role === "admin" ? type === "order" : type === "assignment";
    });
    if (!voiceInitialized.current) {
      // Do not silently discard unread assignment/order events that arrived
      // before the dashboard finished mounting. Read notifications are treated
      // as historical; unread relevant notifications remain eligible for one
      // voice announcement. This is especially important for Delivery Partner
      // assignments because the notification can be created while the partner
      // is already on the dashboard or while the dashboard is loading.
      relevant.forEach((n:any) => {
        const key = eventKey(n);
        if (n?.read === true || voiceSpokenKeys.current.has(key)) {
          seenVoiceEventKeys.current.add(key);
        } else if (!pendingVoiceEvents.current.has(key)) {
          pendingVoiceEvents.current.set(key, n);
        }
      });
      voiceInitialized.current = true;
      flushVoiceQueue();
      return;
    }
    relevant.forEach((n:any) => {
      const key = eventKey(n);
      if (seenVoiceEventKeys.current.has(key) || voiceSpokenKeys.current.has(key) || pendingVoiceEvents.current.has(key)) return;
      pendingVoiceEvents.current.set(key, n);
    });
    flushVoiceQueue();
  }, [notifications, userId, role, voiceAlertsEnabled]);

  return { voiceAlertsEnabled, setVoiceAlertsEnabled, flushVoiceQueue };
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
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const { voiceAlertsEnabled, setVoiceAlertsEnabled, flushVoiceQueue } = useRoleNotificationVoiceAlerts(store, notifications);
  useEffect(() => {
    let cancelled = false;
    const readLocal = () => {
      if (store.user?.role !== "customer" || !store.user?.id) { setDeliveryAddress(null); return; }
      try {
        const scoped = localStorage.getItem(`fb-delivery-address:${String(store.user.id)}`);
        const raw = scoped || localStorage.getItem("fb-delivery-address");
        setDeliveryAddress(raw ? JSON.parse(raw) : null);
      } catch { setDeliveryAddress(null); }
    };
    readLocal();
    window.addEventListener("fb-delivery-address-changed", readLocal);
    if (store.user?.role === "customer") {
      setDeliveryAddress(null);
      axios.get(API + "/addresses", { headers: adminHeaders() }).then(r => {
        if (cancelled) return;
        const list=Array.isArray(r.data.data)?r.data.data:[];
        const selected=list.find((a:any)=>a.isDefault)||list[0]||null;
        setDeliveryAddress(selected);
        if (selected) saveSelectedDeliveryAddress(selected, store.user?.id);
      }).catch(()=>{ if (!cancelled) readLocal(); });
    }
    return () => { cancelled = true; window.removeEventListener("fb-delivery-address-changed", readLocal); };
  }, [store.user?.id, store.user?.role]);

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
    const timer = window.setInterval(loadNotifications, 12000);
    return () => window.clearInterval(timer);
  }, [store.user]);

  useEffect(() => { flushVoiceQueue(); }, [voiceAlertsEnabled]);

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
    <div className={store.user?.role === "customer" ? "fb-customer-shell" : ""}>
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

          {store.user?.role === "customer" && (
            <button type="button" onClick={() => setShowLocationSelector(true)} className="flex min-w-0 items-center gap-2 text-left text-xs sm:text-sm text-slate-600 rounded-xl px-2 py-2 hover:bg-emerald-50/70 transition-colors group" aria-label="Change delivery location">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center shrink-0 group-hover:bg-emerald-100"><MapPin size={16} /></span>
              <span className="min-w-0 hidden xs:block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Deliver to</span><b className="block max-w-[170px] sm:max-w-[230px] truncate text-slate-900">{deliveryHeaderLabel(deliveryAddress)}</b></span>
              <span className="sm:hidden text-[11px] font-black text-slate-800 max-w-[72px] truncate">{deliveryHeaderLabel(deliveryAddress)}</span>
            </button>
          )}

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

          {store.user?.role === "customer" && (
            <Link to="/stores" className="hidden md:flex items-center gap-1.5 px-2 py-2 text-sm font-bold text-slate-600 hover:text-emerald-700">
              <Store size={18} /> Stores
            </Link>
          )}

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
                  <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-600">Voice alerts</span>
                    <button type="button" onClick={()=>{const next=!voiceAlertsEnabled;setVoiceAlertsEnabled(next);if(store.user?.id)localStorage.setItem(`fb-voice-alerts:${String(store.user.id)}`,String(next));}} className={`text-xs font-black px-3 py-1.5 rounded-full border ${voiceAlertsEnabled?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-slate-100 text-slate-600"}`}>{voiceAlertsEnabled?"🔊 Voice alerts ON":"🔇 Voice alerts OFF"}</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length ? notifications.slice(0, 8).map((n) => (
                      <button
                        key={n._id}
                        type="button"
                        onClick={async () => { await markNotificationRead(String(n._id)); setShowNotifications(false); const oid=String(typeof n.order==="object" ? (n.order?._id || n.relatedEntityId || "") : (n.order || n.relatedEntityId || "")); if(n.relatedEntity==="REPLACEMENT_REQUEST"){if(store.user?.role==="customer_care") nav(`/customer-care/replacement-requests?request=${encodeURIComponent(String(n.relatedEntityId||""))}`); else if(store.user?.role==="admin") nav("/admin?tab=replacement-requests"); else if(store.user?.role==="delivery") nav("/delivery"); else if(store.user?.role==="customer") nav("/support");} else if(oid && (n.relatedEntity==="ORDER" || n.relatedEntity==="DELIVERY_CHAT")){if(store.user?.role==="customer") nav(`/orders/${oid}`); else if(store.user?.role==="delivery") nav("/delivery"); else if(store.user?.role==="admin") nav("/admin?tab=orders"); else nav(`/orders/${oid}`);} else if(n.type?.includes("support") || n.relatedEntity==="SUPPORT_TICKET") nav("/support"); }}
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
                : store.user?.role === "customer_care"
                ? "/customer-care"
                : (store.user?.role === "finance_manager" || store.user?.role === "finance_executive")
                ? "/finance"
                : "/account"
            }
            className="p-2 text-slate-600"
          >
            <User />
          </Link>

          {store.user?.role === "customer" && (
            <Link
              to="/cart"
              className="relative p-2 text-slate-700"
              aria-label="Cart"
            >
              <ShoppingCart />
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] rounded-full min-w-5 h-5 grid place-items-center">
                {count}
              </span>
            </Link>
          )}
        </div>
      </header>

      <div id="main-content">
        {children}
      </div>

      {showLocationSelector && store.user?.role === "customer" && (
        <LocationSelector
          store={store}
          initialAddress={deliveryAddress}
          onClose={() => setShowLocationSelector(false)}
          onSaved={(address) => {
            setDeliveryAddress(address);
            saveSelectedDeliveryAddress(address, store.user?.id);
            setShowLocationSelector(false);
          }}
        />
      )}

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
    </div>
  );
}

function ProductCard({
  p,
  add,
  isWishlisted,
  onToggleWishlist,
}: {
  p: Product;
  add: (p: Product, variant?: ProductVariant) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
}) {
  const nav = useNavigate();
  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
  const disc = Math.round((1 - p.sellingPrice / p.mrp) * 100);

  return (
    <div className="fb-depth-card bg-white rounded-3xl border border-slate-100 p-3 shadow-soft hover:-translate-y-1 transition group">
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
            onClick={() => {
              if (p.stock <= 0 || p.isActive === false) return;
              if (hasVariants) nav("/product/" + p._id);
              else add(p);
            }}
            disabled={p.stock <= 0 || p.isActive === false}
            className={`rounded-xl px-3 py-2 flex items-center gap-1 text-sm font-semibold ${
              p.stock <= 0 || p.isActive === false
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {p.stock <= 0 || p.isActive === false ? "Unavailable" : hasVariants ? "Choose" : <><Plus size={16} /> Add</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function StoreDirectory({ store, favoriteOnly = false }: { store: ReturnType<typeof useStore>; favoriteOnly?: boolean }) {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStores = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = store.user?.role === "customer" ? "/customer/stores" : "/stores";
      const r = await axios.get(API + endpoint, store.user ? { headers: adminHeaders() } : undefined);
      setStores(Array.isArray(r.data.data) ? r.data.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load stores.");
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStores(); }, [store.user?.role]);

  const displayStores = favoriteOnly ? stores.filter((st) => store.isFavoriteStore(String(st.id))) : stores;

  const openStore = (id: string) => {
    const previous = localStorage.getItem("fb-store-admin-id") || "";
    if (previous !== id) {
      store.clearCart();
      localStorage.setItem("fb-cart", "[]");
    }
    localStorage.setItem("fb-store-admin-id", id);
    window.location.href = "/?storeAdminId=" + encodeURIComponent(id);
  };

  if (!store.user || store.user.role !== "customer") {
    return <Layout store={store}><main className="max-w-7xl mx-auto px-4 py-12"><EmptyState icon={Store} title="Customer login required" text="Sign in as a customer to browse local stores and shop from their individual catalogues." /></main></Layout>;
  }

  return <Layout store={store}><main className="max-w-7xl mx-auto px-4 py-8">
    <div className="mb-7">
      <p className="text-emerald-600 text-sm font-bold">LOCAL STORE NETWORK</p>
      <h1 className="text-3xl font-bold">{favoriteOnly ? "Favorite Stores" : "Choose a store"}</h1>
      <p className="text-slate-500 mt-1">{favoriteOnly ? "Your saved local stores are shown here for quick access." : "All stores available to your customer account are shown here. Each store has its own products, offers, coupons and pricing."}</p>
    </div>

    {error && <PageError message={error} onRetry={loadStores} />}
    {loading ? <div className="py-16 text-center text-slate-500">Loading stores...</div> : displayStores.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{displayStores.map((st) => (
      <div key={st.id} className="fb-depth-card bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition duration-200 hover:-translate-y-1">
        {st.image ? <img src={st.image} alt={st.name || "Local store"} loading="lazy" className="w-full h-40 object-cover rounded-2xl mb-4"/> : <div className="w-full h-40 rounded-2xl bg-gradient-to-br from-emerald-50 to-slate-100 grid place-items-center mb-4"><Store size={44} className="text-emerald-600"/></div>}
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center"><Store size={22}/></div>
          {st.isMainStore && <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">Main Store</span>}
        </div>
        <h2 className="font-bold text-xl mt-4">{st.name}</h2>
        <p className="text-xs font-bold text-emerald-700 mt-1">{st.category || "Local Store"}</p>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{st.address || "Local store"}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`text-xs font-black px-2.5 py-1 rounded-full ${st.operatingStatus?.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : st.operatingStatus?.status === "NOT_CONFIGURED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{st.operatingStatus?.label || "Hours not configured"}</span>{st.operatingStatus?.message && <span className="text-xs text-slate-500">{st.operatingStatus.message}</span>}</div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-slate-50 rounded-xl p-3"><b className="block text-lg">{st.productCount || 0}</b><span className="text-xs text-slate-500">Products</span></div>
          <div className="bg-slate-50 rounded-xl p-3"><b className="block text-lg">{st.bannerCount || 0}</b><span className="text-xs text-slate-500">Offers</span></div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 mt-5">
          <button onClick={() => openStore(String(st.id))} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold">Visit store & shop</button>
          <button type="button" onClick={() => void store.toggleFavoriteStore(String(st.id))} className={`px-4 rounded-xl border font-bold inline-flex items-center justify-center ${store.isFavoriteStore(String(st.id)) ? "text-red-500 border-red-200 bg-red-50" : "text-slate-600 hover:text-red-500"}`} aria-label={store.isFavoriteStore(String(st.id)) ? "Remove from favorite stores" : "Add to favorite stores"} title={store.isFavoriteStore(String(st.id)) ? "Remove from favorites" : "Favorite Store"}>
            <Heart size={19} fill={store.isFavoriteStore(String(st.id)) ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    ))}</div> : <EmptyState icon={Store} title="No stores available" text="Store owners will appear here when their store accounts are active."/>}
  </main></Layout>;
}

function Home({ store }: { store: ReturnType<typeof useStore> }) {
  const [banners, setBanners] = useState<any[]>([]);
  const [publicContact, setPublicContact] = useState<any>({});
  const [selectedStore, setSelectedStore] = useState<any>(null);

  useEffect(() => { axios.get(API+"/public/contact").then(r=>setPublicContact(r.data.data||{})).catch(()=>{});
  }, []);

  useEffect(() => {
    const storeAdminId = localStorage.getItem("fb-store-admin-id") || "";
    if(storeAdminId) axios.get(API+"/stores").then(r=>{const list=Array.isArray(r.data.data)?r.data.data:[];setSelectedStore(list.find((x:any)=>String(x.id)===String(storeAdminId))||null)}).catch(()=>setSelectedStore(null)); else setSelectedStore(null);
    axios.get(API + "/banners" + (storeAdminId ? "?storeAdminId=" + encodeURIComponent(storeAdminId) : ""))
      .then((r) => setBanners(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => setBanners([]));
  }, []);

  return (
    <Layout store={store}>
      <main>
        {selectedStore && <section className="max-w-7xl mx-auto px-4 pt-6"><div className="fb-depth-card overflow-hidden rounded-[2rem] border bg-white grid md:grid-cols-[280px_1fr]"><div className="h-52 md:h-full bg-slate-100">{selectedStore.image?<img src={selectedStore.image} alt={selectedStore.name||"Local store"} className="w-full h-full object-cover"/>:<div className="w-full h-full grid place-items-center"><Store size={56} className="text-emerald-500"/></div>}</div><div className="p-6 md:p-8"><p className="text-emerald-600 text-xs font-bold uppercase tracking-wide">LOCAL STORE</p><h2 className="text-3xl font-black mt-1">{selectedStore.name}</h2><p className="text-sm font-semibold text-emerald-700 mt-2">{selectedStore.category||"Local Store"}</p><p className="text-slate-500 mt-2">{selectedStore.address||"Local store"}</p><div className="flex flex-wrap items-center gap-2 mt-4"><span className={`rounded-xl px-3 py-2 text-sm font-bold ${selectedStore.operatingStatus?.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : selectedStore.operatingStatus?.status === "NOT_CONFIGURED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{selectedStore.operatingStatus?.label || "Hours not configured"}</span><span className="text-sm text-slate-500">{selectedStore.operatingStatus?.message || ""}</span></div><div className="flex flex-wrap gap-3 mt-3"><span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">{selectedStore.productCount||0} products</span><span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">{selectedStore.bannerCount||0} offers</span><span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">{selectedStore.categoryCount||0} categories</span></div></div></div></section>}
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
          <div className="max-w-7xl mx-auto px-4 pt-10 md:pt-14 pb-4">
            <div className="rounded-[2rem] border border-emerald-100 bg-white/70 backdrop-blur p-6 md:p-10 shadow-sm hover:shadow-md transition duration-300">
              <p className="text-emerald-600 text-sm font-black uppercase tracking-[.16em]">LOCAL MARKETPLACE</p>
              <h2 className="text-3xl md:text-5xl font-black mt-2">Your Local Market, Online</h2>
              <p className="text-slate-600 mt-4 max-w-3xl text-base md:text-lg leading-7">FreshBasket brings your neighbourhood stores online. Discover products from local sellers, compare what is available, place your order and get it delivered to your doorstep.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">{[[Store,"LOCAL STORES"],[ShoppingBag,"LOCAL SELLERS"],[Boxes,"LOCAL PRODUCTS"],[Truck,"LOCAL DELIVERY"]].map(([Icon,label]:any)=><div key={label} className="rounded-2xl bg-white border p-4 hover:-translate-y-1 transition duration-200"><Icon className="text-emerald-600" size={22}/><p className="font-bold text-sm mt-2">{label}</p></div>)}</div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-xs font-bold">
                <Store size={14} /> Local stores · local sellers · local delivery
              </span>
              <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] mt-5 tracking-tight">
                Your Local Market,
                <br />
                <span className="text-emerald-600">
                  Right at Your Doorstep.
                </span>
              </h1>
              <p className="text-slate-600 mt-5 max-w-lg text-lg">
                Discover products from trusted local stores and sellers, delivered from your neighbourhood to your doorstep.
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
        <section className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <div className="text-center"><p className="text-emerald-600 text-sm font-bold">FIRST-TIME SHOPPER</p><h2 className="text-3xl md:text-4xl font-black mt-2">How FreshBasket Works</h2><p className="text-slate-500 mt-2">A simple local-shopping journey from store selection to doorstep delivery.</p></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-7">{[[MapPin,"1. Choose your location"],[Store,"2. Choose a local store"],[Boxes,"3. Browse products"],[ShoppingCart,"4. Add products to cart"],[Package,"5. Confirm address"],[CheckCircle2,"6. Place order"],[Truck,"7. Track delivery"],[Package,"8. Receive your order"],[Award,"9. Rate your experience"]].map(([Icon,label]:any)=><div key={label} className="bg-white border rounded-2xl p-4 shadow-sm hover:-translate-y-1 transition duration-200"><Icon className="text-emerald-600" size={22}/><p className="font-bold text-sm mt-3">{label}</p></div>)}</div>
        </section>
        {!store.user && <section className="max-w-7xl mx-auto px-4 pb-12">
          <div className="rounded-3xl bg-white border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">Grow with FreshBasket</p><h2 className="text-xl md:text-2xl font-black mt-1">Join our local store & delivery network</h2><p className="text-sm text-slate-500 mt-1">Public onboarding is available without customer login.</p></div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0"><Link to="/apply/store" className="inline-flex items-center justify-center gap-2 bg-slate-950 text-white rounded-xl px-4 py-3 font-bold text-sm"><Store size={17}/> Take Your Local Store Online <ArrowRight size={16}/></Link><Link to="/apply/delivery" className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-3 font-bold text-sm"><Truck size={17}/> Become a Delivery Partner <ArrowRight size={16}/></Link></div>
          </div>
        </section>}
      </main>
    </Layout>
  );
}


function AIOrderAssistant({ store }: { store: ReturnType<typeof useStore> }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const ask = async () => {
    const text = query.trim();
    if (!text || loading) return;
    setLoading(true); setError("");
    try {
      const storeAdminId = localStorage.getItem("fb-store-admin-id") || "";
      const r = await axios.post(API + "/customer/ai-order-assistant", { query: text, storeAdminId }, { headers: adminHeaders() });
      setResult(r.data?.data || null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to get catalogue recommendations.");
      setResult(null);
    } finally { setLoading(false); }
  };

  return (
    <section className="mb-8 bg-white border border-emerald-100 rounded-3xl p-5 md:p-6 shadow-soft">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Sparkles size={18} className="text-emerald-600"/><p className="text-emerald-600 text-xs font-black tracking-wide">AI ORDER ASSISTANT</p></div>
          <h2 className="text-xl md:text-2xl font-bold mt-1">Tell me what you need</h2>
          <p className="text-sm text-slate-500 mt-1">Ask naturally. Suggestions use only currently in-stock FreshBasket catalogue products and real prices.</p>
        </div>
        <div className="w-full lg:max-w-2xl flex gap-2">
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void ask();}} placeholder="e.g. breakfast items under ₹500" className="flex-1 min-w-0 border rounded-xl px-4 py-3 outline-none focus:ring-2 ring-emerald-100"/>
          <button onClick={()=>void ask()} disabled={!query.trim()||loading} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{loading?"Thinking...":"Ask"}</button>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-700 font-semibold">{error}</p>}
      {result && <div className="mt-5 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4"><p className="text-sm text-slate-700 font-semibold">{result.message}</p>{result.budget!=null&&<span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">Budget ₹{result.budget} · Total ₹{result.total}</span>}</div>
        {result.products?.length ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{result.products.map((p:any)=><div key={p._id}><ProductCard p={p} add={store.add} isWishlisted={store.isWishlisted(p._id)} onToggleWishlist={()=>store.toggleWishlist(p._id)}/><p className="text-[11px] text-slate-500 mt-2 px-1">{p.aiReason}</p></div>)}</div> : <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No confident catalogue match. Try a product, category, or budget such as “milk and bread under ₹300”.</div>}
      </div>}
    </section>
  );
}

function Shop({ store }: { store: ReturnType<typeof useStore> }) {
  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  const [cat, setCat] = useState(qs.get("category") || "All");
  const [q, setQ] = useState(qs.get("q") || "");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const storeAdminId = localStorage.getItem("fb-store-admin-id") || "";
    axios.get(API + "/categories" + (storeAdminId ? "?storeAdminId=" + encodeURIComponent(storeAdminId) : "")).then((r) => {
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
        {store.user?.role === "customer" && <AIOrderAssistant store={store} />}
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
  const variants = Array.isArray(p?.variants) ? p.variants : [];
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const selectedVariant = variants.find((v: ProductVariant) => String(v._id || "") === selectedVariantId) || variants[0] || null;

  useEffect(() => {
    if (variants.length && !selectedVariantId) setSelectedVariantId(String(variants[0]?._id || ""));
  }, [id, variants.length, selectedVariantId]);

  const displayPrice = Number(selectedVariant?.sellingPrice ?? p?.sellingPrice ?? 0);
  const displayMrp = Number(selectedVariant?.mrp ?? p?.mrp ?? 0);
  const displayStock = Number(selectedVariant?.stock ?? p?.stock ?? 0);
  const displayUnit = selectedVariant?.name || selectedVariant?.unit || p?.unit || "";
  const [restockSubscribed, setRestockSubscribed] = useState(false);
  const [restockLoading, setRestockLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadRestockStatus = async () => {
      if (!p || !store.user || store.user.role !== "customer" || displayStock > 0) {
        if (!cancelled) setRestockSubscribed(false);
        return;
      }
      try {
        const r = await axios.get(API + `/customer/restock-alerts/${p._id}`, {
          params: { variantId: String(selectedVariant?._id || "") },
          headers: adminHeaders(),
        });
        if (!cancelled) setRestockSubscribed(Boolean(r.data?.subscribed));
      } catch {
        if (!cancelled) setRestockSubscribed(false);
      }
    };
    void loadRestockStatus();
    return () => { cancelled = true; };
  }, [p?._id, selectedVariant?._id, displayStock, store.user?.id]);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");

  const loadReviews = async () => {
    if (!id) return;

    setReviewLoading(true);
    setReviewError("");

    try {
      const r = await axios.get(API + `/products/${id}/reviews`);
      const data = r.data?.data || {};

      setReviews(Array.isArray(data.reviews) ? data.reviews : []);

      // Keep the product rating in sync only when real reviews exist.
      // If there are no reviews yet, preserve the existing catalog rating.
      if (
        p &&
        Number(data.total || 0) > 0 &&
        Number.isFinite(Number(data.average))
      ) {
        store.setProducts(
          store.products.map((product) =>
            product._id === p._id
              ? {
                  ...product,
                  rating: Number(data.average),
                  reviewCount: Number(data.total || 0),
                }
              : product
          )
        );
      }
    } catch (e: any) {
      setReviewError(
        e?.response?.data?.message ||
          "Unable to load reviews."
      );
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [id]);

  if (!p) {
    return (
      <Layout store={store}>
        <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-4"><WebsiteBackButton fallback="/stores" label="Back" /></div>
          <EmptyState
            icon={Package}
            title="Product not found"
            text="This product may have been removed or is no longer available."
          />
        </main>
      </Layout>
    );
  }

  const submitReview = async () => {
    setReviewMessage("");
    setReviewError("");

    if (!store.user) {
      setReviewError("Please sign in to submit a review.");
      return;
    }

    if (store.user.role !== "customer") {
      setReviewError("Only customers can submit product reviews.");
      return;
    }

    const cleanComment = comment.trim();

    if (cleanComment.length < 3) {
      setReviewError("Review must contain at least 3 characters.");
      return;
    }

    setReviewSubmitting(true);

    try {
      const token = localStorage.getItem("fb-token");

      const r = await axios.post(
        API + `/products/${p._id}/reviews`,
        {
          rating,
          comment: cleanComment,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newRating = Number(
        r.data?.data?.rating ?? p.rating ?? 0
      );
      const newReviewCount = Number(
        r.data?.data?.reviewCount ?? reviews.length + 1
      );

      store.setProducts(
        store.products.map((product) =>
          product._id === p._id
            ? {
                ...product,
                rating: newRating,
                reviewCount: newReviewCount,
              }
            : product
        )
      );

      setReviewMessage(
        r.data?.message || "Review submitted successfully."
      );
      setComment("");
      setRating(5);

      // Reload so the newly submitted review appears immediately.
      await loadReviews();
    } catch (e: any) {
      setReviewError(
        e?.response?.data?.message ||
          "Unable to submit review."
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const enableRestockAlert = async () => {
    if (!store.user || store.user.role !== "customer") {
      alert("Please sign in as a customer to enable stock alerts.");
      return;
    }
    if (displayStock > 0 || p.isActive === false) return;
    setRestockLoading(true);
    try {
      const r = await axios.post(API + "/customer/restock-alerts", {
        productId: p._id,
        variantId: String(selectedVariant?._id || ""),
        storeAdminId: String(p.storeAdmin || ""),
      }, { headers: adminHeaders() });
      setRestockSubscribed(Boolean(r.data?.subscribed));
      alert(r.data?.message || "We will notify you when this product is back in stock.");
    } catch (e:any) {
      alert(e?.response?.data?.message || "Unable to enable stock alert.");
    } finally {
      setRestockLoading(false);
    }
  };

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

            <h1 className="text-4xl font-bold mt-2">
              {p.name}
            </h1>

            <p className="text-slate-500 mt-2">
              {p.brand} · {displayUnit}
            </p>

            <div className="flex gap-2 mt-4 flex-wrap">
              <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-bold">
                ★ {Number(p.rating || 0).toFixed(1)} rating
              </span>

              {p.reviewCount !== undefined && (
                <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-sm font-bold">
                  {p.reviewCount} review{p.reviewCount === 1 ? "" : "s"}
                </span>
              )}

              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  p.stock > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {p.stock > 0
                  ? `${p.stock} in stock`
                  : "Out of stock"}
              </span>
            </div>

            {variants.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-bold text-slate-700 mb-2">Choose variant</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v: ProductVariant) => {
                    const active = String(v._id || "") === String(selectedVariant?._id || "");
                    return (
                      <button key={String(v._id)} type="button" onClick={() => setSelectedVariantId(String(v._id || ""))}
                        className={`border rounded-xl px-4 py-2 text-sm font-semibold ${active ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "bg-white text-slate-700"}`}>
                        {v.name || v.unit || "Variant"} · {money(v.sellingPrice)}
                      </button>
                    );
                  })}
                </div>
                {selectedVariant?.sku && <p className="text-xs text-slate-400 mt-2">SKU: {selectedVariant.sku}{selectedVariant.barcode ? ` · Barcode: ${selectedVariant.barcode}` : ""}</p>}
              </div>
            )}

            <div className="mt-7">
              <b className="text-4xl">
                {money(displayPrice)}
              </b>{" "}
              <del className="text-slate-400 ml-2">
                {money(displayMrp)}
              </del>
            </div>

            <p className="text-slate-600 leading-7 mt-6">
              {p.description} Carefully selected for freshness and
              reliable everyday quality.
            </p>

            <div className="grid sm:grid-cols-2 gap-2 mt-5">
              <div className={`rounded-xl border p-3 text-sm font-semibold ${(p as any).refundEligible === false ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {(p as any).refundEligible === false ? "✕ Refund unavailable" : `✓ Refund available · ${(p as any).refundWindowDays ?? 7} days`}
              </div>
              <div className={`rounded-xl border p-3 text-sm font-semibold ${(p as any).replacementEligible === false ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {(p as any).replacementEligible === false ? "✕ Replacement unavailable" : `✓ Replacement available · ${(p as any).replacementWindowDays ?? 7} days`}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() =>
                  displayStock > 0 &&
                  p.isActive !== false &&
                  store.add(p, selectedVariant || undefined)
                }
                disabled={
                  displayStock <= 0 || p.isActive === false
                }
                className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${
                  p.stock > 0 && p.isActive !== false
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                <ShoppingCart size={19} /> Add to cart
              </button>

              {displayStock <= 0 && p.isActive !== false && (
                <button
                  type="button"
                  onClick={enableRestockAlert}
                  disabled={restockLoading || restockSubscribed}
                  className={`px-5 py-4 border rounded-2xl font-bold inline-flex items-center justify-center gap-2 ${restockSubscribed ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-slate-700"}`}
                >
                  <Bell size={19} />
                  {restockLoading ? "Enabling..." : restockSubscribed ? "Alert enabled" : "Notify me when available"}
                </button>
              )}

              <button
                type="button"
                onClick={() => store.toggleWishlist(p._id)}
                className={`px-5 py-4 border rounded-2xl font-bold inline-flex items-center justify-center gap-2 ${
                  store.isWishlisted(p._id)
                    ? "text-red-500 border-red-200 bg-red-50"
                    : "text-slate-700"
                }`}
              >
                <Heart
                  size={19}
                  fill={
                    store.isWishlisted(p._id)
                      ? "currentColor"
                      : "none"
                  }
                />
                {store.isWishlisted(p._id)
                  ? "Saved"
                  : "Wishlist"}
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

        {/* CUSTOMER REVIEWS */}
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-emerald-600 font-bold text-sm">
                CUSTOMER FEEDBACK
              </p>
              <h2 className="text-2xl md:text-3xl font-bold">
                Customer reviews
              </h2>
              <p className="text-slate-500 mt-1">
                See what customers think about this product.
              </p>
            </div>

            <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl font-bold">
              ★ {Number(p.rating || 0).toFixed(1)}
            </div>
          </div>

          {store.user?.role === "customer" && (
            <div className="bg-white border rounded-3xl p-6 mb-6">
              <h3 className="text-lg font-bold">
                Write a review
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                You can review this product after your order has been delivered.
              </p>

              <div className="mt-5">
                <p className="text-sm font-semibold mb-2">
                  Your rating
                </p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-3xl leading-none transition ${
                        star <= rating
                          ? "text-amber-500"
                          : "text-slate-300"
                      }`}
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
                maxLength={1000}
                className="w-full border rounded-2xl p-4 mt-4 min-h-32 outline-none focus:ring-2 focus:ring-emerald-100"
              />

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">
                  {comment.length}/1000
                </span>

                <button
                  type="button"
                  onClick={submitReview}
                  disabled={reviewSubmitting}
                  className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {reviewSubmitting
                    ? "Submitting..."
                    : "Submit review"}
                </button>
              </div>

              {reviewMessage && (
                <p className="text-emerald-700 text-sm font-semibold mt-4">
                  {reviewMessage}
                </p>
              )}

              {reviewError && (
                <p className="text-red-500 text-sm mt-4">
                  {reviewError}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            {reviewLoading ? (
              <div className="bg-white border rounded-3xl p-10 text-center text-slate-500">
                Loading reviews...
              </div>
            ) : reviewError && reviews.length === 0 ? (
              <div className="bg-white border rounded-3xl p-8 text-center text-red-500">
                {reviewError}
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-white border rounded-3xl p-10 text-center">
                <div className="text-4xl text-amber-400">★</div>
                <h3 className="font-bold text-lg mt-3">
                  No reviews yet
                </h3>
                <p className="text-slate-500 mt-1">
                  Be the first customer to review this product.
                </p>
              </div>
            ) : (
              reviews.map((review: any) => (
                <div
                  key={review._id}
                  className="bg-white border rounded-3xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">
                        {review.user?.name || "Customer"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : ""}
                      </p>
                    </div>

                    <div className="text-amber-500 font-bold whitespace-nowrap">
                      {"★".repeat(Number(review.rating || 0))}
                    </div>
                  </div>

                  <p className="text-slate-600 mt-4 leading-7">
                    {review.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
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
      s + Number(i?.variant?.sellingPrice ?? i.product.sellingPrice) * i.quantity,
    0
  );
  const delivery = sub >= 499 ? 0 : 39;
  const total = sub + delivery;

  return (
    <Layout store={store}>
      <main className="max-w-6xl mx-auto px-4 py-9">
        <div className="mb-4"><WebsiteBackButton fallback="/stores" label="Continue shopping" /></div>
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
                  key={store.cartItemKey(i)}
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
                      {i.variant?.name || i.variant?.unit || i.product.unit}
                    </p>
                    {i.variant?.sku && <p className="text-[11px] text-slate-400 mt-0.5">SKU: {i.variant.sku}</p>}
                    <b className="text-emerald-700">
                      {money(i?.variant?.sellingPrice ?? i.product.sellingPrice)}
                    </b>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        store.qty(store.cartItemKey(i), -1);
                      }}
                      className="p-2"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="w-5 text-center font-bold">
                      {i.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        store.qty(store.cartItemKey(i), 1);
                      }}
                      className="p-2"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      store.qty(store.cartItemKey(i), -99);
                    }}
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginRole, setLoginRole] = useState<"customer" | "admin" | "delivery" | "customer_care" | "finance_manager" | "finance_executive">("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loginLanguage, setLoginLanguage] = useState<FBLanguage>(() => { try { const x=localStorage.getItem("fb-login-language"); return x === "hi" || x === "hinglish" ? x : "en"; } catch { return "en"; } });
  const [clockNow, setClockNow] = useState(new Date());
  const [notices, setNotices] = useState<any[]>([]);
  const [noticeIndex, setNoticeIndex] = useState(0);
  const [publicContact, setPublicContact] = useState<any>({});
  useEffect(() => { const id=window.setInterval(()=>setClockNow(new Date()),1000); return ()=>window.clearInterval(id); }, []);
  useEffect(() => { axios.get(API+"/public/login-notices").then(r=>setNotices(Array.isArray(r.data.data)?r.data.data:[])).catch(()=>setNotices([])); axios.get(API+"/public/contact").then(r=>setPublicContact(r.data.data||{})).catch(()=>{}); }, []);
  useEffect(() => { if(notices.length < 2) return; const id=window.setInterval(()=>setNoticeIndex(i=>(i+1)%notices.length),5000); return ()=>window.clearInterval(id); }, [notices.length]);
  const chooseLoginLanguage = async (next:FBLanguage) => { setLoginLanguage(next); try { localStorage.setItem("fb-login-language", next); } catch {} };

  const clearMessages = () => { setError(""); setMessage(""); };

  const submit = async (e: any) => {
    e.preventDefault(); clearMessages();
    try {
      if (mode === "register") {
        if (password.length < 8) return setError("Password must be at least 8 characters.");
        if (password !== confirmPassword) return setError("Passwords do not match.");
        if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""))) return setError("Enter a valid 10-digit mobile number.");
      }

      if (mode === "register") {
        const registerResponse = await axios.post(API + "/auth/register", { name, email, password, phone: phone.replace(/\D/g, "") });
        store.setUser(registerResponse.data.data.user);
        persistAuthSession(registerResponse.data.data.user, registerResponse.data.data.token);
        if (registerResponse.data.data.loginHistoryId) {
          sessionStorage.setItem("fb-login-history-id", String(registerResponse.data.data.loginHistoryId));
          localStorage.setItem("fb-login-history-id", String(registerResponse.data.data.loginHistoryId));
        }
        if (loginLanguage !== "en") { try { await axios.patch(API+"/preferences/language",{language:loginLanguage},{headers:{Authorization:`Bearer ${registerResponse.data.data.token}`}}); } catch {} }
        nav("/stores");
        return;
      }
      const r = await axios.post(API + "/auth/login", { email, password, role: loginRole });
      store.setUser(r.data.data.user);
      persistAuthSession(r.data.data.user, r.data.data.token);
      if (r.data.data.loginHistoryId) {
        sessionStorage.setItem("fb-login-history-id", String(r.data.data.loginHistoryId));
        localStorage.setItem("fb-login-history-id", String(r.data.data.loginHistoryId));
      }
      const role = r.data.data.user.role;
      if ((role === "customer" || role === "delivery") && loginLanguage !== "en") { try { await axios.patch(API+"/preferences/language",{language:loginLanguage},{headers:{Authorization:`Bearer ${r.data.data.token}`}}); r.data.data.user.language = loginLanguage; store.setUser(r.data.data.user); localStorage.setItem("fb-user", JSON.stringify(r.data.data.user)); } catch {} }
      if (role === "admin") nav("/admin"); else if (role === "delivery") nav("/delivery"); else if (role === "customer_care") nav("/customer-care"); else if (role === "finance_manager" || role === "finance_executive") nav("/finance"); else nav("/stores");
    } catch (err: any) {
      // Registration has its own endpoint; avoid an unnecessary login call for it.
      if (mode === "register") {
        try {
          const registerResponse = await axios.post(API + "/auth/register", { name, email, password, phone: phone.replace(/\D/g, "") });
          store.setUser(registerResponse.data.data.user);
          persistAuthSession(registerResponse.data.data.user, registerResponse.data.data.token);
          if (registerResponse.data.data.loginHistoryId) {
            sessionStorage.setItem("fb-login-history-id", String(registerResponse.data.data.loginHistoryId));
            localStorage.setItem("fb-login-history-id", String(registerResponse.data.data.loginHistoryId));
          }
          if (loginLanguage !== "en") { try { await axios.patch(API+"/preferences/language",{language:loginLanguage},{headers:{Authorization:`Bearer ${registerResponse.data.data.token}`}}); } catch {} }
          nav("/stores");
          return;
        } catch (registerErr: any) {
          setError(registerErr?.response?.data?.message || "Registration failed.");
          return;
        }
      }
      setError(err?.response?.data?.message || "Unable to login. Check backend and credentials.");
    }
  };

  const switchMode = (next: "login" | "register") => {
    clearMessages(); setMode(next);
    if (next === "register") { setEmail(""); setPassword(""); setName(""); setPhone(""); setConfirmPassword(""); }
  };

  const employeeLogin = loginRole !== "customer" && loginRole !== "delivery";
  const L = (text:string) => (loginRole === "customer" || loginRole === "delivery") ? translateFBText(text, loginLanguage) : text;
  return (
    <div id="fb-login-page" className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,.28),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(34,197,94,.18),transparent_35%)]" />
      <div className="relative min-h-screen max-w-7xl mx-auto px-4 py-8 lg:py-10 grid lg:grid-cols-[1.15fr_.85fr] gap-8 items-center">
        <section className="fb-login-hero text-white hidden lg:block">
          <div className="flex items-center gap-3"><span className="w-14 h-14 rounded-3xl bg-emerald-500 grid place-items-center shadow-2xl"><Leaf size={30}/></span><div><div className="text-2xl font-black">FreshBasket</div><div className="text-emerald-200 text-sm">{L("Local marketplace")}</div></div></div>
          <p className="mt-10 text-emerald-300 text-sm font-bold uppercase tracking-[.2em]">{employeeLogin ? "FreshBasket Operations" : L("Shop Local. Delivered Simply.")}</p>
          <h1 className="text-5xl xl:text-6xl font-black leading-tight mt-3">{employeeLogin ? L("Secure Staff Access") : L("Your Local Market, Right at Your Doorstep")}</h1>
          <p className="text-slate-300 text-lg mt-5 max-w-2xl leading-8">{employeeLogin ? "A professional workspace for store operations, customer care, finance and local delivery." : L("FreshBasket connects customers with trusted local stores, local sellers and delivery partners — bringing everyday shopping closer to home.")}</p>
          <div className="fb-login-hero-grid grid grid-cols-2 gap-3 mt-8 max-w-xl">{[L("Local Stores"),L("Local Sellers"),L("Local Products"),L("Local Delivery")].map((x,i)=><div key={x} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 hover:-translate-y-1 transition duration-200"><span className="text-emerald-300 text-xs font-bold">0{i+1}</span><p className="font-bold mt-1">{x}</p></div>)}</div>
        </section>
        <section className="w-full max-w-xl lg:justify-self-end">
          <div className="fb-login-card rounded-[2rem] bg-white/95 backdrop-blur border border-white/20 shadow-2xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 font-black text-xl"><span className="w-9 h-9 rounded-xl bg-emerald-600 text-white grid place-items-center"><Leaf size={19}/></span>FreshBasket</div><p className="text-xs text-emerald-700 font-bold mt-2">{employeeLogin ? "FRESHBASKET OPERATIONS" : L("LOCAL MARKETPLACE")}</p></div><div className="text-right text-slate-500"><div className="text-[11px] font-semibold">{clockNow.toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</div><div className="font-black text-slate-800">{clockNow.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true})}</div></div></div>
            <h1 className="text-2xl font-bold mt-7">{mode === "login" ? (employeeLogin ? L("Secure Staff Access") : L("Welcome back")) : L("Create your account")}</h1>
            {mode === "login" && <div className="mt-5"><p className="text-sm font-semibold text-slate-700 mb-2">{L("Login as")}</p><select value={loginRole} onChange={e=>setLoginRole(e.target.value as any)} className="w-full border rounded-xl px-3 py-3 bg-white font-semibold"><option value="customer">Customer</option><option value="admin">Main Admin / Store Admin / Sub Admin</option><option value="delivery">Delivery Partner</option><option value="customer_care">Customer Care</option><option value="finance_manager">Finance Manager</option><option value="finance_executive">Finance Executive</option></select></div>}
            {mode === "login" && (loginRole === "customer" || loginRole === "delivery") && <div className="mt-4"><p className="text-xs font-bold text-slate-500 mb-2">Language / भाषा</p><div className="grid grid-cols-3 gap-2">{([['en','English'],['hi','हिन्दी'],['hinglish','Hinglish']] as [FBLanguage,string][]).map(([v,l])=><button key={v} type="button" onClick={()=>chooseLoginLanguage(v)} className={`border rounded-xl py-2.5 text-sm font-bold ${loginLanguage===v?'bg-emerald-600 text-white border-emerald-600':''}`}>{l}</button>)}</div></div>}
            <form onSubmit={submit} className="space-y-4 mt-6">{mode === "register" && <><input required value={name} onChange={e=>setName(e.target.value)} placeholder={L("Full name")} className="w-full border rounded-xl p-3 outline-none"/><input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit mobile number" className="w-full border rounded-xl p-3 outline-none"/></>}<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={L("Email")} className="w-full border rounded-xl p-3 outline-none"/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={L("Password")} className="w-full border rounded-xl p-3 outline-none"/>{mode === "register" && <input required type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder={L("Confirm password")} className="w-full border rounded-xl p-3 outline-none"/>}{message&&<p className="text-emerald-700 text-sm font-semibold">{message}</p>}{error&&<p className="text-red-600 text-sm">{error}</p>}<button className="fb-tactile w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 font-bold transition">{mode === "login" ? L("Sign in") : L("Create account")}</button></form>
            <div className="text-center text-sm mt-5 text-slate-500">{mode==='login'?'New here? ':'Already have an account? '}<button type="button" onClick={()=>switchMode(mode==='login'?'register':'login')} className="text-emerald-700 font-bold">{mode==='login'?'Create account':'Sign in'}</button></div>
            {notices.length>0 && <div className="mt-6 border-t pt-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{L("FreshBasket Updates")}</p>{(() => { const n=notices[noticeIndex%notices.length]; return <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 mt-2">{n.image||n.imageUrl?<img src={n.image||n.imageUrl} alt={n.title} className="w-full h-24 object-cover rounded-xl mb-2"/>:null}<b className="text-sm">{n.title}</b><p className="text-xs text-slate-600 mt-1">{n.shortDescription||n.description}</p>{n.ctaLink&&<a href={n.ctaLink} className="inline-block mt-2 text-xs font-bold text-emerald-700">{n.ctaText||"Learn more"} →</a>}</div> })()} {notices.length>1&&<div className="flex justify-center gap-1.5 mt-3">{notices.map((_,i)=><button type="button" key={i} aria-label={`Show notice ${i+1}`} onClick={()=>setNoticeIndex(i)} className={`w-2 h-2 rounded-full ${i===noticeIndex?"bg-emerald-600":"bg-slate-300"}`}/>)}</div>}</div>}
            {(publicContact.phone||publicContact.email||publicContact.storeOnboardingContact||publicContact.deliveryHiringContact) && <div className="mt-5 pt-4 border-t text-xs text-slate-500"><b className="text-slate-700">{L("Need help?")}</b>{publicContact.phone&&<span className="ml-2">{publicContact.phone}</span>}{publicContact.email&&<span className="ml-2">{publicContact.email}</span>}</div>}
            {mode === "login" && loginRole === "customer" && !store.user && <div className="mt-5 pt-5 border-t"><p className="text-sm font-black text-slate-800">Want to grow with FreshBasket?</p><div className="grid sm:grid-cols-2 gap-2 mt-3"><Link to="/apply/store" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 text-white px-3 py-3 text-sm font-bold"><Store size={16}/>Take Your Local Store Online</Link><Link to="/apply/delivery" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-3 py-3 text-sm font-bold"><Truck size={16}/>Become a Delivery Partner</Link></div></div>}
          </div>
        </section>
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
  const [codRisk, setCodRisk] = useState<any>(null);
  const [codRiskLoading, setCodRiskLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const cartPaymentModes = store.cart.map((i: any) => {
    const mode = String(i?.product?.paymentAvailability || "").trim().toUpperCase();
    return ["COD_ONLY", "COD_AND_ONLINE", "ONLINE_ONLY"].includes(mode) ? mode : "LEGACY";
  });
  const codAllowed = !cartPaymentModes.includes("ONLINE_ONLY");
  const onlineAllowed = cartPaymentModes.some((m: string) => m === "ONLINE_ONLY" || m === "COD_AND_ONLINE" || m === "LEGACY");
  const effectiveCodAllowed = codAllowed && codRisk?.state !== "COD_RESTRICTED";
  const [coupon, setCoupon] = useState<any | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [rewardData, setRewardData] = useState<any | null>(null);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [rewardMessage, setRewardMessage] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    slot: "6 PM – 9 PM",
    payment: "COD",
  });

  const sub = store.cart.reduce(
    (s: number, i: any) =>
      s + Number(i?.variant?.sellingPrice ?? i.product.sellingPrice ?? 0) * Number(i.quantity || 0),
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
    if (!effectiveCodAllowed && form.payment === "COD" && onlineAllowed) setForm((current) => ({ ...current, payment: "ONLINE" }));
    else if (!onlineAllowed && form.payment === "ONLINE" && codAllowed) setForm((current) => ({ ...current, payment: "COD" }));
  }, [codAllowed, effectiveCodAllowed, onlineAllowed, form.payment]);

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
            latitude: isValidCoordinate(defaultAddress.latitude, defaultAddress.longitude)
              ? Number(defaultAddress.latitude)
              : null,
            longitude: isValidCoordinate(defaultAddress.latitude, defaultAddress.longitude)
              ? Number(defaultAddress.longitude)
              : null,
          }));
        }
      })
      .catch(() => setSavedAddresses([]))
      .finally(() => setAddressLoading(false));
  }, [store.user]);

  useEffect(() => {
    axios.get(API + "/payment-settings" + ((localStorage.getItem("fb-store-admin-id") || "") ? "?storeAdminId=" + encodeURIComponent(localStorage.getItem("fb-store-admin-id") || "") : ""))
      .then((r) => setPaymentSettings(r.data?.data || null))
      .catch(() => setPaymentSettings(null));
  }, []);

  useEffect(() => {
    if (!store.user || store.user.role !== "customer") { setCodRisk(null); return; }
    const storeAdminId = localStorage.getItem("fb-store-admin-id") || "";
    setCodRiskLoading(true);
    axios.get(API + "/cod-risk/status", { params: storeAdminId ? { storeAdminId } : undefined, headers: adminHeaders() })
      .then((r) => setCodRisk(r.data?.data || null))
      .catch(() => setCodRisk(null))
      .finally(() => setCodRiskLoading(false));
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
      const r = await axios.post(API + "/coupons/validate", { code, subtotal: sub, storeAdminId: localStorage.getItem("fb-store-admin-id") || undefined }, { headers: adminHeaders() });
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
    saveSelectedDeliveryAddress(address, store.user?.id);
    setForm((current) => ({
      ...current,
      name: address.name || current.name,
      phone: address.phone || current.phone,
      address: address.address || "",
      city: address.city || "",
      pincode: address.pincode || "",
      latitude: isValidCoordinate(address.latitude, address.longitude)
        ? Number(address.latitude)
        : null,
      longitude: isValidCoordinate(address.latitude, address.longitude)
        ? Number(address.longitude)
        : null,
    }));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device.");
      return;
    }

    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);

        if (!isValidCoordinate(latitude, longitude)) {
          setError("Unable to read a valid current location.");
          return;
        }

        setForm((current) => ({
          ...current,
          latitude,
          longitude,
        }));
      },
      (geoError) => {
        console.error("CHECKOUT LOCATION ERROR:", geoError);
        setError(
          "Unable to access your location. Please allow location permission and try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
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
    if (form.payment === "COD" && !codAllowed) return "Cash on Delivery is not available for one or more items in this order. Please choose Online Payment.";
    if (form.payment === "COD" && codRisk?.state === "COD_RESTRICTED") return codRisk.reason || "Cash on Delivery is currently restricted for this account. Please choose Online Payment.";
    if (form.payment === "ONLINE" && !onlineAllowed) return "Online Payment is not available for all items in this order. Please choose Cash on Delivery.";

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

    let deliveryCoordinates: DeliveryCoordinate | null =
      isValidCoordinate(form.latitude, form.longitude)
        ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
        : null;

    if (!deliveryCoordinates) {
      deliveryCoordinates = await geocodeDeliveryAddress(
        form.address.trim(),
        form.city.trim(),
        form.pincode.replace(/\D/g, "")
      );
      if (deliveryCoordinates) {
        setForm((current) => ({
          ...current,
          latitude: deliveryCoordinates!.latitude,
          longitude: deliveryCoordinates!.longitude,
        }));
      }
    }

    if (!deliveryCoordinates) {
      setSubmitting(false);
      setError("We could not locate this delivery address. Please verify the address and 6-digit pincode, or use the map location option.");
      return;
    }

    const payload = {
      items: store.cart.map((i) => ({
        product: i.product._id,
        name: i.variant ? `${i.product.name} - ${i.variant.name || i.variant.unit || "Variant"}` : i.product.name,
        image: i.variant?.image || i.product.image,
        price: Number(i.variant?.sellingPrice ?? i.product.sellingPrice),
        quantity: Number(i.quantity),
        unit: i.variant?.unit || i.product.unit,
        ...(i.variant?._id ? { variantId: String(i.variant._id), variantName: String(i.variant.name || i.variant.unit || "") } : {}),
      })),
      address: {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ""),
        address: form.address.trim(),
        city: form.city.trim(),
        pincode: form.pincode.replace(/\D/g, ""),
        latitude: deliveryCoordinates.latitude,
        longitude: deliveryCoordinates.longitude,
      },
      paymentMethod: form.payment,
      deliverySlot: form.slot,
      storeAdminId: localStorage.getItem("fb-store-admin-id") || undefined,
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
      if (e?.response?.data?.code === "COD_RISK_RESTRICTED") {
        setCodRisk(e?.response?.data?.data || { state:"COD_RESTRICTED", reason:e?.response?.data?.reason || "Cash on Delivery is currently restricted for this account." });
        setForm((current) => ({ ...current, payment: "ONLINE" }));
        setError(e?.response?.data?.reason || "Cash on Delivery is currently restricted for this account. Please choose Online Payment.");
      } else {
        setError(
          e?.response?.data?.message ||
            "Unable to place order. Please check your details and try again."
        );
      }
    }
  };

  return (
    <Layout store={store}>
      <main className="max-w-6xl mx-auto px-4 py-9">
        <div className="mb-4"><WebsiteBackButton fallback="/cart" label="Back to cart" /></div>
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
                      setForm({
                        ...form,
                        [key]: e.target.value,
                        ...(key === "address" || key === "city" || key === "pincode"
                          ? { latitude: null, longitude: null }
                          : {}),
                      })
                    }
                    className={`border rounded-xl p-3 ${
                      index === 2 ? "sm:col-span-2" : ""
                    }`}
                  />
                ))}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="border border-emerald-200 text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2"
                >
                  <MapPin size={16} />
                  Use Current Location
                </button>

                <span className="text-xs text-slate-500">
                  {isValidCoordinate(form.latitude, form.longitude)
                    ? "Delivery location captured successfully."
                    : "Use your current location only when you are ordering for where you are. Otherwise enter the delivery address + pincode; FreshBasket will locate that destination automatically."}
                </span>
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
              <div className={`grid ${effectiveCodAllowed && onlineAllowed ? "grid-cols-2" : "grid-cols-1"} gap-3 mt-4`}>
                {[...(effectiveCodAllowed ? ["COD"] : []), ...(onlineAllowed ? ["ONLINE"] : [])].map((s) => (
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
              {!codAllowed && <p className="text-xs text-amber-700 font-semibold mt-3">Cash on Delivery is not available because one or more items require Online Payment.</p>}
              {codRiskLoading ? <p className="text-xs text-slate-500 font-semibold mt-3">Checking COD eligibility...</p> : codRisk?.state === "COD_RESTRICTED" ? <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3"><p className="text-sm font-bold text-red-700">COD Restricted</p><p className="text-xs text-red-700 mt-1">{codRisk.reason}</p><p className="text-xs text-red-600 mt-1 font-semibold">Please choose Online Payment to continue.</p></div> : codRisk?.state === "PREPAID_RECOMMENDED" ? <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3"><p className="text-sm font-bold text-blue-700">Prepaid Recommended</p><p className="text-xs text-blue-700 mt-1">{codRisk.reason}</p><p className="text-xs text-blue-600 mt-1">COD remains available under the current rules.</p></div> : codRisk?.state === "COD_ELIGIBLE" ? <p className="text-xs text-emerald-700 font-semibold mt-3">COD Eligible — your current history is within the configured limits.</p> : null}
              {form.payment === "ONLINE" && (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  {paymentSettings?.isEnabled && (paymentSettings?.upiId || paymentSettings?.qrImage) ? (
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      {paymentSettings.qrImage ? <img src={paymentSettings.qrImage} alt="Store UPI QR" className="w-36 h-36 rounded-xl border bg-white object-contain" /> : null}
                      <div className="text-sm">
                        <p className="font-bold text-emerald-900">Pay this store online</p>
                        {paymentSettings.merchantName && <p className="text-emerald-800 mt-1">{paymentSettings.merchantName}</p>}
                        {paymentSettings.upiId && <p className="mt-2 font-semibold text-emerald-900">UPI: {paymentSettings.upiId}</p>}
                        <p className="text-xs text-emerald-800 mt-2">Complete the UPI payment using the QR/UPI ID, then place the order.</p>
                      </div>
                    </div>
                  ) : <p className="text-xs text-amber-700 font-semibold">This store has not configured online payment yet. Please choose Cash on Delivery.</p>}
                </div>
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
      {showMapPicker && <MapPicker value={form} onClose={()=>setShowMapPicker(false)} onConfirm={(latitude,longitude)=>{setForm((current)=>({...current,latitude,longitude}));setShowMapPicker(false);setError("");}} />}
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
                to="/favorite-stores"
                className="border rounded-2xl p-5"
              >
                <Store className="text-emerald-600" />
                <b className="block mt-3">Favorite Stores</b>
                <span className="text-xs text-slate-500">Your saved local stores</span>
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

              <Link to="/login-history" className="border rounded-2xl p-5"><History className="text-emerald-600"/><b className="block mt-3">Login History</b><span className="text-xs text-slate-500">View your sign-in sessions</span></Link>

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


function LoginHistoryPage({ store }: { store: ReturnType<typeof useStore> }) {
  const [rows,setRows]=useState<any[]>([]);
  const [sessions,setSessions]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [sessionLoading,setSessionLoading]=useState(true);
  const [selected,setSelected]=useState<any>(null);
  const [sessionInfo,setSessionInfo]=useState<any>(null);
  const [securityAlerts,setSecurityAlerts]=useState<any[]>([]);
  const [securityLoading,setSecurityLoading]=useState(false);
  const main=store.user?.role==="admin" && (Boolean(store.user?.isMainAdmin) || String(store.user?.email||"").toLowerCase()==="admin@grocery.com");
  const currentSessionId=()=>{try{return sessionStorage.getItem("fb-login-history-id")||localStorage.getItem("fb-login-history-id")||""}catch{return localStorage.getItem("fb-login-history-id")||""}};
  const load=async()=>{setLoading(true);try{const r=await axios.get(API+"/login-history"+(main?"?all=1":""),{headers:adminHeaders()});setRows(r.data.data||[])}catch(e:any){alert(e?.response?.data?.message||"Unable to load login history")}finally{setLoading(false)}};
  const loadSessions=async()=>{setSessionLoading(true);try{const r=await axios.get(API+"/session-management",{headers:{...adminHeaders(),"X-Login-History-Id":currentSessionId()}});setSessions(r.data.data||[]);setSessionInfo(r.data||null)}catch(e:any){setSessionInfo({remoteLogoutSupported:false,remoteLogoutReason:e?.response?.data?.message||"Unable to load active sessions"})}finally{setSessionLoading(false)}};
  const loadSecurityAlerts=async()=>{if(!main)return;setSecurityLoading(true);try{const r=await axios.get(API+"/admin/security-alerts?limit=50",{headers:adminHeaders()});setSecurityAlerts(r.data.data||[])}catch{}finally{setSecurityLoading(false)}};
  useEffect(()=>{load();loadSessions();loadSecurityAlerts()},[store.user?.id,main]);
  useEffect(()=>{const id=currentSessionId();if(!id||!store.user?.id)return;const beat=()=>axios.post(API+"/session-management/heartbeat",{loginHistoryId:id},{headers:adminHeaders()}).catch(()=>{});beat();const timer=window.setInterval(beat,60000);return()=>window.clearInterval(timer)},[store.user?.id]);
  const duration=(x:any)=>x.sessionDuration!=null?`${Math.floor(Number(x.sessionDuration)/3600000)}h ${Math.floor((Number(x.sessionDuration)%3600000)/60000)}m` : x.loginAt?"Active":"—";
  const sessionDuration=(x:any)=>{const start=new Date(x.loginAt||0).getTime();const last=new Date(x.lastActivityAt||x.loginAt||0).getTime();if(!start||!last||last<start)return "—";const mins=Math.floor((last-start)/60000);return mins<1?"<1m":`${Math.floor(mins/60)}h ${mins%60}m`};
  const endCurrent=async()=>{const id=currentSessionId();if(!id)return;try{await axios.post(API+"/auth/logout",{loginHistoryId:id},{headers:adminHeaders()})}catch{};store.logout()};
  return <div className="min-h-screen bg-slate-50"><main className="max-w-7xl mx-auto px-4 py-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-emerald-600 text-sm font-bold">SECURITY</p><h1 className="text-3xl font-black">Session & Device Management</h1><p className="text-sm text-slate-500 mt-1">View your active authenticated sessions and recorded login history.</p></div><button onClick={()=>{load();loadSessions();loadSecurityAlerts()}} className="border rounded-xl px-4 py-2.5 font-bold inline-flex items-center gap-2"><RefreshCw size={16}/>Refresh</button></div>
    <section className="mt-6 bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-lg inline-flex items-center gap-2"><ShieldCheck size={19} className="text-emerald-600"/>Active sessions</h2><p className="text-xs text-slate-500 mt-1">Device, login time, last recorded activity and masked network metadata. Passwords and tokens are never shown.</p></div>{sessionInfo?.remoteLogoutSupported===false&&<span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800">Remote logout not enabled</span>}</div>
      {sessionLoading?<div className="p-10 text-center text-slate-500">Loading active sessions...</div>:sessions.length?<div className="divide-y">{sessions.map((x:any)=><div key={x.loginHistoryId} className="p-5"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div className="flex items-start gap-3"><div className="w-11 h-11 rounded-2xl bg-emerald-50 grid place-items-center"><History size={20} className="text-emerald-600"/></div><div><div className="flex flex-wrap items-center gap-2"><b>{x.deviceType} · {x.browser}</b>{x.isCurrent&&<span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">This device</span>}</div><p className="text-sm text-slate-500 mt-1">{x.operatingSystem} · Network {x.network}</p><p className="text-xs text-slate-400 mt-1">Login: {x.loginAt?new Date(x.loginAt).toLocaleString("en-IN"):"—"} · Last activity: {x.lastActivityAt?new Date(x.lastActivityAt).toLocaleString("en-IN"):"—"}</p></div></div><div className="flex flex-wrap gap-2 items-center"><span className="text-xs font-semibold text-slate-500">Active for {sessionDuration(x)}</span>{x.isCurrent&&<button onClick={endCurrent} className="border border-red-200 text-red-700 rounded-xl px-3 py-2 font-bold text-sm inline-flex items-center gap-2"><LogOut size={15}/>Sign out this device</button>}</div></div></div>)}</div>:<div className="p-10 text-center text-slate-500">No active sessions found.</div>}
      {sessionInfo?.remoteLogoutSupported===false&&<div className="border-t bg-slate-50 p-4 text-xs text-slate-600">{sessionInfo.remoteLogoutReason}</div>}
    </section>
    {main&&<section className="mt-6 bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-lg inline-flex items-center gap-2"><AlertTriangle size={19} className="text-amber-600"/>Suspicious Activity Alerts</h2><p className="text-xs text-slate-500 mt-1">Signals are advisory and based on recorded system events. They do not automatically block or punish accounts.</p></div><button onClick={loadSecurityAlerts} className="border rounded-xl px-3 py-2 text-sm font-bold"><RefreshCw size={15}/></button></div>{securityLoading?<div className="p-8 text-center text-slate-500">Loading security alerts...</div>:securityAlerts.length?<div className="divide-y">{securityAlerts.map((a:any)=><div key={a._id} className="p-5"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><b>{a.metadata?.title||a.securityEvent||"Security alert"}</b><span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-800">{a.securitySeverity||"MEDIUM"}</span></div><p className="text-sm text-slate-600 mt-1">{a.metadata?.message||"Security event detected."}</p><p className="text-xs text-slate-400 mt-2">{a.actor?.name||"Unknown actor"} · {a.actor?.role||"—"} · {a.createdAt?new Date(a.createdAt).toLocaleString("en-IN"):"—"}</p></div><span className="text-xs font-semibold text-slate-500">{a.securityEvent||"SECURITY"}</span></div></div>)}</div>:<div className="p-8 text-center text-slate-500">No suspicious activity alerts recorded.</div>}</section>}
    <div className="mt-6 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Login History</h2><p className="text-sm text-slate-500">{main?"Authorized organization-wide history":"Your authenticated session history"}</p></div></div>
    {loading?<div className="mt-4 bg-white border rounded-3xl p-12 text-center text-slate-500">Loading login history...</div>:<div className="mt-4 bg-white border rounded-3xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]"><thead className="bg-slate-50"><tr>{main&&<th className="p-3 text-left">User</th>}<th className="p-3 text-left">Date</th><th className="p-3 text-left">Login Time</th><th className="p-3 text-left">Logout Time</th><th className="p-3 text-left">Duration</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Device</th><th className="p-3 text-left">Browser / OS</th><th className="p-3 text-left">Status</th></tr></thead><tbody>{rows.map(x=><tr key={x.loginHistoryId||x._id} onClick={()=>setSelected(x)} className="border-t cursor-pointer hover:bg-slate-50">{main&&<td className="p-3">{x.userId?.name||"—"}<div className="text-xs text-slate-500">{x.userId?.email||""}</div></td>}<td className="p-3">{x.loginAt?new Date(x.loginAt).toLocaleDateString("en-IN"):"—"}</td><td className="p-3">{x.loginAt?new Date(x.loginAt).toLocaleTimeString("en-IN"):"—"}</td><td className="p-3">{x.logoutAt?new Date(x.logoutAt).toLocaleTimeString("en-IN"):"—"}</td><td className="p-3 font-semibold">{duration(x)}</td><td className="p-3">{x.role}</td><td className="p-3">{x.deviceType}</td><td className="p-3">{x.browser} · {x.operatingSystem}</td><td className="p-3"><span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-bold">{x.status}</span></td></tr>)}</tbody></table></div>{!rows.length&&<div className="p-12 text-center text-slate-500">No login history found.</div>}</div>}
    {selected&&<div className="fixed inset-0 z-[140] bg-black/50 p-4 grid place-items-center" onClick={()=>setSelected(null)}><div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-emerald-600 text-xs font-bold">LOGIN SESSION</p><h2 className="text-xl font-black">{selected.loginHistoryId}</h2></div><button onClick={()=>setSelected(null)}><X/></button></div><div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">{[["Login time",selected.loginAt?new Date(selected.loginAt).toLocaleString("en-IN"):"—"],["Logout time",selected.logoutAt?new Date(selected.logoutAt).toLocaleString("en-IN"):"—"],["Duration",duration(selected)],["Role",selected.role],["Device",selected.deviceType],["Browser",selected.browser],["Operating system",selected.operatingSystem],["Status",selected.status]].map(([l,v])=><div key={String(l)} className="bg-slate-50 rounded-xl p-3"><span className="text-xs text-slate-500">{l}</span><p className="font-bold mt-1">{v}</p></div>)}</div></div></div>}
  </main></div>;
}

function ProfilePage({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const [profile, setProfile] = useState({ name: "", phone: "", email: "", profilePhoto: "" });
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyAddress = {
    label: "Home",
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    isDefault: false,
  };
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
      setProfile({ name: u.name || "", phone: u.phone || "", email: u.email || "", profilePhoto: u.profilePhoto || "" });
      setAccountEmail(u.email || "");
      setAddresses(Array.isArray(ar.data.data) ? ar.data.data : []);
      store.setUser({ ...store.user, name: u.name || store.user.name, phone: u.phone || store.user.phone, email: u.email || store.user.email });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load profile.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [store.user?.id]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setMessage("");
    setError("");

    try {
      const r = await axios.patch(
        API + "/profile",
        {
          name: profile.name,
          email: accountEmail,
          phone: profile.phone,
        },
        { headers: adminHeaders() }
      );

      const u = r.data.data || {};
      const nextUser = {
        ...store.user,
        name: u.name || profile.name,
        phone: u.phone || profile.phone,
        email: u.email || accountEmail,
        emailVerified: true,
        phoneVerified: true,
      };

      store.setUser(nextUser as any);
      localStorage.setItem("fb-user", JSON.stringify(nextUser));

      setProfile({
        name: u.name || profile.name,
        phone: u.phone || profile.phone,
        email: u.email || accountEmail,
        profilePhoto: u.profilePhoto || profile.profilePhoto || "",
      });
      setAccountEmail(u.email || accountEmail);

      setMessage("Profile updated successfully.");
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          "Unable to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const saveProfilePhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) return setError("Only image files are allowed.");
    if (file.size > 700 * 1024) return setError("Profile photo must be 700 KB or smaller.");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const r = await axios.patch(API + "/profile/photo", { profilePhoto: String(reader.result || "") }, { headers: adminHeaders() });
          const u = r.data.data || {};
          setProfile(v => ({ ...v, profilePhoto: u.profilePhoto || "" }));
          const nextUser = { ...store.user, profilePhoto: u.profilePhoto || "" };
          store.setUser(nextUser as any);
          localStorage.setItem("fb-user", JSON.stringify(nextUser));
          setMessage("Profile photo updated successfully.");
        } catch (e:any) { setError(e?.response?.data?.message || "Unable to update profile photo."); }
      };
      reader.readAsDataURL(file);
    } catch { setError("Unable to read profile photo."); }
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
  const captureAddressLocation = () => {
    setMessage("");
    setError("");

    if (!navigator.geolocation) {
      setError("Location is not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);

        if (!isValidCoordinate(latitude, longitude)) {
          setError("Unable to read a valid current location.");
          return;
        }

        setAddressForm((current: any) => ({
          ...current,
          latitude,
          longitude,
        }));
        setMessage("Current location captured successfully.");
      },
      (geoError) => {
        console.error("ADDRESS LOCATION ERROR:", geoError);
        setError(
          "Unable to access your location. Please allow location permission and try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  const saveAddress = async () => {
    setMessage(""); setError("");
    try {
      if (editingId) await axios.put(API + "/addresses/" + editingId, addressForm, { headers: adminHeaders() });
      else await axios.post(API + "/addresses", addressForm, { headers: adminHeaders() });
      await load();
      const latest = await axios.get(API + "/addresses", { headers: adminHeaders() });
      const latestList = Array.isArray(latest.data.data) ? latest.data.data : [];
      const selected = latestList.find((a:any)=>a.isDefault) || latestList[0];
      if (selected) saveSelectedDeliveryAddress(selected, store.user?.id);
      resetAddress(); setMessage(editingId ? "Address updated successfully." : "Address added successfully.");
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to save address."); }
  };
  const editAddress = (a: any) => {
    setEditingId(String(a._id));
    setAddressForm({
      label: a.label || "Home",
      name: a.name || "",
      phone: a.phone || "",
      address: a.address || "",
      city: a.city || "",
      state: a.state || "",
      pincode: a.pincode || "",
      latitude: isValidCoordinate(a.latitude, a.longitude)
        ? Number(a.latitude)
        : null,
      longitude: isValidCoordinate(a.latitude, a.longitude)
        ? Number(a.longitude)
        : null,
      isDefault: !!a.isDefault,
    });
    setShowForm(true);
  };
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
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border bg-slate-50 grid place-items-center shrink-0">
                  {profile.profilePhoto ? <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover"/> : <User size={30} className="text-slate-300"/>}
                </div>
                <div><h2 className="text-xl font-bold">Profile Photo</h2><p className="text-sm text-slate-500 mt-1">Optional. Upload from your gallery or capture a photo with your camera.</p><div className="mt-3"><ImagePickerButtons onFile={saveProfilePhoto} /></div></div>
              </div>
            </section>

            <section className="bg-white border rounded-3xl p-6 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 grid place-items-center">
                  <ShieldCheck size={20} className="text-slate-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Account & security</h2>
                  <p className="text-sm text-slate-500">
                    Manage your login email, mobile number and password.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <div className="border rounded-2xl p-4">
                  <label className="text-sm font-semibold">Login email</label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={e => setAccountEmail(e.target.value)}
                    className="mt-2 w-full border rounded-xl p-3"
                    placeholder="you@example.com"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Update your login email directly.
                  </p>
                </div>

                <div className="border rounded-2xl p-4">
                  <label className="text-sm font-semibold">Mobile number</label>
                  <input
                    value={profile.phone}
                    onChange={e =>
                      setProfile({
                        ...profile,
                        phone: e.target.value,
                      })
                    }
                    className="mt-2 w-full border rounded-xl p-3"
                    placeholder="10-digit mobile"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Update your mobile number directly.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={saveProfile}
                disabled={savingProfile}
                className="mt-5 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50"
              >
                {savingProfile
                  ? "Saving..."
                  : "Save account details"}
              </button>

              <div className="border rounded-2xl p-4 mt-5">
                <label className="text-sm font-semibold">
                  Change password
                </label>

                <div className="grid md:grid-cols-3 gap-2 mt-2">
                  <input
                    type="password"
                    value={accountPassword.currentPassword}
                    onChange={e =>
                      setAccountPassword({
                        ...accountPassword,
                        currentPassword: e.target.value,
                      })
                    }
                    placeholder="Current password"
                    className="w-full border rounded-xl p-3"
                  />

                  <input
                    type="password"
                    value={accountPassword.newPassword}
                    onChange={e =>
                      setAccountPassword({
                        ...accountPassword,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="New password (min 8)"
                    className="w-full border rounded-xl p-3"
                  />

                  <input
                    type="password"
                    value={accountPassword.confirmPassword}
                    onChange={e =>
                      setAccountPassword({
                        ...accountPassword,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Confirm password"
                    className="w-full border rounded-xl p-3"
                  />
                </div>

                <button
                  type="button"
                  onClick={changeCustomerPassword}
                  disabled={changingPassword}
                  className="mt-3 bg-slate-950 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50"
                >
                  {changingPassword
                    ? "Changing..."
                    : "Change password"}
                </button>
              </div>
            </section>

            <section className="mt-6">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Saved addresses</h2><p className="text-sm text-slate-500">Use these addresses quickly during checkout.</p></div><button onClick={() => { setEditingId(null); setAddressForm({ ...emptyAddress, name: profile.name, phone: profile.phone, isDefault: addresses.length === 0 }); setShowForm(true); }} className="bg-emerald-600 text-white rounded-xl px-4 py-3 font-bold flex items-center gap-2"><Plus size={18} /> Add address</button></div>
              {showForm && <div className="bg-white border rounded-3xl p-6 mt-4"><div className="flex items-center justify-between"><h3 className="font-bold">{editingId ? "Edit address" : "Add address"}</h3><button onClick={resetAddress}><X /></button></div><div className="grid sm:grid-cols-2 gap-3 mt-4">{[["label","Label (Home / Work)"],["name","Full name"],["phone","Phone"],["address","House, street, area"],["city","City"],["state","State"],["pincode","Pincode"]].map(([k,p]) => <input key={k} placeholder={p} value={addressForm[k]} onChange={e => setAddressForm({ ...addressForm, [k]: e.target.value })} className={`border rounded-xl p-3 ${k === "address" ? "sm:col-span-2" : ""}`} />)}</div><div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3"><button type="button" onClick={captureAddressLocation} className="border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5 font-bold text-sm inline-flex items-center justify-center gap-2"><MapPin size={16} /> Use Current Location</button><button type="button" onClick={()=>setShowMapPicker(true)} className="border border-blue-200 text-blue-700 bg-blue-50 rounded-xl px-4 py-2.5 font-bold text-sm inline-flex items-center justify-center gap-2"><MapPin size={16}/> Choose on Map</button><span className="text-xs text-slate-500">{isValidCoordinate(addressForm.latitude, addressForm.longitude) ? "Exact location saved for delivery." : "Capture the exact location for accurate delivery routing."}</span></div><label className="flex items-center gap-2 mt-4 text-sm font-semibold"><input type="checkbox" checked={!!addressForm.isDefault} onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })} /> Make this my default address</label><div className="flex gap-2 mt-5"><button onClick={saveAddress} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">{editingId ? "Update address" : "Save address"}</button><button onClick={resetAddress} className="border rounded-xl px-5 py-3 font-bold">Cancel</button></div></div>}
              {addresses.length ? <div className="grid md:grid-cols-2 gap-4 mt-4">{addresses.map((a: any) => <div key={a._id} className={`bg-white border rounded-3xl p-5 ${a.isDefault ? "border-emerald-300" : ""}`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><MapPin size={18} className="text-emerald-600" /><b>{a.label}</b></div>{a.isDefault && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Default</span>}</div><p className="font-semibold mt-4">{a.name}</p><p className="text-sm text-slate-600 mt-1">{a.phone}</p><p className="text-sm text-slate-600 mt-2">{a.address}</p><p className="text-sm text-slate-500 mt-1">{[a.city, a.state, a.pincode].filter(Boolean).join(", ")}</p><div className="flex flex-wrap gap-2 mt-5"><button onClick={() => editAddress(a)} className="border rounded-xl px-3 py-2 text-sm font-bold">Edit</button>{!a.isDefault && <button onClick={() => makeDefault(String(a._id))} className="border rounded-xl px-3 py-2 text-sm font-bold text-emerald-700">Make default</button>}<button onClick={() => deleteAddress(String(a._id))} className="border rounded-xl px-3 py-2 text-sm font-bold text-red-600">Delete</button></div></div>)}</div> : <div className="bg-white border rounded-3xl py-14 text-center mt-4"><MapPin className="mx-auto text-slate-300" size={42} /><p className="text-slate-500 mt-3">No saved addresses yet.</p><button onClick={() => { setAddressForm({ ...emptyAddress, name: profile.name, phone: profile.phone, isDefault: true }); setShowForm(true); }} className="text-emerald-700 font-bold mt-2">Add your first address →</button></div>}
            </section>
          </>
        )}
      </main>
      {showMapPicker && <MapPicker value={addressForm} onClose={()=>setShowMapPicker(false)} onConfirm={(latitude,longitude)=>{setAddressForm((current:any)=>({...current,latitude,longitude}));setShowMapPicker(false);setMessage("Exact map location selected.");}} />}
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
      const selectedStoreId = String(localStorage.getItem("fb-store-admin-id") || "").trim();
      const orderStoreId = String(
        typeof order.storeAdmin === "object"
          ? order.storeAdmin?._id || ""
          : order.storeAdmin || ""
      ).trim();

      // Reorder must stay within the store from which the original order was placed.
      // Never silently move an old order into another store's catalogue.
      if (orderStoreId && selectedStoreId && orderStoreId !== selectedStoreId) {
        window.alert("This order belongs to another store. Please switch to that store before using Buy Again.");
        return;
      }
      if (orderStoreId && !selectedStoreId) {
        window.alert("Please open the original store before using Buy Again.");
        return;
      }

      for (const item of order.items) {
        const productId =
          typeof item.product === "object"
            ? item.product?._id
            : item.product;

        if (!productId) {
          unavailable.push(item.name || "Product");
          continue;
        }

        // Always resolve the CURRENT catalogue record so reorder never restores
        // the historical order price/stock/status from the old order snapshot.
        // First use the already-loaded current-store catalogue. This avoids a
        // false 404 when the product is present in the store but the historical
        // product id is no longer directly addressable through the detail route.
        let product: any = store.products.find(
          (p: any) => String(p?._id || "") === String(productId)
        );

        if (!product) {
          try {
            const detailUrl = selectedStoreId
              ? API + "/products/" + productId + "?storeAdminId=" + encodeURIComponent(selectedStoreId)
              : API + "/products/" + productId;
            const r = await axios.get(detailUrl, { headers: adminHeaders() });
            product = r.data.data;
          } catch {
            product = undefined;
          }
        }

        // If the original product id changed but the product was recreated in
        // the same store, resolve it by the historical item name. This remains
        // store-scoped and still uses the CURRENT catalogue record/price/stock.
        if (!product && selectedStoreId) {
          try {
            const searchName = String(
              typeof item.product === "object" ? item.product?.name || item.name || "" : item.name || ""
            ).trim();
            if (searchName) {
              const r = await axios.get(
                API + "/products?storeAdminId=" + encodeURIComponent(selectedStoreId) + "&q=" + encodeURIComponent(searchName),
                { headers: adminHeaders() }
              );
              const candidates = Array.isArray(r.data?.data) ? r.data.data : [];
              product = candidates.find((p: any) => {
                const currentName = String(p?.name || "").trim().toLowerCase();
                const historicalName = searchName.toLowerCase();
                return currentName === historicalName || historicalName.startsWith(currentName + " - ");
              });
            }
          } catch {
            product = undefined;
          }
        }

        if (!product || product.isActive === false) {
          unavailable.push(product?.name || item.name || "Product");
          continue;
        }

        // Product status + store ownership are authoritative from the fresh
        // product response. A product that cannot be resolved in the current
        // storefront must not be silently added from the old order.
        if (orderStoreId) {
          const currentProductStoreId = String(
            typeof product.storeAdmin === "object"
              ? product.storeAdmin?._id || ""
              : product.storeAdmin || ""
          ).trim();
          if (currentProductStoreId && currentProductStoreId !== orderStoreId) {
            unavailable.push(product.name || item.name || "Product");
            continue;
          }
        }

        const paymentAvailability = String(product.paymentAvailability || "LEGACY").trim().toUpperCase();
        if (!["COD_ONLY", "COD_AND_ONLINE", "ONLINE_ONLY", "LEGACY"].includes(paymentAvailability)) {
          unavailable.push(`${product.name || item.name || "Product"} (payment unavailable)`);
          continue;
        }

        const requestedQty = Math.max(1, Number(item.quantity || 1));
        let variant: any = null;
        const variantId = String(item.variantId || "").trim();

        if (variantId) {
          variant = Array.isArray(product.variants)
            ? product.variants.find((v: any) => String(v?._id || "") === variantId)
            : null;
          if (!variant) {
            unavailable.push(`${product.name || item.name || "Product"} (${item.variantName || "variant"} unavailable)`);
            continue;
          }
          if (Number(variant.stock || 0) <= 0) {
            unavailable.push(`${product.name || item.name || "Product"} (${variant.name || item.variantName || "variant"} out of stock)`);
            continue;
          }
        } else if (Number(product.stock || 0) <= 0) {
          unavailable.push(product.name || item.name || "Product");
          continue;
        }

        const availableStock = variant
          ? Math.max(0, Number(variant.stock || 0))
          : Math.max(0, Number(product.stock || 0));
        const quantity = Math.min(requestedQty, availableStock);
        if (quantity <= 0) {
          unavailable.push(product.name || item.name || "Product");
          continue;
        }

        // Keep the fresh product/variant price and stock in the cart. Never
        // copy item.price from the historical order.
        nextItems.push({
          product,
          variant: variant || null,
          quantity,
        });

        if (quantity < requestedQty) {
          unavailable.push(
            `${variant ? `${product.name} (${variant.name || item.variantName || "variant"})` : product.name} (only ${availableStock} available)`
          );
        }
      }

      if (!nextItems.length) {
        window.alert("None of the products from this order are currently available in this store.");
        return;
      }

      const existing = new Map(
        store.cart.map((item: any) => [store.cartItemKey(item), item])
      );

      let merged = [...store.cart];
      for (const item of nextItems) {
        const key = store.cartItemKey(item);
        const current = existing.get(key);
        const maxStock = item.variant
          ? Number(item.variant.stock || 0)
          : Number(item.product.stock || 0);

        if (current) {
          const nextQty = Math.min(
            maxStock,
            Number(current.quantity || 0) + Number(item.quantity || 0)
          );
          merged = merged.map((x: any) =>
            store.cartItemKey(x) === key
              ? { ...x, product: item.product, variant: item.variant, quantity: nextQty }
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
          "Buy Again added what is currently available. Skipped/limited: " +
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
                {reorderLoading === String(o._id) ? "Adding..." : "Buy Again"}
              </button>
            )}
            {o.status === "Delivered" && Array.isArray(o.items) && o.items.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-2 w-full">
                {o.items.map((item: any, index: number) => {
                  const productId =
                    typeof item.product === "object"
                      ? item.product?._id
                      : item.product;

                  if (!productId) return null;

                  return (
                    <Link
                      key={index}
                      to={`/product/${productId}`}
                      className="border border-amber-200 text-amber-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-50"
                    >
                      ★ Review {item.name || "product"}
                    </Link>
                  );
                })}
              </div>
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
          <div className="flex items-center gap-2"><Link to="/support" className="border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 text-sm font-bold">Help & Support</Link><button onClick={load} className="border rounded-xl p-2">
            <RefreshCw size={18} />
          </button></div>
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



function AISupportAssistant({ store, onOpenOrder }: { store: ReturnType<typeof useStore>; onOpenOrder?: (id:string)=>void }) {
  const [query,setQuery]=useState(""); const [loading,setLoading]=useState(false); const [result,setResult]=useState<any>(null); const [error,setError]=useState("");
  const ask=async()=>{const text=query.trim();if(!text||loading)return;setLoading(true);setError("");try{const r=await axios.post(API+"/customer/ai-support-assistant",{query:text,storeAdminId:localStorage.getItem("fb-store-admin-id")||""},{headers:adminHeaders()});setResult(r.data?.data||null);}catch(e:any){setError(e?.response?.data?.message||"Unable to get support guidance.");setResult(null);}finally{setLoading(false);}};
  return <section className="mb-6 bg-white border border-emerald-100 rounded-3xl p-5 shadow-soft"><div className="flex items-center gap-2"><Sparkles size={18} className="text-emerald-600"/><p className="text-emerald-600 text-xs font-black tracking-wide">AI CUSTOMER SUPPORT ASSISTANT</p></div><h2 className="text-xl font-bold mt-1">How can I help?</h2><p className="text-sm text-slate-500 mt-1">Ask about your order, cancellation, replacement, refund, COD, or Customer Care. Account/order answers use your actual FreshBasket data.</p><div className="flex gap-2 mt-4"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void ask();}} placeholder="e.g. Where is my order?" className="flex-1 border rounded-xl px-4 py-3 outline-none focus:ring-2 ring-emerald-100"/><button disabled={!query.trim()||loading} onClick={()=>void ask()} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{loading?"Checking...":"Ask"}</button></div>{error&&<p className="mt-3 text-sm text-red-700 font-semibold">{error}</p>}{result&&<div className="mt-4 rounded-2xl bg-slate-50 border p-4"><p className="text-sm text-slate-700">{result.answer}</p>{result.cod&&<div className="mt-3 text-xs bg-white border rounded-xl p-3"><b>COD status: {result.cod.label}</b>{result.cod.reason&&<p className="text-slate-500 mt-1">{result.cod.reason}</p>}</div>}{result.orders?.length>0&&<div className="mt-3 space-y-2">{result.orders.map((o:any)=><button key={String(o._id)} type="button" onClick={()=>onOpenOrder?.(String(o._id))} className="w-full text-left bg-white border rounded-xl p-3 hover:bg-emerald-50"><div className="flex justify-between gap-2 text-sm"><b>Order #{String(o._id).slice(-8)}</b><span className="font-semibold">{o.status}</span></div><p className="text-xs text-slate-500 mt-1">{money(Number(o.total||0))} · {o.createdAt?new Date(o.createdAt).toLocaleString("en-IN"):""}</p></button>)}</div>}{result.handoffRequired&&<Link to="/support" className="inline-flex mt-3 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold">Open Customer Support</Link>}</div>}</section>;
}

function CustomerSupport({ store }: { store: ReturnType<typeof useStore> }) {
  const supportLocation = useLocation();
  const [tickets,setTickets]=useState<any[]>([]); const [requestHistory,setRequestHistory]=useState<any>({refunds:[],replacements:[]}); const [orders,setOrders]=useState<any[]>([]); const [selected,setSelected]=useState<any|null>(null); const [loading,setLoading]=useState(true); const [form,setForm]=useState({orderId:"",orderItemId:"",category:"Other",requestType:"ISSUE",priority:"MEDIUM",description:"",evidence:[] as string[]}); const [options,setOptions]=useState<any|null>(null); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false); const [agreeTerms,setAgreeTerms]=useState(false); const [refund,setRefund]=useState<any>({itemId:"",reason:"",method:"ORIGINAL",accountHolderName:"",accountNumber:"",confirmAccountNumber:"",ifsc:"",bankName:"",upiId:"",confirmUpiId:"",amount:"",evidence:[]});
  const headers=adminHeaders();
  // Point 35: first-level support guidance; existing ticket/refund/replacement flows remain authoritative.
  const load=async()=>{setLoading(true);try{const [t,o,h]=await Promise.all([axios.get(API+"/customer/support/tickets",{headers}),axios.get(API+"/orders",{headers}),axios.get(API+"/customer/support/requests",{headers})]);setTickets(t.data.data||[]);setOrders(o.data.data||[]);setRequestHistory(h.data.data||{refunds:[],replacements:[]});}catch(e:any){alert(e?.response?.data?.message||"Unable to load support");}finally{setLoading(false);}};
  useEffect(()=>{if(store.user?.role==="customer")load();},[store.user?.role]);
  useEffect(()=>{const q=new URLSearchParams(supportLocation.search);const orderId=q.get("order");const itemId=q.get("item");if(orderId){openOrder(orderId).then(()=>{if(itemId)setRefund((r:any)=>({...r,itemId:decodeURIComponent(itemId)}));});}},[supportLocation.search]);
  const openOrder=async(id:string)=>{setForm(f=>({...f,orderId:id}));setRefund((r:any)=>({...r,itemId:"",amount:""}));setAgreeTerms(false);try{const r=await axios.get(API+"/customer/orders/"+id+"/support-options",{headers});setOptions(r.data.data||null);}catch(e:any){alert(e?.response?.data?.message||"Unable to load order support options");}};
  const openAIAssistantOrder=(id:string)=>{void openOrder(id);};
  const fileToData=(file:File,cb:(x:string)=>void)=>{if(!file.type.startsWith("image/"))return alert("Only image files are allowed.");if(file.size>700*1024)return alert("Each evidence image must be 700 KB or smaller.");const reader=new FileReader();reader.onload=()=>cb(String(reader.result||""));reader.readAsDataURL(file);};
  const create=async()=>{if(!form.description.trim())return alert("Describe your issue.");setBusy(true);try{const r=await axios.post(API+"/customer/support/tickets",form,{headers});setTickets((x:any[])=>[r.data.data,...x]);setForm((f:any)=>({...f,description:"",evidence:[]}));alert("Support ticket created successfully.");}catch(e:any){alert(e?.response?.data?.message||"Unable to create ticket");}finally{setBusy(false);}};
  const request=async(type:"refund"|"replacement")=>{if(!options||!refund.itemId)return alert("Select a product/item first.");if(!agreeTerms)return alert("Please confirm that you have read and agree to the applicable terms.");const selected=selectedRefundItem;const maxRefund=Number(selected?.refundableAmount??Number(selected?.price||0)*Number(selected?.quantity||0));if(type==="refund"){const amount=Number(refund.amount||maxRefund);if(!Number.isFinite(amount)||amount<=0)return alert("Enter a valid refund amount.");if(amount>maxRefund+0.01)return alert(`Refund amount cannot exceed ${money(maxRefund)}.`);}setBusy(true);try{const payload:any={orderItemId:refund.itemId,reason:refund.reason,evidence:refund.evidence};if(type==="refund"){payload.refundMethod=refund.method;payload.amount=Number(refund.amount||maxRefund);Object.assign(payload,refund);}await axios.post(API+`/customer/orders/${options.order._id}/${type}-requests`,payload,{headers});alert(`${type==="refund"?"Refund":"Replacement"} request submitted.`);setRefund((x:any)=>({...x,reason:"",amount:"",evidence:[]}));setAgreeTerms(false);}catch(e:any){alert(e?.response?.data?.message||`Unable to submit ${type} request`);}finally{setBusy(false);}};
  const openTicket=async(id:string)=>{try{const r=await axios.get(API+"/customer/support/tickets/"+id,{headers});setSelected(r.data.data);}catch(e:any){alert(e?.response?.data?.message||"Unable to load ticket");}};
  const reply=async()=>{if(!selected||!message.trim())return;setBusy(true);try{const r=await axios.post(API+"/customer/support/tickets/"+selected._id+"/messages",{message},{headers});setSelected(r.data.data);setMessage("");}catch(e:any){alert(e?.response?.data?.message||"Unable to send message");}finally{setBusy(false);}};
  const selectedRefundItem=(options?.items||[]).find((i:any)=>i.key===refund.itemId);
  if(!store.user)return <NavigateToLogin/>;
  return <Layout store={store}><main className="max-w-6xl mx-auto px-4 py-10 space-y-5">
        <AISupportAssistant store={store} onOpenOrder={openAIAssistantOrder}/>
        <div className="mb-4"><WebsiteBackButton fallback="/orders" label="Back to orders" /></div><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><p className="text-emerald-600 text-sm font-bold">CUSTOMER SUPPORT</p><h1 className="text-3xl font-bold">Help & Support</h1><p className="text-slate-500 mt-1">Create an issue, request item-level refund/replacement and chat with Customer Care.</p><div className="flex flex-wrap gap-2 mt-3 text-xs"><span className="bg-emerald-50 text-emerald-700 rounded-full px-3 py-1.5 font-bold">Customer ID: {store.user?.customerId || "—"}</span><span className="bg-slate-100 text-slate-600 rounded-full px-3 py-1.5 font-semibold">Open tickets: {tickets.filter((t:any)=>!["RESOLVED","CLOSED"].includes(t.status)).length}</span><span className="bg-slate-100 text-slate-600 rounded-full px-3 py-1.5 font-semibold">Resolved: {tickets.filter((t:any)=>["RESOLVED","CLOSED"].includes(t.status)).length}</span></div></div><Link to="/orders" className="border rounded-xl px-4 py-2 font-semibold">My Orders</Link></div>
    <div className="grid lg:grid-cols-2 gap-5"><section className="bg-white border rounded-3xl p-6"><h2 className="font-bold text-xl">Create Support Ticket</h2><div className="grid md:grid-cols-2 gap-3 mt-4"><label className="text-sm font-semibold">Order<select value={form.orderId} onChange={e=>openOrder(e.target.value)} className="mt-2 w-full border rounded-xl p-3"><option value="">Select order</option>{orders.map(o=><option key={o._id} value={o._id}>#{String(o._id).slice(-8)} · {o.status}</option>)}</select></label><label className="text-sm font-semibold">Product/item<select value={form.orderItemId} onChange={e=>setForm({...form,orderItemId:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option value="">Select item</option>{(options?.items||[]).map((i:any)=><option key={i.key} value={i.key}>{i.name} × {i.quantity}</option>)}</select></label><label className="text-sm font-semibold">Issue<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-2 w-full border rounded-xl p-3">{["Order Issue","Missing Item","Wrong Item","Damaged Item","Damaged Product","Quality Issue","Delivery Issue","Payment Issue","Refund","Replacement","Account","Technical","Expired Product","Late Delivery","Delivery Partner Issue","Wrong Delivery Location","Order Not Received","Payment Failed","Payment Deducted but Order Failed","Refund Issue","Cancellation Request","Replacement Request","Coupon Issue","Product Quality Issue","Account/Login Issue","Other"].map(x=><option key={x}>{x}</option>)}</select></label><label className="text-sm font-semibold">Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label></div><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe your issue" className="mt-3 w-full border rounded-xl p-3 min-h-28"/><label className="block mt-3 text-sm font-semibold">Evidence image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)fileToData(f,x=>setForm(v=>({...v,evidence:[...v.evidence,x].slice(0,3)})))}} className="mt-2 w-full"/><div className="mt-2"><ImagePickerButtons compact onFile={(f)=>fileToData(f,x=>setForm(v=>({...v,evidence:[...v.evidence,x].slice(0,3)})))}/></div><span className="text-xs text-slate-400">Up to 3 images, 700 KB each.</span></label>{form.evidence.length>0&&<p className="text-xs text-emerald-700 mt-2">{form.evidence.length} evidence image(s) ready.</p>}<button disabled={busy} onClick={create} className="mt-4 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">Create Ticket</button></section>
    <section className="bg-white border rounded-3xl p-6"><h2 className="font-bold text-xl">Refund / Replacement</h2><p className="text-sm text-slate-500 mt-1">Requests are always tied to a specific delivered item.</p>{selectedRefundItem?<div className="mt-4 border rounded-2xl p-3"><div className="flex justify-between gap-3"><div><b>{selectedRefundItem.name}</b><p className="text-xs text-slate-500">{selectedRefundItem.quantity} × {money(selectedRefundItem.price)}</p></div><div className="text-right text-xs">{selectedRefundItem.policy?.refundEligible?<span className="text-emerald-700">✓ Refund</span>:<span className="text-red-600">✕ Refund</span>}<br/>{selectedRefundItem.policy?.replacementEligible?<span className="text-emerald-700">✓ Replacement</span>:<span className="text-red-600">✕ Replacement</span>}</div></div><button type="button" onClick={()=>{setRefund((r:any)=>({...r,itemId:"",amount:""}));setAgreeTerms(false);}} className="mt-2 border rounded-xl px-3 py-2 text-sm font-bold">Change item</button></div>:options?.items?.length?<div className="mt-4 space-y-2">{options.items.map((i:any)=><div key={i.key} className="border rounded-2xl p-3"><div className="flex justify-between gap-3"><div><b>{i.name}</b><p className="text-xs text-slate-500">{i.quantity} × {money(i.price)}</p></div><div className="text-right text-xs">{i.policy?.refundEligible?<span className="text-emerald-700">✓ Refund</span>:<span className="text-red-600">✕ Refund</span>}<br/>{i.policy?.replacementEligible?<span className="text-emerald-700">✓ Replacement</span>:<span className="text-red-600">✕ Replacement</span>}</div></div><button type="button" onClick={()=>setRefund((r:any)=>({...r,itemId:i.key,amount:String(Number(i.refundableAmount??Number(i.price||0)*Number(i.quantity||0)))}))} className="mt-2 border rounded-xl px-3 py-2 text-sm font-bold">Select item</button></div>)}</div>:<div className="mt-5 p-5 rounded-2xl bg-slate-50 text-sm text-slate-500">Select an order above to see eligible items.</div>}{refund.itemId&&selectedRefundItem&&<div className="mt-4 border-t pt-4"><textarea value={refund.reason} onChange={e=>setRefund({...refund,reason:e.target.value})} placeholder="Reason" className="w-full border rounded-xl p-3 min-h-20"/><label className="block mt-2 text-sm font-semibold">Refund amount<input type="number" min="0.01" step="0.01" max={Number(selectedRefundItem.refundableAmount??0)} value={refund.amount} onChange={e=>setRefund({...refund,amount:e.target.value})} placeholder={`Amount (max ${money(Number(selectedRefundItem.refundableAmount??0))})`} className="mt-2 w-full border rounded-xl p-3"/><span className="text-xs text-slate-500 mt-1 block">You can request a full or partial refund for this item.</span></label><select value={refund.method} onChange={e=>setRefund({...refund,method:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option value="ORIGINAL">Original Payment Method</option><option value="BANK">Bank Account</option><option value="UPI">UPI</option></select>{refund.method==="BANK"&&<div className="grid md:grid-cols-2 gap-2 mt-2"><input value={refund.accountHolderName} onChange={e=>setRefund({...refund,accountHolderName:e.target.value})} placeholder="Account Holder Name" className="border rounded-xl p-3"/><select value={refund.bankName} onChange={e=>setRefund({...refund,bankName:e.target.value})} className="border rounded-xl p-3"><option value="">Select bank</option>{["State Bank of India","HDFC Bank","ICICI Bank","Axis Bank","Punjab National Bank","Bank of Baroda","Canara Bank","Union Bank of India","Bank of India","Indian Bank","Kotak Mahindra Bank","IndusInd Bank","IDBI Bank","Yes Bank","Federal Bank","AU Small Finance Bank","Bandhan Bank","IDFC FIRST Bank","South Indian Bank","RBL Bank","UCO Bank","Central Bank of India","Indian Overseas Bank","Bank of Maharashtra","Other Bank"].map(x=><option key={x}>{x}</option>)}</select>{refund.bankName==="Other Bank"&&<input value={refund.otherBankName||""} onChange={e=>setRefund({...refund,otherBankName:e.target.value})} placeholder="Other bank name" className="border rounded-xl p-3"/>}<input value={refund.accountNumber} onChange={e=>setRefund({...refund,accountNumber:e.target.value})} placeholder="Account Number" className="border rounded-xl p-3"/><input value={refund.confirmAccountNumber} onChange={e=>setRefund({...refund,confirmAccountNumber:e.target.value})} placeholder="Confirm Account Number" className="border rounded-xl p-3"/><input value={refund.ifsc} onChange={e=>setRefund({...refund,ifsc:e.target.value.toUpperCase()})} placeholder="IFSC" className="border rounded-xl p-3"/></div>}{refund.method==="UPI"&&<div className="grid md:grid-cols-2 gap-2 mt-2"><input value={refund.upiId} onChange={e=>setRefund({...refund,upiId:e.target.value})} placeholder="UPI ID" className="border rounded-xl p-3"/><input value={refund.confirmUpiId} onChange={e=>setRefund({...refund,confirmUpiId:e.target.value})} placeholder="Confirm UPI ID" className="border rounded-xl p-3"/></div>}<div className="mt-3 rounded-xl border bg-slate-50 p-3 text-sm"><b>Applicable terms</b><p className="text-xs text-slate-600 mt-1">{(selectedRefundItem.policy?.refundTerms || selectedRefundItem.policy?.replacementTerms || "Standard FreshBasket policy applies. Eligibility is subject to the configured window and order status.")}</p></div><label className="flex items-center gap-2 mt-3 text-sm font-semibold"><input type="checkbox" checked={agreeTerms} onChange={e=>setAgreeTerms(e.target.checked)}/> I have read and agree to the applicable refund/replacement terms.</label><label className="block mt-2 text-sm font-semibold">Evidence<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)fileToData(f,x=>setRefund((v:any)=>({...v,evidence:[...v.evidence,x].slice(0,3)})))}} className="mt-2 w-full"/><div className="mt-2"><ImagePickerButtons compact onFile={(f)=>fileToData(f,x=>setRefund((v:any)=>({...v,evidence:[...v.evidence,x].slice(0,3)})))}/></div></label><div className="flex flex-wrap gap-2 mt-3">{(typeof selectedRefundItem.canRequestRefund==="boolean"?selectedRefundItem.canRequestRefund:selectedRefundItem.policy?.refundEligible) && <button disabled={busy} onClick={()=>request("refund")} className="bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold">Request Refund</button>}{(typeof selectedRefundItem.canRequestReplacement==="boolean"?selectedRefundItem.canRequestReplacement:selectedRefundItem.policy?.replacementEligible) && <button disabled={busy} onClick={()=>request("replacement")} className="bg-blue-600 text-white rounded-xl px-4 py-2.5 font-bold">Request Replacement</button>}</div></div>}</section></div>
    <section className="bg-white border rounded-3xl p-6"><h2 className="font-bold text-xl">Refund & Replacement Status</h2><div className="grid md:grid-cols-2 gap-3 mt-4"><div><h3 className="font-semibold">Refunds</h3>{(requestHistory.refunds||[]).map((r:any)=><div key={r._id} className="border rounded-xl p-3 mt-2 text-sm">Order #{String(r.order?._id||r.order||"").slice(-8)} · {r.status} · {money(r.approvedAmount??r.requestedAmount??r.amount)}</div>)}</div><div><h3 className="font-semibold">Replacements</h3>{(requestHistory.replacements||[]).map((r:any)=><div key={r._id} className="border rounded-xl p-3 mt-2 text-sm">Order #{String(r.order?._id||r.order||"").slice(-8)} · {r.status}</div>)}</div></div></section>
    <section className="bg-white border rounded-3xl overflow-hidden"><div className="p-6 border-b"><h2 className="font-bold text-xl">My Support Tickets</h2></div>{loading?<div className="p-10 text-center text-slate-500">Loading...</div>:tickets.length?<div className="divide-y">{tickets.map(t=><button key={t._id} onClick={()=>openTicket(t._id)} className="w-full text-left p-5 hover:bg-slate-50"><div className="flex flex-wrap items-center gap-2"><b>{t.ticketId}</b><span className="text-xs rounded-full px-2 py-1 bg-slate-100">{t.status}</span><span className="text-xs rounded-full px-2 py-1 bg-amber-50 text-amber-700">{t.priority}</span></div><p className="text-sm text-slate-600 mt-2">{t.category} · {new Date(t.createdAt).toLocaleString("en-IN")}</p></button>)}</div>:<div className="p-10 text-center text-slate-500">No support tickets yet.</div>}</section>
    {selected&&<div className="fixed inset-0 z-[90] bg-black/40 p-4 grid place-items-center"><div className="w-full max-w-2xl bg-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto"><div className="flex justify-between"><div><h3 className="text-xl font-bold">{selected.ticketId}</h3><p className="text-sm text-slate-500">{selected.category} · {selected.status}</p></div><button onClick={()=>setSelected(null)}><X/></button></div><div className="mt-4 space-y-3">{(selected.messages||[]).map((m:any,i:number)=><div key={i} className={`p-3 rounded-2xl ${m.senderRole==="customer"?'bg-emerald-50':'bg-slate-100'}`}><p className="text-sm">{m.message}</p><p className="text-[11px] text-slate-400 mt-1">{new Date(m.createdAt).toLocaleString("en-IN")}</p></div>)}</div>{selected.status==="RESOLVED"&&<button onClick={async()=>{try{const r=await axios.patch(API+"/customer/support/tickets/"+selected._id+"/close",{}, {headers});setSelected(r.data.data);load();}catch(e:any){alert(e?.response?.data?.message||"Unable to close ticket")}}} className="mt-4 border rounded-xl px-4 py-2 font-bold">Close resolved ticket</button>}<div className="flex gap-2 mt-4"><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Reply to Customer Care" className="flex-1 border rounded-xl p-3"/><button disabled={busy} onClick={reply} className="bg-emerald-600 text-white rounded-xl px-4 font-bold">Send</button></div></div></div>}
  </main></Layout>;
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
  const nav = useNavigate();
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
              <button key={n._id} onClick={async () => { await markRead(String(n._id)); const role=store.user?.role; if(String(n.relatedEntity||"")==="REPLACEMENT_REQUEST"){if(role==="customer_care") nav(`/customer-care/replacement-requests?request=${encodeURIComponent(String(n.relatedEntityId||""))}`); else if(role==="admin") nav("/admin?tab=replacement-requests"); else if(role==="delivery") nav("/delivery"); else if(role==="customer") nav("/support"); else if(role==="finance_manager" || role==="finance_executive") nav("/finance");} else if(String(n.type||"").includes("support") || String(n.relatedEntity||"")==="SUPPORT_TICKET"){if(role==="customer") nav("/support"); else if(role==="customer_care") nav("/customer-care"); else if(role==="admin") nav("/admin?tab=customer-support"); else if(role==="finance_manager" || role==="finance_executive") nav("/finance");} else if(n.order || n.relatedEntityId){if(role==="customer") nav(`/orders/${String(n.order || n.relatedEntityId)}`); else if(role==="admin") nav("/admin?tab=orders"); else if(role==="delivery") nav("/delivery"); else if(role==="customer_care") nav("/customer-care"); else if(role==="finance_manager" || role==="finance_executive") nav("/finance");} }} className={`w-full text-left p-5 border-b last:border-b-0 hover:bg-slate-50 ${n.read ? "" : "bg-emerald-50/50"}`}>
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


function DeliveryChat({
  store,
  order,
  compact = false,
}: {
  store: ReturnType<typeof useStore>;
  order: any;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [chatPhoto, setChatPhoto] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const orderId = String(order?._id || "");
  const role = String(store.user?.role || "").trim().toLowerCase();
  // Use the existing authenticated user object as the single viewer identity.
  // Some API responses use `_id` while login state uses `id`, so normalize only
  // for comparison; never change the persisted senderId.
  const currentUserId = String(store.user?.id || store.user?._id || "");
  const messageSenderId = (message: any) => String(
    message?.senderId?._id ?? message?.senderId?.id ?? message?.senderId ?? ""
  );
  const isOwnMessage = (message: any) => {
    const senderId = messageSenderId(message);
    return Boolean(currentUserId && senderId && senderId === currentUserId);
  };
  const readOnly = ["Delivered", "Cancelled"].includes(String(order?.status || ""));
  const active = String(order?.status || "") === "Out for Delivery";
  const eligible = Boolean(orderId && order?.deliveryPartner && (active || readOnly) && ["customer","delivery"].includes(role));

  const loadChat = async () => {
    if (!eligible) return;
    setLoading(true); setError("");
    try {
      const r = await axios.get(API + `/orders/${encodeURIComponent(orderId)}/delivery-chat`, {headers:adminHeaders()});
      const d = r.data?.data || {};
      setMessages(Array.isArray(d.messages) ? d.messages : []);
      setUnreadCount(Number(d.unreadCount || 0));
      await axios.patch(API + `/orders/${encodeURIComponent(orderId)}/delivery-chat/read`, {}, {headers:adminHeaders()}).catch(()=>{});
      setUnreadCount(0);
    } catch(e:any) {
      setError(e?.response?.data?.message || "Unable to load delivery chat. Please try again.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open) void loadChat(); }, [open, orderId, order?.status, role]);
  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  }, [messages.length, open]);
  useDeliveryRealtime((event:any) => {
    if (!open || event?.eventType !== "delivery-chat" || String(event?.orderId || "") !== orderId || !event?.message) return;
    const incoming = event.message;
    setMessages((current:any[]) => current.some(x => String(x?._id||"") === String(incoming?._id||"")) ? current : [...current, incoming]);
    if (String(incoming?.receiverId || "") === String(store.user?.id || "")) {
      setUnreadCount(v => v + 1);
      void axios.patch(API + `/orders/${encodeURIComponent(orderId)}/delivery-chat/read`, {}, {headers:adminHeaders()}).catch(()=>{});
    }
  }, orderId, eligible);

  if (!eligible) return null;

  const quickCustomer = [
    "Where are you now?",
    "How much time will it take?",
    "Have you picked up my order?",
    "Are you near my location?",
    "When will you reach?",
    "I need help with delivery.",
  ];
  const quickDelivery = [
    "I have picked up your order.",
    "I'm on the way.",
    "I'm near your location.",
    "I'll share my ETA shortly.",
    "There is some traffic/delay.",
    "I'm at the store.",
    "Please contact me regarding the delivery.",
  ];
  const quicks = role === "customer" ? quickCustomer : quickDelivery;
  const send = async (value?: string) => {
    const message = String(value ?? text).trim();
    const attachment = String(chatPhoto || "");
    if ((!message && !attachment) || sending || readOnly) return;
    setSending(true); setError("");
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    try {
      const payload:any = { message, attachment, messageType: attachment ? "PHOTO" : value ? "QUICK_REPLY" : "TEXT", clientMessageId };
      const r = await axios.post(API + `/orders/${encodeURIComponent(orderId)}/delivery-chat/messages`, payload, {headers:adminHeaders()});
      const saved = r.data?.data;
      if (!saved) throw new Error("Message was not persisted.");
      setMessages((current:any[]) => current.some(x => String(x?._id||"") === String(saved?._id||"")) ? current : [...current, saved]);
      setText("");
      setChatPhoto("");
    } catch(e:any) {
      setError(e?.response?.data?.message || "Message could not be sent.");
    } finally { setSending(false); }
  };

  const readChatPhoto = (file: File) => {
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return setError("Only JPEG, PNG or WebP images are allowed in delivery chat.");
    if (file.size > 700 * 1024) return setError("Delivery chat photo must be 700 KB or smaller.");
    const reader = new FileReader();
    reader.onload = () => { setChatPhoto(String(reader.result || "")); setError(""); };
    reader.onerror = () => setError("Unable to read the selected photo.");
    reader.readAsDataURL(file);
  };

  const chatModal = open ? (
    <div className="fixed inset-0 z-[2147483000] bg-black/40 p-3 sm:p-5 grid place-items-center" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
      <div className="w-full max-w-2xl h-[min(760px,92vh)] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
          <div className="min-w-0"><p className="text-xs text-emerald-600 font-black uppercase tracking-wider">Delivery Chat</p><h3 className="font-black truncate">{role === "customer" ? (order?.deliveryPartner?.name || "Delivery Partner") : (order?.user?.name || "Customer")}</h3><p className="text-xs text-slate-500 mt-1">Order #{orderId.slice(-8).toUpperCase()} · {order?.status}</p></div>
          <div className="flex items-center gap-2"><span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${readOnly?"bg-slate-100 text-slate-600":"bg-emerald-50 text-emerald-700"}`}>{readOnly?"CHAT CLOSED":"ACTIVE DELIVERY"}</span><button type="button" onClick={()=>setOpen(false)} className="p-2 rounded-xl hover:bg-slate-100"><X size={19}/></button></div>
        </div>
        <div className="px-5 py-3 border-b bg-slate-50 text-xs text-slate-600">{readOnly ? "Delivery chat closed. Previous messages remain available as read-only." : "Use this chat only for active delivery coordination. Customer Support remains available for refunds, replacements and other issues."}</div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-white">
          {loading ? <div className="h-full grid place-items-center text-sm text-slate-500">Loading delivery chat…</div> : error && !messages.length ? <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm font-semibold">{error}<button onClick={loadChat} className="block mt-2 underline">Try again</button></div> : messages.length ? messages.map((m:any)=><div key={String(m._id)} className={`flex ${isOwnMessage(m)?"justify-end":"justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${isOwnMessage(m)?"bg-emerald-600 text-white rounded-br-md":"bg-slate-100 text-slate-900 rounded-bl-md"}`}>{m.attachment ? <img src={m.attachment} alt="Delivery-related photo" className="max-h-64 max-w-full rounded-xl border border-white/30 object-contain mb-2"/> : null}{m.message ? <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p> : null}<p className={`text-[10px] mt-1 ${isOwnMessage(m)?"text-emerald-100":"text-slate-400"}`}>{m.createdAt?new Date(m.createdAt).toLocaleString("en-IN"):""}</p></div></div>) : <div className="h-full grid place-items-center text-center text-sm text-slate-500"><MessageCircle size={34} className="mx-auto mb-2 text-slate-300"/><p>No delivery messages yet.</p></div>}
          <div ref={bottomRef}/>
        </div>
        {error && messages.length>0 && <div className="px-5 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{error}</div>}
        {!readOnly && <div className="border-t p-3 sm:p-4 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">{quicks.map(q=><button key={q} type="button" disabled={sending} onClick={()=>void send(q)} className="shrink-0 border rounded-full px-3 py-2 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50">{q}</button>)}</div>
          {chatPhoto && <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-2"><img src={chatPhoto} alt="Selected delivery photo" className="w-16 h-16 rounded-xl object-cover border"/><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-700">Delivery photo ready to send</p><p className="text-[11px] text-slate-500">Only authorized chat participants can view it.</p></div><button type="button" onClick={()=>setChatPhoto("")} className="px-2 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50">Remove</button></div>}<div className="flex items-end gap-2"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}} maxLength={2000} rows={2} placeholder={chatPhoto?"Add an optional caption…":"Type a message…"} className="flex-1 resize-none border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-100"/><ImagePickerButtons compact disabled={sending} onFile={readChatPhoto}/><button type="button" disabled={sending||(!text.trim()&&!chatPhoto)} onClick={()=>void send()} className="shrink-0 h-11 px-4 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50">{sending?"Sending…":"Send"}</button></div>
        </div>}
      </div>
    </div>
  ) : null;

  return <>
    <button type="button" onClick={()=>setOpen(true)} className={compact ? "px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 font-bold inline-flex items-center gap-2" : "px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold inline-flex items-center gap-2"}>
      <MessageCircle size={17}/> {role === "customer" ? "Chat with Delivery Partner" : "Chat with Customer"}{unreadCount>0 && <span className="min-w-5 h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] grid place-items-center">{unreadCount>99?"99+":unreadCount}</span>}
    </button>
    {chatModal && typeof document !== "undefined" ? createPortal(chatModal, document.body) : null}
  </>;
}

function DeliveryLocationShare({
  store,
  order,
  compact = false,
}: {
  store: ReturnType<typeof useStore>;
  order: any;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const role = String(store.user?.role || "").trim().toLowerCase();
  const orderId = String(order?._id || "");
  const eligible = Boolean(orderId && order?.deliveryPartner && role === "customer" || orderId && order?.deliveryPartner && role === "delivery");

  const load = async () => {
    if (!eligible) return;
    try {
      const r = await axios.get(API + `/orders/${encodeURIComponent(orderId)}/delivery-location-share`, { headers: adminHeaders() });
      setStatus(r.data?.data || null);
    } catch (e:any) {
      setError(e?.response?.data?.message || "Unable to load location sharing status.");
    }
  };

  useEffect(() => {
    if (!eligible) return;
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [eligible, orderId, role]);

  const setShare = async (enabled: boolean) => {
    if (!eligible || loading) return;
    setLoading(true); setError("");
    try {
      let body:any = { enabled, durationMinutes: 30 };
      if (enabled && role === "customer") {
        if (!navigator.geolocation) throw new Error("Location is not supported in this browser.");
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        });
        body.latitude = Number(position.coords.latitude);
        body.longitude = Number(position.coords.longitude);
        body.accuracy = Number.isFinite(Number(position.coords.accuracy)) ? Number(position.coords.accuracy) : null;
      }
      const r = await axios.patch(API + `/orders/${encodeURIComponent(orderId)}/delivery-location-share`, body, { headers: adminHeaders() });
      const own = r.data?.data || null;
      setStatus((current:any) => ({ ...(current || {}), own: own?.enabled ? own : null }));
      await load();
    } catch (e:any) {
      const geoCode = e?.code;
      setError(e?.response?.data?.message || (geoCode === 1 ? "Location permission was denied. Allow location access to share your current location." : e?.message || "Unable to update location sharing."));
    } finally { setLoading(false); }
  };

  if (!eligible || String(order?.status || "") !== "Out for Delivery") return null;
  const own = status?.own;
  const other = status?.other;
  const sharedUntil = own?.expiresAt ? new Date(own.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
  const label = role === "customer" ? "Share Delivery Location" : "Share Current Location";
  const activeLabel = role === "customer" ? "Delivery location shared" : "Current location shared";

  return (
    <div className={compact ? "inline-flex flex-col gap-1" : "mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void setShare(Boolean(!own))}
          className={compact
            ? "px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 font-bold inline-flex items-center gap-2 disabled:opacity-50"
            : `px-4 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 disabled:opacity-50 ${own ? "bg-white border border-emerald-300 text-emerald-700" : "bg-emerald-600 text-white"}`}
        >
          <MapPin size={16}/>{loading ? "Updating…" : own ? "Stop Sharing" : label}
        </button>
        {own && <span className="text-xs font-semibold text-emerald-700">{activeLabel}{sharedUntil ? ` · until ${sharedUntil}` : ""}</span>}
        {other && <span className="text-xs font-semibold text-slate-600">{role === "customer" ? "Partner is sharing current location" : `Customer shared location · ${Number(other.latitude).toFixed(5)}, ${Number(other.longitude).toFixed(5)}`}</span>}
      </div>
      {!compact && <p className="text-xs text-slate-500 mt-2">Location sharing is order-scoped and automatically expires after 30 minutes. Only the authorized customer and assigned Delivery Partner can access it.</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

function AIDeliveryETAAssistant({ store, orderId, deliveryTracking }: { store: ReturnType<typeof useStore>; orderId?: string; deliveryTracking?: any }) {
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState("");
  if(store.user?.role!=="customer"||!orderId)return null;
  const ask=async()=>{
    const text=query.trim()||"What is my delivery ETA?";
    if(loading)return;
    setLoading(true);setError("");
    try{
      const r=await axios.post(API+"/customer/ai-delivery-eta",{query:text,orderId},{headers:adminHeaders()});
      setResult(r.data?.data||null);
    }catch(e:any){setError(e?.response?.data?.message||"Unable to get delivery ETA.");setResult(null)}
    finally{setLoading(false)}
  };
  const liveEta=deliveryTracking?.etaMinutes!=null?Number(deliveryTracking.etaMinutes):null;
  const liveDistance=deliveryTracking?.distanceRemainingKm!=null?Number(deliveryTracking.distanceRemainingKm):null;
  return <section className="bg-white border border-emerald-100 rounded-3xl p-5 md:p-6 shadow-soft">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2"><Sparkles size={18} className="text-emerald-600"/><p className="text-emerald-600 text-xs font-black tracking-wide">AI DELIVERY ETA ASSISTANT</p></div>
        <h2 className="text-xl md:text-2xl font-bold mt-1">When will my order arrive?</h2>
        <p className="text-sm text-slate-500 mt-1">Ask about this order. ETA uses the latest authorized delivery location and live road-routing data only.</p>
      </div>
      <div className="w-full lg:max-w-2xl flex gap-2">
        <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void ask();}} placeholder="e.g. Where is my delivery?" className="flex-1 min-w-0 border rounded-xl px-4 py-3 outline-none focus:ring-2 ring-emerald-100"/>
        <button onClick={()=>void ask()} disabled={loading} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{loading?"Checking...":"Ask"}</button>
      </div>
    </div>
    {(liveEta!=null||liveDistance!=null)&&<div className="grid grid-cols-2 gap-3 mt-5"><div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4"><p className="text-xs text-slate-500">Current road ETA</p><b className="block mt-1 text-lg">{liveEta!=null?`~${liveEta} min`:"Unavailable"}</b></div><div className="rounded-2xl bg-slate-50 border p-4"><p className="text-xs text-slate-500">Distance remaining</p><b className="block mt-1 text-lg">{liveDistance!=null?`${liveDistance.toFixed(1)} km`:"Unavailable"}</b></div></div>}
    {error&&<p className="mt-4 text-sm text-red-700 font-semibold">{error}</p>}
    {result&&<div className="mt-5 rounded-2xl border bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-800">{result.message}</p>{result.confidence?.label&&<span className={`text-xs font-black px-3 py-1.5 rounded-full ${result.confidence.level==="HIGH"?"bg-emerald-100 text-emerald-700":result.confidence.level==="DELAYED"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-800"}`}>{result.confidence.label}</span>}</div>
      {result.available&&<div className="grid sm:grid-cols-3 gap-3 mt-4"><div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">ETA</p><b className="block mt-1">~{Number(result.etaMinutes)} min</b></div><div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">Distance</p><b className="block mt-1">{Number(result.distanceRemainingKm).toFixed(1)} km</b></div><div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">Route source</p><b className="block mt-1">{result.routingSource||"Live routing"}</b></div></div>}
      {result.location?.updatedAt&&<p className="text-xs text-slate-500 mt-3">Delivery location last updated {new Date(result.location.updatedAt).toLocaleString("en-IN")}.</p>}
      {result.handoffRequired&&<Link to={`/support?order=${encodeURIComponent(String(orderId))}`} className="inline-flex mt-4 border rounded-xl px-4 py-2.5 font-bold text-sm">Open Customer Support</Link>}
    </div>}
  </section>;
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
  const [supportOptions, setSupportOptions] = useState<any | null>(null);
  const [requestHistory, setRequestHistory] = useState<any>({ refunds: [], replacements: [] });
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [deliveryFeedback, setDeliveryFeedback] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [deliveryTracking, setDeliveryTracking] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const loadTracking = async () => {
    if (!id || store.user?.role !== "customer") return;
    setTrackingLoading(true);
    try { const r=await axios.get(API+`/orders/${id}/tracking`,{headers:adminHeaders()}); setDeliveryTracking(r.data.data||null); }
    catch {} finally { setTrackingLoading(false); }
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const r = await axios.get(API + `/orders/${id}`, {
        headers: adminHeaders(),
      });
      const loadedOrder = r.data.data || null;
      setOrder(loadedOrder);
      if (loadedOrder?._id && store.user?.role === "customer") {
        try {
          const [sr, hr] = await Promise.all([
            axios.get(API + `/customer/orders/${loadedOrder._id}/support-options`, { headers: adminHeaders() }),
            axios.get(API + "/customer/support/requests", { headers: adminHeaders() }),
          ]);
          setSupportOptions(sr.data.data || null);
          setRatingSubmitted(Boolean(sr.data.data?.deliveryRating));
          setRequestHistory(hr.data.data || { refunds: [], replacements: [] });
        } catch {}
      }
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

  useEffect(() => {
    if (store.user?.role !== "customer") return;
    void loadTracking();
    const timer = window.setInterval(loadTracking, 10000);
    return () => window.clearInterval(timer);
  }, [id, store.user?.role]);

  useDeliveryRealtime((event:any) => {
    if (!deliveryTracking || String(event?.partnerId || "") !== String(deliveryTracking?.deliveryPartner?.id || "")) return;
    setDeliveryTracking((current:any) => current ? {
      ...current,
      partnerLocation: {
        latitude: Number(event.latitude),
        longitude: Number(event.longitude),
        accuracy: event.accuracy ?? null,
        updatedAt: event.updatedAt || new Date().toISOString(),
        onlineStatus: event.onlineStatus,
        availabilityStatus: event.availabilityStatus
      },
      updatedAt: event.updatedAt || new Date().toISOString()
    } : current);
    void loadTracking();
  }, id, store.user?.role === "customer");

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

  const itemRequestKey = (item: any, index: number) =>
    String(item?._id || item?.product?._id || item?.product || index);

  const findItemRequest = (type: "refund" | "replacement", item: any, index: number) => {
    const key = itemRequestKey(item, index);
    const list = type === "refund" ? requestHistory?.refunds || [] : requestHistory?.replacements || [];
    return list.find((request: any) => {
      const requestKey = String(
        request?.orderItemId?._id ||
        request?.orderItemId ||
        request?.itemId?._id ||
        request?.itemId ||
        request?.orderItem?._id ||
        ""
      );
      const requestOrder = String(request?.order?._id || request?.order || "");
      return requestKey === key && (!requestOrder || requestOrder === String(order?._id));
    }) || null;
  };

  const requestStatusLabel = (request: any) => {
    if (!request?.status) return "";
    const raw = String(request.status).replace(/_/g, " ").toLowerCase();
    return raw.replace(/\b\w/g, (x) => x.toUpperCase());
  };

  const requestStageIndex = (type: "refund" | "replacement", status: string) => {
    const value = String(status || "").toUpperCase();
    if (type === "refund") {
      if (["COMPLETED"].includes(value)) return 5;
      if (["PROCESSING"].includes(value)) return 4;
      if (["APPROVED"].includes(value)) return 3;
      if (["FINANCE_REVIEW", "APPROVAL_PENDING"].includes(value)) return 2;
      if (["VERIFIED_BY_CUSTOMER_CARE", "UNDER_REVIEW"].includes(value)) return 1;
      if (["REJECTED", "FAILED"].includes(value)) return -1;
      return 0;
    }
    if (["CLOSED", "COMPLETED", "DELIVERED", "REPLACED"].includes(value)) return 4;
    if (["PROCESSING", "PICKUP_SCHEDULED", "PICKED_UP", "SHIPPED", "REPLACEMENT_SHIPPED", "STORE_PREPARATION", "REPLACEMENT_PROCESSING", "DELIVERY", "DELIVERY_ASSIGNED", "OUT_FOR_DELIVERY"].includes(value)) return 3;
    if (["APPROVED", "REPLACEMENT_APPROVED", "PENDING_STORE_ADMIN", "PENDING_MAIN_ADMIN"].includes(value)) return 2;
    if (["UNDER_REVIEW", "VERIFIED_BY_CUSTOMER_CARE", "FINANCE_REVIEW", "APPROVAL_PENDING"].includes(value)) return 1;
    if (["REJECTED", "FAILED", "CANCELLED"].includes(value)) return -1;
    return 0;
  };

  const requestTime = (request: any, stage: number, type: "refund" | "replacement") => {
    const history = Array.isArray(request?.statusHistory) ? request.statusHistory : [];
    const statusCandidates = type === "refund"
      ? [
          [0, ["REQUESTED"]],
          [1, ["VERIFIED_BY_CUSTOMER_CARE", "UNDER_REVIEW"]],
          [2, ["FINANCE_REVIEW", "APPROVAL_PENDING"]],
          [3, ["APPROVED"]],
          [4, ["PROCESSING"]],
          [5, ["COMPLETED"]],
        ]
      : [
          [0, ["REQUESTED"]],
          [1, ["VERIFIED_BY_CUSTOMER_CARE", "UNDER_REVIEW", "VERIFIED"]],
          [2, ["APPROVED", "REPLACEMENT_APPROVED", "PENDING_STORE_ADMIN", "PENDING_MAIN_ADMIN"]],
          [3, ["PROCESSING", "PICKUP_SCHEDULED", "PICKED_UP", "SHIPPED", "REPLACEMENT_SHIPPED", "STORE_PREPARATION", "REPLACEMENT_PROCESSING", "DELIVERY", "DELIVERY_ASSIGNED", "OUT_FOR_DELIVERY"]],
          [4, ["CLOSED", "COMPLETED", "DELIVERED", "REPLACED"]],
        ];
    const match = statusCandidates.find(([index, statuses]: any) => index === stage);
    if (match) {
      const entry = history.find((h: any) => (match[1] as string[]).includes(String(h?.status || "").toUpperCase()));
      const at = entry?.timestamp || entry?.at;
      if (at) return new Date(at).toLocaleString();
    }
    const direct = stage === 0 ? request?.createdAt
      : stage === 1 ? request?.customerCareVerifiedAt
      : stage === 2 ? request?.approvedAt || request?.financeReviewedAt
      : stage === 3 ? request?.approvedAt || request?.processedAt
      : request?.processedAt || request?.completedAt;
    return direct ? new Date(direct).toLocaleString() : "";
  };

  const requestTimeline = (type: "refund" | "replacement", request: any) => {
    const refundSteps = [
      ["Request submitted", "Your item-level refund request was submitted."],
      ["Customer Care verification", "Customer Care is checking the issue and evidence."],
      ["Finance review", "Finance is reviewing the eligible refund amount."],
      ["Refund approved", "The refund has been approved."],
      ["Refund processing", "The approved refund is being processed."],
      ["Refund completed", "The refund process has been completed."],
    ];
    const replacementSteps = [
      ["Request submitted", "Your item-level replacement request was submitted."],
      ["Customer Care verification", "Customer Care is checking the issue and evidence."],
      ["Replacement approved", "The replacement request has been approved."],
      ["Replacement processing", "The replacement is being arranged/processed."],
      ["Replacement completed", "The replacement process has been completed."],
    ];
    const stepsForType = type === "refund" ? refundSteps : replacementSteps;
    const current = requestStageIndex(type, request?.status);
    const rejected = current === -1;
    return {
      steps: stepsForType.map((step: any, index: number) => ({
        title: step[0],
        description: step[1],
        completed: !rejected && index <= current,
        current: !rejected && index === current,
        time: requestTime(request, index, type),
      })),
      rejected,
    };
  };

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
        <div className="mb-4"><WebsiteBackButton fallback="/orders" label="Back to orders" /></div>
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
                    <div className="text-right">
                      <b>{money(Number(item.price || 0) * Number(item.quantity || 0))}</b>
                      {(() => {
                        const key = itemRequestKey(item, index);
                        const opt = (supportOptions?.items || []).find((x:any) => String(x.key) === key);
                        const refundRequest = findItemRequest("refund", item, index);
                        const replacementRequest = findItemRequest("replacement", item, index);
                        const refundTrack = refundRequest ? requestTimeline("refund", refundRequest) : null;
                        const replacementTrack = replacementRequest ? requestTimeline("replacement", replacementRequest) : null;
                        return (
                          <div className="mt-2 space-y-3 text-left min-w-[280px] max-w-md">
                            {opt && (
                              <div className="flex flex-wrap justify-end gap-2 text-[11px]">
                                {opt.canRequestRefund && !refundRequest && <Link to={`/support?order=${order._id}&item=${encodeURIComponent(key)}`} className="border border-emerald-200 text-emerald-700 rounded-lg px-2 py-1 font-bold">Request Refund</Link>}
                                {opt.canRequestReplacement && !replacementRequest && <Link to={`/support?order=${order._id}&item=${encodeURIComponent(key)}`} className="border border-blue-200 text-blue-700 rounded-lg px-2 py-1 font-bold">Request Replacement</Link>}
                                {opt.expiryAt && opt.within24 && order.status === "Delivered" && (opt.canRequestRefund || opt.canRequestReplacement) && <span className="w-full text-right text-[11px] text-slate-500">Eligible until {new Date(opt.expiryAt).toLocaleString("en-IN")}</span>}
                                {(!opt.canRequestRefund && !opt.canRequestReplacement) && <span className="text-red-600">{order.status !== "Delivered" ? "Available after delivery" : opt.expiryAt && !opt.within24 ? "Refund/Replacement window expired" : "No refund or replacement available"}</span>}
                              </div>
                            )}
                            {refundRequest && refundTrack && (
                              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div><p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Refund tracking</p><p className="text-sm font-bold mt-0.5">{requestStatusLabel(refundRequest)}</p></div>
                                  {refundTrack.rejected ? <span className="text-xs font-bold text-red-600">Rejected</span> : <span className="text-xs font-bold text-emerald-700">{refundTrack.steps.filter((x:any)=>x.completed).length}/{refundTrack.steps.length}</span>}
                                </div>
                                {refundTrack.rejected ? (
                                  <div className="mt-2 rounded-xl bg-red-50 border border-red-100 p-2 text-xs text-red-700">{refundRequest.rejectionReason || "This refund request was rejected."}</div>
                                ) : (
                                  <div className="mt-3 space-y-2">
                                    {refundTrack.steps.map((step:any, stepIndex:number) => (
                                      <div key={step.title} className="flex gap-2">
                                        <div className={`mt-0.5 w-5 h-5 rounded-full grid place-items-center shrink-0 ${step.completed ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-300"}`}>{step.completed ? <CheckCircle2 size={13}/> : <Clock3 size={12}/>}</div>
                                        <div className="min-w-0"><p className={`text-xs font-bold ${step.completed ? "text-slate-800" : "text-slate-400"}`}>{step.title}{step.current ? " · Current" : ""}</p>{step.completed && <p className="text-[11px] text-slate-500">{step.time || step.description}</p>}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {replacementRequest && replacementTrack && (
                              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div><p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Replacement tracking</p><p className="text-sm font-bold mt-0.5">{requestStatusLabel(replacementRequest)}</p></div>
                                  {replacementTrack.rejected ? <span className="text-xs font-bold text-red-600">Rejected</span> : <span className="text-xs font-bold text-blue-700">{replacementTrack.steps.filter((x:any)=>x.completed).length}/{replacementTrack.steps.length}</span>}
                                </div>
                                {replacementTrack.rejected ? (
                                  <div className="mt-2 rounded-xl bg-red-50 border border-red-100 p-2 text-xs text-red-700">{replacementRequest.rejectionReason || "This replacement request was rejected."}</div>
                                ) : (
                                  <div className="mt-3 space-y-2">
                                    {replacementTrack.steps.map((step:any) => (
                                      <div key={step.title} className="flex gap-2">
                                        <div className={`mt-0.5 w-5 h-5 rounded-full grid place-items-center shrink-0 ${step.completed ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-300"}`}>{step.completed ? <CheckCircle2 size={13}/> : <Clock3 size={12}/>}</div>
                                        <div className="min-w-0"><p className={`text-xs font-bold ${step.completed ? "text-slate-800" : "text-slate-400"}`}>{step.title}{step.current ? " · Current" : ""}</p>{step.completed && <p className="text-[11px] text-slate-500">{step.time || step.description}</p>}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
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
                      <div id={`order-status-${step.replace(/\s+/g, "-").toLowerCase()}`} key={step} className="flex gap-4">
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

              {order && !isCancelled && (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Where is my order?</p>
                      <p className="text-sm font-semibold text-slate-800 mt-1">Showing the latest available order status.</p>
                    </div>
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${statusClass(String(order.status || ""))}`}>
                      {String(order.status || "Status unavailable")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {([
                      ["Pending", "Order received", ShoppingBag],
                      ["Confirmed", "Order confirmed", CheckCircle2],
                      ["Processing", "Being packed", Package],
                      ["Packed", "Waiting for pickup", Store],
                      ["Out for Delivery", "On the way", Truck],
                      ["Delivered", "Delivered", CheckCircle2],
                    ] as [string, string, any][]).map(([status, label, Icon]) => {
                      const active = String(order.status || "") === status;
                      const reached = steps.indexOf(status) >= 0 && currentIndex >= steps.indexOf(status);
                      return (
                        <button
                          key={status}
                          type="button"
                          disabled={!reached && !active}
                          onClick={() => {
                            const el = document.getElementById(`order-status-${status.replace(/\s+/g, "-").toLowerCase()}`);
                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${
                            active
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : reached
                              ? "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                              : "border-slate-200 bg-white text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {store.user?.role === "customer" && deliveryTracking && (
              <section className="bg-white border rounded-3xl p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div><p className="text-xs text-emerald-600 font-black uppercase tracking-wider">Live Delivery Tracking</p><h2 className="text-xl font-black mt-1">{deliveryTracking.status === "Out for Delivery" ? "Your delivery is on the way" : deliveryTracking.status}</h2><p className="text-sm text-slate-500 mt-1">{deliveryTracking.deliveryPartner?.name ? `Delivery Partner: ${deliveryTracking.deliveryPartner.name}` : "Delivery partner details will appear when assigned."}</p></div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-black ${deliveryTracking.partnerLocation?.latitude!=null ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{deliveryTracking.partnerLocation?.latitude!=null ? "LIVE LOCATION" : "LOCATION UNAVAILABLE"}</span>
                </div>
                {deliveryTracking.partnerLocation?.latitude!=null && deliveryTracking.destination ? (
                  <>
                    <DeliveryRouteMap origin={{latitude:Number(deliveryTracking.partnerLocation.latitude),longitude:Number(deliveryTracking.partnerLocation.longitude)}} destination={{latitude:Number(deliveryTracking.destination.latitude),longitude:Number(deliveryTracking.destination.longitude)}} originLabel="Delivery Partner" destinationLabel="Your destination" waypoint={deliveryTracking.store ? {latitude:Number(deliveryTracking.store.latitude),longitude:Number(deliveryTracking.store.longitude)} : undefined} waypointLabel="Store" orderId={String(deliveryTracking.orderId||"")}/>
                    <div className="grid sm:grid-cols-4 gap-3 mt-4"><div className="bg-slate-50 rounded-xl p-3"><span className="text-xs text-slate-500">Distance remaining</span><b className="block mt-1">{deliveryTracking.distanceRemainingKm!=null?`${Number(deliveryTracking.distanceRemainingKm).toFixed(1)} km`:"Unavailable"}</b></div><div className="bg-slate-50 rounded-xl p-3"><span className="text-xs text-slate-500">Estimated arrival</span><b className="block mt-1">{deliveryTracking.etaWindow?.startAt&&deliveryTracking.etaWindow?.endAt?`${new Date(deliveryTracking.etaWindow.startAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})} – ${new Date(deliveryTracking.etaWindow.endAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`:deliveryTracking.etaMinutes!=null?`~${deliveryTracking.etaMinutes} min`:"Unavailable"}</b></div><div className="bg-slate-50 rounded-xl p-3"><span className="text-xs text-slate-500">ETA confidence</span><b className={`block mt-1 ${deliveryTracking.etaConfidence?.level==="HIGH"?"text-emerald-700":deliveryTracking.etaConfidence?.level==="DELAYED"?"text-red-700":"text-amber-700"}`}>{deliveryTracking.etaConfidence?.label||"Unavailable"}</b><span className="text-[11px] text-slate-500 block mt-1">{deliveryTracking.etaConfidence?.reason||"No reliable ETA signal yet."}</span></div><div className="bg-slate-50 rounded-xl p-3"><span className="text-xs text-slate-500">Last updated</span><b className="block mt-1">{deliveryTracking.updatedAt?new Date(deliveryTracking.updatedAt).toLocaleTimeString("en-IN"):"—"}</b></div></div>{deliveryTracking.sla?.active && <div className={`mt-3 rounded-xl p-3 ${deliveryTracking.sla.breached?"bg-red-50 text-red-800":"bg-amber-50 text-amber-800"}`}><span className="text-xs font-bold uppercase">Delivery SLA</span><b className="block mt-1">{deliveryTracking.sla.breached?"SLA breached":deliveryTracking.sla.remainingMs!=null?`${Math.ceil(Number(deliveryTracking.sla.remainingMs)/60000)} min remaining`:"—"}</b></div>}
                  </>
                ) : deliveryTracking.status === "Out for Delivery" ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Location unavailable.</b><p className="mt-1">{deliveryTracking.partnerLocation?.updatedAt ? `Last updated ${new Date(deliveryTracking.partnerLocation.updatedAt).toLocaleString("en-IN")}.` : "The Delivery Partner has not sent a fresh GPS location yet."} We will show movement as soon as a fresh location is available.</p></div>
                ) : (
                  <div className="mt-5 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">Live partner location becomes visible after the order reaches the appropriate delivery stage.</div>
                )}
                {trackingLoading && <p className="text-xs text-slate-400 mt-3">Refreshing tracking data…</p>}
              </section>
            )}

            {store.user?.role === "customer" && order && (
              <AIDeliveryETAAssistant store={store} orderId={String(order._id||id||"")} deliveryTracking={deliveryTracking}/>
            )}

            <section className="grid md:grid-cols-2 gap-5">
              <div className="bg-white border rounded-3xl p-6">
                <h2 className="font-bold text-lg">Delivery partner</h2>
                {order.deliveryPartner && <div className="mt-3 flex flex-wrap gap-2"><DeliveryChat store={store} order={order} /><DeliveryLocationShare store={store} order={order} compact /></div>}
                {order.deliveryPartner ? (
                  <div className="mt-4">
                    <p className="font-semibold">{order.deliveryPartner.name}</p>
<p className="text-sm text-slate-500 mt-1">Delivery Partner assigned to this order</p>
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
                      .join(", ") || "Address not available"}
                  </p>
                  {order.address?.phone && <p>Phone: {order.address.phone}</p>}
                </div>
              </div>
            </section>

            {store.user?.role === "customer" && order.status === "Delivered" && order.deliveryPartner && (
              <section className="bg-white border rounded-3xl p-6">
                <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-lg">How was your delivery?</h2><p className="text-sm text-slate-500 mt-1">Rate your Delivery Partner after this completed delivery.</p></div><span className="text-sm font-semibold text-slate-500">{order.deliveryProof?.available ? "Proof completed" : "Delivered"}</span></div>
                {ratingSubmitted ? <p className="mt-4 text-emerald-700 font-semibold">Thank you for rating your delivery.</p> : <><div className="flex gap-1 mt-4">{[1,2,3,4,5].map(star=><button key={star} onClick={()=>setDeliveryRating(star)} className={`text-3xl ${star<=deliveryRating?'text-amber-500':'text-slate-300'}`}>★</button>)}</div><div className="flex flex-wrap gap-2 mt-3">{["Professional","Polite","Fast delivery","Good communication","Other"].map(x=><button key={x} onClick={()=>setDeliveryFeedback(x)} className={`border rounded-xl px-3 py-2 text-xs font-semibold ${deliveryFeedback===x?'border-emerald-500 bg-emerald-50 text-emerald-700':''}`}>{x}</button>)}</div><button onClick={async()=>{try{await axios.post(API+`/customer/orders/${order._id}/delivery-rating`,{rating:deliveryRating,feedback:deliveryFeedback},{headers:adminHeaders()});setRatingSubmitted(true);}catch(e:any){alert(e?.response?.data?.message||"Unable to submit rating")}}} className="mt-4 bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold">Submit Rating</button></>}
              </section>
            )}

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
  const [publicContact, setPublicContact] = useState<any>({});

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

  // Presentation-only: reuse the project's existing public contact settings.
  // No contact details are hard-coded into the invoice.
  useEffect(() => {
    axios
      .get(API + "/public/contact")
      .then((r) => setPublicContact(r.data.data || {}))
      .catch(() => setPublicContact({}));
  }, []);

  if (!store.user) return <NavigateToLogin />;

  if (loading) {
    return (
      <Layout store={store}>
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="mb-4"><WebsiteBackButton fallback="/orders" label="Back to orders" /></div>
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

  const supportPhone = String(publicContact.phone || "").trim();
  const supportEmail = String(publicContact.email || "").trim();
  const supportWhatsApp = String(publicContact.whatsapp || "").trim();
  const supportHours = String(publicContact.workingHours || "").trim();
  const customerSupportContact = String(publicContact.customerSupportContact || "").trim();

  return (
    <Layout store={store}>
      <style>{`
        .invoice-premium { color: #0f172a; }
        .invoice-premium .invoice-section { break-inside: avoid; page-break-inside: avoid; }
        .invoice-premium .invoice-note { break-inside: avoid; page-break-inside: avoid; }
        .invoice-premium .invoice-items { page-break-inside: auto; }
        .invoice-premium .invoice-item-row { break-inside: avoid; page-break-inside: avoid; }
        .invoice-premium .invoice-total-box { break-inside: avoid; page-break-inside: avoid; }
        @page {
          size: A4 portrait;
          margin: 5mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * { visibility: hidden !important; }
          .invoice-print, .invoice-print * { visibility: visible !important; }
          .invoice-print {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: 210mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            zoom: 1 !important;
            transform: none !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            page-break-after: auto !important;
          }
          .no-print { display: none !important; }
          .invoice-premium {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 11px !important;
            line-height: 1.28 !important;
            width: 100% !important;
            max-width: 210mm !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }

          .invoice-premium *,
          .invoice-premium *::before,
          .invoice-premium *::after {
            box-sizing: border-box !important;
            max-width: 100% !important;
          }

          .invoice-premium table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            word-break: break-word !important;
          }

          .invoice-premium img {
            max-width: 100% !important;
            height: auto !important;
          }

          .invoice-premium .flex,
          .invoice-premium .grid {
            max-width: 100% !important;
          }
          .invoice-premium .invoice-section,
          .invoice-premium .invoice-note,
          .invoice-premium .invoice-total-box {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .invoice-premium .invoice-items {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .invoice-premium .invoice-item-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Keep the complete invoice intact while allowing long invoices
             to continue naturally onto the next A4 page. */
          .invoice-premium .invoice-items table {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .invoice-premium thead {
            display: table-header-group !important;
          }
          .invoice-premium tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .invoice-premium footer {
            display: block !important;
            visibility: visible !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: auto !important;
            page-break-after: avoid !important;
          }
          .invoice-premium > * {
            visibility: visible !important;
          }
          .invoice-premium {
            overflow: visible !important;
          }
          /* Compact A4 print layout: preserve EVERY section, including the
             thank-you, trust, local-support, help, reorder and dark footer,
             while removing only screen whitespace so the complete invoice
             fits on one physical A4 page. */
          .invoice-premium .invoice-mobile-pad {
            padding-left: 5mm !important;
            padding-right: 5mm !important;
          }
          .invoice-premium .py-8 { padding-top: 4mm !important; padding-bottom: 4mm !important; }
          .invoice-premium .py-7 { padding-top: 3.5mm !important; padding-bottom: 3.5mm !important; }
          .invoice-premium .py-6 { padding-top: 3mm !important; padding-bottom: 3mm !important; }
          .invoice-premium .py-5 { padding-top: 2.5mm !important; padding-bottom: 2.5mm !important; }
          .invoice-premium .p-5 { padding: 3.5mm !important; }
          .invoice-premium .p-4 { padding: 2.5mm !important; }
          .invoice-premium .mt-6 { margin-top: 3mm !important; }
          .invoice-premium .mt-5 { margin-top: 2.5mm !important; }
          .invoice-premium .mt-4 { margin-top: 2mm !important; }
          .invoice-premium .mt-3 { margin-top: 1.5mm !important; }
          .invoice-premium .mt-2 { margin-top: 1mm !important; }
          .invoice-premium .mb-5 { margin-bottom: 2.5mm !important; }
          .invoice-premium .mb-4 { margin-bottom: 2mm !important; }
          .invoice-premium .gap-7 { gap: 3mm !important; }
          .invoice-premium .gap-6 { gap: 3mm !important; }
          .invoice-premium .gap-5 { gap: 2.5mm !important; }
          .invoice-premium .gap-4 { gap: 2mm !important; }
          .invoice-premium .gap-3 { gap: 1.5mm !important; }
          .invoice-premium .text-3xl { font-size: 19px !important; }
          .invoice-premium .text-2xl { font-size: 17px !important; }
          .invoice-premium .text-xl { font-size: 15px !important; }
          .invoice-premium .text-lg { font-size: 14px !important; }
          .invoice-premium .text-base { font-size: 12px !important; }
          .invoice-premium .text-sm { font-size: 10.5px !important; }
          .invoice-premium .text-xs { font-size: 9px !important; }
          .invoice-premium .text-\[11px\] { font-size: 8px !important; }
          .invoice-premium .text-\[10px\] { font-size: 7.5px !important; }
          .invoice-premium .py-4 { padding-top: 2mm !important; padding-bottom: 2mm !important; }
          .invoice-premium .py-3\.5 { padding-top: 1.8mm !important; padding-bottom: 1.8mm !important; }
          .invoice-premium table { font-size: 10px !important; }
          .invoice-premium th, .invoice-premium td { padding-top: 1.8mm !important; padding-bottom: 1.8mm !important; }
          .invoice-premium footer .mt-6 { margin-top: 2mm !important; }
          .invoice-premium footer .pt-4 { padding-top: 1.5mm !important; }
          .invoice-premium footer .py-7 { padding-top: 2.5mm !important; padding-bottom: 2.5mm !important; }
          .invoice-premium .rounded-3xl { border-radius: 4mm !important; }
          .invoice-premium .rounded-2xl { border-radius: 3mm !important; }
          .invoice-premium .rounded-xl { border-radius: 2mm !important; }
        }
        @media (max-width: 640px) {
          .invoice-premium .invoice-mobile-pad { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
          .invoice-premium { width: 100%; max-width: 100%; overflow: hidden; }
          .invoice-premium .overflow-x-auto { max-width: 100%; }
          .invoice-premium table { min-width: 0 !important; }
          .invoice-premium th, .invoice-premium td { word-break: break-word; overflow-wrap: anywhere; }
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
            onClick={async () => {
              try {
                if (IS_NATIVE_APP) {
                  await CapacitorPrinter.printWebView({ name: `FreshBasket Invoice ${invoiceNumber}` });
                  return;
                }
              } catch (error) {
                console.warn("FreshBasket native invoice print failed, falling back to browser print", error);
              }
              window.print();
            }}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 hover:bg-emerald-700"
          >
            <Printer size={17} />
            Print / Save PDF
          </button>
        </div>

        <section className="invoice-print invoice-premium bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="invoice-section invoice-mobile-pad px-7 sm:px-9 py-8 border-b border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/40">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-7">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-emerald-600 text-white grid place-items-center shadow-sm">
                    <Leaf size={22} />
                  </span>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                      Fresh<span className="text-emerald-600">Basket</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Your neighbourhood marketplace, delivered with care.
                    </p>
                  </div>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <BadgeCheck size={14} />
                  Official order invoice
                </div>
              </div>

              <div className="sm:text-right shrink-0">
                <p className="text-[11px] text-slate-400 uppercase tracking-[0.16em] font-black">
                  Invoice
                </p>
                <h2 className="text-xl sm:text-2xl font-black mt-1 break-all">{invoiceNumber}</h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Date: {new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN")}
                </p>
                <span
                  className={`inline-flex mt-3 px-3 py-1.5 rounded-full text-xs font-bold ${statusClass(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Order and customer information */}
          <div className="invoice-section invoice-mobile-pad px-7 sm:px-9 py-7 border-b border-slate-200">
            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400">Order ID</p>
                <p className="font-bold text-sm mt-1.5 break-all">#{String(order._id).slice(-8).toUpperCase()}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400">Delivery Status</p>
                <p className="font-bold text-sm mt-1.5">{order.status || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400">Delivery Slot</p>
                <p className="font-bold text-sm mt-1.5">{order.deliverySlot || "Standard delivery"}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 p-5 invoice-section">
                <div className="flex items-center gap-2 text-emerald-700">
                  <User size={16} />
                  <p className="text-[11px] uppercase tracking-[0.14em] font-black">Customer Details</p>
                </div>
                <p className="font-bold text-base mt-3">
                  {order.address?.name || order.user?.name || "Customer"}
                </p>
                {order.user?.email && (
                  <p className="text-sm text-slate-500 mt-1 break-all">{order.user.email}</p>
                )}
                {order.address?.phone && (
                  <p className="text-sm text-slate-500 mt-1">{order.address.phone}</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 invoice-section">
                <div className="flex items-center gap-2 text-emerald-700">
                  <MapPin size={16} />
                  <p className="text-[11px] uppercase tracking-[0.14em] font-black">Delivery Address</p>
                </div>
                <p className="text-sm text-slate-600 mt-3 leading-6">
                  {order.address?.address || "Address not available"}
                  {order.address?.city ? `, ${order.address.city}` : ""}
                  {order.address?.pincode ? ` - ${order.address.pincode}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="invoice-items invoice-mobile-pad px-7 sm:px-9 py-7 border-b border-slate-200">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] font-black text-emerald-700">Order Details</p>
                <h3 className="text-lg sm:text-xl font-black mt-1">Items in this order</h3>
              </div>
              <p className="text-xs text-slate-400">{items.length} item{items.length === 1 ? "" : "s"}</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-3.5 px-4 pr-3 font-bold text-slate-600">Item</th>
                    <th className="py-3.5 px-3 text-center font-bold text-slate-600">Qty</th>
                    <th className="py-3.5 px-3 text-right font-bold text-slate-600">Price</th>
                    <th className="py-3.5 px-4 pl-3 text-right font-bold text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item: any, index: number) => (
                    <tr key={String(item.product || index) + index} className="invoice-item-row">
                      <td className="py-4 px-4 pr-3">
                        <p className="font-semibold text-slate-800">{item.name || "Product"}</p>
                        {item.unit && (
                          <p className="text-xs text-slate-400 mt-1">{item.unit}</p>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-4 px-3 text-right text-slate-600">
                        {money(Number(item.price || 0))}
                      </td>
                      <td className="py-4 px-4 pl-3 text-right font-bold text-slate-800">
                        {money(Number(item.price || 0) * Number(item.quantity || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="invoice-total-box ml-auto max-w-sm mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-2.5 text-sm">
              <div className="flex justify-between gap-5">
                <span className="text-slate-500">Subtotal</span>
                <b>{money(subtotal)}</b>
              </div>
              <div className="flex justify-between gap-5">
                <span className="text-slate-500">Discount</span>
                <b>{money(discount)}</b>
              </div>
              <div className="flex justify-between gap-5">
                <span className="text-slate-500">Delivery</span>
                <b>{delivery ? money(delivery) : "FREE"}</b>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-3 flex items-center justify-between gap-5">
                <span className="font-black text-slate-900">Grand Total</span>
                <b className="text-xl text-emerald-700">{money(total)}</b>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="invoice-section invoice-mobile-pad px-7 sm:px-9 py-5 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 grid place-items-center text-emerald-700">
                  <CircleDollarSign size={17} />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400">Payment Information</p>
                  <p className="text-sm font-bold mt-0.5">{order.paymentMethod || "COD"}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">Order #{String(order._id).slice(-8).toUpperCase()}</span>
            </div>
          </div>

          {/* Thank you */}
          <div className="invoice-section invoice-mobile-pad px-7 sm:px-9 py-8 text-center bg-emerald-50/60 border-b border-emerald-100">
            <div className="mx-auto w-10 h-10 rounded-full bg-emerald-600 text-white grid place-items-center mb-3">
              <Heart size={18} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">Thank You for Shopping with FreshBasket!</h3>
            <p className="max-w-2xl mx-auto text-sm leading-6 text-slate-600 mt-3">
              Thank you for trusting FreshBasket with your everyday needs. We truly appreciate your order and hope we made your shopping experience simple, reliable, and convenient.
            </p>
            <p className="text-sm font-semibold text-emerald-700 mt-3">
              We'd love to serve you again. See you on your next order!
            </p>
          </div>

          {/* Trust + local marketplace */}
          <div className="invoice-section invoice-mobile-pad px-7 sm:px-9 py-7 border-b border-slate-200">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 p-5 bg-white">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ShieldCheck size={18} />
                  <h3 className="font-black">Your Trust Matters to Us</h3>
                </div>
                <p className="text-sm leading-6 text-slate-600 mt-3">
                  Every order you place with FreshBasket helps us build a better local shopping experience. We are committed to reliable service, transparent pricing, quality products, and dependable delivery.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Store size={18} />
                  <h3 className="font-black">Shop Local. Support Local. Grow Together.</h3>
                </div>
                <p className="text-sm leading-6 text-slate-600 mt-3">
                  FreshBasket connects you with trusted local stores and delivery partners, bringing the convenience of online shopping closer to your neighbourhood.
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="invoice-section invoice-mobile-pad px-7 sm:px-9 py-7 border-b border-slate-200">
            <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/60">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Headphones size={18} />
                    <h3 className="font-black">Need Help?</h3>
                  </div>
                  <p className="text-sm leading-6 text-slate-600 mt-3">
                    If you have any issue with your order, product, payment, refund, or replacement, our Customer Care team is here to help.
                  </p>
                </div>
                {(supportPhone || supportEmail || supportWhatsApp || customerSupportContact || supportHours) && (
                  <div className="w-full sm:max-w-xs rounded-xl bg-white border border-slate-200 p-4 text-sm space-y-2">
                    {customerSupportContact && <p><span className="text-slate-400">Customer Care:</span> <b>{customerSupportContact}</b></p>}
                    {supportPhone && <p className="break-all"><span className="text-slate-400">Phone:</span> <b>{supportPhone}</b></p>}
                    {supportEmail && <p className="break-all"><span className="text-slate-400">Email:</span> <b>{supportEmail}</b></p>}
                    {supportWhatsApp && <p className="break-all"><span className="text-slate-400">WhatsApp:</span> <b>{supportWhatsApp}</b></p>}
                    {supportHours && <p><span className="text-slate-400">Hours:</span> <b>{supportHours}</b></p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reorder / retention */}
          <div className="invoice-note invoice-mobile-pad px-7 sm:px-9 py-6 text-center border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-700">
              Need it again? Your favourite local products are always just a few taps away.
            </p>
            <p className="text-sm text-slate-500 mt-1.5">
              Come back anytime — we'd be happy to serve you again.
            </p>
          </div>

          {/* Footer */}
          <footer className="invoice-section invoice-mobile-pad px-7 sm:px-9 py-7 bg-slate-950 text-white">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 grid place-items-center">
                    <Leaf size={16} />
                  </span>
                  <span className="font-black text-lg">FreshBasket</span>
                </div>
                <p className="text-sm font-semibold text-white mt-4">
                  Thank you for choosing FreshBasket.
                </p>
                <p className="text-xs leading-5 text-slate-300 mt-1.5">
                  FreshBasket — Your neighbourhood marketplace, delivered with care.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Made for local shoppers. Built for local businesses.
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-400 max-w-xs">
                <p>This is a computer-generated invoice and does not require a signature.</p>
                <p className="mt-1.5">Please retain this invoice for your records.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>Thank you for choosing FreshBasket.</span>
              <span>Invoice {invoiceNumber}</span>
            </div>
          </footer>
        </section>
      </main>
    </Layout>
  );
}

function BarcodeScannerModal({
  onDetected,
  onClose,
}: {
  onDetected: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<any>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [status, setStatus] = useState("Starting camera…");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      try {
        controlsRef.current?.stop?.();
      } catch {}
      controlsRef.current = null;
      try {
        (readerRef.current as any)?.reset?.();
      } catch {}
      readerRef.current = null;
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks?.().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not supported by this browser.");
        }
        if (!videoRef.current) {
          throw new Error("Unable to initialize camera preview.");
        }

        setError("");
        setStatus("Requesting camera access…");

        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        // ZXing provides a browser-compatible fallback for browsers that do not
        // implement the native BarcodeDetector API (including many desktop
        // Chrome configurations). It decodes common retail formats such as
        // EAN-13, EAN-8, UPC, Code 128, Code 39 and ITF.
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (cancelled || !result) return;
            const value = String(result.getText?.() || "").trim();
            if (!value) return;
            stop();
            onDetected(value);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setStatus("Point the camera at the product barcode");
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.name === "NotAllowedError"
              ? "Camera permission was denied. Allow camera access and try again."
              : e?.message || "Unable to start barcode scanner."
          );
          setStatus("Scanner unavailable");
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2"><ScanLine size={20} /> Scan barcode</h3>
            <p className="text-xs text-slate-500 mt-1">Use the product packet's printed barcode.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Close scanner"><X size={20} /></button>
        </div>
        <div className="p-5">
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 aspect-video flex items-center justify-center">
            <video ref={videoRef} muted playsInline autoPlay className="w-full h-full object-cover" />
            <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 border-2 border-white/80 rounded-xl h-24 pointer-events-none" />
            {!error && <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/55 text-white text-sm text-center px-3 py-2">{status}</div>}
          </div>
          {error && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-3 text-sm">
              {error}
            </div>
          )}
          <button type="button" onClick={onClose} className="w-full mt-4 border rounded-xl px-4 py-3 font-bold">Close</button>
        </div>
      </div>
    </div>
  );
}

function ProductChangeHistoryModal({ product, rows, loading, onClose }: { product:any; rows:any[]; loading:boolean; onClose:()=>void }) {
  const formatValue = (value:any) => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("en-IN") : String(value);
    return String(value);
  };
  return <div className="fixed inset-0 z-[100] bg-black/50 p-4 overflow-y-auto"><div className="max-w-6xl mx-auto mt-8 bg-white rounded-3xl shadow-2xl border overflow-hidden">
    <div className="px-5 py-4 border-b flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">Audit trail</p><h3 className="text-xl font-black">Change History</h3><p className="text-sm text-slate-500 mt-1">{product?.name || "Product"} · Who changed it, when, before, after and reason.</p></div><button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Close change history"><X size={20}/></button></div>
    <div className="p-5 max-h-[75vh] overflow-y-auto">{loading ? <div className="py-12 text-center text-slate-500">Loading change history...</div> : rows.length ? <div className="space-y-4">{rows.map((row:any)=>{ const before=row.before||{}; const after=row.after||{}; const keys=Array.from(new Set([...Object.keys(before),...Object.keys(after)])); return <div key={String(row._id)} className="border rounded-2xl p-4 bg-slate-50/60"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-4"><div><b>{row.action||"Product change"}</b><p className="text-xs text-slate-500 mt-1">{row.actor?.name||"Unknown user"}{row.actorRole?` · ${row.actorRole}`:""}{row.actorEmployeeId?` · Employee ${row.actorEmployeeId}`:""}</p></div><div className="text-xs text-slate-500 lg:text-right"><div>{row.timestamp?new Date(row.timestamp).toLocaleString("en-IN"):"—"}</div>{row.reason&&<div className="mt-1"><span className="font-bold text-slate-700">Reason:</span> {row.reason}</div>}</div></div>{keys.length?<div className="overflow-x-auto"><table className="w-full text-sm min-w-[650px]"><thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="p-2">Field</th><th className="p-2">Before</th><th className="p-2">After</th></tr></thead><tbody>{keys.map((key:string)=><tr key={key} className="border-t align-top"><td className="p-2 font-semibold">{key}</td><td className="p-2"><pre className="whitespace-pre-wrap break-words text-xs max-w-[320px]">{formatValue(before[key])}</pre></td><td className="p-2"><pre className="whitespace-pre-wrap break-words text-xs max-w-[320px]">{formatValue(after[key])}</pre></td></tr>)}</tbody></table></div>:<p className="text-sm text-slate-500">No before/after snapshot was stored for this audit event.</p>}</div>})}</div>:<div className="py-12 text-center text-slate-500">No change history is available for this product yet.</div>}</div>
    <div className="px-5 py-4 border-t flex justify-end"><button type="button" onClick={onClose} className="border rounded-xl px-5 py-2.5 font-bold">Close</button></div></div></div>;
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
    refundAllowed: false,
    replacementAllowed: false,
    refundEligible: false,
    replacementEligible: false,
    refundWindowHours: 24,
    replacementWindowHours: 24,
    refundWindowDays: 1,
    replacementWindowDays: 1,
    refundTerms: "",
    replacementTerms: "",
    paymentAvailability: "COD_AND_ONLINE",
    variants: [],
  });

  const [form, setForm] = useState<any>(emptyForm());
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [historyProduct, setHistoryProduct] = useState<any | null>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  // Point 10: barcode/SKU lookup and barcode scanner state.
  // Keep these states inside ProductAdmin because the lookup UI and scanner
  // controls belong to the authorized admin product workflow.
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanTargetVariantIndex, setScanTargetVariantIndex] = useState<number | null>(null);

  const lookupProductIdentifier = async (identifier: string) => {
    const value = String(identifier || "").trim();
    if (!value) {
      setLookupError("Enter a SKU or barcode.");
      setLookupResult(null);
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const r = await axios.get(API + "/admin/products/lookup", {
        params: { identifier: value },
        headers: adminHeaders(),
      });
      setLookupResult(r.data.data);
    } catch (e: any) {
      setLookupError(e?.response?.data?.message || "No product found for this SKU/barcode.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleScannerDetected = (value: string) => {
    setScannerOpen(false);
    if (scanTargetVariantIndex !== null) {
      const target = scanTargetVariantIndex;
      setScanTargetVariantIndex(null);
      setForm((f: any) => ({
        ...f,
        variants: (f.variants || []).map((v: any, i: number) => i === target ? { ...v, barcode: value } : v),
      }));
      return;
    }
    setLookupQuery(value);
    lookupProductIdentifier(value);
  };

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
    setChangeReason("");
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setChangeReason("");
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
      refundAllowed: Boolean((p as any).refundAllowed ?? (p as any).refundEligible ?? false),
      replacementAllowed: Boolean((p as any).replacementAllowed ?? (p as any).replacementEligible ?? false),
      refundEligible: Boolean((p as any).refundAllowed ?? (p as any).refundEligible ?? false),
      replacementEligible: Boolean((p as any).replacementAllowed ?? (p as any).replacementEligible ?? false),
      refundWindowHours: 24,
      replacementWindowHours: 24,
      refundWindowDays: 1,
      replacementWindowDays: 1,
      refundTerms: (p as any).refundTerms || "",
      replacementTerms: (p as any).replacementTerms || "",
      paymentAvailability: String((p as any).paymentAvailability || "COD_AND_ONLINE"),
      variants: Array.isArray((p as any).variants) ? (p as any).variants.map((v: any) => ({ ...v })) : [],
    });
    setShowForm(true);
  };

  const openHistory = async (p: Product) => {
    setHistoryProduct(p); setHistoryRows([]); setHistoryLoading(true);
    try { const r = await axios.get(API + "/admin/change-history", { params: { targetType: "PRODUCT", targetId: p._id }, headers: adminHeaders() }); setHistoryRows(Array.isArray(r.data.data) ? r.data.data : []); }
    catch (e:any) { alert(e?.response?.data?.message || "Unable to load change history."); setHistoryProduct(null); }
    finally { setHistoryLoading(false); }
  };

  const save = async () => {
    if (!form.name.trim()) return alert("Product name is required.");
    if (Number(form.sellingPrice) < 0 || Number(form.mrp) < 0) {
      return alert("Price cannot be negative.");
    }

    setSaving(true);
    try {
      const hasVariants = Array.isArray(form.variants) && form.variants.length > 0;
      const payload = {
        ...form,
        sellingPrice: Number(form.sellingPrice),
        mrp: Number(form.mrp),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        refundAllowed: Boolean(form.refundAllowed),
        replacementAllowed: Boolean(form.replacementAllowed),
        refundEligible: Boolean(form.refundAllowed),
        replacementEligible: Boolean(form.replacementAllowed),
        refundWindowHours: 24,
        replacementWindowHours: 24,
        refundWindowDays: 1,
        replacementWindowDays: 1,
        refundTerms: String(form.refundTerms || ""),
        replacementTerms: String(form.replacementTerms || ""),
        paymentAvailability: ["COD_ONLY", "COD_AND_ONLINE", "ONLINE_ONLY"].includes(String(form.paymentAvailability || "")) ? String(form.paymentAvailability) : "COD_AND_ONLINE",
        changeReason: String(changeReason || "").trim().slice(0, 500),
        variants: hasVariants ? form.variants.map((v: any) => ({
          ...(v._id ? { _id: v._id } : {}),
          name: String(v.name || v.unit || "").trim(),
          unit: String(v.unit || v.name || "").trim(),
          mrp: Number(v.mrp || 0),
          sellingPrice: Number(v.sellingPrice || 0),
          stock: Number(v.stock || 0),
          sku: String(v.sku || "").trim(),
          barcode: String(v.barcode || "").trim(),
          image: String(v.image || "").trim(),
        })).filter((v: any) => v.name) : undefined,
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

  const isMainAdmin = Boolean(
    store.user?.isMainAdmin ||
    String(store.user?.email || "").trim().toLowerCase() === "admin@grocery.com"
  );

  // Defense-in-depth UI isolation. The backend is authoritative, but a
  // Store Admin should never render a product belonging to another store.
  const tenantProducts = isMainAdmin
    ? store.products
    : store.products.filter((p: any) => String(p.storeAdmin || "") === String(store.user?.id || ""));

  const visible = tenantProducts.filter((p) => {
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
      {historyProduct && <ProductChangeHistoryModal product={historyProduct} rows={historyRows} loading={historyLoading} onClose={() => setHistoryProduct(null)} />}
      {scannerOpen && <BarcodeScannerModal onDetected={handleScannerDetected} onClose={() => { setScannerOpen(false); setScanTargetVariantIndex(null); }} />}
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

      <div className="bg-white border rounded-2xl p-4 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-700 mb-1">Barcode / SKU lookup</label>
            <input
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") lookupProductIdentifier(lookupQuery); }}
              placeholder="Search exact SKU or barcode..."
              className="w-full border rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setScanTargetVariantIndex(null); setScannerOpen(true); }} className="border rounded-xl px-4 py-3 font-bold inline-flex items-center gap-2">
              <ScanLine size={17} /> Scan barcode
            </button>
            <button type="button" disabled={lookupLoading} onClick={() => lookupProductIdentifier(lookupQuery)} className="bg-emerald-600 disabled:opacity-50 text-white rounded-xl px-5 py-3 font-bold">
              {lookupLoading ? "Searching..." : "Lookup"}
            </button>
          </div>
        </div>
        {lookupError && <p className="text-sm text-red-600 mt-2">{lookupError}</p>}
        {lookupResult?.product && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {lookupResult.product.image && <img src={lookupResult.product.image} alt={lookupResult.product.name} className="w-16 h-16 rounded-xl object-cover border bg-white" />}
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-700 uppercase">Product found · {lookupResult.matchedBy === "barcode" ? "Barcode" : "SKU"}</p>
                <h4 className="font-black text-lg">{lookupResult.product.name}</h4>
                <p className="text-sm text-slate-600">{lookupResult.product.brand || ""}{lookupResult.matchedVariant ? ` · ${lookupResult.matchedVariant.name || lookupResult.matchedVariant.unit || "Variant"}` : ""}</p>
                {lookupResult.matchedVariant?.sku && <p className="text-xs text-slate-500 mt-1">SKU: {lookupResult.matchedVariant.sku}</p>}
                {lookupResult.matchedVariant?.barcode && <p className="text-xs text-slate-500">Barcode: {lookupResult.matchedVariant.barcode}</p>}
              </div>
              <button type="button" onClick={() => openEdit(lookupResult.product)} className="bg-white border border-emerald-300 rounded-xl px-4 py-2.5 font-bold">Open product</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white border rounded-3xl p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">
                {editing ? "Edit product" : "Add product"}
              </h3>
              <p className="text-sm text-slate-500">Fill the catalog details below.</p>
              {editing && <input value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="Reason for change (optional)" className="mt-3 w-full md:w-[520px] border rounded-xl px-3 py-2.5 text-sm" />}
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
            <div className="md:col-span-2 border rounded-2xl p-4 bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div><p className="font-bold">Product variants</p><p className="text-xs text-slate-500 mt-1">Use variants for sizes/pack sizes such as 500 ml, 1 L or 5 kg.</p></div>
                <button type="button" onClick={() => setForm((f: any) => ({ ...f, variants: [...(f.variants || []), { name: "", unit: "", mrp: f.mrp || 0, sellingPrice: f.sellingPrice || 0, stock: 0, sku: "", barcode: "", image: f.image || "" }] }))} className="border rounded-xl px-3 py-2 text-sm font-bold">+ Add variant</button>
              </div>
              {(form.variants || []).length > 0 && <div className="space-y-3 mt-4">
                {(form.variants || []).map((v: any, idx: number) => <div key={v._id || idx} className="border rounded-2xl p-3 bg-white">
                  <div className="flex items-center justify-between mb-2"><b className="text-sm">Variant {idx + 1}</b><button type="button" onClick={() => setForm((f: any) => ({ ...f, variants: (f.variants || []).filter((_: any, i: number) => i !== idx) }))} className="text-red-600 text-xs font-bold">Remove</button></div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input placeholder="Variant name (e.g. 1 L)" value={v.name || ""} onChange={e => setForm((f: any) => ({ ...f, variants: f.variants.map((x: any, i: number) => i === idx ? { ...x, name: e.target.value } : x) }))} className="border rounded-xl p-2.5" />
                    <input placeholder="Unit" value={v.unit || ""} onChange={e => setForm((f: any) => ({ ...f, variants: f.variants.map((x: any, i: number) => i === idx ? { ...x, unit: e.target.value } : x) }))} className="border rounded-xl p-2.5" />
                    <input placeholder="Selling price" type="number" min="0" value={v.sellingPrice} onChange={e => setForm((f: any) => ({ ...f, variants: f.variants.map((x: any, i: number) => i === idx ? { ...x, sellingPrice: e.target.value } : x) }))} className="border rounded-xl p-2.5" />
                    <input placeholder="MRP" type="number" min="0" value={v.mrp} onChange={e => setForm((f: any) => ({ ...f, variants: f.variants.map((x: any, i: number) => i === idx ? { ...x, mrp: e.target.value } : x) }))} className="border rounded-xl p-2.5" />
                    <input placeholder="Stock" type="number" min="0" value={v.stock} onChange={e => setForm((f: any) => ({ ...f, variants: f.variants.map((x: any, i: number) => i === idx ? { ...x, stock: e.target.value } : x) }))} className="border rounded-xl p-2.5" />
                    <input placeholder="SKU" value={v.sku || ""} onChange={e => setForm((f: any) => ({ ...f, variants: f.variants.map((x: any, i: number) => i === idx ? { ...x, sku: e.target.value } : x) }))} className="border rounded-xl p-2.5" />
                    <div className="flex gap-2">
                      <input placeholder="Barcode" value={v.barcode || ""} onChange={e => setForm((f: any) => ({ ...f, variants: f.variants.map((x: any, i: number) => i === idx ? { ...x, barcode: e.target.value } : x) }))} className="border rounded-xl p-2.5 min-w-0 flex-1" />
                      <button type="button" title="Scan barcode" onClick={() => { setScanTargetVariantIndex(idx); setScannerOpen(true); }} className="border rounded-xl px-3 font-bold inline-flex items-center justify-center" aria-label={`Scan barcode for variant ${idx + 1}`}><ScanLine size={17} /></button>
                    </div>
                    <input placeholder="Variant image URL" value={v.image || ""} onChange={e => setForm((f: any) => ({ ...f, variants: f.variants.map((x: any, i: number) => i === idx ? { ...x, image: e.target.value } : x) }))} className="border rounded-xl p-2.5" />
                  </div>
                </div>)}
              </div>}
            </div>
            <div className="md:col-span-2 border rounded-2xl p-4 bg-slate-50">
              <p className="font-bold">Payment availability</p>
              <div className="grid md:grid-cols-3 gap-2 mt-3">
                {[
                  ["COD_ONLY", "Cash on Delivery only"],
                  ["COD_AND_ONLINE", "Cash on Delivery + Online Payment"],
                  ["ONLINE_ONLY", "Online Payment only"],
                ].map(([value, label]) => (
                  <label key={value} className={`border rounded-xl p-3 bg-white cursor-pointer ${form.paymentAvailability === value ? "border-emerald-500 ring-1 ring-emerald-200" : ""}`}>
                    <input type="radio" name="paymentAvailability" value={value} checked={form.paymentAvailability === value} onChange={() => setForm({ ...form, paymentAvailability: value })} className="mr-2" />
                    <span className="text-sm font-semibold">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          <div className="md:col-span-2 border rounded-2xl p-4 bg-slate-50">
            <div className="flex items-center gap-2 font-bold"><ShieldCheck size={17}/> Refund & Replacement Policy</div>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <label className="text-sm font-semibold">After-Sales Policy<select value={form.refundAllowed && form.replacementAllowed ? "BOTH" : form.refundAllowed ? "REFUND" : form.replacementAllowed ? "REPLACEMENT" : "NONE"} onChange={e=>{const v=e.target.value;setForm({...form,refundAllowed:v==="REFUND"||v==="BOTH",replacementAllowed:v==="REPLACEMENT"||v==="BOTH"})}} className="mt-2 w-full border rounded-xl p-3 bg-white"><option value="NONE">No Refund / No Replacement</option><option value="REFUND">Refund Only</option><option value="REPLACEMENT">Replacement Only</option><option value="BOTH">Refund + Replacement</option></select></label>
              <div className="rounded-xl border bg-white p-3 text-sm text-slate-600"><b>Eligibility window</b><p className="mt-1">Exactly 24 hours from successful delivery.</p><p className="text-xs text-slate-500 mt-1">This window is enforced server-side and cannot be changed from the product form.</p></div>
              <label className="text-sm font-semibold">Refund terms<textarea value={form.refundTerms} onChange={e=>setForm({...form,refundTerms:e.target.value})} className="mt-2 w-full border rounded-xl p-3 bg-white min-h-20"/></label>
              <label className="text-sm font-semibold">Replacement terms<textarea value={form.replacementTerms} onChange={e=>setForm({...form,replacementTerms:e.target.value})} className="mt-2 w-full border rounded-xl p-3 bg-white min-h-20"/></label>
            </div>
          </div>
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
                      <button onClick={() => openHistory(p)} className="border px-3 py-2 rounded-lg font-semibold hover:bg-white inline-flex items-center gap-1.5"><History size={15}/> History</button>
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
  const [sourceType, setSourceType] = useState("");
  const [storeAdminId, setStoreAdminId] = useState("");
  const [storeAdmins, setStoreAdmins] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deliveryPartners, setDeliveryPartners] = useState<any[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [payoutByOrder, setPayoutByOrder] = useState<Record<string,string>>({});
  const [partnerByOrder, setPartnerByOrder] = useState<Record<string,string>>({});
  const [rankedByOrder, setRankedByOrder] = useState<Record<string,any[]>>({});
  const [rankingLoading, setRankingLoading] = useState<string | null>(null);
  const [selectedRankedOrder, setSelectedRankedOrder] = useState<string | null>(null);
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<string[]>([]);
  const [batchPartnerId, setBatchPartnerId] = useState("");
  const [batchAssigning, setBatchAssigning] = useState(false);
  const [batchConfirmation, setBatchConfirmation] = useState<any | null>(null);
  const [batchRecommendation, setBatchRecommendation] = useState<any | null>(null);
  const [batchRecommendationLoading, setBatchRecommendationLoading] = useState(false);

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
    axios.get(API + "/admin/admins", { headers: adminHeaders() }).then(r=>setStoreAdmins(r.data.data||[])).catch(()=>setStoreAdmins([]));
  }, [page, status, sourceType, storeAdminId]);

  const loadRankedPartners = async (orderId:string) => {
    setRankingLoading(orderId);
    try {
      const r=await axios.get(API+"/admin/delivery-partners/ranked",{headers:adminHeaders(),params:{orderId}});
      setRankedByOrder(v=>({...v,[orderId]:r.data.data||[]}));
      setSelectedRankedOrder(orderId);
    } catch(e:any) { alert(e?.response?.data?.message||"Unable to load recommended delivery partners."); }
    finally { setRankingLoading(null); }
  };
  useDeliveryRealtime((event:any)=>{
    if(!event?.partnerId)return;
    setRankedByOrder(current=>{
      const next={...current};
      Object.keys(next).forEach(orderId=>{
        next[orderId]=(next[orderId]||[]).map((row:any)=>String(row.partner?._id)===String(event.partnerId)?{...row,partner:{...row.partner,...event},locationUpdatedAt:event.updatedAt||event.locationUpdatedAt,locationFreshness:{fresh:true,stale:false,ageSeconds:0}}:row);
      });
      return next;
    });
  },undefined,true);

  const assignPartner = async (id: string, partnerId: string) => {
    const current = orders.find((o) => String(o._id) === String(id));
    const hasExistingPartner = Boolean(current?.deliveryPartner?._id || current?.deliveryPartner);
    const existingPartnerId = String(current?.deliveryPartner?._id || current?.deliveryPartner || "");
    const nextPartnerId = String(partnerId || "");
    const requestedPayout = payoutByOrder[id] === undefined || payoutByOrder[id] === ""
      ? Number(current?.deliveryPayout ?? 0)
      : Number(payoutByOrder[id]);

    // First assignment is allowed without a payout-change reason. Once an
    // assignment already exists, changing the partner or payout is a protected
    // change and requires an explicit reason.
    // A partner with zero payout and no delivery activity is an incomplete
    // first assignment created by an older UI. Treat it as initial setup so
    // the Store Admin can enter the payout without an authorization prompt.
    // A partner may have been attached by an older/partial flow while the
    // initial payout was never persisted. As long as delivery has NOT started
    // and the payout is still zero, this is an incomplete FIRST assignment.
    // Do not gate this recovery on payout status because legacy data can have
    // an inconsistent status value while the order is still Packed.
    const incompleteInitialAssignment = hasExistingPartner &&
      Number(current?.deliveryPayout ?? 0) <= 0 &&
      !current?.deliveryStartedAt &&
      !current?.deliveredAt;

    const protectedChange = hasExistingPartner && !incompleteInitialAssignment &&
      (existingPartnerId !== nextPartnerId || Number(current?.deliveryPayout ?? 0) !== requestedPayout);

    let authorizedPayoutChange = false;
    let payoutChangeReason = "";
    if (protectedChange) {
      payoutChangeReason = String(window.prompt("This order already has a delivery assignment. Enter the reason for changing the partner/payout:", "") || "").trim();
      if (!payoutChangeReason) return;
      authorizedPayoutChange = true;
    }

    setAssigning(id);
    try {
      const r = await axios.patch(
        API + "/admin/orders/" + id + "/assign",
        {
          deliveryPartnerId: nextPartnerId || null,
          deliveryPayout: requestedPayout,
          authorizedPayoutChange,
          payoutChangeReason,
        },
        { headers: adminHeaders() }
      );

      // Use the server's persisted representation first, then re-fetch the
      // list so a refresh can never hide a successfully persisted payout.
      setOrders((current) =>
        current.map((o) =>
          String(o._id) === String(id) ? r.data.data : o
        )
      );
      await load();
      setPartnerByOrder((current) => ({
        ...current,
        [String(id)]: String(r.data.data?.deliveryPartner?._id || r.data.data?.deliveryPartner || ""),
      }));

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

  const toggleBatchOrder = (id: string) => {
    setSelectedBatchOrders(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };
  const beginBatchAssignment = async () => {
    const selectedOrders = orders.filter(o => selectedBatchOrders.includes(String(o._id)));
    if (selectedOrders.length < 2) return alert("Select at least two eligible orders.");
    if (selectedOrders.some(o => o.deliveryPartner)) return alert("Batch assignment only includes orders that are currently unassigned.");
    if (!batchPartnerId) return alert("Select a Delivery Partner.");
    const sameStore = selectedOrders.every(o => String(o.storeAdmin || "") === String(selectedOrders[0]?.storeAdmin || ""));
    setBatchRecommendation(null);
    setBatchRecommendationLoading(true);
    try {
      const r = await axios.get(API + "/admin/orders/batch-recommendation", {
        params: { orderIds: selectedOrders.map((o:any) => String(o._id)).join(","), deliveryPartnerId: batchPartnerId },
        headers: adminHeaders(),
      });
      if (!r.data?.success) throw new Error(r.data?.message || "Unable to calculate batch recommendation");
      setBatchRecommendation(r.data.data || null);
    } catch (e:any) {
      // Recommendation is advisory; preserve the existing manual batch workflow if
      // the recommendation service is temporarily unavailable.
      console.warn("Batch recommendation unavailable", e);
      setBatchRecommendation({ unavailable: true, warnings: [e?.response?.data?.message || "Batch recommendation is temporarily unavailable."] });
    } finally {
      setBatchRecommendationLoading(false);
      setBatchConfirmation({ selectedOrders, partner: deliveryPartners.find(p => String(p._id) === String(batchPartnerId)), sameStore });
    }
  };
  const confirmBatchAssignment = async () => {
    if (!batchConfirmation) return;
    setBatchAssigning(true);
    try {
      const r = await axios.post(API + "/admin/orders/batch-assign", { orderIds: batchConfirmation.selectedOrders.map((o:any)=>String(o._id)), deliveryPartnerId: batchPartnerId }, { headers: adminHeaders() });
      if (!r.data?.success) throw new Error(r.data?.message || "Batch assignment failed");
      setBatchConfirmation(null);
      setSelectedBatchOrders([]);
      setBatchPartnerId("");
      await load();
      alert(r.data.message || "Orders assigned successfully.");
    } catch (e:any) {
      alert(e?.response?.data?.message || e?.message || "Unable to assign selected orders.");
    } finally { setBatchAssigning(false); }
  };

  const autoAssignNearest = async (id: string) => {
    setAssigning(id);
    try {
      const r = await axios.patch(API + "/admin/orders/" + id + "/assign", { autoNearest: true }, { headers: adminHeaders() });
      setOrders(current => current.map(o => String(o._id) === String(id) ? r.data.data : o));
      if (selected && String(selected._id) === String(id)) setSelected(r.data.data);
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to find nearest delivery partner."); }
    finally { setAssigning(null); }
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

      setOrders((current) => {
        if (["Delivered", "Cancelled"].includes(nextStatus)) {
          return current.filter((o) => String(o._id) !== String(id));
        }
        return current.map((o) =>
          String(o._id) === String(id) ? r.data.data : o
        );
      });
      if (["Delivered", "Cancelled"].includes(nextStatus)) {
        setMeta((m: any) => ({ ...m, total: Math.max(0, Number(m.total || 0) - 1) }));
        if (selected && String(selected._id) === String(id)) setSelected(null);
      }

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
        <div className="grid md:grid-cols-[1fr_180px_180px_180px_auto] gap-3">
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
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

           <select value={sourceType} onChange={e=>{setSourceType(e.target.value);setPage(1)}} className="border rounded-xl px-3 py-2.5">
             <option value="">All sources</option>
             <option value="FRESHBASKET_DIRECT">FreshBasket Direct</option>
             <option value="STORE">Store orders</option>
           </select>
           {storeAdmins.length > 1 && <select value={storeAdminId} onChange={e=>{setStoreAdminId(e.target.value);setPage(1)}} className="border rounded-xl px-3 py-2.5"><option value="">All stores</option>{storeAdmins.map((a:any)=><option key={a._id} value={a._id}>{a.name}</option>)}</select>}

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

      {selectedBatchOrders.length >= 2 && (
        <div className="bg-white border-2 border-emerald-200 rounded-3xl p-4 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div><p className="text-xs text-emerald-600 font-black uppercase tracking-wider">Multi-order assignment</p><p className="font-bold mt-1">{selectedBatchOrders.length} orders selected</p><p className="text-xs text-slate-500 mt-1">Each order remains independent; only the delivery assignment is grouped.</p></div>
            <div className="flex flex-wrap gap-2">
              <select value={batchPartnerId} onChange={e=>setBatchPartnerId(e.target.value)} className="border rounded-xl px-3 py-2.5 min-w-[220px] bg-white"><option value="">Select Delivery Partner</option>{deliveryPartners.map(p=><option key={p._id} value={p._id}>{p.name} · {p.email}</option>)}</select>
              <button type="button" onClick={beginBatchAssignment} className="bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold">Assign Selected Orders</button>
              <button type="button" onClick={()=>{setSelectedBatchOrders([]);setBatchPartnerId("")}} className="border rounded-xl px-4 py-2.5 font-bold">Clear</button>
            </div>
          </div>
        </div>
      )}

      {selectedRankedOrder && (rankedByOrder[selectedRankedOrder] || []).length > 0 && (
        <div className="bg-white border-2 border-blue-100 rounded-3xl p-4 mb-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs text-blue-600 font-black uppercase tracking-wider">Recommended delivery partners</p><h3 className="font-black mt-1">Route-aware candidates for #{String(selectedRankedOrder).slice(-8).toUpperCase()}</h3></div><button type="button" onClick={()=>setSelectedRankedOrder(null)} className="border rounded-xl px-3 py-2 text-xs font-bold">Close</button></div>
          <div className="grid lg:grid-cols-2 gap-3 mt-4">
            {(rankedByOrder[selectedRankedOrder] || []).slice(0,6).map((row:any)=><div key={row.partner?._id} className="border rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div><b>{row.partner?.name || "Delivery Partner"}</b><p className="text-xs text-slate-500 mt-1">{row.availability || "—"} · Active orders: {row.activeOrderCount ?? 0}/{row.capacity ?? 3}</p></div><span className={`text-[10px] font-black px-2 py-1 rounded-full ${row.assignmentEligibility?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{row.assignmentEligibility?"Eligible":"Not eligible"}</span></div><div className="grid grid-cols-2 gap-2 mt-3 text-xs"><div><span className="text-slate-400">Distance from Store</span><p className="font-bold">{row.distanceToStore!=null?`${Number(row.distanceToStore).toFixed(1)} km`:"Unavailable"}</p></div><div><span className="text-slate-400">Estimated travel</span><p className="font-bold">{row.etaToStore!=null?`${row.etaToStore} min`:(row.distanceToStore!=null?"Geographical estimate":"Unavailable")}</p></div><div><span className="text-slate-400">Location</span><p className="font-bold">{row.locationFreshness?.fresh?`Updated ${row.locationFreshness.ageSeconds||0}s ago`:"Location unavailable (routing may be limited)"}</p></div><div><span className="text-slate-400">Route match</span><p className="font-bold">{row.serviceAreaMatch?"Good route match":"Nearby delivery"}</p></div></div><button type="button" disabled={!row.assignmentEligibility || !row.capacityAvailable || assigning===selectedRankedOrder} onClick={()=>assignPartner(selectedRankedOrder,String(row.partner?._id||""))} className="mt-3 w-full bg-emerald-600 text-white rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40">Assign this partner</button></div>)}
          </div>
        </div>
      )}

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
                    <th className="text-left p-4">Select</th>
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
                        <input type="checkbox" checked={selectedBatchOrders.includes(String(o._id))} disabled={Boolean(o.deliveryPartner) || ["Delivered","Cancelled","Out for Delivery"].includes(o.status)} onChange={()=>toggleBatchOrder(String(o._id))} aria-label={`Select order ${String(o._id).slice(-8)}`} />
                      </td>
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
                        <button
                          type="button"
                          disabled={assigning === String(o._id) || ["Delivered", "Cancelled"].includes(o.status)}
                          onClick={() => autoAssignNearest(String(o._id))}
                          className="mt-2 w-full border border-emerald-200 text-emerald-700 rounded-xl px-2 py-1.5 text-[11px] font-bold disabled:opacity-50"
                        >
                          Assign nearest to store
                        </button>
                      </td>

                      <td className="p-4 min-w-[240px]">
                        <button type="button" onClick={()=>loadRankedPartners(String(o._id))} disabled={rankingLoading===String(o._id)} className="w-full mb-2 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 text-xs font-black inline-flex items-center justify-center gap-2">{rankingLoading===String(o._id)?"Finding nearby partners...":"Show recommended partners"}</button>
                        {o.deliveryAssignmentStatus === "REJECTED" && (
                          <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
                            <b>REJECTED</b> · {o.deliveryRejectionReason || "Reason not provided"}
                            {o.deliveryRejectionDetails && <div className="mt-1">{o.deliveryRejectionDetails}</div>}
                          </div>
                        )}
                        <input type="number" min="0" max="10000" step="0.01" value={payoutByOrder[String(o._id)] ?? String(o.deliveryPayout ?? "")} onChange={e=>setPayoutByOrder(v=>({...v,[String(o._id)]:e.target.value}))} placeholder="Initial payout ₹" className="w-full border rounded-xl px-3 py-2 text-xs mb-2" title={o.deliveryPartner ? "Existing delivery payout — changing it requires a reason" : "Initial Delivery Partner Payout"}/>
                        <select
                          value={partnerByOrder[String(o._id)] ?? String(o.deliveryPartner?._id || o.deliveryPartner || "")}
                          disabled={
                            assigning === String(o._id) ||
                            ["Delivered", "Cancelled"].includes(o.status)
                          }
                          onChange={(e) =>
                            setPartnerByOrder(v => ({ ...v, [String(o._id)]: e.target.value }))
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
                        <button
                          type="button"
                          disabled={
                            assigning === String(o._id) ||
                            ["Delivered", "Cancelled"].includes(o.status) ||
                            !(partnerByOrder[String(o._id)] ?? String(o.deliveryPartner?._id || o.deliveryPartner || "")) &&
                            !o.deliveryPartner
                          }
                          onClick={() => assignPartner(
                            String(o._id),
                            partnerByOrder[String(o._id)] ?? String(o.deliveryPartner?._id || o.deliveryPartner || "")
                          )}
                          className="mt-2 w-full rounded-xl px-3 py-2 text-xs font-bold bg-emerald-600 text-white disabled:opacity-50"
                        >
                          {assigning === String(o._id) ? "Saving..." : (o.deliveryPartner && Number(o.deliveryPayout || 0) <= 0 ? "Complete Initial Assignment" : o.deliveryPartner ? "Save Assignment / Payout" : "Assign Delivery Partner")}
                        </button>
                        <div className="mt-2 text-[11px] text-slate-500">Assignment: <b>{o.deliveryAssignmentType || (o.deliveryPartner ? "MANUAL" : "UNASSIGNED")}</b>{o.deliveryAssignedAt ? ` · ${new Date(o.deliveryAssignedAt).toLocaleString("en-IN")}` : ""}</div>
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
      {batchConfirmation && (
        <div className="fixed inset-0 z-[160] bg-black/50 p-4 grid place-items-center" onClick={()=>!batchAssigning&&setBatchConfirmation(null)}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-emerald-600 text-xs font-black uppercase tracking-wider">Confirm batch assignment</p><h3 className="text-xl font-black mt-1">Assign {batchConfirmation.selectedOrders.length} orders</h3></div><button type="button" disabled={batchAssigning} onClick={()=>setBatchConfirmation(null)}><X/></button></div>
            <div className="mt-5 rounded-2xl bg-slate-50 border p-4"><p className="text-sm"><b>Delivery Partner:</b> {batchConfirmation.partner?.name || "—"}</p><p className="text-sm mt-2"><b>Selected Orders:</b> {batchConfirmation.selectedOrders.length}</p><p className="text-sm mt-2"><b>Route match:</b> {batchConfirmation.sameStore ? "Good route match · same store" : "Nearby delivery · stores differ"}</p></div>
            {batchRecommendationLoading && <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 font-semibold">Checking store compatibility, delivery slots, SLA buffer, customer locations and partner capacity…</div>}
            {!batchRecommendationLoading && batchRecommendation && !batchRecommendation.unavailable && <div className={`mt-3 rounded-2xl border p-4 ${batchRecommendation.recommended ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center justify-between gap-3"><b className={batchRecommendation.recommended ? "text-emerald-800" : "text-amber-800"}>{batchRecommendation.recommended ? "Recommended batch" : "Batch needs review"}</b><span className="text-xs font-bold text-slate-500">{batchRecommendation.metrics?.currentActiveOrders ?? 0}/{batchRecommendation.metrics?.maxActiveOrders ?? "—"} active before batch</span></div>
              {!!batchRecommendation.reasons?.length && <p className="text-xs text-slate-600 mt-2">Good signals: {batchRecommendation.reasons.join(" · ")}</p>}
              {!!batchRecommendation.warnings?.length && <p className="text-xs text-amber-800 mt-2">Review: {batchRecommendation.warnings.join(" · ")}</p>}
            </div>}
            {!batchRecommendationLoading && batchRecommendation?.unavailable && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">{batchRecommendation.warnings?.join(" ") || "Batch recommendation is unavailable."} Existing manual assignment remains available.</div>}
            <div className="mt-4 max-h-44 overflow-y-auto space-y-2">{batchConfirmation.selectedOrders.map((o:any)=><div key={o._id} className="border rounded-xl p-3 text-sm flex justify-between gap-3"><span>#{String(o._id).slice(-8).toUpperCase()} · {o.user?.name || "Customer"}</span><span className="text-slate-500">{o.address?.city || o.address?.address || "Location unavailable"}</span></div>)}</div>
            <p className="text-xs text-slate-500 mt-4">This creates one delivery batch while keeping every order, tracking, chat, payment and delivery status independent.</p>
            <div className="flex justify-end gap-2 mt-5"><button type="button" disabled={batchAssigning} onClick={()=>setBatchConfirmation(null)} className="border rounded-xl px-4 py-2.5 font-bold">Cancel</button><button type="button" disabled={batchAssigning} onClick={confirmBatchAssignment} className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 font-bold">{batchAssigning?"Assigning...":"Confirm Assignment"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminOrderHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/orders/history", {
        headers: adminHeaders(),
        params: { page, limit: 10 },
      });
      setOrders(r.data.data || []);
      setMeta(r.data.meta || {});
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-emerald-600 text-sm font-bold">COMPLETED ORDERS</p>
          <h2 className="text-2xl font-bold">Order History</h2>
          <p className="text-sm text-slate-500 mt-1">
            Delivered and cancelled orders are stored here separately from active orders.
          </p>
        </div>
        <button
          onClick={load}
          className="border bg-white rounded-xl px-4 py-2.5 flex items-center gap-2 font-semibold"
        >
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading order history...</div>
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
                    <tr key={String(o._id)} className="border-t hover:bg-slate-50/70">
                      <td className="p-4">
                        <b>#{String(o._id).slice(-8)}</b>
                        <p className="text-xs text-slate-400">{o.paymentMethod || "COD"}</p>
                      </td>
                      <td className="p-4">
                        <b>{o.user?.name || "Customer"}</b>
                        <p className="text-xs text-slate-400">{o.user?.email || "—"}</p>
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(o.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-4 font-bold">{money(o.total)}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold ${statusClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4">{o.deliveryPartner?.name || "—"}</td>
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
              <span className="text-slate-500">{meta.total || orders.length} history orders</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="border rounded-xl px-4 py-2 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-2">Page {page} of {Math.max(1, meta.pages || 1)}</span>
                <button
                  disabled={page >= (meta.pages || 1)}
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
            <History className="mx-auto text-slate-300" size={50} />
            <h3 className="font-bold text-xl mt-3">No order history</h3>
            <p className="text-slate-500 mt-1">Delivered orders will appear here automatically.</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/40 p-4 grid place-items-center">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Order history</p>
                <h3 className="text-xl font-bold">#{String(selected._id).slice(-8)}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-slate-100"><X /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400">Customer</p>
                  <b>{selected.user?.name || "Customer"}</b>
                  <p className="text-sm text-slate-500">{selected.user?.email || "—"}</p>
                  <p className="text-sm text-slate-500">{selected.user?.phone || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400">Delivery</p>
                  <b>{selected.deliverySlot || "Selected delivery slot"}</b>
                  <p className="text-sm text-slate-500 mt-1">
                    {selected.address?.address || selected.address?.street || "Address not available"}
                  </p>
                  <p className="text-sm mt-3">
                    <span className="text-slate-400">Delivery partner: </span>
                    <b>{selected.deliveryPartner?.name || "—"}</b>
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-3">Items</h4>
                <div className="space-y-2">
                  {(selected.items || []).map((item: any, i: number) => (
                    <div key={i} className="border rounded-2xl p-3 flex justify-between">
                      <div>
                        <b>{item.name}</b>
                        <p className="text-xs text-slate-500">{item.quantity} × {money(item.price)}</p>
                      </div>
                      <b>{money(Number(item.price || 0) * Number(item.quantity || 0))}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-950 text-white rounded-2xl p-5 flex justify-between">
                <span>Total</span><b className="text-xl">{money(selected.total)}</b>
              </div>
              <div className="flex justify-end">
                <Link to={`/invoice/${selected._id}`} target="_blank" rel="noreferrer" className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700">
                  View Invoice
                </Link>
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
  const [storeAdmins, setStoreAdmins] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const isMainAdmin = Boolean(JSON.parse(localStorage.getItem("fb-user") || "{}")?.isMainAdmin || String(JSON.parse(localStorage.getItem("fb-user") || "{}")?.email || "").toLowerCase() === "admin@grocery.com");

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/reports", {
        headers: adminHeaders(),
        params: { period, ...(selectedAdminId ? { storeAdminId: selectedAdminId } : {}) },
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
  }, [period, selectedAdminId]);

  useEffect(() => {
    if (!isMainAdmin) return;
    axios.get(API + "/admin/admins", { headers: adminHeaders() }).then(r => setStoreAdmins(Array.isArray(r.data.data) ? r.data.data.filter((a:any) => String(a.email || "").toLowerCase() !== "admin@grocery.com") : [])).catch(() => {});
  }, [isMainAdmin]);

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

        {isMainAdmin && <div className="bg-white border rounded-xl p-1 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 px-2">View store</span>
          <select value={selectedAdminId} onChange={e => setSelectedAdminId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="">My main store</option>{storeAdmins.map((a:any)=><option key={a._id} value={a._id}>{a.name}</option>)}</select>
        </div>}
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


function DeliveryEarnings({ store }: { store: ReturnType<typeof useStore> }) { const [data,setData]=useState<any|null>(null);const [perf,setPerf]=useState<any|null>(null);useEffect(()=>{if(store.user?.role!=="delivery")return;Promise.all([axios.get(API+"/delivery/earnings",{headers:adminHeaders()}),axios.get(API+"/delivery/performance",{headers:adminHeaders()})]).then(([a,b])=>{setData(a.data.data);setPerf(b.data.data);}).catch(()=>{});},[store.user?.role]);if(store.user?.role!=="delivery")return <NavigateToLogin/>;const pct=(v:any)=>v==null?"—":`${Number(v).toFixed(1)}%`;const mins=(v:any)=>v==null?"—":`${Number(v).toFixed(1)} min`;return <div className="min-h-screen bg-slate-50 fb-dashboard-shell fb-delivery-shell"><main className="max-w-6xl mx-auto px-5 py-10"><div className="flex items-center justify-between"><div><p className="text-emerald-600 text-sm font-bold">DELIVERY PARTNER</p><h1 className="text-3xl font-bold">My Earnings & Performance</h1></div><div className="flex flex-wrap gap-2"><Link to="/login-history" className="border rounded-xl px-4 py-2 font-bold">Login History</Link><Link to="/delivery" className="border rounded-xl px-4 py-2 font-bold">Back to deliveries</Link></div></div><div className="grid grid-cols-2 lg:grid-cols-8 gap-3 mt-6">{[["Today",data?.today],["Weekly",data?.weekly],["Monthly",data?.monthly],["Total",data?.total],["Pending",data?.pending],["Eligible",data?.eligible],["Paid",data?.paid],["Rating",perf?.customerRating==null?"—":`${Number(perf.customerRating).toFixed(1)} ★`]].map(([l,v])=><div key={String(l)} className="bg-white border rounded-2xl p-5"><p className="text-xs text-slate-500">{l}</p><b className="text-2xl">{l==="Rating"?v:money(Number(v||0))}</b></div>)}</div><div className="bg-white border rounded-3xl p-5 mt-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-lg">Delivery Performance</h2><p className="text-xs text-slate-500 mt-1">Calculated from actual delivery assignments, completed orders and customer ratings.</p></div><span className="text-xs font-semibold text-slate-500">{Number(perf?.ordersDelivered||0)} completed deliveries</span></div><div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mt-4">{[["Orders Delivered",perf?.ordersDelivered==null?"—":perf.ordersDelivered],["On-Time Rate",pct(perf?.onTimeRate)],["Acceptance Rate",pct(perf?.acceptanceRate)],["Rejection Rate",pct(perf?.rejectionRate)],["Avg Pickup Time",mins(perf?.averagePickupMinutes)],["Avg Delivery Time",mins(perf?.averageDeliveryMinutes)],["Customer Rating",perf?.customerRating==null?"—":`${Number(perf.customerRating).toFixed(2)} ★`]].map(([l,v])=><div key={String(l)} className="bg-slate-50 border rounded-2xl p-4"><p className="text-xs text-slate-500">{l}</p><b className="text-xl mt-1 block">{v}</b></div>)}</div>{(perf?.systemDelayExcluded||0)>0&&<p className="text-xs text-slate-500 mt-4">{perf.systemDelayExcluded} completed order(s) were excluded from the on-time calculation because active delivery began after the selected slot had already ended, so store/system delay is not attributed to you.</p>}{perf?.onTimeRate==null&&<p className="text-xs text-amber-700 mt-3">On-time rate is unavailable until completed deliveries have usable delivery-slot timing data.</p>}</div><div className="bg-white border rounded-3xl overflow-hidden mt-5"><div className="p-5 border-b"><h2 className="font-bold">Recent ratings</h2></div><div className="divide-y">{(perf?.recentRatings||[]).map((r:any,i:number)=><div key={i} className="p-4 flex justify-between"><span>{"★".repeat(Number(r.rating||0))} <span className="text-xs text-slate-500">{r.feedback||"No feedback"}</span></span><span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span></div>)}{!(perf?.recentRatings||[]).length&&<div className="p-5 text-sm text-slate-500">No customer ratings yet.</div>}</div></div><div className="bg-white border rounded-3xl overflow-hidden mt-5"><div className="p-5 border-b"><h2 className="font-bold">Earnings history & payout breakdown</h2><p className="text-xs text-slate-500 mt-1">Only amounts recorded in the existing payout/finance records are included. Distance and peak bonuses are shown only when separately recorded by the system.</p></div><div className="divide-y">{(data?.rows||[]).map((x:any)=>{const b=x.payoutBreakdown||{};const base=Number(b.basePayout??x.deliveryPayout??0);const incentive=Number(b.incentive??x.performanceIncentive??0);const total=Number(b.total??(base+incentive));return <div key={x._id} className="p-5"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><b>#{String(x._id).slice(-8)}</b><p className="text-xs text-slate-500 mt-1">{x.deliveredAt?new Date(x.deliveredAt).toLocaleString("en-IN"):"—"} · {x.deliveryPayoutStatus}</p></div><b className="text-xl">{money(total)}</b></div><div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4"><div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Base payout</p><b className="block mt-1">{money(base)}</b></div><div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Distance bonus</p><b className="block mt-1">{b.distanceBonusRecorded?money(Number(b.distanceBonus||0)):"Not separately recorded"}</b></div><div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Peak bonus</p><b className="block mt-1">{b.peakBonusRecorded?money(Number(b.peakBonus||0)):"Not separately recorded"}</b></div><div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Incentive</p><b className="block mt-1">{money(incentive)}</b></div><div className="bg-emerald-50 rounded-xl p-3"><p className="text-xs text-emerald-700">Authorized total</p><b className="block mt-1 text-emerald-800">{money(total)}</b></div></div></div>})}{!(data?.rows||[]).length&&<div className="p-5 text-sm text-slate-500">No completed delivery earnings yet.</div>}</div></div></main></div>; }

function DeliveryDashboard({ store }: { store: ReturnType<typeof useStore> }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [paymentUpdating, setPaymentUpdating] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<DeliveryCoordinate | null>(null);
  const [pickupByOrder, setPickupByOrder] = useState<Record<string, DeliveryCoordinate | null>>({});
  const [pickupLoading, setPickupLoading] = useState(true);
  const [destinationByOrder, setDestinationByOrder] = useState<Record<string, DeliveryCoordinate | null>>({});
  const [myLocation, setMyLocation] = useState<DeliveryCoordinate | null>(null);
  const [locationError, setLocationError] = useState("");
  const [paymentSettingsByOrder, setPaymentSettingsByOrder] = useState<Record<string, any>>({});
  const [paymentSessionByOrder, setPaymentSessionByOrder] = useState<Record<string, any>>({});
  const [proofUploading, setProofUploading] = useState<string | null>(null);
  const [notAvailableOrder, setNotAvailableOrder] = useState<any | null>(null);
  const [notAvailableReason, setNotAvailableReason] = useState("");
  const [notAvailableNote, setNotAvailableNote] = useState("");
  const [notAvailableEvidence, setNotAvailableEvidence] = useState("");
  const [notAvailableSubmitting, setNotAvailableSubmitting] = useState(false);
  const [replacementRequests, setReplacementRequests] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [rejectingAssignment, setRejectingAssignment] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDetails, setRejectDetails] = useState("");
  const [deliveryProfile, setDeliveryProfile] = useState<any>(null);
  const [deliveryNotifications, setDeliveryNotifications] = useState<any[]>([]);
  const [deliveryUnreadNotifications, setDeliveryUnreadNotifications] = useState(0);
  const [showDeliveryNotifications, setShowDeliveryNotifications] = useState(false);
  const [routePlan, setRoutePlan] = useState<any | null>(null);
  const [routePlanLoading, setRoutePlanLoading] = useState(false);
  const { voiceAlertsEnabled: deliveryVoiceAlertsEnabled, setVoiceAlertsEnabled: setDeliveryVoiceAlertsEnabled, flushVoiceQueue: flushDeliveryVoiceQueue } = useRoleNotificationVoiceAlerts(store, deliveryNotifications);
  const lastLiveLocationUpdate = useRef(0);
  const activeDeliveryRef = useRef(false);

  const loadReplacements = async () => { try { const r=await axios.get(API+"/delivery/replacement-requests",{headers:adminHeaders()}); setReplacementRequests(r.data.data||[]); } catch(e){ console.error(e); } };
  const loadAssignments = async () => { try { const r=await axios.get(API+"/delivery/assignments",{headers:adminHeaders()}); setAssignments(r.data.data||[]); } catch(e){ console.error(e); } };
  const loadRoutePlan = async () => {
    if (store.user?.role !== "delivery") return;
    setRoutePlanLoading(true);
    try {
      const r = await axios.get(API+"/delivery/route-sequence",{headers:adminHeaders(),timeout:30000});
      setRoutePlan(r.data?.data||null);
    } catch(e:any) {
      setRoutePlan({available:false,reason:e?.response?.data?.message||"Unable to calculate delivery route."});
    } finally { setRoutePlanLoading(false); }
  };
  const loadDeliveryProfile = async () => { try { const r=await axios.get(API+"/auth/me",{headers:adminHeaders()}); setDeliveryProfile(r.data.data||null); } catch {} };
  const loadDeliveryNotifications = async () => {
    if (store.user?.role !== "delivery") return;
    try {
      const r = await axios.get(API + "/notifications", { headers: adminHeaders() });
      setDeliveryNotifications(Array.isArray(r.data.data) ? r.data.data : []);
      setDeliveryUnreadNotifications(Number(r.data.unreadCount || 0));
    } catch {}
  };
  const markDeliveryNotificationRead = async (id: string) => {
    try { await axios.patch(API + "/notifications/" + id + "/read", {}, { headers: adminHeaders() }); await loadDeliveryNotifications(); } catch {}
  };
  const markAllDeliveryNotificationsRead = async () => {
    try { await axios.patch(API + "/notifications/read-all", {}, { headers: adminHeaders() }); await loadDeliveryNotifications(); } catch {}
  };

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
      const list = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : [];
      list.forEach((o: any) => { loadPickupForOrder(String(o._id)); loadPaymentSettingsForOrder(String(o._id)); });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load deliveries.");
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSettingsForOrder = async (orderId: string) => {
    if (!orderId || paymentSettingsByOrder[orderId]) return;
    try {
      const r = await axios.get(API + "/orders/" + orderId + "/payment-settings", { headers: adminHeaders() });
      setPaymentSettingsByOrder((prev) => ({ ...prev, [orderId]: r.data?.data || null }));
    } catch {}
  };

  const loadPickupForOrder = async (orderId: string) => {
    if (!orderId || Object.prototype.hasOwnProperty.call(pickupByOrder, orderId)) return;
    try { const r = await axios.get(API + "/orders/" + orderId + "/pickup-location", { headers: adminHeaders() }); const d = r.data?.data || {}; setPickupByOrder(prev => ({ ...prev, [orderId]: isValidCoordinate(d.latitude, d.longitude) ? { latitude: Number(d.latitude), longitude: Number(d.longitude) } : null })); } catch { setPickupByOrder(prev => ({ ...prev, [orderId]: null })); }
  };

  const loadPickupLocation = async () => {
    setPickupLoading(true);
    try {
      const r = await axios.get(API + "/delivery/location", { headers: adminHeaders() });
      const location = r.data?.data || {};
      if (
        isValidCoordinate(location.latitude, location.longitude)
      ) {
        setPickupLocation({
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
        });
      } else {
        setPickupLocation(null);
      }
    } catch (e) {
      console.error("PICKUP LOCATION ERROR:", e);
      setPickupLocation(null);
    } finally {
      setPickupLoading(false);
    }
  };

  useEffect(() => {
    if (store.user?.role !== "delivery") return;
    load();
    loadReplacements();
    loadAssignments();
    loadDeliveryProfile();
    loadDeliveryNotifications();
    loadPickupLocation();
    loadRoutePlan();
    const deliveryNotificationTimer = window.setInterval(() => loadDeliveryNotifications(), 12000);
    const routePlanTimer = window.setInterval(() => loadRoutePlan(), 60000);

    if (!navigator.geolocation) {
      setLocationError("Live location is not supported on this device/browser.");
      window.clearInterval(deliveryNotificationTimer);
      return;
    }

    setLocationError("");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);
        if (isValidCoordinate(latitude, longitude)) {
          const now = Date.now();
          const interval = activeDeliveryRef.current ? 10000 : 45000;
          if (now - lastLiveLocationUpdate.current >= interval) {
            lastLiveLocationUpdate.current = now;
            setMyLocation({ latitude, longitude });
            axios.post(API + "/delivery/location", { latitude, longitude, accuracy: Number.isFinite(Number(position.coords.accuracy)) ? Number(position.coords.accuracy) : null }, { headers: adminHeaders() }).catch(() => {});
          }
          setLocationError("");
        }
      },
      (geoError) => {
        console.error("DELIVERY LIVE LOCATION ERROR:", geoError);
        const permission = geoError?.code === 1 ? "denied" : geoError?.code === 2 ? "unavailable" : "prompt";
        axios.post(API + "/delivery/location-permission", { status: permission }, { headers: adminHeaders() }).catch(() => {});
        setLocationError("Live location permission is unavailable. The store/customer map will still work without your live marker.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    const orderTimer = window.setInterval(() => load(), 15000);
    const pickupTimer = window.setInterval(() => loadPickupLocation(), 15000);
    const replacementTimer = window.setInterval(() => loadReplacements(), 15000);
    const assignmentTimer = window.setInterval(() => loadAssignments(), 10000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(orderTimer);
      window.clearInterval(pickupTimer);
      window.clearInterval(replacementTimer);
      window.clearInterval(assignmentTimer);
      window.clearInterval(deliveryNotificationTimer);
      window.clearInterval(routePlanTimer);
      axios.patch(API + "/delivery/status", { status: "OFFLINE" }, { headers: adminHeaders() }).catch(() => {});
    };
  }, [store.user?.role]);

  useEffect(() => {
    if (store.user?.role !== "delivery" || !orders.length) return;
    let cancelled = false;
    const resolveMissingDestinations = async () => {
      const pending = orders.filter((o:any) => {
        const orderId = String(o?._id || "");
        if (!orderId || Object.prototype.hasOwnProperty.call(destinationByOrder, orderId)) return false;
        const lat = o?.deliveryLocation?.latitude ?? o?.address?.latitude;
        const lng = o?.deliveryLocation?.longitude ?? o?.address?.longitude;
        return !isLikelyIndiaCoordinate(lat, lng);
      });
      if (!pending.length) return;
      const resolved = await Promise.all(pending.map(async (o:any) => {
        try {
          const response = await axios.get(API + `/orders/${encodeURIComponent(String(o._id))}/tracking`, { headers: adminHeaders(), timeout: 12000 });
          const d = response.data?.data?.destination;
          return [String(o._id), d && isValidCoordinate(d.latitude,d.longitude) ? { latitude:Number(d.latitude), longitude:Number(d.longitude), approximate:Boolean(d.approximate) } : null] as const;
        } catch {
          return [String(o._id), null] as const;
        }
      }));
      if (cancelled) return;
      setDestinationByOrder((current) => {
        const next = { ...current };
        for (const [orderId, destination] of resolved) next[orderId] = destination;
        return next;
      });
    };
    void resolveMissingDestinations();
    return () => { cancelled = true; };
  }, [orders, store.user?.role]);

  useDeliveryRealtime(() => { void load(); void loadAssignments(); }, undefined, store.user?.role === "delivery");

  const getFreshDeliveryLocation = (): Promise<DeliveryCoordinate | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = Number(position.coords.latitude);
          const longitude = Number(position.coords.longitude);
          if (!isValidCoordinate(latitude, longitude)) {
            resolve(null);
            return;
          }

          const fresh = { latitude, longitude };
          setMyLocation(fresh);
          lastLiveLocationUpdate.current = Date.now();
          axios.post(
            API + "/delivery/location",
            fresh,
            { headers: adminHeaders() }
          ).catch(() => {});
          setLocationError("");
          resolve(fresh);
        },
        (geoError) => {
          console.error("FRESH DELIVERY LOCATION ERROR:", geoError);
          setLocationError(
            "Could not get your exact current location. Please enable precise location/GPS permission and try again."
          );
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
    });


  const uploadDeliveryProof = async (id: string, file: File) => {
    if (!file.type.startsWith("image/")) return alert("Only image files are allowed.");
    if (file.size > 700 * 1024) return alert("Delivery proof image must be 700 KB or smaller.");
    setProofUploading(id);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const proofLocation = myLocation && isValidCoordinate(Number(myLocation.latitude), Number(myLocation.longitude))
            ? { latitude: Number(myLocation.latitude), longitude: Number(myLocation.longitude), locationAccuracy: Number(deliveryProfile?.locationAccuracy || 0) || null }
            : null;
          const response = await axios.post(
            API + "/delivery/orders/" + id + "/proof",
            { image: String(reader.result || ""), ...(proofLocation || {}) },
            { headers: adminHeaders() }
          );
          // Server response is the authoritative persisted proof.
          const persistedProof = response?.data?.data?.deliveryProof;
          if (!persistedProof?.image) throw new Error("Server did not return persisted delivery proof");
          setOrders((current:any[]) => current.map((item:any) =>
            String(item._id) === String(id)
              ? { ...item, deliveryProof: persistedProof }
              : item
          ));
          await load();
          alert("Delivery proof uploaded successfully.");
        } catch (e: any) {
          alert(e?.response?.data?.message || e?.message || "Unable to upload delivery proof");
        } finally {
          setProofUploading(null);
        }
      };
      reader.onerror = () => setProofUploading(null);
      reader.readAsDataURL(file);
    } catch {
      setProofUploading(null);
    }
  };

  const recordCustomerNotAvailable = async (id:string, reason:string, note:string, evidence:string) => {
    if (!reason) return alert("Select a reason.");
    if (reason === "Other" && note.trim().length < 3) return alert("Please provide details for Other.");
    if (note.trim().length > 2000) return alert("Note cannot exceed 2000 characters.");
    setNotAvailableSubmitting(true);
    try {
      const response = await axios.post(API + "/delivery/orders/" + id + "/customer-not-available", { reason, note: note.trim(), ...(evidence ? { evidence: [evidence] } : {}) }, { headers: adminHeaders() });
      if (!response?.data?.success) throw new Error(response?.data?.message || "Unable to record attempt");
      await Promise.all([load(), loadAssignments(), loadDeliveryNotifications()]);
      setNotAvailableOrder(null); setNotAvailableReason(""); setNotAvailableNote(""); setNotAvailableEvidence("");
      alert(response?.data?.message || "Customer-not-available attempt recorded.");
    } catch (e:any) { alert(e?.response?.data?.message || e?.message || "Unable to record customer-not-available attempt."); }
    finally { setNotAvailableSubmitting(false); }
  };

  const prepareNotAvailableEvidence = (file:File) => {
    if (!file.type.startsWith("image/")) return alert("Only image files are allowed.");
    if (file.size > 700 * 1024) return alert("Evidence image must be 700 KB or smaller.");
    const reader = new FileReader();
    reader.onload = () => setNotAvailableEvidence(String(reader.result || ""));
    reader.onerror = () => alert("Unable to read evidence image.");
    reader.readAsDataURL(file);
  };

  const uploadReplacementProof = async (id:string,file:File) => {
    if(!file.type.startsWith("image/"))return alert("Only image files are allowed.");
    if(file.size>700*1024)return alert("Replacement delivery proof image must be 700 KB or smaller.");
    setProofUploading("replacement:"+id);
    try{
      const reader=new FileReader();
      reader.onload=async()=>{
        try{
          const response=await axios.post(API+"/delivery/replacement-requests/"+id+"/proof",{image:String(reader.result||"")},{headers:adminHeaders()});
          const proof=response?.data?.data?.deliveryProof;
          if(!proof?.image)throw new Error("Server did not return persisted replacement proof");
          setReplacementRequests((current:any[])=>current.map((item:any)=>String(item._id)===String(id)?{...item,deliveryProof:proof}:item));
          await loadReplacements();
          alert("Replacement delivery proof uploaded successfully.");
        }catch(e:any){alert(e?.response?.data?.message||e?.message||"Unable to upload replacement delivery proof");}
        finally{setProofUploading(null);}
      };
      reader.onerror=()=>setProofUploading(null); reader.readAsDataURL(file);
    }catch{setProofUploading(null);}
  };
  const updateReplacementStatus = async (id:string,status:string,proofImage?:string) => {
    try{const payload:any={status}; if(status==="COMPLETED" && proofImage) payload.proofImage=proofImage; const response=await axios.patch(API+"/delivery/replacement-requests/"+id,payload,{headers:adminHeaders()}); if(!response?.data?.success) throw new Error(response?.data?.message||"Replacement delivery update failed"); await loadReplacements();}
    catch(e:any){alert(e?.response?.data?.message||e?.message||"Unable to update replacement delivery");}
  };

  const handleOutForDelivery = async (id: string) => {
    // Do not block the delivery status transition on GPS. High-accuracy
    // location can take several seconds (especially on Android). The photo
    // proof action must appear immediately after the order becomes Out for Delivery.
    // Refresh the rider location in the background; navigation can still use
    // the latest available location if the fresh fix is not ready yet.
    void getFreshDeliveryLocation();
    await updateStatus(id, "Out for Delivery");
  };

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

  const acceptAssignment = async (assignment:any) => {
    try {
      const r = await axios.post(API + "/delivery/assignments/" + assignment._id + "/accept", {}, { headers: adminHeaders() });
      if (!r.data?.success) throw new Error(r.data?.message || "Unable to accept assignment");
      await Promise.all([load(), loadAssignments(), loadDeliveryProfile(), loadDeliveryNotifications()]);
    } catch (e:any) {
      // A stale assignment notification can remain visible after the assignment
      // was already accepted/expired. Refresh the authoritative server state so
      // the old alert does not keep participating in the voice-notification queue.
      await Promise.all([loadAssignments(), loadDeliveryNotifications()]);
      alert(e?.response?.data?.message || "Unable to accept delivery assignment.");
    }
  };
  const submitAssignmentRejection = async () => {
    if (!rejectingAssignment) return;
    if (!rejectReason) return alert("Select a rejection reason.");
    if (rejectReason === "Other" && rejectDetails.trim().length < 3) return alert("Please provide details for Other.");
    try {
      await axios.post(API + "/delivery/assignments/" + rejectingAssignment._id + "/reject", { reason: rejectReason, details: rejectDetails }, { headers: adminHeaders() });
      setRejectingAssignment(null); setRejectReason(""); setRejectDetails("");
      await Promise.all([load(), loadAssignments(), loadDeliveryProfile()]);
    } catch (e:any) { alert(e?.response?.data?.message || "Unable to reject assignment."); }
  };
  const saveDeliveryPhoto = async (file:File) => {
    if (!file.type.startsWith("image/")) return alert("Only image files are allowed.");
    if (file.size > 700 * 1024) return alert("Profile photo must be 700 KB or smaller.");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const r=await axios.patch(API+"/profile/photo",{profilePhoto:String(reader.result||"")},{headers:adminHeaders()});
        setDeliveryProfile(r.data.data||{});
        const next={...store.user,profilePhoto:r.data.data?.profilePhoto||""}; store.setUser(next as any); localStorage.setItem("fb-user",JSON.stringify(next));
      } catch(e:any){alert(e?.response?.data?.message||"Unable to update profile photo.");}
    };
    reader.readAsDataURL(file);
  };
  const setDeliveryAvailability = async (status:string) => {
    try { const r=await axios.patch(API+"/delivery/status",{status},{headers:adminHeaders()}); setDeliveryProfile((v:any)=>({...v,...(r.data.data||{})})); }
    catch(e:any){alert(e?.response?.data?.message||"Unable to update availability.");}
  };
  const logout = () => {
    store.logout();
    window.location.href = "/login";
  };

  if (store.user?.role !== "delivery") {
    return <NavigateToLogin />;
  }

  // Active delivery count represents orders that this authenticated partner has
  // accepted and that are not terminal. Navigation is intentionally narrower
  // and only uses pickup-ready/in-transit orders with real route stages.
  const active = orders.filter(
    (o) =>
      !["Delivered", "Cancelled"].includes(String(o.status || "")) &&
      ["ACCEPTED", "UNASSIGNED"].includes(String(o.deliveryAssignmentStatus || ""))
  );
  const routableActive = active.filter(
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
  const batchGroups = Object.entries(active.filter((o:any)=>o.deliveryBatchId).reduce((acc:any,o:any)=>{const key=String(o.deliveryBatchId);(acc[key]||(acc[key]=[])).push(o);return acc;},{} as Record<string,any[]>)).filter(([,rows]:any)=>rows.length>1);
  activeDeliveryRef.current = active.some((o:any) => o.status === "Out for Delivery");

  const createPaymentSession = async (id:string) => {
    try {
      const r=await axios.post(API+`/orders/${id}/payment/session`,{}, {headers:adminHeaders()});
      const session=r.data?.data;
      if(!session?.uri) throw new Error("Payment session was not created.");
      setPaymentSessionByOrder(v=>({...v,[id]:session}));
      const qrUrl="https://quickchart.io/qr?text="+encodeURIComponent(session.uri)+"&size=320";
      window.open(qrUrl,"_blank","noopener,noreferrer");
    } catch(e:any){alert(e?.response?.data?.message||e?.message||"Unable to create payment QR.");}
  };

  const markPaymentReceived = async (id: string) => {
    try {
      setPaymentUpdating(id);
      await axios.patch(
        API + `/orders/${id}/payment`,
        { paymentStatus: "Paid", paymentMode: "CASH" },
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

  const getDestination = (order: any): DeliveryCoordinate | null => {
    const orderId = String(order?._id || "");
    if (Object.prototype.hasOwnProperty.call(destinationByOrder, orderId)) return destinationByOrder[orderId];
    const latitude = order?.deliveryLocation?.latitude ?? order?.address?.latitude;
    const longitude = order?.deliveryLocation?.longitude ?? order?.address?.longitude;
    return isLikelyIndiaCoordinate(latitude, longitude)
      ? { latitude: Number(latitude), longitude: Number(longitude) }
      : null;
  };

  const openNavigation = async (
    pickup: DeliveryCoordinate,
    destination: DeliveryCoordinate
  ) => {
    // Always request a fresh GPS fix before opening navigation. The delivery
    // partner may have moved several hundred metres since the last watch tick.
    const fresh = await getFreshDeliveryLocation();
    const origin = fresh || myLocation || pickup;

    const url =
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${origin.latitude},${origin.longitude}` +
      `&destination=${destination.latitude},${destination.longitude}` +
      "&travelmode=driving";

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-slate-50 fb-dashboard-shell fb-delivery-shell">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white grid place-items-center">
              <Truck size={22} />
            </div>
            <div>
              <h1 className="font-bold text-xl">FreshBasket Delivery</h1>
              <p className="text-xs text-slate-500">
                Delivery Partner Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button type="button" onClick={() => setShowDeliveryNotifications(v => !v)} className="relative p-2.5 rounded-xl border bg-white font-semibold text-slate-600 hover:text-emerald-700" aria-label="Delivery notifications">
                <Bell size={19} />
                {deliveryUnreadNotifications > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1 grid place-items-center">{deliveryUnreadNotifications > 99 ? "99+" : deliveryUnreadNotifications}</span>}
              </button>
              {showDeliveryNotifications && <div className="absolute right-0 top-12 w-[360px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-xl z-[70] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b"><div><b>Notifications</b><p className="text-xs text-slate-500">{deliveryUnreadNotifications} unread</p></div>{deliveryUnreadNotifications > 0 && <button type="button" onClick={markAllDeliveryNotificationsRead} className="text-xs font-bold text-emerald-700">Mark all read</button>}</div>
                <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-600">Assignment voice alerts</span><button type="button" onClick={() => { const next=!deliveryVoiceAlertsEnabled; setDeliveryVoiceAlertsEnabled(next); if(store.user?.id) localStorage.setItem(`fb-voice-alerts:${String(store.user.id)}`, String(next)); }} className={`text-xs font-black px-3 py-1.5 rounded-full border ${deliveryVoiceAlertsEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"}`}>{deliveryVoiceAlertsEnabled ? "🔊 Voice alerts ON" : "🔇 Voice alerts OFF"}</button></div>
                <div className="max-h-80 overflow-y-auto">{deliveryNotifications.length ? deliveryNotifications.slice(0,8).map((n:any)=><button key={n._id} type="button" onClick={() => markDeliveryNotificationRead(String(n._id))} className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${n.read?"bg-white":"bg-emerald-50/60"}`}><div className="flex gap-3"><div className={`mt-0.5 w-8 h-8 rounded-full grid place-items-center ${n.read?"bg-slate-100 text-slate-500":"bg-emerald-100 text-emerald-700"}`}><Bell size={15}/></div><div className="min-w-0"><p className="font-bold text-sm text-slate-900">{n.title}</p><p className="text-xs text-slate-600 mt-0.5">{n.message}</p><p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p></div></div></button>) : <div className="py-10 text-center text-sm text-slate-500"><Bell className="mx-auto text-slate-300" size={28}/><p className="mt-2">No notifications yet.</p></div>}</div>
              </div>}
            </div>
            <Link to="/delivery/earnings" className="px-4 py-2 rounded-xl border bg-white font-semibold">My Earnings</Link><Link to="/login-history" className="px-4 py-2 rounded-xl border bg-white font-semibold">Login History</Link>
            <button
              onClick={() => {
                load();
                loadPickupLocation();
              }}
              className="px-4 py-2 rounded-xl border bg-white font-semibold flex items-center gap-2"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold flex items-center gap-2"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        {locationError && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {locationError}
          </div>
        )}
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

        <div className="grid lg:grid-cols-3 gap-5 mb-6">
          <section className="lg:col-span-2 bg-white border rounded-3xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border bg-slate-50 grid place-items-center">
                  {deliveryProfile?.profilePhoto ? <img src={deliveryProfile.profilePhoto} alt="Delivery Partner" className="w-full h-full object-cover"/> : <Truck size={26} className="text-slate-300"/>}
                </div>
                <div><p className="text-xs text-emerald-600 font-black uppercase tracking-wider">Delivery Partner Profile</p><h2 className="text-xl font-black">{deliveryProfile?.name || store.user?.name || "Delivery Partner"}</h2><p className="text-sm text-slate-500">{deliveryProfile?.employeeId || "Delivery ID"} · {deliveryProfile?.phone || deliveryProfile?.email || ""}</p></div>
              </div>
              <ImagePickerButtons compact onFile={saveDeliveryPhoto}/>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-black ${deliveryProfile?.onlineStatus==="ONLINE"?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{deliveryProfile?.onlineStatus==="ONLINE"?"ONLINE":"OFFLINE"}</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-black bg-blue-50 text-blue-700">{deliveryProfile?.availabilityStatus || "AVAILABLE"}</span>
              <span className="text-xs text-slate-500">{myLocation ? `Live GPS · ±${Math.round(Number(deliveryProfile?.locationAccuracy||0)) || "—"} m` : "Location not available"}</span>
              {deliveryProfile?.locationUpdatedAt && <span className="text-xs text-slate-400">Updated {new Date(deliveryProfile.locationUpdatedAt).toLocaleTimeString("en-IN")}</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={()=>setDeliveryAvailability("ONLINE")} className="border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 text-sm font-bold">Go Online</button>
              <button onClick={()=>setDeliveryAvailability("OFFLINE")} className="border rounded-xl px-3 py-2 text-sm font-bold">Go Offline</button>
              <button onClick={()=>setDeliveryAvailability("AVAILABLE")} className="border border-blue-200 text-blue-700 rounded-xl px-3 py-2 text-sm font-bold">Available</button>
              <button onClick={()=>setDeliveryAvailability("PAUSED")} className="border border-amber-200 text-amber-700 rounded-xl px-3 py-2 text-sm font-bold">Pause</button>
            </div>
          </section>
          <section className="bg-white border rounded-3xl p-5">
            <p className="text-xs text-emerald-600 font-black uppercase tracking-wider">Location Status</p>
            <h2 className="text-xl font-black mt-1">{myLocation ? "Live location active" : "Location unavailable"}</h2>
            <p className="text-sm text-slate-500 mt-2">{myLocation ? "Your device GPS is being sent securely to FreshBasket for operational delivery tracking." : "Allow precise location/GPS permission to enable live tracking."}</p>
            {myLocation && <div className="mt-4 text-xs font-mono bg-slate-50 border rounded-xl p-3">Lat {myLocation.latitude.toFixed(6)}<br/>Lng {myLocation.longitude.toFixed(6)}</div>}
          </section>
        </div>

        {assignments.filter((a:any)=>a.status==="PENDING_ACCEPTANCE").length > 0 && (
          <section className="bg-white border-2 border-amber-200 rounded-3xl overflow-hidden mb-6">
            <div className="p-5 border-b bg-amber-50/60"><p className="text-xs text-amber-700 font-black uppercase tracking-wider">New Delivery Assignment</p><h2 className="text-xl font-black mt-1">Action required</h2><p className="text-sm text-slate-600 mt-1">Review the store, customer area, distance and ETA before accepting.</p></div>
            <div className="divide-y">
              {assignments.filter((a:any)=>a.status==="PENDING_ACCEPTANCE").map((a:any)=>{
                const m=a.metrics||{}; const o=a.order||{}; const age=a.expiresAt?Math.max(0,Math.ceil((new Date(a.expiresAt).getTime()-Date.now())/60000)):null;
                return <div key={a._id} className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div className="space-y-2 min-w-0"><div className="flex flex-wrap items-center gap-2"><b>#{String(o._id||"").slice(-8).toUpperCase()}</b><span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">PENDING ACCEPTANCE</span>{age!==null&&<span className="text-xs text-slate-500">Expires in ~{age} min</span>}</div><p className="font-semibold">{o.address?.city || o.address?.address || "Customer delivery area"}</p><p className="text-sm text-slate-500">Order value: {money(Number(o.total||0))} · Payment: {o.paymentMethod||"COD"}</p><div className="grid sm:grid-cols-3 gap-2 mt-3"><div className="bg-slate-50 border rounded-xl p-3"><span className="text-[11px] text-slate-500">Distance to store</span><b className="block mt-1">{m.distanceToStore!=null?`${Number(m.distanceToStore).toFixed(1)} km`:"Unavailable"}</b></div><div className="bg-slate-50 border rounded-xl p-3"><span className="text-[11px] text-slate-500">ETA to store</span><b className="block mt-1">{m.etaToStore!=null?`${m.etaToStore} min`:"Unavailable"}</b></div><div className="bg-slate-50 border rounded-xl p-3"><span className="text-[11px] text-slate-500">Delivery ETA</span><b className="block mt-1">{m.etaToCustomer!=null?`${m.etaToCustomer} min`:"After pickup"}</b></div></div></div>
                    <div className="flex flex-wrap gap-2 shrink-0"><button onClick={()=>acceptAssignment(a)} className="bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold">ACCEPT ORDER</button><button onClick={()=>{setRejectingAssignment(a);setRejectReason("");setRejectDetails("")}} className="border border-red-200 text-red-700 rounded-xl px-4 py-2.5 font-bold">REJECT</button></div>
                  </div>
                </div>
              })}
            </div>
          </section>
        )}

        {routableActive.length > 1 && (
          <section className="bg-white border-2 border-blue-100 rounded-3xl p-5 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <p className="text-xs text-blue-600 font-black uppercase tracking-wider">Multi-order navigation</p>
                <h2 className="text-xl font-black mt-1">NEXT STOP</h2>
                <p className="text-xs text-slate-500 mt-1">Live road-routing sequence for your active orders. Pickup stops stay before their related customer delivery stops.</p>
              </div>
              <button type="button" onClick={loadRoutePlan} disabled={routePlanLoading} className="border rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">{routePlanLoading ? "Calculating..." : "Refresh route"}</button>
            </div>
            {routePlanLoading && !routePlan ? (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 text-sm text-slate-500">Calculating route from your current location...</div>
            ) : routePlan?.available ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4"><p className="text-xs text-blue-700">Next stop</p><b className="block mt-1">{routePlan.nextStop?.type === "STORE" ? "Store pickup" : "Customer delivery"}</b><span className="text-sm text-slate-700">{routePlan.nextStop?.name || "—"}</span></div>
                  <div className="bg-slate-50 border rounded-2xl p-4"><p className="text-xs text-slate-500">Total distance</p><b className="block mt-1">{routePlan.totalDistanceKm != null ? `${Number(routePlan.totalDistanceKm).toFixed(2)} km` : "Unavailable"}</b></div>
                  <div className="bg-slate-50 border rounded-2xl p-4"><p className="text-xs text-slate-500">Estimated route time</p><b className="block mt-1">{routePlan.estimatedRouteMinutes != null ? `${routePlan.estimatedRouteMinutes} min` : "Unavailable"}</b></div>
                  <div className="bg-slate-50 border rounded-2xl p-4"><p className="text-xs text-slate-500">Remaining stops</p><b className="block mt-1">{Number(routePlan.remainingStops || 0)}</b></div>
                </div>
                <div className="mt-4 border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b text-xs font-black uppercase tracking-wider text-slate-500">Route sequence</div>
                  <div className="divide-y">
                    {(routePlan.stops || []).map((stop:any) => (
                      <div key={stop.id} className={`p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${stop.sequence===1 ? "bg-blue-50/50" : ""}`}>
                        <div className="flex items-start gap-3 min-w-0"><span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">{stop.sequence}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b>{stop.type === "STORE" ? "Store pickup" : "Customer delivery"}</b>{stop.sequence===1&&<span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black">NEXT STOP</span>}</div><p className="text-sm font-semibold mt-1 truncate">{stop.name || "—"}</p><p className="text-xs text-slate-500 mt-1">{stop.address || "Location coordinates available"}{stop.approximateLocation ? " · approximate delivery area" : ""}</p></div></div>
                        <div className="text-right shrink-0"><p className="text-xs text-slate-500">From previous stop</p><b>{Number(stop.distanceFromPreviousKm || 0).toFixed(2)} km · {Number(stop.estimatedFromPreviousMinutes || 0)} min</b></div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">Calculated from your current location using road-routing data. No synthetic distance or ETA values are added. Manual reordering is not enabled because the current system has no existing authorized reorder rule.</p>
              </>
            ) : (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm text-amber-800">{routePlan?.reason || "Live route data is currently unavailable."}</div>
            )}
          </section>
        )}

        {batchGroups.length > 0 && (
          <section className="bg-white border-2 border-emerald-100 rounded-3xl p-5 mb-6">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs text-emerald-600 font-black uppercase tracking-wider">Active delivery batches</p><h2 className="text-lg font-black mt-1">Route-aware delivery sequence</h2><p className="text-xs text-slate-500 mt-1">Sequence is an estimated geographical order, not a traffic-optimized route.</p></div><span className="text-xs font-bold text-slate-500">{batchGroups.length} batch{batchGroups.length===1?"":"es"}</span></div>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              {batchGroups.map(([batchId, rows]:any)=><div key={batchId} className="border rounded-2xl p-4"><div className="flex items-center justify-between gap-3"><b>{rows.length} active orders</b><span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">{batchId}</span></div><div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="font-bold">Store pickup</span>{rows.map((o:any,i:number)=><React.Fragment key={o._id}><ArrowRight size={14} className="text-slate-400"/><span>{o.user?.name||`Customer ${i+1}`}</span></React.Fragment>)}</div></div>)}
            </div>
          </section>
        )}

        <div className="bg-white border rounded-3xl overflow-hidden mb-6"><div className="p-6 border-b"><h2 className="text-xl font-bold">Replacement Deliveries</h2><p className="text-sm text-slate-500 mt-1">Only replacements explicitly assigned to your Delivery Partner ID appear here. The original order remains historical.</p></div>{replacementRequests.length?<div className="divide-y">{replacementRequests.map((r:any)=><div key={r._id} className="p-5"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><b>{r.replacementId||r.requestId||String(r._id).slice(-8).toUpperCase()}</b><p className="text-sm text-slate-600 mt-1">Request {r.requestId||"—"} · Order #{String(r.order?._id||r.order||"").slice(-8).toUpperCase()} · {r.customer?.name||"Customer"}</p><p className="text-xs text-slate-500 mt-1">{r.order?.address?.address||r.order?.address?.formattedAddress||"Historical order address"}</p><p className="text-xs text-slate-500 mt-1">Product: {r.productId?.name||r.items?.[0]?.name||"—"} · Qty {r.items?.[0]?.quantity||1} · Status: <b>{r.status}</b></p></div><div className="flex flex-wrap gap-2">{r.status==="DELIVERY_ASSIGNED"&&<button onClick={()=>updateReplacementStatus(r._id,"OUT_FOR_DELIVERY")} className="bg-blue-600 text-white rounded-xl px-4 py-2.5 font-bold">Start Delivery</button>}{["DELIVERY_ASSIGNED","OUT_FOR_DELIVERY"].includes(r.status)&&<ImagePickerButtons compact disabled={proofUploading==="replacement:"+r._id} onFile={(f)=>uploadReplacementProof(r._id,f)}/>}{r.status==="OUT_FOR_DELIVERY"&&<button disabled={!r.deliveryProof?.image} onClick={()=>updateReplacementStatus(r._id,"COMPLETED",r.deliveryProof?.image)} className="bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold disabled:opacity-40">Confirm Replacement</button>}{["DELIVERY_ASSIGNED","OUT_FOR_DELIVERY"].includes(r.status)&&<button onClick={()=>{const reason=window.prompt("Reason for replacement delivery failure")||"";if(reason.trim().length>=3)axios.patch(API+"/delivery/replacement-requests/"+r._id,{status:"FAILED",note:reason},{headers:adminHeaders()}).then(()=>loadReplacements()).catch((e:any)=>alert(e?.response?.data?.message||"Unable to mark failed"));}} className="border border-red-200 text-red-700 rounded-xl px-4 py-2.5 font-bold">Delivery Failed</button>}</div></div>{r.deliveryProof?.image&&<div className="mt-3 flex items-center gap-3"><img src={r.deliveryProof.image} alt="Replacement delivery proof" className="w-16 h-16 rounded-xl border object-cover"/><span className="text-xs text-emerald-700 font-semibold">Proof persisted · {r.deliveryProof.uploadedAt?new Date(r.deliveryProof.uploadedAt).toLocaleString("en-IN"):""}</span></div>}</div>)}</div>:<div className="p-8 text-center text-slate-500">No replacement deliveries assigned.</div>}</div>

        <div className="bg-white border rounded-3xl overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Assigned Orders</h2>
            <p className="text-sm text-slate-500 mt-1">
              When an order is Packed, follow your live location to the store pickup point. After you collect it and tap Out for Delivery, the route switches to the customer's ordered delivery address.
            </p>

            <div className="relative mt-5 max-w-2xl">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={19}
              />
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
            <div className="p-12 text-center text-slate-500">
              Loading deliveries...
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
              <button
                onClick={load}
                className="mt-4 px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {filteredActive.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Truck}
                    title={
                      search
                        ? "No matching active deliveries"
                        : "No active deliveries"
                    }
                    text={
                      search
                        ? "Try another Order ID, customer name or mobile number."
                        : "New delivery assignments will appear here."
                    }
                  />
                </div>
              ) : (
                <div className="divide-y">
                  {filteredActive.map((o) => {
                    const orderPickup = pickupByOrder[String(o._id)] ?? pickupLocation;
                    const customer = o.user || {};
                    const address = o.address || {};
                    const destination = getDestination(o);

                    return (
                      <div key={o._id} className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                          <div className="space-y-3 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <b>#{String(o._id).slice(-8)}</b>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass(
                                  o.status
                                )}`}
                              >
                                {o.status}
                              </span>
                              <span className="text-sm text-slate-500">
                                {money(o.total)}
                              </span>
                              {o.deliveryBatchId && <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-black">BATCH · {String(o.deliveryBatchId).slice(-10)}</span>}
                            </div>

                            <div>
                              <p className="font-semibold">
                                {customer.name || "Customer"}
                              </p>
                              <p className="text-sm text-slate-500">
                                {customer.phone ||
                                  customer.email ||
                                  "No contact details"}
                              </p>
                              {customer.phone && <a href={`tel:${String(customer.phone).replace(/[^0-9+]/g,"")}`} className="mt-2 inline-flex items-center gap-2 text-emerald-700 font-bold text-sm border border-emerald-200 rounded-xl px-3 py-2"><Truck size={15}/> Call Customer</a>}
                            </div>

                            <div className="text-sm text-slate-600">
                              <p className="font-semibold text-slate-800">
                                Delivery address
                              </p>
                              <p>
                                {address.address ||
                                  address.line1 ||
                                  "Address not available"}
                              </p>
                              <p>
                                {[
                                  address.city,
                                  address.state,
                                  address.pincode,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </div>

                            {pickupLoading ? (
                              <div className="mt-5 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-500">
                                Loading pickup location...
                              </div>
                            ) : orderPickup && (o.status === "Packed" || destination) ? (
                              <DeliveryRouteMap
                                origin={myLocation || orderPickup}
                                destination={o.status === "Packed" ? orderPickup : destination!}
                                originLabel={myLocation ? "Your live location" : "Pickup Store"}
                                destinationLabel={o.status === "Packed" ? "Pickup Store" : ((destination as any)?.approximate ? "Customer area (approx.)" : "Customer")} waypoint={o.status === "Out for Delivery" && orderPickup ? orderPickup : undefined} waypointLabel="Store" orderId={String(o?._id||"")}
                              />
                            ) : (
                              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-amber-900">
                                      Map location unavailable
                                    </p>
                                    <p className="text-xs text-amber-800 mt-1">
                                      {orderPickup
                                        ? "This order does not yet have a map destination for the ordered address. The customer does not need to be physically present there; the delivery destination is the address entered for this order."
                                        : "Pickup store coordinates are not configured on the server."}
                                    </p>
                                  </div>

                                  {orderPickup &&
                                    destination === null &&
                                    address.address && (
                                      <span className="text-xs text-amber-800 font-semibold">
                                        The destination is based on the ordered address and pincode. If it cannot be located automatically, the customer should add a map pin.
                                      </span>
                                    )}
                                </div>


                              </div>
                            )}

                            <p className="text-sm">
                              <span className="font-semibold">Delivery Earnings:</span> {money(Number(o.deliveryPayout || 0))}
                            </p>
                            <p className="text-sm">
                              <span className="font-semibold">Payment:</span>{" "}
                              {o.paymentMethod || "COD"}
                            </p>

                            {["COD", "ONLINE"].includes(o.paymentMethod || "COD") &&
                              o.status === "Out for Delivery" && (
                                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="font-bold text-amber-900">
                                        {o.paymentMethod === "ONLINE" ? "Store UPI Payment" : "COD Payment"}
                                      </p>
                                      <p className="text-sm text-amber-800 mt-1">
                                        Payment status:{" "}
                                        <b>
                                          {o.paymentStatus === "Paid"
                                            ? "Paid"
                                            : "Pending"}
                                        </b>
                                      </p>
                                    </div>

                                    {o.paymentStatus !== "Paid" && (
                                      <button onClick={()=>createPaymentSession(String(o._id))} className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold">
                                        {paymentSessionByOrder[String(o._id)] ? "Show Dynamic QR Again" : "Show Payment QR"}
                                      </button>
                                    )}

                                    {o.paymentStatus !== "Paid" && (
                                      <span className="text-xs text-amber-800 max-w-xs">QR amount is generated from the server order total. Opening/scanning it does not mark payment successful; provider verification is required.</span>
                                    )}

                                    {o.paymentStatus !== "Paid" && o.paymentMethod !== "ONLINE" && (
                                      <button disabled={paymentUpdating === o._id} onClick={() => markPaymentReceived(o._id)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50">
                                        {paymentUpdating === o._id ? "Saving..." : "Cash Received"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {(o.status === "Out for Delivery" || o.status === "Delivered") && <DeliveryChat store={store} order={o} compact />}
                            {o.status === "Out for Delivery" && <DeliveryLocationShare store={store} order={o} compact />}
                            {destination && orderPickup && (
                              <button
                                type="button"
                                onClick={() =>
                                  openNavigation(
                                    orderPickup,
                                    destination
                                  )
                                }
                                className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50 font-semibold inline-flex items-center gap-2"
                              >
                                <MapPin size={16} />
                                Navigate
                              </button>
                            )}

                            {o.status === "Packed" && (o.deliveryAssignmentStatus === "ACCEPTED" || !o.deliveryAssignmentStatus) && (
                              <button
                                onClick={() =>
                                  handleOutForDelivery(o._id)
                                }
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
                              >
                                Out for Delivery
                              </button>
                            )}

                            {o.status === "Out for Delivery" && (
                              <>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button type="button" onClick={() => { setNotAvailableOrder(o); setNotAvailableReason(""); setNotAvailableNote(""); setNotAvailableEvidence(""); }} className="px-3 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 font-bold text-xs">Customer Not Available</button>
                                  <ImagePickerButtons compact disabled={proofUploading===o._id} onFile={(f)=>uploadDeliveryProof(o._id,f)}/>
                                  {o.deliveryProof?.image && (
                                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                                      <img src={o.deliveryProof.image} alt="Delivery proof" className="w-14 h-14 rounded-lg object-cover border"/>
                                      <div>
                                        <p className="text-sm font-bold text-emerald-800">✓ Delivery proof uploaded</p>
                                        <p className="text-xs text-emerald-700">Ready to confirm delivery.</p>
                                        <p className="text-[11px] text-slate-500 mt-1">
                                          {o.deliveryProof?.uploadedAt ? `Captured ${new Date(o.deliveryProof.uploadedAt).toLocaleString("en-IN")}` : "Timestamp recorded"}
                                        </p>
                                        {o.deliveryProof?.latitude != null && o.deliveryProof?.longitude != null ? (
                                          <p className="text-[11px] text-slate-500 mt-0.5">
                                            GPS {Number(o.deliveryProof.latitude).toFixed(6)}, {Number(o.deliveryProof.longitude).toFixed(6)}{o.deliveryProof?.locationAccuracy != null ? ` · ±${Math.round(Number(o.deliveryProof.locationAccuracy))} m` : ""}
                                          </p>
                                        ) : (
                                          <p className="text-[11px] text-amber-700 mt-0.5">GPS not captured with this proof</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button
                                  disabled={proofUploading === o._id || !o.deliveryProof?.image}
                                  onClick={async () => {
                                    if (proofUploading === o._id || !o.deliveryProof?.image) {
                                      if (!o.deliveryProof?.image) alert("Upload delivery proof before completing delivery.");
                                      return;
                                    }
                                    if (window.confirm("Confirm that the order has been handed over to the customer?")) {
                                      await updateStatus(o._id, "Delivered");
                                    }
                                  }}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {proofUploading === o._id ? "Uploading..." : "Confirm Delivery"}
                                </button>
                              </>
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
                    <p className="text-sm text-slate-500 mt-1">
                      Successfully delivered orders assigned to you.
                    </p>
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
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass(
                                    o.status
                                  )}`}
                                >
                                  Delivered
                                </span>
                                <span className="text-sm text-slate-500">
                                  {money(o.total)}
                                </span>
                              </div>

                              <div>
                                <p className="font-semibold">
                                  {customer.name || "Customer"}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {customer.phone ||
                                    customer.email ||
                                    "No contact details"}
                                </p>
                              </div>

                              <div className="text-sm text-slate-600">
                                <p className="font-semibold text-slate-800">
                                  Delivery address
                                </p>
                                <p>
                                  {address.address ||
                                    address.line1 ||
                                    "Address not available"}
                                </p>
                                <p>
                                  {[
                                    address.city,
                                    address.state,
                                    address.pincode,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              </div>

                              <div className="text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">
                                  Delivered:
                                </span>{" "}
                                {deliveredAt(o)}
                              </div>

                              <p className="text-sm">
                                <span className="font-semibold">
                                  Payment:
                                </span>{" "}
                                {o.paymentMethod || "COD"}
                              </p>
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

        {notAvailableOrder && (
          <div className="fixed inset-0 z-[155] bg-black/50 p-4 grid place-items-center">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-red-600 font-black uppercase tracking-wider">Delivery attempt</p><h2 className="text-2xl font-black mt-1">Customer Not Available</h2><p className="text-sm text-slate-500 mt-2">Order #{String(notAvailableOrder._id || "").slice(-8).toUpperCase()}</p></div><button type="button" onClick={() => { if (!notAvailableSubmitting) setNotAvailableOrder(null); }} disabled={notAvailableSubmitting}><X/></button></div>
              <label className="block text-sm font-semibold mt-5">Reason<span className="text-red-500"> *</span><select value={notAvailableReason} onChange={e => setNotAvailableReason(e.target.value)} disabled={notAvailableSubmitting} className="mt-2 w-full border rounded-xl p-3"><option value="">Select reason</option>{["Customer not reachable","Customer requested later","No response at door","Access/gate issue","Address/access issue","Other"].map(x => <option key={x} value={x}>{x}</option>)}</select></label>
              <label className="block text-sm font-semibold mt-4">Note{notAvailableReason === "Other" && <span className="text-red-500"> *</span>}<textarea value={notAvailableNote} onChange={e => setNotAvailableNote(e.target.value)} disabled={notAvailableSubmitting} maxLength={2000} className="mt-2 w-full border rounded-xl p-3 min-h-28" placeholder="Describe what happened at the delivery location..."/></label>
              <div className="mt-4"><p className="text-sm font-semibold mb-2">Evidence (optional)</p><ImagePickerButtons compact disabled={notAvailableSubmitting} onFile={prepareNotAvailableEvidence}/>{notAvailableEvidence && <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 p-3"><img src={notAvailableEvidence} alt="Customer not available evidence" className="w-16 h-16 rounded-lg object-cover border"/><span className="text-xs text-emerald-700 font-semibold">Evidence selected.</span><button type="button" onClick={() => setNotAvailableEvidence("")} className="ml-auto text-xs font-bold text-red-600">Remove</button></div>}</div>
              <div className="mt-5 rounded-2xl bg-slate-50 border p-4 text-xs text-slate-600">This records the attempt number, reason, note and your current GPS location when available. The customer and authorized admins will be notified. The order is not automatically cancelled or refunded.</div>
              <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setNotAvailableOrder(null)} disabled={notAvailableSubmitting} className="px-4 py-2.5 rounded-xl border font-bold disabled:opacity-50">Cancel</button><button type="button" onClick={() => recordCustomerNotAvailable(String(notAvailableOrder._id), notAvailableReason, notAvailableNote, notAvailableEvidence)} disabled={notAvailableSubmitting || !notAvailableReason} className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50">{notAvailableSubmitting ? "Recording..." : "Record Attempt"}</button></div>
            </div>
          </div>
        )}

        {rejectingAssignment && (
          <div className="fixed inset-0 z-[160] bg-black/50 p-4 grid place-items-center">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-red-600 font-black uppercase tracking-wider">Reject Delivery Assignment</p><h2 className="text-2xl font-black mt-1">Why can't you take this order?</h2></div><button onClick={()=>setRejectingAssignment(null)}><X/></button></div>
              <p className="text-sm text-slate-500 mt-3">Order #{String(rejectingAssignment.order?._id||"").slice(-8).toUpperCase()}</p>
              <label className="block text-sm font-semibold mt-5">Reason<span className="text-red-500"> *</span><select value={rejectReason} onChange={e=>setRejectReason(e.target.value)} className="mt-2 w-full border rounded-xl p-3"><option value="">Select reason</option>{["Too far","Already handling another order","Vehicle issue","Personal emergency","Unable to reach store","Unable to deliver in required time","Technical issue","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="block text-sm font-semibold mt-4">Additional details{rejectReason==="Other"&&<span className="text-red-500"> *</span>}<textarea value={rejectDetails} onChange={e=>setRejectDetails(e.target.value)} className="mt-2 w-full border rounded-xl p-3 min-h-24" placeholder="Optional details"/></label>
              <div className="flex justify-end gap-2 mt-5"><button onClick={()=>setRejectingAssignment(null)} className="border rounded-xl px-4 py-2.5 font-bold">Cancel</button><button onClick={submitAssignmentRejection} className="bg-red-600 text-white rounded-xl px-4 py-2.5 font-bold">Reject Assignment</button></div>
            </div>
          </div>
        )}
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
  const [products, setProducts] = useState<any[]>([]);
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
  const [defaultRefundAvailable, setDefaultRefundAvailable] = useState(true);
  const [defaultReplacementAvailable, setDefaultReplacementAvailable] = useState(true);
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
    setDefaultRefundAvailable(true);
    setDefaultReplacementAvailable(true);
    setEditing(null);
  };

  const save = async () => {
    if (name.trim().length < 2) return alert("Category name is required.");
    setSaving(true);
    try {
      const payload = { name: name.trim(), image: image.trim(), defaultRefundAvailable, defaultReplacementAvailable };
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

  // The backend is authoritative: Main Admin can manage the main/legacy catalog,
  // while Store Admins can manage only their own tenant categories.
  const canEdit = (c: any) => c?.canEdit === true;

  const toggle = async (c: any) => {
    if (!canEdit(c)) return alert("You can only edit categories created by your admin account.");
    try {
      const r = await axios.put(API + "/admin/categories/" + c._id, { isActive: !c.isActive }, { headers: adminHeaders() });
      setCategories(categories.map((x) => x._id === c._id ? r.data.data : x));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to change category status.");
    }
  };

  const remove = async (c: any) => {
    if (!canEdit(c)) return alert("You can only delete categories created by your admin account.");
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
          <div className="grid sm:grid-cols-2 gap-2 mt-3">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={defaultRefundAvailable} onChange={e=>setDefaultRefundAvailable(e.target.checked)}/> Default refund available</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={defaultReplacementAvailable} onChange={e=>setDefaultReplacementAvailable(e.target.checked)}/> Default replacement available</label>
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
                  <p className="text-xs text-slate-400 mt-1">{c.isActive ? "Visible in store" : "Hidden from store"} · {canEdit(c) ? "Created by you" : "Created by another admin"}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.isActive ? "Active" : "Inactive"}</span>
                <div className="flex gap-2">
                  <button disabled={!canEdit(c)} onClick={() => { if (canEdit(c)) { setEditing(c); setName(c.name || ""); setImage(c.image || ""); setDefaultRefundAvailable(c.defaultRefundAvailable !== false); setDefaultReplacementAvailable(c.defaultReplacementAvailable !== false); } }} className="border px-3 py-2 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Edit</button>
                  <button disabled={!canEdit(c)} onClick={() => toggle(c)} className="border px-3 py-2 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed">{c.isActive ? "Disable" : "Enable"}</button>
                  <button disabled={!canEdit(c)} onClick={() => remove(c)} className="border border-red-200 text-red-600 px-3 py-2 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Delete</button>
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
  const [photoLoading, setPhotoLoading] = useState(false);
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
  const [partners,setPartners]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:"",email:"",phone:"",password:"",serviceArea:"",profilePhoto:""});
  const [error,setError]=useState("");

  const load=async()=>{
    setLoading(true);setError("");
    try{const r=await axios.get(API+"/admin/delivery-partners",{headers:adminHeaders()});setPartners(r.data.data||[]);}
    catch(e:any){setError(e?.response?.data?.message||"Unable to load delivery partners.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{load(); const timer=window.setInterval(load,30000); return ()=>window.clearInterval(timer);},[]);
  useDeliveryRealtime((event:any)=>{
    if(!event?.partnerId)return;
    setPartners(current=>current.map(p=>String(p._id)===String(event.partnerId)?{...p,...event,locationUpdatedAt:event.updatedAt||event.locationUpdatedAt}:p));
  },undefined,true);

  const create=async()=>{
    if(!form.name.trim()||!form.email.trim()||!form.password)return alert("Name, email and password are required.");
    if(form.password.length<8)return alert("Password must be at least 8 characters.");
    setSaving(true);
    try{
      const r=await axios.post(API+"/admin/delivery-partners",form,{headers:adminHeaders()});
      alert("Delivery partner created successfully. They must log in and grant location permission before live tracking starts.");
      setForm({name:"",email:"",phone:"",password:"",serviceArea:"",profilePhoto:""});
      await load();
      return r;
    }catch(e:any){alert(e?.response?.data?.message||"Unable to create delivery partner.");}
    finally{setSaving(false);}
  };
  const updateStatus=async(id:string,blocked:boolean)=>{
    try{await axios.patch(API+"/admin/delivery-partners/"+id+"/status",{blocked},{headers:adminHeaders()});await load();}
    catch(e:any){alert(e?.response?.data?.message||"Unable to update delivery partner.");}
  };
  const remove=async(id:string,name:string)=>{
    if(!window.confirm(`Delete delivery partner ${name}? This cannot be undone.`))return;
    try{await axios.delete(API+"/admin/delivery-partners/"+id,{headers:adminHeaders()});alert("Delivery partner deleted successfully.");await load();}
    catch(e:any){alert(e?.response?.data?.message||"Unable to delete delivery partner.");}
  };
  const freshness=(x:any)=>{if(!x)return null;const age=Math.max(0,Math.round((Date.now()-new Date(x).getTime())/1000));return age<=120?`Updated ${age}s ago`:`Last updated ${Math.round(age/60)} min ago`;};

  return <div className="space-y-5">
    <div><p className="text-emerald-600 text-sm font-bold">TEAM MANAGEMENT</p><h2 className="text-2xl font-bold">Delivery Partners</h2><p className="text-sm text-slate-500 mt-1">Live operational location, availability and delivery status are shown from the partner device. No location is invented or hardcoded.</p></div>

    <div className="bg-white border rounded-3xl p-6">
      <h3 className="font-bold text-lg">Create delivery account</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        <label className="text-sm font-semibold">Full name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Delivery partner name" className="mt-2 w-full border rounded-xl p-3"/></label>
        <label className="text-sm font-semibold">Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="delivery@example.com" className="mt-2 w-full border rounded-xl p-3"/></label>
        <label className="text-sm font-semibold">Mobile<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="10-digit mobile" className="mt-2 w-full border rounded-xl p-3"/></label>
        <label className="text-sm font-semibold">Login password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Minimum 8 characters" className="mt-2 w-full border rounded-xl p-3"/></label>
        <label className="text-sm font-semibold">Service / coverage area<input value={form.serviceArea} onChange={e=>setForm({...form,serviceArea:e.target.value})} placeholder="Optional: localities, cities or PIN codes" className="mt-2 w-full border rounded-xl p-3"/></label>
        <div><p className="text-sm font-semibold">Profile photo</p><div className="mt-2"><ImagePickerButtons compact onFile={(f)=>{if(!f.type.startsWith("image/"))return alert("Only image files are allowed.");if(f.size>700*1024)return alert("Photo must be 700 KB or smaller.");const r=new FileReader();r.onload=()=>setForm(v=>({...v,profilePhoto:String(r.result||"")}));r.readAsDataURL(f)}}/></div>{form.profilePhoto&&<img src={form.profilePhoto} className="mt-2 w-16 h-16 rounded-xl object-cover border" alt="Preview"/>}</div>
      </div>
      <button disabled={saving} onClick={create} className="mt-5 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{saving?"Creating...":"Create delivery account"}</button>
    </div>

    <div className="bg-white border rounded-3xl overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between"><b>{partners.length} delivery partners</b><button onClick={load} className="text-sm text-emerald-700 font-semibold">Refresh</button></div>
      {loading?<div className="p-10 text-center text-slate-500">Loading delivery partners...</div>:error?<div className="p-6"><PageError message={error} onRetry={load}/></div>:partners.length?<div className="divide-y">
        {partners.map((p:any)=>{
          const fresh=p.locationUpdatedAt && Date.now()-new Date(p.locationUpdatedAt).getTime()<=120000;
          return <div key={p._id} className="p-5">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border bg-slate-50 grid place-items-center shrink-0">{p.profilePhoto?<img src={p.profilePhoto} alt={p.name} className="w-full h-full object-cover"/>:<Truck size={23} className="text-slate-300"/>}</div>
                <div className="min-w-0"><b className="text-lg">{p.name}</b><p className="text-sm text-slate-500">{p.employeeId||"—"} · {p.email} {p.phone?`· ${p.phone}`:""}</p><p className="text-xs text-slate-400 mt-1">Coverage: {p.serviceArea||"Not configured"}</p>
                  <div className="flex flex-wrap gap-2 mt-2"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.blocked?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{p.blocked?"BLOCKED":"ACTIVE"}</span><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.onlineStatus==="ONLINE"?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{p.onlineStatus||"OFFLINE"}</span><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">{p.availabilityStatus||"AVAILABLE"}</span><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${fresh?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-800"}`}>{fresh?"LIVE":"LOCATION UNAVAILABLE / STALE"}</span></div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm xl:min-w-[460px]">
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-xs text-slate-500">Current location</span><p className="font-semibold mt-1">{isValidCoordinate(p.latitude,p.longitude)&&fresh?`${Number(p.latitude).toFixed(6)}, ${Number(p.longitude).toFixed(6)}`:"Location unavailable"}</p><p className="text-xs text-slate-400 mt-1">{freshness(p.locationUpdatedAt)||"No location update yet"}{p.locationAccuracy!=null?` · ±${Math.round(Number(p.locationAccuracy))}m`:""}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-xs text-slate-500">Current order</span><p className="font-semibold mt-1">{p.currentOrderId?`#${String(p.currentOrderId).slice(-8).toUpperCase()}`:"None"}</p><p className="text-xs text-slate-400 mt-1">Permission: {p.locationPermissionStatus||"unknown"}</p></div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0"><button onClick={()=>updateStatus(p._id,!p.blocked)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${p.blocked?"border-emerald-200 text-emerald-700":"border-amber-200 text-amber-700"}`}>{p.blocked?"Activate":"Block"}</button><button onClick={()=>remove(p._id,p.name)} className="px-3 py-2 rounded-lg text-xs font-bold border border-red-200 text-red-600">Delete</button></div>
            </div>
          </div>
        })}
      </div>:<EmptyState icon={Truck} title="No delivery partners" text="Create your first delivery account above."/>}
    </div>
  </div>;
}

function IdentityQr({ value }: { value: string }) {
  const [failed, setFailed] = useState(false);
  const verificationUrl = value ? `${window.location.origin}/verify/employee/${encodeURIComponent(value)}` : "";
  const qrUrl = verificationUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=18&ecc=H&data=${encodeURIComponent(verificationUrl)}` : "";
  useEffect(() => setFailed(false), [value]);
  return <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-200 grid place-items-center shrink-0">
    {qrUrl && !failed ? <img src={qrUrl} alt="Scan to verify FreshBasket employee identity" className="w-full h-full object-contain" onError={() => setFailed(true)} referrerPolicy="no-referrer" /> : <div className="text-center text-[10px] font-bold text-red-600 px-2">QR unavailable</div>}
  </div>;
}

const IDENTITY_CARD_TYPE_LABELS: Record<string, string> = {
  delivery: "DELIVERY PARTNER",
  "store-admin": "STORE ADMIN",
  "customer-care": "CUSTOMER CARE",
  "finance-manager": "FINANCE MANAGER",
  "finance-executive": "FINANCE EXECUTIVE",
  "main-admin": "MAIN ADMIN",
  "sub-admin": "SUB ADMIN",
  "operations-executive": "OPERATIONS EXECUTIVE",
  "ecommerce-marketplace-executive": "E-COMMERCE / MARKETPLACE",
  "inventory-warehouse-executive": "INVENTORY / WAREHOUSE",
  "sales-business-development-executive": "SALES / BUSINESS DEVELOPMENT",
  "marketing-executive": "MARKETING EXECUTIVE",
  "technology-it-employee": "TECHNOLOGY / IT",
  "hr-administration": "HUMAN RESOURCES / ADMINISTRATION",
  employee: "COMPANY EMPLOYEE",
};

function ProfessionalIdCard({ card, printId = "fb-id-card-print" }: { card: any; printId?: string }) {
  const typeLabel = IDENTITY_CARD_TYPE_LABELS[String(card.holderType || "")] || "COMPANY EMPLOYEE";
  const issue = card.issueDate ? new Date(card.issueDate).toLocaleDateString("en-IN") : "N/A";
  const expiry = card.expiryDate ? new Date(card.expiryDate).toLocaleDateString("en-IN") : "N/A";
  const status = String(card.currentStatus || card.status || "active").toUpperCase() === "REVOKED" ? "REVOKED" : String(card.currentStatus || card.status || "active").toUpperCase() === "EXPIRED" ? "EXPIRED" : String(card.currentStatus || card.status || "active").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  return <div id={printId} className="w-[420px] max-w-full min-h-[690px] bg-white rounded-[30px] overflow-hidden border border-emerald-100 shadow-xl text-slate-900 relative">
    <div className="h-24 bg-emerald-600 text-white p-5 relative overflow-hidden">
      <div className="absolute -right-10 -top-16 w-44 h-44 rounded-full bg-emerald-500/40" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-white text-emerald-700 grid place-items-center"><Leaf size={24}/></div><div><div className="font-black text-xl leading-none">FreshBasket</div><div className="text-[9px] font-bold uppercase tracking-[0.18em] mt-1 opacity-90">Official Employee ID Card</div></div></div>
        <span className="bg-white/95 text-emerald-700 rounded-full px-2.5 py-1 text-[9px] font-black">EMPLOYEE</span>
      </div>
    </div>
    <div className="p-5">
      <div className="flex gap-4 items-start">
        <div className="w-28 h-32 shrink-0 rounded-2xl bg-slate-50 border-2 border-emerald-100 overflow-hidden grid place-items-center">{card.photo ? <img src={card.photo} alt={card.name} className="w-full h-full object-cover"/> : <User size={42} className="text-slate-300"/>}</div>
        <div className="min-w-0 flex-1"><div className="text-[9px] uppercase font-bold tracking-widest text-emerald-700">Authorized FreshBasket Team Member</div><div className="font-black text-2xl leading-tight break-words mt-1">{card.name || "N/A"}</div><div className="font-bold text-sm text-slate-600 mt-1 break-words">{card.designation || "N/A"}</div><div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700"><BadgeCheck size={12}/> {typeLabel}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        {[['Employee ID',card.employeeId||'N/A'],['Department',card.department||'N/A'],['Store / Branch',card.storeAdmin?.name||'N/A'],['Mobile',card.phone||'N/A'],['Email',card.email||'N/A'],['Emergency',card.emergencyContact||'N/A']].map(([label,value])=><div key={label as string} className="min-w-0"><div className="text-[8px] uppercase font-bold tracking-widest text-slate-400">{label}</div><div className="font-semibold text-[11px] break-words mt-0.5">{value}</div></div>)}
      </div>
      <div className="mt-3"><div className="text-[8px] uppercase font-bold tracking-widest text-slate-400">Residential / Official Address</div><div className="font-semibold text-[11px] leading-4 break-words mt-0.5">{card.address || "N/A"}</div></div>
      <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex gap-4 items-center">
        <IdentityQr value={card.verificationToken || ""}/><div className="min-w-0"><div className="font-black text-sm text-slate-900">SCAN TO VERIFY</div><p className="text-[10px] leading-4 text-slate-500 mt-1">Official FreshBasket Employee Verification</p><div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ${status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}><span>●</span>{status}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 text-[10px]"><div><b>Issued:</b> {issue}</div><div><b>Valid Until:</b> {expiry}</div></div>
      <div className="mt-4 pt-3 border-t border-slate-100 text-[9px] text-slate-500 leading-4"><b className="text-slate-700">Property of FreshBasket.</b> Valid only while active in the FreshBasket system.<br/>Please verify this ID before granting access.</div>
    </div>
  </div>;
}

function EmployeeVerificationPage() {
  const { token = "" } = useParams();
  const [state, setState] = useState<any>({ loading: true, data: null, error: "" });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get(API + "/public/employee-verification/" + encodeURIComponent(token));
        if (!cancelled) setState({ loading: false, data: r.data.data, error: "" });
      } catch (e: any) {
        if (!cancelled) setState({ loading: false, data: null, error: e?.response?.data?.message || "Unable to verify this employee ID." });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);
  if (state.loading) return <div className="min-h-screen bg-slate-50 grid place-items-center p-5"><div className="bg-white rounded-3xl border shadow-xl p-8 text-center"><RefreshCw className="mx-auto animate-spin text-emerald-600"/><p className="font-bold mt-4">Verifying FreshBasket employee ID...</p></div></div>;
  if (state.error || !state.data) return <div className="min-h-screen bg-slate-50 grid place-items-center p-5"><div className="w-full max-w-md bg-white rounded-3xl border shadow-xl p-8 text-center"><div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 grid place-items-center"><X size={28}/></div><h1 className="text-2xl font-black mt-4">✕ INVALID EMPLOYEE ID</h1><p className="text-sm text-slate-500 mt-2">{state.error || "Unable to verify this employee ID."}</p></div></div>;
  const d = state.data; const e = d.employee || {};
  const valid = d.status === "ACTIVE";
  return <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 p-5"><div className="max-w-2xl mx-auto"><div className="bg-white rounded-[32px] border shadow-2xl overflow-hidden"><div className="bg-emerald-600 text-white p-6 flex items-center gap-3"><div className="w-12 h-12 bg-white text-emerald-700 rounded-2xl grid place-items-center"><Leaf size={27}/></div><div><div className="font-black text-2xl">FreshBasket</div><div className="text-xs font-bold tracking-widest uppercase">Employee Verification</div></div></div><div className="p-6 sm:p-8">
    <div className={`rounded-2xl p-4 border ${valid ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}><div className="font-black text-lg">{valid ? "✓ VERIFIED FRESHBASKET EMPLOYEE" : d.status === "EXPIRED" ? "⚠ ID CARD EXPIRED" : "✕ ID CARD INVALID / INACTIVE"}</div><div className="text-xs font-bold mt-1">Status: {d.status}</div></div>
    <div className="flex gap-5 mt-7 items-start">{e.photo ? <img src={e.photo} alt={e.name} className="w-28 h-32 rounded-2xl object-cover border"/> : <div className="w-28 h-32 rounded-2xl bg-slate-100 grid place-items-center"><User className="text-slate-300" size={44}/></div>}<div><h1 className="text-2xl font-black break-words">{e.name || "N/A"}</h1><p className="font-bold text-slate-600 mt-1">{e.designation || "N/A"}</p><p className="text-sm text-slate-500 mt-2">Employee ID: <b>{e.employeeId || "N/A"}</b></p></div></div>
    <div className="grid sm:grid-cols-2 gap-4 mt-7">{[['Department',e.department],['Store / Branch',e.storeBranch],['Official Email',e.email],['Official Mobile',e.phone],['Issued Date',e.issuedDate ? new Date(e.issuedDate).toLocaleDateString("en-IN") : "N/A"],['Valid Until',e.validUntil ? new Date(e.validUntil).toLocaleDateString("en-IN") : "N/A"]].map(([label,value])=><div key={label as string} className="border rounded-2xl p-4"><div className="text-[9px] uppercase font-bold tracking-widest text-slate-400">{label}</div><div className="font-semibold text-sm mt-1 break-words">{value || "N/A"}</div></div>)}</div>
    <div className="mt-5 border rounded-2xl p-4"><div className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Verification timestamp</div><div className="font-semibold text-sm mt-1">{d.verificationTimestamp ? new Date(d.verificationTimestamp).toLocaleString("en-IN") : "N/A"}</div></div>
    <p className="text-xs text-slate-500 mt-6 leading-5">This verification result is fetched from the FreshBasket backend. The QR code does not contain employee credentials or private account information.</p>
  </div></div></div></div>;
}

function MainAdminIdCardGenerator() {
  const [cards, setCards] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [form, setForm] = useState<any>({ holderType: "", sourceId: "", name: "", email: "", phone: "", employeeId: "", designation: "", department: "", address: "", emergencyContact: "", photo: "", storeAdminId: "", expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10) });

  const load = async () => {
    setLoading(true);
    try {
      const [c, a, p, ic] = await Promise.all([
        axios.get(API + "/admin/identity-cards", { headers: adminHeaders() }),
        axios.get(API + "/admin/admins", { headers: adminHeaders() }),
        axios.get(API + "/admin/delivery-partners", { headers: adminHeaders() }),
        axios.get(API + "/admin/identity-card-accounts", { headers: adminHeaders() }),
      ]);
      setCards(c.data.data || []); setAdmins(a.data.data || []); setPartners(p.data.data || []); setAccounts(ic.data.data || []);
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to load identity card data."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const linkedAccountRoles: Record<string, string> = { delivery: "delivery", "store-admin": "admin", "main-admin": "admin", "sub-admin": "admin", "customer-care": "customer_care", "finance-manager": "finance_manager", "finance-executive": "finance_executive" };
  const linkedAccountTypes = new Set(Object.keys(linkedAccountRoles));

  const chooseSource = (id: string) => {
    setForm((f: any) => {
      const expectedRole = linkedAccountRoles[String(f.holderType)];
      const list = expectedRole ? (f.holderType === "delivery" ? partners : accounts.filter((x:any) => String(x.role) === expectedRole)) : [];
      const person = list.find((x: any) => String(x._id) === String(id));
      if (!person) return { ...f, sourceId: id };
      const meta:any = {
        delivery: ["Delivery Partner", "Logistics & Delivery"],
        "store-admin": ["Store Admin", "Store Operations"],
        "customer-care": ["Customer Care Executive", "Customer Support"],
        "finance-manager": ["Finance Manager", "Finance"],
        "finance-executive": ["Finance Executive", "Finance"],
      };
      const [designation, department] = meta[f.holderType] || ["Employee", person.department || ""];
      return { ...f, sourceId: id, name: person.name || "", email: person.email || "", phone: person.phone || "", employeeId: person.employeeId || "", photo: person.profilePhoto || "", storeAdminId: person.role === "admin" ? person._id : (person.storeAdmin || ""), designation, department: person.department || department };
    });
  };

  const changeType = (holderType: string) => {
    const defaults:any = {
      delivery: ["Delivery Partner", "Logistics & Delivery"],
      "store-admin": ["Store Admin", "Store Operations"],
      "customer-care": ["Customer Care Executive", "Customer Support"],
      "finance-manager": ["Finance Manager", "Finance"],
      "finance-executive": ["Finance Executive", "Finance"],
      "main-admin": ["Main Admin", "Administration"],
      "sub-admin": ["Sub Admin", "Administration"],
      "operations-executive": ["Operations Executive", "Operations"],
      "ecommerce-marketplace-executive": ["E-commerce / Marketplace Executive", "E-commerce & Marketplace"],
      "inventory-warehouse-executive": ["Inventory / Warehouse Executive", "Inventory & Warehouse"],
      "sales-business-development-executive": ["Sales / Business Development Executive", "Sales & Business Development"],
      "marketing-executive": ["Marketing Executive", "Marketing"],
      "technology-it-employee": ["Technology / IT Employee", "Technology & IT"],
      "hr-administration": ["Human Resources / Administration", "Human Resources & Administration"],
      employee: ["Employee", ""],
    };
    const [designation, department] = defaults[holderType] || defaults.employee;
    setForm((f: any) => ({ ...f, holderType, sourceId: "", name: "", email: "", phone: "", employeeId: "", designation, department }));
  };

  const photo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return alert("Please select a JPG, PNG or WebP image file.");
    if (file.size > 700 * 1024) return alert("Please use a photo smaller than 700 KB.");
    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = () => { setForm((f: any) => ({ ...f, photo: String(reader.result || "") })); setPhotoLoading(false); };
    reader.onerror = () => { setPhotoLoading(false); alert("Unable to read the selected photo."); };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!String(form.holderType || "").trim()) return alert("Please select an employee type.");
    if (!form.name.trim() || !form.designation.trim()) return alert("Name and designation are required.");
    if (linkedAccountTypes.has(String(form.holderType)) && !form.sourceId) return alert("Select the existing account.");
    setSaving(true);
    try {
      const r = await axios.post(API + "/admin/identity-cards", { ...form, sourceId: form.sourceId }, { headers: adminHeaders() });
      const card = r.data.data; setCards((x) => [card, ...x]); setSelectedCard(card); alert("Professional ID card generated successfully.");
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to generate ID card."); }
    finally { setSaving(false); }
  };

  const revokeCard = async (card: any) => {
    if (card.status !== "active") return;
    if (!confirm(`Revoke identity card ${card.cardNumber}?`)) return;
    try {
      const r = await axios.patch(API + "/admin/identity-cards/" + card._id + "/revoke", {}, { headers: adminHeaders() });
      const updated = r.data.data;
      setCards(list => list.map(x => String(x._id) === String(card._id) ? updated : x));
      if (selectedCard && String(selectedCard._id) === String(card._id)) setSelectedCard(updated);
      alert("Identity card revoked.");
    } catch (e:any) { alert(e?.response?.data?.message || "Unable to revoke identity card."); }
  };

  const printCard = (card: any) => {
    setSelectedCard(card);
    setTimeout(() => {
      const source = document.getElementById("fb-id-card-print");
      if (!source) return window.print();
      const printCopy = source.cloneNode(true) as HTMLElement;
      printCopy.id = "fb-id-card-print-only";
      document.body.appendChild(printCopy);
      const cleanup = () => {
        printCopy.remove();
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      window.print();
      setTimeout(cleanup, 5000);
    }, 1000);
  };

  return <div className="space-y-5">
    <style>{`@media print { html, body { margin:0 !important; padding:0 !important; width:100% !important; height:100% !important; overflow:hidden !important; background:#fff !important; } body * { visibility:hidden !important; } #fb-id-card-print-only, #fb-id-card-print-only * { visibility:visible !important; } #fb-id-card-print-only { position:fixed !important; left:50% !important; top:50% !important; transform:translate(-50%,-50%) !important; width:420px !important; min-width:420px !important; max-width:420px !important; min-height:690px !important; height:auto !important; margin:0 !important; box-shadow:none !important; border-radius:30px !important; } @page { size:A4 portrait; margin:0; } }`}</style>
    <div><p className="text-emerald-600 text-sm font-bold">MAIN ADMIN ONLY</p><h2 className="text-2xl font-bold">Professional ID Card Generator</h2><p className="text-sm text-slate-500 mt-1">Generate official FreshBasket identity cards for Main Admins, Sub Admins, Delivery Partners, Store Admins, Customer Care team members, Finance team members, Operations, E-commerce and Marketplace, Inventory and Warehouse, Sales and Business Development, Marketing, Technology and IT, Human Resources and Administration, and other company employees. Only the main admin can create or revoke cards.</p></div>
   <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-900"><b>Verification:</b> Every generated card gets a unique FreshBasket ID number and a secure verification QR code. Keep the card details accurate and verify the holder's original documents before issuing it.</div>
    <div className="bg-white border rounded-3xl p-6">
      <h3 className="font-bold text-lg">Create new identity card</h3>
      <div className="grid md:grid-cols-3 gap-4 mt-5">
        <label className="text-sm font-semibold">Card for<select value={form.holderType} onChange={e => changeType(e.target.value)} className="mt-2 w-full border rounded-xl px-3 py-2.5"><option value="" disabled>Select employee type</option><option value="main-admin">Main Admin</option><option value="sub-admin">Sub Admin</option><option value="delivery">Delivery Partner</option><option value="store-admin">Store Admin</option><option value="customer-care">Customer Care</option><option value="finance-manager">Finance Manager</option><option value="finance-executive">Finance Executive</option><option value="operations-executive">Operations Executive</option><option value="ecommerce-marketplace-executive">E-commerce / Marketplace Executive</option><option value="inventory-warehouse-executive">Inventory / Warehouse Executive</option><option value="sales-business-development-executive">Sales / Business Development Executive</option><option value="marketing-executive">Marketing Executive</option><option value="technology-it-employee">Technology / IT Employee</option><option value="hr-administration">Human Resources / Administration</option><option value="employee">Company Employee / Other Employee</option></select></label>
        {linkedAccountTypes.has(String(form.holderType)) && <label className="text-sm font-semibold">Select existing account<select value={form.sourceId} onChange={e => chooseSource(e.target.value)} className="mt-2 w-full border rounded-xl px-3 py-2.5"><option value="">Select...</option>{(form.holderType === "delivery" ? partners : accounts.filter((x:any) => String(x.role) === linkedAccountRoles[String(form.holderType)])).map((x:any)=><option key={x._id} value={x._id}>{x.name} · {x.employeeId || x.email}</option>)}</select></label>}
        <label className="text-sm font-semibold">Full name<input value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Designation<input value={form.designation} onChange={e => setForm({...form,designation:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Employee / Staff ID<input value={form.employeeId} onChange={e => setForm({...form,employeeId:e.target.value})} placeholder="Optional" className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Department<input value={form.department} onChange={e => setForm({...form,department:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Email<input value={form.email} onChange={e => setForm({...form,email:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Mobile<input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Emergency contact<input value={form.emergencyContact} onChange={e => setForm({...form,emergencyContact:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Valid until<input type="date" value={form.expiryDate} onChange={e => setForm({...form,expiryDate:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold md:col-span-2">Residential / official address<textarea value={form.address} onChange={e => setForm({...form,address:e.target.value})} rows={2} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <div><label className="text-sm font-semibold">Photo<input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={photo} className="mt-2 w-full border rounded-xl px-3 py-2.5 bg-white" /><span className="block text-[11px] text-slate-400 mt-1">JPG/PNG/WebP · max 700 KB</span></label><div className="mt-2"><ImagePickerButtons compact disabled={photoLoading} onFile={(file)=>{ const fake={target:{files:[file]}} as any; photo(fake); }}/></div>{photoLoading&&<p className="text-xs text-emerald-700 font-semibold mt-2">Loading photo...</p>}{form.photo&&<div className="mt-3 flex items-center gap-3"><img src={form.photo} alt="Employee preview" className="w-16 h-16 rounded-xl object-cover border"/><button type="button" onClick={()=>setForm((f:any)=>({...f,photo:""}))} className="border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-bold">Remove</button></div>}</div>
      </div>
      <button disabled={saving} onClick={generate} className="mt-5 inline-flex items-center gap-2 bg-slate-950 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50"><BadgeCheck size={18}/>{saving ? "Generating..." : "Generate Official ID Card"}</button>
    </div>
    {selectedCard && <div className="bg-slate-100 border rounded-3xl p-5"><div className="flex items-center justify-between mb-4"><div><h3 className="font-bold">Card Preview</h3><p className="text-xs text-slate-500">Print this card on an ID-card/PVC printer or save it through your browser's print dialog.</p></div><div className="flex gap-2"><button onClick={() => printCard(selectedCard)} className="inline-flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold"><Printer size={17}/> Print Card</button><button onClick={() => setSelectedCard(null)} className="border rounded-xl px-3 py-2.5"><X size={18}/></button></div></div><div className="overflow-auto"><ProfessionalIdCard card={selectedCard}/></div></div>}
    <div className="bg-white border rounded-3xl overflow-hidden"><div className="px-5 py-4 border-b flex items-center justify-between"><div><b>Generated identity cards</b><p className="text-xs text-slate-500 mt-1">Main-admin controlled issuance register</p></div><button onClick={load} className="text-sm text-emerald-700 font-bold">Refresh</button></div>{loading ? <div className="p-10 text-center text-slate-500">Loading identity cards...</div> : cards.length ? <div className="divide-y">{cards.map(c => <div key={c._id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><b>{c.name}</b><p className="text-sm text-slate-500">{c.designation} · {c.cardNumber}</p><p className="text-xs text-slate-400 mt-1">{IDENTITY_CARD_TYPE_LABELS[String(c.holderType || "")] || "COMPANY EMPLOYEE"}{c.employeeId ? ` · Employee ID: ${c.employeeId}` : ""}</p><p className="text-xs text-slate-400">Valid until {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString("en-IN") : "—"} · {c.currentStatus === "ACTIVE" ? "Active" : c.currentStatus === "EXPIRED" ? "Expired" : c.currentStatus === "INACTIVE" ? "Inactive" : "Revoked"}</p></div><div className="flex flex-wrap gap-2">
  <button onClick={() => printCard(c)} className="inline-flex items-center gap-2 border rounded-xl px-4 py-2 font-bold text-sm"><Printer size={16}/> {c.status === "active" ? "Print / Reprint" : "View Card"}</button>
  {String(c.status || "active").toLowerCase() === "active" && <button onClick={() => revokeCard(c)} className="inline-flex items-center gap-2 border border-red-200 text-red-700 rounded-xl px-4 py-2 font-bold text-sm">Revoke</button>}
</div></div>)}</div> : <div className="p-10 text-center text-slate-500">No identity cards generated yet.</div>}</div>
    {selectedCard && <div className="fixed left-[-10000px] top-0"><ProfessionalIdCard card={selectedCard}/></div>}
  </div>;
}

function AdminManagement({ store }: { store: ReturnType<typeof useStore> }) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", profilePhoto: "", storeName: "", storeImage: "", storeAddress: "", latitude: "", longitude: "", storeCategory: "Local Store", storeDescription: "" });

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
      await axios.post(API + "/admin/admins", { name, email, phone, password: form.password, profilePhoto: form.profilePhoto, storeName: form.storeName, storeImage: form.storeImage, storeAddress: form.storeAddress, latitude: form.latitude, longitude: form.longitude, storeCategory: form.storeCategory, storeDescription: form.storeDescription }, { headers: adminHeaders() });
      alert("Admin account created successfully.");
      setForm({ name: "", email: "", phone: "", password: "", confirmPassword: "", profilePhoto: "", storeName: "", storeImage: "", storeAddress: "", latitude: "", longitude: "", storeCategory: "Local Store", storeDescription: "" });
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
    <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 text-sm text-blue-900">
      <b>Store isolation is enabled.</b> Each admin gets a separate store workspace. Their products, orders, store location and delivery partners stay inside their own store. The main admin can manage account access, but cannot enter or edit another admin's store workspace. Passwords are never displayed.
    </div>
    <div className="bg-white border rounded-3xl p-6">
      <h3 className="font-bold text-lg">Create Admin</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        <label className="text-sm font-semibold">Full name<input value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Email<input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Mobile<input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Password<input type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label>
        <label className="text-sm font-semibold">Confirm password<input type="password" value={form.confirmPassword} onChange={e => setForm({...form,confirmPassword:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" /></label><div><p className="text-sm font-semibold">Profile photo <span className="text-xs text-slate-400">(Optional)</span></p><div className="mt-2"><ImagePickerButtons compact onFile={(f)=>{if(!f.type.startsWith("image/"))return alert("Only image files are allowed.");if(f.size>700*1024)return alert("Photo must be 700 KB or smaller.");const r=new FileReader();r.onload=()=>setForm(x=>({...x,profilePhoto:String(r.result||"")}));r.readAsDataURL(f)}}/></div>{form.profilePhoto&&<img src={form.profilePhoto} className="mt-2 w-16 h-16 rounded-xl object-cover border" alt="Admin preview"/>}</div><label className="text-sm font-semibold">Store name<input value={form.storeName} onChange={e=>setForm({...form,storeName:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5" placeholder="Local Store"/></label><label className="text-sm font-semibold">Store category<input value={form.storeCategory} onChange={e=>setForm({...form,storeCategory:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label><div><label className="text-sm font-semibold">Store image<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/"))return alert("Only image files are allowed.");if(f.size>700*1024)return alert("Store image must be 700 KB or smaller.");const r=new FileReader();r.onload=()=>setForm(x=>({...x,storeImage:String(r.result||"")}));r.readAsDataURL(f)}} className="mt-2 w-full text-sm"/></label><div className="mt-2"><ImagePickerButtons compact onFile={(f)=>{if(!f.type.startsWith("image/"))return alert("Only image files are allowed.");if(f.size>700*1024)return alert("Store image must be 700 KB or smaller.");const r=new FileReader();r.onload=()=>setForm(x=>({...x,storeImage:String(r.result||"")}));r.readAsDataURL(f)}}/></div>{form.storeImage&&<img src={form.storeImage} className="mt-2 w-28 h-20 rounded-xl object-cover border"/>}</div><label className="text-sm font-semibold">Store address<input value={form.storeAddress} onChange={e=>setForm({...form,storeAddress:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label><label className="text-sm font-semibold">Latitude<input value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label><label className="text-sm font-semibold">Longitude<input value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label><label className="text-sm font-semibold lg:col-span-3">Store description<textarea value={form.storeDescription} onChange={e=>setForm({...form,storeDescription:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label>
      </div>
      <button disabled={saving} onClick={createAdmin} className="mt-5 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{saving ? "Creating..." : "Create Admin"}</button>
    </div>
    <div className="bg-white border rounded-3xl p-6">
      <h3 className="font-bold text-lg">Admin Accounts</h3>
      {loading ? <div className="py-10 text-center text-slate-500">Loading...</div> : <div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Store Image</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{admins.map(a => { const main = String(a.email || "").toLowerCase() === "admin@grocery.com"; return <tr key={a._id} className="border-b"><td className="p-3 font-semibold">{a.name}</td><td className="p-3">{a.email}</td><td className="p-3">{a.phone || "—"}</td><td className="p-3">{a.storeImage ? <img src={a.storeImage} className="w-12 h-10 rounded-lg object-cover"/> : "—"}</td><td className="p-3">{main ? "Main Admin" : "Admin"}</td><td className="p-3">{a.blocked ? "Blocked" : "Active"}</td><td className="p-3">{String(a._id) === String(store.user?.id) ? <span className="text-slate-400">Current account</span> : <button onClick={() => toggle(a)} className="font-semibold text-emerald-700">{a.blocked ? "Activate" : "Block"}</button>}</td></tr>})}</tbody></table></div>}
    </div>
  <MainAdminStoreDirectory />
  <div className="border-t pt-6"><CustomerCareAnalytics /></div>
  </div>;
}

function AdminStoreLocation({ store }: { store: ReturnType<typeof useStore> }) {
  const [form, setForm] = useState({ name: "FreshBasket Store", address: "", latitude: "", longitude: "", accuracy: "", image: "", imageUrl: "", category: "Local Store", description: "", phone: "", email: "", openingTime: "", closingTime: "", breakStart: "", breakEnd: "", weeklyOff: [] as number[], holidays: [] as string[], temporarilyClosed: false, temporaryClosureReason: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await axios.get(API + "/admin/store-location", { headers: adminHeaders() });
      const d = r.data?.data || {};
      const image = d.image || "";
      setForm({ name: d.name || "FreshBasket Store", address: d.address || "", latitude: d.latitude != null ? String(d.latitude) : "", longitude: d.longitude != null ? String(d.longitude) : "", accuracy: d.accuracy != null ? String(d.accuracy) : "", image, imageUrl: /^https?:\/\//i.test(image) ? image : "", category: d.category || "Local Store", description: d.description || "", phone: d.phone || "", email: d.email || "", openingTime: d.operatingHours?.openingTime || "", closingTime: d.operatingHours?.closingTime || "", breakStart: d.operatingHours?.breakStart || "", breakEnd: d.operatingHours?.breakEnd || "", weeklyOff: Array.isArray(d.operatingHours?.weeklyOff) ? d.operatingHours.weeklyOff.map(Number) : [], holidays: Array.isArray(d.operatingHours?.holidays) ? d.operatingHours.holidays : [], temporarilyClosed: d.operatingHours?.temporarilyClosed === true, temporaryClosureReason: d.operatingHours?.temporaryClosureReason || "" });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load store location.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return alert("Location is not supported on this device/browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setForm(f => ({ ...f, latitude: position.coords.latitude.toFixed(7), longitude: position.coords.longitude.toFixed(7), accuracy: Number.isFinite(Number(position.coords.accuracy)) ? Math.round(Number(position.coords.accuracy)).toString() : "" }));
        setLocating(false);
      },
      error => {
        console.error("ADMIN STORE LOCATION ERROR:", error);
        alert("Unable to get current location. Please allow location permission.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const save = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const imageUrl = form.imageUrl.trim();
    if (!form.name.trim()) return alert("Please enter store name.");
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return alert("Please enter a valid latitude.");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return alert("Please enter a valid longitude.");
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return alert("Please enter a valid image URL starting with http:// or https://.");
    const image = imageUrl || form.image;
    setSaving(true);
    try {
      await axios.put(API + "/admin/store-location", {
        name: form.name.trim(),
        address: form.address.trim(),
        latitude,
        longitude,
        accuracy: form.accuracy === "" ? null : Number(form.accuracy),
        image,
        category: form.category.trim() || "Local Store",
        description: form.description.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        operatingHours: { openingTime: form.openingTime, closingTime: form.closingTime, breakStart: form.breakStart, breakEnd: form.breakEnd, weeklyOff: form.weeklyOff, holidays: form.holidays, temporarilyClosed: form.temporarilyClosed, temporaryClosureReason: form.temporaryClosureReason.trim() },
      }, { headers: adminHeaders() });
      alert("Store updated successfully.");
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to save store. Please try again.");
    } finally { setSaving(false); }
  };

  const saveStoreAdminPhoto = (file:File) => {
    if(!file.type.startsWith("image/"))return alert("Only image files are allowed.");
    if(file.size>700*1024)return alert("Profile photo must be 700 KB or smaller.");
    const reader=new FileReader();reader.onload=async()=>{try{const r=await axios.patch(API+"/profile/photo",{profilePhoto:String(reader.result||"")},{headers:adminHeaders()});const next={...store.user,profilePhoto:r.data.data?.profilePhoto||""};store.setUser(next as any);localStorage.setItem("fb-user",JSON.stringify(next));alert("Profile photo updated successfully.");}catch(e:any){alert(e?.response?.data?.message||"Unable to update profile photo.");}};reader.readAsDataURL(file);
  };
  const cancelChanges = () => { load(); };

  if (loading) return <div className="bg-white border rounded-3xl py-16 text-center text-slate-500">Loading store location...</div>;
  if (error) return <PageError message={error} onRetry={load} />;

  return (
    <form className="space-y-5 pb-24" onSubmit={save}>
      <div>
        <p className="text-emerald-600 text-sm font-bold">STORE CONTROL</p>
        <h2 className="text-2xl font-bold">Store Location</h2>
        <p className="text-sm text-slate-500 mt-1">Manage the existing store profile and pickup point. All changes are saved through the existing Store Location API.</p>
      </div>

      <div className="bg-white border rounded-3xl p-5 max-w-3xl">
        <div className="flex flex-wrap items-center gap-4"><div className="w-16 h-16 rounded-2xl overflow-hidden border bg-slate-50 grid place-items-center">{store.user?.profilePhoto?<img src={store.user.profilePhoto} alt="Store Admin profile" className="w-full h-full object-cover"/>:<User size={24} className="text-slate-300"/>}</div><div className="flex-1"><p className="text-xs text-emerald-600 font-black uppercase tracking-wider">Store Admin Profile</p><h3 className="font-bold text-lg">{store.user?.name || "Store Admin"}</h3><p className="text-sm text-slate-500">Optional profile photo for your store administrator account.</p></div><ImagePickerButtons compact onFile={saveStoreAdminPhoto}/></div>
      </div>

      <div className="bg-white border rounded-3xl p-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center"><MapPin size={20} /></div>
          <div><h3 className="font-bold text-lg">Store details & pickup point</h3><p className="text-sm text-slate-500">These details are used by the storefront and delivery pickup flow.</p></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <label className="block text-sm font-semibold">Store name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-2 w-full border rounded-xl p-3" placeholder="FreshBasket Store" /></label>
          <label className="block text-sm font-semibold sm:col-span-2">Store address<textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-2 w-full border rounded-xl p-3 min-h-[90px]" placeholder="Complete pickup/store address" /></label>
          <label className="block text-sm font-semibold">Latitude<input inputMode="decimal" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="mt-2 w-full border rounded-xl p-3" placeholder="27.2153" /></label>
          <label className="block text-sm font-semibold">Longitude<input inputMode="decimal" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="mt-2 w-full border rounded-xl p-3" placeholder="82.8640" /></label><label className="block text-sm font-semibold">Location accuracy (m)<input inputMode="decimal" value={form.accuracy} onChange={e=>setForm({...form,accuracy:e.target.value})} className="mt-2 w-full border rounded-xl p-3" placeholder="Optional"/></label>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <button type="button" onClick={useCurrentLocation} disabled={locating || saving} className="border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 disabled:opacity-50"><MapPin size={16} />{locating ? "Getting location..." : "Use Current Location"}</button>
        </div>

        <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-sm">
          <p className="font-bold text-emerald-900">Customer storefront link</p>
          <p className="text-emerald-800 mt-1">Share this link with your customers so they see only this store's products.</p>
          <div className="mt-3 flex gap-2">
            <input readOnly value={`${window.location.origin}/?storeAdminId=${encodeURIComponent(String(store.user?.id || ""))}`} className="flex-1 min-w-0 border rounded-xl p-3 bg-white text-xs" />
            <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/?storeAdminId=${encodeURIComponent(String(store.user?.id || ""))}`)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm">Copy</button>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-2xl bg-blue-50 text-blue-800 text-sm">
          <b>How it works:</b> Admin saves the store pickup coordinates once. When an order is assigned to a delivery partner, the delivery dashboard automatically uses this pickup point and the customer's saved coordinates to build the route.
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-5"><div><h3 className="font-bold text-lg">Store profile</h3><p className="text-sm text-slate-500 mt-1">Optional image, category, description and contact details can be changed without affecting location.</p></div></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="text-sm font-semibold">Store image upload<input type="file" accept="image/*" disabled={saving} onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/"))return alert("Only image files are allowed.");if(f.size>700*1024)return alert("Store image must be 700 KB or smaller.");const r=new FileReader();r.onload=()=>setForm(x=>({...x,image:String(r.result||""),imageUrl:""}));r.readAsDataURL(f)}} className="mt-2 w-full text-sm"/></label><div className="mt-2"><ImagePickerButtons compact disabled={saving} onFile={(f)=>{if(!f.type.startsWith("image/"))return alert("Only image files are allowed.");if(f.size>700*1024)return alert("Store image must be 700 KB or smaller.");const r=new FileReader();r.onload=()=>setForm(x=>({...x,image:String(r.result||""),imageUrl:""}));r.readAsDataURL(f)}}/></div>{form.image&&<div className="mt-2 flex items-center gap-2"><img src={form.image} alt="Store preview" className="w-32 h-24 rounded-xl object-cover border"/><button type="button" onClick={()=>setForm({...form,image:"",imageUrl:""})} className="border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs font-bold">Remove</button></div>}
          </div>
          <label className="text-sm font-semibold">Store image URL<input value={form.imageUrl} disabled={saving} onChange={e=>setForm({...form,imageUrl:e.target.value,image:e.target.value.trim()?e.target.value:""})} className="mt-2 w-full border rounded-xl p-3" placeholder="https://example.com/store.jpg" />{form.imageUrl&&<img src={form.imageUrl} alt="Store URL preview" className="mt-2 w-32 h-24 rounded-xl object-cover border" onError={e=>{e.currentTarget.style.display="none"}} />}</label>
          <label className="text-sm font-semibold">Store category<input value={form.category} disabled={saving} onChange={e=>setForm({...form,category:e.target.value})} className="mt-2 w-full border rounded-xl p-3" /></label>
          <label className="text-sm font-semibold md:col-span-2">Store description<textarea value={form.description} disabled={saving} onChange={e=>setForm({...form,description:e.target.value})} className="mt-2 w-full border rounded-xl p-3 min-h-[100px]" /></label>
          <label className="text-sm font-semibold">Store phone<input value={form.phone} disabled={saving} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-2 w-full border rounded-xl p-3" /></label>
          <label className="text-sm font-semibold">Store email<input type="email" value={form.email} disabled={saving} onChange={e=>setForm({...form,email:e.target.value})} className="mt-2 w-full border rounded-xl p-3" /></label>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-6 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-emerald-600 text-xs font-black uppercase tracking-wider">STORE OPERATIONS</p><h3 className="font-bold text-lg mt-1">Operating Hours</h3><p className="text-sm text-slate-500 mt-1">Customers can see these hours. New orders are blocked only when hours are configured and the store is actually closed.</p></div>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.temporarilyClosed} onChange={e=>setForm({...form,temporarilyClosed:e.target.checked})}/> Temporary closure</label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <label className="text-sm font-semibold">Opening time<input type="time" value={form.openingTime} onChange={e=>setForm({...form,openingTime:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>
          <label className="text-sm font-semibold">Closing time<input type="time" value={form.closingTime} onChange={e=>setForm({...form,closingTime:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>
          <label className="text-sm font-semibold">Break start<input type="time" value={form.breakStart} onChange={e=>setForm({...form,breakStart:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>
          <label className="text-sm font-semibold">Break end<input type="time" value={form.breakEnd} onChange={e=>setForm({...form,breakEnd:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>
        </div>
        <div className="mt-5"><p className="text-sm font-semibold mb-2">Weekly off</p><div className="flex flex-wrap gap-2">{[[0,"Sunday"],[1,"Monday"],[2,"Tuesday"],[3,"Wednesday"],[4,"Thursday"],[5,"Friday"],[6,"Saturday"]].map(([day,label]:any)=>{const checked=form.weeklyOff.includes(Number(day));return <label key={day} className={`px-3 py-2 rounded-xl border text-sm font-bold cursor-pointer ${checked?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-white"}`}><input type="checkbox" className="mr-2" checked={checked} onChange={e=>setForm(f=>({...f,weeklyOff:e.target.checked?[...f.weeklyOff,Number(day)]:f.weeklyOff.filter(x=>x!==Number(day))}))}/>{label}</label>})}</div></div>
        <div className="mt-5"><label className="text-sm font-semibold">Holiday dates<input type="date" className="mt-2 w-full sm:w-auto border rounded-xl p-3" onChange={e=>{const v=e.target.value;if(v&&!form.holidays.includes(v))setForm(f=>({...f,holidays:[...f.holidays,v]}));e.currentTarget.value=""}}/></label><div className="flex flex-wrap gap-2 mt-3">{form.holidays.map(d=><button type="button" key={d} onClick={()=>setForm(f=>({...f,holidays:f.holidays.filter(x=>x!==d)}))} className="border rounded-full px-3 py-1.5 text-xs font-bold">{d} ×</button>)}</div></div>
        {form.temporarilyClosed && <label className="block text-sm font-semibold mt-5">Closure reason<textarea value={form.temporaryClosureReason} onChange={e=>setForm({...form,temporaryClosureReason:e.target.value})} rows={3} className="mt-2 w-full border rounded-xl p-3" placeholder="Optional reason shown to customers"/></label>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur shadow-[0_-4px_18px_rgba(15,23,42,0.08)] md:left-[205px]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={cancelChanges} disabled={saving} className="w-full sm:w-auto border border-slate-300 bg-white text-slate-700 px-5 py-3 rounded-xl font-bold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"><Save size={17} />{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </form>
  );
}

function AdminPaymentSettings() {
  const [form, setForm] = useState({ upiId: "", merchantName: "FreshBasket", qrImage: "", isEnabled: true });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const load = async () => { setLoading(true); try { const r = await axios.get(API + "/admin/payment-settings", { headers: adminHeaders() }); setForm({ upiId: r.data?.data?.upiId || "", merchantName: r.data?.data?.merchantName || "FreshBasket", qrImage: r.data?.data?.qrImage || "", isEnabled: r.data?.data?.isEnabled !== false }); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const save = async () => { setSaving(true); try { await axios.put(API + "/admin/payment-settings", form, { headers: adminHeaders() }); alert("Payment settings saved successfully."); } catch (e: any) { alert(e?.response?.data?.message || "Unable to save payment settings."); } finally { setSaving(false); } };
  if (loading) return <div className="bg-white border rounded-3xl py-16 text-center text-slate-500">Loading payment settings...</div>;
  return <div className="space-y-5"><div><p className="text-emerald-600 text-sm font-bold">STORE PAYMENTS</p><h2 className="text-2xl font-bold">Payment / UPI Settings</h2><p className="text-sm text-slate-500 mt-1">These payment details belong only to your store. Delivery partners can use them for orders assigned to them.</p></div>
    <div className="bg-white border rounded-3xl p-6 max-w-3xl"><div className="grid md:grid-cols-2 gap-4"><label className="text-sm font-semibold">UPI ID<input value={form.upiId} onChange={e=>setForm({...form,upiId:e.target.value})} placeholder="yourshop@upi" className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">Merchant / Store name<input value={form.merchantName} onChange={e=>setForm({...form,merchantName:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold md:col-span-2">QR image URL (optional)<input value={form.qrImage} onChange={e=>setForm({...form,qrImage:e.target.value})} placeholder="https://.../upi-qr.png" className="mt-2 w-full border rounded-xl p-3"/><input type="file" accept="image/*" onChange={e=>{ const file=e.target.files?.[0]; if(!file) return; if(file.size > 2*1024*1024){ alert("QR image must be 2 MB or smaller."); return; } const reader=new FileReader(); reader.onload=()=>setForm(f=>({...f,qrImage:String(reader.result||"")})); reader.readAsDataURL(file); }} className="mt-2 w-full text-xs"/><div className="mt-2"><ImagePickerButtons compact onFile={(file)=>{if(file.size>2*1024*1024)return alert("QR image must be 2 MB or smaller.");const reader=new FileReader();reader.onload=()=>setForm(f=>({...f,qrImage:String(reader.result||"")}));reader.readAsDataURL(file)}}/></div><span className="block text-xs text-slate-400 mt-1">You can paste an image URL or upload a QR image (max 2 MB).</span></label></div>
      <label className="flex items-center gap-3 mt-5 text-sm font-semibold"><input type="checkbox" checked={form.isEnabled} onChange={e=>setForm({...form,isEnabled:e.target.checked})}/> Enable online payment for this store</label>
      {form.qrImage && <img src={form.qrImage} alt="UPI QR preview" className="mt-5 w-48 h-48 object-contain border rounded-2xl bg-white"/>}
      <button disabled={saving} onClick={save} className="mt-5 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{saving ? "Saving..." : "Save payment settings"}</button>
    </div></div>;
}

function DemandMapFit({ points }: { points: any[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p:any) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));
    if (!valid.length) return;
    if (valid.length === 1) { map.setView([Number(valid[0].latitude), Number(valid[0].longitude)], 12); return; }
    map.fitBounds(valid.map((p:any) => [Number(p.latitude), Number(p.longitude)] as [number, number]), { padding: [36, 36], maxZoom: 13 });
  }, [map, points]);
  return null;
}


function AdminPeakHourDetection({ store }: { store: ReturnType<typeof useStore> }) {
  const [data,setData]=useState<any|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [range,setRange]=useState("30d");const [from,setFrom]=useState("");const [to,setTo]=useState("");const [selectedStore,setSelectedStore]=useState("");
  const isMain=Boolean(store.user?.isMainAdmin||String(store.user?.email||"").toLowerCase()==="admin@grocery.com");
  const resolveRange=()=>{const now=new Date();const end=new Date(now);end.setHours(23,59,59,999);const start=new Date(now);start.setHours(0,0,0,0);if(range==="7d"){start.setDate(start.getDate()-6);return {from:start,to:end};}if(range==="90d"){start.setDate(start.getDate()-89);return {from:start,to:end};}if(range==="custom")return {from:from?new Date(from+"T00:00:00"):new Date(now.getTime()-29*86400000),to:to?new Date(to+"T23:59:59"):end};start.setDate(start.getDate()-29);return {from:start,to:end};};
  const load=async()=>{setLoading(true);setError("");try{const r=resolveRange();const params:any={from:r.from.toISOString(),to:r.to.toISOString()};if(isMain&&selectedStore)params.storeAdminId=selectedStore;const url=isMain?API+"/admin/peak-hour-detection":API+"/store-admin/peak-hour-detection";const x=await axios.get(url,{headers:adminHeaders(),params});setData(x.data?.data||null);}catch(e:any){setError(e?.response?.data?.message||"Unable to load peak-hour analysis");setData(null)}finally{setLoading(false)}};
  useEffect(()=>{load()},[range,from,to,selectedStore,isMain]);
  const hourly=data?.orderHourly||[];const max=Math.max(1,...hourly.map((x:any)=>Number(x.count||0)));const top=data?.peakOrderHours||[];const topDelivery=data?.peakDeliveryHours||[];const weekdays=data?.weekdays||[];
  return <div className="space-y-5"><div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><p className="text-emerald-600 text-sm font-bold">REPORTS & ANALYTICS</p><h2 className="text-3xl font-black">Peak-Hour Detection</h2><p className="text-sm text-slate-500 mt-1">Peak periods are detected from real order and delivery timestamps using India Standard Time (Asia/Kolkata). Cancelled and rejected orders are excluded.</p></div><div className="flex flex-wrap gap-2 items-center"><select value={range} onChange={e=>setRange(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="90d">90 Days</option><option value="custom">Custom Range</option></select>{isMain&&<select value={selectedStore} onChange={e=>setSelectedStore(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="">All Stores</option>{(data?.stores||[]).map((x:any)=><option key={x.storeAdminId} value={x.storeAdminId}>{x.name}</option>)}</select>}<button onClick={load} className="border rounded-xl px-4 py-2 font-bold">Refresh</button></div></div>
    {range==="custom"&&<div className="flex flex-wrap gap-3 bg-white border rounded-2xl p-4"><label className="text-sm font-semibold">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="block mt-1 border rounded-xl px-3 py-2"/></label><label className="text-sm font-semibold">To<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="block mt-1 border rounded-xl px-3 py-2"/></label></div>}
    {error&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">{error}</div>}
    {loading?<div className="bg-white border rounded-3xl py-16 text-center text-slate-500">Analyzing real order timestamps...</div>:<><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Orders analyzed</p><b className="text-2xl">{Number(data?.orders||0)}</b></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Peak order hour</p><b className="text-2xl">{data?.peakOrderHour?.label||"—"}</b><p className="text-xs text-slate-500 mt-1">{Number(data?.peakOrderHour?.count||0)} orders</p></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Peak delivery hour</p><b className="text-2xl">{data?.peakDeliveryHour?.label||"—"}</b><p className="text-xs text-slate-500 mt-1">{Number(data?.peakDeliveryHour?.count||0)} delivery events</p></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Delivery events</p><b className="text-2xl">{Number(data?.deliveryEvents||0)}</b></div></div>
      <div className="bg-white border rounded-3xl p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-lg">Orders by hour</h3><p className="text-xs text-slate-500 mt-1">Each bar is the actual number of non-cancelled/non-rejected orders created during that IST hour across the selected period.</p></div></div><div className="h-72 mt-6 flex items-end gap-1 overflow-x-auto">{hourly.map((x:any)=><div key={x.hour} className="min-w-[30px] flex-1 h-full flex flex-col justify-end" title={`${x.label} · ${x.count} orders`}><div style={{height:`${Math.max(x.count?4:0,Number(x.count||0)/max*220)}px`}} className="bg-emerald-500 rounded-t-md"/><span className="text-[9px] text-slate-400 text-center mt-2 whitespace-nowrap">{String(x.hour).padStart(2,"0")}</span></div>)}</div></div>
      <div className="grid lg:grid-cols-2 gap-5"><div className="bg-white border rounded-3xl p-5"><h3 className="font-bold text-lg">Peak order hours</h3><div className="mt-3 space-y-2">{top.map((x:any,i:number)=><div key={x.hour} className="flex items-center justify-between border-b last:border-b-0 pb-2"><span className="text-sm">#{i+1} · {x.label}</span><b>{x.count} orders</b></div>)}{!top.length&&<p className="text-sm text-slate-500">No order timestamps are available for this period.</p>}</div></div><div className="bg-white border rounded-3xl p-5"><h3 className="font-bold text-lg">Peak delivery hours</h3><div className="mt-3 space-y-2">{topDelivery.map((x:any,i:number)=><div key={x.hour} className="flex items-center justify-between border-b last:border-b-0 pb-2"><span className="text-sm">#{i+1} · {x.label}</span><b>{x.count} deliveries</b></div>)}{!topDelivery.length&&<p className="text-sm text-slate-500">No delivery timestamps are available for this period.</p>}</div></div></div>
      <div className="bg-white border rounded-3xl p-5"><h3 className="font-bold text-lg">Order volume by day of week</h3><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">{weekdays.map((x:any)=><div key={x.day} className="bg-slate-50 border rounded-2xl p-4"><p className="text-xs text-slate-500">{x.name}</p><b className="text-xl">{x.count}</b><p className="text-xs text-slate-400 mt-1">orders</p></div>)}</div></div>
    </>}</div>;
}

function AdminDeliveryHeatmap({ store }: { store: ReturnType<typeof useStore> }) {
  const [data,setData]=useState<any|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [range,setRange]=useState("30d");const [from,setFrom]=useState("");const [to,setTo]=useState("");const [selectedStore,setSelectedStore]=useState("");
  const isMain=Boolean(store.user?.isMainAdmin||String(store.user?.email||"").toLowerCase()==="admin@grocery.com");
  const resolveRange=()=>{const now=new Date();const end=new Date(now);end.setHours(23,59,59,999);const start=new Date(now);start.setHours(0,0,0,0);if(range==="7d"){start.setDate(start.getDate()-6);return {from:start,to:end};}if(range==="90d"){start.setDate(start.getDate()-89);return {from:start,to:end};}if(range==="custom")return {from:from?new Date(from+"T00:00:00"):new Date(now.getTime()-29*86400000),to:to?new Date(to+"T23:59:59"):end};start.setDate(start.getDate()-29);return {from:start,to:end};};
  const load=async()=>{setLoading(true);setError("");try{const r=resolveRange();const params:any={from:r.from.toISOString(),to:r.to.toISOString()};if(isMain&&selectedStore)params.storeAdminId=selectedStore;const url=isMain?API+"/admin/delivery-heatmap":API+"/store-admin/delivery-heatmap";const x=await axios.get(url,{headers:adminHeaders(),params});setData(x.data?.data||null);}catch(e:any){setError(e?.response?.data?.message||"Unable to load delivery heatmap");setData(null)}finally{setLoading(false)}};
  useEffect(()=>{load()},[range,from,to,selectedStore,isMain]);
  const cells=data?.cells||[];const partners=data?.partners||[];const storesForFilter=data?.stores||[];const mapPoints=useMemo(()=>[...cells,...partners].filter((p:any)=>Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))),[cells,partners]);
  const center=data?.center&&Number.isFinite(Number(data.center.latitude))?[Number(data.center.latitude),Number(data.center.longitude)] as [number,number]:[26.8467,80.9462] as [number,number];
  return <div className="space-y-5"><div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><p className="text-emerald-600 text-sm font-bold">REPORTS & ANALYTICS</p><h2 className="text-3xl font-black">Delivery Heatmap</h2><p className="text-sm text-slate-500 mt-1">Delivery activity is aggregated from real orders. Active Delivery Partner markers use their latest recorded location; no customer names or exact addresses are exposed.</p></div><div className="flex flex-wrap gap-2 items-center"><select value={range} onChange={e=>setRange(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="90d">90 Days</option><option value="custom">Custom Range</option></select>{isMain&&<select value={selectedStore} onChange={e=>setSelectedStore(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="">All Stores</option>{storesForFilter.map((x:any)=><option key={x.storeAdminId} value={x.storeAdminId}>{x.name}</option>)}</select>}<button onClick={load} className="border rounded-xl px-4 py-2 font-bold">Refresh</button></div></div>
    {range==="custom"&&<div className="flex flex-wrap gap-3 bg-white border rounded-2xl p-4"><label className="text-sm font-semibold">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="block mt-1 border rounded-xl px-3 py-2"/></label><label className="text-sm font-semibold">To<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="block mt-1 border rounded-xl px-3 py-2"/></label></div>}
    {error&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">{error}</div>}
    {loading?<div className="bg-white border rounded-3xl py-16 text-center text-slate-500">Loading real delivery activity...</div>:<><div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Orders</p><b className="text-2xl">{Number(data?.orders||0)}</b></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Mapped deliveries</p><b className="text-2xl">{Number(data?.mappedOrders||0)}</b></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Completed</p><b className="text-2xl">{Number(data?.completedDeliveries||0)}</b></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Active</p><b className="text-2xl">{Number(data?.activeDeliveries||0)}</b></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Unmapped</p><b className="text-2xl">{Number(data?.unmappedOrders||0)}</b></div></div>
      {!cells.length?<div className="bg-white border rounded-3xl p-8 text-center text-slate-500">No delivery locations are available for the selected period.</div>:<div className="bg-white border rounded-3xl overflow-hidden"><div className="p-4 border-b flex flex-wrap gap-4 text-xs text-slate-600"><span><b>Low activity</b> = fewer deliveries</span><span><b>High activity</b> = more deliveries</span><span>Each circle represents an aggregated ~0.5 km delivery zone.</span></div><div className="h-[520px]"><FBMapContainer center={center} zoom={11} scrollWheelZoom className="h-full w-full"><FBTileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><DemandMapFit points={mapPoints}/>{partners.map((p:any)=><FBMarker key={`partner-${p.partnerId}`} position={[Number(p.latitude),Number(p.longitude)]}><FBPopup><b>{p.name}</b>{p.employeeId?<><br/>Employee ID: {p.employeeId}</>:null}<br/>Latest location: {p.locationUpdatedAt?new Date(p.locationUpdatedAt).toLocaleString("en-IN"):"Not available"}<br/>Status: {p.onlineStatus||"—"}</FBPopup></FBMarker>)}{cells.map((c:any)=><FBCircleMarker key={c.id} center={[Number(c.latitude),Number(c.longitude)]} radius={8+Math.min(18,Number(c.intensity||0)*18)} pathOptions={{fillOpacity:0.18+Math.min(0.55,Number(c.intensity||0)*0.55),weight:1,opacity:0.7}}><FBPopup><b>Delivery zone</b><br/>Deliveries: {c.deliveryCount}<br/>Completed: {c.completedDeliveries}<br/>Active: {c.activeDeliveries}</FBPopup></FBCircleMarker>)}</FBMapContainer></div></div>}
      <div className="grid lg:grid-cols-2 gap-5"><div className="bg-white border rounded-3xl p-5"><h3 className="font-bold text-lg">Highest delivery activity</h3><div className="mt-3 space-y-2">{[...cells].sort((a:any,b:any)=>Number(b.deliveryCount||0)-Number(a.deliveryCount||0)).slice(0,8).map((c:any,i:number)=><div key={c.id} className="flex items-center justify-between gap-3 border-b last:border-b-0 pb-2"><span className="text-sm">Zone {i+1} · {Number(c.latitude).toFixed(4)}, {Number(c.longitude).toFixed(4)}</span><b>{c.deliveryCount}</b></div>)}</div></div><div className="bg-white border rounded-3xl p-5"><h3 className="font-bold text-lg">Mapped Delivery Partners</h3><div className="mt-3 space-y-2">{partners.map((p:any)=><div key={p.partnerId} className="flex items-center justify-between gap-3 border-b last:border-b-0 pb-2"><span className="text-sm">{p.name}{p.employeeId?` · ${p.employeeId}`:""}</span><span className="text-xs text-slate-500">{p.locationUpdatedAt?new Date(p.locationUpdatedAt).toLocaleString("en-IN"):"Location unavailable"}</span></div>)}{!partners.length&&<p className="text-sm text-slate-500">No assigned Delivery Partner has a valid current location.</p>}</div></div></div>
    </>}</div>;
}

function AdminStoreDemandHeatmap({ store }: { store: ReturnType<typeof useStore> }) {
  const [data,setData]=useState<any|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [range,setRange]=useState("30d");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [selectedStore,setSelectedStore]=useState("");
  const isMain=Boolean(store.user?.isMainAdmin || String(store.user?.email||"").toLowerCase()==="admin@grocery.com");
  const resolveRange=()=>{
    const now=new Date();const end=new Date(now);end.setHours(23,59,59,999);const start=new Date(now);start.setHours(0,0,0,0);
    if(range==="7d"){start.setDate(start.getDate()-6);return {from:start,to:end};}
    if(range==="90d"){start.setDate(start.getDate()-89);return {from:start,to:end};}
    if(range==="custom")return {from:from?new Date(from+"T00:00:00"):new Date(now.getTime()-29*86400000),to:to?new Date(to+"T23:59:59"):end};
    start.setDate(start.getDate()-29);return {from:start,to:end};
  };
  const load=async()=>{setLoading(true);setError("");try{const r=resolveRange();const params:any={from:r.from.toISOString(),to:r.to.toISOString()};if(isMain&&selectedStore)params.storeAdminId=selectedStore;const url=isMain?API+"/admin/store-demand-heatmap":API+"/store-admin/store-demand-heatmap";const x=await axios.get(url,{headers:adminHeaders(),params});setData(x.data?.data||null);}catch(e:any){setError(e?.response?.data?.message||"Unable to load store demand heatmap");setData(null)}finally{setLoading(false)}};
  useEffect(()=>{load()},[range,from,to,selectedStore,isMain]);
  const cells=data?.cells||[];const stores=data?.stores||[];
  const mapPoints=useMemo(()=>[...cells,...stores].filter((p:any)=>Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))),[cells,stores]);
  const center=data?.center&&Number.isFinite(Number(data.center.latitude))?[Number(data.center.latitude),Number(data.center.longitude)] as [number,number]:[26.8467,80.9462] as [number,number];
  const maxOrders=Math.max(1,...cells.map((c:any)=>Number(c.orderCount||0)));
  return <div className="space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><p className="text-emerald-600 text-sm font-bold">REPORTS & ANALYTICS</p><h2 className="text-3xl font-black">Store Demand Heatmap</h2><p className="text-sm text-slate-500 mt-1">Demand is aggregated from real orders and customer delivery coordinates. No customer names or exact addresses are exposed.</p></div><div className="flex flex-wrap gap-2 items-center"><select value={range} onChange={e=>setRange(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="90d">90 Days</option><option value="custom">Custom Range</option></select>{isMain&&<select value={selectedStore} onChange={e=>setSelectedStore(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="">All Stores</option>{stores.map((x:any)=><option key={x.storeAdminId} value={x.storeAdminId}>{x.name}</option>)}</select>}<button onClick={load} className="border rounded-xl px-4 py-2 font-bold">Refresh</button></div></div>
    {range==="custom"&&<div className="flex flex-wrap gap-3 bg-white border rounded-2xl p-4"><label className="text-sm font-semibold">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="block mt-1 border rounded-xl px-3 py-2"/></label><label className="text-sm font-semibold">To<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="block mt-1 border rounded-xl px-3 py-2"/></label></div>}
    {error&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">{error}</div>}
    {loading?<div className="bg-white border rounded-3xl py-16 text-center text-slate-500">Loading real order demand...</div>:<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Orders</p><b className="text-2xl">{Number(data?.orders||0)}</b></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Mapped demand</p><b className="text-2xl">{Number(data?.mappedOrders||0)}</b></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Demand zones</p><b className="text-2xl">{cells.length}</b></div><div className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">Unmapped orders</p><b className="text-2xl">{Number(data?.unmappedOrders||0)}</b></div></div>
      {!cells.length?<div className="bg-white border rounded-3xl p-8 text-center text-slate-500">No order locations are available for the selected period.</div>:<div className="bg-white border rounded-3xl overflow-hidden"><div className="p-4 border-b"><div className="flex flex-wrap gap-4 text-xs text-slate-600"><span><b>Low demand</b> = fewer orders</span><span><b>High demand</b> = more orders</span><span>Each circle represents an aggregated ~0.5 km demand zone.</span></div></div><div className="h-[520px]"><FBMapContainer center={center} zoom={11} scrollWheelZoom className="h-full w-full"><FBTileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><DemandMapFit points={mapPoints}/>{stores.filter((st:any)=>Number.isFinite(Number(st.latitude))&&Number.isFinite(Number(st.longitude))).map((st:any)=><FBMarker key={`store-${st.storeAdminId}`} position={[Number(st.latitude),Number(st.longitude)]}><FBPopup><b>{st.name}</b><br/>{Number(st.orders||0)} orders in selected period</FBPopup></FBMarker>)}{cells.map((c:any)=><FBCircleMarker key={c.id} center={[Number(c.latitude),Number(c.longitude)]} radius={8+Math.min(18,Number(c.intensity||0)*18)} pathOptions={{fillOpacity:0.18+Math.min(0.55,Number(c.intensity||0)*0.55),weight:1,opacity:0.7}}><FBPopup><b>Demand zone</b><br/>Orders: {c.orderCount}<br/>Unique customers: {c.uniqueCustomers}</FBPopup></FBCircleMarker>)}</FBMapContainer></div></div>}
      <div className="grid lg:grid-cols-2 gap-5"><div className="bg-white border rounded-3xl p-5"><h3 className="font-bold text-lg">Highest-demand zones</h3><div className="mt-3 space-y-2">{[...cells].sort((a:any,b:any)=>Number(b.orderCount||0)-Number(a.orderCount||0)).slice(0,8).map((c:any,i:number)=><div key={c.id} className="flex items-center justify-between gap-3 border-b last:border-b-0 pb-2"><span className="text-sm">Zone {i+1} · {Number(c.latitude).toFixed(4)}, {Number(c.longitude).toFixed(4)}</span><b>{c.orderCount} orders</b></div>)}</div></div><div className="bg-white border rounded-3xl p-5"><h3 className="font-bold text-lg">Store demand</h3><div className="mt-3 space-y-2">{stores.map((st:any)=><div key={st.storeAdminId} className="flex items-center justify-between gap-3 border-b last:border-b-0 pb-2"><span className="text-sm font-semibold">{st.name}</span><span className="text-sm">{st.orders} orders · {st.mappedOrders} mapped</span></div>)}</div><p className="text-xs text-slate-400 mt-4">Demand intensity is relative to the highest-order zone in the selected period.</p></div></div>
    </>}
  </div>;
}

function AdminFinancialOverview({ store }: { store: ReturnType<typeof useStore> }) {
  const [data,setData]=useState<any|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [range,setRange]=useState("month");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [selectedStore,setSelectedStore]=useState("");
  const isMain=Boolean(store.user?.isMainAdmin || String(store.user?.email||"").toLowerCase()==="admin@grocery.com");
  const resolveRange=()=>{
    const now=new Date();
    const end=new Date(now); end.setHours(23,59,59,999);
    const start=new Date(now); start.setHours(0,0,0,0);
    if(range==="today") return {from:start,to:end};
    if(range==="yesterday"){start.setDate(start.getDate()-1);end.setDate(end.getDate()-1);return {from:start,to:end};}
    if(range==="7d"){start.setDate(start.getDate()-6);return {from:start,to:end};}
    if(range==="30d"){start.setDate(start.getDate()-29);return {from:start,to:end};}
    if(range==="previous") return {from:new Date(now.getFullYear(),now.getMonth()-1,1),to:new Date(now.getFullYear(),now.getMonth(),0,23,59,59,999)};
    if(range==="custom") return {from:from?new Date(from+"T00:00:00"):start,to:to?new Date(to+"T23:59:59"):end};
    return {from:new Date(now.getFullYear(),now.getMonth(),1),to:end};
  };
  const load=async()=>{setLoading(true);setError("");try{const r=resolveRange();const params:any={from:r.from.toISOString(),to:r.to.toISOString()};if(isMain&&selectedStore)params.storeAdminId=selectedStore;const url=isMain?API+"/admin/financial-overview":API+"/store-admin/financial-overview";const x=await axios.get(url,{headers:adminHeaders(),params});setData(x.data.data||null);}catch(e:any){setError(e?.response?.data?.message||"Unable to load financial overview");setData(null)}finally{setLoading(false)}};
  useEffect(()=>{load()},[range,from,to,selectedStore,isMain]);
  const moneyValue=(v:any)=>money(Number(v||0));
  const cards=isMain?[ ["Total Sales",data?.sales?.totalSales], ["Gross Sales",data?.sales?.grossSales], ["Net Sales",data?.sales?.netSales], ["Commission Income",data?.income?.commissionIncome], ["Delivery Revenue",data?.income?.deliveryRevenue], ["Store Payouts",data?.expenses?.storePayouts], ["Delivery Payouts",data?.expenses?.deliveryPayouts], ["Refunds",data?.expenses?.refunds], ["Incentives",data?.expenses?.incentives], ["Net Profit",data?.profit?.netProfit] ] : [ ["Today's Sales",data?.todaySales], ["Orders",data?.ordersCount], ["Gross Sales",data?.grossSales], ["Net Sales",data?.netSales], ["Refunds",data?.refunds], ["Commission",data?.commission], ["Adjustments",data?.adjustments], ["Store Earnings",data?.storeEarnings], ["Pending Payout",data?.pendingPayout], ["Paid Payout",data?.paidPayout] ];
  const series=data?.series||[]; const max=Math.max(1,...series.map((x:any)=>Math.max(Number(x.sales||0),Number(x.income||0),Number(x.expenses||0))));
  return <div className="space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><p className="text-emerald-600 text-sm font-bold">FINANCIAL CONTROL</p><h2 className="text-3xl font-black">{isMain?"Income & Profit":"Store Earnings"}</h2><p className="text-sm text-slate-500 mt-1">Database-backed financial figures only. Sales shown here are financially finalized delivered orders; no sample values are used.</p></div><div className="flex flex-wrap gap-2 items-center"><select value={range} onChange={e=>setRange(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="month">This Month</option><option value="previous">Previous Month</option><option value="custom">Custom Range</option></select>{isMain&&<select value={selectedStore} onChange={e=>setSelectedStore(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="">All Stores</option>{(data?.storeWise||[]).map((x:any)=><option key={x.storeId} value={x.storeId}>{x.name}</option>)}</select>}<button onClick={load} className="border rounded-xl px-4 py-2 font-bold">Refresh</button></div></div>
    {range==="custom"&&<div className="bg-white border rounded-2xl p-4 flex flex-wrap gap-3 items-end"><label className="text-sm font-semibold">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="block mt-1 border rounded-xl p-2"/></label><label className="text-sm font-semibold">To<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="block mt-1 border rounded-xl p-2"/></label></div>}
    {loading?<div className="bg-white border rounded-3xl py-20 text-center text-slate-500">Loading financial data...</div>:error?<PageError message={error} onRetry={load}/>:data?<>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">{cards.map(([label,value])=><div key={String(label)} className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">{label}</p><b className="text-xl md:text-2xl block mt-1">{label==="Orders"?Number(value||0):moneyValue(value)}</b></div>)}</div>
      {isMain&&<div className="grid md:grid-cols-3 gap-4"><div className="bg-white border rounded-3xl p-5"><p className="text-xs text-slate-500">Total Income</p><b className="text-3xl">{moneyValue(data.income?.totalIncome)}</b><p className="text-xs text-slate-500 mt-2">Commission + delivery revenue + configured inflows</p></div><div className="bg-white border rounded-3xl p-5"><p className="text-xs text-slate-500">Recorded Expenses</p><b className="text-3xl">{moneyValue(data.expenses?.totalExpenses)}</b><p className="text-xs text-slate-500 mt-2">Only recorded refund/payout/incentive/adjustment outflows</p></div><div className="bg-white border rounded-3xl p-5"><p className="text-xs text-slate-500">Net Profit</p><b className="text-3xl">{moneyValue(data.profit?.netProfit)}</b><p className="text-xs text-slate-500 mt-2">Income − recorded expenses</p></div></div>}
      <div className="bg-white border rounded-3xl p-6"><div className="flex justify-between items-center gap-3"><div><h3 className="font-bold text-lg">Sales / Income / Expenses / Profit</h3><p className="text-xs text-slate-500 mt-1">Based on backend timestamps for the selected range.</p></div></div><div className="h-64 mt-6 flex items-end gap-1 sm:gap-2 overflow-x-auto">{series.map((x:any)=><div key={x.date} className="min-w-[22px] sm:min-w-[34px] flex-1 h-full flex flex-col justify-end" title={`${x.label} · Sales ${moneyValue(x.sales)} · Income ${moneyValue(x.income)} · Expenses ${moneyValue(x.expenses)} · Profit ${moneyValue(x.profit)}`}><div style={{height:`${Math.max(4,Number(x.sales||0)/max*210)}px`}} className="bg-emerald-500 rounded-t-md opacity-40"/><div style={{height:`${Math.max(4,Number(x.income||0)/max*210)}px`}} className="bg-emerald-600 rounded-t-md opacity-70 -mt-[4px]"/><div style={{height:`${Math.max(4,Number(x.expenses||0)/max*210)}px`}} className="bg-slate-700 rounded-t-md opacity-60 -mt-[4px]"/><span className="text-[9px] text-slate-400 text-center mt-2 whitespace-nowrap">{x.label}</span></div>)}</div><div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-3"><span>Sales</span><span>Income</span><span>Expenses</span><span>Profit</span></div></div>
      <div className="grid lg:grid-cols-2 gap-5"><div className="bg-white border rounded-3xl p-6"><h3 className="font-bold text-lg">Income</h3><div className="mt-4 space-y-3">{[["Gross Sales",data.sales?.grossSales],["Net Sales",data.sales?.netSales],["Commission Income",data.income?.commissionIncome??data.commission],["Delivery Revenue",data.income?.deliveryRevenue??data.deliveryRevenue],["Other Configured Income",data.income?.otherConfiguredIncome??0],["Total Income",data.income?.totalIncome]].map(([l,v])=><div key={String(l)} className="flex justify-between border-b pb-2 text-sm"><span>{l}</span><b>{moneyValue(v)}</b></div>)}</div></div><div className="bg-white border rounded-3xl p-6"><h3 className="font-bold text-lg">Expenses & Profit</h3><div className="mt-4 space-y-3">{[["Refunds",data.expenses?.refunds??data.refunds],["Store Payouts",data.expenses?.storePayouts??0],["Delivery Payouts",data.expenses?.deliveryPayouts??0],["Incentives",data.expenses?.incentives??0],["Recorded Adjustments",data.expenses?.recordedExpenses??data.adjustments],["Total Expenses",data.expenses?.totalExpenses],["Net Profit",data.profit?.netProfit??data.storeEarnings]].map(([l,v])=><div key={String(l)} className="flex justify-between border-b pb-2 text-sm"><span>{l}</span><b>{moneyValue(v)}</b></div>)}</div></div></div>
      {isMain&&<div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b"><h3 className="font-bold text-lg">Store-wise Finance</h3><p className="text-xs text-slate-500 mt-1">Each store is calculated from its own storeAdmin scope.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Store","Sales","Commission","Refunds","Adjustments","Earnings","Pending Payout","Paid Payout"].map(x=><th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{(data.storeWise||[]).map((x:any)=><tr key={x.storeId} className="border-t"><td className="p-3 font-semibold">{x.name}<div className="text-xs text-slate-500">{x.employeeId||""}</div></td><td className="p-3">{moneyValue(x.grossSales)}</td><td className="p-3">{moneyValue(x.commission)}</td><td className="p-3">{moneyValue(x.refunds)}</td><td className="p-3">{moneyValue(x.adjustments)}</td><td className="p-3 font-bold">{moneyValue(x.storeEarnings)}</td><td className="p-3">{moneyValue(x.pendingPayout)}</td><td className="p-3">{moneyValue(x.paidPayout)}</td></tr>)}</tbody></table>{!(data.storeWise||[]).length&&<div className="p-8 text-center text-slate-500">No store financial records in this range.</div>}</div></div>}
      {!isMain&&<div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-900"><b>Store isolation:</b> this screen is restricted by the backend to your own Store Admin tenant. Another store's revenue, refunds, commission or payouts are not returned.</div>}
    </>:<div className="bg-white border rounded-3xl py-20 text-center text-slate-500">No financial data available for this range.</div>}
  </div>;
}

function AdminFinanceManagement(){
  const [users,setUsers]=useState<any[]>([]); const [permissions,setPermissions]=useState<string[]>([]); const [form,setForm]=useState<any>({name:"",employeeId:"",email:"",phone:"",username:"",password:"",confirmPassword:"",role:"finance_manager",department:"Finance",status:"ACTIVE"}); const [editing,setEditing]=useState<any>(null); const [saving,setSaving]=useState(false); const [togglingId,setTogglingId]=useState<string|null>(null); const [settings,setSettings]=useState<any>({requireMainAdminApproval:false,refundApprovalThreshold:0,defaultPayout:35,payoutSchedule:"Manual",commissionRate:0,incentiveThresholds:[]});
  const load=async()=>{try{const [u,s]=await Promise.all([axios.get(API+"/admin/finance/users",{headers:adminHeaders()}),axios.get(API+"/admin/finance/settings",{headers:adminHeaders()})]);setUsers(u.data.data||[]);setPermissions(u.data.permissions||[]);setSettings(s.data.data||settings)}catch(e:any){alert(e?.response?.data?.message||"Unable to load Finance Management")}};
  useEffect(()=>{load()},[]);
  const create=async()=>{if(form.password!==form.confirmPassword)return alert("Passwords do not match");setSaving(true);try{if(editing){await axios.patch(API+"/admin/finance/users/"+editing._id,form,{headers:adminHeaders()});}else{await axios.post(API+"/admin/finance/users",form,{headers:adminHeaders()});}alert(editing?"Finance account updated":"Finance account created");setEditing(null);setForm({name:"",employeeId:"",email:"",phone:"",username:"",password:"",confirmPassword:"",role:"finance_manager",department:"Finance",status:"ACTIVE"});await load()}catch(e:any){alert(e?.response?.data?.message||"Unable to save Finance account")}finally{setSaving(false)}};
  const edit=(u:any)=>{setEditing(u);setForm({name:u.name||"",employeeId:u.employeeId||"",email:u.email||"",phone:u.phone||"",username:u.username||u.email||"",password:"",confirmPassword:"",role:u.role||"finance_manager",department:u.department||"Finance",status:u.status||"ACTIVE",permissions:u.permissions||[]})};
  const toggle=async(u:any)=>{const id=String(u?._id||"").trim();if(!id||togglingId===id)return;const nextBlocked=!Boolean(u?.blocked);setTogglingId(id);try{const r=await axios.patch(API+"/admin/finance/users/"+encodeURIComponent(id)+"/status",{blocked:nextBlocked},{headers:{...adminHeaders(),"Cache-Control":"no-cache"}});const updated=r?.data?.data;if(!r?.data?.success||!updated)throw new Error(r?.data?.message||"Unable to update Finance status");setUsers(xs=>xs.map(x=>String(x._id)===id?{...x,...updated,status:updated.status|| (updated.blocked?"INACTIVE":"ACTIVE")}:x));await load()}catch(e:any){console.error("FINANCE STATUS TOGGLE ERROR",e);alert(e?.response?.data?.message||e?.message||"Unable to update Finance status")}finally{setTogglingId(null)}};
  const savePermissions=async(u:any)=>{try{await axios.patch(API+"/admin/finance/users/"+u._id+"/permissions",{permissions:u.permissions||[]},{headers:adminHeaders()});await load();alert("Permissions updated")}catch(e:any){alert(e?.response?.data?.message||"Unable to update permissions")}};
  const reset=async(u:any)=>{const p=window.prompt("Set a new temporary password (8+ chars). It will never be displayed or stored in plaintext:");if(!p)return;const c=window.prompt("Confirm temporary password:");if(c!==p)return alert("Passwords do not match");try{await axios.patch(API+"/admin/finance/users/"+u._id+"/password",{password:p,confirmPassword:c,forcePasswordChange:true},{headers:adminHeaders()});alert("Temporary password set. Share it securely with the Finance employee.")}catch(e:any){alert(e?.response?.data?.message||"Unable to reset password")}};
  const saveSettings=async()=>{try{await axios.patch(API+"/admin/finance/settings",settings,{headers:adminHeaders()});alert("Finance settings saved")}catch(e:any){alert(e?.response?.data?.message||"Unable to save settings")}};
  const togglePermission=(u:any,p:string)=>setUsers(xs=>xs.map(x=>x._id===u._id?{...x,permissions:(x.permissions||[]).includes(p)?(x.permissions||[]).filter((z:string)=>z!==p):[...(x.permissions||[]),p]}:x));
  return <div className="mt-8 border-t pt-8 space-y-5"><div><h3 className="text-2xl font-bold">Finance Management</h3><p className="text-sm text-slate-500 mt-1">Main Admin controls Finance accounts, permissions, settings and financial operations without changing the existing admin system.</p></div><div className="bg-white border rounded-3xl p-6"><h4 className="font-bold text-lg">{editing?"Edit Finance Account":"Create Finance Account"}</h4><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">{[["name","Full Name"],["employeeId","Employee ID"],["email","Email"],["phone","Mobile Number"],["username","Username / Login ID"],["department","Department"]].map(([k,l])=><label key={k} className="text-sm font-semibold">{l}<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>)}<label className="text-sm font-semibold">Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option value="finance_manager">FINANCE_MANAGER</option><option value="finance_executive">FINANCE_EXECUTIVE</option></select></label><label className="text-sm font-semibold">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option>ACTIVE</option><option>INACTIVE</option></select></label>{!editing&&<><label className="text-sm font-semibold">Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">Confirm Password<input type="password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label></>}</div><div className="flex gap-2 mt-4"><button disabled={saving} onClick={create} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">{editing?"Save Changes":"Create Finance Account"}</button>{editing&&<button onClick={()=>setEditing(null)} className="border rounded-xl px-5 py-3 font-bold">Cancel</button>}</div></div>
  <div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b"><h4 className="font-bold text-lg">Finance Team</h4><p className="text-xs text-slate-500">Passwords are never exposed. Main Admin can activate, deactivate, reset, edit and assign permissions.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Name","Employee ID","Email / Login","Role","Status","Last Login","Actions"].map(x=><th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{users.map((u:any)=><tr key={u._id} className="border-t"><td className="p-3 font-semibold">{u.name}</td><td className="p-3">{u.employeeId}</td><td className="p-3">{u.email}<div className="text-xs text-slate-500">{u.username||u.email}</div></td><td className="p-3">{u.role}</td><td className="p-3">{u.status}</td><td className="p-3">{u.lastLogin?new Date(u.lastLogin).toLocaleString("en-IN"):"Never"}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button onClick={()=>edit(u)} className="border rounded-lg px-2 py-1">Edit</button><button type="button" disabled={togglingId===String(u._id)} onClick={(e)=>{e.preventDefault();e.stopPropagation();toggle(u)}} className="border rounded-lg px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed">{togglingId===String(u._id)?"Saving...":u.status==="ACTIVE"?"Deactivate":"Activate"}</button><button onClick={()=>reset(u)} className="border rounded-lg px-2 py-1">Reset Password</button></div><details className="mt-2"><summary className="cursor-pointer text-emerald-700 font-semibold">Permissions</summary><div className="mt-2 grid md:grid-cols-2 gap-1">{permissions.map((p:string)=><label key={p} className="text-xs"><input type="checkbox" checked={(u.permissions||[]).includes(p)} onChange={()=>togglePermission(u,p)}/> {p}</label>)}</div><button onClick={()=>savePermissions(u)} className="mt-2 bg-slate-900 text-white rounded-lg px-3 py-1 text-xs">Save permissions</button></details></td></tr>)}</tbody></table></div></div>
  <div className="bg-white border rounded-3xl p-6"><h4 className="font-bold text-lg">Finance Settings</h4><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4"><label className="text-sm font-semibold flex gap-2 items-center"><input type="checkbox" checked={Boolean(settings.requireMainAdminApproval)} onChange={e=>setSettings({...settings,requireMainAdminApproval:e.target.checked})}/> Require Main Admin Approval</label><label className="text-sm font-semibold">Refund Approval Threshold<input type="number" min="0" value={settings.refundApprovalThreshold??0} onChange={e=>setSettings({...settings,refundApprovalThreshold:Number(e.target.value)})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">Default Delivery Payout<input type="number" min="0" value={settings.defaultPayout??35} onChange={e=>setSettings({...settings,defaultPayout:Number(e.target.value)})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">Payout Schedule<input value={settings.payoutSchedule||"Manual"} onChange={e=>setSettings({...settings,payoutSchedule:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">Store Commission Rate (%)<input type="number" min="0" max="100" step="0.01" value={settings.commissionRate??0} onChange={e=>setSettings({...settings,commissionRate:Number(e.target.value)})} className="mt-2 w-full border rounded-xl p-3"/><span className="text-xs text-slate-500">Only new financially finalized Store orders use this rate; existing snapshots remain unchanged.</span></label></div><div className="mt-4 flex gap-2"><button onClick={saveSettings} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">Save Finance Settings</button></div></div>
  </div>;
}

function MainAdminStoreDirectory() {
  const [stores,setStores]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState<string|null>(null);
  const load=async()=>{setLoading(true);try{const r=await axios.get(API+"/admin/stores",{headers:adminHeaders()});setStores(Array.isArray(r.data.data)?r.data.data:[])}catch{setStores([])}finally{setLoading(false)}}; useEffect(()=>{load()},[]);
  const updateImage=async(id:string,file?:File)=>{if(!file)return;if(!file.type.startsWith("image/"))return alert("Only image files are allowed.");if(file.size>700*1024)return alert("Store image must be 700 KB or smaller.");const r=new FileReader();r.onload=async()=>{setSaving(id);try{const x=await axios.patch(API+"/admin/stores/"+id,{image:String(r.result||"")},{headers:adminHeaders()});setStores(a=>a.map(st=>st.id===id?{...st,image:x.data?.data?.image||String(r.result||"")}:st));}catch(e:any){alert(e?.response?.data?.message||"Unable to update store image")}finally{setSaving(null)}};r.readAsDataURL(file)};
  const removeImage=async(id:string)=>{setSaving(id);try{await axios.patch(API+"/admin/stores/"+id,{image:""},{headers:adminHeaders()});setStores(a=>a.map(st=>st.id===id?{...st,image:""}:st));}catch(e:any){alert(e?.response?.data?.message||"Unable to remove store image")}finally{setSaving(null)}};
  return <section className="mt-8 bg-white border rounded-3xl p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-emerald-600 text-xs font-bold">ALL STORES</p><h3 className="text-xl font-bold">Store Network</h3><p className="text-sm text-slate-500 mt-1">Every active admin store is visible here. Main Admin can maintain storefront images without entering another admin workspace.</p></div><button onClick={load} className="border rounded-xl px-3 py-2 text-sm font-bold">Refresh</button></div>{loading?<p className="py-8 text-center text-slate-500">Loading stores...</p>:<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">{stores.map(st=><div key={st.id} className="border rounded-2xl p-4"><div className="relative">{st.image?<img src={st.image} alt={st.name||"Store"} className="w-full h-32 object-cover rounded-2xl"/>:<div className="w-full h-32 rounded-2xl bg-slate-100 grid place-items-center"><Store size={38} className="text-slate-400"/></div>}</div><div className="flex gap-2 mt-3"><label className="border rounded-xl px-3 py-2 text-xs font-bold cursor-pointer">{saving===st.id?"Saving...":st.image?"Replace image":"Upload image"}<input type="file" accept="image/*" className="hidden" onChange={e=>updateImage(st.id,e.target.files?.[0])}/></label>{st.image&&<button disabled={saving===st.id} onClick={()=>removeImage(st.id)} className="border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs font-bold">Remove</button>}</div><div className="mt-4"><div className="flex items-start justify-between gap-2"><div><b>{st.name}</b><p className="text-xs text-slate-500 mt-1">{st.category||"Local Store"}</p><p className="text-xs text-slate-500">{st.address||"Address not configured"}</p></div>{st.isMainStore&&<span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">MAIN</span>}</div><div className="grid grid-cols-3 gap-2 mt-4 text-center"><div className="bg-slate-50 rounded-xl p-2"><b>{st.productCount||0}</b><p className="text-[10px] text-slate-500">Products</p></div><div className="bg-slate-50 rounded-xl p-2"><b>{st.categoryCount||0}</b><p className="text-[10px] text-slate-500">Categories</p></div><div className="bg-slate-50 rounded-xl p-2"><b>{st.bannerCount||0}</b><p className="text-[10px] text-slate-500">Offers</p></div></div></div></div>)}</div>}</section>;
}

function AdminSettings() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", profilePhoto: "", latitude: "", longitude: "", locationAccuracy: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);

  const isMainAdmin = (() => {
    const u = getAuthUser();
    return String(u?.role || "") === "admin" &&
      (Boolean(u?.isMainAdmin) || String(u?.email || "").toLowerCase() === "admin@grocery.com");
  })();

  const loadSecurityAlerts = async () => {
    if (!isMainAdmin) return;
    setSecurityLoading(true);
    try {
      const r = await axios.get(API + "/admin/security-alerts?limit=50", { headers: adminHeaders() });
      setSecurityAlerts(Array.isArray(r.data?.data) ? r.data.data : []);
    } catch {
      setSecurityAlerts([]);
    } finally {
      setSecurityLoading(false);
    }
  };

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await axios.get(API + "/auth/me", { headers: adminHeaders() });
      const u = r.data.data || {};
      setProfile({ name: u.name || "", email: u.email || "", phone: u.phone || "", profilePhoto: u.profilePhoto || "", latitude: u.latitude ?? "", longitude: u.longitude ?? "", locationAccuracy: u.locationAccuracy ?? "" });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load admin settings.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); loadSecurityAlerts(); }, [isMainAdmin]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const r = await axios.patch(API + "/admin/settings/profile", { name: profile.name, phone: profile.phone, profilePhoto: profile.profilePhoto, latitude: profile.latitude, longitude: profile.longitude, locationAccuracy: profile.locationAccuracy }, { headers: adminHeaders() });
      const u = r.data.data || {};
      setProfile({ name: u.name || "", email: u.email || "", phone: u.phone || "", profilePhoto: u.profilePhoto || "", latitude: u.latitude ?? "", longitude: u.longitude ?? "", locationAccuracy: u.locationAccuracy ?? "" });
      alert("Admin profile updated successfully.");
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to update admin profile."); }
    finally { setSavingProfile(false); }
  };

  const captureAdminLocation = () => {
    if (!navigator.geolocation) return alert("Location is not supported on this device.");
    navigator.geolocation.getCurrentPosition(
      p => setProfile(v=>({...v,latitude:p.coords.latitude.toFixed(7),longitude:p.coords.longitude.toFixed(7),locationAccuracy:Number.isFinite(Number(p.coords.accuracy))?Math.round(Number(p.coords.accuracy)).toString():""})),
      () => alert("Unable to access current location. Please enable precise location/GPS permission."),
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  };
  const adminPhotoFile = (file:File) => {
    if(!file.type.startsWith("image/"))return alert("Only image files are allowed.");
    if(file.size>700*1024)return alert("Profile photo must be 700 KB or smaller.");
    const reader=new FileReader(); reader.onload=()=>setProfile(v=>({...v,profilePhoto:String(reader.result||"")})); reader.readAsDataURL(file);
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
            <div className="md:col-span-2 border rounded-2xl p-4"><p className="text-sm font-bold">Profile Photo</p><div className="flex flex-wrap items-center gap-4 mt-3"><div className="w-16 h-16 rounded-2xl overflow-hidden border bg-slate-50 grid place-items-center">{profile.profilePhoto?<img src={profile.profilePhoto} alt="Admin profile" className="w-full h-full object-cover"/>:<User size={24} className="text-slate-300"/>}</div><ImagePickerButtons compact onFile={adminPhotoFile}/></div></div>
            <div className="md:col-span-2 border rounded-2xl p-4"><p className="text-sm font-bold">Operating Location</p><p className="text-xs text-slate-500 mt-1">Used for the backend-enforced 30 KM store coverage rule. Coordinates must come from your real location; they are never hardcoded.</p><div className="grid md:grid-cols-3 gap-2 mt-3"><input value={profile.latitude} onChange={e=>setProfile({...profile,latitude:e.target.value})} placeholder="Latitude" className="border rounded-xl p-3"/><input value={profile.longitude} onChange={e=>setProfile({...profile,longitude:e.target.value})} placeholder="Longitude" className="border rounded-xl p-3"/><input value={profile.locationAccuracy} onChange={e=>setProfile({...profile,locationAccuracy:e.target.value})} placeholder="Accuracy (m)" className="border rounded-xl p-3"/></div><button type="button" onClick={captureAdminLocation} className="mt-3 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 font-bold inline-flex items-center gap-2"><MapPin size={15}/>Use Current Location</button></div>
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

      {isMainAdmin && (
        <div className="bg-white border rounded-3xl overflow-hidden">
          <div className="p-6 border-b flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-600" size={20} />
                <h3 className="font-bold text-lg">Suspicious Activity Alerts</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Security signals generated from recorded system activity.
              </p>
            </div>
            <button
              type="button"
              onClick={loadSecurityAlerts}
              disabled={securityLoading}
              className="border rounded-xl px-3 py-2 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={15} className={securityLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {securityLoading ? (
            <div className="p-8 text-center text-slate-500">Loading security alerts...</div>
          ) : securityAlerts.length ? (
            <div className="divide-y">
              {securityAlerts.map((a: any) => (
                <div key={String(a._id)} className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <b>{a.metadata?.title || a.securityEvent || "Security alert"}</b>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-800">
                          {a.securitySeverity || "MEDIUM"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {a.metadata?.message || "Security event detected."}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Event: {a.securityEvent || "—"} · {a.createdAt ? new Date(a.createdAt).toLocaleString("en-IN") : "—"}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${
                      a.resolvedAt ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}>
                      {a.resolvedAt ? "Resolved" : "New"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              No suspicious activity alerts have been recorded.
            </div>
          )}
        </div>
      )}

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


const CUSTOMER_CARE_PERMISSION_LABELS: Record<string, string> = {
  "customer.search": "Search customers",
  "customer.view": "View customer profiles",
  "order.search": "Search orders",
  "order.view": "View order details",
  "ticket.create": "Create tickets",
  "ticket.update": "Update tickets",
  "ticket.resolve": "Resolve tickets",
  "refund.request": "Create refund requests",
  "replacement.request": "Create replacement requests",
  "cancellation.request": "Process cancellation requests",
  "notes.add": "Add internal notes",
  "ticket.escalate": "Escalate tickets",
  "support.history": "View support history",
};


function CustomerCareAnalytics() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { const r=await axios.get(API+"/admin/customer-care-analytics",{headers:adminHeaders()}); setData(r.data.data||{}); } catch(e:any){ console.error(e); } finally{setLoading(false);} };
  useEffect(()=>{load();},[]);
  const cards=[['Total Tickets',data.totalTickets],['Open Tickets',data.openTickets],['Resolved Tickets',data.resolvedTickets],['Pending Tickets',data.pendingTickets],['Avg Resolution',`${data.averageResolutionTimeMinutes||0} min`],['Refund Requests',data.refundRequests],['Replacement Requests',data.replacementRequests],['Escalated Tickets',data.escalatedTickets]];
  return <div><div><p className="text-emerald-600 text-sm font-bold">MAIN ADMIN ANALYTICS</p><h3 className="text-2xl font-bold">Customer Care Analytics</h3><p className="text-sm text-slate-500 mt-1">Support metrics are isolated from the existing Admin analytics.</p></div>{loading?<div className="py-8 text-center text-slate-500">Loading analytics...</div>:<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">{cards.map(([label,value])=><div key={label} className="bg-slate-50 border rounded-2xl p-4"><b className="text-xl">{value??0}</b><p className="text-xs text-slate-500 mt-1">{label}</p></div>)}</div>}</div>;
}

function CustomerCareManagement() {
  const [executives, setExecutives] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", employeeId: "", profilePhoto: "", password: "", permissions: [] as string[] });

  const resetForm = () => setForm({ name: "", email: "", phone: "", employeeId: "", profilePhoto: "", password: "", permissions: [...permissions] });

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/customer-care", { headers: adminHeaders() });
      setExecutives(Array.isArray(r.data.data) ? r.data.data : []);
      setPermissions(Array.isArray(r.data.permissions) ? r.data.permissions : Object.keys(CUSTOMER_CARE_PERMISSION_LABELS));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Unable to load Customer Care executives.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing(null); setOverview(null); resetForm(); };
  const startEdit = (item: any) => {
    setEditing(item);
    setOverview(null);
    setForm({ name: item.name || "", email: item.email || "", phone: item.phone || "", employeeId: item.employeeId || "", profilePhoto: item.profilePhoto || "", password: "", permissions: Array.isArray(item.permissions) ? item.permissions : [...permissions] });
  };

  const setCarePhoto = (file:File) => {
    if(!file.type.startsWith("image/"))return alert("Only image files are allowed.");
    if(file.size>700*1024)return alert("Photo must be 700 KB or smaller.");
    const reader=new FileReader();reader.onload=()=>setForm(v=>({...v,profilePhoto:String(reader.result||"")}));reader.readAsDataURL(file);
  };

  const save = async () => {
    const payload: any = { name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone, employeeId: form.employeeId.trim(), profilePhoto: form.profilePhoto.trim(), permissions: form.permissions };
    if (!payload.name || !payload.email) return alert("Name and email are required.");
    if (!editing && form.password.length < 8) return alert("Password must be at least 8 characters.");
    if (editing && form.password) payload.password = form.password;
    else if (!editing) payload.password = form.password;
    setSaving(true);
    try {
      if (editing) await axios.patch(API + "/admin/customer-care/" + editing._id, payload, { headers: adminHeaders() });
      else await axios.post(API + "/admin/customer-care", payload, { headers: adminHeaders() });
      alert(editing ? "Customer Care Executive updated successfully." : "Customer Care Executive created successfully.");
      resetForm(); setEditing(null); await load();
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to save Customer Care Executive."); }
    finally { setSaving(false); }
  };

  const toggle = async (item: any) => {
    try {
      await axios.patch(API + "/admin/customer-care/" + item._id + "/status", { blocked: !item.blocked }, { headers: adminHeaders() });
      await load();
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to update status."); }
  };

  const viewOverview = async (item: any) => {
    try {
      setSelected(item);
      const r = await axios.get(API + "/admin/customer-care/" + item._id + "/overview", { headers: adminHeaders() });
      setOverview(r.data.data);
    } catch (e: any) { alert(e?.response?.data?.message || "Unable to load Customer Care profile."); }
  };

  const togglePermission = (permission: string) => setForm(f => ({ ...f, permissions: f.permissions.includes(permission) ? f.permissions.filter(x => x !== permission) : [...f.permissions, permission] }));

  return (
    <div className="space-y-5">
      <div className="border-t pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><p className="text-emerald-600 text-sm font-bold">NEW SUPPORT MODULE</p><h3 className="text-2xl font-bold">Customer Care Management</h3><p className="text-sm text-slate-500 mt-1">Create, secure and manage Customer Care Executives without changing the existing Sub Admin system.</p></div>
          <button onClick={startCreate} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold inline-flex items-center gap-2"><PlusCircle size={17}/>Create Customer Care</button>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-6">
        <h4 className="font-bold text-lg">Customer Care Executive</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          <label className="text-sm font-semibold">Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label>
          <label className="text-sm font-semibold">Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label>
          <label className="text-sm font-semibold">Mobile<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label>
          <label className="text-sm font-semibold">Employee ID <span className="text-slate-400 font-normal">(auto-generated)</span><input value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label>
          <div><label className="text-sm font-semibold">Profile photo URL<input value={form.profilePhoto} onChange={e=>setForm({...form,profilePhoto:e.target.value})} placeholder="https://..." className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label><div className="mt-2"><ImagePickerButtons compact onFile={setCarePhoto}/></div></div>
          <label className="text-sm font-semibold">{editing ? "New password (optional)" : "Password"}<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="mt-2 w-full border rounded-xl px-3 py-2.5"/></label>
        </div>
        <div className="mt-5">
          <p className="text-sm font-bold">Permissions</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
            {permissions.map(permission => <label key={permission} className="flex items-center gap-2 border rounded-xl p-3 text-sm"><input type="checkbox" checked={form.permissions.includes(permission)} onChange={()=>togglePermission(permission)}/><span>{CUSTOMER_CARE_PERMISSION_LABELS[permission] || permission}</span></label>)}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button disabled={saving} onClick={save} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{saving ? "Saving..." : editing ? "Update Executive" : "Create Executive"}</button>
          {editing && <button onClick={startCreate} className="border rounded-xl px-5 py-3 font-bold">Cancel edit</button>}
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3"><h4 className="font-bold text-lg">Customer Care Executives</h4><button onClick={load} className="border rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-2"><RefreshCw size={15}/>Refresh</button></div>
        {loading ? <div className="py-10 text-center text-slate-500">Loading...</div> : executives.length === 0 ? <EmptyState icon={Headphones} title="No Customer Care Executives" text="Create the first support executive above."/> : <div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Profile</th><th className="p-3">Employee ID</th><th className="p-3">Email / Mobile</th><th className="p-3">Status</th><th className="p-3">Tickets</th><th className="p-3">Action</th></tr></thead><tbody>{executives.map((x:any)=><tr key={x._id} className="border-b"><td className="p-3"><div className="flex items-center gap-3">{x.profilePhoto?<img src={x.profilePhoto} alt={x.name} className="w-10 h-10 rounded-full object-cover"/>:<div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 grid place-items-center"><Headphones size={18}/></div>}<div><b>{x.name}</b><p className="text-xs text-slate-500">CUSTOMER_CARE</p></div></div></td><td className="p-3">{x.employeeId}</td><td className="p-3">{x.email}<br/><span className="text-slate-500">{x.phone || "—"}</span></td><td className="p-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${x.blocked?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}`}>{x.blocked?'INACTIVE':'ACTIVE'}</span><p className="text-xs text-slate-400 mt-1">Last login: {x.lastLogin ? new Date(x.lastLogin).toLocaleString("en-IN") : "Never"}</p></td><td className="p-3">{x.assignedTickets || 0} assigned<br/><span className="text-xs text-slate-500">{x.resolvedTickets || 0} resolved</span></td><td className="p-3"><div className="flex flex-wrap gap-2"><button onClick={()=>viewOverview(x)} className="text-emerald-700 font-semibold">View</button><button onClick={()=>startEdit(x)} className="text-blue-700 font-semibold">Edit</button><button onClick={()=>toggle(x)} className="text-amber-700 font-semibold">{x.blocked?'Activate':'Deactivate'}</button></div></td></tr>)}</tbody></table></div>}
      </div>

      {selected && overview && <div className="bg-white border rounded-3xl p-6"><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-lg">{overview.executive.name}</h4><p className="text-sm text-slate-500">{overview.executive.email} · {overview.executive.employeeId}</p></div><button onClick={()=>{setSelected(null);setOverview(null)}}><X/></button></div><div className="grid sm:grid-cols-3 gap-3 mt-5"><div className="bg-slate-50 rounded-2xl p-4"><b>{overview.performance.assigned}</b><p className="text-xs text-slate-500">Assigned tickets</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>{overview.performance.resolved}</b><p className="text-xs text-slate-500">Resolved tickets</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>{overview.performance.averageResolutionMinutes} min</b><p className="text-xs text-slate-500">Average resolution</p></div></div><div className="grid lg:grid-cols-2 gap-5 mt-5"><div><h5 className="font-bold">Assigned / resolved tickets</h5><div className="mt-3 space-y-2">{overview.assignedTickets.slice(0,10).map((t:any)=><div key={t._id} className="border rounded-xl p-3 text-sm"><b>{t.ticketId}</b> · {t.status}<p className="text-xs text-slate-500">{t.category} · {t.customer?.name || "Customer"}</p></div>)}</div></div><div><h5 className="font-bold">Activity</h5><div className="mt-3 space-y-2 max-h-72 overflow-y-auto">{overview.activity.slice(0,20).map((a:any)=><div key={a._id} className="border rounded-xl p-3 text-sm"><b>{a.action}</b><p className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString("en-IN")}</p></div>)}</div></div></div></div>}
    </div>
  );
}


function SafeSupportViewAs({ store }: { store: ReturnType<typeof useStore> }) {
  const nav = useNavigate();
  const roleName = String(store.user?.role || "");
  const allowed = (roleName === "admin" && (Boolean(store.user?.isMainAdmin) || String(store.user?.email || "").toLowerCase() === "admin@grocery.com")) || roleName === "customer_care";
  const [mode,setMode]=useState<"customer"|"store">("customer");
  const [search,setSearch]=useState("");
  const [results,setResults]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const [session,setSession]=useState<any>(null);
  const [preview,setPreview]=useState<any>(null);
  const [error,setError]=useState("");
  const searchTargets=async()=>{
    const value=search.trim(); if(!value)return;
    setError("");setLoading(true);
    try{
      const r=await axios.get(API+"/admin/safe-view-as/search",{headers:adminHeaders(),params:{mode,search:value}});
      const rows=Array.isArray(r.data?.data)?r.data.data:[];setResults(rows);
      if(rows.length===1) await startSession(String(rows[0]._id));
      else if(!rows.length) setError(`No ${mode === "customer" ? "customer" : "store"} found.`);
    }catch(e:any){setError(e?.response?.data?.message||"Unable to search.");}
    finally{setLoading(false);}
  };
  const startSession=async(targetId:string)=>{
    setError("");setLoading(true);
    try{
      const r=await axios.post(API+"/admin/safe-view-as/start",{targetId,mode},{headers:adminHeaders()});
      const d=r.data?.data;setSession(d);setPreview(null);setResults([]);await loadSession(d.token);
    }catch(e:any){setError(e?.response?.data?.message||"Unable to start safe view session.");}
    finally{setLoading(false);}
  };
  const loadSession=async(token:string)=>{
    try{const r=await axios.get(API+"/admin/safe-view-as/session",{headers:{"X-FreshBasket-View-Token":token}});setPreview(r.data?.data||null);}catch(e:any){setError(e?.response?.data?.message||"Unable to load read-only preview.");}
  };
  const endSession=async()=>{
    if(session?.token){try{await axios.post(API+"/admin/safe-view-as/end",{}, {headers:{"X-FreshBasket-View-Token":session.token}})}catch{}}
    setSession(null);setPreview(null);setResults([]);setSearch("");
  };
  useEffect(()=>()=>{if(session?.token) void axios.post(API+"/admin/safe-view-as/end",{}, {headers:{"X-FreshBasket-View-Token":session.token}}).catch(()=>{});},[session?.token]);
  if(!allowed)return <NavigateToLogin/>;
  const money=(v:any)=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2});
  return <div className="space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div><p className="text-emerald-600 text-xs font-black uppercase tracking-[.18em]">SAFE SUPPORT</p><h2 className="text-2xl md:text-3xl font-black">View As</h2><p className="text-sm text-slate-500 mt-1">Temporary, read-only inspection of a customer or Store Admin experience. Passwords and credentials are never exposed.</p></div>
      {session&&<button onClick={endSession} className="border border-red-200 text-red-700 rounded-xl px-4 py-2.5 font-bold">End session</button>}
    </div>
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900"><b>Read-only session</b><p className="mt-1">This temporary authorized session expires in about 15 minutes. Actions that change data are not available.</p>{session?.expiresAt&&<p className="text-xs mt-2">Expires: {new Date(session.expiresAt).toLocaleString("en-IN")}</p>}</div>
    {!session&&<div className="bg-white border rounded-3xl p-5"><div className="flex gap-2 mb-4"><button onClick={()=>{setMode("customer");setResults([]);setError("")}} className={`px-4 py-2.5 rounded-xl font-bold border ${mode==="customer"?"bg-emerald-600 text-white border-emerald-600":""}`}>Customer</button><button onClick={()=>{setMode("store");setResults([]);setError("")}} className={`px-4 py-2.5 rounded-xl font-bold border ${mode==="store"?"bg-emerald-600 text-white border-emerald-600":""}`}>Store Admin</button></div><div className="flex flex-col sm:flex-row gap-3"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")searchTargets()}} placeholder={mode==="customer"?"Customer ID, name, mobile, email or Order ID":"Store name, Store Admin name, email or employee ID"} className="flex-1 border rounded-xl px-4 py-3"/><button disabled={loading||!search.trim()} onClick={searchTargets} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{loading?"Searching...":"Search"}</button></div>{error&&<p className="mt-3 text-sm text-red-700 font-semibold">{error}</p>}{results.length>0&&<div className="grid md:grid-cols-2 gap-3 mt-4">{results.map((x:any)=><button key={x._id} onClick={()=>startSession(String(x._id))} className="text-left border rounded-2xl p-4 hover:border-emerald-300"><b>{x.name||x.storeName||"—"}</b><p className="text-xs text-emerald-700 mt-1">{x.customerId||x.employeeId||""}</p><p className="text-sm text-slate-500 mt-2">{x.email||x.phone||x.storeCategory||"—"}</p></button>)}</div>}</div>}
    {session&&preview&&mode==="customer"&&<div className="space-y-5"><div className="bg-white border rounded-3xl p-6"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><p className="text-xs text-emerald-600 font-black">CUSTOMER EXPERIENCE</p><h3 className="text-2xl font-black">{preview.customer?.name||"—"}</h3><p className="text-sm text-slate-500 mt-1">{preview.customer?.customerId||"—"} · {preview.customer?.phone||"—"} · {preview.customer?.email||"—"}</p></div><span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-black">READ ONLY</span></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["Orders",preview.summary?.totalOrders], ["Active",preview.summary?.activeOrders], ["Completed",preview.summary?.completedOrders], ["Spent",money(preview.summary?.totalSpent)]].map(([l,v])=><div key={String(l)} className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">{l}</p><b className="text-xl mt-1 block">{v}</b></div>)}</div><div className="grid lg:grid-cols-2 gap-5"><section className="bg-white border rounded-3xl p-5"><h3 className="font-black">Saved Addresses</h3>{preview.addresses?.length?<div className="mt-3 space-y-2">{preview.addresses.map((a:any)=><div key={a._id} className="border rounded-xl p-3 text-sm"><b>{a.label||"Address"}</b><p className="text-slate-600 mt-1">{a.addressLine1||a.address||"—"}{a.city?`, ${a.city}`:""}</p></div>)}</div>:<p className="text-sm text-slate-400 mt-3">No saved addresses.</p>}</section><section className="bg-white border rounded-3xl p-5"><h3 className="font-black">Recent Orders</h3>{preview.orders?.length?<div className="mt-3 space-y-2 max-h-80 overflow-y-auto">{preview.orders.slice(0,10).map((o:any)=><div key={o._id} className="border rounded-xl p-3 text-sm flex justify-between gap-3"><div><b>#{String(o._id).slice(-8).toUpperCase()}</b><p className="text-xs text-slate-500 mt-1">{o.status} · {o.createdAt?new Date(o.createdAt).toLocaleString("en-IN"):"—"}</p></div><b>{money(o.total)}</b></div>)}</div>:<p className="text-sm text-slate-400 mt-3">No orders.</p>}</section></div></div>}
    {session&&preview&&mode==="store"&&<div className="space-y-5"><div className="bg-white border rounded-3xl p-6"><p className="text-xs text-emerald-600 font-black">STORE EXPERIENCE</p><h3 className="text-2xl font-black mt-1">{preview.store?.name||"Store"}</h3><p className="text-sm text-slate-500 mt-1">{preview.store?.storeCategory||"Grocery"} · {preview.store?.email||"—"} · {preview.store?.phone||"—"}</p></div><div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex justify-between"><div><h3 className="font-black">Visible product catalog</h3><p className="text-xs text-slate-500 mt-1">Public catalog data only; no store credentials or write controls.</p></div><span className="text-xs font-bold text-slate-500">{preview.products?.length||0} products</span></div>{preview.products?.length?<div className="divide-y">{preview.products.slice(0,50).map((p:any)=><div key={p._id} className="p-4 flex justify-between gap-4"><div><b>{p.name}</b><p className="text-xs text-slate-500 mt-1">{p.brand||""} · {p.unit||""} · Stock {Number(p.stock||0)}</p></div><b>{money(p.price)}</b></div>)}</div>:<p className="p-10 text-center text-slate-400">No visible products.</p>}</div></div>}
  </div>;
}

function Customer360({ store }: { store: ReturnType<typeof useStore> }) {
  const nav = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const roleName = String(store.user?.role || "");
  const isMain = roleName === "admin" && (Boolean(store.user?.isMainAdmin) || String(store.user?.email || "").toLowerCase() === "admin@grocery.com");
  const allowed = isMain || ["customer_care","finance_manager","finance_executive"].includes(roleName);
  const loadCustomer = async (id:string) => {
    if (!id) return;
    setLoading(true);
    try { const r=await axios.get(API+"/customer-360/"+encodeURIComponent(id),{headers:adminHeaders()}); setData(r.data.data||null); setSearch(r.data.data?.customer?.customerId||""); setResults([]); nav("/customer-360?customer="+encodeURIComponent(id),{replace:true}); }
    catch(e:any){ setData(null); alert(e?.response?.data?.message||"Unable to load Customer 360 profile."); }
    finally{setLoading(false);}
  };
  const searchCustomers = async () => {
    const value=search.trim(); if(!value)return;
    setSearching(true);
    try { const r=await axios.get(API+"/customer-360/search",{headers:adminHeaders(),params:{search:value}}); const rows=Array.isArray(r.data.data)?r.data.data:[]; setResults(rows); if(rows.length===1) await loadCustomer(String(rows[0]._id)); else if(!rows.length) alert("No customer found for the entered details."); }
    catch(e:any){alert(e?.response?.data?.message||"Customer search failed.");} finally{setSearching(false);}
  };
  useEffect(()=>{const id=new URLSearchParams(location.search).get("customer"); if(id&&allowed&&!data)loadCustomer(id);},[location.search,allowed]);
  if(!allowed)return <NavigateToLogin/>;
  const money0=(v:any)=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2});
  const statusClass=(s:string)=>{const x=String(s||"").toUpperCase();if(["COMPLETED","DELIVERED","PAID","APPROVED","REPLACED","CLOSED"].includes(x))return"bg-emerald-50 text-emerald-700 border-emerald-100";if(["REJECTED","FAILED","CANCELLED","EXPIRED"].includes(x))return"bg-red-50 text-red-700 border-red-100";return"bg-amber-50 text-amber-700 border-amber-100";};
  const cards=data?[["Total Orders",data.summary.totalOrders,Package],["Active Orders",data.summary.activeOrders,Clock3],["Completed",data.summary.completedOrders,CheckCircle2],["Total Spent",money0(data.summary.totalSpent),CircleDollarSign],["Refunds",data.summary.refunds,RefreshCw],["Replacements",data.summary.replacements,RefreshCw],["Support Tickets",data.summary.supportTickets,Ticket],["Pending Requests",data.summary.pendingRequests,AlertTriangle]]:[];
  return <div className="min-h-screen bg-slate-50 fb-dashboard-shell fb-care-shell">
    <header className="bg-white border-b sticky top-0 z-30"><div className="max-w-7xl mx-auto px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white grid place-items-center"><UserRoundSearch size={22}/></div><div><p className="text-xs text-emerald-600 font-black tracking-[.14em]">FRESHBASKET</p><h1 className="text-xl font-black">Customer 360 / Complete Kundali</h1><p className="text-xs text-slate-500">Read-only consolidated view · {roleName.replace(/_/g," ")}</p></div></div><div className="flex gap-2"><button onClick={()=>nav(isMain?"/admin":roleName==="customer_care"?"/customer-care":"/finance")} className="border rounded-xl px-4 py-2.5 font-semibold">Back to dashboard</button></div></div></header>
    <main className="max-w-7xl mx-auto px-5 py-7 space-y-6">
      <div className="bg-white border rounded-3xl p-5 md:p-6"><div className="flex flex-col lg:flex-row gap-3"><div className="relative flex-1"><Search size={18} className="absolute left-4 top-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")searchCustomers()}} placeholder="Search Customer ID, mobile, email, name or Order ID" className="w-full border rounded-2xl pl-11 pr-4 py-3.5 font-semibold"/><p className="text-[11px] text-slate-400 mt-2 pl-1">Customer ID is the primary exact identifier · Example: FB-CUS-000001</p></div><button disabled={searching||loading||!search.trim()} onClick={searchCustomers} className="bg-emerald-600 text-white rounded-2xl px-6 py-3.5 font-black disabled:opacity-50 inline-flex items-center justify-center gap-2"><Search size={17}/>{searching?"Searching...":"Search Customer"}</button></div></div>
      {results.length>0&&<div className="bg-white border rounded-3xl p-5"><div className="flex justify-between"><div><p className="text-xs text-emerald-600 font-black">MATCHES</p><h2 className="text-xl font-black">Select customer</h2></div><span className="text-xs font-bold text-slate-500">{results.length} result{results.length===1?"":"s"}</span></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">{results.map((c:any)=><button key={c._id} onClick={()=>loadCustomer(String(c._id))} className="text-left border rounded-2xl p-4 hover:border-emerald-300 hover:shadow-sm transition"><div className="flex justify-between gap-3"><div><b className="text-lg">{c.name||"—"}</b><p className="text-xs text-emerald-700 font-bold mt-1">{c.customerId||"No Customer ID"}</p></div><span className="px-2 py-1 rounded-full border text-[10px] font-black">{c.status}</span></div><p className="text-sm text-slate-500 mt-3">{c.phone||"—"} · {c.email||"—"}</p><p className="text-xs text-slate-400 mt-2">{c.totalOrders||0} orders · Member since {c.createdAt?new Date(c.createdAt).toLocaleDateString("en-IN"):"—"}</p></button>)}</div></div>}
      {loading&&<div className="bg-white border rounded-3xl p-12 text-center"><RefreshCw className="mx-auto animate-spin text-emerald-600" size={30}/><p className="font-bold mt-3">Loading Customer 360...</p></div>}
      {data&&!loading&&<>
        <div className="bg-white border rounded-3xl p-6"><p className="text-xs text-emerald-600 font-black tracking-[.16em]">CUSTOMER MASTER PROFILE</p><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-1"><div><h2 className="text-3xl font-black">{data.customer?.name||"—"}</h2><p className="text-sm text-slate-500 mt-1">{data.customer?.customerId||"—"} · {data.customer?.phone||"—"} · {data.customer?.email||"—"}</p></div><span className={`px-3 py-1.5 rounded-full border text-xs font-black ${statusClass(data.customer?.status)}`}>{data.customer?.status||"—"}</span></div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">{cards.map(([l,v,I]:any)=><div key={l} className="bg-white border rounded-2xl p-4"><div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center"><I size={17}/></div><p className="text-xs text-slate-500 mt-3">{l}</p><b className="text-lg">{v}</b></div>)}</div>
        <div className="grid lg:grid-cols-3 gap-5"><section className="bg-white border rounded-3xl p-5"><h3 className="font-black text-lg">Profile</h3><div className="mt-4 space-y-3 text-sm">{[["Customer ID",data.customer?.customerId],["Name",data.customer?.name],["Mobile",data.customer?.phone],["Email",data.customer?.email],["Status",data.customer?.status],["Registered",data.customer?.createdAt?new Date(data.customer.createdAt).toLocaleString("en-IN"):"—"],["Last Login",data.customer?.lastLogin?new Date(data.customer.lastLogin).toLocaleString("en-IN"):"Not available"]].map(([l,v])=><div key={String(l)} className="border-b last:border-b-0 pb-2"><span className="text-xs text-slate-400">{l}</span><p className="font-semibold break-words">{String(v||"—")}</p></div>)}</div></section><section className="bg-white border rounded-3xl p-5 lg:col-span-2"><div className="flex justify-between"><h3 className="font-black text-lg">Saved Addresses</h3><span className="text-xs text-slate-400">{data.addresses?.length||0}</span></div>{data.addresses?.length?<div className="grid md:grid-cols-2 gap-3 mt-4">{data.addresses.map((a:any)=><div key={a._id} className="border rounded-2xl p-4"><div className="flex justify-between"><b>{a.label||"Address"}</b>{a.isDefault&&<span className="text-[10px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-1 font-black">DEFAULT</span>}</div><p className="text-sm mt-2">{a.address||"—"}</p><p className="text-xs text-slate-500 mt-1">{[a.city,a.state,a.pincode].filter(Boolean).join(", ")}</p></div>)}</div>:<p className="text-sm text-slate-400 mt-4">No saved address records available.</p>}</section></div>
        <section className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex justify-between"><div><h3 className="font-black text-lg">Order History</h3><p className="text-xs text-slate-500 mt-1">Existing orders · click an Order ID to use the existing Order Details route.</p></div><span className="text-xs font-bold text-slate-500">{data.orders?.length||0}</span></div>{data.orders?.length?<div className="divide-y">{data.orders.map((o:any)=><div key={o._id} className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><button onClick={()=>nav("/orders/"+o._id)} className="font-black text-emerald-700 hover:underline">{o.orderId}</button><p className="text-xs text-slate-500 mt-1">{o.createdAt?new Date(o.createdAt).toLocaleString("en-IN"):"—"} · {o.store?.name||"FreshBasket Direct"}</p><p className="text-xs text-slate-400 mt-1">Delivery: {o.deliveryPartner?.name||"—"} · Delivered: {o.deliveredAt?new Date(o.deliveredAt).toLocaleString("en-IN"):"—"}</p></div><div className="flex flex-wrap gap-2 items-center"><span className={`px-2.5 py-1 rounded-full border text-[10px] font-black ${statusClass(o.status)}`}>{o.status||"—"}</span><span className="text-sm font-black">{money0(o.amount)}</span><span className="text-xs text-slate-500">{o.paymentStatus||"—"}</span></div></div>)}</div>:<div className="p-8 text-center text-slate-400">No orders found.</div>}</section>
        <div className="grid lg:grid-cols-2 gap-5"><section className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex justify-between"><h3 className="font-black text-lg">Refund History</h3><span className="text-xs font-bold text-slate-500">{data.refunds?.length||0}</span></div>{data.refunds?.length?<div className="divide-y max-h-[520px] overflow-y-auto">{data.refunds.map((r:any)=><div key={r._id} className="p-4"><div className="flex justify-between gap-3"><div><b>{r.requestId||String(r._id).slice(-8).toUpperCase()}</b><p className="text-xs text-slate-500 mt-1">Order #{String(r.order||"").slice(-8).toUpperCase()} · {r.product?.name||r.item?.name||"Item unavailable"}</p></div><span className={`px-2.5 py-1 rounded-full border text-[10px] font-black ${statusClass(r.status)}`}>{r.status}</span></div><div className="grid grid-cols-2 gap-3 mt-3 text-xs"><div><span className="text-slate-400">Requested</span><p className="font-bold">{money0(r.requestedAmount)}</p></div><div><span className="text-slate-400">Approved / Eligible</span><p className="font-bold">{money0(r.eligibleAmount)}</p></div><div><span className="text-slate-400">Method</span><p className="font-bold">{r.refundMethod||"—"}</p></div><div><span className="text-slate-400">Transaction Ref.</span><p className="font-bold break-words">{r.transactionReference||"—"}</p></div></div><p className="text-xs text-slate-400 mt-3">Care: {r.customerCareAgent?.name||"—"} · Finance Executive: {r.financeEmployee?.name||"—"} · Manager: {r.financeManager?.name||r.approvedBy?.name||"—"}</p></div>)}</div>:<div className="p-8 text-center text-slate-400">No refund requests.</div>}</section>
        <section className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex justify-between"><h3 className="font-black text-lg">Replacement History</h3><span className="text-xs font-bold text-slate-500">{data.replacements?.length||0}</span></div>{data.replacements?.length?<div className="divide-y max-h-[520px] overflow-y-auto">{data.replacements.map((r:any)=><div key={r._id} className="p-4"><div className="flex justify-between gap-3"><div><b>{r.requestId||r.replacementId||String(r._id).slice(-8).toUpperCase()}</b><p className="text-xs text-slate-500 mt-1">Order #{String(r.order||"").slice(-8).toUpperCase()} · {r.product?.name||r.item?.name||"Item unavailable"}</p></div><span className={`px-2.5 py-1 rounded-full border text-[10px] font-black ${statusClass(r.status)}`}>{r.status}</span></div><div className="grid grid-cols-2 gap-3 mt-3 text-xs"><div><span className="text-slate-400">Store</span><p className="font-bold">{r.store?.name||"—"}</p></div><div><span className="text-slate-400">Delivery Partner</span><p className="font-bold">{r.deliveryPartner?.name||"Not assigned"}</p></div><div><span className="text-slate-400">Proof</span><p className="font-bold">{r.deliveryProof?.image?"Available":"—"}</p></div><div><span className="text-slate-400">Completed</span><p className="font-bold">{r.replacementDeliveredAt?new Date(r.replacementDeliveredAt).toLocaleString("en-IN"):"—"}</p></div></div><p className="text-xs text-slate-400 mt-3">Customer Care: {r.customerCareAgent?.name||"—"} · Fulfillment: {r.storeAdmin?.name||r.mainAdmin?.name||"—"}</p></div>)}</div>:<div className="p-8 text-center text-slate-400">No replacement requests.</div>}</section></div>
        <section className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex justify-between"><h3 className="font-black text-lg">Customer Support History</h3><span className="text-xs font-bold text-slate-500">{data.tickets?.length||0}</span></div>{data.tickets?.length?<div className="divide-y">{data.tickets.map((t:any)=><div key={t._id} className="p-4 flex flex-col md:flex-row md:justify-between gap-2"><div><b>{t.ticketId||String(t._id).slice(-8).toUpperCase()}</b><p className="text-sm mt-1">{t.subject||t.category||"Support request"}</p><p className="text-xs text-slate-500 mt-1">Order: {t.order?`#${String(t.order._id||t.order).slice(-8).toUpperCase()}`:"—"} · Assigned: {t.assignedCustomerCare?.name||"—"} · Priority: {t.priority||"—"}</p></div><span className={`px-2.5 py-1 rounded-full border text-[10px] font-black self-start ${statusClass(t.status)}`}>{t.status||"—"}</span></div>)}</div>:<div className="p-8 text-center text-slate-400">No support tickets.</div>}</section>
        {data.access?.financeVisible&&<><section className="grid md:grid-cols-4 gap-3">{[["Total Paid",money0(data.finance?.summary?.totalPaid),CircleDollarSign],["Total Refunded",money0(data.finance?.summary?.totalRefunded),RefreshCw],["Pending Refund",money0(data.finance?.summary?.pendingRefundAmount),Clock3],["Adjustments",money0(data.finance?.summary?.financialAdjustments),History]].map(([l,v,I]:any)=><div key={l} className="bg-white border rounded-2xl p-4"><div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center"><I size={17}/></div><p className="text-xs text-slate-500 mt-3">{l}</p><b className="text-xl">{v}</b></div>)}</section><section className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b"><h3 className="font-black text-lg">Financial Customer History</h3><p className="text-xs text-slate-500 mt-1">Existing finance transactions only; sensitive credentials are excluded.</p></div>{data.finance?.transactions?.length?<div className="divide-y">{data.finance.transactions.map((t:any)=><div key={t._id} className="p-4 flex flex-col md:flex-row md:justify-between gap-2"><div><b>{t.transactionId||String(t._id).slice(-8).toUpperCase()}</b><p className="text-xs text-slate-500 mt-1">{t.type} · {t.paymentMethod||"—"} · Ref {t.paymentReference||"—"}</p><p className="text-xs text-slate-400 mt-1">{t.createdAt?new Date(t.createdAt).toLocaleString("en-IN"):"—"}</p></div><div className="text-right"><b>{money0(t.amount)}</b><p className="text-xs text-slate-500">{t.direction||"—"} · {t.status||"—"}</p></div></div>)}</div>:<div className="p-8 text-center text-slate-400">No financial transaction records linked to this customer.</div>}</section></>}
        <section className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b"><h3 className="font-black text-lg">Delivery History</h3></div>{data.deliveryHistory?.length?<div className="divide-y">{data.deliveryHistory.map((d:any)=><div key={d.id} className="p-4"><div className="flex justify-between gap-2"><div><b>{d.orderId}</b><p className="text-xs text-slate-500 mt-1">{d.store?.name||"FreshBasket Direct"} · {d.deliveryPartner?.name||"—"}</p></div><span className={`px-2.5 py-1 rounded-full border text-[10px] font-black ${statusClass(d.status)}`}>{d.status||"—"}</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs"><div><span className="text-slate-400">Assigned</span><p className="font-bold">{d.assignedAt?new Date(d.assignedAt).toLocaleString("en-IN"):"—"}</p></div><div><span className="text-slate-400">Pickup</span><p className="font-bold">{d.pickupAt?new Date(d.pickupAt).toLocaleString("en-IN"):"—"}</p></div><div><span className="text-slate-400">Out for Delivery</span><p className="font-bold">{d.outForDeliveryAt?new Date(d.outForDeliveryAt).toLocaleString("en-IN"):"—"}</p></div><div><span className="text-slate-400">Delivered</span><p className="font-bold">{d.deliveredAt?new Date(d.deliveredAt).toLocaleString("en-IN"):"—"}</p></div></div></div>)}</div>:<div className="p-8 text-center text-slate-400">No delivery history available.</div>}</section>
        <section className="bg-white border rounded-3xl p-5"><div className="flex items-center gap-3"><History className="text-emerald-600"/><div><h3 className="font-black text-lg">Customer Activity Timeline</h3><p className="text-xs text-slate-500 mt-1">Only persisted order, support, refund and replacement events.</p></div></div>{data.timeline?.length?<div className="mt-5 relative pl-6 space-y-4">{data.timeline.map((e:any,i:number)=><div key={`${e.type}-${e.at}-${i}`} className="relative"><span className="absolute -left-[25px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50"/><p className="text-sm font-black">{e.title}</p><p className="text-xs text-slate-500 mt-0.5">{e.detail||"—"}</p><p className="text-[11px] text-slate-400 mt-0.5">{e.at?new Date(e.at).toLocaleString("en-IN"):"—"}</p></div>)}</div>:<p className="text-sm text-slate-400 mt-5">No persisted activity events available.</p>}</section>
      </>}
    </main>
  </div>;
}

function CustomerCareDashboard({ store }: { store: ReturnType<typeof useStore> }) {
  const nav = useNavigate();
  const [stats, setStats] = useState<any>({ openTickets:0,pendingTickets:0,highPriority:0,resolvedToday:0,refundRequests:0,replacementRequests:0,deliveryComplaints:0,paymentComplaints:0 });
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketMeta, setTicketMeta] = useState<any>({ page:1,pages:1,total:0 });
  const [search, setSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("");
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [orderResults, setOrderResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({ customerId:"", orderId:"", category:"Other", description:"", priority:"MEDIUM", evidence:[] as string[] });
  const [ticketUpdate, setTicketUpdate] = useState({ status:"", priority:"", internalNotes:"" });
  const [escalation, setEscalation] = useState({ targetType:"MAIN_ADMIN", assignedUserId:"", reason:"", priority:"" });
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [requestReason, setRequestReason] = useState("");
  const [careMessage, setCareMessage] = useState("");
  const [careAttachment, setCareAttachment] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [supportItemId, setSupportItemId] = useState("");
  const [showSearchPanel, setShowSearchPanel] = useState(true);
  const [requests, setRequests] = useState<any>({refunds:[],replacements:[]});
  const [selectedRefundRequest, setSelectedRefundRequest] = useState<any>(null);
  const [refundDetailLoading, setRefundDetailLoading] = useState(false);
  const [refundRejectOpen, setRefundRejectOpen] = useState(false);
  const [refundRejectReason, setRefundRejectReason] = useState("");

  const headers = adminHeaders();
  const can = (permission: string) => Array.isArray(store.user?.permissions) ? (store.user.permissions.length === 0 || store.user.permissions.includes(permission)) : true;

  const loadDashboard = async () => {
    try { const r=await axios.get(API+"/customer-care/dashboard",{headers}); setStats(r.data.data||{}); } catch(e){ console.error(e); }
  };
  const loadRequests = async () => { try { const r=await axios.get(API+"/customer-care/requests",{headers}); const data=r.data?.data; if(data && Array.isArray(data.refunds) && Array.isArray(data.replacements)) setRequests(data); else throw new Error("Invalid request queue response"); } catch(e:any){ console.error("CUSTOMER CARE REQUEST QUEUE ERROR:", e?.response?.data || e); alert(e?.response?.data?.message || "Unable to load refund/replacement queue. Check the backend console."); } };
  const loadTickets = async (page=1) => {
    try { const r=await axios.get(API+"/customer-care/tickets",{headers,params:{page,limit:10,search,status:ticketStatusFilter,priority:ticketPriorityFilter}}); setTickets(Array.isArray(r.data.data)?r.data.data:[]); setTicketMeta(r.data.meta||{}); } catch(e:any){ alert(e?.response?.data?.message||"Unable to load tickets."); }
  };
  const searchAll = async () => {
    if (!search.trim()) return;
    try {
      const [c,o]=await Promise.all([
        can("customer.search")?axios.get(API+"/customer-care/customers",{headers,params:{search}}):Promise.resolve({data:{data:[]}}),
        can("order.search")?axios.get(API+"/customer-care/orders",{headers,params:{search}}):Promise.resolve({data:{data:[]}}),
      ]);
      setCustomerResults(c.data.data||[]); setOrderResults(o.data.data||[]); setShowSearchPanel(true); await loadTickets(1);
    } catch(e:any){ alert(e?.response?.data?.message||"Search failed."); }
  };
  useEffect(()=>{ loadDashboard(); loadTickets(1); loadRequests(); },[]);
  useEffect(()=>{ loadTickets(1); },[ticketStatusFilter,ticketPriorityFilter]);
  useEffect(()=>{ if(store.user?.role!=="customer_care") return; axios.get(API+"/customer-care/escalation-users",{headers}).then(r=>setAdminUsers(Array.isArray(r.data.data)?r.data.data:[])).catch(()=>{}); },[]);

  const openCustomer = async (id:string) => { try { const r=await axios.get(API+"/customer-care/customers/"+id,{headers}); setSelectedCustomer(r.data.data); setForm(f=>({...f,customerId:r.data.data.customer?.customerId||id})); } catch(e:any){alert(e?.response?.data?.message||"Unable to load customer.");} };
  const openOrder = async (id:string) => { try { const r=await axios.get(API+"/customer-care/orders/"+id,{headers}); setSelectedOrder(r.data.data); setForm(f=>({...f,orderId:id,customerId:r.data.data.order?.user?.customerId||f.customerId})); } catch(e:any){alert(e?.response?.data?.message||"Unable to load order.");} };
  const openTicket = async (id:string) => { try { const r=await axios.get(API+"/customer-care/tickets/"+id,{headers}); const d=r.data.data; setSelectedTicket(d); setTicketUpdate({status:d.ticket.status,priority:d.ticket.priority,internalNotes:d.ticket.internalNotes||""}); } catch(e:any){alert(e?.response?.data?.message||"Unable to load ticket.");} };
  const openRefundRequest = async (id:string) => { setRefundDetailLoading(true); try { const r=await axios.get(API+"/customer-care/requests/refund/"+id,{headers}); setSelectedRefundRequest(r.data.data||null); } catch(e:any){ alert(e?.response?.data?.message||"Unable to load refund request."); } finally { setRefundDetailLoading(false); } };
  const rejectRefundRequest = async () => { if(!selectedRefundRequest?._id) return; const reason=refundRejectReason.trim(); if(reason.length<3) return; setActionLoading(true); try { await axios.patch(API+"/customer-care/requests/refund/"+selectedRefundRequest._id+"/reject",{reason},{headers}); await loadRequests(); await loadDashboard(); setRefundRejectOpen(false); setRefundRejectReason(""); await openRefundRequest(String(selectedRefundRequest._id)); } catch(e:any){ alert(e?.response?.data?.message||"Unable to reject refund request."); } finally { setActionLoading(false); } };

  const sendCareMessage = async () => { if(!selectedTicket || !careMessage.trim()) return; setActionLoading(true); try { const r=await axios.post(API+"/customer-care/tickets/"+selectedTicket.ticket._id+"/messages",{message:careMessage,attachment:careAttachment},{headers}); setSelectedTicket((d:any)=>({...d,ticket:r.data.data})); setCareMessage(""); setCareAttachment(""); } catch(e:any){alert(e?.response?.data?.message||"Unable to send reply.");} finally{setActionLoading(false);} };

  const createTicket = async () => {
    if(!can("ticket.create")) return alert("You do not have permission to create tickets.");
    if(!form.customerId) return alert("Select a customer first.");
    if(form.description.trim().length<3) return alert("Describe the customer issue.");
    setActionLoading(true); try { const r=await axios.post(API+"/customer-care/tickets",form,{headers}); setCreateOpen(false); setForm(f=>({...f,description:""})); await openTicket(r.data.data._id); await loadTickets(1); await loadDashboard(); alert("Support ticket created successfully."); } catch(e:any){alert(e?.response?.data?.message||"Unable to create ticket.");} finally{setActionLoading(false);}
  };
  const updateTicket = async () => {
    if(!selectedTicket || !can("ticket.update")) return;
    setActionLoading(true); try { await axios.patch(API+"/customer-care/tickets/"+selectedTicket.ticket._id,ticketUpdate,{headers}); await openTicket(selectedTicket.ticket._id); await loadTickets(ticketMeta.page||1); await loadDashboard(); alert("Ticket updated."); } catch(e:any){alert(e?.response?.data?.message||"Unable to update ticket.");} finally{setActionLoading(false);}
  };
  const resolveTicket = async () => { if(!selectedTicket || !can("ticket.resolve")) return; setTicketUpdate(x=>({...x,status:"RESOLVED"})); setActionLoading(true); try{await axios.patch(API+"/customer-care/tickets/"+selectedTicket.ticket._id,{status:"RESOLVED",priority:selectedTicket.ticket.priority,internalNotes:ticketUpdate.internalNotes},{headers}); await openTicket(selectedTicket.ticket._id); await loadTickets(ticketMeta.page||1); await loadDashboard(); alert("Ticket resolved.");}catch(e:any){alert(e?.response?.data?.message||"Unable to resolve ticket.");}finally{setActionLoading(false);} };
  const verifyRequest = async (type:"refund"|"replacement", id:string) => { if(!can(type==="refund"?"refund.request":"replacement.request")) return alert("You do not have permission to verify this request."); if(!confirm(`Verify and route this ${type} request?`)) return; setActionLoading(true); try { await axios.patch(API+`/customer-care/requests/${type}/${id}/verify`,{}, {headers}); await loadRequests(); await loadDashboard(); alert(`${type} request verified and routed successfully.`); } catch(e:any){ alert(e?.response?.data?.message||`Unable to verify ${type} request.`); } finally { setActionLoading(false); } };
  const escalateTicket = async () => { if(!selectedTicket || !can("ticket.escalate")) return; if(!escalation.assignedUserId||escalation.reason.trim().length<3) return alert("Select an admin and enter escalation reason."); setActionLoading(true); try{await axios.post(API+"/customer-care/tickets/"+selectedTicket.ticket._id+"/escalate",escalation,{headers}); await openTicket(selectedTicket.ticket._id); await loadTickets(ticketMeta.page||1); await loadDashboard(); alert("Ticket escalated successfully.");}catch(e:any){alert(e?.response?.data?.message||"Unable to escalate ticket.");}finally{setActionLoading(false);} };
  const createRefund = async () => { if(!selectedOrder || !can("refund.request")) return; if(!supportItemId) return alert("Select a specific order item for refund."); const item=(selectedOrder.order.items||[]).find((x:any,i:number)=>String(x?._id||x?.product||i)===supportItemId); if(!item) return alert("Selected item not found."); const amount=Number(refundAmount || Number(item.price||0)*Math.max(1,Number(item.quantity||1))); if(!Number.isFinite(amount)||amount<=0) return alert("Enter a valid refund amount."); if(requestReason.trim().length<3) return alert("Enter refund reason."); setActionLoading(true); try{await axios.post(API+"/customer-care/orders/"+selectedOrder.order._id+"/refund-requests",{amount,reason:requestReason,orderItemId:supportItemId,quantity:item.quantity},{headers}); alert("Refund request created."); setRequestReason("");setRefundAmount("");setSupportItemId("");await loadDashboard();}catch(e:any){alert(e?.response?.data?.message||"Unable to create refund request.");}finally{setActionLoading(false);} };
  const createReplacement = async () => { if(!selectedOrder || !can("replacement.request")) return; if(!supportItemId) return alert("Select a specific order item for replacement."); if(requestReason.trim().length<3) return alert("Enter replacement reason."); setActionLoading(true); try{await axios.post(API+"/customer-care/orders/"+selectedOrder.order._id+"/replacement-requests",{reason:requestReason,orderItemId:supportItemId,items:[{product:(selectedOrder.order.items||[]).find((x:any,i:number)=>String(x?._id||x?.product||i)===supportItemId)?.product,quantity:1}]},{headers}); alert("Replacement request created.");setRequestReason("");setSupportItemId("");await loadDashboard();}catch(e:any){alert(e?.response?.data?.message||"Unable to create replacement request.");}finally{setActionLoading(false);} };
  const cancelOrder = async () => { if(!selectedOrder || !can("cancellation.request")) return; if(!confirm("Process cancellation using the existing order cancellation rules?")) return; setActionLoading(true); try{await axios.post(API+"/customer-care/orders/"+selectedOrder.order._id+"/cancellation-request",{reason:requestReason},{headers}); alert("Order cancelled successfully.");setRequestReason("");await openOrder(selectedOrder.order._id);await loadDashboard();}catch(e:any){alert(e?.response?.data?.message||"Unable to process cancellation request.");}finally{setActionLoading(false);} };

  const cards=[['Open Tickets',stats.openTickets,Ticket],['Pending Tickets',stats.pendingTickets,Clock3],['High Priority',stats.highPriority,AlertTriangle],['Resolved Today',stats.resolvedToday,CheckCircle2],['Refund Requests',stats.refundRequests,CircleDollarSign],['Replacement Requests',stats.replacementRequests,RefreshCw],['Delivery Complaints',stats.deliveryComplaints,Truck],['Payment Complaints',stats.paymentComplaints,CircleDollarSign]];

  if (store.user?.role !== "customer_care") return <NavigateToLogin />;
  return <div className="min-h-screen bg-slate-50 fb-dashboard-shell fb-care-shell">
    <header className="bg-white border-b sticky top-0 z-30"><div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white grid place-items-center"><Headphones size={22}/></div><div><h1 className="font-bold text-xl">FreshBasket Customer Care</h1><p className="text-xs text-slate-500">{store.user.name} · {store.user.employeeId || "CUSTOMER_CARE"}</p></div></div><div className="flex gap-2"><button onClick={()=>nav("/customer-360")} className="border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 font-semibold inline-flex items-center gap-2"><UserRoundSearch size={16}/>Customer 360</button><button onClick={()=>nav("/support-view-as")} className="border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 font-semibold inline-flex items-center gap-2"><Eye size={16}/>View As</button><Link to="/login-history" className="border rounded-xl px-4 py-2.5 font-semibold">Login History</Link><button onClick={store.logout} className="bg-slate-950 text-white px-4 py-2.5 rounded-xl font-semibold inline-flex items-center gap-2"><LogOut size={16}/>Logout</button></div></div></header>
    <main className="max-w-7xl mx-auto px-5 py-7 space-y-6">
      <div><p className="text-emerald-600 text-sm font-bold">SUPPORT OPERATIONS</p><h2 className="text-3xl font-bold">Customer Care Dashboard</h2><p className="text-sm text-slate-500 mt-1">Search customers and orders, manage tickets and create support requests without changing the existing customer/order flows.</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([label,value,Icon]:any)=>{const clickable=label==="Replacement Requests"||label==="Refund Requests";return <button key={label} type="button" onClick={()=>label==="Replacement Requests"?nav("/customer-care/replacement-requests"):label==="Refund Requests"?document.getElementById("customer-care-refunds")?.scrollIntoView({behavior:"smooth",block:"center"}):undefined} className={`text-left bg-white border rounded-3xl p-5 ${clickable?"hover:border-emerald-300 hover:shadow-sm cursor-pointer":""}`}><div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl grid place-items-center"><Icon size={19}/></div><p className="text-sm text-slate-500 mt-4">{label}</p><b className="text-2xl">{value||0}</b>{label==="Replacement Requests"&&<span className="block text-xs text-emerald-700 font-semibold mt-2">Open replacement queue →</span>}{label==="Refund Requests"&&<span className="block text-xs text-emerald-700 font-semibold mt-2">Open verification queue →</span>}</button>})}</div>

      <div className="bg-white border rounded-3xl p-5"><div className="flex flex-col md:flex-row gap-3"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')searchAll()}} placeholder="Search customer ID, name, mobile, email or order ID" className="flex-1 border rounded-xl px-4 py-3"/><button onClick={searchAll} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold inline-flex items-center justify-center gap-2"><Search size={17}/>Search</button></div></div>

      {showSearchPanel && (customerResults.length>0||orderResults.length>0) && <div className="grid lg:grid-cols-2 gap-5"><div className="bg-white border rounded-3xl p-5"><h3 className="font-bold text-lg flex items-center gap-2"><UserRoundSearch size={18}/>Customers</h3><div className="mt-4 space-y-2">{customerResults.map((c:any)=><button key={c._id} onClick={()=>openCustomer(c._id)} className="w-full text-left border rounded-2xl p-3 hover:bg-slate-50"><b>{c.name}</b><p className="text-xs text-slate-500">{c.customerId||'No Customer ID'} · {c.email} · {c.phone||'—'} · {c.totalOrders||0} orders</p></button>)}</div></div><div className="bg-white border rounded-3xl p-5"><h3 className="font-bold text-lg flex items-center gap-2"><Package size={18}/>Orders</h3><div className="mt-4 space-y-2">{orderResults.map((o:any)=><button key={o._id} onClick={()=>openOrder(o._id)} className="w-full text-left border rounded-2xl p-3 hover:bg-slate-50"><b>#{String(o._id).slice(-8).toUpperCase()}</b><p className="text-xs text-slate-500">{o.user?.name||'Customer'} · ₹{Number(o.total||0).toLocaleString('en-IN')} · {o.status}</p></button>)}</div></div></div>}

      {selectedCustomer && <div className="bg-white border rounded-3xl p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-emerald-600 text-xs font-bold">CUSTOMER PROFILE</p><h3 className="text-xl font-bold">{selectedCustomer.customer.name}</h3><p className="text-sm text-slate-500">{selectedCustomer.customer.customerId||'—'} · {selectedCustomer.customer.email} · {selectedCustomer.customer.phone||'—'}</p></div><button onClick={()=>setSelectedCustomer(null)}><X/></button></div><div className="grid sm:grid-cols-4 gap-3 mt-5"><div className="bg-slate-50 rounded-2xl p-4"><b>{selectedCustomer.customer.status}</b><p className="text-xs text-slate-500">Account status</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>{new Date(selectedCustomer.customer.createdAt).toLocaleDateString('en-IN')}</b><p className="text-xs text-slate-500">Registration date</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>{selectedCustomer.orders.length}</b><p className="text-xs text-slate-500">Total orders shown</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>{selectedCustomer.orders[0]?'₹'+Number(selectedCustomer.orders[0].total||0).toLocaleString('en-IN'):'—'}</b><p className="text-xs text-slate-500">Last order</p></div></div><div className="grid lg:grid-cols-2 gap-5 mt-5"><div><h4 className="font-bold">Order History</h4><div className="mt-3 space-y-2 max-h-80 overflow-y-auto">{selectedCustomer.orders.map((o:any)=><button key={o._id} onClick={()=>openOrder(o._id)} className="w-full text-left border rounded-xl p-3 text-sm"><b>#{String(o._id).slice(-8).toUpperCase()}</b> · {o.status}<p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString('en-IN')} · ₹{Number(o.total||0).toLocaleString('en-IN')} · Payment: {o.paymentStatus||'—'}</p></button>)}</div></div><div><h4 className="font-bold">Support History</h4><div className="mt-3 space-y-2 max-h-80 overflow-y-auto">{selectedCustomer.tickets.map((t:any)=><button key={t._id} onClick={()=>openTicket(t._id)} className="w-full text-left border rounded-xl p-3 text-sm"><b>{t.ticketId}</b> · {t.status}<p className="text-xs text-slate-500">{t.category} · Created {new Date(t.createdAt).toLocaleString('en-IN')} · Resolved {t.resolvedAt ? new Date(t.resolvedAt).toLocaleString('en-IN') : '—'}</p></button>)}</div></div></div><button onClick={()=>{setForm(f=>({...f,customerId:selectedCustomer.customer._id}));setCreateOpen(true)}} className="mt-5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold">Create ticket for this customer</button></div>}

      {selectedOrder && <div className="bg-white border rounded-3xl p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-emerald-600 text-xs font-bold">ORDER SUPPORT</p><h3 className="text-xl font-bold">Order #{String(selectedOrder.order._id).slice(-8).toUpperCase()}</h3><p className="text-sm text-slate-500">{selectedOrder.order.user?.name} · {selectedOrder.order.user?.email} · {selectedOrder.order.user?.phone||'—'}</p></div><button onClick={()=>setSelectedOrder(null)}><X/></button></div><div className="grid md:grid-cols-4 gap-3 mt-5"><div className="bg-slate-50 rounded-2xl p-4"><b>₹{Number(selectedOrder.order.total||0).toLocaleString('en-IN')}</b><p className="text-xs text-slate-500">Amount</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>{selectedOrder.order.paymentStatus||'—'}</b><p className="text-xs text-slate-500">Payment status</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>{selectedOrder.order.status}</b><p className="text-xs text-slate-500">Order status</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>{selectedOrder.store?.name||'Main Store'}</b><p className="text-xs text-slate-500">Store</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>{selectedOrder.order.deliveryPartner?.name||'Not assigned'}</b><p className="text-xs text-slate-500">Delivery Partner</p></div></div><div className="grid lg:grid-cols-2 gap-5 mt-5"><div><h4 className="font-bold">Items</h4><div className="mt-3 space-y-2">{(selectedOrder.order.items||[]).map((i:any,idx:number)=><div key={idx} className="border rounded-xl p-3 text-sm flex justify-between"><span>{i.name} × {i.quantity}</span><b>₹{Number(i.price||0).toLocaleString('en-IN')}</b></div>)}</div><h4 className="font-bold mt-5">Delivery address</h4><div className="mt-2 border rounded-xl p-3 text-sm">{selectedOrder.order.address?.address||'—'} {selectedOrder.order.address?.city||''} {selectedOrder.order.address?.state||''} {selectedOrder.order.address?.pincode||''}{selectedOrder.order.address?.latitude!=null && selectedOrder.order.address?.longitude!=null && <p className="text-xs text-slate-500 mt-2">Location: {selectedOrder.order.address.latitude}, {selectedOrder.order.address.longitude}</p>}</div></div><div><h4 className="font-bold">Order timeline</h4><div className="mt-3 space-y-2">{(selectedOrder.order.statusHistory||[]).map((h:any,idx:number)=><div key={idx} className="border rounded-xl p-3 text-sm"><b>{h.status}</b><p className="text-xs text-slate-500">{h.timestamp?new Date(h.timestamp).toLocaleString('en-IN'):'—'}</p></div>)}</div></div></div><div className="border-t mt-5 pt-5"><h4 className="font-bold">Support actions</h4><select value={supportItemId} onChange={e=>{setSupportItemId(e.target.value);const i=(selectedOrder.order.items||[]).find((x:any,idx:number)=>String(x?._id||x?.product||idx)===e.target.value);if(i)setRefundAmount(String(Number(i.price||0)*Math.max(1,Number(i.quantity||1))))}} className="mt-3 w-full border rounded-xl p-3"><option value="">Select order item</option>{(selectedOrder.order.items||[]).map((i:any,idx:number)=><option key={String(i?._id||i?.product||idx)} value={String(i?._id||i?.product||idx)}>{i.name} × {i.quantity} · {money(Number(i.price||0)*Number(i.quantity||0))}</option>)}</select><div className="grid lg:grid-cols-3 gap-4 mt-3"><div className="border rounded-2xl p-4"><p className="font-semibold">Refund request</p><input value={refundAmount} onChange={e=>setRefundAmount(e.target.value)} placeholder={`Amount (max ₹${Number((selectedOrder.order.items||[]).find((x:any,idx:number)=>String(x?._id||x?.product||idx)===supportItemId)?.price||0)*Number((selectedOrder.order.items||[]).find((x:any,idx:number)=>String(x?._id||x?.product||idx)===supportItemId)?.quantity||1)})`} className="w-full border rounded-xl p-2.5 mt-2"/><textarea value={requestReason} onChange={e=>setRequestReason(e.target.value)} placeholder="Reason" className="w-full border rounded-xl p-2.5 mt-2 min-h-20"/><button disabled={actionLoading||!can('refund.request')} onClick={createRefund} className="mt-2 bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold disabled:opacity-50">Request refund</button></div><div className="border rounded-2xl p-4"><p className="font-semibold">Replacement request</p><textarea value={requestReason} onChange={e=>setRequestReason(e.target.value)} placeholder="Replacement reason" className="w-full border rounded-xl p-2.5 mt-2 min-h-20"/><button disabled={actionLoading||!can('replacement.request')} onClick={createReplacement} className="mt-2 bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold disabled:opacity-50">Request replacement</button></div><div className="border rounded-2xl p-4"><p className="font-semibold">Cancellation</p><p className="text-xs text-slate-500 mt-1">Uses the same Pending/Confirmed eligibility rule as the existing customer cancellation flow.</p><button disabled={actionLoading||!can('cancellation.request')} onClick={cancelOrder} className="mt-3 bg-red-600 text-white rounded-xl px-4 py-2 font-bold disabled:opacity-50">Process cancellation</button></div></div></div></div>}

      <div className="bg-white border rounded-3xl p-6"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h3 className="text-xl font-bold">Support Tickets</h3><p className="text-sm text-slate-500">Search, filter and manage customer issues.</p></div><button onClick={()=>setCreateOpen(true)} disabled={!can('ticket.create')} className="bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold disabled:opacity-50">+ New Ticket</button></div><div className="grid sm:grid-cols-2 gap-3 mt-4"><select value={ticketStatusFilter} onChange={e=>setTicketStatusFilter(e.target.value)} className="border rounded-xl p-3"><option value="">All statuses</option><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_FOR_CUSTOMER</option><option>WAITING_FOR_STORE</option><option>WAITING_FOR_DELIVERY_PARTNER</option><option>ESCALATED</option><option>RESOLVED</option><option>CLOSED</option></select><select value={ticketPriorityFilter} onChange={e=>setTicketPriorityFilter(e.target.value)} className="border rounded-xl p-3"><option value="">All priorities</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></div><div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Ticket</th><th className="p-3">Customer</th><th className="p-3">Category</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{tickets.map((t:any)=><tr key={t._id} className="border-b"><td className="p-3 font-bold">{t.ticketId}</td><td className="p-3">{t.customer?.name||'—'}<br/><span className="text-xs text-slate-500">{t.customer?.phone||t.customer?.email||''}</span></td><td className="p-3">{t.category}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${t.priority==='URGENT'||t.priority==='HIGH'?'bg-red-50 text-red-700':'bg-slate-100 text-slate-700'}`}>{t.priority}</span></td><td className="p-3">{t.status}</td><td className="p-3"><button onClick={()=>openTicket(t._id)} className="text-emerald-700 font-bold">Open</button></td></tr>)}</tbody></table>{tickets.length===0&&<div className="py-10 text-center text-slate-500">No tickets found.</div>}</div><div className="flex justify-between items-center mt-4 text-sm"><span>Page {ticketMeta.page||1} of {ticketMeta.pages||1}</span><div className="flex gap-2"><button disabled={(ticketMeta.page||1)<=1} onClick={()=>loadTickets((ticketMeta.page||1)-1)} className="border rounded-xl px-3 py-2 disabled:opacity-40">Previous</button><button disabled={(ticketMeta.page||1)>=(ticketMeta.pages||1)} onClick={()=>loadTickets((ticketMeta.page||1)+1)} className="border rounded-xl px-3 py-2 disabled:opacity-40">Next</button></div></div></div>

      <div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex items-center justify-between"><div><h3 className="font-bold">Refund / Replacement Verification Queue</h3><p className="text-xs text-slate-500 mt-1">Customer Care is the mandatory first verification layer. Routing is generated from persisted order/store data.</p></div><button onClick={loadRequests} className="border rounded-xl px-3 py-2 text-sm font-semibold">Refresh</button></div><div className="grid lg:grid-cols-2 gap-5 p-5"><div id="customer-care-refunds"><h4 className="font-bold">Refunds</h4><div className="space-y-2 mt-3">{(requests.refunds||[]).map((r:any)=><button type="button" key={r._id} onClick={()=>openRefundRequest(String(r._id))} className="w-full text-left border rounded-2xl p-4 hover:border-emerald-300 hover:shadow-sm"><div className="flex justify-between gap-3"><div><b>{r.requestId||String(r._id).slice(-8).toUpperCase()}</b><p className="text-xs text-slate-500 mt-1">Customer {r.customer?.customerId||"—"} · Order #{String(r.order?._id||r.order||"").slice(-8).toUpperCase()} · Item {r.orderItemId}</p><p className="text-xs text-slate-500">{r.status} · {money(Number(r.amount||0))}</p></div><span className="text-emerald-700 font-bold text-xs">Open →</span></div></button>)}{!(requests.refunds||[]).length&&<p className="text-sm text-slate-500">No refund requests.</p>}</div></div><div><h4 className="font-bold">Replacements</h4><div className="space-y-2 mt-3">{(requests.replacements||[]).map((r:any)=><div key={r._id} className="border rounded-2xl p-4"><div className="flex justify-between gap-3"><div><b>{r.requestId||String(r._id).slice(-8).toUpperCase()}</b><p className="text-xs text-slate-500 mt-1">Customer {r.customer?.customerId||"—"} · Order #{String(r.order?._id||r.order||"").slice(-8).toUpperCase()} · Item {r.orderItemId}</p><p className="text-xs text-slate-500">{r.status} · {r.sourceType}</p></div>{["REQUESTED","UNDER_REVIEW"].includes(r.status)&&<button disabled={actionLoading} onClick={()=>verifyRequest("replacement",r._id)} className="bg-blue-600 text-white rounded-xl px-3 py-2 text-xs font-bold">Verify</button>}</div></div>)}{!(requests.replacements||[]).length&&<p className="text-sm text-slate-500">No replacement requests.</p>}</div></div></div></div>

      {(selectedRefundRequest||refundDetailLoading)&&<div className="fixed inset-0 z-[90] bg-black/50 p-4 overflow-y-auto" onClick={()=>setSelectedRefundRequest(null)}><div className="max-w-4xl mx-auto my-6 bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>{refundDetailLoading?<div className="p-16 text-center text-slate-500">Loading refund request...</div>:selectedRefundRequest&&<><div className="p-5 border-b flex items-start justify-between gap-4"><div><p className="text-emerald-600 text-xs font-bold">REFUND VERIFICATION</p><h3 className="text-2xl font-bold">{selectedRefundRequest.requestId||"Refund Request"}</h3><p className="text-sm text-slate-500 mt-1">Customer Care verifies eligibility first, then forwards eligible financial cases to Finance.</p></div><button onClick={()=>setSelectedRefundRequest(null)}><X/></button></div><div className="p-5 space-y-5"><div className="grid md:grid-cols-4 gap-3">{[["Customer",selectedRefundRequest.customer?.name||"—"],["Customer ID",selectedRefundRequest.customer?.customerId||"—"],["Order",selectedRefundRequest.order?"#"+String(selectedRefundRequest.order._id).slice(-8).toUpperCase():"—"],["Amount",money(Number(selectedRefundRequest.amount||0))]].map(([l,v])=><div key={String(l)} className="bg-slate-50 rounded-2xl p-3"><span className="text-xs text-slate-500">{l}</span><p className="font-bold mt-1 break-words">{v}</p></div>)}</div><div className="grid lg:grid-cols-2 gap-4"><div className="border rounded-2xl p-4"><h4 className="font-bold">Customer & Request</h4><p className="mt-2 text-sm">{selectedRefundRequest.customer?.email||"—"} · {selectedRefundRequest.customer?.phone||"—"}</p><p className="text-sm mt-2"><b>Reason:</b> {selectedRefundRequest.reason||"—"}</p><p className="text-sm mt-2"><b>Order Item ID:</b> {selectedRefundRequest.orderItemId||"—"}</p><p className="text-sm mt-2"><b>Refund method:</b> {selectedRefundRequest.refundMethod||"ORIGINAL"}</p></div><div className="border rounded-2xl p-4"><h4 className="font-bold">Product / Item</h4><p className="mt-2 text-sm"><b>{selectedRefundRequest.eligibility?.item?.name||selectedRefundRequest.eligibility?.product?.name||"—"}</b></p><p className="text-sm text-slate-500 mt-1">Quantity: {selectedRefundRequest.eligibility?.item?.quantity||selectedRefundRequest.quantity||1} · Price: {selectedRefundRequest.eligibility?.item?.price!==undefined?money(Number(selectedRefundRequest.eligibility.item.price)):money(Number(selectedRefundRequest.amount||0))}</p><p className="text-sm text-slate-500 mt-1">Source: {selectedRefundRequest.eligibility?.sourceType||selectedRefundRequest.sourceType||"—"}</p></div></div><div className="border rounded-2xl p-4"><h4 className="font-bold">Refund Eligibility Check</h4><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">{[["Order delivered",selectedRefundRequest.eligibility?.orderDelivered],["Within 24-hour window",selectedRefundRequest.eligibility?.withinWindow],["Product refund policy",selectedRefundRequest.eligibility?.productPolicy],["Order item found",selectedRefundRequest.eligibility?.itemFound],["Reason valid",selectedRefundRequest.eligibility?.reasonProvided],["Evidence provided",selectedRefundRequest.eligibility?.evidenceProvided]].map(([label,ok])=><div key={String(label)} className={`rounded-xl p-3 border ${ok?"border-emerald-200 bg-emerald-50":"border-red-200 bg-red-50"}`}><span className={`font-bold text-sm ${ok?"text-emerald-700":"text-red-700"}`}>{ok?"✓":"✕"} {label}</span></div>)}</div><p className={`mt-4 text-sm font-bold ${selectedRefundRequest.eligibility?.eligible?"text-emerald-700":"text-red-700"}`}>{selectedRefundRequest.eligibility?.eligible?"Eligible: forward to Finance for refund review.":"Not eligible: reject this refund with a mandatory reason."}</p>{selectedRefundRequest.eligibility?.expiryAt&&<p className="text-xs text-slate-500 mt-1">Eligibility window ends: {new Date(selectedRefundRequest.eligibility.expiryAt).toLocaleString("en-IN")}</p>}</div>{(selectedRefundRequest.evidence||[]).length>0&&<div className="border rounded-2xl p-4"><h4 className="font-bold">Customer Evidence</h4><div className="flex flex-wrap gap-3 mt-3">{(selectedRefundRequest.evidence||[]).map((img:string,i:number)=><img key={i} src={img} alt={`Refund evidence ${i+1}`} className="w-28 h-28 rounded-xl border object-cover"/>)}</div></div>}<div className="flex flex-wrap justify-end gap-3 pt-2">{["REQUESTED","UNDER_REVIEW"].includes(selectedRefundRequest.status)&&<><button disabled={actionLoading} onClick={()=>setRefundRejectOpen(true)} className="border border-red-200 text-red-700 rounded-xl px-4 py-2.5 font-bold">Reject</button><button disabled={actionLoading||!selectedRefundRequest.eligibility?.eligible||!selectedRefundRequest.eligibility?.evidenceProvided} onClick={async()=>{await verifyRequest("refund",String(selectedRefundRequest._id));await openRefundRequest(String(selectedRefundRequest._id));}} className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 font-bold disabled:opacity-40">Verify & Forward to Finance</button></>}</div></div></>}</div></div>}
      {refundRejectOpen&&<div className="fixed inset-0 z-[100] bg-black/50 grid place-items-center p-4" onClick={()=>setRefundRejectOpen(false)}><div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6" onClick={e=>e.stopPropagation()}><p className="text-red-600 text-xs font-bold">REFUND REQUEST</p><h3 className="text-xl font-bold mt-1">Reject Refund</h3><p className="text-sm text-slate-500 mt-1">Rejection reason is mandatory.</p><textarea autoFocus value={refundRejectReason} onChange={e=>setRefundRejectReason(e.target.value)} rows={4} placeholder="Enter rejection reason..." className="mt-4 w-full border rounded-2xl p-3"/><div className="flex justify-end gap-3 mt-4"><button onClick={()=>setRefundRejectOpen(false)} className="border rounded-xl px-4 py-2.5 font-semibold">Cancel</button><button disabled={actionLoading||refundRejectReason.trim().length<3} onClick={rejectRefundRequest} className="bg-red-600 text-white rounded-xl px-4 py-2.5 font-bold disabled:opacity-40">Reject Refund</button></div></div></div>}
      {selectedTicket && <div className="bg-white border rounded-3xl p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-emerald-600 text-xs font-bold">TICKET DETAILS</p><h3 className="text-xl font-bold">{selectedTicket.ticket.ticketId}</h3><p className="text-sm text-slate-500">{selectedTicket.ticket.category} · {selectedTicket.ticket.customer?.name||'Customer'} · Order {selectedTicket.ticket.order?String(selectedTicket.ticket.order._id).slice(-8).toUpperCase():'—'}</p></div><button onClick={()=>setSelectedTicket(null)}><X/></button></div><div className="bg-slate-50 rounded-2xl p-4 mt-5"><p className="text-sm">{selectedTicket.ticket.description}</p><p className="text-xs text-slate-500 mt-2">Created {new Date(selectedTicket.ticket.createdAt).toLocaleString('en-IN')} · Updated {new Date(selectedTicket.ticket.updatedAt).toLocaleString('en-IN')}</p></div><div className="grid lg:grid-cols-3 gap-4 mt-5"><label className="text-sm font-semibold">Status<select value={ticketUpdate.status} onChange={e=>setTicketUpdate({...ticketUpdate,status:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_FOR_CUSTOMER</option><option>WAITING_FOR_STORE</option><option>WAITING_FOR_DELIVERY_PARTNER</option><option>ESCALATED</option><option>RESOLVED</option><option>CLOSED</option></select></label><label className="text-sm font-semibold">Priority<select value={ticketUpdate.priority} onChange={e=>setTicketUpdate({...ticketUpdate,priority:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label><label className="text-sm font-semibold">Internal notes<textarea value={ticketUpdate.internalNotes} onChange={e=>setTicketUpdate({...ticketUpdate,internalNotes:e.target.value})} className="mt-2 w-full border rounded-xl p-3 min-h-24"/></label></div><div className="flex flex-wrap gap-2 mt-4"><button disabled={actionLoading||!can('ticket.update')} onClick={updateTicket} className="bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold disabled:opacity-50">Save update</button><button disabled={actionLoading||!can('ticket.resolve')} onClick={resolveTicket} className="bg-slate-950 text-white rounded-xl px-4 py-2.5 font-bold disabled:opacity-50">Resolve</button></div><div className="border-t mt-5 pt-5"><h4 className="font-bold">Customer conversation</h4><div className="mt-3 space-y-2 max-h-56 overflow-y-auto">{(selectedTicket.ticket.messages||[]).map((m:any,i:number)=><div key={i} className={`p-3 rounded-2xl ${m.senderRole==="customer"?'bg-emerald-50':'bg-slate-100'}`}><p className="text-sm">{m.message}</p>{m.attachment&&<img src={m.attachment} alt="Support attachment" className="mt-2 max-h-48 rounded-xl border object-contain"/>}<p className="text-[11px] text-slate-400 mt-1">{m.senderRole} · {new Date(m.createdAt).toLocaleString('en-IN')}</p></div>)}</div><div className="flex gap-2 mt-3"><input value={careMessage} onChange={e=>setCareMessage(e.target.value)} placeholder="Reply to customer" className="flex-1 border rounded-xl p-3"/><label className="border rounded-xl px-3 py-2 cursor-pointer"><Upload size={18}/><input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>700*1024)return alert('Image must be 700 KB or smaller.');const r=new FileReader();r.onload=()=>setCareAttachment(String(r.result||''));r.readAsDataURL(f)}}/></label><button disabled={actionLoading} onClick={sendCareMessage} className="bg-emerald-600 text-white rounded-xl px-4 font-bold">Send</button></div></div><div className="grid lg:grid-cols-2 gap-5 mt-6 border-t pt-5"><div><h4 className="font-bold">Escalate</h4><div className="grid sm:grid-cols-2 gap-3 mt-3"><select value={escalation.targetType} onChange={e=>setEscalation({...escalation,targetType:e.target.value})} className="border rounded-xl p-3"><option value="MAIN_ADMIN">Main Admin</option><option value="SUB_ADMIN">Sub Admin</option><option value="STORE_MANAGER">Store Manager</option></select><select value={escalation.assignedUserId} onChange={e=>setEscalation({...escalation,assignedUserId:e.target.value})} className="border rounded-xl p-3"><option value="">Select admin</option>{adminUsers.filter((a:any)=>!a.blocked).map((a:any)=><option key={a._id} value={a._id}>{a.name} · {a.email}</option>)}</select></div><textarea value={escalation.reason} onChange={e=>setEscalation({...escalation,reason:e.target.value})} placeholder="Escalation reason" className="w-full border rounded-xl p-3 mt-3 min-h-20"/><button disabled={actionLoading||!can('ticket.escalate')} onClick={escalateTicket} className="mt-2 bg-amber-600 text-white rounded-xl px-4 py-2.5 font-bold disabled:opacity-50">Escalate ticket</button></div><div><h4 className="font-bold">Support history</h4><div className="mt-3 space-y-2 max-h-64 overflow-y-auto">{(selectedTicket.activity||[]).map((a:any)=><div key={a._id} className="border rounded-xl p-3 text-sm"><b>{a.action}</b><p className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString('en-IN')}</p></div>)}</div></div></div></div>}

      {createOpen && <div className="fixed inset-0 z-[80] bg-black/40 p-4 grid place-items-center"><div className="w-full max-w-2xl bg-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center"><h3 className="text-xl font-bold">Create Support Ticket</h3><button onClick={()=>setCreateOpen(false)}><X/></button></div><div className="grid md:grid-cols-2 gap-4 mt-5"><label className="text-sm font-semibold">Customer ID<input value={form.customerId} onChange={e=>setForm({...form,customerId:e.target.value})} className="mt-2 w-full border rounded-xl p-3" placeholder="Select customer from search"/></label><label className="text-sm font-semibold">Order ID (optional)<input value={form.orderId} onChange={e=>setForm({...form,orderId:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option>Order Issue</option><option>Order Issue</option><option>Missing Item</option><option>Wrong Item</option><option>Damaged Item</option><option>Damaged Product</option><option>Quality Issue</option><option>Delivery Issue</option><option>Payment Issue</option><option>Refund</option><option>Replacement</option><option>Account</option><option>Technical</option><option>Expired Product</option><option>Late Delivery</option><option>Delivery Partner Issue</option><option>Wrong Delivery Location</option><option>Order Not Received</option><option>Payment Failed</option><option>Payment Deducted but Order Failed</option><option>Refund Issue</option><option>Cancellation Request</option><option>Replacement Request</option><option>Coupon Issue</option><option>Product Quality Issue</option><option>Account/Login Issue</option><option>Other</option></select></label><label className="text-sm font-semibold">Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label></div><label className="text-sm font-semibold block mt-4">Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-2 w-full border rounded-xl p-3 min-h-32" placeholder="Describe the customer's issue"/></label><label className="text-sm font-semibold block mt-4">Image attachment <input type="file" accept="image/*" className="mt-2 block w-full text-sm" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>700*1024)return alert("Image must be 700 KB or smaller.");const r=new FileReader();r.onload=()=>setForm(x=>({...x,evidence:[String(r.result||"")]}));r.readAsDataURL(f)}}/><div className="mt-2"><ImagePickerButtons compact onFile={(f)=>{if(f.size>700*1024)return alert("Image must be 700 KB or smaller.");const r=new FileReader();r.onload=()=>setForm(x=>({...x,evidence:[String(r.result||"")]}));r.readAsDataURL(f)}}/></div></label><button disabled={actionLoading} onClick={createTicket} className="mt-5 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">{actionLoading?'Creating...':'Create Ticket'}</button></div></div>}
    </main>
  </div>;
}



function AdminDeliveryOperations(){
  const [rows,setRows]=useState<any[]>([]);
  const [cfg,setCfg]=useState<any>({defaultPayout:35,incentiveThresholds:[]});
  const load=async()=>{try{const [p,c]=await Promise.all([axios.get(API+"/admin/delivery-performance",{headers:adminHeaders()}),axios.get(API+"/admin/delivery-payout-config",{headers:adminHeaders()})]);setRows(p.data.data||[]);setCfg(c.data.data||cfg);}catch(e:any){alert(e?.response?.data?.message||"Unable to load delivery operations")}};
  useEffect(()=>{load()},[]);
  const save=async()=>{try{await axios.patch(API+"/admin/delivery-payout-config",cfg,{headers:adminHeaders()});alert("Delivery payout and incentive configuration saved");load()}catch(e:any){alert(e?.response?.data?.message||"Unable to save payout configuration")}};
  const updateRule=(i:number,patch:any)=>{const a=[...(cfg.incentiveThresholds||[])];a[i]={...a[i],...patch};setCfg({...cfg,incentiveThresholds:a})};
  const addRule=()=>setCfg({...cfg,incentiveThresholds:[...(cfg.incentiveThresholds||[]),{ruleId:"",minRating:4.5,minDeliveries:10,amount:100,activeFrom:"",activeTo:"",eligibility:"ALL",maxBonus:""}]});
  return <div className="space-y-5">
    <div><p className="text-emerald-600 text-sm font-bold">DELIVERY OPERATIONS</p><h2 className="text-2xl font-bold">Delivery Payout & Performance</h2><p className="text-sm text-slate-500 mt-1">Additive delivery earnings controls and operational analytics.</p></div>
    <div className="bg-white border rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap"><div><h3 className="font-bold">Default payout</h3><p className="text-xs text-slate-500">Store Admin can override this before assignment.</p></div><div className="flex gap-2"><input type="number" min="0" max="10000" step="0.01" value={cfg.defaultPayout} onChange={e=>setCfg({...cfg,defaultPayout:e.target.value})} className="border rounded-xl p-3 w-36"/><button onClick={save} className="bg-emerald-600 text-white rounded-xl px-4 font-bold">Save</button></div></div>
      <div className="mt-4 border-t pt-4"><div className="flex items-center justify-between gap-3 flex-wrap"><div><h4 className="font-bold">Configurable incentive milestones</h4><p className="text-xs text-slate-500 mt-1">Configure delivery threshold, amount, active dates, eligibility and maximum bonus. A milestone is awarded only when its delivery count is reached.</p></div><button onClick={addRule} className="border rounded-xl px-3 py-2 text-sm font-bold">+ Add incentive rule</button></div>
      <div className="space-y-3 mt-4">{(cfg.incentiveThresholds||[]).map((x:any,i:number)=><div key={i} className="border rounded-2xl p-4 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="text-xs font-bold">Minimum deliveries<input type="number" min="1" value={x.minDeliveries??""} onChange={e=>updateRule(i,{minDeliveries:e.target.value})} className="mt-1 border rounded-xl p-2 w-full bg-white"/></label>
          <label className="text-xs font-bold">Minimum rating<input type="number" min="0" max="5" step="0.1" value={x.minRating??""} onChange={e=>updateRule(i,{minRating:e.target.value})} className="mt-1 border rounded-xl p-2 w-full bg-white"/></label>
          <label className="text-xs font-bold">Bonus amount (₹)<input type="number" min="0" step="0.01" value={x.amount??""} onChange={e=>updateRule(i,{amount:e.target.value})} className="mt-1 border rounded-xl p-2 w-full bg-white"/></label>
          <label className="text-xs font-bold">Maximum bonus (₹)<input type="number" min="0" step="0.01" value={x.maxBonus??""} onChange={e=>updateRule(i,{maxBonus:e.target.value})} placeholder="No cap" className="mt-1 border rounded-xl p-2 w-full bg-white"/></label>
          <label className="text-xs font-bold">Eligibility<select value={x.eligibility||"ALL"} onChange={e=>updateRule(i,{eligibility:e.target.value})} className="mt-1 border rounded-xl p-2 w-full bg-white"><option value="ALL">All qualifying deliveries</option><option value="ON_TIME">On-time delivery only</option></select></label>
          <label className="text-xs font-bold">Active from<input type="datetime-local" value={x.activeFrom?String(x.activeFrom).slice(0,16):""} onChange={e=>updateRule(i,{activeFrom:e.target.value})} className="mt-1 border rounded-xl p-2 w-full bg-white"/></label>
          <label className="text-xs font-bold">Active to<input type="datetime-local" value={x.activeTo?String(x.activeTo).slice(0,16):""} onChange={e=>updateRule(i,{activeTo:e.target.value})} className="mt-1 border rounded-xl p-2 w-full bg-white"/></label>
          <div className="flex items-end"><button onClick={()=>setCfg({...cfg,incentiveThresholds:(cfg.incentiveThresholds||[]).filter((_:any,j:number)=>j!==i)})} className="border rounded-xl px-3 py-2 w-full bg-white font-bold">Remove rule</button></div>
        </div>
      </div>)}</div>
      {!((cfg.incentiveThresholds||[]).length)&&<div className="mt-4 p-4 border rounded-2xl text-sm text-slate-500">No incentive rules configured. Existing payouts remain unchanged.</div>}
      <div className="mt-4 flex justify-end"><button onClick={save} className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 font-bold">Save incentive rules</button></div>
      </div>
    </div>
    <div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b"><h3 className="font-bold">Delivery Partner Performance</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Partner</th><th className="p-3">Assigned</th><th className="p-3">Completed</th><th className="p-3">On-Time</th><th className="p-3">Acceptance</th><th className="p-3">Rejection</th><th className="p-3">Rating</th><th className="p-3">Avg pickup</th><th className="p-3">Avg delivery</th><th className="p-3">Base payout</th><th className="p-3">Incentive</th></tr></thead><tbody>{rows.map((x:any)=><tr key={String(x.partner?._id)} className="border-t"><td className="p-3"><b>{x.partner?.name||"—"}</b><span className="block text-xs text-slate-500">{x.partner?.employeeId||""}</span></td><td className="p-3 text-center">{x.assigned}</td><td className="p-3 text-center">{x.ordersDelivered}</td><td className="p-3 text-center">{x.onTimeRate==null?"—":`${Number(x.onTimeRate).toFixed(1)}%`}</td><td className="p-3 text-center">{x.acceptanceRate==null?"—":`${Number(x.acceptanceRate).toFixed(1)}%`}</td><td className="p-3 text-center">{x.rejectionRate==null?"—":`${Number(x.rejectionRate).toFixed(1)}%`}</td><td className="p-3 text-center">{x.customerRating==null?"—":`${Number(x.customerRating).toFixed(1)} ★ (${x.partner?.ratingCount||0})`}</td><td className="p-3 text-center">{x.averagePickupMinutes==null?"—":`${Number(x.averagePickupMinutes).toFixed(1)} min`}</td><td className="p-3 text-center">{x.averageDeliveryMinutes==null?"—":`${Number(x.averageDeliveryMinutes).toFixed(1)} min`}</td><td className="p-3 text-center">{money(x.totalPayout)}</td><td className="p-3 text-center">{money(x.totalIncentive)}</td></tr>)}</tbody></table></div></div>
  </div>;
}
function AdminReplacementRequests({ store }: { store: ReturnType<typeof useStore> }) {
  const [rows,setRows]=useState<any[]>([]); const [partners,setPartners]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [rejectionTarget,setRejectionTarget]=useState<string|null>(null); const [rejectionReason,setRejectionReason]=useState(""); const isMain=Boolean(store.user?.isMainAdmin || String(store.user?.email||"").toLowerCase()==="admin@grocery.com");
  const endpoint=isMain?"/admin/replacement-requests":"/store-admin/replacement-requests";
  const load=async()=>{setLoading(true);try{const [r,p]=await Promise.all([axios.get(API+endpoint,{headers:adminHeaders()}),axios.get(API+"/admin/delivery-partners",{headers:adminHeaders()}).catch(()=>({data:{data:[]}}))]);setRows(r.data.data||[]);const allPartners=p.data.data||[];setPartners(isMain?allPartners:allPartners.filter((x:any)=>String(x.storeAdmin||"")===String(store.user?.id||"")));}catch(e:any){alert(e?.response?.data?.message||"Unable to load replacement requests");}finally{setLoading(false);}};
  useEffect(()=>{if(store.user?.role==="admin")load();},[store.user?.role]);
  const update=async(id:string,status:string,extra:any={})=>{try{await axios.patch(API+endpoint+"/"+id,{status,...extra},{headers:adminHeaders()});await load();}catch(e:any){alert(e?.response?.data?.message||"Unable to update replacement request");}};
  const reject=async(id:string)=>{setRejectionTarget(id);setRejectionReason("");};
  const submitRejection=async()=>{if(!rejectionTarget)return;const reason=rejectionReason.trim();if(reason.length<3)return;await update(rejectionTarget,"REJECTED",{reason});setRejectionTarget(null);setRejectionReason("");};
  return <div className="space-y-5"><div><p className="text-emerald-600 text-sm font-bold">{isMain?"MAIN ADMIN":"STORE ADMIN"}</p><h2 className="text-2xl font-bold">Replacement Requests</h2><p className="text-sm text-slate-500 mt-1">{isMain?"FreshBasket Direct fulfillment and authorized exceptions are managed here.":"Only replacement requests belonging to this Store are visible and actionable."}</p></div>{loading?<div className="bg-white border rounded-3xl p-10 text-center text-slate-500">Loading replacement requests...</div>:<div className="bg-white border rounded-3xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[1050px]"><thead className="bg-slate-50"><tr>{["Request","Customer / Order","Source / Owner","Status","Product / Qty","Delivery","Action"].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map((r:any)=><tr key={r._id} className="border-t"><td className="p-3 font-bold">{r.requestId||String(r._id).slice(-8).toUpperCase()}<div className="text-xs text-slate-500">{r.replacementId||"Legacy"}</div></td><td className="p-3">{r.customer?.customerId||"—"} · {r.customer?.name||"—"}<div className="text-xs text-slate-500">#{String(r.order?._id||r.order||"").slice(-8).toUpperCase()} · {r.orderItemId}</div></td><td className="p-3">{r.sourceType}<div className="text-xs text-slate-500">{r.storeAdmin?.name||r.mainAdmin?.name||"—"}</div></td><td className="p-3"><span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-bold">{r.status}</span></td><td className="p-3">{r.items?.[0]?.name||r.productId?.name||"—"} · {r.items?.[0]?.quantity||1}<div className="text-xs text-slate-500">Inventory: {r.inventoryReserved?"reserved":"not reserved"}</div></td><td className="p-3">{r.deliveryPartner?.name||"Not assigned"}</td><td className="p-3"><div className="flex flex-wrap gap-2">{((isMain&&r.sourceType==="FRESHBASKET_DIRECT")||(!isMain&&r.sourceType==="STORE"))&&["PENDING_STORE_ADMIN","PENDING_MAIN_ADMIN","APPROVED","REPLACEMENT_APPROVED","ESCALATED"].includes(r.status)&&<button onClick={()=>update(r._id,"REPLACEMENT_APPROVED")} className="bg-emerald-600 text-white rounded-lg px-2.5 py-1.5 font-semibold">Approve Replacement</button>}{((isMain&&r.sourceType==="FRESHBASKET_DIRECT")||(!isMain&&r.sourceType==="STORE"))&&["REPLACEMENT_APPROVED","APPROVED","STORE_PREPARATION","REPLACEMENT_PROCESSING"].includes(r.status)&&<button onClick={()=>update(r._id,"REPLACEMENT_PROCESSING")} className="border rounded-lg px-2.5 py-1.5 font-semibold">Prepare Replacement</button>}{((isMain&&r.sourceType==="FRESHBASKET_DIRECT")||(!isMain&&r.sourceType==="STORE"))&&["REPLACEMENT_PROCESSING","STORE_PREPARATION","REPLACEMENT_APPROVED","APPROVED"].includes(r.status)&&<div className="flex items-center gap-2"><select defaultValue={r.deliveryPartner?._id||r.deliveryPartner||""} onChange={e=>{if(e.target.value)update(r._id,"DELIVERY_ASSIGNED",{deliveryPartnerId:e.target.value})}} className="border rounded-lg px-2.5 py-1.5 font-semibold"><option value="">Assign Delivery Partner</option>{partners.map((p:any)=><option key={p._id} value={p._id}>{p.name} · {p.employeeId||p.email}</option>)}</select>{!partners.length&&<span className="text-xs text-red-600">No eligible delivery partner</span>}</div>}{!replacementTerminalStatusesForUi.includes(r.status)&&<button onClick={()=>reject(r._id)} className="border border-red-200 text-red-700 rounded-lg px-2.5 py-1.5 font-semibold">Reject</button>}</div></td></tr>)}</tbody></table>{!rows.length&&<div className="p-10 text-center text-slate-500">No replacement requests found.</div>}</div></div>}{rejectionTarget&&<div className="fixed inset-0 z-[120] bg-black/50 p-4 grid place-items-center" onClick={()=>setRejectionTarget(null)}><div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-red-600 text-xs font-bold">REPLACEMENT REQUEST</p><h3 className="text-xl font-bold mt-1">Reject Request</h3><p className="text-sm text-slate-500 mt-1">A rejection reason is mandatory.</p></div><button type="button" onClick={()=>setRejectionTarget(null)} className="text-slate-500 hover:text-slate-900"><X size={20}/></button></div><label className="block mt-5 text-sm font-semibold">Rejection reason<textarea autoFocus value={rejectionReason} onChange={e=>setRejectionReason(e.target.value)} rows={4} placeholder="Enter at least 3 characters..." className="mt-2 w-full border rounded-2xl p-3 outline-none focus:ring-2 focus:ring-red-200"/></label><div className="flex justify-end gap-3 mt-5"><button type="button" onClick={()=>setRejectionTarget(null)} className="border rounded-xl px-4 py-2.5 font-semibold">Cancel</button><button type="button" disabled={rejectionReason.trim().length<3} onClick={submitRejection} className="bg-red-600 text-white rounded-xl px-4 py-2.5 font-bold disabled:opacity-40">Reject Request</button></div></div></div>}</div>;
}

function AdminSupportCenter(){const [data,setData]=useState<any>({tickets:[],refunds:[],replacements:[]});const [loading,setLoading]=useState(true);const [sla,setSla]=useState<any>({urgent:30,high:60,medium:240,low:1440});const load=async()=>{setLoading(true);try{const [a,b]=await Promise.all([axios.get(API+"/admin/support-center",{headers:adminHeaders()}),axios.get(API+"/admin/support-sla",{headers:adminHeaders()})]);setData(a.data.data||data);setSla(b.data.data||sla);}catch(e:any){alert(e?.response?.data?.message||"Unable to load support center")}finally{setLoading(false)}};useEffect(()=>{load()},[]);const saveSla=async()=>{try{await axios.patch(API+"/admin/support-sla",sla,{headers:adminHeaders()});alert("SLA settings updated")}catch(e:any){alert(e?.response?.data?.message||"Unable to update SLA")}};return <div className="space-y-5"><div><p className="text-emerald-600 text-sm font-bold">MAIN ADMIN</p><h2 className="text-2xl font-bold">Customer Support</h2><p className="text-sm text-slate-500 mt-1">All tickets, refunds, replacements and escalation operations.</p></div><div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[["Total Tickets",data.tickets?.length],["Open",data.tickets?.filter((x:any)=>!["RESOLVED","CLOSED"].includes(x.status)).length],["Resolved",data.tickets?.filter((x:any)=>["RESOLVED","CLOSED"].includes(x.status)).length],["Refund Requests",data.refunds?.length],["Replacement Requests",data.replacements?.length]].map(([l,v])=><div key={String(l)} className="bg-white border rounded-2xl p-4"><b className="text-xl">{v||0}</b><p className="text-xs text-slate-500 mt-1">{l}</p></div>)}</div><div className="bg-white border rounded-3xl p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">Support SLA</h3><p className="text-xs text-slate-500">Minutes before a ticket is considered at risk.</p></div><button onClick={saveSla} className="bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold">Save SLA</button></div><div className="grid sm:grid-cols-4 gap-3 mt-4">{["urgent","high","medium","low"].map(k=><label key={k} className="text-sm font-semibold capitalize">{k}<input type="number" min="1" value={sla[k]} onChange={e=>setSla({...sla,[k]:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>)}</div></div><div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex justify-between"><h3 className="font-bold">Tickets</h3><button onClick={load} className="border rounded-xl px-3 py-2 text-sm font-semibold">Refresh</button></div>{loading?<div className="p-10 text-center text-slate-500">Loading...</div>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Ticket</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Priority</th><th className="p-3 text-left">Status</th></tr></thead><tbody>{(data.tickets||[]).map((t:any)=><tr key={t._id} className="border-t"><td className="p-3 font-bold">{t.ticketId}</td><td className="p-3">{t.customer?.name||"—"}</td><td className="p-3">{t.category}</td><td className="p-3">{t.priority}</td><td className="p-3">{t.status}</td></tr>)}</tbody></table></div>}</div></div>}

function CustomerCareReplacementRequests({ store }: { store: ReturnType<typeof useStore> }) {
  const nav=useNavigate();
  const location=useLocation();
  const [rows,setRows]=useState<any[]>([]);
  const [meta,setMeta]=useState<any>({page:1,pages:1,total:0,limit:10});
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("ALL");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<any>(null);
  const [detailLoading,setDetailLoading]=useState(false);
  const [actionLoading,setActionLoading]=useState(false);
  const headers=adminHeaders();
  const statuses=[
    ["ALL","All"],["REQUESTED","Pending Verification"],["UNDER_REVIEW","Under Verification"],["VERIFIED","Verified"],
    ["REJECTED","Rejected"],["PENDING_STORE_ADMIN","Pending Store Admin"],["PENDING_MAIN_ADMIN","Pending Main Admin"],
    ["REPLACEMENT_PROCESSING","Replacement Processing"],["DELIVERY_ASSIGNED","Assigned to Delivery"],["OUT_FOR_DELIVERY","Out for Delivery"],
    ["REPLACED","Replaced"],["FAILED","Failed"],["ESCALATED","Escalated"],["CLOSED","Closed"],["EXPIRED","Expired"]
  ];
  const load=async(page=1)=>{
    setLoading(true);setError("");
    try{const r=await axios.get(API+"/customer-care/replacement-requests",{headers,params:{page,limit:10,search,status}});setRows(Array.isArray(r.data.data)?r.data.data:[]);setMeta(r.data.meta||{page,pages:1,total:0,limit:10});}
    catch(e:any){setError(e?.response?.data?.message||"Unable to load replacement requests. Please retry.");setRows([]);}finally{setLoading(false);}
  };
  const openDetail=async(id:string)=>{
    setDetailLoading(true);setError("");
    try{const r=await axios.get(API+"/customer-care/replacement-requests/"+id,{headers});setSelected(r.data.data||null);}
    catch(e:any){setSelected(null);setError(e?.response?.status===403?"You are not authorized to view this replacement request.":e?.response?.status===404?"Replacement request not found.":e?.response?.data?.message||"Unable to load replacement request. Please retry.");}
    finally{setDetailLoading(false);}
  };
  useEffect(()=>{if(store.user?.role!=="customer_care")return;load(1);},[status]);
  useEffect(()=>{const id=new URLSearchParams(location.search).get("request");if(id)openDetail(id);},[location.search]);
  const verify=async()=>{
    if(!selected?.request?._id)return;
    if(!confirm("Verify this replacement request and route it to the correct fulfillment owner?"))return;
    setActionLoading(true);try{await axios.patch(API+"/customer-care/requests/replacement/"+selected.request._id+"/verify",{}, {headers});await openDetail(String(selected.request._id));await load(meta.page||1);alert("Replacement verified and routed successfully.");}catch(e:any){alert(e?.response?.data?.message||"Unable to verify replacement request.");}finally{setActionLoading(false);}
  };
  const reject=async()=>{if(!selected?.request?._id)return;const reason=window.prompt("Mandatory rejection reason");if(!reason||reason.trim().length<3)return;setActionLoading(true);try{await axios.patch(API+"/customer-care/replacement-requests/"+selected.request._id+"/action",{action:"REJECT",reason},{headers});await openDetail(String(selected.request._id));await load(meta.page||1);alert("Replacement request rejected.");}catch(e:any){alert(e?.response?.data?.message||"Unable to reject replacement request.");}finally{setActionLoading(false);}};
  const escalate=async()=>{if(!selected?.request?._id)return;const reason=window.prompt("Escalation reason");if(!reason||reason.trim().length<3)return;setActionLoading(true);try{await axios.patch(API+"/customer-care/replacement-requests/"+selected.request._id+"/action",{action:"ESCALATE",reason},{headers});await openDetail(String(selected.request._id));await load(meta.page||1);alert("Replacement request escalated.");}catch(e:any){alert(e?.response?.data?.message||"Unable to escalate replacement request.");}finally{setActionLoading(false);}};
  const clearDetail=()=>{setSelected(null);if(new URLSearchParams(location.search).get("request"))nav("/customer-care/replacement-requests");};
  const customer=selected?.customer||selected?.request?.customer;
  const order=selected?.order||selected?.request?.order||{};
  const item=selected?.orderItem;
  const product=selected?.product||selected?.request?.productId;
  const request=selected?.request||{};
  if(store.user?.role!=="customer_care")return <NavigateToLogin/>;
  return <div className="min-h-screen bg-slate-50 fb-dashboard-shell fb-care-shell">
    <header className="bg-white border-b sticky top-0 z-30"><div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-3"><div><p className="text-emerald-600 text-xs font-bold">CUSTOMER CARE · OPERATIONS</p><h1 className="text-2xl font-bold">Replacement Requests</h1><p className="text-xs text-slate-500 mt-1">Real replacement records with backend search, filters, ownership and status history.</p></div><button onClick={()=>nav("/customer-care")} className="border rounded-xl px-4 py-2.5 font-semibold">Back to Dashboard</button></div></header>
    <main className="max-w-7xl mx-auto px-5 py-7 space-y-5">
      <div className="bg-white border rounded-3xl p-5"><div className="flex flex-col lg:flex-row gap-3"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")load(1)}} placeholder="Search Request ID, Customer ID/name, Order ID, Item ID, Product, phone/email" className="flex-1 border rounded-xl p-3"/><select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl p-3 font-semibold">{statuses.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button onClick={()=>load(1)} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">Search</button></div></div>
      {error&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">{error}</div>}
      <div className="bg-white border rounded-3xl overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between gap-3"><div><h2 className="font-bold text-lg">Replacement Request List</h2><p className="text-xs text-slate-500 mt-1">{meta.total||0} record(s) · page {meta.page||1} of {meta.pages||1}</p></div><button onClick={()=>load(meta.page||1)} className="border rounded-xl px-3 py-2 font-semibold inline-flex items-center gap-2"><RefreshCw size={15}/>Refresh</button></div>
        {loading?<div className="p-12 text-center text-slate-500">Loading replacement requests...</div>:rows.length===0?<div className="p-12 text-center text-slate-500">No replacement requests found.</div>:<div className="overflow-x-auto"><table className="w-full text-sm min-w-[1200px]"><thead className="bg-slate-50"><tr>{["Request ID","Customer ID / Customer","Order ID","Order Item","Product / Store","Reason","Request Date","Eligibility","Status","Priority","Assigned To","Action"].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map((r:any)=><tr key={r._id} className="border-t hover:bg-slate-50"><td className="p-3 font-bold">{r.requestId||"—"}<div className="text-[11px] text-slate-400">{r.replacementId||""}</div></td><td className="p-3">{r.customer?.customerId||"—"}<div>{r.customer?.name||"—"}</div><div className="text-xs text-slate-500">{r.customer?.phone||r.customer?.email||""}</div></td><td className="p-3">#{String(r.order?._id||r.order||"").slice(-8).toUpperCase()}</td><td className="p-3">{r.orderItemId||"—"}<div className="text-xs text-slate-500">Qty {r.items?.[0]?.quantity||r.orderItem?.quantity||1}</div></td><td className="p-3"><div className="font-semibold">{r.product?.name||r.items?.[0]?.name||"—"}</div><div className="text-xs text-slate-500">{r.sourceType==="STORE"?(r.storeAdmin?.name||"Store"):(r.mainAdmin?.name||"FreshBasket Direct")}</div></td><td className="p-3 max-w-[180px]"><span className="line-clamp-2">{r.reason||"—"}</span></td><td className="p-3">{r.createdAt?new Date(r.createdAt).toLocaleString("en-IN"):"—"}</td><td className="p-3">{r.eligibility?.eligibleAtRequestTime?"Eligible":"Not eligible"}<div className="text-xs text-slate-500">{r.eligibility?.expiryAt?new Date(r.eligibility.expiryAt).toLocaleString("en-IN"):"—"}</div></td><td className="p-3"><span className="px-2 py-1 rounded-full bg-slate-100 font-bold text-xs">{r.status}</span></td><td className="p-3">{r.priority||"MEDIUM"}</td><td className="p-3">{r.customerCareAgent?.name||r.storeAdmin?.name||r.mainAdmin?.name||r.deliveryPartner?.name||"Unassigned"}</td><td className="p-3"><button onClick={()=>openDetail(r._id)} className="text-emerald-700 font-bold inline-flex items-center gap-1"><Eye size={15}/>View</button></td></tr>)}</tbody></table></div>}
        {!loading&&rows.length>0&&<div className="p-4 border-t flex items-center justify-between text-sm"><span>Page {meta.page||1} of {meta.pages||1}</span><div className="flex gap-2"><button disabled={(meta.page||1)<=1} onClick={()=>load((meta.page||1)-1)} className="border rounded-xl px-3 py-2 disabled:opacity-40">Previous</button><button disabled={(meta.page||1)>=(meta.pages||1)} onClick={()=>load((meta.page||1)+1)} className="border rounded-xl px-3 py-2 disabled:opacity-40">Next</button></div></div>}
      </div>
    </main>
    {(selected||detailLoading)&&<div className="fixed inset-0 z-[90] bg-black/50 p-3 sm:p-6 overflow-y-auto" onClick={clearDetail}><div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>{detailLoading?<div className="p-16 text-center text-slate-500">Loading replacement request...</div>:<><div className="p-5 border-b flex items-start justify-between gap-4"><div><p className="text-emerald-600 text-xs font-bold">REPLACEMENT REQUEST</p><h2 className="text-2xl font-bold">{request.requestId||"—"}</h2><p className="text-xs text-slate-500 mt-1">Replacement ID: {request.replacementId||"Not assigned in legacy record"} · Current status: <b>{request.status}</b></p></div><button onClick={clearDetail}><X/></button></div><div className="p-5 space-y-5">
      <div className="grid md:grid-cols-4 gap-3">{[["Customer ID",customer?.customerId||"—"],["Order ID",order?._id?String(order._id):"—"],["Order Item ID",request.orderItemId||"—"],["Request Type","REPLACEMENT"]].map(([l,v])=><div key={String(l)} className="border rounded-2xl p-3"><span className="text-xs text-slate-500">{l}</span><p className="font-bold break-words">{v}</p></div>)}</div>
      <div className="grid lg:grid-cols-2 gap-4"><div className="border rounded-2xl p-4"><h3 className="font-bold">Customer</h3><p className="mt-2">{customer?.name||"—"}</p><p className="text-sm text-slate-500">{customer?.email||"—"}</p><p className="text-sm text-slate-500">{customer?.phone||"—"}</p></div><div className="border rounded-2xl p-4"><h3 className="font-bold">Order</h3><p className="mt-2">#{order?._id?String(order._id).slice(-8).toUpperCase():"—"}</p><p className="text-sm text-slate-500">Created: {order?.createdAt?new Date(order.createdAt).toLocaleString("en-IN"):"—"}</p><p className="text-sm text-slate-500">Delivered: {(selected.eligibility?.deliveredAt||order?.deliveredAt)?new Date(selected.eligibility?.deliveredAt||order.deliveredAt).toLocaleString("en-IN"):"—"}</p><p className="text-sm text-slate-500">Source: {order?.sourceType||request.sourceType||"—"}</p><p className="text-sm text-slate-500 mt-1">Address: {order?.address?.address||order?.address?.formattedAddress||order?.address?.street||"Historical order address"}</p></div></div>
      <div className="border rounded-2xl p-4"><h3 className="font-bold">Item / Product / Store</h3><div className="grid md:grid-cols-4 gap-3 mt-3 text-sm"><div><span className="text-slate-500">Product ID</span><p className="font-semibold">{product?._id||request.productId||item?.product||"—"}</p></div><div><span className="text-slate-500">Product</span><p className="font-semibold">{product?.name||item?.name||"—"}</p></div><div><span className="text-slate-500">SKU</span><p className="font-semibold">{product?.sku||"—"}</p></div><div><span className="text-slate-500">Quantity / Price</span><p className="font-semibold">{item?.quantity||request.items?.[0]?.quantity||1} · {item?.price!==undefined?money(Number(item.price)):"—"}</p></div></div>{product?.image&&<img src={product.image} alt={product.name||"Product"} className="mt-4 w-28 h-28 object-cover rounded-xl border"/>}<p className="text-sm text-slate-500 mt-3">Store: {selected.store?.name||"FreshBasket Direct"} · Store Admin: {selected.assignment?.storeAdmin?.name||"—"}</p></div>
      <div className="border rounded-2xl p-4"><h3 className="font-bold">Reason & Evidence</h3><p className="mt-2 text-sm text-slate-700">{request.reason||"—"}</p>{request.description&&<p className="mt-2 text-sm text-slate-600">{request.description}</p>}<div className="flex flex-wrap gap-3 mt-4">{(request.evidence||[]).map((img:string,i:number)=><img key={i} src={img} alt={`Evidence ${i+1}`} className="w-28 h-28 rounded-xl border object-cover"/>)}</div></div>
      <div className="border rounded-2xl p-4"><h3 className="font-bold">Eligibility</h3><div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm"><div><span className="text-slate-500">Replacement allowed</span><p className="font-bold">{selected.eligibility?.productReplacementAllowed?"Yes":"No"}</p></div><div><span className="text-slate-500">24-hour window</span><p className="font-bold">{selected.eligibility?.expiryAt?new Date(selected.eligibility.expiryAt).toLocaleString("en-IN"):"—"}</p></div><div><span className="text-slate-500">Eligible at request</span><p className="font-bold">{selected.eligibility?.eligibleAtRequestTime?"Yes":"No"}</p></div></div></div>
      <div className="border rounded-2xl p-4"><h3 className="font-bold">Assignment</h3><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-sm">{[["Customer Care",selected.assignment?.customerCareAgent?.name||"—"],["Store Admin",selected.assignment?.storeAdmin?.name||"—"],["Main Admin",selected.assignment?.mainAdmin?.name||"—"],["Delivery Partner",selected.assignment?.deliveryPartner?.name||"—"]].map(([l,v])=><div key={String(l)} className="bg-slate-50 rounded-xl p-3"><span className="text-slate-500">{l}</span><p className="font-bold mt-1">{v}</p></div>)}</div></div>
      <div className="border rounded-2xl p-4"><h3 className="font-bold">Replacement Delivery</h3><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-sm"><div><span className="text-slate-500">Replacement ID</span><p className="font-bold">{selected.delivery?.replacementId||request.replacementId||"—"}</p></div><div><span className="text-slate-500">Status</span><p className="font-bold">{selected.delivery?.status||request.status}</p></div><div><span className="text-slate-500">Started</span><p className="font-bold">{selected.delivery?.startedAt?new Date(selected.delivery.startedAt).toLocaleString("en-IN"):"—"}</p></div><div><span className="text-slate-500">Delivered</span><p className="font-bold">{selected.delivery?.replacementDeliveredAt?new Date(selected.delivery.replacementDeliveredAt).toLocaleString("en-IN"):"—"}</p></div></div>{selected.delivery?.proof?.image&&<div className="mt-4"><p className="text-sm font-semibold">Delivery proof</p><img src={selected.delivery.proof.image} alt="Replacement delivery proof" className="mt-2 max-w-xs max-h-64 rounded-xl border object-contain"/></div>}</div>
      <div className="border rounded-2xl p-4"><h3 className="font-bold">Timeline</h3><div className="mt-3 space-y-2">{(selected.timeline||[]).map((x:any,i:number)=><div key={i} className="flex gap-3 border-l-2 pl-3 py-1"><div><b>{x.status}</b><p className="text-xs text-slate-500">{x.at?new Date(x.at).toLocaleString("en-IN"):"—"} · {x.role||"—"} · {x.by||"—"}</p>{x.note&&<p className="text-sm text-slate-600">{x.note}</p>}</div></div>)}{!(selected.timeline||[]).length&&<p className="text-sm text-slate-500">No status history recorded.</p>}</div></div>
      <div className="border rounded-2xl p-4"><h3 className="font-bold">Audit History</h3><div className="mt-3 space-y-2 max-h-64 overflow-y-auto">{(selected.audit||[]).map((a:any)=><div key={a._id} className="border rounded-xl p-3 text-sm"><b>{a.action}</b><p className="text-xs text-slate-500">{a.actorEmployeeId||a.actor||"—"} · {a.actorRole||"—"} · {a.createdAt?new Date(a.createdAt).toLocaleString("en-IN"):"—"}</p><p className="text-xs text-slate-500">{a.targetType} · {a.targetId}</p></div>)}{!(selected.audit||[]).length&&<p className="text-sm text-slate-500">No audit records found for this request.</p>}</div></div>
      <div className="flex flex-wrap gap-2 pt-2">{["REQUESTED","UNDER_REVIEW"].includes(request.status)&&<button disabled={actionLoading} onClick={verify} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">Verify & Route</button>}{!replacementTerminalStatusesForUi.includes(request.status)&&<><button disabled={actionLoading} onClick={reject} className="border border-red-200 text-red-700 rounded-xl px-5 py-3 font-bold disabled:opacity-50">Reject</button><button disabled={actionLoading} onClick={escalate} className="bg-amber-500 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50">Escalate</button></>}</div>
    </div></>}</div></div>}
  </div>;
}

const replacementTerminalStatusesForUi=["REPLACED","COMPLETED","REJECTED","FAILED","CLOSED","EXPIRED"];

function FinanceNotifications({ store, onOpen }: { store: ReturnType<typeof useStore>; onOpen?: (n: any) => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!store.user || !["finance_manager", "finance_executive"].includes(String(store.user.role))) return;
    setLoading(true); setError("");
    try {
      const r = await axios.get(API + "/notifications", { headers: adminHeaders() });
      setNotifications(Array.isArray(r.data.data) ? r.data.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load notifications.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [store.user?.role]);

  const markRead = async (id: string) => {
    try { await axios.patch(API + "/notifications/" + id + "/read", {}, { headers: adminHeaders() }); await load(); } catch {}
  };
  const markAll = async () => {
    try { await axios.patch(API + "/notifications/read-all", {}, { headers: adminHeaders() }); await load(); } catch {}
  };

  if (!["finance_manager", "finance_executive"].includes(String(store.user?.role))) return null;
  return <div className="bg-white border rounded-3xl overflow-hidden">
    <div className="p-5 border-b flex items-center justify-between gap-3">
      <div><h2 className="font-bold text-lg">Finance Notifications</h2><p className="text-sm text-slate-500 mt-1">Finance-related alerts and workflow updates.</p></div>
      <button onClick={markAll} className="border rounded-xl px-4 py-2 text-sm font-bold">Mark all read</button>
    </div>
    {loading ? <div className="py-16 text-center text-slate-500">Loading notifications...</div> : error ? <div className="m-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">{error}</div> : notifications.length ? <div className="divide-y">
      {notifications.map((n:any) => <button key={n._id} onClick={async () => { await markRead(String(n._id)); onOpen?.(n); }} className={`w-full text-left p-5 hover:bg-slate-50 ${n.read ? "" : "bg-emerald-50/50"}`}>
        <div className="flex gap-4"><div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><Bell size={18}/></div><div className="flex-1"><div className="flex items-start justify-between gap-3"><b>{n.title}</b>{!n.read&&<span className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-full font-bold">NEW</span>}</div><p className="text-sm text-slate-600 mt-1">{n.message}</p><p className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p></div></div>
      </button>)}
    </div> : <div className="py-16 text-center text-slate-500"><Bell className="mx-auto text-slate-300" size={40}/><p className="font-bold mt-3">No notifications yet</p></div>}
  </div>;
}

function FinanceReconciliation(){
  const [data,setData]=useState<any>({summary:{MATCHED:0,PENDING:0,MISMATCH:0,FAILED:0,DUPLICATE:0},rows:[],gateway:{available:false,message:"Gateway reconciliation unavailable"}});
  const [loading,setLoading]=useState(false); const [filter,setFilter]=useState("ALL");
  const load=async()=>{setLoading(true);try{const r=await axios.get(API+"/finance/reconciliation",{headers:adminHeaders()});setData(r.data?.data||data);}catch(e:any){alert(e?.response?.data?.message||"Unable to load payment reconciliation");}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const rows=filter==="ALL"?data.rows||[]:(data.rows||[]).filter((x:any)=>x.status===filter);
  const stat=(label:string,key:string)=><button onClick={()=>setFilter(key)} className={`bg-white border rounded-2xl p-4 text-left ${filter===key?"border-emerald-500 ring-1 ring-emerald-200":""}`}><p className="text-xs text-slate-500">{label}</p><b className="text-2xl">{Number(data.summary?.[key]||0)}</b></button>;
  return <div className="space-y-5">
    <div className="bg-white border rounded-3xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><p className="text-emerald-600 text-xs font-bold">FINANCE CONTROL</p><h2 className="text-2xl font-bold">Payment Reconciliation</h2><p className="text-sm text-slate-500 mt-1">Compare recorded database payments, refunds and payouts without inventing gateway data.</p></div><button onClick={load} className="border rounded-xl px-4 py-2 font-bold">{loading?"Refreshing…":"Refresh"}</button></div>
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><b>Payment Gateway</b><p className="text-sm text-amber-800 mt-1">{data.gateway?.message||"Gateway reconciliation unavailable"}. Internal database records are shown below.</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{stat("Matched","MATCHED")}{stat("Pending","PENDING")}{stat("Mismatch","MISMATCH")}{stat("Failed","FAILED")}{stat("Duplicate","DUPLICATE")}</div>
    <div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h3 className="font-bold text-lg">Reconciliation Records</h3><p className="text-xs text-slate-500">UPI / Online, COD, refunds and payouts from actual database records.</p></div><select value={filter} onChange={e=>setFilter(e.target.value)} className="border rounded-xl px-3 py-2 font-semibold"><option value="ALL">All statuses</option><option value="MATCHED">Matched</option><option value="PENDING">Pending</option><option value="MISMATCH">Mismatch</option><option value="FAILED">Failed</option><option value="DUPLICATE">Duplicate</option></select></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Source</th><th className="p-3 text-left">Reference</th><th className="p-3 text-left">Expected</th><th className="p-3 text-left">Recorded</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Details</th><th className="p-3 text-left">Date</th></tr></thead><tbody>{rows.map((x:any,i:number)=><tr key={`${x.reference}-${i}`} className="border-t"><td className="p-3 font-bold">{x.source}</td><td className="p-3 font-mono text-xs">{String(x.reference||"").slice(-12)}</td><td className="p-3">{money(Number(x.expectedAmount||0))}</td><td className="p-3 font-semibold">{money(Number(x.recordedAmount||0))}</td><td className="p-3"><span className="px-2 py-1 rounded-full bg-slate-100 font-bold text-xs">{x.status}</span></td><td className="p-3 text-slate-600 min-w-72">{x.detail}</td><td className="p-3 whitespace-nowrap">{x.createdAt?new Date(x.createdAt).toLocaleString("en-IN"):"—"}</td></tr>)}</tbody></table>{!rows.length&&<div className="p-10 text-center text-slate-500">No reconciliation records for the selected status.</div>}</div></div>
  </div>;
}

function FinanceDashboard({store}:{store:ReturnType<typeof useStore>}){
  const [section,setSection]=useState("dashboard"); const [dashboard,setDashboard]=useState<any>({}); const [refunds,setRefunds]=useState<any[]>([]); const [payouts,setPayouts]=useState<any[]>([]); const [incentives,setIncentives]=useState<any[]>([]); const [storePayouts,setStorePayouts]=useState<any[]>([]); const [storePayoutBatches,setStorePayoutBatches]=useState<any[]>([]); const [transactions,setTransactions]=useState<any[]>([]); const [team,setTeam]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [selectedRefund,setSelectedRefund]=useState<any>(null); const [password,setPassword]=useState({currentPassword:"",newPassword:"",confirm:""}); const [financeSidebarOpen,setFinanceSidebarOpen]=useState(false); const [refundFilter,setRefundFilter]=useState("ALL"); const [payoutFilter,setPayoutFilter]=useState("ALL"); const [incentiveFilter,setIncentiveFilter]=useState("ALL");
  const can=(p:string)=>store.user?.role==="finance_manager" || (Array.isArray(store.user?.permissions)&&store.user.permissions.includes(p));
  const load=async()=>{if(!["finance_manager","finance_executive"].includes(store.user?.role||""))return;setLoading(true);try{const c=(p:string)=>store.user?.role==="finance_manager"||Array.isArray(store.user?.permissions)&&store.user.permissions.includes(p);const [d,r,p,i,sp,t,tm]=await Promise.all([axios.get(API+"/finance/dashboard",{headers:adminHeaders()}),c("FINANCE_VIEW_REFUNDS")?axios.get(API+"/finance/refunds",{headers:adminHeaders()}):Promise.resolve({data:{data:[]}}),c("FINANCE_VIEW_PAYOUTS")?axios.get(API+"/finance/payouts",{headers:adminHeaders()}):Promise.resolve({data:{data:[]}}),c("FINANCE_VIEW_INCENTIVES")?axios.get(API+"/finance/incentives",{headers:adminHeaders()}):Promise.resolve({data:{data:[]}}),c("FINANCE_VIEW_PAYOUTS")?Promise.all([axios.get(API+"/finance/store-payouts",{headers:adminHeaders()}),axios.get(API+"/finance/store-payout-batches",{headers:adminHeaders()})]):Promise.resolve([{data:{data:{rows:[]}}},{data:{data:[]}}]),c("FINANCE_VIEW_REPORTS")?axios.get(API+"/finance/transactions",{headers:adminHeaders()}):Promise.resolve({data:{data:[]}}),axios.get(API+"/finance/team",{headers:adminHeaders()})]);setDashboard(d.data.data||{});setRefunds(r.data.data||[]);setPayouts(p.data.data||[]);setIncentives(i.data.data||[]);setStorePayouts(sp[0]?.data?.data?.rows||[]);setStorePayoutBatches(sp[1]?.data?.data||[]);setTransactions(t.data.data||[]);setTeam(tm.data.data||[]);}catch(e:any){alert(e?.response?.data?.message||"Unable to load Finance");}finally{setLoading(false)}};
  useEffect(()=>{load()},[store.user?.role]);
  if(!["finance_manager","finance_executive"].includes(store.user?.role||""))return <NavigateToLogin/>;
  const dashboardCount=(group:string,status:string)=>Number(dashboard?.[group]?.[status]?.count||0); const statusRefund=(status:string)=>dashboardCount("refunds",status); const statusPayout=(status:string)=>dashboardCount("payouts",status); const statusInc=(status:string)=>dashboardCount("incentives",status); const visibleRefunds=refundFilter==="ALL"?refunds:refunds.filter((x:any)=>x.status===refundFilter); const visiblePayouts=payoutFilter==="ALL"?payouts:payouts.filter((x:any)=>x.deliveryPayoutStatus===payoutFilter); const visibleIncentives=incentiveFilter==="ALL"?incentives:incentives.filter((x:any)=>x.status===incentiveFilter);
  const updateRefund=async(id:string,status:string,extra:any={})=>{try{const path=status==="REJECTED"?"/finance/refunds/"+id+"/reject":status==="APPROVED"?"/finance/refunds/"+id+"/approve":status==="PROCESSING"||status==="COMPLETED"||status==="FAILED"?"/finance/refunds/"+id+"/process":"/finance/refunds/"+id+"/review";const body=status==="REJECTED"?{reason:extra.reason||"Rejected by Finance"}:status==="APPROVED"?{approvedAmount:extra.approvedAmount}:{status};await axios.patch(API+path,body,{headers:adminHeaders()});await load();}catch(e:any){alert(e?.response?.data?.message||"Unable to update refund")}};
  const updatePayout=async(id:string,status:string)=>{try{await axios.patch(API+"/finance/payouts/"+id,{status},{headers:adminHeaders()});await load()}catch(e:any){alert(e?.response?.data?.message||"Unable to update payout")}};
  const updateIncentive=async(id:string,status:string)=>{try{await axios.patch(API+"/finance/incentives/"+id,{status},{headers:adminHeaders()});await load()}catch(e:any){alert(e?.response?.data?.message||"Unable to update incentive")}}; const createStorePayout=async(x:any)=>{try{const from=window.prompt("Payout period start (YYYY-MM-DD)",new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10));if(!from)return;const to=window.prompt("Payout period end (YYYY-MM-DD)",new Date().toISOString().slice(0,10));if(!to)return;await axios.post(API+"/finance/store-payout-batches",{storeAdminId:x.storeId,from,to},{headers:adminHeaders()});alert("Store payout batch created and sent for Finance Manager approval");await load()}catch(e:any){alert(e?.response?.data?.message||"Unable to create Store payout")}}; const updateStorePayout=async(id:string,status:string)=>{try{await axios.patch(API+"/finance/store-payout-batches/"+id,{status},{headers:adminHeaders()});await load()}catch(e:any){alert(e?.response?.data?.message||"Unable to update Store payout")}};
  const exportReport=async()=>{if(!can("FINANCE_EXPORT_REPORTS"))return alert("Export permission required.");try{const r=await axios.get(API+"/finance/reports/export",{headers:adminHeaders(),responseType:"blob"});const url=URL.createObjectURL(r.data);const a=document.createElement("a");a.href=url;a.download="FreshBasket-financial-report.csv";a.click();URL.revokeObjectURL(url);}catch(e:any){alert(e?.response?.data?.message||"Unable to export report")}};
  const saveFinancePhoto = (file:File) => {
    if(!file.type.startsWith("image/"))return alert("Only image files are allowed.");
    if(file.size>700*1024)return alert("Photo must be 700 KB or smaller.");
    const reader=new FileReader();reader.onload=async()=>{try{const r=await axios.patch(API+"/profile/photo",{profilePhoto:String(reader.result||"")},{headers:adminHeaders()});const next={...store.user,profilePhoto:r.data.data?.profilePhoto||""};store.setUser(next as any);localStorage.setItem("fb-user",JSON.stringify(next));}catch(e:any){alert(e?.response?.data?.message||"Unable to update profile photo.");}};reader.readAsDataURL(file);
  };
  const changePassword=async()=>{if(password.newPassword!==password.confirm)return alert("Passwords do not match");try{await axios.patch(API+"/finance/profile/password",{currentPassword:password.currentPassword,newPassword:password.newPassword},{headers:adminHeaders()});alert("Password changed successfully");setPassword({currentPassword:"",newPassword:"",confirm:""})}catch(e:any){alert(e?.response?.data?.message||"Unable to change password")}};
  const financeDepartments = [
    { id:"finance", label:"Finance", Icon:CircleDollarSign, items:[
      {id:"refunds",label:"Refund Requests",Icon:RefreshCw},
      ...(can("FINANCE_VIEW_PAYOUTS")?[{id:"payouts",label:"Delivery Payouts",Icon:Truck},{id:"store-payouts",label:"Store Payouts",Icon:Store}]:[]),
      ...(can("FINANCE_VIEW_INCENTIVES")?[{id:"incentives",label:"Incentives",Icon:Award}]:[]),
      ...(can("FINANCE_VIEW_REPORTS")?[{id:"transactions",label:"Transactions",Icon:History},{id:"reconciliation",label:"Payment Reconciliation",Icon:CircleDollarSign},{id:"reports",label:"Finance Reports",Icon:BarChart3}]:[]),
      {id:"customer-360",label:"Customer 360",Icon:UserRoundSearch},
    ]},
    { id:"notifications", label:"Notifications", Icon:Bell, items:[{id:"notifications",label:"Notifications",Icon:Bell}] },
    { id:"profile", label:"Profile", Icon:User, items:[{id:"profile",label:"Profile / Password",Icon:User}] },
  ].filter(d=>d.items.length);
  // Refund evidence can arrive from the list/detail endpoint under different legacy field names.
  // Normalize it here without changing the existing refund API or workflow.
  const normalizeRefundEvidence=(source:any):string[]=>{
    const buckets=[
      source?.evidence,
      source?.evidenceImages,
      source?.customerEvidence,
      source?.proof,
      source?.proofImages,
      source?.attachments,
    ];
    const values=buckets.flatMap((bucket:any)=>Array.isArray(bucket)?bucket:[]);
    return values.map((item:any)=>typeof item==="string"?item:String(item?.url||item?.image||item?.src||"")).filter(Boolean);
  };
  const card=(label:string,value:any,click?:()=>void)=><button onClick={click} className="bg-white border rounded-2xl p-4 text-left hover:border-emerald-300"><p className="text-xs text-slate-500">{label}</p><b className="text-2xl">{value}</b></button>;
  return <div className="min-h-screen bg-slate-50 fb-dashboard-shell fb-finance-shell"><div className="flex min-h-screen">
    <DepartmentSidebar title="FreshBasket" subtitle={String(store.user?.role||"Finance").replace("_"," ")} departments={financeDepartments} activeId={section} onSelect={(id)=>{ setSection(id); }} logout={()=>{store.logout();window.location.href="/login"}} mobileOpen={financeSidebarOpen} setMobileOpen={setFinanceSidebarOpen}/>
    <main className="md:ml-64 flex-1 min-w-0"><header className="sticky top-0 z-20 bg-white border-b px-4 md:px-8 py-4 flex justify-between items-center"><div className="flex items-center gap-3"><button type="button" className="md:hidden border rounded-xl p-2" aria-label="Open navigation" onClick={()=>setFinanceSidebarOpen(true)}><Menu size={19}/></button><div><p className="text-xs text-emerald-600 font-bold">{String(store.user?.role||"").replace("_"," ").toUpperCase()}</p><h1 className="text-2xl font-bold">Finance {section[0].toUpperCase()+section.slice(1)}</h1></div></div><button onClick={load} className="border rounded-xl px-4 py-2 font-bold"><RefreshCw size={16} className="inline mr-1"/>Refresh</button></header><div className="p-4 md:p-8">
    {dashboard.forcePasswordChange&&<div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900"><b>Password change required.</b> Please update your password from Profile before continuing.</div>}
    {section==="dashboard"&&<div className="space-y-6"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{card("Pending Refunds",statusRefund("REQUESTED"),()=>{setRefundFilter("REQUESTED");setSection("refunds")})}{card("Under Review",statusRefund("FINANCE_REVIEW"),()=>{setRefundFilter("FINANCE_REVIEW");setSection("refunds")})}{card("Approved Refunds",statusRefund("APPROVED"),()=>{setRefundFilter("APPROVED");setSection("refunds")})}{card("Completed Refunds",statusRefund("COMPLETED"),()=>{setRefundFilter("COMPLETED");setSection("refunds")})}{card("Failed Refunds",dashboardCount("refunds","FAILED"),()=>{setRefundFilter("FAILED");setSection("refunds")})}</div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{card("Pending Store Payouts",storePayouts.filter((x:any)=>Number(x.pendingPayout||0)>0).length,()=>setSection("store-payouts"))}{card("Pending Payouts",statusPayout("PENDING"),()=>{setPayoutFilter("PENDING");setSection("payouts")})}{card("Eligible Payouts",statusPayout("ELIGIBLE"),()=>{setPayoutFilter("ELIGIBLE");setSection("payouts")})}{card("Finalized Payouts",statusPayout("FINALIZED"),()=>{setPayoutFilter("FINALIZED");setSection("payouts")})}{card("Paid Payouts",statusPayout("PAID"),()=>{setPayoutFilter("PAID");setSection("payouts")})}{card("Failed Payouts",statusPayout("FAILED"),()=>{setPayoutFilter("FAILED");setSection("payouts")})}</div><div className="grid grid-cols-3 gap-3">{card("Pending Incentives",statusInc("PENDING"),()=>{setIncentiveFilter("PENDING");setSection("incentives")})}{card("Approved Incentives",statusInc("APPROVED"),()=>{setIncentiveFilter("APPROVED");setSection("incentives")})}{card("Paid Incentives",statusInc("PAID"),()=>{setIncentiveFilter("PAID");setSection("incentives")})}</div><div className="grid md:grid-cols-5 gap-3">{card("Today's Refunds",money(dashboard.summary?.todayRefunds||0))}{card("Today's Payouts",money(dashboard.summary?.todayPayouts||0))}{card("Monthly Refunds",money(dashboard.summary?.monthlyRefunds||0))}{card("Monthly Delivery Payout",money(dashboard.summary?.monthlyDeliveryPayout||0))}{card("Monthly Incentives",money(dashboard.summary?.monthlyIncentives||0))}</div><div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b"><h2 className="font-bold">Recent Activities</h2></div>{(dashboard.recentActivities||[]).map((x:any)=><button type="button" key={x._id} onClick={()=>setSection("transactions")} className="w-full p-4 border-b flex justify-between text-sm text-left hover:bg-slate-50"><span><b>{x.transactionId}</b><span className="text-slate-500 ml-2">{x.type}</span></span><span>{money(x.amount)} · {x.status}</span></button>)}{!(dashboard.recentActivities||[]).length&&<div className="p-5 text-sm text-slate-500">No recent finance activity.</div>}</div><div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b"><h2 className="font-bold">My Work Queue</h2><p className="text-xs text-slate-500 mt-1">Live records that require the current Finance role's attention.</p></div><div className="divide-y">{[...refunds.filter((x:any)=>["REQUESTED","UNDER_REVIEW","VERIFIED_BY_CUSTOMER_CARE","FINANCE_REVIEW","APPROVAL_PENDING","APPROVED","PROCESSING"].includes(x.status)).slice(0,4).map((x:any)=>({key:"r"+x._id,label:"REFUND",id:x.requestId||x._id,amount:x.approvedAmount??x.amount,status:x.status,go:"refunds"})),...payouts.filter((x:any)=>["ELIGIBLE","FINALIZED","PROCESSING","ON_HOLD"].includes(x.deliveryPayoutStatus)).slice(0,3).map((x:any)=>({key:"p"+x._id,label:"DELIVERY PAYOUT",id:x._id,amount:Number(x.deliveryPayout||0)+Number(x.performanceIncentive||0),status:x.deliveryPayoutStatus,go:"payouts"})),...incentives.filter((x:any)=>["PENDING","APPROVED","ON_HOLD"].includes(x.status)).slice(0,3).map((x:any)=>({key:"i"+x._id,label:"INCENTIVE",id:x.incentiveId||x._id,amount:x.approvedAmount||x.eligibleAmount,status:x.status,go:"incentives"}))].slice(0,8).map((x:any)=><button key={x.key} onClick={()=>setSection(x.go)} className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50"><span><b>{x.label}</b><span className="ml-2 text-slate-500">{x.id}</span><p className="text-xs text-amber-700 mt-1">Action Required · {x.status}</p></span><b>{money(x.amount||0)}</b></button>)}{!refunds.length&&!payouts.length&&!incentives.length&&<div className="p-5 text-sm text-slate-500">No finance work is currently assigned.</div>}</div></div></div>}
    {section==="refunds"&&<div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex flex-wrap gap-3 justify-between"><div><h2 className="font-bold text-lg">Refund Management</h2><p className="text-xs text-slate-500">Customer Care verification → Finance review → approval → processing.</p></div><select value={refundFilter} onChange={e=>setRefundFilter(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="ALL">All</option><option value="REQUESTED">Pending</option><option value="UNDER_REVIEW">Under Review</option><option value="FINANCE_REVIEW">Finance Review</option><option value="APPROVED">Approved</option><option value="PROCESSING">Processing</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option><option value="REJECTED">Rejected</option></select></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Request ID","Customer","Order","Product / Item","Amount","Method","Status","Action"].map(x=><th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{visibleRefunds.map((r:any)=><tr key={r._id} className="border-t"><td className="p-3 font-semibold">{r.requestId||("#"+String(r._id).slice(-8))}</td><td className="p-3">{r.customer?.name||"—"}<div className="text-xs text-slate-500">{r.customer?.customerId||r.customer?.email||""}</div></td><td className="p-3">#{String(r.order?._id||r.order||"").slice(-8)}</td><td className="p-3">{r.orderItemId||r.productId||"—"}</td><td className="p-3 font-bold">{money(r.approvedAmount??r.amount)}</td><td className="p-3">{r.refundMethod||"ORIGINAL"}{r.bankAccountMasked&&<div className="text-xs text-slate-500">{r.bankAccountMasked}</div>}{r.upiMasked&&<div className="text-xs text-slate-500">{r.upiMasked}</div>}</td><td className="p-3">{r.status}</td><td className="p-3 flex gap-2">{["REQUESTED","UNDER_REVIEW","VERIFIED_BY_CUSTOMER_CARE"].includes(r.status)&&can("FINANCE_REVIEW_REFUNDS")&&<button onClick={()=>updateRefund(r._id,"FINANCE_REVIEW")} className="border rounded-lg px-2 py-1">Review</button>}{["FINANCE_REVIEW","APPROVAL_PENDING"].includes(r.status)&&can("FINANCE_APPROVE_REFUNDS")&&r.status!=="APPROVAL_PENDING"&&<button onClick={()=>{const v=window.prompt("Approved amount",String(r.amount||0));if(v!==null)updateRefund(r._id,"APPROVED",{approvedAmount:Number(v)})}} className="bg-emerald-600 text-white rounded-lg px-2 py-1">Approve</button>}{!["COMPLETED","REJECTED","FAILED"].includes(r.status)&&can("FINANCE_APPROVE_REFUNDS")&&<button onClick={()=>{const reason=window.prompt("Mandatory rejection reason");if(reason)updateRefund(r._id,"REJECTED",{reason})}} className="border border-red-200 text-red-700 rounded-lg px-2 py-1">Reject</button>}{r.status==="APPROVED"&&can("FINANCE_PROCESS_REFUNDS")&&<button onClick={()=>updateRefund(r._id,"PROCESSING")} className="bg-blue-600 text-white rounded-lg px-2 py-1">Process</button>}{r.status==="PROCESSING"&&can("FINANCE_PROCESS_REFUNDS")&&<button onClick={()=>{const ref=window.prompt("Transaction reference (if manual)")||"";axios.patch(API+"/finance/refunds/"+r._id+"/process",{status:"COMPLETED",transactionReference:ref},{headers:adminHeaders()}).then(load).catch((e:any)=>alert(e?.response?.data?.message||"Unable to complete refund"))}} className="bg-emerald-600 text-white rounded-lg px-2 py-1">Complete</button>}<button onClick={async()=>{try{const x=await axios.get(API+"/finance/refunds/"+r._id,{headers:adminHeaders()});const detail=x.data.data||{};const merged={...r,...detail};const evidence=normalizeRefundEvidence(detail);const listEvidence=normalizeRefundEvidence(r);setSelectedRefund({...merged,evidence:evidence.length?evidence:listEvidence})}catch(e:any){alert(e?.response?.data?.message||"Unable to load refund")}}} className="border rounded-lg px-2 py-1"><Eye size={14}/></button></td></tr>)}</tbody></table></div></div>}
    {section==="payouts"&&<div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex flex-wrap gap-3 justify-between"><div><h2 className="font-bold text-lg">Delivery Partner Payouts</h2><p className="text-xs text-slate-500">Base payout is taken from the Store/Admin assignment; Finance cannot silently change it.</p></div><select value={payoutFilter} onChange={e=>setPayoutFilter(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="ALL">All</option><option value="PENDING">Pending</option><option value="ELIGIBLE">Eligible</option><option value="FINALIZED">Finalized</option><option value="PROCESSING">Processing</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="ON_HOLD">On Hold</option></select></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Order","Partner","Delivery Date","Base Payout","Incentive","Total","Status","Action"].map(x=><th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{visiblePayouts.map((p:any)=><tr key={p._id} className="border-t"><td className="p-3">#{String(p._id).slice(-8)}</td><td className="p-3">{p.deliveryPartner?.name||"—"}<div className="text-xs text-slate-500">{p.deliveryPartner?.employeeId||""}</div></td><td className="p-3">{p.deliveredAt?new Date(p.deliveredAt).toLocaleString("en-IN"):"—"}</td><td className="p-3">{money(p.deliveryPayout||0)}</td><td className="p-3">{money(p.performanceIncentive||0)}</td><td className="p-3 font-bold">{money(Number(p.deliveryPayout||0)+Number(p.performanceIncentive||0))}</td><td className="p-3">{p.deliveryPayoutStatus}</td><td className="p-3">{can("FINANCE_PROCESS_PAYOUTS")&&<select value={p.deliveryPayoutStatus} onChange={e=>updatePayout(p._id,e.target.value)} className="border rounded-lg p-2"><option>ELIGIBLE</option><option>FINALIZED</option><option>PROCESSING</option><option>PAID</option><option>ON_HOLD</option></select>}</td></tr>)}</tbody></table></div></div>}
    {section==="store-payouts"&&<div className="space-y-5"><div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b"><h2 className="font-bold text-lg">Store Payout Verification</h2><p className="text-xs text-slate-500 mt-1">Store payouts use the existing finance transaction ledger. Finance Executive prepares the batch; Finance Manager approves and settles it.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Store","Gross Sales","Refunds","Commission","Adjustments","Net Earnings","Pending","Paid","Action"].map(x=><th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{storePayouts.map((x:any)=><tr key={x.storeId} className="border-t"><td className="p-3 font-semibold">{x.name}<div className="text-xs text-slate-500">{x.employeeId||""}</div></td><td className="p-3">{money(x.grossSales||0)}</td><td className="p-3">{money(x.refunds||0)}</td><td className="p-3">{money(x.commission||0)}</td><td className="p-3">{money(x.adjustments||0)}</td><td className="p-3 font-bold">{money(x.storeEarnings||0)}</td><td className="p-3">{money(x.pendingPayout||0)}</td><td className="p-3">{money(x.paidPayout||0)}</td><td className="p-3">{can("FINANCE_PROCESS_PAYOUTS")&&Number(x.pendingPayout||0)>0&&<button onClick={()=>createStorePayout(x)} className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 font-bold">Create Batch</button>}</td></tr>)}</tbody></table>{!storePayouts.length&&<div className="p-10 text-center text-slate-500">No Store payout data for the current period.</div>}</div></div><div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b"><h3 className="font-bold text-lg">Store Payout Approval Queue</h3></div><div className="divide-y">{storePayoutBatches.map((b:any)=><div key={b._id} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><b>{b.batchId}</b><p className="text-sm mt-1">{b.storeAdmin?.name||"Store"} · {money(b.netPayable||b.total||0)}</p><p className="text-xs text-slate-500 mt-1">{b.payoutPeriodStart?new Date(b.payoutPeriodStart).toLocaleDateString("en-IN"):"—"} → {b.payoutPeriodEnd?new Date(b.payoutPeriodEnd).toLocaleDateString("en-IN"):"—"} · {b.status}</p></div><div className="flex flex-wrap gap-2">{can("FINANCE_PROCESS_PAYOUTS")&&b.status==="CREATED"&&<button onClick={()=>updateStorePayout(b._id,"UNDER_REVIEW")} className="border rounded-lg px-3 py-1.5 font-bold">Review</button>}{store.user?.role==="finance_manager"&&b.status==="UNDER_REVIEW"&&<button onClick={()=>updateStorePayout(b._id,"APPROVED")} className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 font-bold">Approve</button>}{store.user?.role==="finance_manager"&&b.status==="APPROVED"&&<button onClick={()=>updateStorePayout(b._id,"PROCESSING")} className="border rounded-lg px-3 py-1.5 font-bold">Process</button>}{store.user?.role==="finance_manager"&&b.status==="PROCESSING"&&<button onClick={()=>updateStorePayout(b._id,"PAID")} className="bg-blue-600 text-white rounded-lg px-3 py-1.5 font-bold">Mark Paid</button>}</div></div>)}{!storePayoutBatches.length&&<div className="p-10 text-center text-slate-500">No Store payout batches created yet.</div>}</div></div></div>}
    {section==="incentives"&&<div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex flex-wrap gap-3 justify-between"><h2 className="font-bold text-lg">Incentives</h2><select value={incentiveFilter} onChange={e=>setIncentiveFilter(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-semibold"><option value="ALL">All</option><option value="PENDING">Pending</option><option value="ELIGIBLE">Eligible</option><option value="APPROVED">Approved</option><option value="PAID">Paid</option><option value="REJECTED">Rejected</option></select></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Partner</th><th className="p-3">Deliveries</th><th className="p-3">Rating</th><th className="p-3">Eligible</th><th className="p-3">Approved</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{visibleIncentives.map((i:any)=><tr key={i._id} className="border-t"><td className="p-3">{i.deliveryPartner?.name||"—"}</td><td className="p-3 text-center">{i.completedDeliveries}</td><td className="p-3 text-center">{Number(i.averageRating||0).toFixed(1)}</td><td className="p-3">{money(i.eligibleAmount)}</td><td className="p-3">{money(i.approvedAmount)}</td><td className="p-3">{i.status}</td><td className="p-3">{can("FINANCE_MANAGE_INCENTIVES")&&i.status==="PENDING"&&<button onClick={()=>updateIncentive(i._id,"APPROVED")} className="bg-emerald-600 text-white rounded-lg px-3 py-1">Approve</button>}{can("FINANCE_MANAGE_INCENTIVES")&&i.status==="APPROVED"&&<button onClick={()=>updateIncentive(i._id,"PAID")} className="bg-blue-600 text-white rounded-lg px-3 py-1">Mark Paid</button>}</td></tr>)}</tbody></table></div></div>}
    {section==="transactions"&&<div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex justify-between items-center"><div><h2 className="font-bold text-lg">Financial Transaction Ledger</h2><p className="text-xs text-slate-500">Completed transactions are immutable; corrections use adjustment/reversal transactions.</p></div><button onClick={exportReport} className="border rounded-xl px-3 py-2 font-bold">Export CSV</button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Transaction ID</th><th className="p-3">Type</th><th className="p-3">Reference</th><th className="p-3">Amount</th><th className="p-3">Direction</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead><tbody>{transactions.map((x:any)=><tr key={x._id} className="border-t"><td className="p-3">{x.transactionId}</td><td className="p-3">{x.type}</td><td className="p-3">{x.referenceId}</td><td className="p-3 font-bold">{money(x.amount)}</td><td className="p-3">{x.direction}</td><td className="p-3">{x.status}</td><td className="p-3">{x.createdAt?new Date(x.createdAt).toLocaleString("en-IN"):"—"}</td></tr>)}</tbody></table></div></div>}
    {section==="reconciliation"&&<FinanceReconciliation/>}{section==="reports"&&<div className="bg-white border rounded-3xl p-6"><h2 className="font-bold text-lg">Finance Reports</h2><p className="text-sm text-slate-500 mt-1">Daily, weekly, monthly and custom-range reporting is available through the Finance API.</p><div className="grid md:grid-cols-2 gap-3 mt-5"><button onClick={exportReport} className="border rounded-xl p-4 text-left font-bold">Export Financial Transaction Report (CSV)</button><button onClick={()=>setSection("transactions")} className="border rounded-xl p-4 text-left font-bold">Open Transaction Ledger</button><button onClick={()=>setSection("refunds")} className="border rounded-xl p-4 text-left font-bold">Refund Report</button><button onClick={()=>setSection("payouts")} className="border rounded-xl p-4 text-left font-bold">Delivery Payout Report</button></div></div>}
    {section==="notifications"&&<FinanceNotifications store={store} onOpen={(n:any)=>{ const text=`${n?.title||""} ${n?.message||""} ${n?.type||""} ${n?.relatedEntity||""}`.toLowerCase(); if(text.includes("refund")) setSection("refunds"); else if(text.includes("payout")||text.includes("delivery payout")) setSection("payouts"); else if(text.includes("incentive")) setSection("incentives"); else if(text.includes("transaction")) setSection("transactions"); else setSection("dashboard"); }}/>}
    {section==="customer-360"&&<Customer360 store={store}/>} 
    {section==="profile"&&<div className="max-w-2xl bg-white border rounded-3xl p-6"><h2 className="font-bold text-lg">Finance Profile</h2><div className="flex flex-wrap items-center gap-4 mt-4"><div className="w-16 h-16 rounded-2xl overflow-hidden border bg-slate-50 grid place-items-center">{store.user?.profilePhoto?<img src={store.user.profilePhoto} alt="Finance profile" className="w-full h-full object-cover"/>:<User size={24} className="text-slate-300"/>}</div><ImagePickerButtons compact onFile={saveFinancePhoto}/></div><div className="grid md:grid-cols-2 gap-3 mt-4 text-sm"><div><span className="text-slate-500">Name</span><p className="font-bold">{store.user?.name}</p></div><div><span className="text-slate-500">Employee ID</span><p className="font-bold">{store.user?.employeeId||"—"}</p></div><div><span className="text-slate-500">Login ID</span><p className="font-bold">{store.user?.username||store.user?.email}</p></div><div><span className="text-slate-500">Role</span><p className="font-bold">{store.user?.role}</p></div></div><Link to="/login-history" className="inline-flex mt-5 border rounded-xl px-4 py-2.5 font-bold">Login History</Link><div className="border-t mt-6 pt-6"><h3 className="font-bold">Change Password</h3><div className="space-y-3 mt-4"><input type="password" placeholder="Current password" value={password.currentPassword} onChange={e=>setPassword({...password,currentPassword:e.target.value})} className="w-full border rounded-xl p-3"/><input type="password" placeholder="New password" value={password.newPassword} onChange={e=>setPassword({...password,newPassword:e.target.value})} className="w-full border rounded-xl p-3"/><input type="password" placeholder="Confirm new password" value={password.confirm} onChange={e=>setPassword({...password,confirm:e.target.value})} className="w-full border rounded-xl p-3"/><button onClick={changePassword} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">Change Password</button></div></div></div>}
    {selectedRefund&&<div className="fixed inset-0 bg-black/40 z-50 p-4 grid place-items-center" onClick={()=>setSelectedRefund(null)}><div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6" onClick={e=>e.stopPropagation()}><div className="flex justify-between"><h2 className="font-bold text-xl">Refund Details</h2><button onClick={()=>setSelectedRefund(null)}><X/></button></div><div className="grid md:grid-cols-2 gap-3 mt-5 text-sm">{[["Customer",selectedRefund.customer?.name],["Order",selectedRefund.order?._id],["Product/Item",selectedRefund.orderItemId||"—"],["Eligible / Requested",money(selectedRefund.amount)], ["Approved",money(selectedRefund.approvedAmount??selectedRefund.amount)], ["Method",selectedRefund.refundMethod||"ORIGINAL"],["Status",selectedRefund.status],["Requested",selectedRefund.createdAt?new Date(selectedRefund.createdAt).toLocaleString("en-IN"):"—"],["Transaction Ref",selectedRefund.transactionReference||"—"]].map(([l,v])=><div key={String(l)} className="border rounded-xl p-3"><span className="text-xs text-slate-500">{l}</span><p className="font-bold break-words">{v}</p></div>)}</div>{selectedRefund.bankAccountMasked&&<div className="mt-4 bg-slate-50 rounded-xl p-4 text-sm"><b>Bank</b><p>{selectedRefund.bankName||"—"} · {selectedRefund.bankAccountMasked} · {selectedRefund.ifsc||"—"}</p><p className="text-xs text-slate-500">Full account number is not displayed.</p></div>}{selectedRefund.upiMasked&&<div className="mt-4 bg-slate-50 rounded-xl p-4 text-sm"><b>UPI</b><p>{selectedRefund.upiMasked}</p></div>}<div className="mt-4"><b>Reason</b><p className="text-sm text-slate-600 mt-1">{selectedRefund.reason}</p></div>{selectedRefund.rejectionReason&&<div className="mt-4 bg-red-50 text-red-800 rounded-xl p-4"><b>Rejection reason</b><p className="text-sm mt-1">{selectedRefund.rejectionReason}</p></div>}{normalizeRefundEvidence(selectedRefund).length>0&&<div className="mt-4 border rounded-2xl p-4"><div className="flex items-center justify-between gap-3"><div><b>Customer Evidence / Proof</b><p className="text-xs text-slate-500 mt-1">Proof uploaded by the customer for this refund request.</p></div><span className="text-xs font-bold text-emerald-700">{normalizeRefundEvidence(selectedRefund).length} image(s)</span></div><div className="flex flex-wrap gap-3 mt-3">{normalizeRefundEvidence(selectedRefund).map((img:string,i:number)=><a key={i} href={img} target="_blank" rel="noreferrer" className="block"><img src={img} alt={`Customer refund proof ${i+1}`} className="w-32 h-32 rounded-xl border object-cover hover:opacity-90" /></a>)}</div></div>}{normalizeRefundEvidence(selectedRefund).length===0&&<div className="mt-4 border border-amber-200 bg-amber-50 text-amber-800 rounded-xl p-4 text-sm"><b>Customer Evidence / Proof</b><p className="mt-1">No evidence image was returned with this refund record.</p></div>}</div></div>}
    {loading&&<div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm">Refreshing...</div>}
  </div></main></div></div>;
}


function DepartmentSidebar({
  title,
  subtitle,
  departments,
  activeId,
  onSelect,
  logout,
  mobileOpen,
  setMobileOpen,
}: {
  title: string;
  subtitle: string;
  departments: Array<{ id: string; label: string; Icon: any; items: Array<{ id: string; label: string; Icon?: any }> }>;
  activeId: string;
  onSelect: (id: string) => void;
  logout: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const active = departments.find(d => d.items.some(i => i.id === activeId));
    return Object.fromEntries(departments.map(d => [d.id, d.id === active?.id]));
  });

  useEffect(() => {
    const active = departments.find(d => d.items.some(i => i.id === activeId));
    if (active) setOpen(prev => ({ ...prev, [active.id]: true }));
  }, [activeId]);

  const content = (
    <div className="h-full flex flex-col">
      <div className="p-6 text-xl font-bold flex items-center gap-2">
        <span className="w-9 h-9 bg-emerald-500 rounded-xl grid place-items-center">
          <Leaf size={18} />
        </span>
        {title}
      </div>
      <p className="px-6 text-[10px] uppercase text-slate-500 font-bold tracking-widest mt-1">
        {subtitle}
      </p>
      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 mt-3" aria-label={`${subtitle} navigation`}>
        <button
          type="button"
          onClick={() => { onSelect("dashboard"); setMobileOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${activeId === "dashboard" ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-white/5"}`}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </button>
        {departments.map((department) => {
          const isActiveDepartment = department.items.some(item => item.id === activeId);
          const expanded = Boolean(open[department.id]);
          return (
            <div key={department.id}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`department-${department.id}`}
                onClick={() => setOpen(prev => ({ ...prev, [department.id]: !prev[department.id] }))}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-[11px] uppercase tracking-widest font-bold ${isActiveDepartment ? "text-emerald-300 bg-white/5" : "text-slate-500 hover:text-slate-300"}`}
              >
                <span className="flex items-center gap-2"><department.Icon size={15} />{department.label}</span>
                <span aria-hidden="true">{expanded ? "⌄" : "›"}</span>
              </button>
              {expanded && (
                <div id={`department-${department.id}`} className="mt-1 space-y-1 pl-2">
                  {department.items.map(item => {
                    const ItemIcon = item.Icon;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => { onSelect(item.id); setMobileOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-left ${activeId === item.id ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-white/5"}`}
                      >
                        {ItemIcon ? <ItemIcon size={17} /> : <span className="w-[17px]" />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 p-4 border-t border-white/10 bg-slate-950">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 bg-slate-950 text-white flex-col fixed inset-y-0 z-40">
        {content}
      </aside>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[70]">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[285px] max-w-[85vw] h-full bg-slate-950 text-white shadow-2xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}



const applicationStoreCategories = ["Grocery", "Medical", "Restaurant/Food", "Electronics", "Clothing", "General Store", "Local Retail", "Other"];
const applicationDocumentDefinitions = {
  STORE: [
    ["IDENTITY_PROOF", "Identity Proof", "Aadhaar / Voter ID / Driving Licence / Other"],
    ["PAN_CARD", "PAN Card", "Optional / as applicable"],
    ["BUSINESS_REGISTRATION", "Shop / Business Registration Proof", "Optional / if applicable"],
    ["GST_CERTIFICATE", "GST Certificate", "Optional / if applicable"],
    ["ADDRESS_PROOF", "Address Proof", "Optional / as applicable"],
    ["OWNERSHIP_RENT_PROOF", "Shop Ownership / Rent Proof", "Optional / if applicable"],
    ["BANK_ACCOUNT_PROOF", "Bank Account Proof", "Optional / if required for seller settlement"],
  ],
  DELIVERY: [
    ["IDENTITY_PROOF", "Identity Proof", "Required only if FreshBasket business policy requires it"],
    ["DRIVING_LICENCE", "Driving Licence", "Required only if FreshBasket business policy requires it"],
    ["VEHICLE_RC", "Vehicle Registration Certificate", "Optional / as applicable"],
    ["ADDRESS_PROOF", "Address Proof", "Optional / as applicable"],
    ["PAN_CARD", "PAN Card", "Optional / as applicable"],
    ["BANK_ACCOUNT_PROOF", "Bank Account Proof", "Optional / if required for settlement"],
    ["VEHICLE_INSURANCE", "Vehicle Insurance", "Optional / if applicable"],
  ],
};

const applicationStatusLabel = (status: string) => ({
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  NEED_MORE_INFORMATION: "Need More Information",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ON_HOLD: "On Hold",
} as Record<string, string>)[status] || status;

const applicationStatusClass = (status: string) => ({
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-100",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  NEED_MORE_INFORMATION: "bg-violet-50 text-violet-700 border-violet-100",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-red-50 text-red-700 border-red-100",
  ON_HOLD: "bg-slate-100 text-slate-700 border-slate-200",
} as Record<string, string>)[status] || "bg-slate-100 text-slate-700 border-slate-200";

function PublicApplicationPage({ type }: { type: "STORE" | "DELIVERY" }) {
  const nav = useNavigate();
  const isStore = type === "STORE";
  const [form, setForm] = useState<any>(() => isStore ? ({
    applicantName: "", phone: "", email: "", personalPhoto: "", alternatePhone: "", dateOfBirth: "", city: "", state: "", pincode: "",
    storeName: "", storeCategory: "Grocery", otherStoreCategory: "", storeDescription: "", storeAddress: "", landmark: "",
    latitude: "", longitude: "", storeType: "Grocery", storeImage: "", storeImageUrl: "", businessName: "", gstin: "", pan: "",
    businessType: "Proprietorship", yearsInBusiness: "", employeeCount: "", contactPersonName: "", contactNumber: "", contactEmail: "", preferredContactMethod: "Phone",
    documents: [], declarationAccurate: false, declarationContact: false,
  }) : ({
    applicantName: "", phone: "", email: "", personalPhoto: "", dateOfBirth: "", gender: "", city: "", state: "", pincode: "", currentAddress: "",
    preferredDeliveryCity: "", preferredAreas: "", servicePincodes: "", availability: "Flexible", preferredWorkingHours: "",
    vehicleType: "Bike", vehicleRegistrationNumber: "", drivingLicenceNumber: "", vehicleOwnership: "Own", documents: [],
    emergencyContactName: "", emergencyContactRelationship: "", emergencyContactNumber: "", previousDeliveryExperience: "No",
    previousDeliveryCompany: "", previousDeliveryDuration: "", declarationAccurate: false, declarationContact: false,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));
  const readFile = (file: File, maxBytes = 850 * 1024) => new Promise<any>((resolve, reject) => {
    if (!file) return reject(new Error("No file selected"));
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type.toLowerCase())) return reject(new Error("Only JPG, JPEG, PNG, WEBP images or PDF files are supported."));
    if (file.size > maxBytes) return reject(new Error(`File must be ${Math.round(maxBytes / 1024)} KB or smaller.`));
    const reader = new FileReader();
    reader.onload = () => resolve({ fileName: file.name, mimeType: file.type.toLowerCase(), data: String(reader.result || "") });
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    reader.readAsDataURL(file);
  });

  const uploadStoreImage = async (file?: File) => {
    if (!file) return;
    try { const d = await readFile(file, 1100 * 1024); set("storeImage", d.data); setError(""); }
    catch (e: any) { setError(e?.message || "Unable to upload store image."); }
  };
  const uploadPersonalPhoto = async (file:File) => {
    if(!file.type.startsWith("image/"))return setError("Only image files are allowed.");
    if(file.size>700*1024)return setError("Personal photo must be 700 KB or smaller.");
    try{const d=await readFile(file,750*1024);set("personalPhoto",d.data);setError("");}
    catch(e:any){setError(e?.message||"Unable to upload personal photo.");}
  };

  const uploadDocument = async (index: number, file?: File) => {
    if (!file) return;
    try {
      const d = await readFile(file);
      setForm((f: any) => ({ ...f, documents: f.documents.map((x: any, i: number) => i === index ? { ...x, ...d, uploadedAt: new Date().toISOString() } : x) }));
      setError("");
    } catch (e: any) { setError(e?.message || "Unable to upload document."); }
  };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setError("Location is not available in this browser. Enter the location manually.");
    setError("");
    navigator.geolocation.getCurrentPosition(
      p => { set("latitude", p.coords.latitude.toFixed(7)); set("longitude", p.coords.longitude.toFixed(7)); },
      () => setError("Unable to access current location. You can continue with manual address/location details."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };
  const removeDocument = (index: number) => setForm((f: any) => ({ ...f, documents: f.documents.map((x: any, i: number) => i === index ? { ...x, fileName: "", mimeType: "", data: "", uploadedAt: null } : x) }));

  useEffect(() => {
    setForm((f: any) => ({ ...f, documents: (applicationDocumentDefinitions[type] as any[]).map((x: any) => ({ documentType: x[0], label: x[1], required: false, fileName: "", mimeType: "", data: "" })) }));
  }, [type]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.declarationAccurate || !form.declarationContact) return setError("Please accept both declarations before submitting.");
    setSubmitting(true);
    try {
      const payload = { ...form, applicationType: type, pincode: String(form.pincode || "").trim(), phone: String(form.phone || "").replace(/\D/g, ""), contactNumber: String(form.contactNumber || "").replace(/\D/g, ""), emergencyContactNumber: String(form.emergencyContactNumber || "").replace(/\D/g, "") };
      const r = await axios.post(API + "/public/applications", payload);
      setSuccess(r.data.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to submit application. Please try again."); }
    finally { setSubmitting(false); }
  };

  if (success) return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:py-14">
      <div className="max-w-2xl mx-auto bg-white border rounded-[2rem] shadow-sm p-7 md:p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center mx-auto"><CheckCircle2 size={34}/></div>
        <p className="text-emerald-700 text-xs font-black uppercase tracking-[.18em] mt-5">FreshBasket Onboarding</p>
        <h1 className="text-3xl md:text-4xl font-black mt-2">Application submitted successfully.</h1>
        <p className="text-slate-500 mt-3">Keep your Application ID safe. You can use it to track the application without creating a customer account.</p>
        <div className="bg-slate-50 border rounded-2xl p-5 mt-6"><p className="text-xs text-slate-500">Application ID</p><p className="text-2xl font-black text-slate-950 mt-1 tracking-wide">{success.applicationId}</p><div className="flex justify-center gap-2 mt-3"><span className="px-3 py-1.5 rounded-full border bg-white text-sm font-bold">{applicationStatusLabel(success.status)}</span><span className="text-sm text-slate-500 py-1.5">{success.submittedAt ? new Date(success.submittedAt).toLocaleString("en-IN") : ""}</span></div></div>
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7"><Link to="/application-status" className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">Track application</Link><button type="button" onClick={() => nav("/")} className="border rounded-xl px-5 py-3 font-bold">Back to FreshBasket</button></div>
      </div>
    </div>
  );

  const Section = ({ title, children }: any) => <section className="bg-white border rounded-3xl p-5 md:p-7"><div className="flex items-center gap-3 mb-5"><span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center font-black">✓</span><h2 className="text-xl font-black">{title}</h2></div>{children}</section>;
  const Field = ({ label, required, children, className = "" }: any) => <label className={`text-sm font-semibold ${className}`}>{label}{required && <span className="text-red-500"> *</span>}{children}</label>;
  const Input = ({ value, onChange, ...props }: any) => <input value={value ?? ""} onChange={onChange} className="mt-2 w-full border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400" {...props}/>;
  const Select = ({ value, onChange, children }: any) => <select value={value ?? ""} onChange={onChange} className="mt-2 w-full border border-slate-200 rounded-xl px-3.5 py-3 bg-white outline-none focus:ring-2 focus:ring-emerald-100">{children}</select>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 text-white"><div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4"><Link to="/login" className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-emerald-500 grid place-items-center"><Leaf size={21}/></span><div><b className="text-lg">FreshBasket</b><p className="text-[10px] uppercase tracking-widest text-emerald-300">Public onboarding</p></div></Link><Link to="/application-status" className="text-sm font-bold text-emerald-300">Track application</Link></div></header>
      <main className="max-w-6xl mx-auto px-4 py-7 md:py-10">
        <div className="mb-7"><p className="text-emerald-700 text-xs font-black uppercase tracking-[.18em]">{isStore ? "Store / Seller Application" : "Delivery Partner Application"}</p><h1 className="text-3xl md:text-4xl font-black mt-2">{isStore ? "Take Your Local Store Online" : "Become a Delivery Partner"}</h1><p className="text-slate-500 mt-2 max-w-3xl">Submit your details directly to FreshBasket Main Admin. No customer login and no OTP are required for this application.</p></div>
        {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">{error}</div>}
        <form onSubmit={submit} className="space-y-5">
          <Section title={isStore ? "A — Applicant Details" : "A — Personal Details"}>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Full Name" required><Input required value={form.applicantName} onChange={(e:any)=>set("applicantName",e.target.value)} placeholder="Your full name"/></Field>
              <Field label="Mobile Number" required><Input required value={form.phone} onChange={(e:any)=>set("phone",e.target.value)} placeholder="10-digit mobile number"/></Field>
              <Field label="Email Address" required><Input required type="email" value={form.email} onChange={(e:any)=>set("email",e.target.value)} placeholder="you@example.com"/></Field><div className="md:col-span-2 border rounded-2xl p-4"><p className="text-sm font-bold">{isStore ? "Owner / Personal Photo" : "Personal Photo"} <span className="text-xs text-slate-400 font-semibold">(Optional)</span></p><p className="text-xs text-slate-500 mt-1">Use your gallery or capture a photo with the device camera.</p><div className="flex flex-wrap items-center gap-4 mt-3">{form.personalPhoto&&<img src={form.personalPhoto} alt="Personal preview" className="w-16 h-16 rounded-xl object-cover border"/>}<ImagePickerButtons compact onFile={uploadPersonalPhoto}/></div></div>
              {isStore ? <><Field label="Alternate Contact Number"><Input value={form.alternatePhone} onChange={(e:any)=>set("alternatePhone",e.target.value)}/></Field><Field label="Date of Birth"><Input type="date" value={form.dateOfBirth} onChange={(e:any)=>set("dateOfBirth",e.target.value)}/></Field></> : <><Field label="Date of Birth" required><Input required type="date" value={form.dateOfBirth} onChange={(e:any)=>set("dateOfBirth",e.target.value)}/></Field><Field label="Gender"><Select value={form.gender} onChange={(e:any)=>set("gender",e.target.value)}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></Select></Field></>}
              <Field label="City" required><Input required value={form.city} onChange={(e:any)=>set("city",e.target.value)}/></Field><Field label="State" required><Input required value={form.state} onChange={(e:any)=>set("state",e.target.value)}/></Field><Field label="Pincode" required><Input required value={form.pincode} onChange={(e:any)=>set("pincode",e.target.value)} inputMode="numeric"/></Field>
              {!isStore && <Field label="Current Address" required className="md:col-span-2"><textarea required value={form.currentAddress} onChange={(e:any)=>set("currentAddress",e.target.value)} className="mt-2 w-full border rounded-xl p-3 min-h-24 outline-none focus:ring-2 focus:ring-emerald-100"/></Field>}
            </div>
          </Section>

          {isStore ? <>
            <Section title="B — Store Details"><div className="grid md:grid-cols-2 gap-4"><Field label="Store / Shop Name" required><Input required value={form.storeName} onChange={(e:any)=>set("storeName",e.target.value)}/></Field><Field label="Store Category" required><Select required value={form.storeCategory} onChange={(e:any)=>set("storeCategory",e.target.value)}>{applicationStoreCategories.map(x=><option key={x}>{x}</option>)}</Select></Field>{form.storeCategory === "Other" && <Field label="Other category"><Input value={form.otherStoreCategory} onChange={(e:any)=>set("otherStoreCategory",e.target.value)}/></Field>}<Field label="Store Type"><Select value={form.storeType} onChange={(e:any)=>set("storeType",e.target.value)}>{applicationStoreCategories.map(x=><option key={x}>{x}</option>)}</Select></Field><Field label="Store Description" required className="md:col-span-2"><textarea required value={form.storeDescription} onChange={(e:any)=>set("storeDescription",e.target.value)} className="mt-2 w-full border rounded-xl p-3 min-h-28 outline-none focus:ring-2 focus:ring-emerald-100"/></Field><Field label="Store Address" required className="md:col-span-2"><textarea required value={form.storeAddress} onChange={(e:any)=>set("storeAddress",e.target.value)} className="mt-2 w-full border rounded-xl p-3 min-h-24 outline-none focus:ring-2 focus:ring-emerald-100"/></Field><Field label="Landmark"><Input value={form.landmark} onChange={(e:any)=>set("landmark",e.target.value)}/></Field><Field label="Store City"><Input value={form.city} onChange={(e:any)=>set("city",e.target.value)}/></Field><Field label="Store State"><Input value={form.state} onChange={(e:any)=>set("state",e.target.value)}/></Field><Field label="Store Pincode"><Input value={form.pincode} onChange={(e:any)=>set("pincode",e.target.value)}/></Field></div></Section>
            <Section title="C — Store Location"><div className="grid md:grid-cols-2 gap-4"><Field label="Store Address" required className="md:col-span-2"><Input required value={form.storeAddress} onChange={(e:any)=>set("storeAddress",e.target.value)}/></Field><Field label="Latitude"><Input value={form.latitude} onChange={(e:any)=>set("latitude",e.target.value)} inputMode="decimal"/></Field><Field label="Longitude"><Input value={form.longitude} onChange={(e:any)=>set("longitude",e.target.value)} inputMode="decimal"/></Field></div><button type="button" onClick={useCurrentLocation} className="mt-4 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 font-bold inline-flex items-center gap-2"><MapPin size={17}/>Use Current Location</button><p className="text-xs text-slate-500 mt-2">Location permission is optional. You can enter coordinates manually.</p></Section>
            <Section title="D — Store Image"><div className="grid md:grid-cols-2 gap-5"><div><div><Field label="Upload Store Image"><input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(e:any)=>uploadStoreImage(e.target.files?.[0])} className="mt-2 w-full text-sm"/></Field><div className="mt-2"><ImagePickerButtons compact onFile={uploadStoreImage}/></div></div><p className="text-xs text-slate-500 mt-2">JPG, JPEG, PNG or WEBP. Optional.</p></div><Field label="Image URL"><Input type="url" value={form.storeImageUrl} onChange={(e:any)=>set("storeImageUrl",e.target.value)} placeholder="https://..."/></Field></div>{(form.storeImage || form.storeImageUrl) && <div className="mt-4"><img src={form.storeImage || form.storeImageUrl} alt="Store preview" className="w-40 h-32 object-cover rounded-2xl border" onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none"}}/></div>}</Section>
            <Section title="E — Business Information"><div className="grid md:grid-cols-2 gap-4"><Field label="Business / Shop Registration Name"><Input value={form.businessName} onChange={(e:any)=>set("businessName",e.target.value)}/></Field><Field label="GSTIN (optional)"><Input value={form.gstin} onChange={(e:any)=>set("gstin",e.target.value)}/></Field><Field label="PAN"><Input value={form.pan} onChange={(e:any)=>set("pan",e.target.value)}/></Field><Field label="Business Type"><Select value={form.businessType} onChange={(e:any)=>set("businessType",e.target.value)}>{["Proprietorship","Partnership","Company","Other"].map(x=><option key={x}>{x}</option>)}</Select></Field><Field label="Years in Business"><Input value={form.yearsInBusiness} onChange={(e:any)=>set("yearsInBusiness",e.target.value)}/></Field><Field label="Number of Employees"><Input value={form.employeeCount} onChange={(e:any)=>set("employeeCount",e.target.value)}/></Field></div></Section>
            <Section title="F — Contact Person"><div className="grid md:grid-cols-2 gap-4"><Field label="Contact Person Name" required><Input required value={form.contactPersonName} onChange={(e:any)=>set("contactPersonName",e.target.value)}/></Field><Field label="Contact Number" required><Input required value={form.contactNumber} onChange={(e:any)=>set("contactNumber",e.target.value)}/></Field><Field label="Email" required><Input required type="email" value={form.contactEmail} onChange={(e:any)=>set("contactEmail",e.target.value)}/></Field><Field label="Preferred Contact Method"><Select value={form.preferredContactMethod} onChange={(e:any)=>set("preferredContactMethod",e.target.value)}><option>Phone</option><option>WhatsApp</option><option>Email</option></Select></Field></div></Section>
          </> : <>
            <Section title="B — Delivery Area"><div className="grid md:grid-cols-2 gap-4"><Field label="Preferred Delivery City" required><Input required value={form.preferredDeliveryCity} onChange={(e:any)=>set("preferredDeliveryCity",e.target.value)}/></Field><Field label="Preferred Areas / Localities"><Input value={form.preferredAreas} onChange={(e:any)=>set("preferredAreas",e.target.value)}/></Field><Field label="PIN codes served"><Input value={form.servicePincodes} onChange={(e:any)=>set("servicePincodes",e.target.value)}/></Field><Field label="Availability"><Select value={form.availability} onChange={(e:any)=>set("availability",e.target.value)}>{["Full Time","Part Time","Flexible"].map(x=><option key={x}>{x}</option>)}</Select></Field><Field label="Preferred working hours" className="md:col-span-2"><Input value={form.preferredWorkingHours} onChange={(e:any)=>set("preferredWorkingHours",e.target.value)} placeholder="e.g. 9 AM – 6 PM"/></Field></div></Section>
            <Section title="C — Vehicle"><div className="grid md:grid-cols-2 gap-4"><Field label="Vehicle Type"><Select value={form.vehicleType} onChange={(e:any)=>set("vehicleType",e.target.value)}>{["Bike","Scooter","Cycle","EV","Other"].map(x=><option key={x}>{x}</option>)}</Select></Field><Field label="Vehicle Registration Number"><Input value={form.vehicleRegistrationNumber} onChange={(e:any)=>set("vehicleRegistrationNumber",e.target.value)}/></Field><Field label="Driving Licence Number"><Input value={form.drivingLicenceNumber} onChange={(e:any)=>set("drivingLicenceNumber",e.target.value)}/></Field><Field label="Vehicle ownership"><Select value={form.vehicleOwnership} onChange={(e:any)=>set("vehicleOwnership",e.target.value)}>{["Own","Family","Rented","Other"].map(x=><option key={x}>{x}</option>)}</Select></Field></div></Section>
          </>}

          <Section title={isStore ? "G — Documents" : "D — Documents"}><div className="space-y-3">{(form.documents || []).map((doc: any, i: number) => <div key={doc.documentType} className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4"><div className="flex-1"><b>{doc.label}</b><p className="text-xs text-slate-500 mt-1">{(applicationDocumentDefinitions[type] as any[])[i]?.[2]}</p>{doc.fileName && <p className="text-xs text-emerald-700 mt-2 font-semibold">{doc.fileName}</p>}</div><div className="flex flex-wrap items-center gap-2"><label className="border rounded-xl px-3 py-2 text-sm font-bold cursor-pointer"><Upload size={15} className="inline mr-1"/>Upload<input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" className="hidden" onChange={(e:any)=>uploadDocument(i,e.target.files?.[0])}/></label><ImagePickerButtons compact onFile={(file)=>uploadDocument(i,file)}/>{doc.fileName && <button type="button" onClick={()=>removeDocument(i)} className="border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm font-bold">Remove</button>}</div></div>)}</div><p className="text-xs text-slate-500 mt-4">Document fields are shown as optional/as applicable unless FreshBasket business rules later require a specific document. Files are accessible only through authorized admin application views.</p></Section>

          {!isStore && <><Section title="E — Emergency Contact"><div className="grid md:grid-cols-3 gap-4"><Field label="Emergency Contact Name"><Input value={form.emergencyContactName} onChange={(e:any)=>set("emergencyContactName",e.target.value)}/></Field><Field label="Relationship"><Input value={form.emergencyContactRelationship} onChange={(e:any)=>set("emergencyContactRelationship",e.target.value)}/></Field><Field label="Emergency Contact Number"><Input value={form.emergencyContactNumber} onChange={(e:any)=>set("emergencyContactNumber",e.target.value)}/></Field></div></Section><Section title="F — Experience"><div className="grid md:grid-cols-3 gap-4"><Field label="Previous Delivery Experience"><Select value={form.previousDeliveryExperience} onChange={(e:any)=>set("previousDeliveryExperience",e.target.value)}><option>No</option><option>Yes</option></Select></Field>{form.previousDeliveryExperience === "Yes" && <><Field label="Company / Platform"><Input value={form.previousDeliveryCompany} onChange={(e:any)=>set("previousDeliveryCompany",e.target.value)}/></Field><Field label="Experience duration"><Input value={form.previousDeliveryDuration} onChange={(e:any)=>set("previousDeliveryDuration",e.target.value)}/></Field></>}</div></Section></>}

          <Section title={isStore ? "H — Declaration" : "G — Declaration"}><div className="space-y-3"><label className="flex gap-3 items-start text-sm font-semibold"><input type="checkbox" checked={form.declarationAccurate} onChange={(e:any)=>set("declarationAccurate",e.target.checked)} className="mt-1"/> <span>I confirm that the information provided is accurate.</span></label><label className="flex gap-3 items-start text-sm font-semibold"><input type="checkbox" checked={form.declarationContact} onChange={(e:any)=>set("declarationContact",e.target.checked)} className="mt-1"/> <span>I agree that FreshBasket may contact me regarding onboarding.</span></label></div></Section>
          <div className="bg-white border rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div><p className="font-bold">Ready to submit?</p><p className="text-xs text-slate-500 mt-1">No customer account and no OTP are required.</p></div><div className="flex flex-col sm:flex-row gap-3"><button type="button" onClick={()=>nav("/")} className="border rounded-xl px-5 py-3 font-bold">Cancel</button><button type="submit" disabled={submitting} className="bg-emerald-600 text-white rounded-xl px-6 py-3 font-bold disabled:opacity-50">{submitting ? "Submitting Application..." : isStore ? "Submit Store Application" : "Submit Delivery Partner Application"}</button></div></div>
        </form>
      </main>
    </div>
  );
}

function ApplicationStatusPage() {
  const [id, setId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const search = async (e?: React.FormEvent) => { e?.preventDefault(); setError(""); setData(null); if (!id.trim()) return setError("Enter your Application ID."); setLoading(true); try { const r=await axios.get(API+"/public/applications/"+encodeURIComponent(id.trim().toUpperCase())+"/status"); setData(r.data.data); } catch(e:any){ setError(e?.response?.data?.message||"Application not found."); } finally { setLoading(false); } };
  return <div className="min-h-screen bg-slate-50"><header className="bg-slate-950 text-white"><div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center"><Link to="/login" className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-emerald-500 grid place-items-center"><Leaf size={21}/></span><b className="text-lg">FreshBasket</b></Link><Link to="/" className="text-sm font-bold text-emerald-300">Back to FreshBasket</Link></div></header><main className="max-w-3xl mx-auto px-4 py-10"><div className="bg-white border rounded-[2rem] p-6 md:p-8 shadow-sm"><p className="text-emerald-700 text-xs font-black uppercase tracking-[.18em]">Application Tracking</p><h1 className="text-3xl font-black mt-2">Check application status</h1><p className="text-slate-500 mt-2">Enter the Application ID shown after your public Store or Delivery Partner submission.</p><form onSubmit={search} className="flex flex-col sm:flex-row gap-3 mt-6"><input value={id} onChange={(e:any)=>setId(e.target.value)} placeholder="FB-STORE-APP-... or FB-DEL-APP-..." className="flex-1 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-100"/><button disabled={loading} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">{loading?"Checking...":"Check Status"}</button></form>{error&&<div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">{error}</div>}{data&&<div className="mt-6 space-y-4"><div className="bg-slate-50 border rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><p className="text-xs text-slate-500">Application ID</p><b className="text-xl">{data.applicationId}</b><p className="text-sm text-slate-500 mt-1">{data.applicationType === "STORE" ? "Store / Seller" : "Delivery Partner"} · {data.applicantName}{data.storeName?` · ${data.storeName}`:""}</p></div><span className={`px-3 py-1.5 rounded-full border text-sm font-bold w-fit ${applicationStatusClass(data.status)}`}>{applicationStatusLabel(data.status)}</span></div>{data.publicMessage&&<div className="bg-violet-50 border border-violet-100 text-violet-800 rounded-2xl p-4"><b>Message from FreshBasket</b><p className="text-sm mt-1">{data.publicMessage}</p></div>}<div className="bg-white border rounded-2xl p-5"><h2 className="font-bold">Timeline</h2><div className="mt-4 space-y-3">{(data.statusHistory||[]).map((h:any,i:number)=><div key={i} className="flex gap-3 items-start"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"/><div><b className="text-sm">{applicationStatusLabel(h.status)}</b><p className="text-xs text-slate-500 mt-0.5">{h.at?new Date(h.at).toLocaleString("en-IN"):""}</p></div></div>)}</div></div></div>}</div></main></div>;
}

function AdminApplications({ type }: { type: "STORE" | "DELIVERY" }) {
  const [rows,setRows]=useState<any[]>([]); const [status,setStatus]=useState(""); const [search,setSearch]=useState(""); const [loading,setLoading]=useState(true); const [selected,setSelected]=useState<any>(null); const [admins,setAdmins]=useState<any[]>([]); const [partners,setPartners]=useState<any[]>([]); const [assignedAdminId,setAssignedAdminId]=useState(""); const [onboardingTargetId,setOnboardingTargetId]=useState(""); const [reviewStatus,setReviewStatus]=useState(""); const [reason,setReason]=useState(""); const [adminNotes,setAdminNotes]=useState(""); const [actionLoading,setActionLoading]=useState(false); const [viewer,setViewer]=useState<any>(null);
  const load=async()=>{setLoading(true);try{const r=await axios.get(API+"/admin/applications",{headers:adminHeaders(),params:{type,status,search}});setRows(r.data.data||[]);}catch(e:any){alert(e?.response?.data?.message||"Unable to load applications");}finally{setLoading(false);}};
  useEffect(()=>{load()},[type,status]);
  useEffect(()=>{const t=window.setTimeout(load,250);return()=>window.clearTimeout(t)},[search,type,status]);
  useEffect(()=>{Promise.all([axios.get(API+"/admin/applications-admins",{headers:adminHeaders()}),axios.get(API+"/admin/applications-delivery-partners",{headers:adminHeaders()})]).then(([a,p])=>{setAdmins(a.data.data||[]);setPartners(p.data.data||[])}).catch(()=>{});},[]);
  const open=async(id:string)=>{try{const r=await axios.get(API+"/admin/applications/"+id,{headers:adminHeaders()});const d=r.data.data;setSelected(d);setAssignedAdminId(String(d.assignedAdminId?._id||d.assignedAdminId||""));setOnboardingTargetId(String((type==="STORE"?d.createdStoreId:d.createdDeliveryPartnerId)?._id||(type==="STORE"?d.createdStoreId:d.createdDeliveryPartnerId)||""));setAdminNotes(d.adminNotes||"");}catch(e:any){alert(e?.response?.data?.message||"Unable to load application");}};
  const assign=async()=>{if(!selected||!assignedAdminId)return;setActionLoading(true);try{await axios.patch(API+"/admin/applications/"+selected._id+"/assign",{assignedAdminId},{headers:adminHeaders()});await open(selected.applicationId);await load();}catch(e:any){alert(e?.response?.data?.message||"Unable to assign application");}finally{setActionLoading(false);}};
  const review=async(statusValue:string)=>{if(!selected)return;if(["REJECTED","ON_HOLD","NEED_MORE_INFORMATION"].includes(statusValue)&&reason.trim().length<3)return alert("Reason/message is required.");setActionLoading(true);try{await axios.patch(API+"/admin/applications/"+selected._id+"/review",{status:statusValue,reason:reason.trim(),adminNotes:adminNotes.trim(),...(type==="STORE"?{storeAdminId:onboardingTargetId||""}:{deliveryPartnerId:onboardingTargetId||""})},{headers:adminHeaders()});setReason("");setReviewStatus("");await open(selected.applicationId);await load();}catch(e:any){alert(e?.response?.data?.message||"Unable to update application");}finally{setActionLoading(false);}};
  const saveNotes=async()=>{if(!selected)return;setActionLoading(true);try{await axios.patch(API+"/admin/applications/"+selected._id+"/notes",{adminNotes},{headers:adminHeaders()});await open(selected.applicationId);}catch(e:any){alert(e?.response?.data?.message||"Unable to save notes");}finally{setActionLoading(false);}};
  const call=(phone:string)=>{if(phone)window.location.href="tel:"+phone}; const email=(value:string)=>{if(value)window.location.href="mailto:"+value}; const whatsapp=(phone:string)=>{const p=String(phone||"").replace(/\D/g,"");const wa=p.length===10?"91"+p:p;if(wa)window.open("https://wa.me/"+wa,"_blank","noopener,noreferrer")};
  const isStore=type==="STORE";
  return <div className="space-y-5"><div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"><div><p className="text-emerald-600 text-xs font-black uppercase tracking-[.18em]">APPLICATIONS</p><h2 className="text-2xl md:text-3xl font-black">{isStore?"Store Applications":"Delivery Partner Applications"}</h2><p className="text-sm text-slate-500 mt-1">Review, contact, assign and track public onboarding applications.</p></div><button onClick={load} className="border rounded-xl px-4 py-2.5 font-bold w-fit">Refresh</button></div><div className="bg-white border rounded-3xl p-4"><div className="grid lg:grid-cols-[1fr_220px] gap-3"><input value={search} onChange={(e:any)=>setSearch(e.target.value)} placeholder="Search Application ID, name, store, phone, email, city..." className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-100"/><select value={status} onChange={(e:any)=>setStatus(e.target.value)} className="border rounded-xl px-3 py-3 bg-white"><option value="">All statuses</option>{[["SUBMITTED","Submitted"],["UNDER_REVIEW","Under Review"],["NEED_MORE_INFORMATION","Need More Information"],["APPROVED","Approved"],["REJECTED","Rejected"],["ON_HOLD","On Hold"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></div>{loading?<div className="bg-white border rounded-3xl p-12 text-center text-slate-500">Loading applications...</div>:<div className="bg-white border rounded-3xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[1050px]"><thead className="bg-slate-50"><tr>{(isStore?["Application ID","Applicant","Store / Category","City","Phone","Status","Submitted","Assigned","Action"]:["Application ID","Applicant","Phone / Email","City","Vehicle","Status","Submitted","Assigned","Action"]).map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r._id} className="border-t hover:bg-slate-50"><td className="p-3 font-bold">{r.applicationId}</td><td className="p-3"><b>{r.applicantName}</b><div className="text-xs text-slate-500">{r.email||"—"}</div></td>{isStore?<><td className="p-3">{r.storeName||"—"}<div className="text-xs text-slate-500">{r.storeCategory||"—"}</div></td><td className="p-3">{r.city||"—"}</td><td className="p-3">{r.phone||"—"}</td></>:<><td className="p-3">{r.phone||"—"}<div className="text-xs text-slate-500">{r.email||"—"}</div></td><td className="p-3">{r.city||"—"}</td><td className="p-3">{r.vehicleType||"—"}</td></>}<td className="p-3"><span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${applicationStatusClass(r.status)}`}>{applicationStatusLabel(r.status)}</span></td><td className="p-3">{r.createdAt?new Date(r.createdAt).toLocaleDateString("en-IN"):"—"}</td><td className="p-3">{r.assignedAdmin?.name||"Unassigned"}</td><td className="p-3"><button onClick={()=>open(r.applicationId)} className="text-emerald-700 font-bold inline-flex items-center gap-1"><Eye size={15}/>View</button></td></tr>)}</tbody></table></div>{!rows.length&&<div className="p-10 text-center text-slate-500">No applications found.</div>}</div>}

    {selected&&<div className="fixed inset-0 z-[150] bg-black/50 p-3 md:p-6 overflow-y-auto" onClick={()=>setSelected(null)}><div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl my-3 md:my-8" onClick={e=>e.stopPropagation()}><div className="p-5 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><p className="text-xs font-black text-emerald-700">{selected.applicationId}</p><h3 className="text-2xl font-black mt-1">{selected.applicantName}</h3><p className="text-sm text-slate-500 mt-1">{isStore?`${selected.storeName||"Store"} · ${selected.storeCategory||""}`:"Delivery Partner"} · {selected.city}</p></div><div className="flex items-center gap-2"><span className={`px-3 py-1.5 rounded-full border text-sm font-bold ${applicationStatusClass(selected.status)}`}>{applicationStatusLabel(selected.status)}</span><button type="button" onClick={()=>setSelected(null)} className="border rounded-xl p-2"><X size={18}/></button></div></div><div className="p-5 md:p-7 space-y-5"><div className="grid lg:grid-cols-[1fr_300px] gap-5"><div className="space-y-5"><div className="border rounded-2xl p-5"><h4 className="font-bold">{isStore?"Applicant Details":"Personal Details"}</h4><div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">{[["Full Name",selected.applicantName],["Mobile",selected.phone],["Email",selected.email||"—"],["Alternate Phone",selected.alternatePhone||"—"],["Date of Birth",selected.dateOfBirth||"—"],["City",selected.city],["State",selected.state],["Pincode",selected.pincode],["Current Address",selected.currentAddress||"—"]].map(([l,v])=><div key={String(l)}><span className="text-xs text-slate-500">{l}</span><p className="font-semibold mt-0.5 break-words">{String(v||"—")}</p></div>)}</div></div>{isStore?<><div className="border rounded-2xl p-5"><h4 className="font-bold">Store Details</h4><div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">{[["Store Name",selected.storeName],["Category",selected.storeCategory],["Other Category",selected.otherStoreCategory||"—"],["Store Type",selected.storeType||"—"],["Description",selected.storeDescription||"—"],["Address",selected.storeAddress||"—"],["Landmark",selected.landmark||"—"],["Location",selected.latitude!=null&&selected.longitude!=null?`${selected.latitude}, ${selected.longitude}`:"Not provided"],["Business Name",selected.businessName||"—"],["GSTIN",selected.gstin||"—"],["PAN",selected.pan||"—"],["Business Type",selected.businessType||"—"],["Years in Business",selected.yearsInBusiness||"—"],["Employees",selected.employeeCount||"—"],["Contact Person",selected.contactPersonName||"—"],["Contact Number",selected.contactNumber||"—"],["Contact Email",selected.contactEmail||"—"],["Preferred Contact",selected.preferredContactMethod||"—"]].map(([l,v])=><div key={String(l)} className={String(l)==="Description"||String(l)==="Address"?"sm:col-span-2":""}><span className="text-xs text-slate-500">{l}</span><p className="font-semibold mt-0.5 break-words">{String(v||"—")}</p></div>)}</div>{(selected.storeImage||selected.storeImageUrl)&&<img src={selected.storeImage||selected.storeImageUrl} alt="Store" className="mt-4 w-40 h-32 object-cover rounded-xl border"/>}</div></>:<><div className="border rounded-2xl p-5"><h4 className="font-bold">Delivery Area & Vehicle</h4><div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">{[["Preferred City",selected.preferredDeliveryCity],["Areas",selected.preferredAreas||"—"],["PIN codes",selected.servicePincodes||"—"],["Availability",selected.availability||"—"],["Working Hours",selected.preferredWorkingHours||"—"],["Vehicle",selected.vehicleType||"—"],["Registration",selected.vehicleRegistrationNumber||"—"],["Driving Licence",selected.drivingLicenceNumber||"—"],["Ownership",selected.vehicleOwnership||"—"],["Emergency Contact",selected.emergencyContactName||"—"],["Relationship",selected.emergencyContactRelationship||"—"],["Emergency Number",selected.emergencyContactNumber||"—"],["Previous Experience",selected.previousDeliveryExperience||"No"],["Company / Platform",selected.previousDeliveryCompany||"—"],["Experience Duration",selected.previousDeliveryDuration||"—"]].map(([l,v])=><div key={String(l)}><span className="text-xs text-slate-500">{l}</span><p className="font-semibold mt-0.5 break-words">{String(v||"—")}</p></div>)}</div></div></>}

<div className="border rounded-2xl p-5"><h4 className="font-bold">Documents</h4><div className="mt-4 grid md:grid-cols-2 gap-3">{(selected.documents||[]).map((d:any,i:number)=><div key={d._id||i} className="border rounded-xl p-3"><div className="flex items-start justify-between gap-2"><div><b className="text-sm">{d.label||d.documentType}</b><p className="text-xs text-slate-500 mt-1">{d.fileName||"Not uploaded"}</p></div>{d.data&&<a href={d.data} download={d.fileName||d.documentType} className="text-xs font-bold text-emerald-700">Download</a>}</div>{d.data&&d.mimeType.startsWith("image/")?<img src={d.data} alt={d.fileName||d.label} className="mt-3 w-full max-h-52 object-contain rounded-lg bg-slate-50 border"/>:d.data&&d.mimeType==="application/pdf"?<button type="button" onClick={()=>setViewer(d)} className="mt-3 text-sm font-bold text-emerald-700 border rounded-lg px-3 py-2">View PDF</button>:<p className="text-xs text-slate-400 mt-3">No file uploaded.</p>}</div>)}</div></div><div className="border rounded-2xl p-5"><h4 className="font-bold">Review History</h4><div className="mt-4 space-y-3">{(selected.statusHistory||[]).map((h:any,i:number)=><div key={i} className="flex gap-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5"/><div><b className="text-sm">{applicationStatusLabel(h.status)}</b><p className="text-xs text-slate-500">{h.by?.name || h.by?.employeeId || h.actorRole || "public"} · {h.actorRole||"public"} · {h.at?new Date(h.at).toLocaleString("en-IN"):""}</p>{h.note&&<p className="text-sm text-slate-600 mt-1">{h.note}</p>}</div></div>)}</div></div><div className="border rounded-2xl p-5"><h4 className="font-bold">Audit Trail</h4><p className="text-xs text-slate-500 mt-1">Administrative actions are recorded against this application.</p><div className="mt-4 space-y-3">{(selected.auditHistory||[]).map((a:any)=><div key={String(a._id)} className="border rounded-xl p-3"><div className="flex flex-wrap items-start justify-between gap-2"><b className="text-sm">{String(a.action||"").replace(/_/g," ")}</b><span className="text-xs text-slate-500">{a.timestamp?new Date(a.timestamp).toLocaleString("en-IN"):"—"}</span></div><p className="text-xs text-slate-500 mt-1">{a.actor?.name || a.actor?.employeeId || "System"} · {a.actorRole || "—"}{a.actorEmployeeId?` · ${a.actorEmployeeId}`:""}</p>{a.metadata&&Object.keys(a.metadata).length>0&&<p className="text-xs text-slate-400 mt-1 break-words">{Object.entries(a.metadata).filter(([k])=>k!=="applicationId").map(([k,v])=>`${k}: ${String(v)}`).join(" · ")}</p>}</div>)}{!(selected.auditHistory||[]).length&&<p className="text-sm text-slate-400">No administrative audit events yet.</p>}</div></div></div>
<div className="space-y-5"><div className="border rounded-2xl p-5"><h4 className="font-bold">Contact Applicant</h4><div className="grid grid-cols-3 gap-2 mt-4"><button onClick={()=>call(selected.phone)} className="border rounded-xl p-2.5 font-bold text-sm"><Phone size={15} className="mx-auto"/>Call</button><button onClick={()=>whatsapp(selected.phone)} className="border rounded-xl p-2.5 font-bold text-sm"><MessageCircle size={15} className="mx-auto"/>WhatsApp</button><button onClick={()=>email(selected.email)} className="border rounded-xl p-2.5 font-bold text-sm"><Mail size={15} className="mx-auto"/>Email</button></div></div><div className="border rounded-2xl p-5"><h4 className="font-bold">Assignment</h4><label className="block text-sm font-semibold mt-3">Assigned To (Admin)<select value={assignedAdminId} onChange={(e:any)=>setAssignedAdminId(e.target.value)} className="mt-2 w-full border rounded-xl p-3 bg-white"><option value="">Unassigned</option>{admins.map((x:any)=><option key={x._id} value={x._id}>{x.name} · {x.employeeId||x.email}</option>)}</select></label><button disabled={actionLoading||!assignedAdminId} onClick={assign} className="mt-3 w-full border rounded-xl px-4 py-2.5 font-bold">Save Admin Assignment</button><label className="block text-sm font-semibold mt-5">{isStore?"Store Admin used on approval":"Delivery Partner used on approval"}<select value={onboardingTargetId} onChange={(e:any)=>setOnboardingTargetId(e.target.value)} className="mt-2 w-full border rounded-xl p-3 bg-white"><option value="">Select existing account (optional)</option>{(isStore?admins:partners).map((x:any)=><option key={x._id} value={x._id}>{x.name} · {x.employeeId||x.email}</option>)}</select></label><p className="text-xs text-slate-500 mt-2">Approval maps to an existing authorized account when selected. No duplicate employee identity is created automatically.</p></div><div className="border rounded-2xl p-5"><h4 className="font-bold">Review Actions</h4><button disabled={actionLoading} onClick={()=>review("UNDER_REVIEW")} className="mt-3 w-full border rounded-xl px-4 py-2.5 font-bold">Start Review</button>{selected.status!=="APPROVED"&&<button disabled={actionLoading||!onboardingTargetId} onClick={()=>review("APPROVED")} className="mt-2 w-full bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold disabled:opacity-40">Approve {onboardingTargetId?"":"(select onboarding account)"}</button>}<button disabled={actionLoading} onClick={()=>setReviewStatus("NEED_MORE_INFORMATION")} className="mt-2 w-full border rounded-xl px-4 py-2.5 font-bold">Request More Information</button><button disabled={actionLoading} onClick={()=>setReviewStatus("ON_HOLD")} className="mt-2 w-full border rounded-xl px-4 py-2.5 font-bold">Put On Hold</button><button disabled={actionLoading} onClick={()=>setReviewStatus("REJECTED")} className="mt-2 w-full border border-red-200 text-red-700 rounded-xl px-4 py-2.5 font-bold">Reject</button></div><div className="border rounded-2xl p-5"><h4 className="font-bold">Internal Admin Notes</h4><textarea value={adminNotes} onChange={(e:any)=>setAdminNotes(e.target.value)} rows={6} className="mt-3 w-full border rounded-xl p-3" placeholder="Private notes. Applicants cannot see these."/><button disabled={actionLoading} onClick={saveNotes} className="mt-3 bg-slate-950 text-white rounded-xl px-4 py-2.5 font-bold">Save Notes</button></div></div></div></div></div></div>}
    {reviewStatus&&selected&&<div className="fixed inset-0 z-[170] bg-black/50 p-4 grid place-items-center" onClick={()=>setReviewStatus("")}><div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6" onClick={e=>e.stopPropagation()}><p className="text-emerald-700 text-xs font-black uppercase">Application Review</p><h3 className="text-xl font-black mt-1">{applicationStatusLabel(reviewStatus)}</h3><p className="text-sm text-slate-500 mt-2">{reviewStatus==="NEED_MORE_INFORMATION"?"This message will be visible to the applicant on the status page.":"Enter a reason for this action."}</p><textarea autoFocus value={reason} onChange={(e:any)=>setReason(e.target.value)} rows={5} className="mt-4 w-full border rounded-2xl p-3" placeholder="Enter reason / message..."/><div className="flex justify-end gap-3 mt-4"><button type="button" onClick={()=>setReviewStatus("")} className="border rounded-xl px-4 py-2.5 font-bold">Cancel</button><button type="button" disabled={actionLoading||reason.trim().length<3} onClick={()=>review(reviewStatus)} className="bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold disabled:opacity-40">Confirm</button></div></div></div>}
    {viewer&&<div className="fixed inset-0 z-[180] bg-black/60 p-4 grid place-items-center" onClick={()=>setViewer(null)}><div className="w-full max-w-5xl h-[85vh] bg-white rounded-3xl overflow-hidden" onClick={e=>e.stopPropagation()}><div className="p-3 border-b flex justify-between items-center"><b>{viewer.fileName||"PDF document"}</b><button onClick={()=>setViewer(null)}><X/></button></div><iframe title={viewer.fileName||"PDF document"} src={viewer.data} className="w-full h-[calc(85vh-56px)]"/></div></div>}</div>;
}

function AdminLoginNotices() {
  const empty={type:"GENERAL_NOTICE",title:"",shortDescription:"",description:"",image:"",imageUrl:"",ctaText:"",ctaLink:"",startAt:"",endAt:"",priority:"0",isActive:true};
  const [form,setForm]=useState<any>(empty); const [rows,setRows]=useState<any[]>([]); const [editing,setEditing]=useState<string|null>(null); const [loading,setLoading]=useState(false); const [previewOpen,setPreviewOpen]=useState(false);
  const load=async()=>{try{const r=await axios.get(API+"/admin/login-notices",{headers:adminHeaders()});setRows(r.data.data||[]);}catch(e:any){alert(e?.response?.data?.message||"Unable to load notices")}};
  useEffect(()=>{load()},[]);
  const imageFile=(file?:File)=>{if(!file)return;if(!file.type.startsWith("image/"))return alert("Only image files are allowed.");if(file.size>700*1024)return alert("Image must be 700 KB or smaller.");const r=new FileReader();r.onload=()=>setForm((x:any)=>({...x,image:String(r.result||"")}));r.readAsDataURL(file)};
  const save=async()=>{if(!form.title.trim())return alert("Notice title is required");setLoading(true);try{if(editing)await axios.patch(API+"/admin/login-notices/"+editing,form,{headers:adminHeaders()});else await axios.post(API+"/admin/login-notices",form,{headers:adminHeaders()});setForm(empty);setEditing(null);await load();}catch(e:any){alert(e?.response?.data?.message||"Unable to save notice")}finally{setLoading(false)}};
  const edit=(x:any)=>{ setEditing(String(x._id)); setForm({...empty,...x,startAt:x.startAt?new Date(x.startAt).toISOString().slice(0,16):"",endAt:x.endAt?new Date(x.endAt).toISOString().slice(0,16):""}); };
  const remove=async(id:string)=>{if(!window.confirm("Archive this notice?"))return;try{await axios.delete(API+"/admin/login-notices/"+id,{headers:adminHeaders()});load()}catch(e:any){alert(e?.response?.data?.message||"Unable to archive notice")}};
  return <div className="space-y-5"><div><p className="text-emerald-600 text-sm font-bold">CONTENT MANAGEMENT</p><h2 className="text-2xl font-bold">Login Page Notices</h2><p className="text-sm text-slate-500 mt-1">Schedule public notices without mixing them with internal employee notifications.</p></div><div className="bg-white border rounded-3xl p-6"><h3 className="font-bold text-lg">{editing?"Edit notice":"Create notice"}</h3><div className="grid md:grid-cols-2 gap-4 mt-5"><label className="text-sm font-semibold">Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="mt-2 w-full border rounded-xl p-3"><option>GENERAL_NOTICE</option><option>OFFER</option><option>STORE_ONBOARDING</option><option>DELIVERY_HIRING</option><option>ANNOUNCEMENT</option></select></label><label className="text-sm font-semibold">Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">Short description<input value={form.shortDescription} onChange={e=>setForm({...form,shortDescription:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">Priority<input type="number" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold md:col-span-2">Detailed description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-2 w-full border rounded-xl p-3 min-h-24"/></label><div><label className="text-sm font-semibold">Image upload<input type="file" accept="image/*" onChange={e=>imageFile(e.target.files?.[0])} className="mt-2 w-full text-sm"/></label><div className="mt-2"><ImagePickerButtons compact onFile={imageFile}/></div>{form.image&&<img src={form.image} className="mt-2 w-28 h-20 object-cover rounded-xl border"/>}</div><label className="text-sm font-semibold">Image URL<input value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">CTA text<input value={form.ctaText} onChange={e=>setForm({...form,ctaText:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">CTA link<input value={form.ctaLink} onChange={e=>setForm({...form,ctaLink:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">Start date/time<input type="datetime-local" value={form.startAt} onChange={e=>setForm({...form,startAt:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="text-sm font-semibold">End date/time<input type="datetime-local" value={form.endAt} onChange={e=>setForm({...form,endAt:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isActive!==false} onChange={e=>setForm({...form,isActive:e.target.checked})}/> Active</label></div><div className="flex flex-wrap gap-3 mt-5"><button onClick={save} disabled={loading} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">{loading?"Saving...":editing?"Update notice":"Create notice"}</button>{editing&&<button onClick={()=>{setForm(empty);setEditing(null)}} className="border rounded-xl px-5 py-3 font-bold">Cancel</button>}</div></div><div className="bg-white border rounded-3xl overflow-hidden"><div className="p-5 border-b flex justify-between"><h3 className="font-bold">Notice library</h3><button onClick={load} className="border rounded-xl px-3 py-2 text-sm font-bold">Refresh</button></div>{rows.map(x=><div key={x._id} className="p-5 border-b last:border-0 flex flex-col md:flex-row gap-4 md:items-center md:justify-between"><div className="flex gap-3">{(x.image||x.imageUrl)&&<img src={x.image||x.imageUrl} className="w-24 h-16 object-cover rounded-xl border"/>}<div><b>{x.title}</b><p className="text-xs text-slate-500 mt-1">{x.type} · {x.isActive?"Active":"Inactive"} · {x.startAt?new Date(x.startAt).toLocaleString("en-IN"):"Now"}{x.endAt?` → ${new Date(x.endAt).toLocaleString("en-IN")}`:""}</p><p className="text-sm text-slate-600 mt-1">{x.shortDescription||x.description}</p></div></div><div className="flex gap-2"><button onClick={()=>{setEditing(String(x._id));setForm({...empty,...x,startAt:x.startAt?new Date(x.startAt).toISOString().slice(0,16):"",endAt:x.endAt?new Date(x.endAt).toISOString().slice(0,16):""})}} className="border rounded-xl px-3 py-2 font-bold">Edit</button><button onClick={()=>remove(String(x._id))} className="border border-red-200 text-red-700 rounded-xl px-3 py-2 font-bold">Archive</button></div></div>)}{!rows.length&&<div className="p-10 text-center text-slate-500">No notices created yet.</div>}</div>{previewOpen&&<div className="fixed inset-0 z-[150] bg-black/50 p-4 grid place-items-center" onClick={()=>setPreviewOpen(false)}><div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}><div className="p-4 border-b flex justify-between items-center"><b>Login Page Preview</b><button onClick={()=>setPreviewOpen(false)}><X/></button></div><div className="p-5">{form.image||form.imageUrl?<img src={form.image||form.imageUrl} className="w-full h-44 object-cover rounded-2xl"/>:null}<p className="text-emerald-600 text-xs font-bold mt-4">{form.type}</p><h3 className="text-2xl font-black mt-1">{form.title||"Notice title"}</h3><p className="text-slate-600 mt-2">{form.shortDescription||form.description||"Notice description"}</p>{form.ctaText&&<button className="mt-4 bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold">{form.ctaText}</button>}</div></div></div>}</div>;
}

function AdminPublicContact() {
  const [form,setForm]=useState<any>({businessName:"FreshBasket",contactName:"",phone:"",whatsapp:"",email:"",address:"",workingHours:"",storeOnboardingContact:"",deliveryHiringContact:"",customerSupportContact:""}); const [loading,setLoading]=useState(true);
  const load=async()=>{try{const r=await axios.get(API+"/admin/public-contact",{headers:adminHeaders()});setForm({...form,...(r.data.data||{})})}catch(e:any){alert(e?.response?.data?.message||"Unable to load public contact")}finally{setLoading(false)}}; useEffect(()=>{load()},[]);
  const save=async()=>{try{await axios.put(API+"/admin/public-contact",form,{headers:adminHeaders()});alert("Public contact settings saved") }catch(e:any){alert(e?.response?.data?.message||"Unable to save public contact")}};
  return <div className="space-y-5"><div><p className="text-emerald-600 text-sm font-bold">CONTENT MANAGEMENT</p><h2 className="text-2xl font-bold">Public Contact Settings</h2><p className="text-sm text-slate-500 mt-1">These are the only contact details exposed on public onboarding/login surfaces.</p></div><div className="bg-white border rounded-3xl p-6"><div className="grid md:grid-cols-2 gap-4">{[["businessName","Business / Support Contact Name"],["contactName","Contact person"],["phone","Support phone"],["whatsapp","WhatsApp"],["email","Support email"],["address","Business address"],["workingHours","Working hours"],["storeOnboardingContact","Store onboarding contact"],["deliveryHiringContact","Delivery hiring contact"],["customerSupportContact","Customer support contact"]].map(([key,label])=><label key={key} className="text-sm font-semibold">{label}<input value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>)}</div><button disabled={loading} onClick={save} className="mt-5 bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">Save public contact</button></div></div>;
}


function AdminCodRiskControl() {
  const [stores,setStores] = useState<any[]>([]);
  const [storeAdminId,setStoreAdminId] = useState("");
  const [form,setForm] = useState<any>({enabled:true,cancelledOrdersThreshold:3,failedDeliveriesThreshold:2,returnRateThreshold:60,prepaidCancelThreshold:1,prepaidReturnRateThreshold:30});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");

  const loadStores = async () => {
    try {
      const r = await axios.get(API+"/admin/stores",{headers:adminHeaders()});
      const list = Array.isArray(r.data?.data) ? r.data.data : [];
      setStores(list);
      if (!storeAdminId && list.length) setStoreAdminId(String(list[0].id||""));
    } catch(e:any) { setStores([]); }
  };
  const load = async (id?:string) => {
    const owner = String((id ?? storeAdminId) || "").trim();
    if (!owner) return;
    setLoading(true); setMessage("");
    try {
      const r = await axios.get(API+"/admin/cod-risk-config",{params:{storeAdminId:owner},headers:adminHeaders()});
      const d = r.data?.data || {};
      setForm({
        enabled:d.enabled !== false,
        cancelledOrdersThreshold:Number(d.cancelledOrdersThreshold||3),
        failedDeliveriesThreshold:Number(d.failedDeliveriesThreshold||2),
        returnRateThreshold:Number(d.returnRateThreshold||60),
        prepaidCancelThreshold:Number(d.prepaidCancelThreshold||1),
        prepaidReturnRateThreshold:Number(d.prepaidReturnRateThreshold||30),
      });
    } catch(e:any) { setMessage(e?.response?.data?.message||"Unable to load COD risk configuration"); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ void loadStores(); },[]);
  useEffect(()=>{ if(storeAdminId) void load(storeAdminId); },[storeAdminId]);

  const save = async () => {
    if(!storeAdminId) return alert("Select a store first.");
    setSaving(true); setMessage("");
    try {
      await axios.patch(API+"/admin/cod-risk-config",{...form,storeAdminId,reason:"COD risk rules updated by Main Admin"},{headers:adminHeaders()});
      setMessage("COD risk rules saved and recorded in Configuration History.");
      await load(storeAdminId);
    } catch(e:any) { setMessage(e?.response?.data?.message||"Unable to save COD risk configuration"); }
    finally { setSaving(false); }
  };

  const fields = [
    ["cancelledOrdersThreshold","COD cancellations before restriction","Number of cancelled COD orders that moves the customer to COD Restricted."],
    ["failedDeliveriesThreshold","Failed COD deliveries before restriction","Cancelled COD orders that had already been assigned to a delivery partner."],
    ["returnRateThreshold","COD return/refund rate before restriction (%)","Percentage of delivered COD orders with a completed refund."],
    ["prepaidCancelThreshold","COD cancellations for prepaid recommendation","Recommendation threshold only; it does not block COD by itself."],
    ["prepaidReturnRateThreshold","COD return/refund rate for prepaid recommendation (%)","Recommendation threshold only; it does not block COD by itself."],
  ];
  return <div className="space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div><p className="text-emerald-600 text-xs font-black uppercase tracking-[.18em]">RISK CONTROL</p><h2 className="text-2xl md:text-3xl font-black">COD Risk Control</h2><p className="text-sm text-slate-500 mt-1">Configurable, store-scoped COD eligibility using actual customer order and refund history.</p></div>
      <div className="flex items-center gap-3"><label className="text-sm font-semibold">Store<select value={storeAdminId} onChange={e=>setStoreAdminId(e.target.value)} className="ml-2 border rounded-xl px-3 py-2 bg-white">{stores.map(s=><option key={String(s.id)} value={String(s.id)}>{s.name}{s.isMainStore?" (Main Store)":""}</option>)}</select></label><button onClick={()=>void load()} disabled={loading} className="border rounded-xl px-4 py-2.5 font-bold">{loading?"Refreshing...":"Refresh"}</button></div>
    </div>
    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5"><div className="flex gap-3"><AlertTriangle className="text-amber-600 shrink-0" size={21}/><div><b>How the control works</b><p className="text-sm text-amber-900 mt-1">COD Restricted is triggered only by configured thresholds and real COD history. Prepaid Recommended is advisory and does not block checkout. No external or invented customer score is used.</p></div></div></div>
    <div className="bg-white border rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4"><div><h3 className="font-bold text-lg">Rules</h3><p className="text-xs text-slate-500">Changes are written to the existing Configuration History audit log.</p></div><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.enabled!==false} onChange={e=>setForm({...form,enabled:e.target.checked})}/> Enable COD risk control</label></div>
      <div className="grid md:grid-cols-2 gap-4 mt-5">{fields.map(([key,label,help])=><label key={key} className="text-sm font-semibold">{label}<input type="number" min="1" max="100" step="1" value={form[key]} onChange={e=>setForm({...form,[key]:Number(e.target.value)})} className="mt-2 w-full border rounded-xl p-3"/><span className="block text-xs text-slate-500 mt-1 font-normal">{help}</span></label>)}</div>
      <div className="mt-5 grid sm:grid-cols-3 gap-3"><div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4"><b className="text-emerald-700">COD Eligible</b><p className="text-xs text-slate-600 mt-1">History remains below restriction thresholds.</p></div><div className="rounded-2xl bg-red-50 border border-red-100 p-4"><b className="text-red-700">COD Restricted</b><p className="text-xs text-slate-600 mt-1">A restriction threshold is reached. Backend blocks COD.</p></div><div className="rounded-2xl bg-blue-50 border border-blue-100 p-4"><b className="text-blue-700">Prepaid Recommended</b><p className="text-xs text-slate-600 mt-1">Advisory recommendation; COD remains available.</p></div></div>
      {message&&<p className="mt-4 text-sm font-semibold text-emerald-700">{message}</p>}
      <button onClick={save} disabled={saving||loading} className="mt-5 bg-emerald-600 disabled:opacity-50 text-white rounded-xl px-5 py-3 font-bold">{saving?"Saving...":"Save COD risk rules"}</button>
    </div>
    <div className="bg-white border rounded-3xl p-6"><h3 className="font-bold text-lg">Decision data</h3><p className="text-sm text-slate-500 mt-1">The customer decision is calculated at checkout from persisted FreshBasket records: COD cancellations, assigned-order cancellations treated as failed delivery signals, delivered COD orders, and completed COD refunds.</p></div>
  </div>;
}

function AdminConfigurationHistory() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + "/admin/configuration-history", { headers: adminHeaders() });
      setRows(Array.isArray(r.data?.data) ? r.data.data : []);
    } catch (e:any) {
      alert(e?.response?.data?.message || "Unable to load configuration history");
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const labelFor = (row:any) => {
    const id = String(row?.targetId || "");
    if (id.startsWith("finance-settings")) return "Finance Settings";
    if (id.startsWith("payment-settings")) return "Payment Settings";
    if (id === "assignment-mode") return "Assignment Mode";
    if (id === "delivery-payout") return "Delivery Payout";
    if (id === "delivery-sla") return "Delivery SLA";
    if (id === "support-sla") return "Support SLA";
    if (id.startsWith("store-location:")) return "Store Configuration";
    if (id === "public-contact") return "Public Contact";
    return String(row?.action || "Configuration Change").replace(/_/g, " ");
  };
  const groups = Array.from(new Set(rows.map(labelFor)));
  const visible = filter === "ALL" ? rows : rows.filter(r => labelFor(r) === filter);
  const format = (v:any) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "object") return JSON.stringify(v, null, 2);
    return String(v);
  };
  return <div className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div><p className="text-emerald-600 text-xs font-black uppercase tracking-[.18em]">ADMINISTRATION</p><h2 className="text-2xl md:text-3xl font-black">Configuration History</h2><p className="text-sm text-slate-500 mt-1">Auditable history of important administrative configuration changes. Secrets are never recorded.</p></div>
      <button type="button" onClick={()=>void load()} disabled={loading} className="border rounded-xl px-4 py-2.5 font-bold disabled:opacity-50">{loading?"Refreshing...":"Refresh"}</button>
    </div>
    <div className="bg-white border rounded-3xl p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Recorded configuration changes</p><b className="text-3xl">{rows.length}</b></div><select value={filter} onChange={e=>setFilter(e.target.value)} className="border rounded-xl px-3 py-2.5 font-semibold bg-white"><option value="ALL">All configuration types</option>{groups.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
    </div>
    {loading ? <div className="bg-white border rounded-3xl p-12 text-center text-slate-500">Loading configuration history...</div> : visible.length ? <div className="space-y-4">{visible.map((row:any)=><div key={String(row._id)} className="bg-white border rounded-3xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">{labelFor(row)}</span><h3 className="font-bold mt-2">{String(row.action||"Configuration Change").replace(/_/g," ")}</h3><p className="text-xs text-slate-500 mt-1">{row.actor?.name||"Unknown user"}{row.actorRole?` · ${row.actorRole}`:""}{row.actorEmployeeId?` · Employee ${row.actorEmployeeId}`:""}</p></div><div className="text-xs text-slate-500 lg:text-right"><div>{row.timestamp?new Date(row.timestamp).toLocaleString("en-IN"):"—"}</div>{row.reason&&<div className="mt-1"><b className="text-slate-700">Reason:</b> {row.reason}</div>}</div></div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4"><div className="border rounded-2xl overflow-hidden"><div className="px-4 py-3 border-b bg-slate-50 font-bold text-sm">Old value</div><pre className="p-4 text-xs whitespace-pre-wrap break-words max-h-72 overflow-auto">{format(row.before)}</pre></div><div className="border rounded-2xl overflow-hidden"><div className="px-4 py-3 border-b bg-slate-50 font-bold text-sm">New value</div><pre className="p-4 text-xs whitespace-pre-wrap break-words max-h-72 overflow-auto">{format(row.after)}</pre></div></div>
    </div>)}</div> : <div className="bg-white border rounded-3xl p-12 text-center text-slate-500">No configuration changes have been recorded yet.</div>}
  </div>;
}

function AdminActionRequired({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [data, setData] = useState<any>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const r = await axios.get(API + "/admin/action-required", { headers: adminHeaders() });
      setData(r.data?.data || { total: 0, items: [] });
    } catch (e: any) {
      if (!silent) alert(e?.response?.data?.message || "Unable to load action-required items");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(true); }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const iconFor = (key: string) => {
    if (key.includes("payment")) return CircleDollarSign;
    if (key.includes("order") || key.includes("assignment")) return Package;
    if (key.includes("refund")) return RefreshCw;
    if (key.includes("application")) return Store;
    if (key.includes("sla")) return Clock3;
    if (key.includes("location")) return MapPin;
    return AlertTriangle;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-emerald-600 text-xs font-black uppercase tracking-[.18em]">MAIN ADMIN</p>
          <h2 className="text-2xl md:text-3xl font-black">Action Required</h2>
          <p className="text-sm text-slate-500 mt-1">Live operational items that need Main Admin attention.</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={loading || refreshing} className="border rounded-xl px-4 py-2.5 font-bold disabled:opacity-50">
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="bg-white border rounded-3xl p-12 text-center text-slate-500">Loading action-required items...</div>
      ) : (
        <>
          <div className="bg-white border rounded-3xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total actionable items</p>
              <b className="text-3xl">{Number(data.total || 0)}</b>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center"><AlertTriangle size={23} /></div>
          </div>

          {Array.isArray(data.items) && data.items.length ? (
            <div className="grid md:grid-cols-2 gap-4">
              {data.items.map((item: any) => {
                const Icon = iconFor(String(item.key || ""));
                return (
                  <button
                    key={String(item.key)}
                    type="button"
                    onClick={() => onNavigate(String(item.tab || "dashboard"))}
                    className="bg-white border rounded-3xl p-5 text-left hover:border-emerald-300 hover:shadow-sm transition flex items-start gap-4"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0"><Icon size={20} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-base">{item.label}</h3>
                        <span className="text-xl font-black text-slate-900">{Number(item.count || 0)}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                      <p className="text-xs font-bold text-emerald-700 mt-3">Open relevant module →</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border rounded-3xl p-12 text-center">
              <CheckCircle2 className="mx-auto text-emerald-500" size={38} />
              <h3 className="font-bold text-lg mt-3">Nothing requires attention</h3>
              <p className="text-sm text-slate-500 mt-1">No actionable records were found in the current database state.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdminApprovalCenter({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [data,setData]=useState<any>({storeApplications:[],deliveryApplications:[],refundApprovals:[],replacementApprovals:[],financeApprovals:[],employeeRequests:[],employeeRequestsAvailable:false});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const load=async()=>{setLoading(true);try{const r=await axios.get(API+"/admin/approval-center",{headers:adminHeaders()});setData(r.data?.data||data);}catch(e:any){alert(e?.response?.data?.message||"Unable to load Approval Center");}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const act=async(key:string,fn:()=>Promise<any>)=>{setBusy(key);try{await fn();await load();}catch(e:any){alert(e?.response?.data?.message||e?.message||"Unable to complete approval action")}finally{setBusy(null)}};
  const approveRefund=(r:any)=>act("refund:"+r._id,()=>axios.patch(API+"/admin/finance/refunds/"+r._id+"/approve",{}, {headers:adminHeaders()}));
  const approveReplacement=(r:any)=>act("replacement:"+r._id,()=>axios.patch(API+"/admin/replacement-requests/"+r._id,{status:"APPROVED"},{headers:adminHeaders()}));
  const cards=[
    {key:"store",label:"Store Applications",count:data.storeApplications.length,desc:"Pending store onboarding applications.",tab:"store-applications",icon:Store},
    {key:"delivery",label:"Delivery Applications",count:data.deliveryApplications.length,desc:"Pending delivery partner applications.",tab:"delivery-applications",icon:Truck},
    {key:"refund",label:"Refund Approvals",count:data.refundApprovals.length,desc:"Refunds awaiting Main Admin approval.",tab:null,icon:CircleDollarSign},
    {key:"replacement",label:"Replacement Approvals",count:data.replacementApprovals.length,desc:"Replacements awaiting Main Admin approval.",tab:"replacement-requests",icon:RefreshCw},
    {key:"finance",label:"Finance Approvals",count:data.financeApprovals.length,desc:"Existing finance payout batches awaiting finance workflow action.",tab:null,icon:CircleDollarSign},
    {key:"employee",label:"Employee Requests",count:null,desc:data.employeeRequestsAvailable?"Existing employee requests awaiting approval.":"No employee-request approval workflow is currently available.",tab:null,icon:Users},
  ];
  const total=cards.reduce((n,c)=>n+(typeof c.count==="number"?c.count:0),0);
  return <div className="space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"><div><p className="text-emerald-600 text-xs font-black uppercase tracking-[.18em]">ADMINISTRATION</p><h2 className="text-2xl md:text-3xl font-black">Approval Center</h2><p className="text-sm text-slate-500 mt-1">One authorized view over the existing approval and onboarding workflows.</p></div><button onClick={load} className="border rounded-xl px-4 py-2.5 font-bold">Refresh</button></div>
    {loading?<div className="bg-white border rounded-3xl p-12 text-center text-slate-500">Loading approval queues...</div>:<>
      <div className="bg-white border rounded-3xl p-5 flex items-center justify-between"><div><p className="text-xs font-black text-slate-400 uppercase tracking-wider">Actionable approval items</p><b className="text-3xl">{total}</b></div><div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center"><ShieldCheck size={24}/></div></div>
      <div className="grid md:grid-cols-2 gap-4">{cards.map(c=>{const Icon=c.icon;const disabled=c.key==="employee"&&!data.employeeRequestsAvailable;return <div key={c.key} className={`bg-white border rounded-3xl p-5 ${disabled?"opacity-75":""}`}>
        <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center"><Icon size={20}/></div><div><h3 className="font-bold">{c.label}</h3><p className="text-xs text-slate-500 mt-1">{c.desc}</p></div></div><b className="text-2xl">{typeof c.count==="number"?c.count:"—"}</b></div>
        {c.key==="refund"&&data.refundApprovals.length>0&&<div className="mt-4 space-y-2">{data.refundApprovals.slice(0,5).map((r:any)=><div key={r._id} className="border rounded-2xl p-3 flex items-center justify-between gap-3"><div><b>{r.requestId||("#"+String(r._id).slice(-8))}</b><p className="text-xs text-slate-500">{r.customer?.name||"Customer"} · ₹{Number(r.amount||0).toLocaleString("en-IN")}</p></div><button disabled={busy==="refund:"+r._id} onClick={()=>approveRefund(r)} className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold">{busy==="refund:"+r._id?"Approving...":"Approve"}</button></div>)}</div>}
        {c.key==="replacement"&&data.replacementApprovals.length>0&&<div className="mt-4 space-y-2">{data.replacementApprovals.slice(0,5).map((r:any)=><div key={r._id} className="border rounded-2xl p-3 flex items-center justify-between gap-3"><div><b>{r.requestId||("#"+String(r._id).slice(-8))}</b><p className="text-xs text-slate-500">{r.customer?.name||"Customer"}</p></div><button disabled={busy==="replacement:"+r._id} onClick={()=>approveReplacement(r)} className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold">{busy==="replacement:"+r._id?"Approving...":"Approve"}</button></div>)}</div>}
        {c.key==="finance"&&data.financeApprovals.length>0&&<div className="mt-4 space-y-2">{data.financeApprovals.slice(0,5).map((b:any)=><div key={b._id} className="border rounded-2xl p-3 flex items-center justify-between gap-3"><div><b>{b.batchId||"Finance batch"}</b><p className="text-xs text-slate-500">{b.storeAdmin?.name||"Finance payout"} · ₹{Number(b.netPayable||b.total||0).toLocaleString("en-IN")} · {b.status}</p></div><button onClick={()=>onNavigate("finance-management")} className="border rounded-lg px-3 py-1.5 text-xs font-bold">Open finance</button></div>)}</div>}
        {(c.tab&&!(c.key==="refund"||c.key==="replacement"))&&<button onClick={()=>onNavigate(c.tab!)} className="mt-4 text-emerald-700 text-sm font-bold">Open existing module →</button>}
        {c.key==="replacement"&&<button onClick={()=>onNavigate("replacement-requests")} className="mt-4 text-emerald-700 text-sm font-bold">Open existing module →</button>}
        {c.key==="refund"&&<button onClick={()=>onNavigate("customer-support")} className="mt-4 text-emerald-700 text-sm font-bold">Open support / refund workflow →</button>}
      </div>})}</div>
    </>}
  </div>;
}

function Admin({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const nav = useNavigate();
  const location = useLocation();

  const pathTab = location.pathname === "/admin/store-applications" ? "store-applications" : location.pathname === "/admin/delivery-applications" ? "delivery-applications" : "";
  const initialTab =
    new URLSearchParams(location.search).get("tab") ||
    pathTab ||
    "dashboard";

  const [tab, setTab] = useState(initialTab);
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [adminUnreadNotifications, setAdminUnreadNotifications] = useState(0);
  const [showAdminNotifications, setShowAdminNotifications] = useState(false);
  const { voiceAlertsEnabled, setVoiceAlertsEnabled, flushVoiceQueue } = useRoleNotificationVoiceAlerts(store, adminNotifications);
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

  const loadAdminNotifications = async () => {
    if (store.user?.role !== "admin") return;
    try {
      const r = await axios.get(API + "/notifications", { headers: adminHeaders() });
      setAdminNotifications(Array.isArray(r.data.data) ? r.data.data : []);
      setAdminUnreadNotifications(Number(r.data.unreadCount || 0));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();
    loadAdminNotifications();
    const timer = window.setInterval(loadAdminNotifications, 12000);
    return () => window.clearInterval(timer);
  }, [store.user?.role]);

  useEffect(() => { flushVoiceQueue(); }, [voiceAlertsEnabled]);

  const markAdminNotificationRead = async (id: string) => {
    try {
      await axios.patch(API + "/notifications/" + id + "/read", {}, { headers: adminHeaders() });
      await loadAdminNotifications();
    } catch {}
  };

  const markAllAdminNotificationsRead = async () => {
    try {
      await axios.patch(API + "/notifications/read-all", {}, { headers: adminHeaders() });
      await loadAdminNotifications();
    } catch {}
  };

  const openAdminNotification = async (n: any) => {
    await markAdminNotificationRead(String(n._id));
    setShowAdminNotifications(false);
    const related = String(n.relatedEntity || "");
    const relatedId = String(n.relatedEntityId || n.order || "");
    if (related === "REPLACEMENT_REQUEST") {
      changeTab("replacement-requests");
    } else if (related === "APPLICATION") {
      const target = String(n.type || "").toLowerCase().includes("delivery") ? "delivery-applications" : "store-applications";
      changeTab(target);
    } else if (related === "SUPPORT_TICKET" || String(n.type || "").toLowerCase().includes("support")) {
      changeTab("customer-support");
    } else if (related === "ORDER" && relatedId) {
      changeTab("orders");
    } else if (relatedId) {
      changeTab("notifications");
    }
  };

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("tab");
    const pathnameTab = location.pathname === "/admin/store-applications" ? "store-applications" : location.pathname === "/admin/delivery-applications" ? "delivery-applications" : "";
    const next = q || pathnameTab;
    if (next && next !== tab) setTab(next);
  }, [location.search, location.pathname]);

  const changeTab = (next: string) => {
    setTab(next);
    if (next === "store-applications") return nav("/admin/store-applications");
    if (next === "delivery-applications") return nav("/admin/delivery-applications");
    nav(next === "dashboard" ? "/admin" : "/admin?tab=" + next);
  };

  const navs: any[] = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ...((store.user?.isMainAdmin || String(store.user?.email || "").toLowerCase() === "admin@grocery.com") ? [["action-required", AlertTriangle, "Action Required"]] : []),
    ...((store.user?.isMainAdmin || String(store.user?.email || "").toLowerCase() === "admin@grocery.com") ? [["approval-center", ShieldCheck, "Approval Center"]] : []),
    ["orders", Package, "Orders"],
    ["order-history", History, "Order History"],
    ["products", Boxes, "Products"],
    ["categories", Tag, "Categories"],
    ["banners", Tag, "Banners / Offers"],
    ["inventory", History, "Inventory"],
    ["customers", Users, "Customers"],
    ["delivery-partners", Truck, "Delivery Partners"],
    ["delivery-operations", BarChart3, "Delivery Performance"],
    ["replacement-requests", RefreshCw, "Replacement Requests"],
    ["store-location", MapPin, "Store Location"],
    ["coupons", Tag, "Coupons"],
    ["payment-settings", CircleDollarSign, "Payment / UPI"],
    ["financial-overview", CircleDollarSign, "Income & Earnings"],
    ["rewards", Award, "Loyalty / Rewards"],
    ...((store.user?.isMainAdmin || String(store.user?.email || "").toLowerCase() === "admin@grocery.com") ? [["admin-management", ShieldCheck, "Admin Management"], ["finance-management", CircleDollarSign, "Finance Management"], ["customer-support", Headphones, "Customer Support"], ["customer-care-management", Headphones, "Customer Care Management"], ["customer-360", UserRoundSearch, "Customer 360"], ["safe-view-as", Eye, "Safe View As"], ["configuration-history", History, "Configuration History"], ["cod-risk-control", AlertTriangle, "COD Risk Control"], ["id-card-generator", BadgeCheck, "ID Card Generator"], ["store-applications", Store, "Store Applications"], ["delivery-applications", Truck, "Delivery Partner Applications"]] : []),
    ["notifications", Bell, "Notifications"],
    ["login-notices", Bell, "Login Page Notices"],
    ["public-contact", Mail, "Public Contact Settings"],
    ["settings", Settings, "Settings / Security"],
    ["reports", BarChart3, "Reports"],
    ["store-demand-heatmap", MapPin, "Store Demand Heatmap"],
    ["delivery-heatmap", Truck, "Delivery Heatmap"],
    ["peak-hour-detection", BarChart3, "Peak-Hour Detection"],
  ];

  const isMainAdmin = Boolean(
    store.user?.isMainAdmin ||
    String(store.user?.email || "").trim().toLowerCase() === "admin@grocery.com"
  );

  const visibleNavs = isMainAdmin
    ? navs
    : navs.filter((x) => !["rewards", "settings", "admin-management", "login-notices", "public-contact"].includes(x[0]));

  const adminDepartments = [
    { id: "operations", label: "Operations", Icon: Briefcase, items: visibleNavs.filter(x => ["orders","order-history","delivery-partners","delivery-operations","replacement-requests"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
    { id: "catalog", label: "Catalog", Icon: Boxes, items: visibleNavs.filter(x => ["products","categories","banners","inventory","coupons"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
    { id: "customers", label: "Customers", Icon: Users, items: visibleNavs.filter(x => ["customers","customer-support","customer-care-management","customer-360","rewards"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
    { id: "store", label: "Store", Icon: MapPin, items: visibleNavs.filter(x => ["store-location"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
    { id: "finance", label: "Finance", Icon: CircleDollarSign, items: visibleNavs.filter(x => ["finance-management","payment-settings","financial-overview"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
    { id: "administration", label: "Administration", Icon: ShieldCheck, items: visibleNavs.filter(x => ["action-required","approval-center","safe-view-as","configuration-history","cod-risk-control","admin-management","id-card-generator","notifications"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
    { id: "applications", label: "Applications", Icon: Store, items: visibleNavs.filter(x => ["store-applications","delivery-applications"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
    { id: "content", label: "Content Management", Icon: Bell, items: visibleNavs.filter(x => ["login-notices","public-contact"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
    { id: "reports", label: "Reports & Analytics", Icon: BarChart3, items: visibleNavs.filter(x => ["reports","store-demand-heatmap","delivery-heatmap","peak-hour-detection"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
    { id: "settings-security", label: "Settings & Security", Icon: Settings, items: visibleNavs.filter(x => ["settings"].includes(x[0])).map(x => ({ id:x[0], label:x[2], Icon:x[1] })) },
  ].filter(d => d.items.length);

  return (
    <div className="min-h-screen bg-slate-50 flex fb-dashboard-shell fb-admin-shell">
      <AccessibilityStyles />
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-slate-950 focus:text-white focus:px-4 focus:py-3 focus:rounded-xl focus:font-bold">
        Skip to main content
      </a>
      <DepartmentSidebar
        title="FreshBasket"
        subtitle="Store management"
        departments={adminDepartments}
        activeId={tab}
        onSelect={changeTab}
        logout={() => { store.logout(); nav("/"); }}
        mobileOpen={adminSidebarOpen}
        setMobileOpen={setAdminSidebarOpen}
      />

      <main id="admin-main" className="md:ml-64 flex-1 min-w-0">
        <header className="min-h-16 bg-white border-b px-3 sm:px-5 md:px-8 py-2 flex items-center gap-3 justify-between sticky top-0 z-30">
          <button type="button" className="md:hidden shrink-0 border rounded-xl p-2" aria-label="Open navigation" onClick={() => setAdminSidebarOpen(true)}><Menu size={19}/></button>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">
              STORE CONTROL
            </p>
            <h1 className="font-bold truncate">
              {visibleNavs.find((x) => x[0] === tab)?.[2]}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAdminNotifications((v) => !v)}
                className="relative p-2 rounded-xl border text-slate-600 hover:text-emerald-700 hover:border-emerald-200"
                aria-label="Admin notifications"
              >
                <Bell size={19} />
                {adminUnreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1 grid place-items-center">
                    {adminUnreadNotifications > 99 ? "99+" : adminUnreadNotifications}
                  </span>
                )}
              </button>
              {showAdminNotifications && (
                <div className="absolute right-0 top-12 w-[360px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-xl z-[70] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div>
                      <b>Notifications</b>
                      <p className="text-xs text-slate-500">{adminUnreadNotifications} unread</p>
                    </div>
                    {adminUnreadNotifications > 0 && (
                      <button onClick={markAllAdminNotificationsRead} className="text-xs font-bold text-emerald-700">Mark all read</button>
                    )}
                  </div>
                  <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-600">Order voice alerts</span>
                    <button type="button" onClick={() => { const next = !voiceAlertsEnabled; setVoiceAlertsEnabled(next); if (store.user?.id) localStorage.setItem(`fb-voice-alerts:${String(store.user.id)}`, String(next)); }} className={`text-xs font-black px-3 py-1.5 rounded-full border ${voiceAlertsEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                      {voiceAlertsEnabled ? "🔊 Voice alerts ON" : "🔇 Voice alerts OFF"}
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {adminNotifications.length ? adminNotifications.slice(0, 8).map((n: any) => (
                      <button key={n._id} type="button" onClick={() => openAdminNotification(n)} className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${n.read ? "bg-white" : "bg-emerald-50/60"}`}>
                        <div className="flex gap-3">
                          <div className={`mt-0.5 w-8 h-8 rounded-full grid place-items-center ${n.read ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}><Bell size={15}/></div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900">{n.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </button>
                    )) : (
                      <div className="py-10 text-center text-sm text-slate-500"><Bell className="mx-auto text-slate-300" size={28}/><p className="mt-2">No notifications yet.</p></div>
                    )}
                  </div>
                  {adminNotifications.length > 8 && (
                    <button onClick={() => { setShowAdminNotifications(false); changeTab("notifications"); }} className="block w-full text-center py-3 text-sm font-bold text-emerald-700 hover:bg-slate-50">View all notifications</button>
                  )}
                </div>
              )}
            </div>
            <Link to="/login-history" className="text-sm text-emerald-700 font-semibold hidden sm:block">Login History</Link><Link to="/" className="text-sm text-emerald-700 font-semibold hidden sm:block">View store →</Link>
          </div>
        </header>

        <div className="p-5 md:p-8">
          {tab === "safe-view-as" && isMainAdmin && <SafeSupportViewAs store={store} />}
          {tab === "configuration-history" && isMainAdmin && <AdminConfigurationHistory />}
          {tab === "cod-risk-control" && isMainAdmin && <AdminCodRiskControl />}

          {tab === "approval-center" && isMainAdmin && <AdminApprovalCenter onNavigate={changeTab} />}

          {tab === "action-required" && isMainAdmin && (
            <AdminActionRequired onNavigate={changeTab} />
          )}

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
              {!isMainAdmin && <div className="mt-6"><AdminFinancialOverview store={store} /></div>}
            </>
          )}

          {tab === "orders" && <AdminOrders />}
          {tab === "order-history" && <AdminOrderHistory />}
          {tab === "products" && (
            <ProductAdmin store={store} />
          )}
          {tab === "categories" && <CategoryAdmin />}
          {tab === "banners" && <BannerAdmin />}
          {tab === "inventory" && <AdminInventory />}
          {tab === "customers" && <AdminCustomers />}
          {tab === "customer-360" && isMainAdmin && <Customer360 store={store} />}
          {tab === "delivery-partners" && <AdminDeliveryPartners />}
          {tab === "delivery-operations" && <AdminDeliveryOperations />}
          {tab === "replacement-requests" && <AdminReplacementRequests store={store} />}
          {tab === "store-location" && <AdminStoreLocation store={store} />}
          {tab === "admin-management" && isMainAdmin && <AdminManagement store={store} />}
          {tab === "finance-management" && isMainAdmin && <AdminFinanceManagement />}
          {tab === "id-card-generator" && isMainAdmin && <MainAdminIdCardGenerator />}
          {tab === "coupons" && <CouponAdmin />}
          {tab === "payment-settings" && <AdminPaymentSettings />}
          {tab === "financial-overview" && <AdminFinancialOverview store={store} />}
          {tab === "rewards" && <AdminRewards />}
          {tab === "notifications" && (
            <div className="max-w-4xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-emerald-600 text-xs font-bold">ADMINISTRATION</p>
                  <h2 className="text-2xl font-bold">Notifications</h2>
                  <p className="text-sm text-slate-500 mt-1">Admin alerts and workflow updates from FreshBasket.</p>
                </div>
                <button onClick={markAllAdminNotificationsRead} className="border rounded-xl px-4 py-2 text-sm font-bold">Mark all read</button>
              </div>
              <div className="mt-6 bg-white border rounded-3xl overflow-hidden">
                {adminNotifications.length ? adminNotifications.map((n: any) => (
                  <button key={n._id} type="button" onClick={() => openAdminNotification(n)} className={`w-full text-left p-5 border-b last:border-b-0 hover:bg-slate-50 ${n.read ? "" : "bg-emerald-50/50"}`}>
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${n.read ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}><Bell size={18}/></div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3"><b>{n.title}</b>{!n.read && <span className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-full font-bold">NEW</span>}</div>
                        <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                )) : <div className="py-20 text-center text-slate-500"><Bell className="mx-auto text-slate-300" size={48}/><h3 className="font-bold mt-4">No notifications yet</h3><p className="text-sm mt-1">Important admin updates will appear here.</p></div>}
              </div>
            </div>
          )}

          {tab === "login-notices" && isMainAdmin && <AdminLoginNotices />}
          {tab === "public-contact" && isMainAdmin && <AdminPublicContact />}
          {tab === "settings" && <AdminSettings />}
          {tab === "reports" && <AdminReports />}
          {tab === "store-demand-heatmap" && <AdminStoreDemandHeatmap store={store} />}
          {tab === "delivery-heatmap" && <AdminDeliveryHeatmap store={store} />}
          {tab === "peak-hour-detection" && <AdminPeakHourDetection store={store} />}
          {tab === "customer-support" && isMainAdmin && <AdminSupportCenter />}
          {tab === "customer-care-management" && isMainAdmin && <CustomerCareManagement />}
          {tab === "store-applications" && isMainAdmin && <AdminApplications type="STORE" />}
          {tab === "delivery-applications" && isMainAdmin && <AdminApplications type="DELIVERY" />}
        </div>
      </main>

    </div>
  );
}

export default function App() {
  const store = useStore();
  useNativeFreshBasketPush(store);

  return (
    <>
      <AccessibilityStyles />
      <GlobalPreferences store={store} />
      <LocalizedUI store={store} />
      <Routes>
      <Route
        path="/"
        element={<Home store={store} />}
      />
      <Route
        path="/stores"
        element={<StoreDirectory store={store} />}
      />
      <Route
        path="/favorite-stores"
        element={
          <RoleRoute store={store} roles={["customer"]}>
            <StoreDirectory store={store} favoriteOnly />
          </RoleRoute>
        }
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
      <Route path="/verify/employee/:token" element={<EmployeeVerificationPage />} />
      <Route
        path="/login"
        element={<Login store={store} />}
      />
      <Route path="/apply/store" element={<PublicApplicationPage type="STORE" />} />
      <Route path="/apply/delivery" element={<PublicApplicationPage type="DELIVERY" />} />
      <Route path="/application-status" element={<ApplicationStatusPage />} />
      <Route
        path="/account"
        element={<RoleRoute store={store} roles={["customer"]}><Account store={store} /></RoleRoute>}
      />
      <Route
        path="/profile"
        element={<ProfilePage store={store} />}
      />
      <Route path="/login-history" element={<RoleRoute store={store} roles={["customer","admin","delivery","customer_care","finance_manager","finance_executive"]}><LoginHistoryPage store={store} /></RoleRoute>} />
      <Route
        path="/delivery/earnings"
        element={<RoleRoute store={store} roles={["delivery"]}><DeliveryEarnings store={store} /></RoleRoute>}
      />
      <Route
        path="/delivery"
        element={<RoleRoute store={store} roles={["delivery"]}><DeliveryDashboard store={store} /></RoleRoute>}
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
        path="/support"
        element={<RoleRoute store={store} roles={["customer"]}><CustomerSupport store={store} /></RoleRoute>}
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
        element={<RoleRoute store={store} roles={["admin"]}><Admin store={store} /></RoleRoute>}
      />
      <Route path="/admin/store-applications" element={<RoleRoute store={store} roles={["admin"]}><Admin store={store} /></RoleRoute>} />
      <Route path="/admin/delivery-applications" element={<RoleRoute store={store} roles={["admin"]}><Admin store={store} /></RoleRoute>} />
      <Route
        path="/customer-care"
        element={<RoleRoute store={store} roles={["customer_care"]}><CustomerCareDashboard store={store} /></RoleRoute>}
      />
      <Route path="/customer-360" element={<RoleRoute store={store} roles={["admin","customer_care","finance_manager","finance_executive"]}><Customer360 store={store} /></RoleRoute>} />
      <Route path="/support-view-as" element={<RoleRoute store={store} roles={["admin","customer_care"]}><SafeSupportViewAs store={store} /></RoleRoute>} />
      <Route
        path="/customer-care/replacement-requests"
        element={<RoleRoute store={store} roles={["customer_care"]}><CustomerCareReplacementRequests store={store} /></RoleRoute>}
      />
      <Route
        path="/finance"
        element={<RoleRoute store={store} roles={["finance_manager","finance_executive"]}><FinanceDashboard store={store} /></RoleRoute>}
      />
      <Route
        path="*"
        element={<Home store={store} />}
      />
      </Routes>
    </>
  );
}

