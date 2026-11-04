// Idempotency keys identify checkout attempts; they are not authentication tokens.
// Load native crypto only when needed so a missing Expo Go module cannot break routing.
export function newCheckoutKey(): string {
  try {
    const crypto = require("expo-crypto") as typeof import("expo-crypto");
    return crypto.randomUUID();
  } catch {
    let timestamp = Date.now();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const value = (timestamp + Math.random() * 16) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
      return (character === "x" ? value : (value & 3) | 8).toString(16);
    });
  }
}
