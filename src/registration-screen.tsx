import { PasswordEye } from "./password-eye";
import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator, BackHandler, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "./brand";
import { campuses, register, requestRegistrationOtp, universities, type Campus, type University, type UserSession } from "./api";
import { useSession } from "./session";
import { colors } from "./ui";
import { registrationError, registrationSteps, type RegistrationDetails, type RegistrationStep } from "./registration-flow";

const initial: RegistrationDetails = { name: "", email: "", phone: "", universityId: "", campusId: "", shopName: "", address: "", password: "", otp: "" };
const copy: Record<RegistrationStep, { title: string; subtitle: string; label: string }> = {
  identity: { title: "Your campus, your place.", subtitle: "Add your name, university and campus.", label: "Your campus" },
  shop: { title: "Add your shop.", subtitle: "Your shop name and pickup location.", label: "Your shop" },
  account: { title: "Your account details.", subtitle: "Add your email, mobile number and password.", label: "Account" },
  verify: { title: "Check your phone.", subtitle: "Enter the code we sent to your mobile.", label: "Verify mobile" },
};
const fonts = { regular: "Inter_400Regular", medium: "Inter_500Medium", bold: "PlusJakartaSans_700Bold", extra: "PlusJakartaSans_800ExtraBold" };

function Input({ label, compact, ...props }: TextInputProps & { label: string; compact: boolean }) {
  const [focused, setFocused] = useState(false);
  return <View style={[r.field, compact && { marginBottom: 10 }]}>
    <Text style={r.label}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor="#8B9497" selectionColor={colors.green}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={[r.input, compact && { minHeight: 44, paddingVertical: 10 }, focused && r.inputFocused, props.style]} />
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
  const [viewportHeight, setViewportHeight] = useState(height);
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
  const compact = keyboard || height < 740 || viewportHeight < 700 || fontScale > 1.2;
  const tight = viewportHeight < 450;
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
    : step === "account" ? otpRequested ? vendor ? "Verify & create shop" : "Verify & create account" : "Send verification code"
    : "Continue";

  return <SafeAreaView style={r.safe}>
    <KeyboardAvoidingView style={r.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View onLayout={event => setViewportHeight(event.nativeEvent.layout.height)} style={[r.page, compact && r.pageCompact]}>
        {!keyboard && !tight && <View style={r.header}>
          <View style={r.identity}><Brand size={34} /><Text style={r.wordmark}>Campus <Text style={{ color: colors.green }}>Drop</Text></Text></View>
          <View style={r.roleBadge}><Text style={r.roleText}>{vendor ? "FOR VENDORS" : "FOR STUDENTS"}</Text></View>
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
              <Text style={r.label}>University</Text><Pressable accessibilityRole="button" onPress={() => openPicker("university")} style={r.select}><Text numberOfLines={2} style={[r.selectText, !selectedUniversity && r.placeholder]}>{selectedUniversity?.name || "Find your university"}</Text><Text style={r.chevron}>⌄</Text></Pressable>
              {details.universityId && !campusReady && !campusError && <View style={r.campusStatus}><ActivityIndicator size="small" color={colors.green} /><Text style={r.campusStatusText}>Finding campuses…</Text></View>}
              {details.universityId && campusError && <View style={r.campusError}><Text style={r.campusErrorText}>Couldn’t load campuses.</Text><Pressable accessibilityRole="button" onPress={() => setPickerRetry(current => current + 1)}><Text style={r.textLink}>Try again</Text></Pressable></View>}
              {campusReady && campusRows.length > 1 && <><Text style={r.label}>Campus</Text><Pressable accessibilityRole="button" onPress={() => openPicker("campus")} style={r.select}><Text numberOfLines={2} style={[r.selectText, !selectedCampus && r.placeholder]}>{selectedCampus?.name || "Choose your campus"}</Text><Text style={r.chevron}>⌄</Text></Pressable></>}
              {details.universityId && campusReady && campusRows.length === 0 && <Text style={r.campusEmpty}>No campuses are listed for this university. Choose another university.</Text>}
            </>}
            {step === "shop" && <>
              <Input {...fieldProps} label="Store / canteen name" value={details.shopName} onChangeText={value => update("shopName", value)} placeholder="Campus Central Bakery" maxLength={120} />
              <Input {...fieldProps} label="Shop block & pickup location" value={details.address} onChangeText={value => update("address", value)} placeholder="Food court, Block C" maxLength={300} />
            </>}
            {step === "account" && !otpRequested && <>
              <Input {...fieldProps} label="Email address" value={details.email} onChangeText={value => update("email", value)} placeholder="you@university.edu" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} />
              <View style={r.passwordLabel}><Text style={r.textLink}>At least 8 characters</Text><PasswordEye visible={showPassword} onToggle={()=>setShowPassword(current=>!current)}/></View>
              <Input {...fieldProps} label="Create password" value={details.password} onChangeText={value => update("password", value)} placeholder="Create a strong password" secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="new-password" />
              <Input {...fieldProps} label="Mobile number · +91" value={details.phone} onChangeText={value => update("phone", value.replace(/\D/g, "").slice(0, 10))} keyboardType="phone-pad" placeholder="9876543210" maxLength={10} autoComplete="tel-national" />
            </>}
            {step === "account" && otpRequested && <>
              {!keyboard && <Text style={r.sentTo}>Code sent to <Text style={r.strong}>+91 {details.phone}</Text></Text>}
              <Input {...fieldProps} editable={!busy && !createdAccount.current} label="Six-digit verification code" value={details.otp} onChangeText={value => update("otp", value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} style={r.otp} />
              {!createdAccount.current && <Pressable accessibilityRole="button" disabled={busy || remaining > 0} onPress={() => void resend()} style={r.resend}><Text style={[r.textLink, remaining > 0 && { color: colors.muted }]}>{remaining > 0 ? `Resend code in ${remaining}s` : "Didn’t get a code? Resend"}</Text></Pressable>}
            </>}
          </View>
          <View style={r.footer}>
            {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={r.error}>{error}</Text>}
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void next()} style={({ pressed }) => [r.primary, pressed && { opacity: 0.82 }, busy && { opacity: 0.65 }]}>
              {busy ? <ActivityIndicator color="white" accessibilityLabel="Please wait" /> : <><Text style={r.primaryText}>{actionLabel}</Text><Text style={r.primaryArrow}>→</Text></>}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
    <Modal visible={picker !== null} animationType="slide" onRequestClose={() => { Keyboard.dismiss(); setPicker(null); }}>
      <SafeAreaView style={r.safe}><KeyboardAvoidingView style={r.pickerPage} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={r.pickerHeader}><Text accessibilityRole="header" style={r.pickerTitle}>{picker === "university" ? "Find your university" : "Choose your campus"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close selection" onPress={() => { Keyboard.dismiss(); setPicker(null); }} style={r.back}><Text style={r.chevron}>×</Text></Pressable></View>
        <Input compact label="Search by name" value={search} onChangeText={setSearch} placeholder={picker === "university" ? "University name" : "Campus name"} autoCorrect={false} />
        {loading ? <ActivityIndicator color={colors.green} style={{ margin: 24 }} /> : pickerError ? <View style={r.pickerError}><Text style={r.error}>{pickerError}</Text><Pressable accessibilityRole="button" onPress={() => { setPickerRetry(current => current + 1); }}><Text style={r.textLink}>Try again</Text></Pressable></View> : <FlatList data={pickerRows} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 24 }} ListEmptyComponent={<Text style={r.subtitle}>No matching {picker === "university" ? "universities" : "campuses"}. Try another name.</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Select ${item.name}`} onPress={() => {
          if (picker === "university") { if (details.universityId !== item.id) { setCampusRows([]); setCampusLoadedFor(""); setCampusError(""); setDetails(current => ({ ...current, universityId: item.id, campusId: "" })); } }
          else update("campusId", item.id);
          setError(""); Keyboard.dismiss(); setPicker(null);
        }} style={r.pickerRow}><View style={r.flex}><Text style={r.pickerName}>{item.name}</Text>{"city" in item && <Text style={r.pickerMeta}>{[item.city, item.state].filter(Boolean).join(", ")}</Text>}</View><Text style={r.chevron}>›</Text></Pressable>} />}
      </KeyboardAvoidingView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const r = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: "100%", maxWidth: 540, alignSelf: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  pageCompact: { paddingTop: 8, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 8 },
  identity: { flexDirection: "row", alignItems: "center", gap: 7 }, wordmark: { fontFamily: fonts.extra, fontSize: 18, color: colors.ink, letterSpacing: -0.7 },
  roleBadge: { backgroundColor: "#EBEDE5", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20 }, roleText: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 0.8, color: "#53665A" },
  card: { flex: 1, maxHeight: 760, backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 28, padding: 24, boxShadow: "0px 8px 32px rgba(23,47,59,0.05)" },
  cardCompact: { padding: 18, borderRadius: 24 }, progressHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { minWidth:76,height:44, borderRadius: 12, backgroundColor: "#F4F4EF", alignItems: "center", justifyContent: "center" }, backText: { fontSize:14, lineHeight: 31, color: colors.ink },
  stepLabel: { flex: 1, color: colors.ink, fontFamily: fonts.bold, fontSize: 12 }, count: { color: colors.green, fontFamily: fonts.bold, fontSize: 12 },
  progress: { flexDirection: "row", gap: 5, marginTop: 16, marginBottom: 22 }, segment: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#ECEEE7" }, segmentActive: { backgroundColor: colors.green },
  heading: { marginBottom: 24 }, title: { color: colors.ink, fontFamily: fonts.extra, fontSize: 29, lineHeight: 36, letterSpacing: -1 }, subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, marginTop: 8 },
  fields: { flexShrink: 0 }, field: { marginBottom: 16 }, label: { color: "#5C686F", fontFamily: fonts.bold, fontSize: 11, marginBottom: 7 },
  input: { minHeight: 54, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: "#FCFCF9", paddingHorizontal: 14, paddingVertical: 15, fontFamily: fonts.medium, fontSize: 14, color: colors.ink }, inputFocused: { borderColor: colors.green, backgroundColor: "white" },
  select: { minHeight: 56, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FCFCF9", marginBottom: 16 }, selectText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink }, placeholder: { color: "#8B9497" }, chevron: { fontSize: 23, color: colors.green },
  passwordLabel: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }, textLink: { color: colors.green, fontFamily: fonts.bold, fontSize: 11 },
  campusStatus: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 14 }, campusStatusText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  campusError: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 13, borderRadius: 13, backgroundColor: "#FFF0ED", marginBottom: 12 }, campusErrorText: { flex: 1, color: "#A63527", fontFamily: fonts.medium, fontSize: 11 }, campusEmpty: { padding: 12, borderRadius: 13, backgroundColor: "#F2F3EB", color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 17, marginBottom: 12 },
  footer: { marginTop: "auto", paddingTop: 10 }, primary: { minHeight: 52, borderRadius: 15, backgroundColor: colors.navy, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 18, gap: 14 }, primaryText: { color: "white", fontFamily: fonts.bold, fontSize: 13 }, primaryArrow: { color: "#F2D5AD", fontSize: 22 },
  error: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, color: "#A63527", marginBottom: 10 }, login: { alignItems: "center", paddingVertical: 16 }, loginText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11 },
  sentTo: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, marginBottom: 18 }, strong: { color: colors.ink, fontFamily: fonts.bold }, otp: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: 8, textAlign: "center" }, resend: { alignItems: "center", paddingVertical: 12 },
  pickerPage: { flex: 1, width: "100%", maxWidth: 540, alignSelf: "center", paddingHorizontal: 22, paddingTop: 16 }, pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }, pickerTitle: { flex: 1, color: colors.ink, fontFamily: fonts.extra, fontSize: 23, letterSpacing: -0.6 }, pickerError: { padding: 16, borderRadius: 15, backgroundColor: "#FFF0ED" }, pickerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 18, borderBottomWidth: 1, borderColor: colors.line, gap: 12 }, pickerName: { color: colors.ink, fontFamily: fonts.bold, fontSize: 14 }, pickerMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, marginTop: 5 },
});
