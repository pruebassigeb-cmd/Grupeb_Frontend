import type {
  ClaveMaquinariaPapel,
  NombreProcesoOrdenPapel,
  OrdenProduccionPapelData,
  ProcesoOrdenPapelPdf,
  ProcesoPapelRuntime,
} from "../../types/papel/ordenProduccionPapel.types";

export const ORDEN_PROCESOS_PAPEL: NombreProcesoOrdenPapel[] = [
  "hojeado_papel",
  "guillotina_papel",
  "impresion_papel",
  "laminacion_papel",
  "barniz_uv_papel",
  "hot_stamping_papel",
  "texturizado_papel",
  "alto_relieve_papel",
  "suaje_produccion_papel",
  "armado_papel",
  "empaque_papel",
];

export const ETIQUETAS_PROCESO_PAPEL: Record<NombreProcesoOrdenPapel, string> = {
  hojeado_papel: "Hojeado",
  guillotina_papel: "Guillotina",
  impresion_papel: "Impresión",
  laminacion_papel: "Laminación",
  barniz_uv_papel: "UV",
  hot_stamping_papel: "HS",
  texturizado_papel: "Textura",
  alto_relieve_papel: "AR",
  suaje_produccion_papel: "Suaje",
  armado_papel: "Armado",
  empaque_papel: "Empaque",
};

export const ETIQUETAS_CORTAS_PROCESO_PAPEL: Record<NombreProcesoOrdenPapel, string> = {
  hojeado_papel: "Hoj",
  guillotina_papel: "Gui",
  impresion_papel: "Imp",
  laminacion_papel: "Lam",
  barniz_uv_papel: "UV",
  hot_stamping_papel: "HS",
  texturizado_papel: "Tex",
  alto_relieve_papel: "AR",
  suaje_produccion_papel: "Suaje",
  armado_papel: "Arm",
  empaque_papel: "Emp",
};

export const CLAVE_MAQUINA_POR_PROCESO_PAPEL: Record<
  NombreProcesoOrdenPapel,
  ClaveMaquinariaPapel
> = {
  hojeado_papel: "hojeado_guillotina",
  guillotina_papel: "hojeado_guillotina",
  impresion_papel: "impresora",
  laminacion_papel: "laminado_maquina",
  barniz_uv_papel: "uv",
  hot_stamping_papel: "hs_ar",
  texturizado_papel: "texturizadora",
  alto_relieve_papel: "hs_ar",
  suaje_produccion_papel: "suaje_maquina",
  armado_papel: "armado",
  empaque_papel: "empaque_maquina",
};

export const PROCESOS_ORDEN_PAPEL: Array<{
  key: NombreProcesoOrdenPapel;
  etiqueta: string;
  etiquetaCorta: string;
  claveMaquina: ClaveMaquinariaPapel;
}> = ORDEN_PROCESOS_PAPEL.map((key) => ({
  key,
  etiqueta: ETIQUETAS_PROCESO_PAPEL[key],
  etiquetaCorta: ETIQUETAS_CORTAS_PROCESO_PAPEL[key],
  claveMaquina: CLAVE_MAQUINA_POR_PROCESO_PAPEL[key],
}));

export function n(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const limpio = String(value)
    .trim()
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  if (!limpio) return null;
  const parsed = Number(limpio);
  return Number.isFinite(parsed) ? parsed : null;
}

