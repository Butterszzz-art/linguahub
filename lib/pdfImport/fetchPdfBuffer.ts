// lib/pdfImport/fetchPdfBuffer.ts
//
// Fetches raw PDF bytes from a URL. Kept separate from extractPdfText so the
// "get the bytes" concern (size limits, content-type sanity check) is
// distinct from the "parse the bytes" concern.

import { lookup } from "node:dns/promises";

const MAX_PDF_BYTES = 40 * 1024 * 1024; // 40MB — FSI volume PDFs run a few MB each

export async function fetchPdfBuffer(pdfUrl: string): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(pdfUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http(s) URLs are supported.");
  }

  // This endpoint takes a URL from the browser and fetches it from the
  // server, so without a check here it's a textbook SSRF: a "PDF URL" of
  // http://169.254.169.254/... or http://localhost:<internal-port>/... would
  // have this server reach into its own private network on the caller's
  // behalf. Resolve the hostname and refuse anything that lands on a
  // loopback/private/link-local address before ever fetching it.
  await assertPublicHost(url.hostname);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Couldn't fetch that URL (${response.status} ${response.statusText}).`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PDF_BYTES) {
    throw new Error(`That file is too large (over ${MAX_PDF_BYTES / (1024 * 1024)}MB).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_PDF_BYTES) {
    throw new Error(`That file is too large (over ${MAX_PDF_BYTES / (1024 * 1024)}MB).`);
  }

  const buffer = Buffer.from(arrayBuffer);
  // Cheap sanity check — real PDFs start with "%PDF-". Catches "the URL
  // actually returned an HTML error/login page" before it hits the parser.
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new Error("That URL didn't return a PDF file (the response doesn't start with a PDF signature).");
  }

  return buffer;
}

async function assertPublicHost(hostname: string): Promise<void> {
  let address: string;
  try {
    address = (await lookup(hostname)).address;
  } catch {
    throw new Error("Couldn't resolve that URL's hostname.");
  }

  if (isPrivateOrReservedIp(address)) {
    throw new Error("That URL points at a private/internal address, which isn't allowed.");
  }
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip.includes(":")) {
    const normalized = ip.toLowerCase();
    return (
      normalized === "::1" || // loopback
      normalized.startsWith("fe80:") || // link-local
      normalized.startsWith("fc") || // unique local (fc00::/7)
      normalized.startsWith("fd") ||
      normalized.startsWith("::ffff:") // IPv4-mapped — checked again below via the mapped address
    );
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true; // unparsable — refuse

  const [a, b] = parts;
  return (
    a === 127 || // loopback
    a === 10 || // private
    a === 0 || // "this network"
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 169 && b === 254) || // link-local (includes cloud metadata 169.254.169.254)
    (a === 100 && b >= 64 && b <= 127) // carrier-grade NAT
  );
}
