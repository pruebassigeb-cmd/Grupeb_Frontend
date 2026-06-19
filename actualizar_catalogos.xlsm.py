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

ENTRADA:
  - Un .xlsm base (el que ya tiene la macro pegada y los dropdowns).
  - Los valores nuevos de catálogo (normalmente vendrían de tu BD vía
    una query separada — aquí se reciben ya como dict).

SALIDA:
  - Un nuevo .xlsm con la hoja ListasCatalogos actualizada, conservando
    macro y validaciones intactas.

USO TÍPICO (visto desde Node/TS, ver generarPlantillaCargaMasiva.ts):
  1. El script de Node consulta la BD y guarda los catálogos en un JSON.
  2. Este script Python lee ese JSON y el .xlsm base, y genera el .xlsm final.
  (O se llama este script directamente pasándole los valores.)
"""

import sys
import json
import zipfile
import shutil
import re
from xml.sax.saxutils import escape as xml_escape

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def col_letra(n: int) -> str:
    letra = ""
    while n > 0:
        n, resto = divmod(n - 1, 26)
        letra = chr(65 + resto) + letra
    return letra


def leer_shared_strings(z: zipfile.ZipFile):
    """Devuelve (lista_de_strings, xml_crudo_original) de sharedStrings.xml"""
    raw = z.read("xl/sharedStrings.xml").decode("utf-8")
    # Extraer cada <si>...</si> tal cual (sin reinterpretar formato rico, basta texto plano <t>)
    strings = re.findall(r"<si>(?:<t[^>]*>(.*?)</t>|.*?)</si>", raw, re.DOTALL)
    return strings, raw


def agregar_strings(strings_existentes, nuevas):
    """
    Agrega `nuevas` (lista de str) al final de strings_existentes,
    evitando duplicar si el string ya existe. Devuelve:
      - lista actualizada completa
      - dict {texto: índice} para las nuevas (y reutilizadas)
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
    items = "".join(f"<si><t xml:space=\"preserve\">{xml_escape(s)}</t></si>" for s in strings)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<sst xmlns="{NS}" count="{count}" uniqueCount="{count}">{items}</sst>'
    )


def construir_sheet_listas_xml(listas: dict, mapa_indices: dict) -> str:
    """
    listas: dict {nombre_lista: [valores...]}
    mapa_indices: dict {texto: indice_en_shared_strings} (incluye nombres
                  de lista en fila 1 y los valores)
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

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<worksheet xmlns="{NS}">'
        f'<sheetPr codeName="Hoja4"/>'
        f'<dimension ref="{dimension}"/>'
        f'<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
        f'<sheetFormatPr baseColWidth="10" defaultColWidth="9.140625" defaultRowHeight="15"/>'
        f'<sheetData>{"".join(filas_xml)}</sheetData>'
        f'</worksheet>'
    )


def actualizar_xlsm(ruta_base: str, ruta_salida: str, listas: dict):
    """
    ruta_base: .xlsm existente (con macro + validaciones ya configuradas)
    ruta_salida: dónde guardar el .xlsm actualizado
    listas: { "TipoProducto": ["Caja plegadiza", ...], "TipoPapel": [...], ... }
    """
    with zipfile.ZipFile(ruta_base, "r") as z_in:
        nombres_originales = z_in.namelist()
        strings_existentes, _ = leer_shared_strings(z_in)

        # Reunir TODOS los textos nuevos (nombres de lista + valores)
        textos_nuevos = []
        for nombre_lista, valores in listas.items():
            textos_nuevos.append(nombre_lista)
            textos_nuevos.extend(valores)

        strings_actualizados, mapa = agregar_strings(strings_existentes, textos_nuevos)

        nuevo_shared_strings_xml = construir_shared_strings_xml(strings_actualizados)
        nuevo_sheet4_xml = construir_sheet_listas_xml(listas, mapa)

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