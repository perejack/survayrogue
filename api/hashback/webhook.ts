import crypto from "crypto";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Hashpay-Signature",
};

function parseBody(req: any): { raw: string; json: Record<string, unknown> } {
  if (typeof req.body === "string") {
    try {
      return { raw: req.body, json: JSON.parse(req.body) };
    } catch {
      return { raw: req.body, json: {} };
    }
  }
  if (req.body && typeof req.body === "object") {
    return { raw: JSON.stringify(req.body), json: req.body };
  }
  return { raw: "", json: {} };
}

export default async function handler(req: any, res: any) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const webhookSecret = process.env.HASHBACK_WEBHOOK_SECRET;
  const { raw, json } = parseBody(req);

  // If secret is set, verify HMAC-SHA256 signature
  if (webhookSecret && webhookSecret.trim()) {
    const signatureHeader =
      (req.headers["x-hashpay-signature"] as string) ||
      (req.headers["X-Hashpay-Signature"] as string) ||
      "";

    if (!signatureHeader) {
      return res.status(401).json({ message: "Missing X-Hashpay-Signature header" });
    }

    const expectedSignature =
      "sha256=" + crypto.createHmac("sha256", webhookSecret).update(raw).digest("hex");

    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(expectedSignature)
      );
      if (!valid) {
        return res.status(401).json({ message: "Invalid signature" });
      }
    } catch {
      return res.status(401).json({ message: "Signature verification failed" });
    }
  }

  const event = json.event;
  const responseCode = json.ResponseCode;
  const isSuccess = event === "payment.success" && (responseCode === 0 || responseCode === "0");

  const checkoutRequestId =
    (typeof json.CheckoutRequestID === "string" ? json.CheckoutRequestID : null) ??
    (typeof json.checkoutid === "string" ? json.checkoutid : null);
  const transactionReceipt =
    (typeof json.TransactionReceipt === "string" ? json.TransactionReceipt : null) ??
    (typeof json.TransactionID === "string" ? json.TransactionID : null);
  const reference =
    (typeof json.TransactionReference === "string" ? json.TransactionReference : null) ??
    (typeof json.reference === "string" ? json.reference : null);

  // If Supabase server keys exist, we can update database records in background
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && isSuccess && (checkoutRequestId || reference)) {
    try {
      const matchField = checkoutRequestId ? "checkout_request_id" : "id";
      const matchVal = checkoutRequestId || reference;

      await fetch(`${supabaseUrl}/rest/v1/applications?${matchField}=eq.${encodeURIComponent(String(matchVal))}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          payment_status: "completed",
        }),
      });
    } catch (dbErr) {
      console.error("Failed to update Supabase in webhook:", dbErr);
    }
  }

  return res.status(200).json({
    received: true,
    success: isSuccess,
    checkoutRequestId,
    receipt: transactionReceipt,
    reference,
  });
}
