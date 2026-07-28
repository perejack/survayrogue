const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const PAYHERO_BASE_URL = "https://backend.payhero.co.ke";
// Hardcoded for testing
const PAYHERO_AUTH_TOKEN =
  "Basic OXhwektZa2VnZ1pWSUhsZUF1eG86N3I2cTA2UkFXSlJwUWhzS2cxNmJIdzNvSnNXbjNBNDNtZVh3ODhWbg==";

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

function getAuthHeader(): string {
  const token = process.env.PAYHERO_AUTH_TOKEN ?? PAYHERO_AUTH_TOKEN;
  return token.startsWith("Basic ") ? token : `Basic ${token}`;
}

function mapPayheroStatus(rawStatus: string): "paid" | "failed" | "pending" {
  const status = rawStatus.toUpperCase();
  if (status === "SUCCESS" || status === "COMPLETED" || status === "PAID") return "paid";
  if (status === "FAILED" || status === "CANCELLED" || status === "CANCELED") return "failed";
  return "pending";
}

export default async function handler(req: any, res: any) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const authHeader = getAuthHeader();

  try {
    const body = parseBody(req);
    const reference =
      (typeof body.checkoutId === "string" ? body.checkoutId : undefined) ??
      (typeof body.checkoutRequestId === "string" ? body.checkoutRequestId : undefined) ??
      (typeof body.reference === "string" ? body.reference : undefined);

    if (!reference) {
      return res.status(400).json({ status: "error", message: "Missing checkoutId/reference" });
    }

    const payheroRes = await fetch(
      `${PAYHERO_BASE_URL}/api/v2/transaction-status?reference=${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: { Authorization: authHeader },
      },
    );

    const data = (await payheroRes.json().catch(() => null)) as Record<string, unknown> | null;

    if (!payheroRes.ok || !data) {
      return res.status(payheroRes.status || 500).json({
        status: "error",
        message:
          (typeof data?.message === "string" ? data.message : null) ??
          (typeof data?.error === "string" ? data.error : null) ??
          "Status check failed",
        raw: data,
      });
    }

    const rawStatus = String(data.status ?? data.Status ?? "").trim();
    const mappedStatus = mapPayheroStatus(rawStatus);
    const success = data.success === true || mappedStatus === "paid";

    return res.status(200).json({
      success,
      status: mappedStatus,
      state: mappedStatus === "paid" ? "success" : mappedStatus === "failed" ? "failed" : "pending",
      rawStatus,
      resultDesc:
        (typeof data.message === "string" ? data.message : "") ||
        (typeof data.resultDesc === "string" ? data.resultDesc : "") ||
        rawStatus,
      receiptNumber:
        (typeof data.provider_reference === "string" ? data.provider_reference : null) ??
        (typeof data.third_party_reference === "string" ? data.third_party_reference : null) ??
        (typeof data.payment_reference === "string" ? data.payment_reference : null),
      raw: data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    return res.status(500).json({ status: "error", message });
  }
}
