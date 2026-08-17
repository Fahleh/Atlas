import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handler for the lookup_user_id_by_email RPC. Unlike
 * table responses, RPC success bodies are the raw return value, not a
 * wrapped row, so this returns a bare UUID string, not an object.
 * addMember's "no account found" case overrides this with a null body.
 */
export const rpcHandlers = [
  http.post(
    `${SUPABASE_URL}/rest/v1/rpc/lookup_user_id_by_email`,
    () => {
      return HttpResponse.json("00000000-0000-4000-8000-000000000000");
    },
  ),
];
