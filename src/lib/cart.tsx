import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchStoreSale, isStoreSaleLive, type StoreSale } from "@/lib/storeSale";

export type CartItem = {
  id: string;
  name: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  external_url: string | null;
  quantity: number;
  maxQuantity?: number | null;
  recipient?: string | null;
  giftMessage?: string | null;
  productId?: string;
  rankPrefix?: string | null;
};



export type AppliedCoupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  currency: string | null;
  min_subtotal: number;
  description: string | null;
};

export type AppliedCreatorCode = {
  id: string;
  code: string;
  creator_name: string;
  discount_percent: number;
};

export type BundleTier = { minItems: number; percent: number };
export const BUNDLE_TIERS: BundleTier[] = [
  { minItems: 3, percent: 5 },
  { minItems: 5, percent: 10 },
  { minItems: 10, percent: 15 },
];

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  storeSale: StoreSale | null;
  storeSalePercent: number;
  storeSaleDiscount: number;
  discount: number;
  creatorDiscount: number;
  bundleDiscount: number;
  bundlePercent: number;
  nextBundle: BundleTier | null;
  total: number;
  currency: string;
  coupon: AppliedCoupon | null;
  couponError: string | null;
  applyingCoupon: boolean;
  applyCoupon: (code: string) => Promise<boolean>;
  clearCoupon: () => void;
  creatorCode: AppliedCreatorCode | null;
  creatorCodeError: string | null;
  applyingCreatorCode: boolean;
  applyCreatorCode: (code: string) => Promise<boolean>;
  clearCreatorCode: () => void;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  setRecipient: (id: string, recipient: string | null) => void;
  setGiftMessage: (id: string, message: string | null) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "carnage.cart.v1";
const COUPON_KEY = "carnage.cart.coupon.v1";
const CREATOR_KEY = "carnage.cart.creator.v1";

