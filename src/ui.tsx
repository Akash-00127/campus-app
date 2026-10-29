import type { ComponentRef } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { focusedScrollOffset } from "./keyboard";
export const colors = {
  ink: "#182033",
  green: "#E64E2E",
  lime: "#FFF0E9",
  bg: "#FFF9F6",
  muted: "#727887",
  line: "#EEE5E0",
  orange: "#F59E0B",
};
export const money = (n: number) => `₹${(n / 100).toFixed(2)}`;
const FocusContext=createContext<(input:ComponentRef<typeof TextInput>|null)=>void>(()=>{});
export function Screen({children}:{children:ReactNode}){
 const scroll=useRef<ComponentRef<typeof ScrollView>>(null),viewport=useRef<ComponentRef<typeof View>>(null),focused=useRef<ComponentRef<typeof TextInput>|null>(null),offset=useRef(0),keyboardTop=useRef(Infinity);
 const reveal=useCallback(()=>{const input=focused.current;if(!input||!input.isFocused())return;viewport.current?.measureInWindow((_x,vy,_w,vh)=>{input.measureInWindow((_ix,iy,_iw,ih)=>{const target=focusedScrollOffset(offset.current,iy,ih,vy,vh,keyboardTop.current);if(Math.abs(target-offset.current)>1)scroll.current?.scrollTo({y:target,animated:true});});});},[]);
 const schedule=useCallback(()=>{requestAnimationFrame(()=>requestAnimationFrame(reveal));},[reveal]);
 useEffect(()=>{const show=Keyboard.addListener('keyboardDidShow',event=>{keyboardTop.current=event.endCoordinates.screenY;schedule()});const hide=Keyboard.addListener('keyboardDidHide',()=>{keyboardTop.current=Infinity});return()=>{show.remove();hide.remove()}},[schedule]);
 const safeChildren=Children.map(children,child=>typeof child==='string'?(child.trim()?<Text>{child}</Text>:null):child);
 return <SafeAreaView style={s.safe} edges={['top','left','right','bottom']}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':Platform.OS==='android'?'height':undefined}><View ref={viewport} style={{flex:1}} onLayout={schedule}><FocusContext.Provider value={input=>{focused.current=input;schedule()}}><ScrollView ref={scroll} style={{flex:1}} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScroll={event=>{offset.current=event.nativeEvent.contentOffset.y}} scrollEventThrottle={16} contentContainerStyle={[s.page,{flexGrow:1}]}><View>{safeChildren}</View></ScrollView></FocusContext.Provider></View></KeyboardAvoidingView></SafeAreaView>
}
export function Title({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      {eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.muted}>{subtitle}</Text>}
    </View>
  );
}
export function Button({
  children,
  onPress,
  disabled,
  secondary = false,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      {isValidElement(children) ? children : <Text style={[s.buttonText, secondary && { color: colors.green }]}>{children}</Text>}
    </Pressable>
  );
}
export function Field({label,onFocus,style,right,...props}:TextInputProps&{label:string;right?:ReactNode}){
 const ref=useRef<ComponentRef<typeof TextInput>>(null);const focus=useContext(FocusContext);
 return <View style={{marginBottom:14}}><Text style={s.label}>{label}</Text><View><TextInput ref={ref} accessibilityLabel={label} placeholderTextColor="#8A948B" style={[s.input,!!right&&{paddingRight:74},props.multiline&&{minHeight:90,textAlignVertical:'top'},style]} {...props} onFocus={event=>{focus(ref.current);onFocus?.(event)}}/>{right&&<View style={s.fieldRight}>{right}</View>}</View></View>
}
export function Notice({ text }: { text: string }) {
  return (
    <View style={s.notice}>
      <Text style={{ color: colors.ink, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}
export function Loading() {
  return <ActivityIndicator color={colors.green} style={{ margin: 30 }} />;
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 18, paddingBottom: 96 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: colors.orange,
    marginBottom: 9,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -1,
  },
  muted: { fontSize: 13, lineHeight: 21, color: colors.muted, marginTop: 7 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    padding: 15,
    backgroundColor: "#FFFFFF",
    color: colors.ink,
    fontSize: 14,
  },
  fieldRight: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "900", fontSize: 14 },
  secondary: { backgroundColor: "white", borderWidth: 1, borderColor: "#F2C4B6" },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  h2: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
    marginVertical: 12,
  },
  h3: { fontSize: 16, fontWeight: "700", color: colors.ink },
  badge: {
    color: colors.green,
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: "#E9F2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  notice: {
    backgroundColor: "#FFF0E9",
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
  },
  price: { fontSize: 18, fontWeight: "800", color: colors.ink },
  link: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 8,
  },
  selected: { backgroundColor: colors.lime, borderColor: "#8CB9FF" },
  dropdown: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 14,
    overflow: "hidden",
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EDF0E9" },
  dropdownMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  dropdownEmpty: { color: colors.muted, padding: 14, textAlign: "center" },
  selection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#E9F2FF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: -5, marginBottom: 14 },
  selectionText: { color: colors.ink, flex: 1, fontSize: 12, fontWeight: "700", marginRight: 8 },
  selectionAction: { color: colors.green, fontSize: 12, fontWeight: "800" },
  passwordToggle: { color: colors.green, fontSize: 12, fontWeight: "800", padding: 5 },
  dropdownButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#E9F2FF", borderWidth: 1, borderColor: "#B8D4FF" },
  dropdownButtonOpen: { backgroundColor: colors.green, borderColor: colors.green },
  dropdownChevron: { color: colors.green, fontSize: 20, fontWeight: "900", lineHeight: 23, marginTop: -3 },
  dropdownChevronOpen: { color: "white" },
  fieldHint: { color: colors.muted, fontSize: 12, marginTop: -2, marginBottom: 8 },
  campusOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: colors.line },
  campusArrow: { color: colors.green, fontSize: 18, fontWeight: "800" },
});
