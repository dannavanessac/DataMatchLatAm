# DataMatch LatAm

**Emprende con quien encaja.** Plataforma que recomienda cofundadores según compatibilidad, complementariedad y posibles puntos de fricción, y explica el porqué de cada match.

Prototipo del Grupo 2 · Curso de Emprendimiento · Universidad Externado de Colombia.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
| --- | --- |
| `streamlit_app.py`, `requirements.txt`, `.streamlit/` | Despliegue en Streamlit Community Cloud. |
| `index.html` | Página de entrada para Vercel. `/#admin` abre el panel de administración. |
| `app.js` | App para emprendedores: registro, cuestionario, arquetipo, matches, solicitudes, equipo, encuestas y planes. |
| `admin.js` | Panel de administración: indicadores, embudo, perfiles, encuestas, modelo y exportación. |
| `core.js` | Lógica compartida: puntaje de match, explicaciones, arquetipos y reentrenamiento del modelo. |
| `supabase-adapter.js` | Conexión con la base de datos de Supabase. |
| `config.js` | **Aquí pegas la URL y la clave pública de tu proyecto de Supabase, y los correos de administración.** |
| `schema.sql` | Crea la tabla y los permisos en Supabase. |
| `styles.css`, `favicon.svg` | Identidad visual. |

No necesita compilar nada: es un sitio estático.

## Despliegue en Streamlit Community Cloud

El repositorio trae `streamlit_app.py`, que empaqueta la app (HTML y JavaScript) y la muestra a pantalla completa dentro de Streamlit.

1. **Supabase:** haz los pasos 1 y 2 de la sección de Vercel (crear el proyecto, correr `schema.sql` y desactivar "Confirm email").
2. Entra a [share.streamlit.io](https://share.streamlit.io) con tu cuenta de GitHub → **Create app** → **Deploy a public app from GitHub**.
3. Elige este repositorio, la rama `main` y el archivo principal `streamlit_app.py`. Si quieres, escribe una URL propia, por ejemplo `datamatch-latam`.
4. Abre **Advanced settings → Secrets** y pega esto con tus datos (el modelo está en `.streamlit/secrets.toml.example`):
   ```toml
   SUPABASE_URL = "https://xxxxxxxx.supabase.co"
   SUPABASE_ANON_KEY = "eyJ..."
   ADMINS = ["dannav150607@gmail.com"]
   APP_URL = "https://datamatch-latam.streamlit.app/"
   ```
5. Presiona **Deploy**. En un par de minutos queda en línea.

En Streamlit no hace falta editar `config.js`: las claves se toman de los Secrets.

| Para | Enlace |
| --- | --- |
| La app | `https://datamatch-latam.streamlit.app` |
| Panel de administración | `https://datamatch-latam.streamlit.app/?vista=admin` |
| Invitaciones | Se generan solas como `.../?ref=<id>` |

Las apps gratuitas de Streamlit se duermen tras unos días sin visitas; la primera persona que entre después verá un botón para despertarla, y tarda unos segundos.

## Despliegue en Vercel (alternativa, 4 pasos)

### 1. Crear la base de datos en Supabase
1. Entra a [supabase.com](https://supabase.com), crea una cuenta y un proyecto nuevo (plan gratis). Región sugerida: **East US** o **São Paulo**.
2. Ve a **SQL Editor → New query**, pega todo el contenido de `schema.sql` y presiona **Run**. Debe decir *Success*.
3. Ve a **Project Settings → API** y copia:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public key** (una clave larga que empieza por `eyJ...`)

### 2. Configurar las cuentas con contraseña
1. Ve a **Authentication → Sign In / Providers → Email** y **desactiva "Confirm email"**. Así los usuarios entran apenas crean su cuenta. El servidor de correo gratuito de Supabase solo envía unos pocos correos por hora y no alcanzaría para una prueba con un curso.
2. Las personas que pueden ver el panel de administración se definen en `config.js` → `ADMINS`. Cada una crea su cuenta normal en la app con ese correo y luego entra a `/#admin` con la misma contraseña.

### 3. Pegar las claves en `config.js`
Reemplaza los dos textos `PEGA_AQUI...` por la Project URL y la anon key. La anon key es pública por diseño; no pegues nunca la `service_role` key.

### 4. Publicar en Vercel
1. Sube esta carpeta a un repositorio de GitHub (por ejemplo `datamatch-latam`).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio.
3. En *Framework Preset* deja **Other**. No cambies nada más y presiona **Deploy**.
4. En un minuto tendrás tu enlace, por ejemplo `https://datamatch-latam.vercel.app`.

Cada vez que hagas un cambio en GitHub, Vercel publica la nueva versión sola.

## Cómo comprobar que todo funciona
- Abre el enlace: al pie de la página debe decir **"Tus datos se guardan en DataMatch."** Si dice *Modo demostración*, revisa `config.js`.
- Crea una cuenta de prueba y termina el cuestionario.
- Entra a `/#admin` con tu usuario: debes ver 1 usuario registrado.
- En Supabase → **Table Editor → docs** verás las filas guardadas.

## Limitaciones conocidas del prototipo
- Las contraseñas las maneja Supabase Auth: la app nunca las guarda. Para recuperar una contraseña, por ahora hay que hacerlo desde Supabase → Authentication → Users. Para un lanzamiento abierto conviene configurar un servidor de correo propio (SMTP) y activar "Olvidé mi contraseña".
- Las fotos de perfil se guardan reducidas a 256 × 256 px dentro del perfil.
- La clave pública permite leer la tabla a quien sepa usar la API de Supabase, incluidos correos y WhatsApp de quienes formaron equipo. Úsalo con participantes que dieron su consentimiento y no con datos sensibles.
- El modelo se reentrena en el navegador de quien genera la señal. Con muchos usuarios convendría moverlo a una función programada de Supabase.
