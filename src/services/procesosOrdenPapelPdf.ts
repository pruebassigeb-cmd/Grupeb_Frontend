export type ProcesoOrdenPapelPdf = {
  key: string;
  etiqueta: string;
  aplica: boolean;
  maquina: string | null;
};

type ProductoOrdenPapel = {
  procesos_aplican?: string[];
  maquinaria_seleccionada?: Record<
    string,
    { id: number; nombre: string } | null
  >;
};

const PROCESOS = [
  ["hojeado_papel", "Hojeado", "hojeadora"],
  ["guillotina_papel", "Guillotina", "guillotina"],
  ["impresion_papel", "Impresión", "impresora"],
  ["laminacion_papel", "Laminación", "laminado_maquina"],
  ["barniz_uv_papel", "UV", "uv"],
  ["hot_stamping_papel", "Hot Stamping", "hs_ar"],
  ["texturizado_papel", "Texturizado", "texturizadora"],
  ["alto_relieve_papel", "Alto relieve", "hs_ar"],
  ["suaje_produccion_papel", "Suaje", "suaje_maquina"],
  ["armado_papel", "Armado", "armado"],
  ["empaque_papel", "Empaque", "empaque_maquina"],
] as const;

// NUEVO: Hojeado y Guillotina ya no son un método que se decide en el
// sistema (antes: metodo_hojeado elegido o derivado de la máquina
// registrada). El operador elige en piso cuál de las dos usar según la
// orden, así que ambas opciones se muestran siempre disponibles (aplica:
// true) en vez de estar condicionadas a un único método guardado.
const PROCESOS_SIEMPRE_DISPONIBLES = new Set(["hojeado_papel", "guillotina_papel"]);

export function construirProcesosOrdenPapelPdf(
  producto: ProductoOrdenPapel
): ProcesoOrdenPapelPdf[] {
  const procesos = new Set(producto.procesos_aplican ?? []);

  return PROCESOS.map(([key, etiqueta, claveMaquina]) => ({
    key,
    etiqueta,
    aplica: PROCESOS_SIEMPRE_DISPONIBLES.has(key) ? true : procesos.has(key),
    maquina:
      producto.maquinaria_seleccionada?.[claveMaquina]?.nombre ?? null,
  }));
}

export function valorProcesoOrdenPapelPdf(aplica: boolean): "X" | "N/A" {
  return aplica ? "X" : "N/A";
}