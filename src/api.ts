import { Platform } from "react-native";
import Constants from "expo-constants";

function developmentApiUrl() {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    const hostname = Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.hostname
      : hostUri ? new URL(`http://${hostUri}`).hostname : undefined;
    if (hostname) return `http://${hostname}:4000/v1`;
  }
  return Platform.OS === "android" ? "http://10.0.2.2:4000/v1" : "http://localhost:4000/v1";
}

export const API_URL = (
  (Platform.OS === "web"
    ? process.env.EXPO_PUBLIC_WEB_API_URL || process.env.EXPO_PUBLIC_API_URL
    : process.env.EXPO_PUBLIC_API_URL) || developmentApiUrl()
).trim().replace(/\/+$/, "");
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
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`The backend at ${API_URL} took too long to respond. Please try again.`);
    }
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach the backend at ${API_URL}. Check that it is running and your device is on the same network.`);
    }
    throw error;
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
  request<UserSession>("/auth/login", undefined, "POST", { ...passwordResetIdentity(email), password });
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
export const requestPhoneChangeOtp = (phone: string, token: string) =>
  request<{ message: string; challenge: string; demoOtp?: string; expiresInSeconds: number }>(
    "/auth/phone-change-otp/request",
    token,
    "POST",
    { phone },
  );



const passwordResetIdentity = (identifier: string) => {
  const value = identifier.trim();
  const phone = value.replace(/[\s()-]/g, "").replace(/^\+91(?=\d{10}$)/, "");
  return /^\d{10}$/.test(phone) ? {phone} : {email:value.toLowerCase()};
};
export const requestPasswordReset = (identifier: string) =>
  request<{ message: string; challenge:string; demoOtp?: string }>("/auth/password-reset/request", undefined, "POST", passwordResetIdentity(identifier));
export const confirmPasswordReset = (identifier: string, otp: string, newPassword: string, challenge: string) =>
  request<{ message: string }>("/auth/password-reset/confirm", undefined, "POST", { ...passwordResetIdentity(identifier), otp, newPassword, challenge });
