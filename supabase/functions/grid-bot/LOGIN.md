# Inicio de sesión con llave única

Configura estos secrets en Supabase:

```bash
supabase secrets set BOT_LOGIN_KEY=Cambia8X
supabase secrets set BOT_SESSION_SECRET=pon-aqui-un-secreto-largo-y-aleatorio
```

`BOT_LOGIN_KEY` debe tener exactamente 8 caracteres alfanuméricos. `BOT_SESSION_SECRET` debe ser largo, privado y diferente. La app conserva una sesión temporal en `sessionStorage` durante 8 horas; la llave no se guarda en el navegador.

La llave no se incluye en el código ni en GitHub. Cambiarla requiere ejecutar de nuevo `supabase secrets set BOT_LOGIN_KEY=...` y desplegar la función.
