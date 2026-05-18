# Herramientas de extracción

`extract_recipes.py` convierte documentos Word `.docx` en `assets/data/recipes.json`.

Uso desde la raíz del proyecto:

```bash
python tools/extract_recipes.py
```

El script busca documentos `.docx` en la raíz del proyecto y en `source-docs/`. También puedes indicar documentos concretos:

```bash
python tools/extract_recipes.py -i "DULCES.docx" "RECETAS DE EVERNOTE.docx"
```

No necesita dependencias externas. Lee los `.docx` como archivos comprimidos XML usando la librería estándar de Python.

Además de generar `assets/data/recipes.json`, intenta extraer todas las imágenes embebidas de cada receta y guardarlas en:

```bash
assets/img/recetas/
```

Opciones útiles:

```bash
python tools/extract_recipes.py --no-images
python tools/extract_recipes.py --overwrite-images
python tools/extract_recipes.py --images-dir assets/img/recetas
```

La extracción es heurística:

- detecta títulos de recetas por líneas destacadas, normalmente en mayúsculas;
- separa ingredientes, preparación y notas si encuentra encabezados reconocibles;
- guarda `image` como foto principal y `images` como galería completa de la receta;
- clasifica recetas de `DULCES.docx` como `Dulce`;
- clasifica recetas de Evernote como `Salado`, salvo evidencias de `Tapas` o `Dulce`;
- añade un campo `type` con una clasificación más concreta, por ejemplo sopas, arroces, pasta, pescados, carnes, bizcochos, tartas o galletas;
- marca `needsReview: true` cuando faltan ingredientes, pasos o la subcategoría no es clara.

Después de ejecutar el script conviene revisar `assets/data/recipes.json`, especialmente las recetas con `needsReview: true`.
