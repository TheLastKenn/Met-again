# Configuración del correo en Vercel

1. Crea una cuenta en Resend.
2. En **API Keys**, crea una clave y cópiala.
3. En Vercel, abre el proyecto, entra en **Settings → Environment Variables** y añade:
   - `RESEND_API_KEY`: la clave creada en Resend.
   - `EMAIL_TO`: `rojaskenner41@gmail.com`.
   - `EMAIL_FROM`: opcional. Usa al principio `Volver a conocernos <onboarding@resend.dev>`.
4. Guarda las variables y despliega nuevamente el proyecto.
5. Para enviar desde un remitente propio, verifica primero un dominio en Resend y usa su dirección como `EMAIL_FROM`.
