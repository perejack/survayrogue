const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Hardcoded for testing / fallbacks
const HASHBACK_BASE_URL = "https://api.hashback.co.ke";
const HASHBACK_API_KEY = "5ce253a8b7ec86f1952c445ba676799c089de738665cd1e10b274a087bb5152f";
const HASHBACK_ACCOUNT_ID = "HP935181";

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

function mapHashbackStatus(data: Record<string, unknown>): "paid" | "failed" | "pending" {
  const resultCode = String(data.ResultCode ?? data.resultCode ?? data.result_code ?? "").trim();
  const resultDesc = String(data.ResultDesc ?? data.resultDesc ?? data.message ?? "").toLowerCase();
  const status = String(data.status ?? data.Status ?? "").toLowerCase();

  // ── Explicit success ────────────────────────────────────────────────────────
  if (
    resultCode === "0" ||
    status === "success" ||
    status === "completed" ||
    status === "paid" ||
    resultDesc.includes("success") ||
    resultDesc.includes("processed successfully") ||
    resultDesc.includes("accepted for processing")
  ) {
    return "paid";
  }

  // ── Explicit failure — only flag as failed when explicitly cancelled, wrong PIN, or insufficient funds.
  // CRITICAL: Code 1037 ("DS timeout user cannot be reached.") is returned by HashBack IMMEDIATELY
  // while the phone prompt is ringing / waiting for PIN entry. It MUST NOT be treated as a failure!
  if (resultCode === "1037" || resultDesc.includes("user cannot be reached") || resultDesc.includes("ds timeout")) {
    return "pending";
  }

  const isConclusiveFailure =
    resultCode === "1032" ||
    resultDesc.includes("cancelled by user") ||
    resultDesc.includes("canceled by user") ||
    resultDesc.includes("request cancelled") ||
    resultDesc.includes("insufficient") ||
    resultDesc.includes("wrong pin") ||
    resultDesc.includes("invalid pin") ||
    status === "cancelled" ||
    status === "canceled";

  if (isConclusiveFailure) {
    return "failed";
  }

  // ── Everything else (non-zero codes while still processing) → keep polling ──
  return "pending";
}

export default async function handler(req: any, res: any) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  // Always use hardcoded credentials — no env override
  const apiKey = HASHBACK_API_KEY;
  const accountId = HASHBACK_ACCOUNT_ID;

  try {
    const body = parseBody(req);
    const checkoutId =
      (typeof body.checkoutId === "string" ? body.checkoutId : undefined) ??
      (typeof body.checkoutid === "string" ? body.checkoutid : undefined) ??
      (typeof body.checkoutRequestId === "string" ? body.checkoutRequestId : undefined) ??
      (typeof body.reference === "string" ? body.reference : undefined);

    if (!checkoutId) {
      return res.status(400).json({ status: "error", message: "Missing checkoutId/reference" });
    }

    const payload = {
      api_key: apiKey,
      account_id: accountId,
      checkoutid: checkoutId,
    };

    const hashbackRes = await fetch(`${HASHBACK_BASE_URL}/transactionstatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await hashbackRes.json().catch(() => null)) as Record<string, unknown> | null;

    if (!hashbackRes.ok || !data) {
      // Return pending so the client keeps polling — don't fail on transient Hashback API errors
      return res.status(200).json({
        status: "pending",
        message:
          (typeof data?.message === "string" ? data.message : null) ??
          (typeof data?.error === "string" ? data.error : null) ??
          "Status check pending",
        raw: data,
      });
    }

    const mappedStatus = mapHashbackStatus(data);
    const success = mappedStatus === "paid";

    return res.status(200).json({
      success,
      status: mappedStatus,
      state: mappedStatus === "paid" ? "success" : mappedStatus === "failed" ? "failed" : "pending",
      rawStatus: String(data.ResultDesc ?? data.status ?? data.ResponseDescription ?? ""),
      resultDesc:
        (typeof data.ResultDesc === "string" ? data.ResultDesc : "") ||
        (typeof data.ResponseDescription === "string" ? data.ResponseDescription : "") ||
        (typeof data.message === "string" ? data.message : ""),
      receiptNumber:
        (typeof data.TransactionReceipt === "string" ? data.TransactionReceipt : null) ??
        (typeof data.TransactionID === "string" ? data.TransactionID : null) ??
        (typeof data.receipt === "string" ? data.receipt : null),
      raw: data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    // Return pending so polling continues — don't prematurely fail on server errors
    return res.status(200).json({ status: "pending", message });
  }
}
