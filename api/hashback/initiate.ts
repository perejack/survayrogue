const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const HASHBACK_BASE_URL = "https://api.hashback.co.ke";
// Hardcoded for testing / fallbacks
const HASHBACK_API_KEY = "9851f07892796e5ab74e04b89e6d623e15363438b39213ec4224fa2805c746f5";
const HASHBACK_ACCOUNT_ID = "HP464530";

function parseBody(req: { body?: unknown }): Record<string, unknown> {
  const raw = req.body;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function normalizePhoneNumber(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) return `254${cleaned.slice(1)}`;
  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  if ((cleaned.startsWith("7") || cleaned.startsWith("1")) && cleaned.length === 9) {
    return `254${cleaned}`;
  }
  return null;
}

export default async function handler(req: any, res: any) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const apiKey = (process.env.HASHBACK_API_KEY && process.env.HASHBACK_API_KEY.trim()) || HASHBACK_API_KEY;
  const accountId = (process.env.HASHBACK_ACCOUNT_ID && process.env.HASHBACK_ACCOUNT_ID.trim()) || HASHBACK_ACCOUNT_ID;

  try {
    const body = parseBody(req);
    const rawPhone =
      (typeof body.phone === "string" ? body.phone : undefined) ??
      (typeof body.phoneNumber === "string" ? body.phoneNumber : undefined) ??
      (typeof body.phone_number === "string" ? body.phone_number : undefined) ??
      (typeof body.msisdn === "string" ? body.msisdn : undefined);

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: "Invalid phone number format" });
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const referencePrefix =
      typeof body.referencePrefix === "string" ? body.referencePrefix : "GROUPSUPER";
    const externalReference =
      typeof body.reference === "string"
        ? body.reference
        : `${referencePrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payload = {
      api_key: apiKey,
      account_id: accountId,
      amount: String(Math.round(amount)),
      msisdn: normalizedPhone,
      reference: externalReference,
    };

    const hashbackRes = await fetch(`${HASHBACK_BASE_URL}/initiatestk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await hashbackRes.json().catch(() => null)) as Record<string, unknown> | null;

    if (!hashbackRes.ok || !data) {
      return res.status(hashbackRes.status || 500).json({
        success: false,
        message:
          (typeof data?.message === "string" ? data.message : null) ??
          (typeof data?.error === "string" ? data.error : null) ??
          "HashBack STK initiation failed",
        raw: data,
      });
    }

    const checkoutId =
      (typeof data.CheckoutRequestID === "string" ? data.CheckoutRequestID : null) ??
      (typeof data.checkout_id === "string" ? data.checkout_id : null) ??
      (typeof data.checkoutid === "string" ? data.checkoutid : null) ??
      (typeof data.checkoutId === "string" ? data.checkoutId : null) ??
      (typeof data.MerchantRequestID === "string" ? data.MerchantRequestID : null);

    const isSuccess =
      data.ResponseCode === "0" ||
      data.ResponseCode === 0 ||
      data.success === true ||
      Boolean(checkoutId);

    if (!isSuccess || !checkoutId) {
      return res.status(400).json({
        success: false,
        message:
          (typeof data.CustomerMessage === "string" ? data.CustomerMessage : null) ??
          (typeof data.ResponseDescription === "string" ? data.ResponseDescription : null) ??
          (typeof data.message === "string" ? data.message : null) ??
          "Payment initiation failed",
        raw: data,
      });
    }

    return res.status(200).json({
      success: true,
      checkoutId,
      checkoutRequestId: checkoutId,
      reference: externalReference,
      normalizedPhone,
      message:
        (typeof data.CustomerMessage === "string" ? data.CustomerMessage : null) ??
        (typeof data.ResponseDescription === "string" ? data.ResponseDescription : null) ??
        (typeof data.message === "string" ? data.message : "STK push initiated"),
      raw: data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment initiation failed";
    return res.status(500).json({ success: false, message });
  }
}
