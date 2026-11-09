import type { ComponentRef } from "react";
import { cloneElement } from "react";
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
  type PressableStateCallbackType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { focusedScrollOffset } from "./keyboard";
import { useAppTheme } from "./theme";
import { darkThemeColor } from "./theme-colors";
export const colors = {
  ink: "#182C35",
  green: "#D94F32",
  lime: "#FFF0E9",
  bg: "#F8F7F3",
  muted: "#78828A",
  line: "#EAE9E3",
  navy: "#18323D",
  surface: "#FFFFFF",
  orange: "#F59E0B",
  success: "#239B68",
};
export const money = (n: number) => `₹${(n / 100).toFixed(2)}`;
const FocusContext=createContext<(input:ComponentRef<typeof TextInput>|null)=>void>(()=>{});
function themedStyle(style: unknown, darkMode: boolean): unknown {
 if(!darkMode||style==null)return style;
 if(typeof style==="function")return (state:PressableStateCallbackType)=>themedStyle(style(state),darkMode);
 if(Array.isArray(style))return style.map(item=>themedStyle(item,darkMode));
 if(typeof style!=="object")return style;
 const flattened=StyleSheet.flatten(style as StyleProp<ViewStyle|TextStyle>);
 if(!flattened)return flattened;
 const result:Record<string,unknown>={...flattened};
 for(const [key,value] of Object.entries(result)){
  if(key==="backgroundColor"&&typeof value==="string")result[key]=darkThemeColor(value,"background");
  else if(key==="color"&&typeof value==="string")result[key]=darkThemeColor(value,"text");
  else if(key.endsWith("Color")&&key.toLowerCase().includes("border")&&typeof value==="string")result[key]=darkThemeColor(value,"border");
  else if(key==="shadowColor"&&typeof value==="string")result[key]=darkThemeColor(value,"shadow");
 }
 return result;
}
function themedTree(children: ReactNode, darkMode: boolean): ReactNode {
 return Children.map(children,child=>{
  if(typeof child==="string")return child.trim()?<Text>{child}</Text>:null;
  if(!darkMode||!isValidElement(child))return child;
  const props=child.props as Record<string,unknown>&{children?:ReactNode;style?:unknown};
  const next:Record<string,unknown>={};
  if("style" in props)next.style=typeof props.style==="function"
   ?(state:PressableStateCallbackType)=>themedStyle((props.style as (state:PressableStateCallbackType)=>unknown)(state),darkMode)
   :themedStyle(props.style,darkMode);
  if(props.children!==undefined)next.children=themedTree(props.children,darkMode);
  return cloneElement(child as ReactElement<Record<string,unknown>>,next);
 });
}
export function ThemeContent({children}:{children:ReactNode}){
 const {darkMode}=useAppTheme();
 return <>{themedTree(children,darkMode)}</>;
}
export function Screen({children,backgroundColor,footer}:{children:ReactNode;backgroundColor?:string;footer?:ReactNode}){
 const {darkMode}=useAppTheme();
 const scroll=useRef<ComponentRef<typeof ScrollView>>(null),viewport=useRef<ComponentRef<typeof View>>(null),focused=useRef<ComponentRef<typeof TextInput>|null>(null),offset=useRef(0),keyboardTop=useRef(Infinity);
 const [keyboardOpen,setKeyboardOpen]=useState(false);
 const reveal=useCallback(()=>{const input=focused.current;if(!input||!input.isFocused())return;viewport.current?.measureInWindow((_x,vy,_w,vh)=>{input.measureInWindow((_ix,iy,_iw,ih)=>{const target=focusedScrollOffset(offset.current,iy,ih,vy,vh,keyboardTop.current);if(Math.abs(target-offset.current)>1)scroll.current?.scrollTo({y:target,animated:true});});});},[]);
 const schedule=useCallback(()=>{requestAnimationFrame(()=>requestAnimationFrame(reveal));},[reveal]);
 useEffect(()=>{const show=Keyboard.addListener('keyboardDidShow',event=>{keyboardTop.current=event.endCoordinates.screenY;setKeyboardOpen(true);schedule()});const hide=Keyboard.addListener('keyboardDidHide',()=>{keyboardTop.current=Infinity;setKeyboardOpen(false)});return()=>{show.remove();hide.remove()}},[schedule]);
 const screenBackground=backgroundColor?(darkMode?darkThemeColor(backgroundColor,"background"):backgroundColor):darkMode?"#101A1E":undefined;
 const safeChildren=themedTree(children,darkMode);
 return <SafeAreaView style={[s.safe,darkMode&&{backgroundColor:"#101A1E"},screenBackground&&{backgroundColor:screenBackground}]} edges={['top','left','right','bottom']}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':Platform.OS==='android'?'height':undefined}><View style={{flex:1}} onLayout={schedule}><FocusContext.Provider value={input=>{focused.current=input;schedule()}}><View ref={viewport} style={{flex:1}}><ScrollView ref={scroll} style={{flex:1}} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScroll={event=>{offset.current=event.nativeEvent.contentOffset.y}} scrollEventThrottle={16} contentContainerStyle={[s.page,{flexGrow:1}]}><View>{safeChildren}</View></ScrollView></View>{footer && !keyboardOpen ? <View>{themedTree(footer,darkMode)}</View> : null}</FocusContext.Provider></View></KeyboardAvoidingView></SafeAreaView>
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
  const {darkMode}=useAppTheme();
  return (
    <View style={{ marginBottom: 20 }}>
      {eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
      <Text style={[s.title,darkMode&&{color:"#F4F6F3"}]}>{title}</Text>
      {subtitle && <Text style={[s.muted,darkMode&&{color:"#A7B3B4"}]}>{subtitle}</Text>}
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
  const {darkMode}=useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        darkMode&&secondary&&{backgroundColor:"#1A292E",borderColor:"#304247"},
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
      ]}
    >
      {isValidElement(children) ? children : <Text style={[s.buttonText, secondary && { color: colors.green },darkMode&&secondary&&{color:"#FFAC8E"}]}>{children}</Text>}
    </Pressable>
  );
}
export function Field({label,onFocus,onBlur,style,right,...props}:TextInputProps&{label:string;right?:ReactNode}){
 const {darkMode}=useAppTheme();
 const ref=useRef<ComponentRef<typeof TextInput>>(null);const focus=useContext(FocusContext);
 const [focused,setFocused]=useState(false);
 const phone = props.keyboardType === "phone-pad";
 return <View style={{marginBottom:14}}><Text style={[s.label,darkMode&&{color:"#A7B3B4"}]}>{label}</Text><View>{phone && <Text style={{position:"absolute",left:15,top:16,zIndex:1,color:darkMode?"#F4F6F3":colors.ink,fontSize:14,fontWeight:"700", fontFamily: "PlusJakartaSans_700Bold"}}>+91</Text>}<TextInput ref={ref} accessibilityLabel={label} placeholderTextColor="#8A948B" selectionColor={colors.green} cursorColor={colors.green} style={[s.input,focused&&s.inputFocused,darkMode&&{backgroundColor:"#1A292E",borderColor:"#304247",color:"#F4F6F3"},!!right&&{paddingRight:74},props.multiline&&{minHeight:90,textAlignVertical:'top'},phone&&{paddingLeft:62},style]} {...props} maxLength={phone ? 10 : props.maxLength} onChangeText={phone ? value => props.onChangeText?.(value.replace(/\D/g, "").slice(0, 10)) : props.onChangeText} onFocus={event=>{setFocused(true);focus(ref.current);onFocus?.(event)}} onBlur={event=>{setFocused(false);onBlur?.(event)}}/>{right&&<View style={s.fieldRight}>{right}</View>}</View></View>
}
export function Notice({ text }: { text: string }) {
  const {darkMode}=useAppTheme();
  return (
    <View style={[s.notice,darkMode&&{backgroundColor:"#302A27",borderColor:"#58443C"}]}>
      <Text style={{ color: darkMode?"#F4F6F3":colors.ink, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}
export function Loading() {
  return <ActivityIndicator color={colors.green} style={{ margin: 30 }} />;
}
export function EmptyState({ symbol, title, description }: { symbol: string; title: string; description: string }) {
  const {darkMode}=useAppTheme();
  return <View style={s.empty}>
    <View style={[s.emptyIcon,darkMode&&{backgroundColor:"#49342F"}]}><Text style={{ fontSize: 32, color: colors.green }}>{symbol}</Text></View>
    <Text accessibilityRole="header" style={[s.h2, { textAlign: "center", marginBottom: 0 },darkMode&&{color:"#F4F6F3"}]}>{title}</Text>
    <Text style={[s.muted, { textAlign: "center", maxWidth: 280 },darkMode&&{color:"#A7B3B4"}]}>{description}</Text>
  </View>;
}
export const s = StyleSheet.create({
  empty: { alignItems: "center", paddingHorizontal: 22, paddingVertical: 42, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.line, marginVertical: 16 },
  emptyIcon: { width: 80, height: 80, borderRadius: 28, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 22, paddingBottom: 116, width: "100%", maxWidth: 760, alignSelf: "center" },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 2,
    color: colors.green,
    marginBottom: 9,
  },
  title: {
    fontSize: 34,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold",
    color: colors.ink,
    letterSpacing: -1,
  },
  muted: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 22, color: colors.muted, marginTop: 7 },
  label: {
    fontSize: 12,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold",
    color: colors.muted,
    marginBottom: 7,
  },
  input: { fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    padding: 15,
    backgroundColor: "#FFFFFF",
    color: colors.ink,
    fontSize: 14,
  },
  inputFocused: { borderColor: colors.green, borderWidth: 1.5, backgroundColor: colors.surface },
  fieldRight: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
  button: {
    minHeight: 54,
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: colors.green,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 14, letterSpacing: 0.1 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, boxShadow: "0px 2px 8px rgba(24,44,53,0.035)" },
  card: {
    backgroundColor: "white",
    padding: 22,
    borderRadius: 22,
    boxShadow: "0px 6px 22px rgba(24,50,61,0.055)",
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  h2: {
    fontSize: 19,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold",
    color: colors.ink,
    marginVertical: 12,
  },
  h3: { fontSize: 16, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: colors.ink },
  badge: {
    color: colors.green,
    fontSize: 10,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold",
    backgroundColor: colors.lime,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  notice: {
    backgroundColor: "#FFF4EE",
    borderWidth: 1,
    borderColor: "#F4E1D8",
    padding: 16,
    borderRadius: 16,
    marginVertical: 12,
  },
  price: { fontSize: 18, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: colors.ink },
  link: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold",
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
  selected: { backgroundColor: colors.lime, borderColor: "#E6B39F" },
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
  selection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF4EE", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: -5, marginBottom: 14 },
  selectionText: { color: colors.ink, flex: 1, fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", marginRight: 8 },
  selectionAction: { color: colors.green, fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  passwordToggle: { color: colors.green, fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", padding: 5 },
  dropdownButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF4EE", borderWidth: 1, borderColor: "#F0D7CA" },
  dropdownButtonOpen: { backgroundColor: colors.green, borderColor: colors.green },
  dropdownChevron: { color: colors.green, fontSize: 20, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", lineHeight: 23, marginTop: -3 },
  dropdownChevronOpen: { color: "white" },
  fieldHint: { color: colors.muted, fontSize: 12, marginTop: -2, marginBottom: 8 },
  campusOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: colors.line },
  campusArrow: { color: colors.green, fontSize: 18, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
});
