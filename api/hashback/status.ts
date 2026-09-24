const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Hardcoded for testing / fallbacks
const HASHBACK_BASE_URL = "https://api.hashback.co.ke";
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

function mapHashbackStatus(data: Record<string, unknown>): "paid" | "failed" | "pending" {
  const resultCode = String(data.ResultCode ?? data.resultCode ?? data.result_code ?? "").trim();
  const responseCode = String(data.ResponseCode ?? data.responseCode ?? data.response_code ?? "").trim();
  const resultDesc = String(data.ResultDesc ?? data.resultDesc ?? data.message ?? "").toLowerCase();
  const status = String(data.status ?? data.Status ?? "").toLowerCase();

  // Success cases
  if (
    resultCode === "0" ||
    status === "success" ||
    status === "completed" ||
    status === "paid" ||
    resultDesc.includes("success") ||
    resultDesc.includes("processed successfully")
  ) {
    return "paid";
  }

  // Failure cases
  if (
    (resultCode !== "" && resultCode !== "0") ||
    status === "failed" ||
    status === "cancelled" ||
    status === "canceled" ||
    resultDesc.includes("cancel") ||
    resultDesc.includes("fail") ||
    resultDesc.includes("declined") ||
    resultDesc.includes("insufficient")
  ) {
    return "failed";
  }

  return "pending";
}

export default async function handler(req: any, res: any) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const apiKey = (process.env.HASHBACK_API_KEY && process.env.HASHBACK_API_KEY.trim()) || HASHBACK_API_KEY;
  const accountId = (process.env.HASHBACK_ACCOUNT_ID && process.env.HASHBACK_ACCOUNT_ID.trim()) || HASHBACK_ACCOUNT_ID;

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
      return res.status(hashbackRes.status || 500).json({
        status: "error",
        message:
          (typeof data?.message === "string" ? data.message : null) ??
          (typeof data?.error === "string" ? data.error : null) ??
          "Status check failed",
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
    return res.status(500).json({ status: "error", message });
  }
}
