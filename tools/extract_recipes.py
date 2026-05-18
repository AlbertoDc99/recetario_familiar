from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET
from zipfile import ZipFile


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
W = f"{{{W_NS}}}"
R = f"{{{R_NS}}}"
NS = {"w": W_NS, "a": A_NS, "r": R_NS, "rel": REL_NS}

DEFAULT_OUTPUT = Path("assets/data/recipes.json")
DEFAULT_IMAGES_DIR = Path("assets/img/recetas")
SOURCE_DIR = Path("source-docs")
PLACEHOLDER_IMAGE = ""

INGREDIENT_HEADINGS = (
    "ingrediente",
    "ingredientes",
    "para la masa",
    "para el relleno",
    "para la salsa",
    "para decorar",
)

STEP_HEADINGS = (
    "preparacion",
    "preparación",
    "elaboracion",
    "elaboración",
    "metodo",
    "método",
    "procedimiento",
    "preparar",
    "como se hace",
    "cómo se hace",
    "modo de hacerlo",
    "receta paso a paso",
    "paso a paso",
)

NOTE_HEADINGS = (
    "consejos",
    "consejos y preguntas",
    "notas",
    "nota",
    "observaciones",
    "trucos",
    "variantes",
    "fuente",
)

GENERIC_TITLE_WORDS = {
    "otra",
    "otra receta",
    "otro",
    "ingredientes",
    "preparacion",
    "preparación",
    "elaboracion",
    "elaboración",
}

TAPA_KEYWORDS = (
    "aperitivo",
    "aperitivos",
    "tapa",
    "tapas",
    "pincho",
    "pinchos",
    "montadito",
    "montaditos",
    "canape",
    "canapes",
    "canapé",
    "canapés",
    "croqueta",
    "croquetas",
    "empanadilla",
    "empanadillas",
    "bocadito",
    "bocaditos",
    "chupito",
    "chupitos",
)

SWEET_KEYWORDS = (
    "azucar",
    "azúcar",
    "bizcocho",
    "tarta",
    "galleta",
    "galletas",
    "flan",
    "mousse",
    "postre",
    "chocolate",
    "crema dulce",
    "dulce",
    "helado",
    "natillas",
    "magdalena",
    "magdalenas",
    "brownie",
    "cheesecake",
    "tiramisú",
    "tiramisu",
    "merengue",
    "caramelo",
)

FIRST_COURSE_KEYWORDS = (
    "sopa",
    "crema",
    "ensalada",
    "arroz",
    "pasta",
    "verdura",
    "verduras",
    "legumbre",
    "legumbres",
    "alubia",
    "alubias",
    "garbanzo",
    "garbanzos",
    "lenteja",
    "lentejas",
    "judia",
    "judías",
    "menestra",
    "gazpacho",
    "salmorejo",
    "cardo",
    "coliflor",
    "berenjena",
    "berenjenas",
)

SECOND_COURSE_KEYWORDS = (
    "pollo",
    "carne",
    "pescado",
    "lomo",
    "ternera",
    "cerdo",
    "cordero",
    "bacalao",
    "merluza",
    "rape",
    "atun",
    "atún",
    "salmon",
    "salmón",
    "bonito",
    "cazon",
    "cazón",
    "albondiga",
    "albóndiga",
    "albóndigas",
    "chuleta",
    "chuletas",
    "carrillera",
    "carrilleras",
    "solomillo",
    "conejo",
    "gambas",
    "langostinos",
    "marisco",
)

SIMPLE_SWEET_KEYWORDS = (
    "rapido",
    "rápido",
    "facil",
    "fácil",
    "sencillo",
    "microondas",
    "sin horno",
    "batido",
    "5 minutos",
    "cinco minutos",
    "en una taza",
    "3 ingredientes",
    "2 ingredientes",
)

COMPLEX_SWEET_KEYWORDS = (
    "tarta",
    "capas",
    "montaje",
    "decorar",
    "decoracion",
    "decoración",
    "reposo",
    "reposar",
    "frigorifico",
    "frigorífico",
    "congelador",
    "horno",
    "levado",
    "fermentar",
    "glaseado",
    "cobertura",
    "relleno",
    "crema pastelera",
    "merengue",
    "ganache",
    "brioche",
    "macaron",
    "macarons",
    "milhojas",
    "brazo de gitano",
)

