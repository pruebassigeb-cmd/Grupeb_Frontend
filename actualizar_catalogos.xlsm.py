"""
actualizar_catalogos_xlsm.py

Actualiza la hoja oculta "ListasCatalogos" dentro de un .xlsm YA EXISTENTE
(con macro y Data Validation ya configurados), sin pasar por el parser
completo de openpyxl — que tira las validaciones de tipo x14 que genera
ExcelJS — y sin tocar el vbaProject.bin.

ESTRATEGIA:
  Un .xlsm es un ZIP. En vez de abrir/reescribir todo el workbook con una
  librería de alto nivel, se edita directamente:
    1. xl/sharedStrings.xml  → se AGREGAN las cadenas nuevas al final
       (nunca se tocan los índices existentes, porque otras hojas como
       "Productos" y "OpcionesPapel" los referencian por número).
    2. xl/worksheets/sheet4.xml (ListasCatalogos) → se reescribe desde
       cero, apuntando a los índices (nuevos o viejos) de sharedStrings.
  Todo lo demás del ZIP (vbaProject.bin, validaciones, estilos, hojas
  Productos/OpcionesPapel/Instrucciones) se copia EXACTAMENTE igual,
  byte por byte.

CORRECCIONES respecto a la versión anterior:
  - El parseo de sharedStrings.xml fallaba con entradas vacías o de tipo
    <t/> (self-closing): el regex viejo las fusionaba con la siguiente
    <si>, desalineando TODOS los índices posteriores y arriesgando
    corromper celdas de Productos/OpcionesPapel que referencian esos
    índices por número. Ahora se extrae cada bloque <si>...</si> íntegro
    y se concatena el texto de TODOS los <t> dentro (cubre también
    strings con "runs" <r><t>...</t></r>, p. ej. con formato rico).
  - Se decodifican entidades XML (&amp; &lt; &gt;) al leer, para comparar
    correctamente contra los textos nuevos (que llegan sin escapar) y no
    crear duplicados falsos.
  - El <worksheet> de salida replica los namespaces/atributos del
    original (mc, x14ac, xr, xr2, xr3, xr:uid) en vez de un worksheet
    minimal, para evitar que Excel marque el archivo como reparado.
  - Se agregó la columna "MaqLaminadora" (máquina laminadora) al orden
    de columnas esperado — ver ORDEN_COLUMNAS_DEFAULT más abajo.

ENTRADA:
  - Un .xlsm base (el que ya tiene la macro pegada y los dropdowns).
  - Los valores nuevos de catálogo (normalmente vendrían de tu BD vía
    una query separada — aquí se reciben ya como dict).

SALIDA:
  - Un nuevo .xlsm con la hoja ListasCatalogos actualizada, conservando
    macro y validaciones intactas.

USO TÍPICO (visto desde Node/TS, ver exportarCatalogosJSON.ts):
  1. El script de Node consulta la BD y guarda los catálogos en un JSON.
  2. Este script Python lee ese JSON y el .xlsm base, y genera el .xlsm final.

    npx ts-node scripts/exportarCatalogosJSON.ts
    python3 scripts/actualizar_catalogos_xlsm.py \
        plantilla_carga_masiva_papel.xlsm \
        catalogos.json \
        plantilla_carga_masiva_papel.xlsm

IMPORTANTE — orden de columnas:
  Las validaciones x14:dataValidation en la hoja "Productos" apuntan a
  columnas FIJAS de "ListasCatalogos" por letra (ej. ListasCatalogos!$W$2:$W$6
  para maq_laminado). Por eso el JSON de entrada debe traer las listas
  EN EL MISMO ORDEN en que ya están las columnas A, B, C... en el archivo
  base. Si tu JSON no respeta ese orden, usa ORDEN_COLUMNAS_DEFAULT como
  referencia y reordena las keys antes de llamar a actualizar_xlsm(), o
  pasa el parámetro orden_columnas explícitamente.
"""

import sys
import json
import zipfile
import re
from xml.sax.saxutils import escape as xml_escape
from xml.sax.saxutils import unescape as xml_unescape

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"

# Orden real de columnas en ListasCatalogos del .xlsm base (A, B, C...).
# Sirve como referencia/validación; no es obligatorio usarlo si tu JSON
# ya viene en el orden correcto, pero se recomienda para evitar que una
# lista termine en la columna equivocada (lo que rompería el dropdown
# correspondiente en "Productos", ya que las validaciones x14 apuntan a
# letras de columna fijas, no a nombres).
ORDEN_COLUMNAS_DEFAULT = [
    "TipoProducto",        # A
    "Matrix",              # B
    "TipoPegado",          # C
    "Pegamento",           # D
    "RefuerzoMaterial",    # E
    "RefuerzoMedidas",     # F
    "Empaque",             # G
    "TipoAsa",             # H
    "Laminado",            # I
    "MaqHojeadoGuillotina",# J
    "MaqImpresora",        # K
    "MaqHsAr",             # L
    "MaqSuaje",            # M
    "MaqUv",               # N
    "MaqTextura",          # O
    "MaqEmpalme",          # P
    "MaqArmado",           # Q
    "MaqAsasMaquina",      # R
    "MaqDesbarbe",         # S
    "TipoPapel",           # T
    "SiNo",                # U
    "UnidadCalibre",       # V
    "MaqLaminadora",       # W  ← agregada junto con la columna maq_laminado en Productos
]


