import { enablePush, pushUnavailableReason } from "../../src/notifications";
import { useCallback, useState, useRef, useEffect } from "react";
import { useFocusEffect, router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { mediaUrl, request, type Profile } from "../../src/api";
import { useSession } from "../../src/session";
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
  const { session, signOut, forget } = useSession();
  const pushSubscription = useRef<{ remove: () => void } | null>(null);
  useEffect(() => () => pushSubscription.current?.remove(), []);
  const pushReason = pushUnavailableReason();
  const token = session!.accessToken;
  const vendor = session!.user.role === "VENDOR";
  const [profile, setProfile] = useState<Profile>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
  const [label, setLabel] = useState("");
  const [building, setBuilding] = useState("");
  const [details, setDetails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<"ACCOUNT" | "DETAILS" | "NOTIFICATIONS" | "SUPPORT" | "SECURITY">("ACCOUNT");
  const load = useCallback(async () => {
    try {
      const [p, n, t] = await Promise.all([
        request<Profile>("/auth/me", token),
        request<Note[]>("/notifications", token),
        request<Ticket[]>("/support", token),
      ]);
      setProfile(p);
      setName(p.name);
      setPhone(p.phone || "");
      setShop(p.vendor?.name || "");
      setDescription(p.vendor?.description || "");
      setMinutes(String(p.vendor?.preparationMinutes || 15));
      setAllDay(p.vendor?.operatingHours?.alwaysOpen ?? true);
      setOpens(p.vendor?.operatingHours?.open || "09:00");
      setCloses(p.vendor?.operatingHours?.close || "22:00");
      setLogo(p.vendor?.logo || "");
      setCover(p.vendor?.coverImage || "");
      setNotes(n);
      setTickets(t);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }, [token]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  async function save(path: string, body: unknown, method = "PATCH") {
    setBusy(true);
    setNotice("");
    try {
      await request(path, token, method, body);
      setNotice("Saved successfully.");
      await load();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title
        eyebrow={vendor ? "SELLER ACCOUNT" : "YOUR CAMPUS IDENTITY"}
        title="Your profile"
        subtitle="Keep your account and delivery details up to date."
      />
      {notice && <Notice text={notice} />}
      <View style={p.hero}>
        {profile?.photo ? <Image source={{uri:mediaUrl(profile.photo)}} style={p.photo}/> : <View style={p.avatar}><Text style={p.avatarText}>{profile?.name?.slice(0,1).toUpperCase()||"C"}</Text></View>}
        <View style={{flex:1}}><Text style={p.name}>{profile?.name||"Campus Drop member"}</Text><Text style={p.email}>{profile?.email}</Text><View style={p.roleRow}><Text style={p.role}>{vendor?"VENDOR / SELLER":"STUDENT"}</Text><Text style={[p.role,{backgroundColor:'#E8F7EF',color:'#087C56'}]}>CAMPUS MEMBER</Text></View></View>
      </View>
      <View style={p.menu}>{([{id:'ACCOUNT',label:'Profile'},{id:'DETAILS',label:vendor?'Shop':'Delivery'},{id:'NOTIFICATIONS',label:'Alerts'},{id:'SUPPORT',label:'Support'},{id:'SECURITY',label:'Security'}] as const).map(item=><Pressable key={item.id} onPress={()=>setSection(item.id)} style={[p.menuItem,section===item.id&&p.menuActive]}><Text style={[p.menuText,section===item.id&&p.menuTextActive]}>{item.label}</Text></Pressable>)}</View>
      {section==="ACCOUNT"&&<>
      {!vendor&&<View style={s.row}><Button secondary onPress={()=>router.push('/saved')}>Saved items ♡</Button><Button secondary onPress={()=>router.push('/addresses')}>My addresses</Button></View>}
      <View style={s.card}>
        <Text style={s.h3}>{profile?.email}</Text>
        <Text style={s.muted}>
          {profile?.university?.name} · {profile?.campus?.name}
        </Text>
        <Text style={[s.badge, { alignSelf: "flex-start", marginTop: 12 }]}>
          CAMPUS SELECTED
        </Text>
        <Text style={s.muted}>
          Your catalog is personalized for this selected university and campus.
        </Text>
      </View>
      <View style={s.card}>
        <Field label="Full name" value={name} onChangeText={setName} />
        <Field
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Button
          disabled={busy}
          onPress={() => void save("/auth/profile", { name, phone })}
        >
          Save profile
        </Button>
      </View>
      </>}
      {section==="DETAILS"&&<>
      {vendor ? (
        <View style={s.card}>
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
        <View style={s.card}>
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
      <View style={s.card}>
        <Text style={s.h2}>Notifications</Text>
        {pushReason&&<Notice text={pushReason}/>}
        <Button
          secondary
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void enablePush(token)
              .then((subscription) => {
                pushSubscription.current?.remove();
                pushSubscription.current = subscription;
                setNotice("Push notifications enabled on this device.");
              })
              .catch((e) => setNotice(e.message))
              .finally(() => setBusy(false));
          }}
        >
          Enable Android push alerts
        </Button>
        {notes.length ? (
          notes.slice(0, 15).map((n) => (
            <View
              key={n.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#E7EBDD",
              }}
            >
              <Text style={s.h3}>{n.title}</Text>
              <Text style={s.muted}>{n.body}</Text>
              {!n.read && (
                <Button
                  secondary
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
      <View style={s.card}>
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
          <View key={t.id} style={{ marginTop: 18 }}>
            <Text style={s.h3}>{t.subject}</Text>
            <Text style={s.badge}>{t.status}</Text>
            {t.reply && <Text style={s.muted}>{t.reply}</Text>}
          </View>
        ))}
      </View>
      }
      {section==="SECURITY"&&<>
      <View style={s.card}>
        <Text style={s.h2}>Account security</Text>
        <Field
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
        />
        <Field
          label="New password · at least 8 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button
          secondary
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void request("/auth/password", token, "POST", {
              currentPassword: current,
              newPassword: password,
            })
              .then(async () => {
                await forget();
                router.replace("/welcome");
              })
              .catch((e) => setNotice(e.message))
              .finally(() => setBusy(false));
          }}
        >
          Change password
        </Button>
      </View>
      <Button
        secondary
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void signOut()
            .then(() => router.replace("/welcome"))
            .catch((e) => setNotice(e.message))
            .finally(() => setBusy(false));
        }}
      >
        Sign out
      </Button>
      </>}
    </Screen>
  );
}
const p=StyleSheet.create({hero:{flexDirection:'row',alignItems:'center',gap:15,backgroundColor:'#062A82',borderRadius:22,padding:18,marginBottom:14},avatar:{width:62,height:62,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'#FFC928'},avatarText:{fontSize:27,fontWeight:'900',color:'#10235A'},photo:{width:62,height:62,borderRadius:20},name:{fontSize:21,fontWeight:'900',color:'white'},email:{fontSize:11,color:'#D7E6FF',marginTop:3},roleRow:{flexDirection:'row',gap:7,marginTop:9},role:{fontSize:9,fontWeight:'900',letterSpacing:.6,color:'#FFD76B',backgroundColor:'#1D65D8',paddingHorizontal:9,paddingVertical:5,borderRadius:12,overflow:'hidden'},menu:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:16},menuItem:{paddingHorizontal:13,paddingVertical:9,borderRadius:18,backgroundColor:'white',borderWidth:1,borderColor:'#DCE5F5'},menuActive:{backgroundColor:'#1D65D8',borderColor:'#1D65D8'},menuText:{fontSize:11,fontWeight:'800',color:'#6A7899'},menuTextActive:{color:'white'}});



