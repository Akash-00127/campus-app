import { EyeIcon } from "@solar-icons/react-native/linear/eye";
import { EyeClosedIcon } from "@solar-icons/react-native/linear/eye-closed";
import { Pressable } from "react-native";
export function PasswordEye({visible,onToggle,color="#5643A6"}:{visible:boolean;onToggle:()=>void;color?:string}){
  const Icon=visible?EyeClosedIcon:EyeIcon;
  return <Pressable accessibilityRole="button" accessibilityLabel={visible?"Hide password":"Show password"} onPress={onToggle} style={{width:44,height:44,alignItems:"center",justifyContent:"center"}}><Icon size={22} color={color}/></Pressable>;
}