const read = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readCoupon = (): AppliedCoupon | null => {
  try {
    const raw = localStorage.getItem(COUPON_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppliedCoupon;
  } catch {
    return null;
  }
};

const readCreator = (): AppliedCreatorCode | null => {
  try {
    const raw = localStorage.getItem(CREATOR_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppliedCreatorCode;
  } catch {
    return null;
  }
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() =>
    typeof window === "undefined" ? [] : read(),
  );
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(() =>
    typeof window === "undefined" ? null : readCoupon(),
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [creatorCode, setCreatorCode] = useState<AppliedCreatorCode | null>(() =>
    typeof window === "undefined" ? null : readCreator(),
  );
  const [creatorCodeError, setCreatorCodeError] = useState<string | null>(null);
  const [applyingCreatorCode, setApplyingCreatorCode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [storeSale, setStoreSale] = useState<StoreSale | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStoreSale().then((sale) => {
      if (!cancelled) setStoreSale(isStoreSaleLive(sale) ? sale : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {}
  }, [coupon]);

  useEffect(() => {
    try {
      if (creatorCode) localStorage.setItem(CREATOR_KEY, JSON.stringify(creatorCode));
      else localStorage.removeItem(CREATOR_KEY);
    } catch {}
  }, [creatorCode]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(read());
      if (e.key === COUPON_KEY) setCoupon(readCoupon());
      if (e.key === CREATOR_KEY) setCreatorCode(readCreator());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty: number = 1) => {
    setItems((prev) => {
      const cap = Math.min(99, item.maxQuantity ?? 99);
      const found = prev.find((p) => p.id === item.id);
      if (found) {
        const effectiveCap = Math.min(99, found.maxQuantity ?? cap);
        return prev.map((p) =>
          p.id === item.id
            ? { ...p, quantity: Math.min(effectiveCap, p.quantity + qty) }
            : p,
        );
      }
      return [...prev, { ...item, quantity: Math.min(cap, Math.max(1, qty)) }];
    });
  }, []);

  const remove = useCallback(
    (id: string) => setItems((prev) => prev.filter((p) => p.id !== id)),
    [],
  );

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => p.id !== id)
        : prev.map((p) =>
            p.id === id
              ? { ...p, quantity: Math.min(99, p.maxQuantity ?? 99, qty) }
              : p,
          ),
    );
  }, []);

  const setRecipient = useCallback((id: string, recipient: string | null) => {
    const clean = recipient ? recipient.trim().slice(0, 32) : null;
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, recipient: clean || null } : p)),
    );
  }, []);

  const setGiftMessage = useCallback((id: string, message: string | null) => {
    const clean = message ? message.slice(0, 200) : null;
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, giftMessage: clean || null } : p)),
    );
  }, []);


  const clear = useCallback(() => {
    setItems([]);
    setCoupon(null);
    setCouponError(null);
    setCreatorCode(null);
    setCreatorCodeError(null);
  }, []);

  const clearCoupon = useCallback(() => {
    setCoupon(null);
    setCouponError(null);
  }, []);

  const clearCreatorCode = useCallback(() => {
    setCreatorCode(null);
    setCreatorCodeError(null);
  }, []);

  const applyCoupon = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    setCouponError(null);
    if (!code) {
      setCouponError("Enter a code.");
      return false;
    }
    setApplyingCoupon(true);
    try {
      const { data, error } = await supabase
        .rpc("validate_store_coupon", { _code: code })
        .maybeSingle();
      if (error) {
        setCouponError(error.message);
        return false;
      }
      if (!data) {
        setCouponError("Invalid code — check the spelling and try again.");
        return false;
      }
      const now = new Date();
      if (data.starts_at && new Date(data.starts_at) > now) {
        setCouponError(
          `This code isn't active until ${new Date(data.starts_at).toLocaleString()}.`,
        );
        return false;
      }
      if (data.expires_at && new Date(data.expires_at) < now) {
        setCouponError(
          `This code expired on ${new Date(data.expires_at).toLocaleDateString()}.`,
        );
        return false;
      }
      if (data.limit_reached) {
        setCouponError("This code has reached its usage limit.");
        return false;
      }
      if (Number(data.min_subtotal) > 0) {
        // Not a hard error — the coupon can still be attached; drawer/store
        // shows a helper hint until the subtotal meets the minimum.
      }
      setCoupon({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type as "percent" | "fixed",
        discount_value: Number(data.discount_value) || 0,
        currency: data.currency ?? null,
        min_subtotal: Number(data.min_subtotal) || 0,
        description: data.description ?? null,
      });
      return true;
    } finally {
      setApplyingCoupon(false);
    }
  }, []);

  const applyCreatorCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    setCreatorCodeError(null);
    if (!code) {
      setCreatorCodeError("Enter a creator code.");
      return false;
    }
    setApplyingCreatorCode(true);
    try {
      const { data, error } = await supabase
        .rpc("validate_creator_code", { _code: code })
        .maybeSingle();
      if (error) {
        setCreatorCodeError(error.message);
        return false;
      }
      if (!data) {
        setCreatorCodeError("Invalid or inactive creator code.");
        return false;
      }
      if (data.limit_reached) {
        setCreatorCodeError("This creator code has reached its usage limit.");
        return false;
      }
      setCreatorCode({
        id: data.id,
        code: data.code,
        creator_name: data.creator_name,
        discount_percent: Number(data.discount_percent) || 0,
      });
      return true;
    } finally {
      setApplyingCreatorCode(false);
    }
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((a, b) => a + b.quantity, 0);
    const subtotal = items.reduce((a, b) => a + (Number(b.price) || 0) * b.quantity, 0);
    const currency = (items.find((i) => i.currency)?.currency || "USD").toUpperCase();
    const storeSalePercent = isStoreSaleLive(storeSale) ? storeSale.percent : 0;
    const storeSaleDiscount = (subtotal * storeSalePercent) / 100;
    const afterSale = Math.max(0, subtotal - storeSaleDiscount);
    let discount = 0;
    if (coupon && afterSale >= coupon.min_subtotal) {
      if (coupon.discount_type === "percent") {
        discount = Math.min(afterSale, (afterSale * coupon.discount_value) / 100);
      } else {
        discount = Math.min(afterSale, coupon.discount_value);
      }
    }
    const afterCoupon = Math.max(0, afterSale - discount);
    const creatorDiscount = creatorCode
      ? (afterCoupon * creatorCode.discount_percent) / 100
      : 0;
    const afterCreator = Math.max(0, afterCoupon - creatorDiscount);
    const tier = [...BUNDLE_TIERS].reverse().find((t) => count >= t.minItems) ?? null;
    const bundlePercent = tier?.percent ?? 0;
    const bundleDiscount = tier ? (afterCreator * tier.percent) / 100 : 0;
    const nextBundle = BUNDLE_TIERS.find((t) => count < t.minItems) ?? null;
    const total = Math.max(0, afterCreator - bundleDiscount);
    return {
      items,
      count,
      subtotal,
      storeSale: storeSalePercent > 0 ? storeSale : null,
      storeSalePercent,
      storeSaleDiscount,
      discount,
      creatorDiscount,
      bundleDiscount,
      bundlePercent,
      nextBundle,
      total,
      currency,
      coupon,
      couponError,
      applyingCoupon,
      applyCoupon,
      clearCoupon,
      creatorCode,
      creatorCodeError,
      applyingCreatorCode,
      applyCreatorCode,
      clearCreatorCode,
      add,
      remove,
      setQty,
      setRecipient,
      setGiftMessage,
      clear,
      isOpen,
      openCart,
      closeCart,
    };
  }, [
    items,
    storeSale,
    coupon,
    couponError,
    applyingCoupon,
    applyCoupon,
    clearCoupon,
    creatorCode,
    creatorCodeError,
    applyingCreatorCode,
    applyCreatorCode,
    clearCreatorCode,
    add,
    remove,
    setQty,
    setRecipient,
    setGiftMessage,
    clear,
    isOpen,
    openCart,
    closeCart,
  ]);


  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const formatMoney = (amount: number, currency: string = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};
