const ALLOWED_METHODS = new Set([
  "getMe",
  "sendMessage",
  "setWebhook",
  "setMyCommands",
]);
const encoder = new TextEncoder();

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
}

async function matchesSecret(actual: string, expected: string): Promise<boolean> {
  if (!actual || !expected) return false;

  const actualHash = await sha256(actual);
  const expectedHash = await sha256(expected);

  let difference = actualHash.length ^ expectedHash.length;
  for (let index = 0; index < actualHash.length; index += 1) {
    difference |= actualHash[index] ^ (expectedHash[index] ?? 0);
  }
  return difference === 0;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  const expectedProxySecret = Deno.env.get("TELEGRAM_PROXY_SECRET") ?? "";
  const expectedBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  if (!expectedProxySecret || !expectedBotToken) {
    return jsonResponse(503, { ok: false, error: "proxy_not_configured" });
  }

  const providedSecret = request.headers.get("X-Telegram-Proxy-Secret") ?? "";
  if (
    !(await matchesSecret(providedSecret, expectedProxySecret))
  ) {
    return jsonResponse(401, { ok: false, error: "unauthorized" });
  }

  const botToken = request.headers.get("X-Telegram-Bot-Token") ?? "";
  if (
    !(await matchesSecret(botToken, expectedBotToken))
  ) {
    return jsonResponse(401, { ok: false, error: "bot_not_authorized" });
  }

  let input: { method?: unknown; payload?: unknown };
  try {
    input = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "invalid_json" });
  }

  if (
    typeof input.method !== "string" ||
    !ALLOWED_METHODS.has(input.method)
  ) {
    return jsonResponse(400, { ok: false, error: "method_not_allowed" });
  }

  const payload =
    input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
      ? input.payload
      : {};

  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/${input.method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      },
    );
    const responseBody = await telegramResponse.text();
    return new Response(responseBody, {
      status: telegramResponse.status,
      headers: {
        "Content-Type":
          telegramResponse.headers.get("Content-Type") ??
          "application/json; charset=utf-8",
      },
    });
  } catch {
    return jsonResponse(502, { ok: false, error: "telegram_unavailable" });
  }
});
