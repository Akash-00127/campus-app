import { enablePush, pushUnavailableReason } from "../../src/notifications";
import { useCallback, useState, useRef, useEffect } from "react";
import { useFocusEffect, router } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { campuses, mediaUrl, request, requestPhoneChangeOtp, universities, type Campus, type Profile, type University } from "../../src/api";
import { useSession, type AccountSection } from "../../src/session";
import { Button, Field, Notice, Screen, Title, s } from "../../src/ui";
type Note = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  orderId?: string;
};
type Ticket = { id: string; subject: string; status: string; reply?: string };
export default function ProfileScreen() {
  const { session, signOut, forget, accountSection: section, setAccountSection } = useSession();
  const pushSubscription = useRef<{ remove: () => void } | null>(null);
  const noticeRef = useRef("");
  const focusedRef = useRef(false);
  useEffect(() => () => pushSubscription.current?.remove(), []);
  const pushReason = pushUnavailableReason();
  const token = session!.accessToken;
  const vendor = session!.user.role === "VENDOR";
  const [profile, setProfile] = useState<Profile>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [universityOptions, setUniversityOptions] = useState<University[]>([]);
  const [campusOptions, setCampusOptions] = useState<Campus[]>([]);
  const [universitySearch, setUniversitySearch] = useState("");
  const [personalEditing, setPersonalEditing] = useState(false);
  const [universityLoading, setUniversityLoading] = useState(false);
  const [campusLoading, setCampusLoading] = useState(false);
  const [universityPickerOpen, setUniversityPickerOpen] = useState(false);
  const [campusPickerOpen, setCampusPickerOpen] = useState(false);
  const [shop, setShop] = useState("");
  const [description, setDescription] = useState("");
  const [minutes, setMinutes] = useState("15");
  const [allDay, setAllDay] = useState(true);
  const [opens, setOpens] = useState("09:00");
  const [closes, setCloses] = useState("22:00");
  const [logo, setLogo] = useState("");
  const [cover, setCover] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpChallenge, setPhoneOtpChallenge] = useState("");
  const [phoneOtpTarget, setPhoneOtpTarget] = useState("");
  const [phoneOtpExpiresAt, setPhoneOtpExpiresAt] = useState(0);
  const [phoneOtpRemaining, setPhoneOtpRemaining] = useState(0);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [label, setLabel] = useState("");
  const [building, setBuilding] = useState("");
  const [details, setDetails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"info" | "success" | "error">("info");
  const [passwordError, setPasswordError] = useState("");
  const [deletionConfirmOpen, setDeletionConfirmOpen] = useState(false);
  const [campusConfirmOpen, setCampusConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const campusLoadId = useRef(0);
  useEffect(() => {
    if (!phoneOtpExpiresAt) {
      setPhoneOtpRemaining(0);
      return;
    }
    const updateRemaining = () => setPhoneOtpRemaining(Math.max(0, Math.ceil((phoneOtpExpiresAt - Date.now()) / 1000)));
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [phoneOtpExpiresAt]);
  function showNotice(text: string, tone: "info" | "success" | "error" = "info") {
    noticeRef.current = text;
    setNotice(text);
    setNoticeTone(tone);
  }
  useEffect(() => {
    noticeRef.current = "";
    setNotice("");
    setNoticeTone("info");
    if (section !== "SECURITY") {
      setCurrent("");
      setPassword("");
      setPasswordError("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    }
  }, [section]);
  const load = useCallback(async () => {
    try {
      const [profileResult, notesResult, ticketsResult] = await Promise.allSettled([
        request<Profile>("/auth/me", token),
        request<Note[]>("/notifications", token),
        request<Ticket[]>("/support", token),
      ]);
      if (profileResult.status !== "fulfilled") throw profileResult.reason;
      const p = profileResult.value;
      setProfile(p);
      setName(p.name);
      setEmail(p.email);
      setPhone(p.phone || "");
      setUniversityId(p.universityId || p.university?.id || "");
      setCampusId(p.campusId || p.campus?.id || "");
      setShop(p.vendor?.name || "");
      setDescription(p.vendor?.description || "");
      setMinutes(String(p.vendor?.preparationMinutes || 15));
      setAllDay(p.vendor?.operatingHours?.alwaysOpen ?? true);
      setOpens(p.vendor?.operatingHours?.open || "09:00");
      setCloses(p.vendor?.operatingHours?.close || "22:00");
      setLogo(p.vendor?.logo || "");
      setCover(p.vendor?.coverImage || "");
      if (notesResult.status === "fulfilled") setNotes(notesResult.value);
      if (ticketsResult.status === "fulfilled") setTickets(ticketsResult.value);
      if (focusedRef.current && (notesResult.status === "rejected" || ticketsResult.status === "rejected") && !noticeRef.current) {
        showNotice("Some account information couldn’t be refreshed. Reopen this page to try again.", "info");
      }
    } catch (e) {
      if (focusedRef.current && !noticeRef.current) showNotice((e as Error).message, "error");
    }
  }, [token]);
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      void load();
      return () => {
        focusedRef.current = false;
        noticeRef.current = "";
        setNotice("");
        setNoticeTone("info");
      };
    }, [load]),
  );
  async function loadCampuses(university: string, preferredCampus = "") {
    const requestId = ++campusLoadId.current;
    setCampusLoading(true);
    setCampusOptions([]);
    try {
      const rows = await campuses(university);
      if (requestId !== campusLoadId.current) return;
      setCampusOptions(rows);
      if (rows.length === 1) setCampusId(rows[0].id);
      else setCampusId(rows.some((campus) => campus.id === preferredCampus) ? preferredCampus : "");
    } catch (error) {
      if (requestId === campusLoadId.current) showNotice(error instanceof Error ? error.message : "Could not load campuses.", "error");
    } finally {
      if (requestId === campusLoadId.current) setCampusLoading(false);
    }
  }
  async function beginPersonalEdit() {
    if (!profile) return;
    setPersonalEditing(true);
    setUniversityLoading(true);
    setUniversityOptions([]);
    setCampusOptions([]);
    setUniversitySearch("");
    setUniversityPickerOpen(false);
    setCampusPickerOpen(false);
    const selectedUniversity = profile.universityId || profile.university?.id;
    setCampusLoading(Boolean(selectedUniversity));
    showNotice("");
    try {
      setUniversityOptions(await universities());
      const selectedCampus = profile.campusId || profile.campus?.id || "";
      if (selectedUniversity) await loadCampuses(selectedUniversity, selectedCampus);
    } catch (error) {
      setCampusLoading(false);
      showNotice(error instanceof Error ? error.message : "Could not load universities.", "error");
    } finally {
      setUniversityLoading(false);
    }
  }
  async function chooseUniversity(id: string) {
    setUniversityId(id);
    setCampusConfirmOpen(false);
    setUniversityPickerOpen(false);
    setUniversitySearch("");
    setCampusPickerOpen(false);
    setCampusId("");
    await loadCampuses(id);
  }
  function cancelPersonalEdit() {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setPhone(profile.phone || "");
      setUniversityId(profile.universityId || profile.university?.id || "");
      setCampusId(profile.campusId || profile.campus?.id || "");
    }
    campusLoadId.current += 1;
    setCampusLoading(false);
    setPersonalEditing(false);
    setUniversityPickerOpen(false);
    setCampusPickerOpen(false);
    setPhoneOtp("");
    setPhoneOtpChallenge("");
    setPhoneOtpTarget("");
    setPhoneOtpExpiresAt(0);
    setCampusConfirmOpen(false);
  }
  function openPersonalDetails() {
    setPersonalEditing(false);
    navigateSection("ACCOUNT");
  }
  function navigateSection(next: AccountSection) {
    if (section === "ACCOUNT" && personalEditing && next !== "ACCOUNT") cancelPersonalEdit();
    showNotice("");
    setAccountSection(next);
  }
  async function save(path: string, body: unknown, method = "PATCH"): Promise<boolean> {
    if (path === "/auth/profile" && !name.trim()) {
      showNotice("Enter your name before saving.", "error");
      return false;
    }
    if ((path === "/auth/profile" || path === "/addresses") && !/^\d{10}$/.test(phone)) {
      showNotice("Enter a valid 10-digit phone number.", "error");
      return false;
    }
    if (path === "/support" && (!subject.trim() || !message.trim())) {
      showNotice("Add a subject and a message so our team can help.", "error");
      return false;
    }
    setBusy(true);
    showNotice("");
    try {
      await request(path, token, method, body);
      showNotice(path === "/support" ? "Your support request was sent." : "Saved successfully.", "success");
      if (path === "/support") { setSubject(""); setMessage(""); }
      await load();
      return true;
    } catch (e) {
      showNotice((e as Error).message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function sendPhoneVerificationCode() {
    if (!name.trim()) {
      showNotice("Enter your name before saving.", "error");
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      showNotice("Enter a valid 10-digit phone number.", "error");
      return;
    }
    if (phone.trim() === (profile?.phone || "")) {
      showNotice("Enter a different phone number to verify it.", "error");
      return;
    }
    setBusy(true);
    showNotice("");
    try {
      const result = await requestPhoneChangeOtp(phone.trim(), token);
      setPhoneOtpTarget(phone.trim());
      setPhoneOtpChallenge(result.challenge);
      setPhoneOtp(result.demoOtp || "");
      setPhoneOtpExpiresAt(Date.now() + result.expiresInSeconds * 1000);
      showNotice(`Verification code requested for +91 ${phone.trim()}. Enter it below to save your new number.`, "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not send the verification code.", "error");
    } finally {
      setBusy(false);
    }
  }
  async function saveProfile() {
    if (name.trim().length < 2) {
      showNotice("Enter your full name.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showNotice("Enter a valid email address.", "error");
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      showNotice("Enter a valid 10-digit phone number.", "error");
      return;
    }
    const currentUniversityId = profile?.universityId || profile?.university?.id || "";
    const currentCampusId = profile?.campusId || profile?.campus?.id || "";
    const changingCampus = universityId !== currentUniversityId || campusId !== currentCampusId;
    if (!universityId || !campusId || (changingCampus && !campusOptions.some((campus) => campus.id === campusId))) {
      showNotice("Select a university and one of its available campuses.", "error");
      return;
    }
    const updates: { name: string; email: string; phone: string; universityId?: string; campusId?: string } = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    };
    if (changingCampus) {
      updates.universityId = universityId;
      updates.campusId = campusId;
    }
    if (phone.trim() !== (profile?.phone || "")) {
      if (!phoneOtpChallenge || phoneOtpTarget !== phone.trim()) {
        await sendPhoneVerificationCode();
        return;
      }
      if (phoneOtpRemaining <= 0) {
        setPhoneOtpChallenge("");
        setPhoneOtpTarget("");
        setPhoneOtp("");
        setPhoneOtpExpiresAt(0);
        await sendPhoneVerificationCode();
        return;
      }
      if (!/^\d{6}$/.test(phoneOtp)) {
        showNotice("Enter the six-digit verification code.", "error");
        return;
      }
      const saved = await save("/auth/profile", {
        ...updates,
        otp: phoneOtp,
        otpChallenge: phoneOtpChallenge,
      });
      if (saved) {
        setPersonalEditing(false);
        setPhoneOtp("");
        setPhoneOtpChallenge("");
        setPhoneOtpTarget("");
        setPhoneOtpExpiresAt(0);
      }
      return;
    }
    if (await save("/auth/profile", updates)) setPersonalEditing(false);
  }
  function confirmProfileSave() {
    if (!vendor || !campusChanged) {
      void saveProfile();
      return;
    }
    if (phoneChanged && (!phoneOtpChallenge || phoneOtpTarget !== phone.trim() || phoneOtpRemaining <= 0)) {
      void saveProfile();
      return;
    }
    setCampusConfirmOpen(true);
  }
  async function createDeletionRequest() {
    if (busy) return;
    setBusy(true);
    showNotice("");
    try {
      await request("/support", token, "POST", {
        subject: "Account deletion request",
        message: "Please review my request to delete this Campus Drop account. I understand this request does not immediately delete my account and that support may contact me to confirm.",
      });
      setDeletionConfirmOpen(false);
      showNotice("Account deletion request sent. Your account remains active while support reviews it.", "success");
      await load();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not send the account deletion request.", "error");
    } finally {
      setBusy(false);
    }
  }
  function confirmDeletionRequest() {
    if (busy) return;
    setDeletionConfirmOpen(true);
  }
  async function leaveAccount(switchAccount = false) {
    if (busy) return;
    setBusy(true);
    showNotice("");
    try {
      // signOut clears the local session even if the backend is unreachable.
      await signOut().catch(() => forget());
      if (switchAccount) {
        router.replace({ pathname: "/login", params: { role: vendor ? "VENDOR" : "STUDENT" } });
      } else {
        router.replace("/welcome");
      }
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not sign out. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }
  async function changePassword() {
    setPasswordError("");
    if (!current) {
      showNotice("Enter your current password.", "error");
      return;
    }
    if (password.length < 8) {
      showNotice("Your new password must be at least 8 characters.", "error");
      return;
    }
    setBusy(true);
    showNotice("");
    try {
      await request("/auth/password", token, "POST", {
        currentPassword: current,
        newPassword: password,
      });
      await forget();
      router.replace("/welcome");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not change your password.";
      if (/current.?password/i.test(message) && /(incorrect|invalid|wrong|does not match)/i.test(message)) {
        setPasswordError("Current password is incorrect. Please check it and try again.");
        showNotice("");
      } else {
        showNotice(message, "error");
      }
    } finally {
      setBusy(false);
    }
  }
  const unreadCount = notes.filter((item) => !item.read).length;
  const overviewTitle = section === "OVERVIEW";
  const phoneChanged = phone.trim() !== (profile?.phone || "");
  const campusChanged = universityId !== (profile?.universityId || profile?.university?.id || "") || campusId !== (profile?.campusId || profile?.campus?.id || "");
  const selectedUniversity = universityOptions.find((item) => item.id === universityId) || profile?.university;
  const selectedCampus = campusOptions.find((item) => item.id === campusId) || (universityId === (profile?.universityId || profile?.university?.id) ? profile?.campus : undefined);
  const visibleUniversities = universityOptions.filter((item) => item.name.toLowerCase().includes(universitySearch.trim().toLowerCase())).slice(0, 25);
  const sectionSubtitle = section === "OVERVIEW"
    ? "Everything you need to manage your Campus Drop account."
    : section === "ACCOUNT"
      ? "Update your name and verify a new phone number."
      : section === "DETAILS"
        ? vendor ? "Keep your shop details and hours up to date." : "Manage where your campus orders are delivered."
        : section === "NOTIFICATIONS"
          ? "Stay up to date with order and account activity."
          : section === "SUPPORT"
            ? "Send a message and follow replies from our team."
            : "Manage your password and keep your account secure.";
  return (
    <Screen>
      <Title
        eyebrow={vendor ? "YOUR SHOP & ACCOUNT" : "YOUR CAMPUS ACCOUNT"}
        title={overviewTitle ? "Account" : section === "ACCOUNT" ? "Personal details" : section === "DETAILS" ? vendor ? "Shop profile" : "Delivery details" : section === "NOTIFICATIONS" ? "Notifications" : section === "SUPPORT" ? "Help & support" : "Security"}
        subtitle={sectionSubtitle}
      />
      {notice ? (
        <View accessibilityLiveRegion="polite" style={[p.feedback, noticeTone === "success" ? p.feedbackSuccess : noticeTone === "error" ? p.feedbackError : p.feedbackInfo]}>
          <Text style={[p.feedbackText, noticeTone === "success" ? p.feedbackSuccessText : noticeTone === "error" ? p.feedbackErrorText : p.feedbackInfoText]}>{notice}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss account message" hitSlop={10} onPress={() => showNotice("")}><Text style={p.feedbackClose}>×</Text></Pressable>
        </View>
      ) : null}
      {section !== "OVERVIEW" && <Pressable accessibilityRole="button" onPress={() => navigateSection("OVERVIEW")} style={p.back}><Text style={p.backText}>←  Account home</Text></Pressable>}
      {section === "OVERVIEW" && <>
      <View style={p.hero}>
        {profile?.photo ? <Image source={{ uri: mediaUrl(profile.photo) }} style={p.photo} /> : <View style={p.avatar}><Text style={p.avatarText}>{profile?.name?.slice(0, 1).toUpperCase() || "C"}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={p.name}>{profile?.name || "Campus Drop member"}</Text>
          <Text numberOfLines={1} style={p.email}>{profile?.email || "Your account"}</Text>
          <View style={p.roleRow}><Text style={p.role}>{vendor ? "VENDOR" : "STUDENT"}</Text><Text style={p.verified}>{profile?.verified ? "✓ VERIFIED" : "CAMPUS MEMBER"}</Text></View>
        </View>
          <Pressable accessibilityRole="button" accessibilityLabel="View personal details" onPress={openPersonalDetails} style={p.edit}><Text style={p.editText}>Details</Text></Pressable>
      </View>
      <View style={p.campusCard}><View style={p.campusMark}><Text style={p.campusMarkText}>⌂</Text></View><View style={{ flex: 1 }}><Text style={p.cardEyebrow}>YOUR CAMPUS</Text><Text numberOfLines={1} style={p.campusName}>{profile?.campus?.name || "Campus not set"}</Text><Text numberOfLines={1} style={p.campusMeta}>{profile?.university?.name || "Choose your university"}</Text></View></View>
      <View style={p.quickRow}>
        {(vendor ? [
          { icon: "≡", title: "Orders", onPress: () => router.push("/(tabs)/orders") },
          { icon: "▦", title: "Products", onPress: () => router.push("/(tabs)/cart") },
          { icon: "⌂", title: "Shop", onPress: () => navigateSection("DETAILS") },
        ] : [
          { icon: "♡", title: "Saved", onPress: () => router.push("/saved") },
          { icon: "⌖", title: "Addresses", onPress: () => router.push({ pathname: "/addresses", params: { origin: "account" } }) },
          { icon: "≡", title: "Orders", onPress: () => router.push("/(tabs)/orders") },
        ]).map((item) => <Pressable key={item.title} accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [p.quickCard, pressed && { opacity: 0.75 }]}><Text style={p.quickIcon}>{item.icon}</Text><Text style={p.quickTitle}>{item.title}</Text></Pressable>)}
      </View>
      <Text style={p.groupTitle}>ACCOUNT SETTINGS</Text>
      <View style={p.group}>
        <AccountRow icon="◉" title="Personal details" subtitle="Name, email, phone and campus" onPress={openPersonalDetails} />
        {vendor && <AccountRow icon="⌂" title="Shop profile" subtitle="Store details, hours and preparation time" onPress={() => navigateSection("DETAILS")} />}
        <AccountRow icon="♧" title="Notifications" subtitle="Order updates and account alerts" badge={unreadCount ? String(unreadCount) : undefined} onPress={() => navigateSection("NOTIFICATIONS")} />
        {!vendor && <AccountRow icon="⌖" title="Delivery addresses" subtitle="Manage your saved campus locations" onPress={() => router.push({ pathname: "/addresses", params: { origin: "account" } })} />}
        <AccountRow icon="◇" title="Security" subtitle="Change your password" onPress={() => navigateSection("SECURITY")} />
        <AccountRow icon="?" title="Help & support" subtitle="Send a message and view replies" onPress={() => navigateSection("SUPPORT")} last />
      </View>
      <Text style={p.groupTitle}>SESSION</Text>
      <View style={p.group}>
        <AccountRow icon="⇄" title="Switch account" subtitle="Sign in with another account" onPress={() => void leaveAccount(true)} />
        <AccountRow icon="⌫" title="Request account deletion" subtitle="Send a deletion request to support" danger onPress={confirmDeletionRequest} />
        <AccountRow icon="↗" title="Log out" subtitle="Sign out of this device" danger onPress={() => void leaveAccount()} last />
      </View>
      {deletionConfirmOpen && <View style={p.deletionPrompt}>
        <View style={p.deletionPromptIcon}><Text style={p.deletionPromptIconText}>!</Text></View>
        <Text style={p.deletionPromptTitle}>Request account deletion?</Text>
        <Text style={p.deletionPromptText}>We’ll send a request to support. Your account remains active until the team reviews and confirms it.</Text>
        <View style={p.editActions}>
          <View style={p.editAction}><Button secondary disabled={busy} onPress={() => setDeletionConfirmOpen(false)}>Cancel</Button></View>
          <View style={p.editAction}><Pressable accessibilityRole="button" disabled={busy} onPress={() => void createDeletionRequest()} style={({ pressed }) => [p.deletionAction, busy && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}><Text style={p.deletionActionText}>{busy ? "Sending…" : "Send request"}</Text></Pressable></View>
        </View>
      </View>}
      </>}
      {section==="ACCOUNT"&&<>
      <View style={[s.card, p.detailCard]}>
        {!personalEditing ? <>
          <View style={p.cardHeading}>
            <View style={p.cardHeadingIcon}><Text style={p.cardHeadingIconText}>◉</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={p.cardHeadingTitle}>Personal profile</Text>
              <Text style={p.cardHeadingSubtitle}>Your details are private to your account.</Text>
            </View>
          </View>
          <ProfileDetailRow label="Full name" value={profile?.name || "Not available"} />
          <ProfileDetailRow label="Email address" value={profile?.email || "Not available"} />
          <ProfileDetailRow label="Phone number" value={profile?.phone ? `+91 ${profile.phone}` : "Not added"} />
          <ProfileDetailRow label="University" value={profile?.university?.name || "Not set"} />
          <ProfileDetailRow label="Campus" value={profile?.campus?.name || "Not set"} last />
          <Button disabled={!profile} onPress={() => void beginPersonalEdit()}>Edit details</Button>
        </> : <>
          <View style={p.cardHeading}>
            <View style={p.cardHeadingIcon}><Text style={p.cardHeadingIconText}>✎</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={p.cardHeadingTitle}>Edit personal details</Text>
              <Text style={p.cardHeadingSubtitle}>Changes apply to your Campus Drop account.</Text>
            </View>
          </View>
          <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />
          <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
          <Field
            label="Phone number"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              if (phoneOtpChallenge && value !== phoneOtpTarget) {
                setPhoneOtpChallenge("");
                setPhoneOtpTarget("");
                setPhoneOtp("");
                setPhoneOtpExpiresAt(0);
                if (notice.startsWith("Verification code requested")) showNotice("The phone number changed. Request a new verification code to continue.", "info");
              }
            }}
            keyboardType="phone-pad"
            autoComplete="tel-national"
          />
          <View style={p.fieldGroup}>
            <Text style={p.selectLabel}>UNIVERSITY</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Choose university" accessibilityState={{ expanded: universityPickerOpen }} disabled={universityLoading} onPress={() => setUniversityPickerOpen((open) => !open)} style={[p.selectField, universityLoading && p.selectDisabled]}>
              <Text numberOfLines={1} style={p.selectValue}>{selectedUniversity?.name || "Choose your university"}</Text>
              <Text style={p.selectArrow}>{universityPickerOpen ? "⌃" : "⌄"}</Text>
            </Pressable>
            {universityLoading && <Text style={p.fieldHint}>Loading university list…</Text>}
            {universityPickerOpen && <View style={p.pickerPanel}>
              <Field label="Search universities" value={universitySearch} onChangeText={setUniversitySearch} placeholder="Type a university name" autoCapitalize="words" />
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={p.pickerList}>
                {visibleUniversities.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => void chooseUniversity(item.id)} style={p.pickerOption}>
                  <Text style={p.pickerOptionTitle}>{item.name}</Text>
                  <Text style={p.pickerOptionMeta}>{[item.city, item.state].filter(Boolean).join(", ")}</Text>
                </Pressable>)}
                {!visibleUniversities.length && <Text style={p.fieldHint}>No matching university found.</Text>}
              </ScrollView>
            </View>}
          </View>
          <View style={p.fieldGroup}>
            <Text style={p.selectLabel}>CAMPUS</Text>
            {campusLoading ? <Text style={p.fieldHint}>Loading campuses…</Text> : campusOptions.length === 1 ? (
              <View style={p.singleCampus}><Text style={p.selectValue}>{campusOptions[0].name}</Text><Text style={p.singleCampusHint}>Only campus available · selected automatically</Text></View>
            ) : campusOptions.length > 1 ? <>
              <Pressable accessibilityRole="button" accessibilityLabel="Choose campus" accessibilityState={{ expanded: campusPickerOpen }} onPress={() => setCampusPickerOpen((open) => !open)} style={p.selectField}>
                <Text numberOfLines={1} style={[p.selectValue, !selectedCampus && p.selectPlaceholder]}>{selectedCampus?.name || "Choose your campus"}</Text>
                <Text style={p.selectArrow}>{campusPickerOpen ? "⌃" : "⌄"}</Text>
              </Pressable>
              {campusPickerOpen && <View style={p.pickerPanel}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={p.pickerList}>
                  {campusOptions.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: campusId === item.id }} onPress={() => { setCampusId(item.id); setCampusPickerOpen(false); setCampusConfirmOpen(false); }} style={[p.pickerOption, campusId === item.id && p.pickerOptionSelected]}>
                    <Text style={p.pickerOptionTitle}>{item.name}</Text>
                  </Pressable>)}
                </ScrollView>
              </View>}
            </> : <View style={p.singleCampus}><Text style={p.selectPlaceholder}>{universityId ? "No active campus available" : "Choose a university first"}</Text></View>}
          </View>
          {campusChanged && <View style={p.verifyHint}><Text style={p.verifyHintIcon}>⌂</Text><Text style={p.verifyHintText}>{vendor ? "Your shop and products will move to this campus. If you change universities, product categories will need to be reassigned." : "Your campus catalog will change. Saved delivery addresses stay with the old campus, so add a new address after switching."}</Text></View>}
          {campusConfirmOpen && <View style={p.campusMovePrompt}>
            <Text style={p.deletionPromptTitle}>Move your shop to {selectedCampus?.name || "the selected campus"}?</Text>
            <Text style={p.deletionPromptText}>Your shop and products will move to this campus.{universityId !== (profile?.universityId || profile?.university?.id) ? " Product categories will need to be reassigned." : ""}</Text>
            <View style={p.editActions}>
              <View style={p.editAction}><Button secondary disabled={busy} onPress={() => setCampusConfirmOpen(false)}>Keep current</Button></View>
              <View style={p.editAction}><Button disabled={busy} onPress={() => { setCampusConfirmOpen(false); void saveProfile(); }}>Continue</Button></View>
            </View>
          </View>}
          {phoneChanged && <View style={p.verifyHint}><Text style={p.verifyHintIcon}>✦</Text><Text style={p.verifyHintText}>A six-digit code is required to confirm a new phone number.</Text></View>}
          {phoneOtpChallenge && phoneOtpTarget === phone.trim() && <View style={p.otpPanel}>
            <Text style={p.otpTitle}>Verify your new number</Text>
            <Text style={p.otpSubtitle}>{phoneOtpRemaining > 0 ? `Enter the verification code for +91 ${phoneOtpTarget}. It expires in ${Math.floor(phoneOtpRemaining / 60)}:${String(phoneOtpRemaining % 60).padStart(2, "0")}.` : "This code has expired. Request a new one to continue."}</Text>
            {phoneOtpRemaining > 0 && <Field label="SIX-DIGIT VERIFICATION CODE" value={phoneOtp} onChangeText={(value) => setPhoneOtp(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />}
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void sendPhoneVerificationCode()} style={p.resendLink}><Text style={p.resendText}>Send a new code</Text></Pressable>
          </View>}
          <View style={p.editActions}>
            <View style={p.editAction}><Button secondary disabled={busy} onPress={cancelPersonalEdit}>Cancel</Button></View>
            <View style={p.editAction}><Button disabled={busy || campusLoading || universityLoading} onPress={confirmProfileSave}>
              {phoneChanged ? phoneOtpChallenge && phoneOtpTarget === phone.trim() && phoneOtpRemaining > 0 ? "Verify & save" : "Send code" : "Save details"}
            </Button></View>
          </View>
        </>}
      </View>
      </>}
      {section==="DETAILS"&&<>
      {vendor ? (
        <View style={[s.card, p.detailCard]}>
          <Text style={s.h2}>Shop profile</Text>
          <Text style={s.muted}>
            {profile?.vendor?.approvalStatus} · {profile?.vendor?.address}
          </Text>
          <Field label="Shop name" value={shop} onChangeText={setShop} />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Field
            label="Preparation time in minutes"
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
          />
          <Button secondary onPress={() => setAllDay(!allDay)}>
            {allDay
              ? "Hours: open all day when enabled"
              : "Hours: daily schedule (IST)"}
          </Button>
          {!allDay && (
            <>
              <Field
                label="Opens · HH:MM, IST"
                value={opens}
                onChangeText={setOpens}
              />
              <Field
                label="Closes · HH:MM, IST (may be next morning)"
                value={closes}
                onChangeText={setCloses}
              />
            </>
          )}
          <Field
            label="Logo HTTPS URL"
            value={logo}
            onChangeText={setLogo}
            autoCapitalize="none"
          />
          <Field
            label="Cover image HTTPS URL"
            value={cover}
            onChangeText={setCover}
            autoCapitalize="none"
          />
          <Button
            disabled={busy}
            onPress={() =>
              void save("/vendor/profile", {
                name: shop,
                description,
                preparationMinutes: Number(minutes),
                logo,
                coverImage: cover,
                operatingHours: {
                  alwaysOpen: allDay,
                  open: opens,
                  close: closes,
                },
              })
            }
          >
            Save shop profile
          </Button>
        </View>
      ) : (
        <View style={[s.card, p.detailCard]}>
          <Text style={s.h2}>Add delivery address</Text>
          <Field
            label="Label · Hostel / Library / Classroom"
            value={label}
            onChangeText={setLabel}
          />
          <Field
            label="Campus building / hostel name"
            value={building}
            onChangeText={setBuilding}
          />
          <Field
            label="Room, floor and delivery instructions"
            value={details}
            onChangeText={setDetails}
          />
          <Button
            disabled={busy}
            onPress={() =>
              void save(
                "/addresses",
                { label, building, details, phone },
                "POST",
              )
            }
          >
            Save delivery address
          </Button>
        </View>
      )}
      </>}
      {section==="NOTIFICATIONS"&&
      <View style={[s.card, p.detailCard]}>
        <Text style={s.h2}>Notifications</Text>
        {pushReason&&<Notice text={pushReason}/>}
        <Button
          secondary
          disabled={busy}
          onPress={() => {
            setBusy(true);
            showNotice("");
            void enablePush(token)
              .then((subscription) => {
                pushSubscription.current?.remove();
                pushSubscription.current = subscription;
                showNotice("Push notifications enabled on this device.", "success");
              })
              .catch((e) => showNotice(e.message, "error"))
              .finally(() => setBusy(false));
          }}
        >
          Enable Android push alerts
        </Button>
        {notes.length ? (
          notes.slice(0, 15).map((n) => (
            <View
              key={n.id}
              style={[p.notificationItem, !n.read && p.notificationUnread]}
            >
              <View style={p.notificationHeading}><Text style={p.notificationTitle}>{n.title}</Text><Text style={[p.notificationState, n.read ? p.notificationRead : p.notificationNew]}>{n.read ? "READ" : "NEW"}</Text></View>
              <Text style={p.notificationBody}>{n.body}</Text>
              {!n.read && (
                <Button
                  secondary
                  disabled={busy}
                  onPress={() => void save(`/notifications/${n.id}/read`, {})}
                >
                  Mark read
                </Button>
              )}
            </View>
          ))
        ) : (
          <Text style={s.muted}>
            Your order and account updates will appear here.
          </Text>
        )}
      </View>
      }
      {section==="SUPPORT"&&
      <View style={[s.card, p.detailCard]}>
        <Text style={s.h2}>Contact support</Text>
        <Field label="Subject" value={subject} onChangeText={setSubject} />
        <Field
          label="How can we help?"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <Button
          disabled={busy}
          onPress={() => void save("/support", { subject, message }, "POST")}
        >
          Send support request
        </Button>
        {tickets.map((t) => (
          <View key={t.id} style={p.ticketCard}>
            <View style={p.notificationHeading}><Text style={p.notificationTitle}>{t.subject}</Text><Text style={p.ticketStatus}>{t.status}</Text></View>
            {t.reply ? <Text style={p.notificationBody}>{t.reply}</Text> : <Text style={p.ticketPending}>Our team will reply here.</Text>}
          </View>
        ))}
      </View>
      }
      {section==="SECURITY"&&<>
      <View style={[s.card, p.detailCard]}>
        <Text style={s.h2}>Account security</Text>
        <Field
          label="Current password"
          value={current}
          onChangeText={(value) => {
            setCurrent(value);
            setPasswordError("");
            if (notice === "Current password is incorrect. Please check it and try again.") showNotice("");
          }}
          secureTextEntry={!showCurrentPassword}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showCurrentPassword ? "Hide current password" : "Show current password"}
              hitSlop={10}
              onPress={() => setShowCurrentPassword((visible) => !visible)}
            >
              <Text style={p.passwordToggle}>{showCurrentPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          }
        />
        {passwordError ? (
          <View accessibilityLiveRegion="polite" style={p.passwordErrorBox}>
            <Text style={p.passwordErrorText}>{passwordError}</Text>
          </View>
        ) : null}
        <Field
          label="New password · at least 8 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showNewPassword}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showNewPassword ? "Hide new password" : "Show new password"}
              hitSlop={10}
              onPress={() => setShowNewPassword((visible) => !visible)}
            >
              <Text style={p.passwordToggle}>{showNewPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          }
        />
        <Button
          secondary
          disabled={busy}
          onPress={() => void changePassword()}
        >
          Change password
        </Button>
      </View>
      </>}
    </Screen>
  );
}
function AccountRow({
  icon,
  title,
  subtitle,
  badge,
  danger = false,
  last = false,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  danger?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [p.accountRow, !last && p.accountRowBorder, pressed && p.pressed]}
    >
      <View style={[p.rowIconWrap, danger && p.rowIconDanger]}>
        <Text style={[p.rowIcon, danger && p.dangerText]}>{icon}</Text>
      </View>
      <View style={p.rowCopy}>
        <Text style={[p.rowTitle, danger && p.dangerText]}>{title}</Text>
        <Text numberOfLines={1} style={p.rowSubtitle}>{subtitle}</Text>
      </View>
      {badge && <Text style={p.badge}>{badge}</Text>}
      <Text style={[p.rowChevron, danger && p.dangerText]}>›</Text>
    </Pressable>
  );
}

function ProfileDetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[p.profileDetailRow, last && p.profileDetailRowLast]}>
      <Text style={p.profileDetailLabel}>{label}</Text>
      <Text style={p.profileDetailValue}>{value}</Text>
    </View>
  );
}

const p = StyleSheet.create({
  feedback: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginVertical: 10 },
  feedbackInfo: { backgroundColor: "#F1F3EE", borderColor: "#E2E7DF" },
  feedbackSuccess: { backgroundColor: "#EAF6EF", borderColor: "#CDE8D7" },
  feedbackError: { backgroundColor: "#FFF0ED", borderColor: "#F3C8BE" },
  feedbackText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  feedbackClose: { color: "#78857D", fontSize: 19, fontWeight: "700", paddingHorizontal: 2 },
  feedbackInfoText: { color: "#4C5D54" },
  feedbackSuccessText: { color: "#236844" },
  feedbackErrorText: { color: "#B33B2E" },
  back: { alignSelf: "flex-start", marginBottom: 14, paddingVertical: 6, paddingRight: 12 },
  backText: { color: "#52645E", fontSize: 13, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  hero: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: "#172033", borderRadius: 24, padding: 18, marginBottom: 14 },
  avatar: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFC857" },
  avatarText: { fontSize: 26, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#172033" },
  photo: { width: 60, height: 60, borderRadius: 20 },
  name: { fontSize: 19, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFFFFF" },
  email: { fontSize: 11, color: "#D4E0DB", marginTop: 3 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  role: { fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 0.6, color: "#FFD9CA", backgroundColor: "#2A354D", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, overflow: "hidden" },
  verified: { fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 0.3, color: "#D9F0E4", backgroundColor: "#315847", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, overflow: "hidden" },
  edit: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#FF6B35" },
  editText: { fontSize: 11, color: "#FFFFFF", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  campusCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 15, marginBottom: 14, borderWidth: 1, borderColor: "#E8E9E2" },
  campusMark: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFF1EB" },
  campusMarkText: { color: "#FF6B35", fontSize: 20, fontWeight: "700" },
  cardEyebrow: { color: "#85918A", fontSize: 9, fontWeight: "800", letterSpacing: 1, fontFamily: "PlusJakartaSans_800ExtraBold" },
  campusName: { color: "#172033", fontSize: 14, fontWeight: "800", marginTop: 3, fontFamily: "PlusJakartaSans_800ExtraBold" },
  campusMeta: { color: "#758078", fontSize: 11, marginTop: 2 },
  detailCard: { padding: 19, borderRadius: 22, borderColor: "#E6E9E2", boxShadow: "0px 6px 22px rgba(23,47,59,0.045)" },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 17 },
  cardHeadingIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1EB" },
  cardHeadingIconText: { color: "#FF6B35", fontSize: 19, fontWeight: "700" },
  cardHeadingTitle: { color: "#172033", fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  cardHeadingSubtitle: { color: "#87918B", fontSize: 10, marginTop: 3 },
  profileDetailRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7EBE4" },
  profileDetailRowLast: { borderBottomWidth: 0, marginBottom: 4 },
  profileDetailLabel: { color: "#89938D", fontSize: 9, fontWeight: "800", letterSpacing: 0.8, fontFamily: "PlusJakartaSans_800ExtraBold" },
  profileDetailValue: { color: "#172033", fontSize: 13, fontWeight: "700", marginTop: 4, fontFamily: "PlusJakartaSans_700Bold" },
  emailCard: { backgroundColor: "#F7F8F4", borderColor: "#E8EAE4", borderWidth: 1, borderRadius: 15, padding: 13, marginBottom: 17 },
  emailValue: { color: "#34483F", fontSize: 12, fontWeight: "700", marginTop: 4, fontFamily: "PlusJakartaSans_700Bold" },
  fieldGroup: { marginBottom: 14 },
  selectLabel: { fontSize: 12, fontWeight: "700", color: "#737B8C", marginBottom: 7, fontFamily: "PlusJakartaSans_700Bold" },
  selectField: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E0E5DE", borderRadius: 16, backgroundColor: "#FFFFFF", paddingHorizontal: 15, paddingVertical: 12 },
  selectDisabled: { opacity: 0.65 },
  selectValue: { flex: 1, color: "#283B33", fontSize: 13, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  selectPlaceholder: { color: "#8A948B", fontWeight: "400" },
  selectArrow: { color: "#79867D", fontSize: 17, fontWeight: "700" },
  fieldHint: { color: "#87918B", fontSize: 11, lineHeight: 16, marginTop: 7 },
  pickerPanel: { borderWidth: 1, borderColor: "#E4E8E1", borderRadius: 17, backgroundColor: "#FCFCFA", padding: 11, marginTop: 8 },
  pickerList: { maxHeight: 210 },
  pickerOption: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E6EAE3", paddingHorizontal: 9, paddingVertical: 11 },
  pickerOptionSelected: { backgroundColor: "#EEF5EF", borderRadius: 10 },
  pickerOptionTitle: { color: "#172033", fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  pickerOptionMeta: { color: "#89938D", fontSize: 10, marginTop: 3 },
  singleCampus: { borderWidth: 1, borderColor: "#E6EAE3", borderRadius: 15, backgroundColor: "#F7F8F4", paddingHorizontal: 14, paddingVertical: 12 },
  singleCampusHint: { color: "#7D8A80", fontSize: 10, marginTop: 4 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 2 },
  editAction: { flex: 1 },
  verifyHint: { flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: "#F9F3E8", marginBottom: 14 },
  verifyHintIcon: { color: "#A36E32", fontSize: 15 },
  verifyHintText: { flex: 1, color: "#725B3A", fontSize: 11, lineHeight: 16 },
  otpPanel: { backgroundColor: "#F5F7F2", borderWidth: 1, borderColor: "#E3E9E1", borderRadius: 17, padding: 14, marginBottom: 12 },
  otpTitle: { color: "#172033", fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  otpSubtitle: { color: "#78857D", fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 13 },
  resendLink: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 3, marginTop: -6 },
  resendText: { color: "#4F6B59", fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  notificationItem: { borderRadius: 16, borderWidth: 1, borderColor: "#E8EAE4", backgroundColor: "#FFFFFF", padding: 14, marginTop: 12 },
  notificationUnread: { backgroundColor: "#FBFCF8", borderColor: "#DDE7DA" },
  notificationHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  notificationTitle: { flex: 1, color: "#172033", fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  notificationState: { overflow: "hidden", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  notificationNew: { color: "#286344", backgroundColor: "#E4F2E8" },
  notificationRead: { color: "#758078", backgroundColor: "#F0F2ED" },
  notificationBody: { color: "#69786F", fontSize: 11, lineHeight: 17, marginTop: 7 },
  ticketCard: { borderTopWidth: 1, borderTopColor: "#E9ECE6", marginTop: 18, paddingTop: 16 },
  ticketStatus: { overflow: "hidden", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, color: "#596C60", backgroundColor: "#F0F3EE", fontSize: 9, fontWeight: "800" },
  ticketPending: { color: "#89938D", fontSize: 11, marginTop: 7 },
  quickRow: { flexDirection: "row", gap: 9, marginBottom: 22 },
  quickCard: { flex: 1, minHeight: 82, alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E8E9E2", paddingVertical: 11 },
  quickIcon: { fontSize: 19, color: "#FF6B35", fontWeight: "700" },
  quickTitle: { color: "#172033", fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  groupTitle: { color: "#89938D", fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 9, fontFamily: "PlusJakartaSans_800ExtraBold" },
  group: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8E9E2", borderRadius: 20, paddingHorizontal: 14, marginBottom: 21 },
  deletionPrompt: { backgroundColor: "#FFF9F6", borderWidth: 1, borderColor: "#F0D6CE", borderRadius: 20, padding: 16, marginTop: -8, marginBottom: 20 },
  campusMovePrompt: { backgroundColor: "#F9F5EB", borderWidth: 1, borderColor: "#EDE2CB", borderRadius: 17, padding: 14, marginBottom: 14 },
  deletionPromptIcon: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#FFE8E0", marginBottom: 10 },
  deletionPromptIconText: { color: "#B34D39", fontSize: 17, fontWeight: "800" },
  deletionPromptTitle: { color: "#422E28", fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  deletionPromptText: { color: "#816B63", fontSize: 11, lineHeight: 17, marginTop: 5 },
  deletionAction: { minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 16, paddingHorizontal: 12, backgroundColor: "#B34D39", marginTop: 8 },
  deletionActionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  accountRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  accountRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E9ECE6" },
  pressed: { opacity: 0.68 },
  rowIconWrap: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1EB" },
  rowIconDanger: { backgroundColor: "#FFF0EC" },
  rowIcon: { color: "#FF6B35", fontSize: 16, fontWeight: "700" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#172033", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  rowSubtitle: { color: "#87918B", fontSize: 10, marginTop: 3 },
  badge: { overflow: "hidden", minWidth: 21, textAlign: "center", color: "#FFFFFF", backgroundColor: "#FF6B35", borderRadius: 11, paddingHorizontal: 6, paddingVertical: 3, fontSize: 10, fontWeight: "800" },
  rowChevron: { color: "#A5AEA8", fontSize: 22, marginLeft: 1, marginRight: 3 },
  dangerText: { color: "#B34D39" },
  passwordToggle: { color: "#526B5F", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", paddingHorizontal: 4, paddingVertical: 8 },
  passwordErrorBox: { backgroundColor: "#FFF0ED", borderWidth: 1, borderColor: "#F3C8BE", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: -5, marginBottom: 12 },
  passwordErrorText: { color: "#B33B2E", fontSize: 12, lineHeight: 17, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
});



