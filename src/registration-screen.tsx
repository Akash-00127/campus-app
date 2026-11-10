import { PasswordEye } from "./password-eye";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, LockKeyhole, Mail, MapPin, Phone, Search, ShieldCheck, Store, UserRound } from "lucide-react-native";
import {
  ActivityIndicator, BackHandler, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { campuses, register, requestRegistrationOtp, universities, type Campus, type University, type UserSession } from "./api";
import { AuthLogo } from "./auth-logo";
import { authColors, authFonts, authGradients } from "./auth-theme";
import { useSession } from "./session";
import { registrationError, registrationSteps, type RegistrationDetails, type RegistrationStep } from "./registration-flow";

const initial: RegistrationDetails = { name: "", email: "", phone: "", universityId: "", campusId: "", shopName: "", address: "", password: "", otp: "" };
const copy: Record<RegistrationStep, { title: string; subtitle: string; label: string }> = {
  identity: { title: "Join the Drop Club", subtitle: "Tell us your name and choose the campus you belong to.", label: "Your campus" },
  shop: { title: "Set up your campus shop", subtitle: "Add the store name and student pickup location.", label: "Your shop" },
  account: { title: "Secure your account", subtitle: "Add your email, mobile number and a strong password.", label: "Account" },
  verify: { title: "Check your phone", subtitle: "Enter the six-digit code sent to your mobile.", label: "Verify mobile" },
};
const fonts = authFonts;

function fieldIcon(label: string) {
  const props = { size: 18, color: "#718096", strokeWidth: 2 };
  const normalized = label.toLowerCase();
  if (normalized.includes("name") && !normalized.includes("shop")) return <UserRound {...props} />;
  if (normalized.includes("email")) return <Mail {...props} />;
  if (normalized.includes("password")) return <LockKeyhole {...props} color={authColors.inputActive} />;
  if (normalized.includes("mobile")) return <Phone {...props} />;
  if (normalized.includes("code")) return <ShieldCheck {...props} color={authColors.inputActive} />;
  if (normalized.includes("store") || normalized.includes("canteen")) return <Store {...props} />;
  if (normalized.includes("location") || normalized.includes("block")) return <MapPin {...props} />;
  return <Search {...props} />;
}

function Input({ label, compact, right, onFocus, onBlur, ...props }: TextInputProps & { label: string; compact: boolean; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return <View style={[r.field, compact && { marginBottom: 10 }]}>
    <Text style={r.label}>{label}</Text>
    <View style={[r.inputShell, compact && { minHeight: 46 }, focused && r.inputFocused]}>
      <View style={r.inputIcon}>{fieldIcon(label)}</View>
      <TextInput {...props} accessibilityLabel={label} placeholderTextColor={authColors.muted} selectionColor={authColors.inputActive} cursorColor={authColors.inputActive}
        onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }}
        style={[r.input, compact && { paddingVertical: 10 }, !!right && { paddingRight: 48 }, props.style]} />
      {right ? <View style={r.fieldAction}>{right}</View> : null}
    </View>
  </View>;
}

