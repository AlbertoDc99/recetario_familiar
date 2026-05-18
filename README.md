# Recetario familiar

Web estática personal/familiar para consultar recetas de cocina extraídas desde documentos Word. Funciona como una pequeña aplicación sin backend: `index.html` carga los datos desde `assets/data/recipes.json` y `assets/js/main.js` genera el listado, filtros, tarjetas y vista detalle.

La web está pensada para publicarse gratis en GitHub Pages.

## Estructura del proyecto

```text
.
├── index.html
├── admin.html
├── README.md
├── robots.txt
├── .gitignore
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── data/
│   │   └── recipes.json
│   ├── img/
│   │   ├── placeholder.jpg
│   │   └── recetas/
│   └── js/
│       ├── admin.js
│       ├── auth.js
│       └── main.js
├── docs/
│   └── guia-git-github-pages.md
├── source-docs/
│   └── .gitkeep
└── tools/
    ├── README.md
    └── extract_recipes.py
```

No hay `package.json` porque la web final usa solo HTML, CSS y JavaScript vanilla. El extractor tampoco necesita dependencias externas de Python.

Cada receta mantiene una estructura de tres niveles:

- `category`: `Salado`, `Dulce` o `Tapas`.
- `subcategory`: bloque amplio, por ejemplo `Primeros`, `Segundos`, `Sencillos` o `Elaborados`.
- `type`: tipo mas concreto, por ejemplo `Sopas y cremas`, `Arroces`, `Pasta`, `Pescados`, `Bizcochos`, `Tartas y pasteles` o `Galletas`.

## Cómo probar la web localmente

Desde la raíz del proyecto:

```bash
python -m http.server 8000
```

Abre en el navegador:

```text
http://localhost:8000
```

La contraseña familiar no se documenta en este README. Compártela por un canal privado.

También puedes abrir el editor amable en:

```text
http://localhost:8000/admin.html
```

## Cómo extraer recetas desde Word

Puedes dejar los documentos `.docx` en la raíz del proyecto o moverlos a `source-docs/`. Están ignorados por Git para evitar subirlos por error.

Ejecuta:

```bash
python tools/extract_recipes.py
```

El script genera:

```text
assets/data/recipes.json
```

Tambien intenta extraer las imagenes incrustadas en los Word y guardarlas en:

```text
assets/img/recetas/
```

Este archivo si debe subirse a GitHub, porque es el que necesita la web publicada.

La extracción es semiautomática. Detecta títulos, ingredientes, preparación, notas y clasifica con reglas heurísticas. Cuando algo no está claro marca:

```json
"needsReview": true
```

## Cómo revisar recetas extraídas

Abre `assets/data/recipes.json` en VS Code y busca:

```text
"needsReview": true
```

Revisa especialmente:

- `title`
- `category`
- `subcategory`
- `type`
- `ingredients`
- `steps`
- `notes`
- `reviewNotes`

Si una subcategoría no está clara, el extractor usa `Sin clasificar`.

## Cómo editar una receta

Cada receta es un objeto JSON. No tienes que crear HTML nuevo.

Ejemplo:

```json
{
  "id": "tarta-de-queso",
  "title": "Tarta de queso",
  "category": "Dulce",
  "subcategory": "Elaborados",
  "type": "Tartas y pasteles",
  "image": "assets/img/recetas/tarta-de-queso.jpg",
  "time": "45 minutos",
  "difficulty": "Fácil",
  "servings": "6 personas",
  "ingredients": ["500 g de queso crema", "3 huevos"],
  "steps": ["Mezclar los ingredientes.", "Hornear hasta que cuaje."],
  "notes": "Queda mejor de un día para otro.",
  "tags": ["Dulce", "Horno"],
  "source": "DULCES.docx",
  "menuCandidate": false,
  "featured": false,
  "needsReview": false
}
```

Mantén el `id` único. Si cambias un título, no es obligatorio cambiar el `id`, pero conviene que siga siendo legible.

## Cómo editar recetas sin tocar JSON

Abre:

```text
admin.html
```

Desde ahí puedes:

- buscar una receta;
- cambiar categoría, subcategoría y tipo;
- editar ingredientes, pasos y notas;
- cambiar la ruta de la imagen;
- marcar una receta como comida habitual para el menú semanal;
- marcar una receta como destacada;
- crear una receta nueva;
- descargar un nuevo `recipes.json`.

El editor guarda un borrador en el navegador para que no se pierda una tanda de cambios si cierras y vuelves a abrir. Aun así, para que los cambios sean permanentes y aparezcan a toda la familia, hay que descargar `recipes.json`, sustituir `assets/data/recipes.json` y publicarlo.

Importante: el editor no publica solo. Después de descargar `recipes.json`, sustituye `assets/data/recipes.json` y publica con Git:

```bash
git add assets/data/recipes.json assets/img/recetas/
git commit -m "Actualizar recetas"
git push
```

Si se añade una imagen nueva, copia también la foto real en `assets/img/recetas/`.

En Windows puedes usar el ayudante:

```powershell
powershell -ExecutionPolicy Bypass -File tools/publicar_cambios.ps1 -Message "Actualizar recetas"
```

## Asistente de ingredientes