TAG_KEYWORDS = {
    "Thermomix": ("thermomix", "tmx"),
    "Microondas": ("microondas",),
    "Horno": ("horno", "hornear", "horneado"),
    "Sin horno": ("sin horno",),
    "Chocolate": ("chocolate", "cacao"),
    "Arroz": ("arroz",),
    "Pasta": ("pasta", "macarrones", "espagueti", "espaguetis"),
    "Pescado": ("pescado", "bacalao", "merluza", "rape", "atun", "atún", "salmon", "salmón"),
    "Carne": ("carne", "ternera", "cerdo", "lomo", "cordero", "pollo"),
    "Verduras": ("verdura", "verduras", "berenjena", "calabacin", "calabacín", "coliflor"),
}

TAPA_TYPE_RULES = (
    ("Canapes", ("canape", "canapes", "canapé", "canapés", "tartaleta", "tartaletas")),
    ("Croquetas y fritos", ("croqueta", "croquetas", "buñuelo", "buñuelos", "frito", "fritos")),
    ("Montaditos y pinchos", ("montadito", "montaditos", "pincho", "pinchos", "tosta", "tostas")),
    ("Empanadillas y hojaldres", ("empanadilla", "empanadillas", "hojaldre", "hojaldres")),
    ("Aperitivos", ("aperitivo", "aperitivos", "bocadito", "bocaditos", "chupito", "chupitos")),
)

SALTY_TYPE_RULES = (
    ("Sopas y cremas", "Primeros", ("sopa", "sopas", "crema", "cremas", "gazpacho", "salmorejo", "pure", "puré", "caldo")),
    ("Arroces", "Primeros", ("arroz", "paella", "risotto")),
    ("Pasta", "Primeros", ("pasta", "macarrones", "espagueti", "espaguetis", "spaghetti", "canelones", "lasaña", "lasaña", "ñoquis")),
    ("Legumbres", "Primeros", ("alubia", "alubias", "garbanzo", "garbanzos", "lenteja", "lentejas", "judia", "judías", "fabes")),
    ("Verduras y hortalizas", "Primeros", ("verdura", "verduras", "berenjena", "berenjenas", "calabacin", "calabacín", "coliflor", "cardo", "acelga", "acelgas", "pimiento", "pimientos", "alcachofa", "alcachofas")),
    ("Ensaladas", "Primeros", ("ensalada", "ensaladas", "aliño", "aliños")),
    ("Guisos y potajes", "Primeros", ("guiso", "guisos", "potaje", "potajes", "cocido", "caldereta", "estofado", "menestra")),
    ("Huevos y tortillas", "Primeros", ("huevo", "huevos", "tortilla", "tortillas", "revuelto", "revueltos")),
    ("Salsas y bases", "Primeros", ("salsa", "salsas", "bechamel", "mayonesa", "alioli", "vinagreta")),
    ("Pollo y aves", "Segundos", ("pollo", "pavo", "ave", "aves")),
    ("Carnes", "Segundos", ("carne", "ternera", "cerdo", "lomo", "solomillo", "cordero", "chuleta", "chuletas", "carrillera", "carrilleras", "conejo")),
    ("Albondigas y rellenos", "Segundos", ("albondiga", "albóndiga", "albondigas", "albóndigas", "relleno", "rellenos")),
    ("Pescados", "Segundos", ("pescado", "merluza", "rape", "bacalao", "atun", "atún", "bonito", "salmon", "salmón", "cazon", "cazón", "besugo", "boqueron", "boquerón")),
    ("Mariscos", "Segundos", ("marisco", "mariscos", "gamba", "gambas", "langostino", "langostinos", "almeja", "almejas", "mejillon", "mejillón", "mejillones")),
    ("Asados", "Segundos", ("asado", "asados", "horno", "horneado")),
)

