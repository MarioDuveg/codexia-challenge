# CODEXIA — Landing page

Sitio estático responsive para el hackathon CODEXIA con preregistro conectado a Supabase.

## Archivos

- `index.html`: estructura, contenido y formulario de preregistro.
- `styles.css`: diseño visual responsive.
- `script.js`: menú móvil, animaciones, navegación y envío del preregistro a Supabase.
- `assets/cyborg-rojo.webp`: imagen principal del hero.
- `assets/amazon-500.webp`: imagen de la tarjeta Amazon usada en la sección de premio.

## Premio y sede

- Premio mostrado: tarjetas de regalo Amazon.com.mx de **$2000 MXN para cada integrante del equipo ganador**.
- Sede: **Tecnológico de Monterrey, Campus Sonora Norte**.
- Dirección: **Blvr. Enrique Mazón López 965, C.P. 83000, Hermosillo, Sonora, México**.

## Preregistro

El formulario guarda los datos en la tabla `public.preregistros` de Supabase mediante la REST Data API.

Campos enviados:

- `nombre`
- `edad`
- `email`
- `telefono`
- `preparatoria`
- `semestre`
- `tiene_laptop`
- `areas_interes`
- `experiencia_programando`

La clave incluida en `script.js` es una **Publishable key** de Supabase, diseñada para usarse en aplicaciones públicas del navegador. La seguridad depende de mantener Row Level Security (RLS) y los permisos de la tabla correctamente configurados.

Nunca agregues una `sb_secret_...`, `service_role` ni la contraseña de PostgreSQL al código del sitio.

## Uso

Abre `index.html` directamente para revisar la interfaz o publica la carpeta completa como sitio estático en Render.

Para producción, asegúrate de que:

1. La tabla `public.preregistros` exista.
2. RLS esté habilitado.
3. El rol público solo tenga permiso de `INSERT` en los campos del formulario.
4. No exista una política pública de `SELECT`, `UPDATE` o `DELETE`.

## Actualización de sede e itinerario
- Entrada gratuita.
- Sede base: Tecnológico de Monterrey, Campus Sonora Norte — Sala Design Thinking.
- Se agregó el itinerario completo del evento de 08:00 a 13:30.


## Resultados en vivo (nuevo)

La página principal ahora incluye una sección **Resultados** (`/#resultados`) integrada en el diseño. Usa `scores.js` y `scores.css` para consultar **solo mediante GET** la tabla `public.scores` del proyecto independiente **codexia-scores**.

- Proyecto de scores: `https://zgpfcmvjmjfaphtudmis.supabase.co` (la URL base, sin `/rest/v1/`).
- Clave: `sb_publishable_...` proporcionada para ese proyecto.
- Columnas utilizadas: `equipo`, `taller_1`, `taller_2`, `taller_3`, `taller_4`, `batalla_final`, `total`.
- Orden por puntuación **total** o **Batalla final** (selector), podio de los primeros tres y tabla completa.
- Actualización inicial, manual y automática cada **15 segundos** mientras la pestaña está visible.
- Mensajes para tabla vacía, falta de acceso, errores HTTP y conexión perdida; si falla una actualización, se conserva la última clasificación obtenida.

**La página de resultados no inserta ni modifica scores.** Los resultados provienen de otra aplicación conectada al mismo proyecto de Supabase. Para que funcionen las lecturas, la tabla `public.scores` debe existir y las políticas RLS deben permitir `SELECT` al rol `anon` (si se usa el acceso público sin inicio de sesión).

**Atención:** el formulario original de preregistro permanece como estaba: `script.js` sigue guardando únicamente preregistros en el proyecto `qtqisnnuaygwdshenqhv`, separado del proyecto de puntuaciones. Esto no afecta a los scores.

Para iniciar la web no se requiere `npm install` ni un backend: es HTML, CSS y JavaScript estáticos. Publica todos los archivos conservando las rutas, por ejemplo en Render, Netlify o Vercel.
