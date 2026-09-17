import { auth } from "./firebase";

const FN = "https://us-central1-snatchd-app26.cloudfunctions.net";

/** Call a portal-only Cloud Function with the signed-in admin's ID token. */
export async function adminPost<T = any>(fn: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`${FN}/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}
