import { redirect } from "next/navigation";

import { getSessionToken } from "@/lib/session-cookie";

/** Send visitors to home when signed in, otherwise to login. */
export default async function RootPage() {
  const sessionToken = await getSessionToken();
  redirect(sessionToken ? "/home" : "/login");
}
