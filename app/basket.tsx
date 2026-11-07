import { Redirect } from "expo-router";
import Cart from "./(tabs)/cart";
import { useSession } from "../src/session";
import { Loading } from "../src/ui";

export default function BasketRoute() {
  const { ready, session } = useSession();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (session.user.role === "VENDOR") return <Redirect href="/(tabs)/home" />;
  return <Cart />;
}