La página principal incluye un asistente con apariencia de chat. No usa IA externa ni cuesta dinero: compara los ingredientes escritos con las recetas del JSON y sugiere las mejores coincidencias.

También muestra ingredientes que quizá falten para cada receta sugerida.

## Favoritas, destacadas y habituales

La estrella de cada receta marca una favorita en ese navegador. Es comodo para cada persona, pero no se publica para toda la familia porque se guarda en `localStorage`.

Para destacar una receta para todos, abre `admin.html`, marca `Marcar como destacada`, descarga el nuevo `recipes.json` y publicalo. Las recetas destacadas aparecen con una etiqueta y se pueden filtrar desde `Mostrar`.

Para el menú semanal, usa mejor `Comida habitual para menú semanal`. Esa marca se guarda en `recipes.json`, por lo que es más segura para las recetas rutinarias de casa.

## Planificador de menús

La página principal incluye un planificador semanal de primeros y segundos.

Por defecto usa recetas marcadas como habituales, destacadas o favoritas. Si quieres evitar sugerencias raras entre las más de 800 recetas, marca como `Comida habitual para menú semanal` las recetas de uso normal desde `admin.html` y publica el JSON.

Si todavía no hay suficientes habituales, el planificador avisará. Puedes activar `Completar con otras recetas saladas si faltan habituales`, pero esa opción puede meter recetas menos rutinarias.

## Cómo cambiar una imagen

Guarda las fotos en:

```text
assets/img/recetas/
```

Recomendación: usa el mismo nombre que el `id` de la receta:

```text
assets/img/recetas/tarta-de-queso.jpg
```

Luego edita el campo `image`:

```json
"image": "assets/img/recetas/tarta-de-queso.jpg"
```

Si `image` está vacío, la web usa automáticamente:

```text
assets/img/placeholder.jpg
```

Puedes ir sustituyendo fotos poco a poco sin romper la web.

Si vuelves a ejecutar el extractor, no sobrescribe fotos existentes salvo que uses:

```bash
python tools/extract_recipes.py --overwrite-images
```

Para regenerar solo datos sin extraer imagenes:

```bash
python tools/extract_recipes.py --no-images
```

## Cómo cambiar la contraseña

La contraseña no está escrita en texto plano. Para cambiarla, calcula un nuevo hash y sustituye `ACCESS_DIGEST` en `assets/js/auth.js`.

Ejemplo:

```bash
python -c "import hashlib; print(hashlib.sha256('recetario-familiar::2026::TU_NUEVA_CONTRASENA'.encode('utf-8')).hexdigest())"
```

Después pega el resultado en:

```js
const ACCESS_DIGEST = "HASH_GENERADO";
```

La sesión se guarda con `sessionStorage`: normalmente se mantiene mientras la pestaña del navegador siga abierta. El botón `Bloquear` cierra el acceso en ese navegador.

## Limitaciones de seguridad

La contraseña en JavaScript no es seguridad real.

Aunque la pantalla inicial oculte visualmente el recetario, cualquier persona con conocimientos puede inspeccionar el código fuente, abrir `assets/data/recipes.json` directamente o descargar los archivos publicados. El hash evita que la contraseña aparezca escrita de forma evidente, pero no convierte esto en un login real.

Medidas incluidas de baja exposición:

- `robots.txt` con `Disallow: /`
- metatags `noindex, nofollow`
- pantalla inicial con contraseña doméstica

Estas medidas reducen accesos casuales, pero no protegen información sensible. No subas datos personales, apellidos completos, teléfonos, direcciones, recetas con notas privadas delicadas ni fotos familiares privadas.

## Qué subir a GitHub

Sube:

- `index.html`
- `admin.html`
- `README.md`
- `robots.txt`
- `.gitignore`
- `assets/css/styles.css`
- `assets/js/auth.js`
- `assets/js/admin.js`
- `assets/js/main.js`
- `assets/data/recipes.json`
- `assets/img/placeholder.jpg`
- las fotos que quieras publicar dentro de `assets/img/recetas/`
- `tools/`
- `docs/`
- `source-docs/.gitkeep`

En esta extracción inicial, `assets/img/recetas/` pesa aproximadamente 171 MB. Funciona, pero si GitHub tarda mucho convendra reducir o recomprimir imagenes.

## Qué NO subir a GitHub

No subas:

- `DULCES.docx`
- `RECETAS DE EVERNOTE.docx`
- otros `.docx` originales
- contenido real de `source-docs/`
- fotos familiares privadas
- datos personales sensibles

La regla de `.gitignore` ya ignora `*.docx` y el contenido de `source-docs/`.

## Git y GitHub Pages

Tienes una guía completa en:

```text
docs/guia-git-github-pages.md
```

Resumen rápido:

```bash
git init
git status
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin URL_DEL_REPOSITORIO
git push -u origin main
```

En GitHub:

```text
Settings > Pages > Deploy from a branch > main > /root
```

La URL será parecida a:

```text
https://TU_USUARIO.github.io/NOMBRE_DEL_REPOSITORIO/
```

## Cómo actualizar la web en el futuro

Después de editar recetas, imágenes, estilos o contraseña:

```bash
git status
git add .
git commit -m "Actualizar recetas"
git push
```

GitHub Pages suele tardar unos minutos en actualizarse.
