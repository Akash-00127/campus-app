import { EyeIcon } from "@solar-icons/react-native/linear/eye";
import { EyeClosedIcon } from "@solar-icons/react-native/linear/eye-closed";
import { Pressable } from "react-native";
export function PasswordEye({visible,onToggle}:{visible:boolean;onToggle:()=>void}){
  const Icon=visible?EyeClosedIcon:EyeIcon;
  return <Pressable accessibilityRole="button" accessibilityLabel={visible?"Hide password":"Show password"} onPress={onToggle} style={{width:44,height:44,alignItems:"center",justifyContent:"center"}}><Icon size={22} color="#5643A6"/></Pressable>;
}