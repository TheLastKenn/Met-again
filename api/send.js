import { Resend } from "resend";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "La solicitud no contiene datos válidos." });
  }

  const scene = String(payload.scene || "").trim();
  const question = String(payload.question || "").trim();
  const answer = String(payload.answer || "").trim();
  const sentAt = String(payload.sent_at || "").trim();

  if (!scene || !question || !answer) {
    return jsonResponse(400, { error: "Faltan datos para enviar la respuesta." });
  }

  if (answer.length > 4000) {
    return jsonResponse(400, { error: "La respuesta es demasiado larga." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      error: "El correo todavía no está configurado en Vercel."
    });
  }

  const resend = new Resend(apiKey);
  const recipient = process.env.EMAIL_TO || "rojaskenner41@gmail.com";
  const sender = process.env.EMAIL_FROM || "Volver a conocernos <onboarding@resend.dev>";

  try {
    const result = await resend.emails.send({
      from: sender,
      to: [recipient],
      subject: `Nueva respuesta: ${scene}`,
      replyTo: undefined,
      html: `
        <div style="font-family:Arial,sans-serif;color:#2f2a31;line-height:1.6">
          <h2 style="margin-bottom:8px">${escapeHtml(scene)}</h2>
          <p><strong>Pregunta:</strong> ${escapeHtml(question)}</p>
          <div style="white-space:pre-wrap;padding:16px;border-radius:12px;background:#f7eff2">
            ${escapeHtml(answer)}
          </div>
          ${sentAt ? `<p style="margin-top:16px;color:#777"><strong>Recibida:</strong> ${escapeHtml(sentAt)}</p>` : ""}
        </div>
      `
    });

    if (result.error) {
      return jsonResponse(502, {
        error: `No se pudo enviar el correo: ${result.error.message}`
      });
    }

    return jsonResponse(200, { ok: true, id: result.data?.id });
  } catch (error) {
    return jsonResponse(502, {
      error: `No se pudo enviar el correo: ${error instanceof Error ? error.message : "Error desconocido"}`
    });
  }
}