SWEET_TYPE_RULES = (
    ("Bizcochos", ("bizcocho", "bizcochos", "cake", "plum cake")),
    ("Tartas y pasteles", ("tarta", "tartas", "pastel", "pasteles", "cheesecake", "charlota", "carlota", "pie")),
    ("Galletas", ("galleta", "galletas", "cookies", "pasta de te", "pastas de te")),
    ("Flanes y natillas", ("flan", "flanes", "natillas", "crema catalana")),
    ("Cremas y mousses", ("mousse", "mousses", "crema", "cremas", "dalky", "dalkys")),
    ("Helados", ("helado", "helados", "sorbete", "sorbetes")),
    ("Magdalenas y muffins", ("magdalena", "magdalenas", "muffin", "muffins", "cupcake", "cupcakes")),
    ("Brownies y chocolate", ("brownie", "brownies", "chocolate", "coulant", "trufa", "trufas")),
    ("Masas dulces", ("brioche", "roscón", "roscon", "ensaimada", "masa", "masas", "eclair", "éclair", "hojaldre")),
    ("Postres de fruta", ("manzana", "fresa", "fresas", "limon", "limón", "naranja", "mango", "piña", "platano", "plátano")),
    ("Bebidas dulces", ("batido", "batidos", "chocolate a la taza")),
    ("Reposteria frita", ("flores", "buñuelo", "buñuelos", "rosquilla", "rosquillas", "barquillo", "barquillos")),
)


