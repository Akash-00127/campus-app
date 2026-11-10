import { enablePush, pushUnavailableReason } from "../../src/notifications";
import { useCallback, useState, useRef, useEffect, type ReactNode } from "react";
import { useFocusEffect, router } from "expo-router";
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Camera from "lucide-react-native/icons/camera";
import Bell from "lucide-react-native/icons/bell";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CircleHelp from "lucide-react-native/icons/circle-help";
import FileText from "lucide-react-native/icons/file-text";
import Headphones from "lucide-react-native/icons/headphones";
import Mail from "lucide-react-native/icons/mail";
import MessageCircle from "lucide-react-native/icons/message-circle";
import PhoneCall from "lucide-react-native/icons/phone-call";
import Send from "lucide-react-native/icons/send";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import Languages from "lucide-react-native/icons/languages";
import LockKeyhole from "lucide-react-native/icons/lock-keyhole";
import LogOut from "lucide-react-native/icons/log-out";
import MapPin from "lucide-react-native/icons/map-pin";
import Moon from "lucide-react-native/icons/moon";
import PencilLine from "lucide-react-native/icons/pencil-line";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import Store from "lucide-react-native/icons/store";
import TicketPercent from "lucide-react-native/icons/ticket-percent";
import Trash2 from "lucide-react-native/icons/trash-2";
import UserRound from "lucide-react-native/icons/user-round";
import WalletCards from "lucide-react-native/icons/wallet-cards";
import type { LucideIcon } from "lucide-react-native";
import { campuses, mediaUrl, request, requestPhoneChangeOtp, universities, type Campus, type Profile, type University } from "../../src/api";
import { useSession, type AccountSection } from "../../src/session";
import { Button, Field, Notice, Screen, ThemeContent, Title, colors, s } from "../../src/ui";
import { usePreferences, type DiscoveryPreferences } from "../../src/preferences";
import { useAppTheme } from "../../src/theme";
import { useProfilePhoto } from "../../src/profile-photo";
type Note = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  orderId?: string;
};
type Ticket = { id: string; subject: string; status: string; reply?: string };
type HelpTopic = "All" | "Orders" | "Refunds" | "Delivery";
type QueryTopic = "General" | Exclude<HelpTopic, "All">;
const helpTopics: HelpTopic[] = ["All", "Orders", "Refunds", "Delivery"];
const queryTopics: QueryTopic[] = ["General", "Orders", "Refunds", "Delivery"];
const supportEmail = "campus@drop.com";
const supportPhone = "+919876543210";
const supportFaqs: { id: string; topic: Exclude<HelpTopic, "All">; question: string; answer: string }[] = [
  { id: "track", topic: "Orders", question: "Where can I track my order?", answer: "Open Orders from the bottom navigation and select your active order to see its latest status. If the status has not changed for a while, send us your order number in the form above." },
  { id: "change", topic: "Orders", question: "Can I change or cancel an order?", answer: "Check your order details for available actions. Once a shop has started preparing your order, a change may no longer be possible. Send us the order number as soon as you need help." },
  { id: "missing", topic: "Orders", question: "An item is missing or incorrect. What should I do?", answer: "Send a query with your order number, the item name, and a short description of what arrived. A photo can help our team review the issue if they request one." },
  { id: "refund", topic: "Refunds", question: "How do I request a refund?", answer: "Choose Refunds in the query form, include your order number, and explain the issue. Our team will review the order and reply in Your requests below." },
  { id: "refund-time", topic: "Refunds", question: "When will I receive a refund?", answer: "Refund timing depends on the payment method and the outcome of the review. Send us your order number if you need an update; we will reply to your request here." },
  { id: "cancel-refund", topic: "Refunds", question: "Will I be charged for a cancelled order?", answer: "Check the payment and cancellation status in your order details. If a payment was collected and you think it should be returned, submit a refund query with your order number." },
  { id: "delivery-time", topic: "Delivery", question: "When will my order arrive?", answer: "Your active order shows its current delivery progress. Preparation and travel times can vary by shop and campus conditions." },
  { id: "delivery-address", topic: "Delivery", question: "Can I update my delivery location?", answer: "You can manage saved locations in Account → Saved Addresses before checkout. For an order already placed, contact us with your order number and the new location as soon as possible." },
  { id: "delivery-missed", topic: "Delivery", question: "What if I missed my delivery?", answer: "Check your order status and any calls or messages from the delivery team. Contact support with your order number so we can help with the next step." },
];
export default function ProfileScreen() {
  const { session, signOut, forget, accountSection: section, setAccountSection } = useSession();
  const { preferences, ready: preferencesReady, savePreferences } = usePreferences();
  const { darkMode, ready: themeReady, setDarkMode } = useAppTheme();
  const { photoUri, ready: photoReady, savePhoto, clearPhoto } = useProfilePhoto();
  const [savingPreference, setSavingPreference] = useState(false);
  const [photoOptionsOpen, setPhotoOptionsOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
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
  const [helpTopic, setHelpTopic] = useState<QueryTopic>("General");
  const [faqTopic, setFaqTopic] = useState<HelpTopic>("All");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
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
  async function setAccountAppearance(value: boolean) {
    try {
      await setDarkMode(value);
    } catch (error) {
      console.error("Could not save the appearance preference.", error);
      showNotice("Could not save your appearance preference on this device.", "error");
    }
  }
  async function pickProfilePhoto(source: "camera" | "library") {
    setPhotoOptionsOpen(false);
    setPhotoBusy(true);
    showNotice("");
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showNotice("Allow camera access in your device settings to take a profile photo.", "error");
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: Platform.OS === "web",
      };
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      await savePhoto(result.assets[0]);
      showNotice("Profile photo saved on this device.", "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not save your profile photo.", "error");
    } finally {
      setPhotoBusy(false);
    }
  }
  async function resetProfilePhoto() {
    setPhotoOptionsOpen(false);
    setPhotoBusy(true);
    showNotice("");
    try {
      await clearPhoto();
      showNotice("Your profile is using the default emoji avatar.", "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not remove your profile photo.", "error");
    } finally {
      setPhotoBusy(false);
    }
  }
  function unavailableFeature(title: string, message: string) {
    Alert.alert(title, message, [{ text: "Got it" }]);
  }
  function confirmLogout() {
    if (busy) return;
    Alert.alert(
      "Log out of Campus Drop?",
      "You’ll need to sign in again to order from your campus shops.",
      [
        { text: "Stay signed in", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: () => void leaveAccount() },
      ],
    );
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
  async function openContact(url: string, label: string) {
    try {
      await Linking.openURL(url);
    } catch {
      showNotice(`Could not open ${label} on this device.`, "error");
    }
  }
  async function updatePreference(key: keyof DiscoveryPreferences, value: boolean) {
    setSavingPreference(true);
    showNotice("");
    try {
      await savePreferences({ ...preferences, [key]: value });
      showNotice("Preference saved on this device.", "success");
    } catch {
      showNotice("Couldn’t save your preference. Please try again.", "error");
    } finally {
      setSavingPreference(false);
    }
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
  async function leaveAccount() {
    if (busy) return;
    setBusy(true);
    showNotice("");
    try {
      // signOut clears the local session even if the backend is unreachable.
      await signOut().catch(() => forget());
      router.replace("/welcome");
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
  const remotePhoto = profile?.photo || session?.user.photo;
  const avatarUri = photoUri || (remotePhoto ? mediaUrl(remotePhoto) : null) || null;
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
          : section === "PREFERENCES"
            ? "Make finding your next meal a little easier."
          : section === "HELP_CENTER"
            ? "Ask a question and explore answers about your orders."
          : section === "CONTACT_SUPPORT"
            ? "Choose the easiest way to reach our team."
            : "Manage your password and keep your account secure.";
  return (
    <Screen backgroundColor={overviewTitle && darkMode ? "#101A1E" : "#F3F0EB"}>
      {overviewTitle ? <View style={p.accountPageTitle}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ flex: 1 }}><Text style={[p.accountEyebrow, darkMode && p.darkAccentText]}>YOUR CAMPUS DROP</Text>
        <Text style={[p.accountTitle, darkMode && p.darkPrimaryText]}>Account</Text></View></View>
        <Text style={[p.accountSubtitle, darkMode && p.darkSecondaryText]}>Profile, preferences and support in one place.</Text>
      </View> : <Title
        eyebrow={vendor ? "YOUR SHOP & ACCOUNT" : "YOUR CAMPUS ACCOUNT"}
        title={section === "ACCOUNT" ? "Personal details" : section === "DETAILS" ? vendor ? "Shop profile" : "Delivery details" : section === "NOTIFICATIONS" ? "Notifications" : section === "PREFERENCES" ? "Food preferences" : section === "HELP_CENTER" ? "Help Center" : section === "CONTACT_SUPPORT" ? "Contact support" : "Security"}
        subtitle={sectionSubtitle}
      />}
      {notice ? (
        <View accessibilityLiveRegion="polite" style={[p.feedback, noticeTone === "success" ? p.feedbackSuccess : noticeTone === "error" ? p.feedbackError : p.feedbackInfo]}>
          <Text style={[p.feedbackText, noticeTone === "success" ? p.feedbackSuccessText : noticeTone === "error" ? p.feedbackErrorText : p.feedbackInfoText]}>{notice}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss account message" hitSlop={10} onPress={() => showNotice("")}><Text style={p.feedbackClose}>×</Text></Pressable>
        </View>
      ) : null}
      {section !== "OVERVIEW" && <Pressable accessibilityRole="button" onPress={() => navigateSection("OVERVIEW")} style={p.back}><Text style={p.backText}>←  Back to settings</Text></Pressable>}
      {section === "OVERVIEW" && <>
      <View style={[p.accountProfileCard, darkMode && p.darkCard]}>
        <View pointerEvents="none" style={[p.profileGlow, darkMode && p.profileGlowDark]} />
        <View style={p.accountProfileTop}>
          <ProfileAvatar uri={avatarUri} size={68} dark={darkMode} disabled={!photoReady || photoBusy} busy={photoBusy} onPress={() => setPhotoOptionsOpen(true)} />
          <View style={p.accountIdentity}>
            <Text numberOfLines={1} style={[p.accountName, darkMode && p.darkPrimaryText]}>{profile?.name || session?.user.name || "Campus Drop member"}</Text>
            <Text numberOfLines={1} style={[p.accountEmail, darkMode && p.darkSecondaryText]}>{profile?.email || session?.user.email || "Your account"}</Text>
            <View style={p.accountBadgeRow}><View style={[p.accountRoleBadge, darkMode && p.accountRoleBadgeDark]}><Text style={[p.accountRoleText, darkMode && p.accountRoleTextDark]}>{vendor ? "VENDOR ACCOUNT" : "STUDENT ACCOUNT"}</Text></View>{profile?.verified && <View style={p.verifiedBadge}><Text style={p.verifiedBadgeText}>✓ VERIFIED</Text></View>}</View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={openPersonalDetails} style={({ pressed }) => [p.editProfileButton, darkMode && p.editProfileButtonDark, pressed && p.menuPressed]}><PencilLine size={15} color={darkMode ? "#FFD6C7" : colors.green} strokeWidth={2} /><Text style={[p.editProfileText, darkMode && { color: "#FFD6C7" }]}>Edit</Text></Pressable>
        </View>
        <View style={[p.accountCampusLine, darkMode && p.accountCampusLineDark]}><MapPin size={15} color={darkMode ? "#FFAC8E" : colors.green} strokeWidth={2} /><Text numberOfLines={1} style={[p.accountCampusText, darkMode && p.darkSecondaryText]}>{profile?.campus?.name || "Campus not selected"}{profile?.university?.name ? ` · ${profile.university.name}` : ""}</Text></View>
      </View>

      <AccountSectionTitle title="My Account" subtitle="Your details, money and rewards" dark={darkMode} />
      <View style={[p.premiumGroup, darkMode && p.darkGroup]}>
        <PremiumMenuRow Icon={UserRound} title="Personal Information" subtitle="Name, email, phone and campus" onPress={openPersonalDetails} dark={darkMode} />
        {vendor
          ? <PremiumMenuRow Icon={Store} title="Shop Profile" subtitle="Store details, hours and preparation" onPress={() => navigateSection("DETAILS")} dark={darkMode} />
          : <PremiumMenuRow Icon={MapPin} title="Saved Addresses" subtitle="Hostel, room and delivery locations" onPress={() => router.push({ pathname: "/addresses", params: { origin: "account" } })} dark={darkMode} />}
        <PremiumMenuRow Icon={WalletCards} title="Wallet & Payments" subtitle="Wallet balance, UPI and transactions" badge="COMING SOON" onPress={() => unavailableFeature("Wallet & Payments", "A secure Campus Drop wallet and saved payment methods are coming soon. No payment information has been stored.")} dark={darkMode} />
        <PremiumMenuRow Icon={TicketPercent} title="My Coupons" subtitle="Available codes and redeemed offers" badge="CHECKOUT" onPress={() => unavailableFeature("My Coupons", "Coupon storage is coming soon. You can continue applying valid coupon codes securely at checkout.")} dark={darkMode} />
        <PremiumMenuRow Icon={LockKeyhole} title="Security" subtitle="Password and account protection" onPress={() => navigateSection("SECURITY")} dark={darkMode} last />
      </View>

      <AccountSectionTitle title="Preferences" subtitle="Make Campus Drop feel like yours" dark={darkMode} />
      <View style={[p.premiumGroup, darkMode && p.darkGroup]}>
        <PremiumMenuRow Icon={Bell} title="Notifications" subtitle="Orders, promotions and delivery alerts" badge={unreadCount ? String(unreadCount) : undefined} onPress={() => navigateSection("NOTIFICATIONS")} dark={darkMode} />
        <PremiumMenuRow Icon={Moon} title="Dark Mode" subtitle="Apply a comfortable dark appearance across the whole app" dark={darkMode} right={<Switch accessibilityLabel="Dark Mode" accessibilityHint="Changes the appearance of every app screen" disabled={!themeReady} value={darkMode} onValueChange={(value) => void setAccountAppearance(value)} trackColor={{ false: "#D8DCD9", true: "#C76445" }} thumbColor="#FFFFFF" />} />
        <PremiumMenuRow Icon={Languages} title="Language" subtitle="Preferred app language" value="English (India)" onPress={() => unavailableFeature("Language", "English (India) is currently available. More campus languages will be added in a future update.")} dark={darkMode} />
        {!vendor && <PremiumMenuRow Icon={SlidersHorizontal} title="Food Preferences" subtitle="Vegetarian and open-shop defaults" onPress={() => navigateSection("PREFERENCES")} dark={darkMode} last />}
      </View>

      <AccountSectionTitle title="Help & Support" subtitle="Answers and assistance when you need it" dark={darkMode} />
      <View style={[p.premiumGroup, darkMode && p.darkGroup]}>
        <PremiumMenuRow Icon={CircleHelp} title="Help Center" subtitle="FAQs, refunds and delivery questions" onPress={() => navigateSection("HELP_CENTER")} dark={darkMode} />
        <PremiumMenuRow Icon={Headphones} title="Contact Support" subtitle="Email, WhatsApp or call our team" onPress={() => navigateSection("CONTACT_SUPPORT")} dark={darkMode} />
        <PremiumMenuRow Icon={FileText} title="Terms & Privacy Policy" subtitle="Terms, privacy and user agreements" onPress={() => unavailableFeature("Terms & Privacy", "The in-app legal center is being prepared. No agreement or privacy setting has been changed.")} dark={darkMode} last />
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Log out" disabled={busy} onPress={confirmLogout} style={({ pressed }) => [p.logoutButton, darkMode && p.logoutButtonDark, busy && { opacity: .5 }, pressed && p.menuPressed]}><LogOut size={19} color="#B84C3D" strokeWidth={2} /><Text style={p.logoutText}>{busy ? "Logging out…" : "Log out"}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Request account deletion" disabled={busy} onPress={confirmDeletionRequest} style={({ pressed }) => [p.deleteLink, pressed && p.pressed]}><Trash2 size={14} color={darkMode ? "#C78B82" : "#9A7770"} strokeWidth={1.8} /><Text style={[p.deleteLinkText, darkMode && { color: "#C78B82" }]}>Request account deletion</Text></Pressable>
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
      {section === "PREFERENCES" && !vendor && <>
        <View style={p.preferenceIntro}><View style={p.preferenceIcon}><Text style={p.preferenceIconText}>✦</Text></View><View style={{ flex: 1 }}><Text style={p.preferenceTitle}>Make discovery yours</Text><Text style={p.preferenceDescription}>Choose what you see first in campus shops. You can still change filters whenever you like.</Text></View></View>
        <Text style={p.groupTitle}>DEFAULT SEARCH FILTERS</Text>
        <View style={p.group}>
          <PreferenceRow icon="●" title="Vegetarian only" subtitle="Start shop menus with vegetarian items." value={preferences.vegetarianByDefault} disabled={!preferencesReady || savingPreference} onValueChange={(value) => void updatePreference("vegetarianByDefault", value)} />
          <PreferenceRow icon="◷" title="Open vendors only" subtitle="Show shops accepting orders first." value={preferences.openNowByDefault} disabled={!preferencesReady || savingPreference} onValueChange={(value) => void updatePreference("openNowByDefault", value)} last />
        </View>
        <Text style={p.preferenceFootnote}>Saved for this account on this device. Your choice filters search results and isn’t a guarantee of dietary suitability.</Text>
      </>}
      {section==="ACCOUNT"&&<>
      <View style={[s.card, p.detailCard]}>
        {!personalEditing ? <>
          <View style={p.profileIntro}>
            <View pointerEvents="none" style={p.profileIntroRing} />
            <View style={p.profileIntroTop}><Text style={p.profileIntroEyebrow}>YOUR CAMPUS DROP PROFILE</Text><Text style={p.profileIntroSpark}>✦</Text></View>
            <View style={p.profileIntroIdentity}>
              <ProfileAvatar uri={avatarUri} size={60} dark={darkMode} disabled={!photoReady || photoBusy} busy={photoBusy} onPress={() => setPhotoOptionsOpen(true)} />
              <View style={{ flex: 1, minWidth: 0 }}><Text style={p.profileIntroName}>{profile?.name || "Campus Drop member"}</Text><Text style={p.profileIntroRole}>{vendor ? "Vendor account" : "Student account"}{profile?.verified ? "  ·  Verified" : ""}</Text></View>
            </View>
          </View>
          <Text style={p.profileSectionLabel}>PERSONAL INFORMATION</Text>
          <ProfileDetailRow label="Full name" value={profile?.name || "Not available"} />
          <ProfileDetailRow label="Email address" value={profile?.email || "Not available"} />
          <ProfileDetailRow label="Phone number" value={profile?.phone ? `+91 ${profile.phone}` : "Not added"} last />
          <View style={p.campusCard}><View style={p.campusMark}><Text style={p.campusMarkText}>⌂</Text></View><View style={{ flex: 1 }}><Text style={p.cardEyebrow}>YOUR CAMPUS</Text><Text style={p.campusName}>{profile?.campus?.name || "Campus not set"}</Text><Text style={p.campusMeta}>{profile?.university?.name || "Choose your university"}</Text></View></View>
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
      {section === "HELP_CENTER" && <>
        <View style={p.helpHero}>
          <View style={p.helpHeroIcon}><CircleHelp size={22} color="#FFE6D8" strokeWidth={2} /></View>
          <Text style={p.helpHeroEyebrow}>WE'RE HERE TO HELP</Text>
          <Text style={p.helpHeroTitle}>What can we help with?</Text>
          <Text style={p.helpHeroCopy}>Send a question to our team or find a quick answer below.</Text>
        </View>
        <View style={p.helpQueryCard}>
          <View style={p.helpCardHeading}><View style={p.helpCardIcon}><Send size={18} color={darkMode ? "#FFB89C" : colors.green} strokeWidth={2} /></View><View style={{ flex: 1 }}><Text style={p.helpCardTitle}>Ask us a question</Text><Text style={p.helpCardSubtitle}>Tell us what happened and we'll follow up here.</Text></View></View>
          <Text style={p.helpFieldLabel}>TOPIC</Text>
          <View style={p.helpChips}>{queryTopics.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: helpTopic === item }} onPress={() => setHelpTopic(item)} style={({ pressed }) => [p.helpChip, helpTopic === item && p.helpChipActive, pressed && p.menuPressed]}><Text style={[p.helpChipText, helpTopic === item && p.helpChipTextActive]}>{item}</Text></Pressable>)}</View>
          <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="e.g. My order has not arrived" />
          <Field label="Your message" value={message} onChangeText={setMessage} placeholder="Include your order number and a few details..." multiline />
          <Button disabled={busy} onPress={() => void save("/support", { subject: helpTopic === "General" ? subject.trim() : `${helpTopic}: ${subject.trim()}`, message: message.trim() }, "POST")}>Send question</Button>
          <Text style={p.helpFormHint}>Your request and our reply will appear in Your requests below.</Text>
        </View>
        <View style={p.helpSectionHeading}><View><Text style={p.helpSectionTitle}>Frequently asked questions</Text><Text style={p.helpSectionSubtitle}>Quick answers for everyday campus orders</Text></View></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={p.helpFilters}>{helpTopics.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: faqTopic === item }} onPress={() => { setFaqTopic(item); setOpenFaq(null); }} style={({ pressed }) => [p.helpFilter, faqTopic === item && p.helpFilterActive, pressed && p.menuPressed]}><Text style={[p.helpFilterText, faqTopic === item && p.helpFilterTextActive]}>{item}</Text></Pressable>)}</ScrollView>
        <View style={p.faqCard}>{supportFaqs.filter((item) => faqTopic === "All" || item.topic === faqTopic).map((item, index, visible) => <View key={item.id} style={index < visible.length - 1 && p.faqDivider}><Pressable accessibilityRole="button" accessibilityState={{ expanded: openFaq === item.id }} onPress={() => setOpenFaq(openFaq === item.id ? null : item.id)} style={({ pressed }) => [p.faqQuestionRow, pressed && p.menuPressed]}><View style={{ flex: 1 }}><Text style={p.faqTopic}>{item.topic.toUpperCase()}</Text><Text style={p.faqQuestion}>{item.question}</Text></View><View style={p.faqChevron}><ChevronDown size={17} color={darkMode ? "#FFB89C" : colors.green} style={openFaq === item.id ? { transform: [{ rotate: "180deg" }] } : undefined} /></View></Pressable>{openFaq === item.id && <Text style={p.faqAnswer}>{item.answer}</Text>}</View>)}</View>
        {tickets.length > 0 && <><View style={p.helpSectionHeading}><View><Text style={p.helpSectionTitle}>Your requests</Text><Text style={p.helpSectionSubtitle}>Questions sent to our team</Text></View></View><View style={p.faqCard}>{tickets.map((t, index) => <View key={t.id} style={[p.helpTicket, index < tickets.length - 1 && p.faqDivider]}><View style={p.notificationHeading}><Text style={p.notificationTitle}>{t.subject}</Text><Text style={p.ticketStatus}>{t.status}</Text></View><Text style={t.reply ? p.notificationBody : p.ticketPending}>{t.reply || "Our team will reply here."}</Text></View>)}</View></>}
      </>}
      {section === "CONTACT_SUPPORT" && <>
        <View style={p.contactHero}><View style={p.contactHeroIcon}><Headphones size={25} color="#FFE6D8" strokeWidth={1.8} /></View><Text style={p.contactHeroEyebrow}>CAMPUS DROP CARE</Text><Text style={p.contactHeroTitle}>Let's get it sorted.</Text><Text style={p.contactHeroCopy}>Reach out in the way that works best for you. Keep your order number handy for order questions.</Text></View>
        <View style={p.contactList}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Email support at ${supportEmail}`} onPress={() => void openContact(`mailto:${supportEmail}`, "email")} style={({ pressed }) => [p.contactCard, pressed && p.menuPressed]}><View style={[p.contactIcon, p.contactEmailIcon]}><Mail size={22} color="#B94F35" strokeWidth={1.9} /></View><View style={p.contactCopy}><Text style={p.contactCardTitle}>Email us</Text><Text style={p.contactCardHint}>Write to our support inbox</Text><Text style={p.contactCardValue}>{supportEmail}</Text></View><ChevronRight size={20} color={darkMode ? "#82969A" : "#9CA9A2"} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Chat on WhatsApp at ${supportPhone}`} onPress={() => void openContact(`https://wa.me/${supportPhone.replace(/\D/g, "")}`, "WhatsApp")} style={({ pressed }) => [p.contactCard, pressed && p.menuPressed]}><View style={[p.contactIcon, p.contactWhatsAppIcon]}><MessageCircle size={22} color="#238653" strokeWidth={1.9} /></View><View style={p.contactCopy}><Text style={p.contactCardTitle}>WhatsApp</Text><Text style={p.contactCardHint}>Start a chat with our team</Text><Text style={p.contactCardValue}>+91 98765 43210</Text></View><ChevronRight size={20} color={darkMode ? "#82969A" : "#9CA9A2"} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Call support at ${supportPhone}`} onPress={() => void openContact(`tel:${supportPhone}`, "the phone dialer")} style={({ pressed }) => [p.contactCard, pressed && p.menuPressed]}><View style={[p.contactIcon, p.contactPhoneIcon]}><PhoneCall size={22} color="#4B65A4" strokeWidth={1.9} /></View><View style={p.contactCopy}><Text style={p.contactCardTitle}>Call us</Text><Text style={p.contactCardHint}>Speak to someone directly</Text><Text style={p.contactCardValue}>+91 98765 43210</Text></View><ChevronRight size={20} color={darkMode ? "#82969A" : "#9CA9A2"} /></Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => navigateSection("HELP_CENTER")} style={({ pressed }) => [p.contactHelpLink, pressed && p.menuPressed]}><CircleHelp size={19} color={darkMode ? "#FFB89C" : colors.green} /><View style={{ flex: 1 }}><Text style={p.contactHelpTitle}>Looking for a quick answer?</Text><Text style={p.contactHelpCopy}>Browse FAQs or send a question in Help Center.</Text></View><ChevronRight size={19} color={darkMode ? "#82969A" : "#9CA9A2"} /></Pressable>
      </>}
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
      <Modal visible={photoOptionsOpen} transparent animationType="fade" onRequestClose={() => setPhotoOptionsOpen(false)}>
        <View style={p.photoOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close photo options" style={StyleSheet.absoluteFill} onPress={() => setPhotoOptionsOpen(false)} />
          <View style={[p.photoSheet, darkMode && p.darkGroup]}>
            <View style={p.photoSheetHeading}>
              <View style={{ flex: 1 }}>
                <Text style={[p.photoSheetTitle, darkMode && p.darkPrimaryText]}>Profile photo</Text>
                <Text style={[p.photoSheetSubtitle, darkMode && p.darkSecondaryText]}>Choose a picture that feels like you.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close photo options" onPress={() => setPhotoOptionsOpen(false)} style={p.photoClose}><Text style={[p.photoCloseText, darkMode && p.darkPrimaryText]}>×</Text></Pressable>
            </View>
            <Pressable accessibilityRole="button" disabled={photoBusy} onPress={() => void pickProfilePhoto("camera")} style={({ pressed }) => [p.photoOption, darkMode && p.darkPhotoOption, pressed && p.menuPressed]}>
              <View style={p.photoOptionIcon}><Camera size={19} color={colors.green} strokeWidth={2} /></View>
              <View style={{ flex: 1 }}><Text style={[p.photoOptionTitle, darkMode && p.darkPrimaryText]}>Take a photo</Text><Text style={[p.photoOptionCopy, darkMode && p.darkSecondaryText]}>Use your camera</Text></View>
              <ChevronRight size={18} color={darkMode ? "#93A2A5" : "#A5AEA8"} />
            </Pressable>
            <Pressable accessibilityRole="button" disabled={photoBusy} onPress={() => void pickProfilePhoto("library")} style={({ pressed }) => [p.photoOption, darkMode && p.darkPhotoOption, pressed && p.menuPressed]}>
              <View style={p.photoOptionIcon}><Image source={require("../../assets/profile-avatar.png")} style={p.photoOptionPreview} /></View>
              <View style={{ flex: 1 }}><Text style={[p.photoOptionTitle, darkMode && p.darkPrimaryText]}>Choose from photos</Text><Text style={[p.photoOptionCopy, darkMode && p.darkSecondaryText]}>Browse your device library</Text></View>
              <ChevronRight size={18} color={darkMode ? "#93A2A5" : "#A5AEA8"} />
            </Pressable>
            {avatarUri && <Pressable accessibilityRole="button" disabled={photoBusy} onPress={() => void resetProfilePhoto()} style={({ pressed }) => [p.photoReset, pressed && p.menuPressed]}><Text style={p.photoResetText}>Use the default emoji instead</Text></Pressable>}
            <Text style={[p.photoPrivacy, darkMode && p.darkSecondaryText]}>Your photo is stored on this device and shown in your account.</Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ProfileAvatar({ uri, size, dark, disabled, busy, onPress }: { uri: string | null; size: number; dark: boolean; disabled: boolean; busy: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={uri ? "Change profile photo" : "Add profile photo"} accessibilityHint="Choose a photo from your device or take one with your camera" disabled={disabled} onPress={onPress} style={({ pressed }) => [p.avatarTap, { width: size, height: size }, pressed && !disabled && p.menuPressed, disabled && { opacity: busy ? 0.8 : 0.6 }]}>
    <Image source={uri ? { uri } : require("../../assets/profile-avatar.png")} resizeMode="cover" style={[p.photoAvatarImage, { width: size, height: size, borderRadius: size / 2 }]} />
    <View style={[p.photoCameraBadge, dark && p.photoCameraBadgeDark]}>{busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Camera size={size < 64 ? 12 : 14} color="#FFFFFF" strokeWidth={2.2} />}</View>
  </Pressable>;
}

function PreferenceRow({ icon, title, subtitle, value, disabled, onValueChange, last = false }: { icon: string; title: string; subtitle: string; value: boolean; disabled: boolean; onValueChange: (value: boolean) => void; last?: boolean }) {
  return <ThemeContent><View style={[p.accountRow, !last && p.accountRowBorder]}>
    <View style={p.rowIconWrap}><Text style={p.rowIcon}>{icon}</Text></View>
    <View style={p.rowCopy}><Text style={p.rowTitle}>{title}</Text><Text style={p.rowSubtitle}>{subtitle}</Text></View>
    <Switch accessibilityLabel={title} accessibilityHint={subtitle} disabled={disabled} value={value} onValueChange={onValueChange} trackColor={{ false: "#D9DEE7", true: "#FF9B78" }} thumbColor={value ? "#E85828" : "#FFFFFF"} />
  </View></ThemeContent>;
}

function AccountSectionTitle({ title, subtitle, dark }: { title: string; subtitle: string; dark: boolean }) {
  return <View style={p.premiumSectionHeading}><Text style={[p.premiumSectionTitle, dark && p.darkPrimaryText]}>{title}</Text><Text style={[p.premiumSectionSubtitle, dark && p.darkSecondaryText]}>{subtitle}</Text></View>;
}

function PremiumMenuRow({
  Icon,
  title,
  subtitle,
  badge,
  value,
  right,
  dark,
  last = false,
  onPress,
}: {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string;
  value?: string;
  right?: ReactNode;
  dark: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  const content = <>
    <View style={[p.premiumIconWrap, dark && p.premiumIconWrapDark]}><Icon size={19} color={dark ? "#FFAC8E" : colors.green} strokeWidth={1.9} /></View>
    <View style={p.rowCopy}>
      <Text style={[p.premiumRowTitle, dark && p.darkPrimaryText]}>{title}</Text>
      <Text numberOfLines={1} style={[p.premiumRowSubtitle, dark && p.darkSecondaryText]}>{subtitle}</Text>
    </View>
    {badge && <Text style={[p.premiumBadge, dark && p.premiumBadgeDark]}>{badge}</Text>}
    {value && <Text numberOfLines={1} style={[p.premiumValue, dark && p.darkSecondaryText]}>{value}</Text>}
    {right || (onPress && <ChevronRight size={18} color={dark ? "#6F8288" : "#A5AEA8"} strokeWidth={2} />)}
  </>;
  if (!onPress) return <View style={[p.premiumRow, !last && p.premiumRowBorder, dark && !last && p.premiumRowBorderDark]}>{content}</View>;
  return <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [p.premiumRow, !last && p.premiumRowBorder, dark && !last && p.premiumRowBorderDark, pressed && p.menuPressed]}
    >{content}</Pressable>;
}

function ProfileDetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <ThemeContent><View style={[p.profileDetailRow, last && p.profileDetailRowLast]}>
      <Text style={p.profileDetailLabel}>{label}</Text>
      <Text style={p.profileDetailValue}>{value}</Text>
    </View></ThemeContent>;
}

const p = StyleSheet.create({
  helpHero: { backgroundColor: "#1D3439", borderRadius: 25, padding: 23, marginBottom: 15, overflow: "hidden" },
  helpHeroIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: "#34515A", alignItems: "center", justifyContent: "center", marginBottom: 19 },
  helpHeroEyebrow: { color: "#FFC4AA", fontSize: 9, letterSpacing: 1.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 7 },
  helpHeroTitle: { color: "#FFFFFF", fontSize: 24, lineHeight: 31, letterSpacing: -0.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  helpHeroCopy: { color: "#C8D5D2", fontSize: 12, lineHeight: 19, marginTop: 7, maxWidth: 300 },
  helpQueryCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E1", borderRadius: 23, padding: 18, marginBottom: 29, boxShadow: "0px 6px 20px rgba(27,50,52,.05)" },
  helpCardHeading: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 19 },
  helpCardIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFF0E9", alignItems: "center", justifyContent: "center" },
  helpCardTitle: { color: "#172B32", fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  helpCardSubtitle: { color: "#7F8A89", fontSize: 10, lineHeight: 15, marginTop: 3 },
  helpFieldLabel: { color: "#788682", fontSize: 9, letterSpacing: 1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 9 },
  helpChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  helpChip: { borderWidth: 1, borderColor: "#E4E8E2", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: "#F7F8F4" },
  helpChipActive: { backgroundColor: "#D94F32", borderColor: "#D94F32" },
  helpChipText: { color: "#5D7069", fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  helpChipTextActive: { color: "#FFFFFF" },
  helpFormHint: { color: "#83908B", fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 10 },
  helpSectionHeading: { marginBottom: 13, paddingHorizontal: 2 },
  helpSectionTitle: { color: "#172B32", fontSize: 18, letterSpacing: -0.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  helpSectionSubtitle: { color: "#89938F", fontSize: 10, marginTop: 4 },
  helpFilters: { gap: 8, paddingBottom: 15, paddingRight: 6 },
  helpFilter: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: "#E2E6E1", backgroundColor: "#FFFFFF" },
  helpFilterActive: { backgroundColor: "#20383D", borderColor: "#20383D" },
  helpFilterText: { color: "#667873", fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  helpFilterTextActive: { color: "#FFFFFF" },
  faqCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E1", borderRadius: 21, paddingHorizontal: 16, marginBottom: 28, boxShadow: "0px 4px 16px rgba(27,50,52,.04)" },
  faqDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5EAE5" },
  faqQuestionRow: { flexDirection: "row", alignItems: "center", gap: 13, minHeight: 76, paddingVertical: 14 },
  faqTopic: { color: "#D45536", fontSize: 8, letterSpacing: 1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 5 },
  faqQuestion: { color: "#23383C", fontSize: 12, lineHeight: 17, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  faqChevron: { width: 29, height: 29, borderRadius: 10, backgroundColor: "#FFF1EB", alignItems: "center", justifyContent: "center" },
  faqAnswer: { color: "#62736F", fontSize: 11, lineHeight: 18, paddingRight: 29, paddingBottom: 18 },
  helpTicket: { paddingVertical: 16 },
  contactHero: { backgroundColor: "#1D3439", borderRadius: 25, padding: 23, marginBottom: 19 },
  contactHeroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#34515A", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  contactHeroEyebrow: { color: "#FFC4AA", fontSize: 9, letterSpacing: 1.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 7 },
  contactHeroTitle: { color: "#FFFFFF", fontSize: 25, lineHeight: 32, letterSpacing: -0.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  contactHeroCopy: { color: "#C8D5D2", fontSize: 12, lineHeight: 19, marginTop: 7, maxWidth: 305 },
  contactList: { gap: 11, marginBottom: 15 },
  contactCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E1", borderRadius: 19, minHeight: 91, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, boxShadow: "0px 4px 15px rgba(27,50,52,.04)" },
  contactIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  contactEmailIcon: { backgroundColor: "#FFF0E9" },
  contactWhatsAppIcon: { backgroundColor: "#E8F6EC" },
  contactPhoneIcon: { backgroundColor: "#EBF0FB" },
  contactCopy: { flex: 1, minWidth: 0 },
  contactCardTitle: { color: "#21353B", fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  contactCardHint: { color: "#84918B", fontSize: 10, marginTop: 3 },
  contactCardValue: { color: "#C4573A", fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", marginTop: 7 },
  contactHelpLink: { backgroundColor: "#FFF3EC", borderWidth: 1, borderColor: "#F1DDD1", borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 20 },
  contactHelpTitle: { color: "#273A3C", fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  contactHelpCopy: { color: "#7F8A84", fontSize: 10, marginTop: 3, lineHeight: 15 },
  avatarTap: { position: "relative", borderRadius: 40 },
  photoAvatarImage: { borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "#F5E9DA" },
  photoCameraBadge: { position: "absolute", right: -3, bottom: -3, width: 25, height: 25, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.green, borderWidth: 2, borderColor: "#FFFFFF" },
  photoCameraBadgeDark: { backgroundColor: "#A9432D", borderColor: "#1A292E" },
  photoOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,20,23,.55)" },
  photoSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 21, paddingBottom: 30, borderWidth: 1, borderColor: "#E6E8E4" },
  photoSheetHeading: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  photoSheetTitle: { color: "#172033", fontSize: 20, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  photoSheetSubtitle: { color: "#81898B", fontSize: 11, marginTop: 4 },
  photoClose: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F4F0" },
  photoCloseText: { color: colors.ink, fontSize: 24, lineHeight: 27 },
  photoOption: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 17, backgroundColor: "#FBFAF7", marginTop: 8, borderWidth: 1, borderColor: "#EFEDE7" },
  darkPhotoOption: { backgroundColor: "#1A292E", borderColor: "#304247" },
  photoOptionIcon: { width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0E9" },
  photoOptionPreview: { width: 34, height: 34, borderRadius: 12 },
  photoOptionTitle: { color: "#172033", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  photoOptionCopy: { color: "#858D8E", fontSize: 9, marginTop: 3 },
  photoReset: { minHeight: 45, alignItems: "center", justifyContent: "center", marginTop: 8 },
  photoResetText: { color: "#B84C3D", fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  photoPrivacy: { color: "#858D8E", fontSize: 9, textAlign: "center", marginTop: 7 },
  accountPageTitle: { marginBottom: 19, paddingTop: 2 },
  accountEyebrow: { color: colors.green, fontSize: 9, letterSpacing: 1.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 7 },
  accountTitle: { color: "#172033", fontSize: 31, lineHeight: 37, letterSpacing: -1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  accountSubtitle: { color: "#737B80", fontSize: 11, lineHeight: 18, marginTop: 4 },
  darkPrimaryText: { color: "#F4F6F3" },
  darkSecondaryText: { color: "#93A2A5" },
  darkAccentText: { color: "#FFAC8E" },
  accountProfileCard: { position: "relative", overflow: "hidden", borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7E2", padding: 18, marginBottom: 27, boxShadow: "0px 7px 22px rgba(23,32,51,.065)" },
  darkCard: { backgroundColor: "#1A292E", borderColor: "#293B40", boxShadow: "0px 7px 22px rgba(0,0,0,.16)" },
  profileGlow: { position: "absolute", width: 165, height: 165, borderRadius: 83, backgroundColor: "#FFF0E9", right: -72, top: -82, opacity: .72 },
  profileGlowDark: { backgroundColor: "#53372F", opacity: .43 },
  accountProfileTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  accountAvatar: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime, borderWidth: 3, borderColor: "#FFFFFF", boxShadow: "0px 3px 12px rgba(217,79,50,.12)" },
  accountAvatarDark: { backgroundColor: "#50342D", borderColor: "#27393E" },
  accountAvatarPhoto: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: "#FFFFFF" },
  accountIdentity: { flex: 1, minWidth: 0 },
  accountName: { color: "#172033", fontSize: 18, lineHeight: 24, letterSpacing: -.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  accountEmail: { color: "#737B80", fontSize: 10, marginTop: 2 },
  accountBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  accountRoleBadge: { borderRadius: 9, backgroundColor: "#FFF0E9", paddingHorizontal: 8, paddingVertical: 5 },
  accountRoleBadgeDark: { backgroundColor: "#4B332D" },
  accountRoleText: { color: colors.green, fontSize: 7, letterSpacing: .7, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" },
  accountRoleTextDark: { color: "#FFB79C" },
  verifiedBadge: { borderRadius: 9, backgroundColor: "#EAF6EF", paddingHorizontal: 7, paddingVertical: 5 },
  verifiedBadgeText: { color: colors.success, fontSize: 7, letterSpacing: .55, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" },
  editProfileButton: { minWidth: 54, height: 37, borderRadius: 12, flexDirection: "row", gap: 5, paddingHorizontal: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime, borderWidth: 1, borderColor: "#F3D8CD", alignSelf: "flex-start" },
  editProfileButtonDark: { backgroundColor: "#4B332D", borderColor: "#65463C" },
  editProfileText: { color: colors.green, fontSize: 8, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  accountCampusLine: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E7EAE5", marginTop: 16, paddingTop: 13 },
  accountCampusLineDark: { borderTopColor: "#304247" },
  accountCampusText: { flex: 1, color: "#66716C", fontSize: 9, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  premiumSectionHeading: { marginBottom: 11, paddingHorizontal: 2 },
  premiumSectionTitle: { color: "#172033", fontSize: 17, letterSpacing: -.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  premiumSectionSubtitle: { color: "#81898B", fontSize: 9, marginTop: 3 },
  premiumGroup: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6E8E4", borderRadius: 20, paddingHorizontal: 15, marginBottom: 25, boxShadow: "0px 4px 16px rgba(23,32,51,.04)" },
  darkGroup: { backgroundColor: "#18272C", borderColor: "#293B40", boxShadow: "0px 4px 16px rgba(0,0,0,.14)" },
  premiumRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  premiumRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E8EBE6" },
  premiumRowBorderDark: { borderBottomColor: "#2B3D42" },
  premiumIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime },
  premiumIconWrapDark: { backgroundColor: "#49342F" },
  premiumRowTitle: { color: "#172033", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  premiumRowSubtitle: { color: "#858D8E", fontSize: 9, marginTop: 3 },
  premiumBadge: { overflow: "hidden", color: colors.green, backgroundColor: colors.lime, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5, fontSize: 7, letterSpacing: .45, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" },
  premiumBadgeDark: { color: "#FFB79C", backgroundColor: "#49342F" },
  premiumValue: { maxWidth: 92, color: "#687370", fontSize: 9, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", textAlign: "right" },
  menuPressed: { opacity: .76, transform: [{ scale: .99 }] },
  logoutButton: { minHeight: 55, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#FFF3EF", borderWidth: 1, borderColor: "#F1D7CF", marginTop: 1 },
  logoutButtonDark: { backgroundColor: "#2E2424", borderColor: "#4A3030" },
  logoutText: { color: "#B84C3D", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  deleteLink: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 7, marginBottom: 14 },
  deleteLinkText: { color: "#9A7770", fontSize: 9, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  heroOrbit: { position: "absolute", width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: "rgba(133,100,68,0.21)", right: -75, top: -94 },
  heroOrb: { position: "absolute", width: 132, height: 132, borderRadius: 66, backgroundColor: "#EEDFCB", right: -39, top: -30, opacity: .8 },
  heroBrand: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 21 },
  heroBrandText: { color: "#72513D", fontSize: 9, letterSpacing: 2, fontFamily: "PlusJakartaSans_800ExtraBold" },
  heroBrandLine: { width: 30, height: 1, backgroundColor: "#C2A487" },
  heroBrandMark: { color: "#AF7950", fontSize: 13 },
  profileIntro: { backgroundColor: "#20353A", borderRadius: 19, padding: 18, marginBottom: 22, overflow: "hidden" },
  profileIntroRing: { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: "rgba(240,210,174,.22)", right: -30, top: -70 },
  profileIntroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  profileIntroEyebrow: { color: "#E9CDA9", fontSize: 9, letterSpacing: 1.2, fontFamily: "PlusJakartaSans_800ExtraBold", flexShrink: 1 },
  profileIntroSpark: { color: "#E9CDA9", fontSize: 17 },
  profileIntroIdentity: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileAvatar: { width: 50, height: 50, borderRadius: 17, backgroundColor: "#EAD5BC", alignItems: "center", justifyContent: "center" },
  profileAvatarText: { color: "#55382E", fontSize: 21, fontFamily: "PlusJakartaSans_800ExtraBold" },
  profilePhoto: { width: 50, height: 50, borderRadius: 17 },
  profileIntroName: { color: "#FFFFFF", fontSize: 17, lineHeight: 23, fontFamily: "PlusJakartaSans_800ExtraBold" },
  profileIntroRole: { color: "#D4DDD9", fontSize: 11, lineHeight: 17, marginTop: 3 },
  profileSectionLabel: { color: "#7C756D", fontSize: 9, letterSpacing: 1.3, fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 3 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11, marginBottom: 12 },
  sectionTitle: { color: "#172033", fontSize: 17, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -.4 },
  sectionCaption: { color: "#737B8C", fontSize: 11, marginTop: 4 },
  sectionSymbol: { color: "#E56839", fontSize: 20, paddingHorizontal: 7 },
  preferenceIntro: { flexDirection: "row", gap: 14, padding: 19, borderRadius: 22, backgroundColor: "#172033", marginBottom: 25 },
  preferenceIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: "#FFC857", alignItems: "center", justifyContent: "center" },
  preferenceIconText: { color: "#172033", fontSize: 22 },
  preferenceTitle: { color: "#FFFFFF", fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 6 },
  preferenceDescription: { color: "#D4DAE4", fontSize: 12, lineHeight: 19 },
  preferenceFootnote: { color: "#737B8C", fontSize: 11, lineHeight: 18, marginTop: -7, paddingHorizontal: 4 },
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
  hero: { backgroundColor: "#FAF4EB", borderColor: "#E4D5C3", borderWidth: 1, borderRadius: 26, padding: 22, marginBottom: 14, overflow: "hidden", shadowColor: "#654631", shadowOpacity: .10, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroLabel: { color: "#94623F", fontSize: 9, letterSpacing: 1.4, fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 18, marginBottom: 5 },
  avatar: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#20353A", borderWidth: 2, borderColor: "#F0D7B9" },
  avatarText: { fontSize: 26, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#F5D9B5" },
  photo: { width: 60, height: 60, borderRadius: 20 },
  name: { fontSize: 23, lineHeight: 30, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#20353A", letterSpacing: -.6 },
  email: { fontSize: 12, lineHeight: 19, color: "#6F6B67", marginTop: 3 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 1, gap: 6, marginTop: 4 },
  role: { fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 0.6, color: "#765239", backgroundColor: "#F3E6D6", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, overflow: "hidden" },
  verifiedTick: { color: "#17834F", fontSize: 11, fontWeight: "800" },
  edit: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 18, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 11, backgroundColor: "#20353A", marginTop: 18 },
  editText: { fontSize: 11, color: "#FFFFFF", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  editArrow: { color: "#EAC49A", fontSize: 15, lineHeight: 17 },
  campusCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F8F3EB", borderRadius: 18, padding: 15, marginTop: 12, marginBottom: 14, borderWidth: 1, borderColor: "#EBE0D2" },
  campusMark: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFF1EB" },
  campusMarkText: { color: "#FF6B35", fontSize: 20, fontWeight: "700" },
  cardEyebrow: { color: "#85918A", fontSize: 9, fontWeight: "800", letterSpacing: 1, fontFamily: "PlusJakartaSans_800ExtraBold" },
  campusName: { color: "#172033", fontSize: 14, fontWeight: "800", marginTop: 3, fontFamily: "PlusJakartaSans_800ExtraBold" },
  campusMeta: { color: "#758078", fontSize: 11, marginTop: 2 },
  detailCard: { padding: 19, borderRadius: 24, borderColor: "#E8E0D5", boxShadow: "0px 6px 22px rgba(70,54,40,0.06)" },
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
  quickCard: { flex: 1, minHeight: 94, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E8EAF0", paddingVertical: 13, shadowColor: "#172033", shadowOpacity: .04, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  quickIcon: { fontSize: 19, color: "#FF6B35", fontWeight: "700" },
  quickTitle: { color: "#172033", fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  groupTitle: { color: "#737B8C", fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 10, fontFamily: "PlusJakartaSans_800ExtraBold" },
  group: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8EAF0", borderRadius: 22, paddingHorizontal: 16, marginBottom: 24, shadowColor: "#172033", shadowOpacity: .035, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  deletionPrompt: { backgroundColor: "#FFF9F6", borderWidth: 1, borderColor: "#F0D6CE", borderRadius: 20, padding: 16, marginTop: -8, marginBottom: 20 },
  campusMovePrompt: { backgroundColor: "#F9F5EB", borderWidth: 1, borderColor: "#EDE2CB", borderRadius: 17, padding: 14, marginBottom: 14 },
  deletionPromptIcon: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#FFE8E0", marginBottom: 10 },
  deletionPromptIconText: { color: "#B34D39", fontSize: 17, fontWeight: "800" },
  deletionPromptTitle: { color: "#422E28", fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  deletionPromptText: { color: "#816B63", fontSize: 11, lineHeight: 17, marginTop: 5 },
  deletionAction: { minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 16, paddingHorizontal: 12, backgroundColor: "#B34D39", marginTop: 8 },
  deletionActionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  accountRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
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
