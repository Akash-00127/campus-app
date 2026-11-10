import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, ChevronLeft, LockKeyhole, Mail, Sparkles } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { login } from "./api";
import { AuthLogo } from "./auth-logo";
import { authColors, authFonts, authGradients } from "./auth-theme";
import { PasswordEye } from "./password-eye";
import { useSession } from "./session";

type Role = "STUDENT" | "VENDOR";

function AuthField({ label, icon, right, onFocus, onBlur, ...props }: TextInputProps & { label: string; icon: ReactNode; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
        <View style={styles.inputIcon}>{icon}</View>
        <TextInput
          {...props}
          accessibilityLabel={label}
          placeholderTextColor={authColors.muted}
          selectionColor={authColors.inputActive}
          cursorColor={authColors.inputActive}
          style={[styles.input, right ? styles.inputWithAction : undefined]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {right ? <View style={styles.fieldAction}>{right}</View> : null}
      </View>
    </View>
  );
}

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  void mode;
  const params = useLocalSearchParams<{ role?: string }>();
  const role: Role = params.role === "VENDOR" ? "VENDOR" : "STUDENT";
  const vendor = role === "VENDOR";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useSession();

  async function submit() {
    if (busy) return;
    Keyboard.dismiss();
    if (!identifier.trim() || !password) {
      setError("Enter your email or mobile number and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await login(identifier.trim(), password);
      if (!["STUDENT", "VENDOR"].includes(result.user.role)) throw new Error("Use the admin panel for this account.");
      if (result.user.role !== role) throw new Error(`This is a ${result.user.role.toLowerCase()} account. Choose that role to sign in.`);
      await signIn(result);
      router.replace("/(tabs)/home");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View pointerEvents="none" style={styles.violetGlow} />
          <View pointerEvents="none" style={styles.mangoGlow} />

          <Pressable accessibilityRole="button" accessibilityLabel="Back to role selection" onPress={() => router.replace("/welcome")} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ChevronLeft size={20} color={authColors.text} strokeWidth={2.4} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={styles.badge}>
                <Sparkles size={14} color="#FF9F64" />
                <Text style={styles.badgeText}>{vendor ? "Campus seller workspace" : "Instant college delivery"}</Text>
              </View>
              <Text style={styles.kicker}>Welcome back to</Text>
              <Text accessibilityRole="header" style={styles.title}>Campus Drop</Text>
            </View>
            <AuthLogo width={116} />
          </View>

          <Text style={styles.subtitle}>
            {vendor
              ? "Manage campus orders, products and your store from one friendly workspace."
              : "Dorm cravings or late-night study snacks? Your campus favourites are ready."}
          </Text>

          <View style={styles.rolePill}>
            <LinearGradient colors={authGradients.toggle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rolePillActive}>
              <Text style={styles.rolePillText}>{vendor ? "Vendor account" : "Student account"}</Text>
            </LinearGradient>
          </View>

          <View style={styles.form}>
            <AuthField
              label="EMAIL OR MOBILE NUMBER"
              icon={<Mail size={19} color="#718096" />}
              value={identifier}
              onChangeText={(value) => { setIdentifier(value); setError(""); }}
              placeholder="Email or 10-digit mobile number"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
            />
            <AuthField
              label="PASSWORD"
              icon={<LockKeyhole size={19} color={authColors.inputActive} />}
              value={password}
              onChangeText={(value) => { setPassword(value); setError(""); }}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              right={<PasswordEye visible={showPassword} color={authColors.inputActive} onToggle={() => setShowPassword((current) => !current)} />}
            />
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/forgot-password", params: { role } })} style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          {error ? <View accessibilityLiveRegion="polite" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={({ pressed }) => [styles.ctaOuter, pressed && styles.ctaPressed, busy && styles.disabled]}>
            <LinearGradient colors={authGradients.cta} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.cta}>
              {busy ? <ActivityIndicator color="#FFFFFF" accessibilityLabel="Signing in" /> : <>
                <Text style={styles.ctaText}>{vendor ? "Log in to vendor account" : "Log in"}</Text>
                <ArrowRight size={21} color="#FFFFFF" strokeWidth={2.5} />
                <View style={styles.ctaHighlight} />
              </>}
            </LinearGradient>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{vendor ? "New seller on campus? " : "New to the campus? "}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/register", params: { role } })}>
              <Text style={styles.footerLink}>{vendor ? "Create vendor account" : "Join the Drop Club"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: authColors.background },
  scroll: { flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 38 },
  violetGlow: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(168,85,247,0.08)", top: -120, right: -100 },
  mangoGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,151,82,0.10)", bottom: 40, left: -150 },
  backButton: { alignSelf: "flex-start", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", borderWidth: 1, borderColor: authColors.inputBorder },
  backText: { color: authColors.text, fontFamily: authFonts.bold, fontSize: 13 },
  pressed: { opacity: 0.72 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 19, marginBottom: 12 },
  headerCopy: { flex: 1 },
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, backgroundColor: "#E8EEDF", paddingVertical: 5, paddingHorizontal: 11, borderRadius: 16, marginBottom: 10 },
  badgeText: { color: authColors.secondary, fontFamily: authFonts.bold, fontSize: 11 },
  kicker: { color: authColors.secondary, fontFamily: authFonts.bold, fontSize: 21, letterSpacing: -0.2 },
  title: { color: authColors.text, fontFamily: authFonts.extra, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  subtitle: { color: authColors.secondary, fontFamily: authFonts.medium, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  rolePill: { backgroundColor: authColors.toggle, padding: 4, borderRadius: 24, marginBottom: 24 },
  rolePillActive: { minHeight: 42, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#8B5CF6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 6, elevation: 3 },
  rolePillText: { color: "#FFFFFF", fontFamily: authFonts.bold, fontSize: 13 },
  form: { gap: 14 },
  field: { gap: 7 },
  label: { color: authColors.secondary, fontFamily: authFonts.bold, fontSize: 11, letterSpacing: 0.7 },
  inputShell: { minHeight: 58, flexDirection: "row", alignItems: "center", borderWidth: 1.2, borderColor: authColors.inputBorder, borderRadius: 20, backgroundColor: authColors.input, paddingHorizontal: 16, shadowColor: authColors.text, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  inputShellFocused: { borderColor: authColors.inputActive, borderWidth: 1.4, backgroundColor: "#FFFFFF" },
  inputIcon: { width: 30, alignItems: "flex-start" },
  input: { flex: 1, color: authColors.text, fontFamily: authFonts.medium, fontSize: 15, paddingVertical: 15, outlineWidth: 0, outlineColor: "transparent" },
  inputWithAction: { paddingRight: 50 },
  fieldAction: { position: "absolute", right: 8, top: 7, bottom: 7, justifyContent: "center" },
  forgotButton: { alignSelf: "flex-end", minHeight: 36, justifyContent: "center", paddingHorizontal: 4 },
  forgotText: { color: authColors.amber, fontFamily: authFonts.bold, fontSize: 13 },
  errorBox: { backgroundColor: authColors.errorBackground, borderWidth: 1, borderColor: authColors.errorBorder, borderRadius: 14, padding: 12, marginTop: 12 },
  errorText: { color: authColors.error, fontFamily: authFonts.medium, fontSize: 12, lineHeight: 18 },
  ctaOuter: { borderRadius: 26, overflow: "hidden", marginTop: 18, shadowColor: "#A855F7", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.34, shadowRadius: 14, elevation: 6 },
  cta: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  ctaText: { color: "#FFFFFF", fontFamily: authFonts.extra, fontSize: 17, letterSpacing: 0.4 },
  ctaHighlight: { position: "absolute", right: 20, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.22)" },
  ctaPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  disabled: { opacity: 0.62 },
  footer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", marginTop: 27 },
  footerText: { color: authColors.secondary, fontFamily: authFonts.medium, fontSize: 13 },
  footerLink: { color: authColors.link, fontFamily: authFonts.bold, fontSize: 13, textDecorationLine: "underline" },
});