export function f(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function primeraLinea(...values: unknown[]): string {
  for (const value of values) {
    const text = f(value);
    if (text) return text;
  }
  return "";
}

export function fmtNum(value: unknown, decimals = 0): string {
  const parsed = n(value);
  if (parsed === null) return "";

  return parsed.toLocaleString("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtFecha(value: unknown): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function bool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = f(value).toLowerCase();
  return ["true", "1", "si", "sí", "yes", "y"].includes(text);
}

export function toArrayText(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => f(item)).filter(Boolean);
  }
  return String(value)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function pantonesToText(value: unknown): string {
  return toArrayText(value).join(", ");
}

export function tintasFormato(frente: number, vuelta = 0): string {
  const fte = Number.isFinite(frente) ? frente : 0;
  const rev = Number.isFinite(vuelta) ? vuelta : 0;

  if (fte > 0 && rev > 0) return `F ${fte} / V ${rev}`;
  if (fte > 0) return String(fte);
  if (rev > 0) return `V ${rev}`;
  return "";
}

export function tintasConPantones(cantidad: unknown, pantones: unknown): string {
  const cant = n(cantidad);
  const pant = pantonesToText(pantones);

  if (cant !== null && pant) return `${fmtNum(cant)}: ${pant}`;
  if (cant !== null) return fmtNum(cant);
  return pant;
}

export function redondear(value: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round(value * factor) / factor;
}

export function obtenerMedidasNumericasCm(value: unknown): number[] {
  if (value === null || value === undefined) return [];

  return String(value)
    .replace(/,/g, ".")
    .match(/\d+(?:\.\d+)?/g)
    ?.map((item) => Number(item))
    .filter((item) => Number.isFinite(item)) ?? [];
}

export function primeraMedidaCm(...values: unknown[]): number | null {
  for (const value of values) {
    const medidas = obtenerMedidasNumericasCm(value);
    if (medidas.length > 0) return medidas[0];
  }
  return null;
}

export function ultimaMedidaCm(...values: unknown[]): number | null {
  for (const value of values) {
    const medidas = obtenerMedidasNumericasCm(value);
    if (medidas.length > 0) return medidas[medidas.length - 1];
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────
// CORREGIDO: la fórmula estaba multiplicando cantidad * rendimiento, lo
// cual da un número absurdamente grande. La fórmula correcta es una
// DIVISIÓN: pliegos necesarios = cantidad pedida / rendimiento de
// hojeado o guillotina. Esta función solo calcula el dato de REFERENCIA
// (cuántos pliegos hacen falta hojear/cortar para cubrir el pedido); la
// multiplicación (pliegos entregados * rendimiento) se hace en otro
// punto del flujo, en el paso de Empaque, sobre los pliegos REALMENTE
// entregados por Hojeado/Guillotina — no aquí.
// ────────────────────────────────────────────────────────────────────────
export function calcularCantidadHojeada(
  cantidad: unknown,
  rendimiento: unknown
): number | null {
  const cantidadNum = n(cantidad);
  const rendimientoNum = n(rendimiento);
  if (cantidadNum === null || rendimientoNum === null || rendimientoNum <= 0) {
    return null;
  }
  return redondear(cantidadNum / rendimientoNum);
}

export function calcularBolsasArmadas(
  pliegos: unknown,
  rendimiento: unknown
): number | null {
  const pliegosNum = n(pliegos);
  const rendimientoNum = n(rendimiento);
  if (pliegosNum === null || rendimientoNum === null || rendimientoNum <= 0) {
    return null;
  }
  return redondear(pliegosNum / rendimientoNum);
}

export function calcularDesarrolloMm(...medidas: unknown[]): number | null {
  const largoCm = ultimaMedidaCm(...medidas);
  return largoCm === null ? null : redondear(largoCm * 10);
}

// ────────────────────────────────────────────────────────────────────────
// NUEVO: el desarrollo (y por lo tanto los metros de laminación) no
// siempre debe calcularse con la medida de "hojeado" — depende de cómo
// entra el pliego a la laminadora, que se define desde el ALTA del
// producto (campo `desarrollo_base`, por ahora leído de forma laxa con
// `as any` porque el tipo OrdenProduccionPapelData todavía no lo declara
// — pendiente agregarlo ahí cuando se construya el selector en el
// formulario de alta).
//
//   desarrollo_base === "bobina"   → usa hoj_bobina / bobina_cm
//   desarrollo_base === "hojeado"  → usa pliego_hojeado / hoj_corte /
//                                     pliego / medida (comportamiento
//                                     ORIGINAL, y también el que se usa
//                                     por default si el campo no viene)
//
// Mientras el alta de producto no mande `desarrollo_base`, esta función
// se comporta EXACTAMENTE igual que antes (usa hojeado), para no romper
// órdenes ya generadas.
// ────────────────────────────────────────────────────────────────────────
export function calcularDesarrolloMmPorBase(data: OrdenProduccionPapelData): number | null {
  const base = f((data as any).desarrollo_base).toLowerCase();

  if (base === "bobina") {
    return calcularDesarrolloMm(data.hoj_bobina, data.bobina_cm);
  }

  // "hojeado" o cualquier otro valor (incluye vacío/no definido): default.
  return calcularDesarrolloMm(data.pliego_hojeado, data.hoj_corte, data.pliego, data.medida);
}

export function calcularCtesMod(...medidas: unknown[]): string | null {
  const largoCm = ultimaMedidaCm(...medidas);
  if (largoCm === null) return null;
  return `${redondear((largoCm - 0.5) * 0.3937)}"`;
}

// ────────────────────────────────────────────────────────────────────────
// NUEVO: mismo criterio que calcularDesarrolloMmPorBase — CTES/Mod debe
// calcularse sobre la MISMA medida que se usó como "desarrollo" (bobina u
// hojeado), no siempre sobre hojeado. La fórmula en sí (calcularCtesMod)
// ya era correcta: resta 0.5cm, convierte a mm y divide entre 25.4mm para
// sacar pulgadas — solo hacía falta alimentarla con la medida correcta
// según lo que se haya seleccionado al dar de alta el producto.
// ────────────────────────────────────────────────────────────────────────
export function calcularCtesModPorBase(data: OrdenProduccionPapelData): string | null {
  const base = f((data as any).desarrollo_base).toLowerCase();

  if (base === "bobina") {
    return calcularCtesMod(data.hoj_bobina, data.bobina_cm);
  }

  return calcularCtesMod(data.pliego_hojeado, data.hoj_corte, data.pliego, data.medida);
}

export function calcularMetrosLaminacion(
  pliegos: unknown,
  desarrolloMm: unknown
): number | null {
  const pliegosNum = n(pliegos);
  const desarrolloNum = n(desarrolloMm);
  if (pliegosNum === null || desarrolloNum === null || desarrolloNum <= 0) {
    return null;
  }
  return redondear((pliegosNum * desarrolloNum) / 1000);
}

export function calcularRollosLaminacion(
  metros: unknown,
  metrosPorRollo = 3000
): number | null {
  const metrosNum = n(metros);
  if (metrosNum === null || metrosPorRollo <= 0) return null;
  return redondear(metrosNum / metrosPorRollo, 2);
}

export function normalizarProcesoPapel(value: unknown): NombreProcesoOrdenPapel | null {
  const text = f(value) as NombreProcesoOrdenPapel;
  return ORDEN_PROCESOS_PAPEL.includes(text) ? text : null;
}

export function ordenarProcesosOrdenPapel(
  procesos: NombreProcesoOrdenPapel[]
): NombreProcesoOrdenPapel[] {
  const set = new Set(procesos);
  return ORDEN_PROCESOS_PAPEL.filter((proceso) => set.has(proceso));
}

export function procesosAplicanDesdeProducto(
  producto: OrdenProduccionPapelData
): NombreProcesoOrdenPapel[] {
  const desdeBackend = producto.procesos_aplican
    ?.map(normalizarProcesoPapel)
    .filter((item): item is NombreProcesoOrdenPapel => item !== null);

  if (desdeBackend && desdeBackend.length > 0) {
    return ordenarProcesosOrdenPapel(desdeBackend);
  }

  const procesos: NombreProcesoOrdenPapel[] = [];

  if (producto.metodo_hojeado === "hojeado") procesos.push("hojeado_papel");
  if (producto.metodo_hojeado === "guillotina") procesos.push("guillotina_papel");

  procesos.push("impresion_papel");

  if (primeraLinea(producto.laminado_nombre, producto.laminado_acabado, producto.laminado)) {
    procesos.push("laminacion_papel");
  }
  if (bool(producto.uv)) procesos.push("barniz_uv_papel");
  if (primeraLinea(producto.foil_nombre, producto.foil)) procesos.push("hot_stamping_papel");
  if (primeraLinea(producto.textura_nombre, producto.textura)) procesos.push("texturizado_papel");
  if (bool(producto.alto_relieve)) procesos.push("alto_relieve_papel");

  procesos.push("suaje_produccion_papel");

  if (bool(producto.lleva_armado)) procesos.push("armado_papel");

  procesos.push("empaque_papel");

  return ordenarProcesosOrdenPapel(procesos);
}

export function obtenerMaquinaProcesoPapel(
  producto: OrdenProduccionPapelData,
  proceso: NombreProcesoOrdenPapel
): string | null {
  const claveMaquina = CLAVE_MAQUINA_POR_PROCESO_PAPEL[proceso];

  // Este acceso compila porque claveMaquina y maquinaria_seleccionada
  // usan exactamente el mismo type ClaveMaquinariaPapel.
  const maquina = producto.maquinaria_seleccionada?.[claveMaquina] ?? null;
  return maquina?.nombre ?? null;
}

export function construirProcesosOrdenPapelPdf(
  producto: OrdenProduccionPapelData
): ProcesoOrdenPapelPdf[] {
  const procesosAplican = new Set(procesosAplicanDesdeProducto(producto));

  return PROCESOS_ORDEN_PAPEL
    .filter((proceso) => procesosAplican.has(proceso.key))
    .map((proceso) => ({
      key: proceso.key,
      etiqueta: proceso.etiqueta,
      aplica: true,
      maquina: obtenerMaquinaProcesoPapel(producto, proceso.key),
    }));
}

export function valorProcesoOrdenPapelPdf(aplica: boolean): "X" | "N/A" {
  return aplica ? "X" : "N/A";
}

// ────────────────────────────────────────────────────────────────────────
// CORREGIDO: ahora lee el registro runtime en TODAS las claves donde el
// backend puede mandarlo. Antes solo miraba `registros_procesos` y
// `procesos_runtime`, pero construirDataPapel guarda el mapa en
// `procesos_papel` / `registros_papel` / `procesos_registros`. Por eso
// merma/entregadas/máquina/observaciones siempre salían en blanco.
// El nuevo subquery del backend (getOrdenProduccion) llena
// `registros_procesos`, que es la primera clave que se revisa aquí.
// ────────────────────────────────────────────────────────────────────────
export function obtenerRegistroProcesoPapel(
  data: OrdenProduccionPapelData,
  key: NombreProcesoOrdenPapel
): ProcesoPapelRuntime | null {
  const registro =
    data.registros_procesos?.[key] ??
    data.procesos_runtime?.[key] ??
    data.procesos_papel?.[key] ??
    data.registros_papel?.[key] ??
    data.procesos_registros?.[key] ??
    null;

  if (registro) return registro;

  const posible = data[key];
  if (posible && typeof posible === "object") {
    return posible as ProcesoPapelRuntime;
  }

  return null;
}

export function cantidadBaseOrdenPapel(data: OrdenProduccionPapelData): number | null {
  return n(data.cantidad);
}

export function cantidadBaseOrdenPapelTexto(data: OrdenProduccionPapelData): string {
  const kg = n(data.kilogramos);
  const cantidad = n(data.cantidad);

  if (String(data.modo_cantidad ?? "").toLowerCase() === "kilo" && kg !== null) {
    return `${fmtNum(kg, 2)} kg`;
  }

  return cantidad !== null ? fmtNum(cantidad) : "";
}

export function materialImpresionTexto(data: OrdenProduccionPapelData): string {
  return primeraLinea(
    data.material_impresion,
    [data.material, data.calibre, data.pliego_hojeado, data.hoj_corte, data.pliego]
      .map(f)
      .filter(Boolean)
      .join(" ")
  );
}

export function asaTexto(data: OrdenProduccionPapelData): string {
  return primeraLinea(
    data.asa_descripcion,
    [data.asa_tipo, data.asa, data.asa_suaje, data.color_asa_nombre, data.asa_color, data.asa_medida, data.medida_asa]
      .map(f)
      .filter(Boolean)
      .join(" ")
  );
}

export function refuerzoTexto(data: OrdenProduccionPapelData): string {
  return [data.refuerzo_material, data.refuerzo_medida, data.refuerzo]
    .map(f)
    .filter(Boolean)
    .join(" ");
}

export function getValoresCalculadosPapel(data: OrdenProduccionPapelData): Partial<OrdenProduccionPapelData> {
  // ────────────────────────────────────────────────────────────────────
  // CORREGIDO: antes se priorizaba n(data.pliegos_impresion_estimados)
  // (el valor que manda el backend) sobre el cálculo del cliente. Ese
  // campo del backend fue generado con la fórmula VIEJA (multiplicando
  // cantidad * rendimiento), así que aunque calcularCantidadHojeada ya
  // estaba corregida a división, el "??" nunca llegaba a usarla porque
  // el campo del backend ya traía un número (incorrecto). Ahora se
  // invierte la prioridad: el cálculo del cliente (correcto, división)
  // gana siempre que haya cantidad y rendimiento disponibles; el valor
  // del backend solo se usa como último respaldo si el cliente no puede
  // calcularlo (p. ej. falta el rendimiento).
  // ────────────────────────────────────────────────────────────────────
  const pliegosCalculado = calcularCantidadHojeada(data.cantidad, data.rendimiento);
  const pliegos = pliegosCalculado ?? n(data.pliegos_impresion_estimados);

  // CORREGIDO: mismo bug de prioridad que ya se arregló en `pliegos` y
  // `ctes_mod_laminacion` — antes n(data.desarrollo_laminacion_mm) (dato
  // del backend) ganaba primero, así que calcularDesarrolloMmPorBase()
  // nunca se llegaba a ejecutar aunque ya estuviera corregida. Se invierte
  // la prioridad: el cálculo del cliente gana siempre que pueda
  // calcularse; el valor de la ficha solo se usa como último respaldo.
  const desarrollo =
    calcularDesarrolloMmPorBase(data) ??
    n(data.desarrollo_laminacion_mm) ??
    n(data.desarrollo_mm);

  // CORREGIDO: mismo problema — n(data.metros_laminacion_estimados) del
  // backend ganaba antes que el cálculo real (pliegos × desarrollo / 1000).
  const metros =
    calcularMetrosLaminacion(pliegos, desarrollo) ??
    n(data.metros_laminacion_estimados);

  return {
    // Mismo criterio: el recalculado (pliegos, ya correcto) gana sobre
    // cualquier cantidad_hojeada_calculada que haya llegado del backend.
    cantidad_hojeada_calculada: pliegosCalculado ?? n(data.cantidad_hojeada_calculada) ?? pliegos,
    pliegos_impresion_estimados: pliegos,
    desarrollo_laminacion_mm: desarrollo,
    desarrollo_mm: n(data.desarrollo_mm) ?? desarrollo,
    // CORREGIDO: mismo criterio que `pliegos` arriba — el cálculo del
    // cliente (ahora con la base seleccionable bobina/hojeado) gana
    // primero; el valor que traiga la ficha solo se usa si el cliente no
    // pudo calcularlo.
    ctes_mod_laminacion:
      calcularCtesModPorBase(data) ??
      data.ctes_mod_laminacion ??
      data.ctes_mod,
    metros_laminacion_estimados: metros,
    // CORREGIDO: mismo patrón — el cálculo (metros/3000) gana sobre el
    // dato viejo de la ficha.
    rollos_laminacion_estimados:
      calcularRollosLaminacion(metros) ?? n(data.rollos_laminacion_estimados),
    bolsas_armadas_calculadas:
      n(data.bolsas_armadas_calculadas) ?? calcularBolsasArmadas(pliegos, data.rendimiento),
    bobina_laminacion_cm:
      data.bobina_laminacion_cm ??
      data.bobina_cm ??
      primeraMedidaCm(data.pliego_hojeado, data.hoj_corte, data.pliego, data.medida),
  };
}

export function normalizarOrdenProduccionPapelData(
  data: OrdenProduccionPapelData
): OrdenProduccionPapelData {
  const calculados = getValoresCalculadosPapel(data);

  return {
    ...data,
    ...calculados,
    tipo_material: "papel",
    procesos_aplican: procesosAplicanDesdeProducto(data),
    maquinaria_seleccionada: data.maquinaria_seleccionada ?? {},
    material_impresion: primeraLinea(data.material_impresion, materialImpresionTexto(data)),
    asa_descripcion: primeraLinea(data.asa_descripcion, asaTexto(data)),
    refuerzo: primeraLinea(data.refuerzo, refuerzoTexto(data)),
    maquina_armado_pdf: primeraLinea(data.maquina_armado_pdf, "Manual"),
  };
}

export function esProductoOrdenPapel(producto: unknown): producto is OrdenProduccionPapelData {
  if (!producto || typeof producto !== "object") return false;

  const p = producto as Record<string, unknown>;
  const tipoMaterial = f(p.tipo_material).toLowerCase();
  const tipoCotizacion = f(p.tipoCotizacion).toLowerCase();
  const tipoProducto = f(p.tipo_producto).toLowerCase();
  const categoria = f(p.categoria).toLowerCase();

  return (
    tipoMaterial === "papel" ||
    tipoCotizacion === "papel" ||
    tipoProducto.includes("papel") ||
    categoria.includes("papel") ||
    p.idproducto_papel != null ||
    p.producto_papel_idproducto_papel != null ||
    p.metodo_hojeado != null ||
    p.procesos_aplican != null
  );
}

export function validarProductoPapelParaPdf(data: OrdenProduccionPapelData): void {
  if (!data) {
    throw new Error("No hay datos para generar la orden de producción de papel.");
  }

  if (!data.no_pedido) {
    throw new Error("Falta el número de pedido para generar el PDF de papel.");
  }

  if (!primeraLinea(data.nombre_producto, data.descripcion)) {
    throw new Error("Falta el producto para generar el PDF de papel.");
  }

  const procesos = procesosAplicanDesdeProducto(data);
  if (procesos.length === 0) {
    throw new Error("Faltan procesos aplicables para generar el PDF de papel.");
  }

  const tienePreparacion =
    procesos.includes("hojeado_papel") ||
    procesos.includes("guillotina_papel");

  if (!tienePreparacion) {
    throw new Error("Falta seleccionar Hojeado o Guillotina para el producto de papel.");
  }
}

export function validarMaquinariaPapelParaPdf(data: OrdenProduccionPapelData): string[] {
  const faltantes: string[] = [];

  for (const proceso of procesosAplicanDesdeProducto(data)) {
    if (proceso === "armado_papel") continue;

    const clave = CLAVE_MAQUINA_POR_PROCESO_PAPEL[proceso];
    const maquina = data.maquinaria_seleccionada?.[clave] ?? null;

    if (!maquina?.nombre) {
      faltantes.push(ETIQUETAS_PROCESO_PAPEL[proceso]);
    }
  }

  return faltantes;
}

export function procesoEsPreparacionPapel(proceso: NombreProcesoOrdenPapel): boolean {
  return proceso === "hojeado_papel" || proceso === "guillotina_papel";
}

export function procesoEsFinalPapel(proceso: NombreProcesoOrdenPapel): boolean {
  return proceso === "empaque_papel";
}

export function unidadEntradaProcesoPapel(
  proceso: NombreProcesoOrdenPapel
): "Pliegos" | "Bolsas" | "" {
  if (proceso === "armado_papel" || proceso === "empaque_papel") return "";
  if (procesoEsPreparacionPapel(proceso)) return "Pliegos";
  return "Pliegos";
}

export function unidadSalidaProcesoPapel(
  proceso: NombreProcesoOrdenPapel
): "Pliegos" | "Bolsas" {
  if (proceso === "armado_papel" || proceso === "empaque_papel") return "Bolsas";
  return "Pliegos";
}