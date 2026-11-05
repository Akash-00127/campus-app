import { HomeSmileIcon as HomeSmileLine } from "@solar-icons/react-native/linear/home-smile";
import { HomeSmileIcon as HomeSmileBold } from "@solar-icons/react-native/bold/home-smile";
import { BagIcon as BagLine } from "@solar-icons/react-native/linear/bag";
import { BagIcon as BagBold } from "@solar-icons/react-native/bold/bag";
import { BillIcon as BillListLine } from "@solar-icons/react-native/linear/bill";
import { BillIcon as BillListBold } from "@solar-icons/react-native/bold/bill";
import { UserCircleIcon as UserCircleLine } from "@solar-icons/react-native/linear/user-circle";
import { UserCircleIcon as UserCircleBold } from "@solar-icons/react-native/bold/user-circle";
import { MagnifierIcon as MagnifierLine } from "@solar-icons/react-native/linear/magnifier";
import { MagnifierIcon as MagnifierBold } from "@solar-icons/react-native/bold/magnifier";
import { HeartIcon as HeartLine } from "@solar-icons/react-native/linear/heart";
import { HeartIcon as HeartBold } from "@solar-icons/react-native/bold/heart";
import { BellIcon as BellLine } from "@solar-icons/react-native/linear/bell";
import { BellIcon as BellBold } from "@solar-icons/react-native/bold/bell";
import { Tuning2Icon as Tuning2Line } from "@solar-icons/react-native/linear/tuning-2";
import { Tuning2Icon as Tuning2Bold } from "@solar-icons/react-native/bold/tuning-2";

const icons = {
  home: [HomeSmileLine, HomeSmileBold],
  cart: [BagLine, BagBold],
  orders: [BillListLine, BillListBold],
  profile: [UserCircleLine, UserCircleBold],
  search: [MagnifierLine, MagnifierBold],
  heart: [HeartLine, HeartBold],
  bell: [BellLine, BellBold],
  filter: [Tuning2Line, Tuning2Bold],
} as const;
export type IconName = keyof typeof icons;
export function AppIcon({ name, color, active = false, size = 24 }: { name: IconName; color: string; active?: boolean; size?: number }) {
  const Icon = icons[name][active ? 1 : 0];
  return <Icon color={color} size={size} />;
}