export function RegistrationScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const vendor = roleParam === "VENDOR";
  const role = vendor ? "VENDOR" : "STUDENT";
  const { signIn } = useSession();
  const { height, fontScale } = useWindowDimensions();
  const [details, setDetails] = useState<RegistrationDetails>(initial);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [keyboard, setKeyboard] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [uniRows, setUniRows] = useState<University[]>([]);
  const [campusRows, setCampusRows] = useState<Campus[]>([]);
  const [campusLoadedFor, setCampusLoadedFor] = useState("");
  const [uniLoading, setUniLoading] = useState(false);
  const [campusLoading, setCampusLoading] = useState(false);
  const [uniError, setUniError] = useState("");
  const [campusError, setCampusError] = useState("");
  const [pickerRetry, setPickerRetry] = useState(0);
  const [picker, setPicker] = useState<"university" | "campus" | null>(null);
  const [search, setSearch] = useState("");
  const [challenge, setChallenge] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const createdAccount = useRef<UserSession | null>(null);
  const submitting = useRef(false);
  const steps = registrationSteps(vendor);
  const step = steps[stepIndex];
  const compact = keyboard || height < 740 || fontScale > 1.2;
  const tight = height < 520;
  const loading = picker === "university" ? uniLoading : campusLoading;
  const pickerError = picker === "university" ? uniError : campusError;
  const meta = otpRequested && step === "account" ? copy.verify : copy[step];
  const selectedUniversity = uniRows.find(row => row.id === details.universityId);
  const campusReady = campusLoadedFor === details.universityId;
  const selectedCampus = campusReady ? campusRows.find(row => row.id === details.campusId) : undefined;
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const update = (key: keyof RegistrationDetails, value: string) => { setDetails(current => ({ ...current, [key]: value })); setError(""); };

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboard(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, [busy, stepIndex, otpRequested]);
  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  useEffect(() => {
    let active = true;
    if (picker !== "university") return;
    setUniLoading(true); setUniError("");
    universities().then(rows => { if (active) setUniRows(rows); }).catch(caught => { if (active) setUniError(caught.message); }).finally(() => { if (active) setUniLoading(false); });
    return () => { active = false; };
  }, [picker, pickerRetry]);
  useEffect(() => {
    let active = true;
    const universityId = details.universityId;
    if (!universityId) {
      setCampusRows([]);
      setCampusLoadedFor("");
      setCampusLoading(false);
      setCampusError("");
      return;
    }
    setCampusLoading(true); setCampusError("");
    campuses(universityId).then(rows => {
      if (!active) return;
      setCampusRows(rows);
      setCampusLoadedFor(universityId);
      if (rows.length === 1) setDetails(current => ({ ...current, campusId: rows[0].id }));
    }).catch(caught => { if (active) setCampusError(caught.message); }).finally(() => { if (active) setCampusLoading(false); });
    return () => { active = false; };
  }, [details.universityId, pickerRetry]);

  function back() {
    if (busy || createdAccount.current) return;
    Keyboard.dismiss(); setError("");
    if (otpRequested) {
      setOtpRequested(false); setChallenge("");
      setDetails(current => ({ ...current, otp: "" }));
      return;
    }
    if (stepIndex === 0) router.canGoBack() ? router.back() : router.replace({ pathname: "/welcome", params: { role } });
    else setStepIndex(current => current - 1);
  }
  async function sendCode() {
    const result = await requestRegistrationOtp(details.phone, role);
    setChallenge(result.challenge); update("otp", result.demoOtp || "");
    setResendAt(Date.now() + 30000); setNow(Date.now());
  }
  async function finish() {
    if (!createdAccount.current) {
      if (!challenge) throw new Error("Request a new code before verifying your mobile.");
      createdAccount.current = await register({ name: details.name.trim(), email: details.email.trim().toLowerCase(), phone: details.phone,
        password: details.password, universityId: details.universityId, campusId: details.campusId, otp: details.otp, otpChallenge: challenge,
        ...(vendor ? { shopName: details.shopName.trim(), address: details.address.trim() } : {}),
      }, vendor);
    }
    const account = createdAccount.current;
    if (account.user.role !== role) throw new Error("The account role returned by the server does not match your registration.");
    await signIn(account);
    router.replace("/(tabs)/home");
  }
  async function next() {
    if (submitting.current) return;
    Keyboard.dismiss();
    if (!createdAccount.current) {
      if (step === "identity" && details.universityId && !campusReady) {
        setError(campusError ? "Campus options couldn’t load. Tap Try again." : "Please wait while we find campuses for this university.");
        return;
      }
      if (step === "identity" && campusReady && campusRows.length === 0) {
        setError("This university has no available campuses. Choose another university.");
        return;
      }
      const issue = registrationError(otpRequested && step === "account" ? "verify" : step, details, vendor);
      if (issue) { setError(issue); return; }
    }
    setError("");
    submitting.current = true; setBusy(true);
    try {
      if (createdAccount.current || (step === "account" && otpRequested)) await finish();
      else {
        if (step === "account") {
          await sendCode();
          setOtpRequested(true);
        } else setStepIndex(current => current + 1);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Please try again."); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function resend() {
    if (remaining || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try { await sendCode(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not resend your code."); }
    finally { submitting.current = false; setBusy(false); }
  }
  function openPicker(kind: "university" | "campus") { Keyboard.dismiss(); setSearch(""); setPicker(kind); }
  const pickerRows = (picker === "university" ? uniRows : campusRows).filter(row => row.name.toLowerCase().includes(search.trim().toLowerCase()));
  const fieldProps = { compact, editable: !busy, returnKeyType: "done" as const };
  const actionLabel = createdAccount.current ? "Retry & continue"
    : step === "account" ? otpRequested ? vendor ? "Verify & create shop" : "Verify & create account" : "Create account"
    : "Continue";

  return <SafeAreaView style={r.safe}>
    <KeyboardAvoidingView style={r.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={r.flex}
        contentContainerStyle={[r.page, compact && r.pageCompact]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View pointerEvents="none" style={r.violetGlow} />
        <View pointerEvents="none" style={r.mangoGlow} />
        {!keyboard && !tight && <View style={r.header}>
          <AuthLogo width={104} />
          <View style={r.roleBadge}><LinearGradient colors={authGradients.toggle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={r.roleGradient}><Text style={r.roleText}>{vendor ? "VENDOR ACCOUNT" : "STUDENT ACCOUNT"}</Text></LinearGradient></View>
        </View>}
        <View style={[r.card, compact && r.cardCompact, tight && { padding: 12 }]}>
          <View style={r.progressHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel={stepIndex ? "Previous step" : "Back to account options"} disabled={busy || !!createdAccount.current} onPress={back} style={r.back}><Text style={r.backText}>← Back</Text></Pressable>
            <Text style={r.stepLabel}>{meta.label}</Text><Text style={r.count}>{String(stepIndex + 1).padStart(2, "0")} <Text style={{ color: "#A3ABA8" }}>/ {String(steps.length).padStart(2, "0")}</Text></Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: steps.length, now: stepIndex + 1 }} style={[r.progress, tight && { marginTop: 8, marginBottom: 12 }]}>
            {steps.map((item, index) => <View key={item} style={[r.segment, index <= stepIndex && r.segmentActive]} />)}
          </View>
          {!tight && <View style={[r.heading, compact && { marginBottom: 14 }]}>
            <Text accessibilityRole="header" style={[r.title, compact && { fontSize: 23, lineHeight: 29 }]}>{meta.title}</Text>
            {!keyboard && <Text style={r.subtitle}>{meta.subtitle}</Text>}
          </View>}
          <View style={r.fields}>
            {step === "identity" && <>
              <Input {...fieldProps} label={vendor ? "Owner / manager name" : "Full name"} value={details.name} onChangeText={value => update("name", value)} placeholder="Your full name" autoComplete="name" textContentType="name" maxLength={100} />
              <Text style={r.label}>University</Text><Pressable accessibilityRole="button" onPress={() => openPicker("university")} style={r.select}><MapPin size={18} color="#718096" /><Text numberOfLines={2} style={[r.selectText, !selectedUniversity && r.placeholder]}>{selectedUniversity?.name || "Find your university"}</Text><ChevronDown size={20} color={authColors.inputActive} /></Pressable>
              {details.universityId && !campusReady && !campusError && <View style={r.campusStatus}><ActivityIndicator size="small" color={authColors.inputActive} /><Text style={r.campusStatusText}>Finding campuses…</Text></View>}
              {details.universityId && campusError && <View style={r.campusError}><Text style={r.campusErrorText}>Couldn’t load campuses.</Text><Pressable accessibilityRole="button" onPress={() => setPickerRetry(current => current + 1)}><Text style={r.textLink}>Try again</Text></Pressable></View>}
              {campusReady && campusRows.length > 1 && <><Text style={r.label}>Campus</Text><Pressable accessibilityRole="button" onPress={() => openPicker("campus")} style={r.select}><MapPin size={18} color="#718096" /><Text numberOfLines={2} style={[r.selectText, !selectedCampus && r.placeholder]}>{selectedCampus?.name || "Choose your campus"}</Text><ChevronDown size={20} color={authColors.inputActive} /></Pressable></>}
              {details.universityId && campusReady && campusRows.length === 0 && <Text style={r.campusEmpty}>No campuses are listed for this university. Choose another university.</Text>}
            </>}
            {step === "shop" && <>
              <Input {...fieldProps} label="Store / canteen name" value={details.shopName} onChangeText={value => update("shopName", value)} placeholder="Campus Central Bakery" maxLength={120} />
              <Input {...fieldProps} label="Shop block & pickup location" value={details.address} onChangeText={value => update("address", value)} placeholder="Food court, Block C" maxLength={300} />
            </>}
            {step === "account" && !otpRequested && <>
              <Input {...fieldProps} label="Email address" value={details.email} onChangeText={value => update("email", value)} placeholder="you@university.edu" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} />
              <Text style={r.passwordHint}>Password must contain at least 8 characters</Text>
              <Input {...fieldProps} label="Create password" value={details.password} onChangeText={value => update("password", value)} placeholder="Create a strong password" secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="new-password" right={<PasswordEye visible={showPassword} color={authColors.inputActive} onToggle={()=>setShowPassword(current=>!current)}/>} />
              <Input {...fieldProps} label="Mobile number · +91" value={details.phone} onChangeText={value => update("phone", value.replace(/\D/g, "").slice(0, 10))} keyboardType="phone-pad" placeholder="9876543210" maxLength={10} autoComplete="tel-national" />
            </>}
            {step === "account" && otpRequested && <>
              {!keyboard && <Text style={r.sentTo}>Code sent to <Text style={r.strong}>+91 {details.phone}</Text></Text>}
              <Input {...fieldProps} editable={!busy && !createdAccount.current} label="Six-digit verification code" value={details.otp} onChangeText={value => update("otp", value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} style={r.otp} />
              {!createdAccount.current && <Pressable accessibilityRole="button" disabled={busy || remaining > 0} onPress={() => void resend()} style={r.resend}><Text style={[r.textLink, remaining > 0 && { color: authColors.muted }]}>{remaining > 0 ? `Resend code in ${remaining}s` : "Didn’t get a code? Resend"}</Text></Pressable>}
            </>}
          </View>
          <View style={r.footer}>
            {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={r.error}>{error}</Text>}
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void next()} style={({ pressed }) => [r.primaryOuter, pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }, busy && { opacity: 0.65 }]}>
              <LinearGradient colors={authGradients.cta} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={r.primary}>
                {busy ? <ActivityIndicator color="white" accessibilityLabel="Please wait" /> : <><Text style={r.primaryText}>{actionLabel}</Text><Text style={r.primaryArrow}>→</Text><View style={r.primaryHighlight} /></>}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={picker !== null} animationType="slide" onRequestClose={() => { Keyboard.dismiss(); setPicker(null); }}>
      <SafeAreaView style={r.safe}><KeyboardAvoidingView style={r.pickerPage} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={r.pickerHeader}><Text accessibilityRole="header" style={r.pickerTitle}>{picker === "university" ? "Find your university" : "Choose your campus"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close selection" onPress={() => { Keyboard.dismiss(); setPicker(null); }} style={r.back}><Text style={r.chevron}>×</Text></Pressable></View>
        <Input compact label="Search by name" value={search} onChangeText={setSearch} placeholder={picker === "university" ? "University name" : "Campus name"} autoCorrect={false} />
        {loading ? <ActivityIndicator color={authColors.inputActive} style={{ margin: 24 }} /> : pickerError ? <View style={r.pickerError}><Text style={r.error}>{pickerError}</Text><Pressable accessibilityRole="button" onPress={() => { setPickerRetry(current => current + 1); }}><Text style={r.textLink}>Try again</Text></Pressable></View> : <FlatList data={pickerRows} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 24 }} ListEmptyComponent={<Text style={r.subtitle}>No matching {picker === "university" ? "universities" : "campuses"}. Try another name.</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Select ${item.name}`} onPress={() => {
          if (picker === "university") { if (details.universityId !== item.id) { setCampusRows([]); setCampusLoadedFor(""); setCampusError(""); setDetails(current => ({ ...current, universityId: item.id, campusId: "" })); } }
          else update("campusId", item.id);
          setError(""); Keyboard.dismiss(); setPicker(null);
        }} style={r.pickerRow}><View style={r.flex}><Text style={r.pickerName}>{item.name}</Text>{"city" in item && <Text style={r.pickerMeta}>{[item.city, item.state].filter(Boolean).join(", ")}</Text>}</View><Text style={r.chevron}>›</Text></Pressable>} />}
      </KeyboardAvoidingView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const r = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: authColors.background },
  page: { flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  pageCompact: { paddingTop: 7, paddingHorizontal: 14 },
  violetGlow: { position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(168,85,247,0.08)", top: -145, right: -95 },
  mangoGlow: { position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: "rgba(255,151,82,0.10)", bottom: 20, left: -145 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 },
  roleBadge: { flex: 1, maxWidth: 180, backgroundColor: authColors.toggle, padding: 4, borderRadius: 22 },
  roleGradient: { minHeight: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  roleText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.9, color: "#FFFFFF" },
  card: { width: "100%", backgroundColor: authColors.surface, borderWidth: 1, borderColor: authColors.inputBorder, borderRadius: 28, padding: 24, shadowColor: authColors.text, shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  cardCompact: { padding: 16, borderRadius: 24 },
  progressHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { minWidth: 78, minHeight: 44, paddingHorizontal: 11, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: authColors.inputBorder, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 13, color: authColors.text, fontFamily: fonts.bold },
  stepLabel: { flex: 1, color: authColors.secondary, fontFamily: fonts.bold, fontSize: 12 },
  count: { color: authColors.inputActive, fontFamily: fonts.bold, fontSize: 12 },
  progress: { flexDirection: "row", gap: 5, marginTop: 15, marginBottom: 20 },
  segment: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#E4ECDB" },
  segmentActive: { backgroundColor: authColors.inputActive },
  heading: { marginBottom: 21 },
  title: { color: authColors.text, fontFamily: fonts.extra, fontSize: 29, lineHeight: 36, letterSpacing: -0.8 },
  subtitle: { color: authColors.secondary, fontFamily: fonts.medium, fontSize: 12, lineHeight: 19, marginTop: 7 },
  fields: { flexShrink: 0 },
  field: { marginBottom: 14 },
  label: { color: authColors.secondary, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.35, marginBottom: 7 },
  inputShell: { minHeight: 58, flexDirection: "row", alignItems: "center", borderWidth: 1.2, borderColor: authColors.inputBorder, borderRadius: 20, backgroundColor: authColors.input, paddingHorizontal: 16, shadowColor: authColors.text, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  inputFocused: { borderColor: authColors.inputActive, borderWidth: 1.4, backgroundColor: "#FFFFFF" },
  inputIcon: { width: 30, alignItems: "flex-start" },
  input: { flex: 1, paddingVertical: 15, fontFamily: fonts.medium, fontSize: 14, color: authColors.text, outlineWidth: 0, outlineColor: "transparent" },
  fieldAction: { position: "absolute", right: 8, top: 7, bottom: 7, justifyContent: "center" },
  select: { minHeight: 58, borderWidth: 1.2, borderColor: authColors.inputBorder, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: authColors.input, marginBottom: 14, shadowColor: authColors.text, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  selectText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: authColors.text },
  placeholder: { color: authColors.muted },
  chevron: { fontSize: 23, color: authColors.inputActive },
  passwordHint: { alignSelf: "flex-end", color: authColors.amber, fontFamily: fonts.bold, fontSize: 10, marginBottom: 6 },
  textLink: { color: authColors.link, fontFamily: fonts.bold, fontSize: 11 },
  campusStatus: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 14 },
  campusStatusText: { color: authColors.secondary, fontFamily: fonts.medium, fontSize: 12 },
  campusError: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 13, borderRadius: 13, backgroundColor: authColors.errorBackground, marginBottom: 12 },
  campusErrorText: { flex: 1, color: authColors.error, fontFamily: fonts.medium, fontSize: 11 },
  campusEmpty: { padding: 12, borderRadius: 13, backgroundColor: "#F2F3EB", color: authColors.secondary, fontFamily: fonts.medium, fontSize: 11, lineHeight: 17, marginBottom: 12 },
  footer: { paddingTop: 10 },
  primaryOuter: { borderRadius: 26, overflow: "hidden", shadowColor: "#A855F7", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.34, shadowRadius: 14, elevation: 6 },
  primary: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 18, gap: 9 },
  primaryText: { color: "#FFFFFF", fontFamily: fonts.extra, fontSize: 15, letterSpacing: 0.25 },
  primaryArrow: { color: "#FFFFFF", fontSize: 22 },
  primaryHighlight: { position: "absolute", right: 20, width: 25, height: 25, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.22)" },
  error: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, color: authColors.error, marginBottom: 10 },
  sentTo: { color: authColors.secondary, fontFamily: fonts.regular, fontSize: 12, marginBottom: 18 },
  strong: { color: authColors.text, fontFamily: fonts.bold },
  otp: { fontFamily: fonts.bold, fontSize: 25, letterSpacing: 7, textAlign: "center" },
  resend: { alignItems: "center", paddingVertical: 12 },
  pickerPage: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 22, paddingTop: 16 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 },
  pickerTitle: { flex: 1, color: authColors.text, fontFamily: fonts.extra, fontSize: 23, letterSpacing: -0.6 },
  pickerError: { padding: 16, borderRadius: 15, backgroundColor: authColors.errorBackground },
  pickerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 18, borderBottomWidth: 1, borderColor: authColors.inputBorder, gap: 12 },
  pickerName: { color: authColors.text, fontFamily: fonts.bold, fontSize: 14 },
  pickerMeta: { color: authColors.secondary, fontFamily: fonts.regular, fontSize: 11, marginTop: 5 },
});
