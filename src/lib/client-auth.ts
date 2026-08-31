import { cookies } from "next/headers";
import { verifySupabaseUserToken } from "./supabase-rest";

export const clientAccessCookie="client_access_token";
export const clientRefreshCookie="client_refresh_token";
export async function getClientAuthorization(){const token=(await cookies()).get(clientAccessCookie)?.value;const user=await verifySupabaseUserToken(token);return user&&token?{user,token}:null}
export async function getClientSession(){return (await getClientAuthorization())?.user??null}