def col_letra(n: int) -> str:
    letra = ""
    while n > 0:
        n, resto = divmod(n - 1, 26)
        letra = chr(65 + resto) + letra
    return letra


def leer_shared_strings(z: zipfile.ZipFile):
    """
    Devuelve la lista de strings (ya decodificadas: &amp; -> &, etc.)
    en el mismo orden/índice que usa sharedStrings.xml.

    Se extrae cada bloque <si>...</si> completo (en vez de intentar
    matchear <t> sueltos con un solo regex), y se concatena el texto de
    todos los <t> que haya adentro — así se manejan correctamente tanto
    <si><t>texto</t></si> como <si><t/></si> (vacío) y <si><r><t>...</t>
    </r>...</si> (runs con formato rico).
    """
    raw = z.read("xl/sharedStrings.xml").decode("utf-8")
    si_blocks = re.findall(r"<si>.*?</si>", raw, re.DOTALL)

    def texto_de_si(block: str) -> str:
        partes = re.findall(r"<t[^>]*>(.*?)</t>", block, re.DOTALL)
        return xml_unescape("".join(partes))

    return [texto_de_si(b) for b in si_blocks]


def agregar_strings(strings_existentes, nuevas):
    """
    Agrega `nuevas` (lista de str, texto plano sin escapar) al final de
    strings_existentes, evitando duplicar si el string ya existe.
    Devuelve:
      - lista actualizada completa (texto plano)
      - dict {texto: índice} para todas las nuevas (y reutilizadas)
    """
    indice = {s: i for i, s in enumerate(strings_existentes)}
    actualizada = list(strings_existentes)
    mapa = {}
    for texto in nuevas:
        if texto in indice:
            mapa[texto] = indice[texto]
        else:
            nuevo_idx = len(actualizada)
            actualizada.append(texto)
            indice[texto] = nuevo_idx
            mapa[texto] = nuevo_idx
    return actualizada, mapa


def construir_shared_strings_xml(strings: list) -> str:
    count = len(strings)
    items = "".join(
        f'<si><t xml:space="preserve">{xml_escape(s)}</t></si>' for s in strings
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<sst xmlns="{NS}" count="{count}" uniqueCount="{count}">{items}</sst>'
    )


def construir_sheet_listas_xml(
    listas: dict, mapa_indices: dict, worksheet_attrs: str = ""
) -> str:
    """
    listas: dict {nombre_lista: [valores...]} YA EN EL ORDEN DE COLUMNAS
            deseado (A, B, C... en ese orden de iteración del dict).
    mapa_indices: dict {texto: indice_en_shared_strings} (incluye nombres
                  de lista en fila 1 y los valores).
    worksheet_attrs: atributos/namespaces extra para el tag <worksheet>,
                  para replicar el original (mc:Ignorable, xr:uid, etc.)
                  y que Excel no marque el archivo como reparado.
    Cada lista ocupa UNA columna, nombre en fila 1, valores desde fila 2.
    """
    columnas = list(listas.items())
    max_filas = max([len(v) for _, v in columnas], default=0) + 1  # +1 por el header

    filas_xml = []
    for fila_idx in range(1, max_filas + 1):
        celdas = []
        for col_idx, (nombre_lista, valores) in enumerate(columnas, start=1):
            letra = col_letra(col_idx)
            ref = f"{letra}{fila_idx}"
            if fila_idx == 1:
                texto = nombre_lista
            else:
                pos = fila_idx - 2
                texto = valores[pos] if pos < len(valores) else None
            if texto is None:
                continue
            idx = mapa_indices[texto]
            celdas.append(f'<c r="{ref}" t="s"><v>{idx}</v></c>')
        if celdas:
            filas_xml.append(f'<row r="{fila_idx}">{"".join(celdas)}</row>')

    dim_letra = col_letra(len(columnas)) if columnas else "A"
    dimension = f"A1:{dim_letra}{max_filas}"

    worksheet_open = f"<worksheet xmlns=\"{NS}\""
    if worksheet_attrs:
        worksheet_open += f" {worksheet_attrs}"
    worksheet_open += ">"

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f"{worksheet_open}"
        '<sheetPr codeName="Hoja4"/>'
        f'<dimension ref="{dimension}"/>'
        "<sheetViews><sheetView workbookViewId=\"0\"/></sheetViews>"
        '<sheetFormatPr baseColWidth="10" defaultColWidth="9.140625" defaultRowHeight="15"/>'
        f"<sheetData>{''.join(filas_xml)}</sheetData>"
        "</worksheet>"
    )


