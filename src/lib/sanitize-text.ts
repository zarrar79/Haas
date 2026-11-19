/** Client-side sanitizers for challenge descriptions (server still re-sanitizes). */

const DANGEROUS_TAG =
  /<\s*\/?\s*(script|iframe|object|embed|link|meta|base|form|svg|math|style)[^>]*>[\s\S]*?(?:<\s*\/\s*\1\s*>|$)|<\s*(script|iframe|object|embed|link|meta|base|form|svg|math|style)[^>]*\/?\s*>/gi;
const EVENT_HANDLER = /\son\w+\s*=\s*(['"]).*?\1|\son\w+\s*=\s*[^\s>]+/gi;
const JS_OR_DATA_URL = /(javascript|vbscript|data)\s*:/gi;
const HTML_TAG = /<[^>]+>/g;
const MD_JS_LINK = /\]\(\s*(?:javascript|vbscript|data)\s*:[^)]*\)/gi;

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
}

export function sanitizePlainText(value: string): string {
  let text = decodeBasicEntities(value || "");
  text = text.replace(DANGEROUS_TAG, "");
  text = text.replace(EVENT_HANDLER, "");
  text = text.replace(JS_OR_DATA_URL, "");
  text = text.replace(HTML_TAG, "");
  return text.trim();
}

export function sanitizeMarkdown(value: string): string {
  let text = value || "";
  text = text.replace(DANGEROUS_TAG, "");
  text = text.replace(EVENT_HANDLER, "");
  text = text.replace(MD_JS_LINK, "](#)");
  text = text.replace(JS_OR_DATA_URL, "");
  text = text.replace(HTML_TAG, "");
  return text.trim();
}