def normalize_text(value: str) -> str:
    text = value.replace("\u00a0", " ")
    text = text.replace("\u200b", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s+\n", "\n", text)
    return text.strip()


def normalize_for_match(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return normalized.lower()


def paragraph_text(paragraph: ET.Element) -> str:
    parts: list[str] = []
    for node in paragraph.iter():
        if node.tag == W + "t":
            parts.append(node.text or "")
        elif node.tag == W + "tab":
            parts.append("\t")
        elif node.tag == W + "br":
            parts.append("\n")
    return normalize_text("".join(parts))


def relationship_targets(archive: ZipFile) -> dict[str, str]:
    rels_path = "word/_rels/document.xml.rels"
    if rels_path not in archive.namelist():
        return {}

    rels = ET.fromstring(archive.read(rels_path))
    targets: dict[str, str] = {}
    for rel in rels.findall("rel:Relationship", NS):
        rel_id = rel.attrib.get("Id")
        target = rel.attrib.get("Target")
        if rel_id and target:
            targets[rel_id] = target
    return targets


def normalize_media_target(target: str) -> str:
    target = target.replace("\\", "/").lstrip("/")
    if target.startswith("word/"):
        return target
    if target.startswith("../"):
        return target[3:]
    return f"word/{target}"


def extract_docx_content(path: Path) -> tuple[list[str], list[tuple[int, list[str]]]]:
    with ZipFile(path) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        rel_targets = relationship_targets(archive)

    lines: list[str] = []
    image_events: list[tuple[int, list[str]]] = []
    for paragraph in document.findall(".//w:p", NS):
        rel_ids = [
            blip.attrib.get(R + "embed")
            for blip in paragraph.findall(".//a:blip", NS)
            if blip.attrib.get(R + "embed")
        ]
        targets = [rel_targets[rel_id] for rel_id in rel_ids if rel_id in rel_targets]
        if targets:
            image_events.append((len(lines), targets))

        text = paragraph_text(paragraph)
        if not text:
            continue
        for line in text.splitlines():
            cleaned = normalize_text(line)
            if cleaned:
                lines.append(cleaned)
    return lines, image_events


def image_extension(target: str) -> str:
    suffix = Path(target).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        return ".jpg" if suffix == ".jpeg" else suffix
    return ".jpg"


def write_recipe_image(
    docx_path: Path,
    target: str,
    recipe_id: str,
    images_dir: Path,
    *,
    overwrite: bool = False,
) -> str:
    extension = image_extension(target)
    output_path = images_dir / f"{recipe_id}{extension}"
    relative_path = output_path.as_posix()

    if output_path.exists() and not overwrite:
        return relative_path

    zip_target = normalize_media_target(target)
    with ZipFile(docx_path) as archive:
        if zip_target not in archive.namelist():
            return ""
        image_bytes = archive.read(zip_target)

    images_dir.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_bytes)
    return relative_path


def first_image_target_for_recipe(
    image_events: list[tuple[int, list[str]]],
    start: int,
    end: int,
) -> str:
    for line_index, targets in image_events:
        if start <= line_index <= end and targets:
            return targets[0]
    return ""


def section_type(line: str) -> str | None:
    compact = normalize_for_match(line).strip(" :-.\t")
    compact = re.sub(r"\s+", " ", compact)

    if not compact:
        return None
    if any(compact.startswith(heading) for heading in INGREDIENT_HEADINGS):
        return "ingredients"
    if any(compact.startswith(heading) for heading in STEP_HEADINGS):
        return "steps"
    if any(compact.startswith(heading) for heading in NOTE_HEADINGS):
        return "notes"
    if compact in GENERIC_TITLE_WORDS:
        return None
    return None


def looks_like_url(line: str) -> bool:
    return bool(re.search(r"https?://|www\.", line, flags=re.IGNORECASE))


def is_numbered_or_bullet(line: str) -> bool:
    return bool(re.match(r"^\s*(?:[-*•·▪🔹]+|\d+[.)-])\s+", line))


def letter_stats(line: str) -> tuple[int, int, int]:
    letters = [char for char in line if char.isalpha()]
    upper = sum(1 for char in letters if char.upper() == char and char.lower() != char)
    lower = sum(1 for char in letters if char.lower() == char and char.upper() != char)
    return len(letters), upper, lower


def has_recipe_marker_ahead(lines: list[str], index: int, window: int = 14) -> bool:
    for next_line in lines[index + 1 : index + 1 + window]:
        marker = section_type(next_line)
        if marker in {"ingredients", "steps"}:
            return True
    return False


def is_probable_title(lines: list[str], index: int) -> bool:
    line = lines[index].strip()
    compact = normalize_for_match(line).strip(" :-.\t")
    letters, upper, lower = letter_stats(line)

    if len(line) < 3 or len(line) > 120:
        return False
    if letters < 3:
        return False
    if looks_like_url(line):
        return False
    if section_type(line):
        return False
    if is_numbered_or_bullet(line):
        return False
    if line.endswith((".", ";", ",")):
        return False
    if re.match(r"^(para|por|con)\s+\d+", compact):
        return False

    upper_ratio = upper / max(letters, 1)
    uppercase_title = upper_ratio >= 0.62 and upper >= max(3, lower * 1.7)
    followed_by_marker = has_recipe_marker_ahead(lines, index)
    next_is_marker = index + 1 < len(lines) and section_type(lines[index + 1]) in {"ingredients", "steps"}

    if compact in GENERIC_TITLE_WORDS:
        return followed_by_marker
    if uppercase_title:
        return True
    starts_like_title = line[:1].isupper()
    if next_is_marker and len(line) <= 90 and starts_like_title and not ingredient_like(line):
        return True
    return False


def find_recipe_boundaries(lines: list[str]) -> list[int]:
    candidates = [index for index in range(len(lines)) if is_probable_title(lines, index)]
    if not candidates and lines:
        return [0]

    boundaries: list[int] = []
    previous = -100
    for index in candidates:
        if index - previous <= 1:
            continue
        boundaries.append(index)
        previous = index
    return boundaries


def clean_list_item(line: str, *, step: bool = False) -> str:
    value = normalize_text(line)
    value = re.sub(r"^\s*[-*•·▪🔹]+\s*", "", value)
    if step:
        value = re.sub(r"^\s*\d+[.)-]\s*", "", value)
    return value.strip()


def ingredient_like(line: str) -> bool:
    text = normalize_for_match(line)
    if looks_like_url(line):
        return False
    if len(line) > 130:
        return False
    measure_pattern = r"\b(\d+(?:[.,/]\d+)?|un|una|dos|tres|cuatro|medio|media|pizca|chorrito|cucharad[aitas]*|taza|vaso|sobre|gr|g|kg|ml|l)\b"
    fraction_pattern = r"[½¼¾⅓⅔]"
    food_pattern = r"\b(aceite|sal|azucar|azúcar|harina|levadura|huevo|huevos|leche|mantequilla|tomate|cebolla|ajo|pimienta|chocolate|nata|queso|pollo|carne|pescado|bacalao|limon|limón|naranja|vainilla|canela)\b"
    return bool(
        re.search(measure_pattern, text)
        or re.search(fraction_pattern, line)
        or re.search(food_pattern, text)
    )


def looks_like_procedure(line: str) -> bool:
    text = normalize_for_match(line)
    if len(line) > 100:
        return True
    return bool(
        re.match(
            r"^(se |pon|poner|precalienta|precalentar|mezcla|mezclar|batir|bate|añad|anad|incorpora|hornea|hornear|deja|dejamos|corta|pelar|frie|freir|calienta|calentar|monta|montar)",
            text,
        )
    )


def maybe_start_ingredient_block(lines: list[str], index: int) -> bool:
    sample = lines[index : index + 4]
    return len(sample) >= 2 and sum(1 for line in sample if ingredient_like(line)) >= 2


def split_step_line(line: str) -> list[str]:
    cleaned = clean_list_item(line, step=True)
    if len(cleaned) < 160:
        return [cleaned]

    parts = re.split(r"\s+(?=\d+[.)-]\s+)", line)
    if len(parts) <= 1:
        return [cleaned]
    return [clean_list_item(part, step=True) for part in parts if clean_list_item(part, step=True)]


def parse_body(lines: list[str]) -> tuple[list[str], list[str], str]:
    ingredients: list[str] = []
    steps: list[str] = []
    notes: list[str] = []
    current = "notes"

    for index, line in enumerate(lines):
        marker = section_type(line)
        if marker:
            current = marker
            continue

        if current == "notes" and maybe_start_ingredient_block(lines, index):
            current = "ingredients"

        if current == "ingredients" and ingredients and not ingredient_like(line) and looks_like_procedure(line):
            current = "steps"

        if current == "ingredients":
            ingredients.append(clean_list_item(line))
        elif current == "steps":
            steps.extend(split_step_line(line))
        else:
            notes.append(clean_list_item(line))

    return compact_items(ingredients), compact_items(steps), "\n".join(compact_items(notes))


def compact_items(items: Iterable[str]) -> list[str]:
    result: list[str] = []
    for item in items:
        cleaned = normalize_text(item)
        if cleaned and cleaned not in result:
            result.append(cleaned)
    return result


def count_keywords(text: str, keywords: Iterable[str]) -> int:
    normalized = normalize_for_match(text)
    score = 0
    seen: set[str] = set()
    for keyword in keywords:
        key = normalize_for_match(keyword)
        if key in seen:
            continue
        seen.add(key)
        if re.search(rf"(?<!\w){re.escape(key)}(?!\w)", normalized):
            score += 1
    return score


def weighted_keyword_score(title: str, text: str, keywords: Iterable[str]) -> int:
    title_normalized = normalize_for_match(title).strip()
    starts_with_keyword = any(
        title_normalized.startswith(normalize_for_match(keyword))
        for keyword in keywords
    )
    start_bonus = 5 if starts_with_keyword else 0
    return count_keywords(title, keywords) * 8 + count_keywords(text, keywords) + start_bonus


def best_tapa_type(text: str, title: str) -> str:
    scored: list[tuple[int, int, str]] = []
    for index, (recipe_type, keywords) in enumerate(TAPA_TYPE_RULES):
        score = weighted_keyword_score(title, text, keywords)
        if score:
            scored.append((score, index, recipe_type))
    if not scored:
        return "Aperitivos"
    scored.sort(key=lambda item: (-item[0], item[1]))
    return scored[0][2]


def best_salty_type(text: str, title: str) -> tuple[str, str]:
    scored: list[tuple[int, int, str, str]] = []
    for index, (recipe_type, default_subcategory, keywords) in enumerate(SALTY_TYPE_RULES):
        score = weighted_keyword_score(title, text, keywords)
        if score:
            scored.append((score, index, recipe_type, default_subcategory))

    if not scored:
        return "Sin clasificar", "Sin clasificar"

    scored.sort(key=lambda item: (-item[0], item[1]))
    _, _, recipe_type, subcategory = scored[0]
    return recipe_type, subcategory


def best_sweet_type(text: str, title: str) -> str:
    scored: list[tuple[int, int, str]] = []
    for index, (recipe_type, keywords) in enumerate(SWEET_TYPE_RULES):
        score = weighted_keyword_score(title, text, keywords)
        if score:
            scored.append((score, index, recipe_type))
    if not scored:
        return "Sin clasificar"
    scored.sort(key=lambda item: (-item[0], item[1]))
    return scored[0][2]


def classify_recipe(
    source_name: str,
    title: str,
    ingredients: list[str],
    steps: list[str],
    notes: str,
) -> tuple[str, str, str, bool, list[str]]:
    default_category = "Dulce" if "dulce" in normalize_for_match(source_name) else "Salado"
    text = " ".join([title, *ingredients, *steps, notes])
    title_score_text = f"{title} {title} {text}"

    sweet_score = count_keywords(title_score_text, SWEET_KEYWORDS)
    tapa_score = count_keywords(title_score_text, TAPA_KEYWORDS)
    savory_score = count_keywords(title_score_text, FIRST_COURSE_KEYWORDS + SECOND_COURSE_KEYWORDS)

    if default_category == "Dulce":
        category = "Dulce"
    elif tapa_score >= 2 or count_keywords(title, TAPA_KEYWORDS) >= 1:
        category = "Tapas"
    elif sweet_score >= 4 and savory_score <= 1:
        category = "Dulce"
    else:
        category = "Salado"

    reasons: list[str] = []
    needs_review = False

    if category == "Tapas":
        subcategory = "Tapas"
        recipe_type = best_tapa_type(text, title)
    elif category == "Dulce":
        recipe_type = best_sweet_type(text, title)
        simple_score = count_keywords(title_score_text, SIMPLE_SWEET_KEYWORDS)
        complex_score = count_keywords(title_score_text, COMPLEX_SWEET_KEYWORDS)
        if len(steps) >= 9 or len(ingredients) >= 12:
            complex_score += 2
        if len(steps) <= 4 and len(ingredients) <= 7:
            simple_score += 1

        if complex_score >= simple_score + 2:
            subcategory = "Elaborados"
        elif simple_score >= complex_score + 1:
            subcategory = "Sencillos"
        elif recipe_type in {"Bizcochos", "Galletas", "Flanes y natillas", "Magdalenas y muffins", "Brownies y chocolate", "Bebidas dulces", "Reposteria frita"}:
            subcategory = "Sencillos"
        elif recipe_type in {"Tartas y pasteles", "Masas dulces", "Cremas y mousses", "Helados"}:
            subcategory = "Elaborados"
        else:
            subcategory = "Sin clasificar"
            needs_review = True
            reasons.append("Subcategoria dulce poco clara")
    else:
        recipe_type, subcategory = best_salty_type(text, title)
        if subcategory == "Sin clasificar":
            first_score = count_keywords(title_score_text, FIRST_COURSE_KEYWORDS)
            second_score = count_keywords(title_score_text, SECOND_COURSE_KEYWORDS)
            if first_score >= second_score + 1:
                subcategory = "Primeros"
            elif second_score >= first_score + 1:
                subcategory = "Segundos"
            else:
                subcategory = "Sin clasificar"
                needs_review = True
                reasons.append("Subcategoria salada poco clara")

    if recipe_type == "Sin clasificar":
        needs_review = True
        reasons.append("Tipo especifico poco claro")

    if category == "Salado" and subcategory == "Sin clasificar":
        needs_review = True
        reasons.append("Subcategoria salada poco clara")

    if not ingredients:
        needs_review = True
        reasons.append("No se detectaron ingredientes")
    if not steps:
        needs_review = True
        reasons.append("No se detectaron pasos")
    if normalize_for_match(title).strip(" :-.\t") in GENERIC_TITLE_WORDS:
        needs_review = True
        reasons.append("Titulo generico")

    return category, subcategory, recipe_type, needs_review, compact_items(reasons)


def extract_servings(text: str) -> str:
    patterns = (
        r"\bpara\s+(\d+\s*(?:[-/]\s*\d+)?)\s*(personas|raciones|comensales)\b",
        r"\b(\d+\s*(?:[-/]\s*\d+)?)\s*(personas|raciones|comensales)\b",
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            amount = re.sub(r"\s+", " ", match.group(1)).strip()
            unit = match.group(2).lower()
            return f"{amount} {unit}"
    return ""


def extract_time(text: str) -> str:
    match = re.search(
        r"\b(?:tiempo|preparaci[oó]n|cocci[oó]n|hornea\w*)\D{0,35}(\d+\s*(?:minutos|min\.?|horas?|h\b))",
        text,
        flags=re.IGNORECASE,
    )
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip()
    return ""


def extract_difficulty(text: str) -> str:
    match = re.search(r"\bdificultad\s*[:.-]?\s*(facil|fácil|media|normal|alta|dificil|difícil)\b", text, flags=re.IGNORECASE)
    if match:
        value = match.group(1).lower()
        return value[:1].upper() + value[1:]
    return ""


def collect_tags(text: str, category: str, subcategory: str, recipe_type: str, needs_review: bool) -> list[str]:
    tags = [category]
    if subcategory and subcategory != "Sin clasificar":
        tags.append(subcategory)
    if recipe_type and recipe_type != "Sin clasificar":
        tags.append(recipe_type)

    for tag, keywords in TAG_KEYWORDS.items():
        if count_keywords(text, keywords):
            tags.append(tag)
    if needs_review:
        tags.append("Por revisar")
    return compact_items(tags)


def slugify(value: str) -> str:
    normalized = normalize_for_match(value)
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = normalized.strip("-")
    return normalized[:80] or "receta"


def unique_slug(title: str, used: Counter[str]) -> str:
    base = slugify(title)
    used[base] += 1
    if used[base] == 1:
        return base
    return f"{base}-{used[base]}"


def build_recipes_from_doc(
    path: Path,
    used_slugs: Counter[str],
    images_dir: Path,
    *,
    extract_images: bool = True,
    overwrite_images: bool = False,
) -> list[dict]:
    lines, image_events = extract_docx_content(path)
    boundaries = find_recipe_boundaries(lines)
    recipes: list[dict] = []

    for position, start in enumerate(boundaries):
        end = boundaries[position + 1] if position + 1 < len(boundaries) else len(lines)
        title = normalize_text(lines[start])
        body = lines[start + 1 : end]
        ingredients, steps, notes = parse_body(body)
        full_text = " ".join([title, *body])
        category, subcategory, recipe_type, needs_review, review_notes = classify_recipe(path.name, title, ingredients, steps, notes)
        recipe_id = unique_slug(title, used_slugs)
        image = ""
        image_target = first_image_target_for_recipe(image_events, start, end)
        if extract_images and image_target:
            image = write_recipe_image(path, image_target, recipe_id, images_dir, overwrite=overwrite_images)

        recipe = {
            "id": recipe_id,
            "title": title,
            "category": category,
            "subcategory": subcategory,
            "type": recipe_type,
            "image": image or PLACEHOLDER_IMAGE,
            "time": extract_time(full_text),
            "difficulty": extract_difficulty(full_text),
            "servings": extract_servings(full_text),
            "ingredients": ingredients,
            "steps": steps,
            "notes": notes,
            "tags": collect_tags(full_text, category, subcategory, recipe_type, needs_review),
            "source": path.name,
            "needsReview": needs_review,
        }
        if review_notes:
            recipe["reviewNotes"] = review_notes
        recipes.append(recipe)

    return recipes


def find_docx_sources() -> list[Path]:
    candidates = list(Path(".").glob("*.docx")) + list(SOURCE_DIR.glob("*.docx"))
    unique: dict[str, Path] = {}
    for path in candidates:
        if path.name.startswith("~$"):
            continue
        unique[str(path.resolve()).lower()] = path
    return sorted(unique.values(), key=lambda item: normalize_for_match(item.name))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extrae recetas desde documentos Word (.docx) a JSON.")
    parser.add_argument(
        "-i",
        "--input",
        nargs="*",
        type=Path,
        help="Documentos .docx a procesar. Si se omite, busca en la raiz y en source-docs/.",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Ruta de salida JSON. Por defecto: {DEFAULT_OUTPUT}",
    )
    parser.add_argument(
        "--images-dir",
        type=Path,
        default=DEFAULT_IMAGES_DIR,
        help=f"Carpeta donde guardar imagenes extraidas. Por defecto: {DEFAULT_IMAGES_DIR}",
    )
    parser.add_argument(
        "--no-images",
        action="store_true",
        help="No extraer imagenes de los documentos Word.",
    )
    parser.add_argument(
        "--overwrite-images",
        action="store_true",
        help="Sobrescribir imagenes ya existentes generadas para cada id de receta.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sources = args.input if args.input else find_docx_sources()
    sources = [source for source in sources if source.exists() and source.suffix.lower() == ".docx"]

    if not sources:
        print("No se encontraron documentos .docx. Colocalos en la raiz o en source-docs/.")
        return 1

    used_slugs: Counter[str] = Counter()
    all_recipes: list[dict] = []

    for source in sources:
        recipes = build_recipes_from_doc(
            source,
            used_slugs,
            args.images_dir,
            extract_images=not args.no_images,
            overwrite_images=args.overwrite_images,
        )
        all_recipes.extend(recipes)
        pending = sum(1 for recipe in recipes if recipe["needsReview"])
        with_image = sum(1 for recipe in recipes if recipe["image"])
        print(f"{source}: {len(recipes)} recetas extraidas ({pending} por revisar, {with_image} con imagen)")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(all_recipes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total_pending = sum(1 for recipe in all_recipes if recipe["needsReview"])
    print(f"Escrito {args.output} con {len(all_recipes)} recetas ({total_pending} por revisar).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
