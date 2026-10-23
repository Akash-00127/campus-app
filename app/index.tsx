import { Redirect } from "expo-router";
import { useSession } from "../src/session";
import { Loading } from "../src/ui";
export default function Index() {
  const { ready, session } = useSession();
  if (!ready) return <Loading />;
  return <Redirect href={session ? "/(tabs)/home" : "/welcome"} />;
}