def extraer_worksheet_attrs(xml_original: str) -> str:
    """
    Extrae los atributos del tag <worksheet ...> original (namespaces
    mc/x14ac/xr/xr2/xr3, xr:uid, etc.), quitando el xmlns por defecto
    (ese se vuelve a poner aparte), para poder replicarlos en la hoja
    reconstruida y que Excel no la marque como "reparada".
    """
    m = re.search(r"<worksheet\s+([^>]*)>", xml_original)
    if not m:
        return ""
    attrs = m.group(1)
    # Quitar el xmlns default (sin prefijo), que ya se agrega aparte
    attrs = re.sub(r'xmlns="[^"]*"\s*', "", attrs).strip()
    return attrs


def ordenar_listas(listas: dict, orden_columnas=None) -> dict:
    """
    Reordena el dict `listas` según orden_columnas (por defecto
    ORDEN_COLUMNAS_DEFAULT), preservando al final cualquier key que no
    esté en la lista de orden (por si el JSON trae catálogos adicionales
    que aún no tienen columna fija asignada).
    """
    if orden_columnas is None:
        orden_columnas = ORDEN_COLUMNAS_DEFAULT

    resultado = {}
    for nombre in orden_columnas:
        if nombre in listas:
            resultado[nombre] = listas[nombre]

    # Cualquier extra que el JSON traiga y no esté en el orden conocido
    for nombre, valores in listas.items():
        if nombre not in resultado:
            resultado[nombre] = valores

    faltantes = [n for n in orden_columnas if n not in listas]
    if faltantes:
        print(
            "⚠️  Aviso: el JSON no trae estas listas esperadas "
            f"(se omiten, no se borra su columna): {faltantes}"
        )

    return resultado


def actualizar_xlsm(
    ruta_base: str, ruta_salida: str, listas: dict, orden_columnas=None
):
    """
    ruta_base: .xlsm existente (con macro + validaciones ya configuradas)
    ruta_salida: dónde guardar el .xlsm actualizado
    listas: { "TipoProducto": ["Caja plegadiza", ...], "TipoPapel": [...], ... }
    orden_columnas: lista opcional con el orden exacto de columnas a usar;
                    si no se pasa, se usa ORDEN_COLUMNAS_DEFAULT.
    """
    listas = ordenar_listas(listas, orden_columnas)

    with zipfile.ZipFile(ruta_base, "r") as z_in:
        sheet4_original = z_in.read("xl/worksheets/sheet4.xml").decode("utf-8")
        worksheet_attrs = extraer_worksheet_attrs(sheet4_original)

        strings_existentes = leer_shared_strings(z_in)

        # Reunir TODOS los textos nuevos (nombres de lista + valores),
        # ya decodificados (texto plano) para comparar correctamente
        # contra strings_existentes (que también vienen decodificados).
        textos_nuevos = []
        for nombre_lista, valores in listas.items():
            textos_nuevos.append(nombre_lista)
            textos_nuevos.extend(valores)

        strings_actualizados, mapa = agregar_strings(strings_existentes, textos_nuevos)

        nuevo_shared_strings_xml = construir_shared_strings_xml(strings_actualizados)
        nuevo_sheet4_xml = construir_sheet_listas_xml(
            listas, mapa, worksheet_attrs=worksheet_attrs
        )

        # Escribir el nuevo zip copiando todo igual, salvo los 2 archivos que cambian
        with zipfile.ZipFile(ruta_salida, "w", zipfile.ZIP_DEFLATED) as z_out:
            for item in z_in.infolist():
                if item.filename == "xl/sharedStrings.xml":
                    z_out.writestr(item, nuevo_shared_strings_xml)
                elif item.filename == "xl/worksheets/sheet4.xml":
                    z_out.writestr(item, nuevo_sheet4_xml)
                else:
                    z_out.writestr(item, z_in.read(item.filename))

    print(f"✅ Generado: {ruta_salida}")
    print(f"   Listas actualizadas: {len(listas)}")
    for nombre, valores in listas.items():
        print(f"   - {nombre}: {len(valores)} valores")


if __name__ == "__main__":
    # Uso: python3 actualizar_catalogos_xlsm.py base.xlsm catalogos.json salida.xlsm
    if len(sys.argv) != 4:
        print("Uso: python3 actualizar_catalogos_xlsm.py <base.xlsm> <catalogos.json> <salida.xlsm>")
        sys.exit(1)

    ruta_base, ruta_json, ruta_salida = sys.argv[1], sys.argv[2], sys.argv[3]
    with open(ruta_json, "r", encoding="utf-8") as f:
        listas = json.load(f)

    actualizar_xlsm(ruta_base, ruta_salida, listas)