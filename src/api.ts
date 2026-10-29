import { Platform } from "react-native";

export const API_URL = Platform.OS === "web"
  ? process.env.EXPO_PUBLIC_WEB_API_URL || "http://localhost:4000/v1"
  : process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:4000/v1";
export const mediaUrl = (value?: string) => {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return `${API_URL.replace(/\/v1\/?$/, "")}${value.startsWith("/") ? "" : "/"}${value}`;
};
export type University = {
  id: string;
  name: string;
  city: string;
  state: string;
};
export type Campus = {
  id: string;
  name: string;
  universityId: string;
  serviceEnabled: boolean;
  codEnabled: boolean;
  deliveryFeePaise: number;
  platformFeePaise: number;
  codLimitPaise: number;
};
export type Vendor = {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  operatingStatus: string;
  preparationMinutes: number;
  approvalStatus?: string;
  reviewReason?: string;
  address?: string;
  codEnabled: boolean;
  acceptingOrders: boolean;
  operatingHours?: { alwaysOpen: boolean; open: string; close: string };
  rating?: number | null;
  reviewCount?: number;
};
export type Profile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo?: string;
  role: string;
  verified: boolean;
  universityId?: string;
  campusId?: string;
  university?: University;
  campus?: Campus;
  vendor?: Vendor;
};
export type UserSession = { accessToken: string; user: Profile };
export type Product = {
  id: string;
  name: string;
  description?: string;
  pricePaise: number;
  compareAtPricePaise?: number;
  image?: string;
  vegetarian: boolean;
  vendorId: string;
  vendor: Vendor;
  category?: { id: string; name: string };
  available: boolean;
  active: boolean;
  stock: number | null;
};
export type Catalog = {
  vendors: Vendor[];
  products: Product[];
  categories: { id: string; name: string; image?: string }[];
  campus: Campus;
  settings: Record<string, string>;
  total: number;
  page: number;
};
export type Address = {
  id: string;
  label: string;
  building: string;
  details: string;
  phone: string;
};
export type Order = {
  id: string;
  code: string;
  status: string;
  paymentStatus: string;
  totalPaise: number;
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  platformFeePaise: number;
  deliveryAddress: string;
  deliveryPin?: string;
  cashCollectedAt?: string;
  createdAt: string;
  items: {
    id: string;
    name: string;
    productId: string;
    quantity: number;
    unitPricePaise: number;
    note?: string;
  }[];
  history?: {
    id: string;
    status: string;
    createdAt: string;
    reason?: string;
  }[];
};
export async function request<T>(
  path: string,
  token?: string,
  method = "GET",
  body?: unknown,
  timeoutMs = 15000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        response.status === 401 && token
          ? "Your session expired. Please sign out and sign in again."
          : Array.isArray(data.message)
            ? data.message.join("\n")
            : data.message || "Request failed.",
      );
    return data;
  } finally {
    clearTimeout(timer);
  }
}
// This powers the first registration interaction. It should either show the
// list immediately over the local campus network or reveal a retry state fast.
export const universities = () => request<University[]>("/universities", undefined, "GET", undefined, 10000);
export const campuses = (id: string) =>
  request<Campus[]>(`/universities/${id}/campuses`);
export const login = (email: string, password: string) =>
  request<UserSession>("/auth/login", undefined, "POST", { email, password });
export const register = (body: unknown, vendor = false) =>
  request<UserSession>(
    vendor ? "/auth/vendor-register" : "/auth/register",
    undefined,
    "POST",
    body,
  );
export const requestRegistrationOtp = (phone: string, role: "STUDENT" | "VENDOR") =>
  request<{ message: string; challenge: string; demoOtp?: string; expiresInSeconds: number }>(
    "/auth/registration-otp/request",
    undefined,
    "POST",
    { phone, role },
  );



const passwordResetIdentity = (identifier: string) =>
  /^\+?[0-9]{10,15}$/.test(identifier.trim())
    ? { phone: identifier.trim() }
    : { email: identifier.trim() };
export const requestPasswordReset = (identifier: string) =>
  request<{ message: string; demoOtp?: string }>("/auth/password-reset/request", undefined, "POST", passwordResetIdentity(identifier));
export const confirmPasswordReset = (identifier: string, otp: string, newPassword: string) =>
  request<{ message: string }>("/auth/password-reset/confirm", undefined, "POST", { ...passwordResetIdentity(identifier), otp, newPassword });
