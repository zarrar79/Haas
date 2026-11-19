/** HttpOnly cookie that stores the Django JWT on the BFF.
 *  Same name as dashboard-clone so both apps share the session on one host.
 *  Kept in a tiny edge-safe module so middleware can import it. */
export const SESSION_COOKIE_NAME = "session_token";
