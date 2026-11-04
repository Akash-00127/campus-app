export type RegistrationStep = "identity" | "shop" | "account" | "verify";
export type RegistrationDetails = {
  name: string; email: string; phone: string; universityId: string; campusId: string;
  shopName: string; address: string;
  password: string; otp: string;
};
export function registrationSteps(vendor: boolean): RegistrationStep[] {
  return ["identity", ...(vendor ? ["shop" as const] : []), "account"];
}
export function registrationError(step: RegistrationStep, details: RegistrationDetails, vendor: boolean): string {
  switch (step) {
    case "identity":
      if (!details.name.trim()) return vendor ? "Enter the owner or manager’s full name." : "Enter your full name.";
      if (!details.universityId) return "Choose your university to continue.";
      if (!details.campusId) return "Choose your campus to continue.";
      break;
    case "shop":
      if (!details.shopName.trim()) return "Enter your store or canteen name.";
      if (!details.address.trim()) return "Enter your shop’s block and pickup location.";
      break;
    case "account":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) return "Enter a valid email address.";
      if (!/^\d{10}$/.test(details.phone)) return "Enter a valid 10-digit mobile number.";
      if (details.password.length < 8) return "Use at least 8 characters for your password.";
      break;
    case "verify":
      if (!/^\d{6}$/.test(details.otp)) return "Enter the six-digit verification code.";
      break;
  }
  return "";
}
