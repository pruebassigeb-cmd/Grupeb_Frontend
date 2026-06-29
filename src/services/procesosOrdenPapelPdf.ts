export type ProcesoOrdenPapelPdf = {
  key: string;
  etiqueta: string;
  aplica: boolean;
  maquina: string | null;
};

type ProductoOrdenPapel = {
  metodo_hojeado?: "hojeado" | "guillotina" | null;
  procesos_aplican?: string[];
  maquinaria_seleccionada?: Record<
    string,
    { id: number; nombre: string } | null
  >;
};

const PROCESOS = [
  ["hojeado_papel", "Hojeado", "hojeado_guillotina"],
  ["guillotina_papel", "Guillotina", "hojeado_guillotina"],
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

export function construirProcesosOrdenPapelPdf(
  producto: ProductoOrdenPapel
): ProcesoOrdenPapelPdf[] {
  const procesos = new Set(producto.procesos_aplican ?? []);

  return PROCESOS.map(([key, etiqueta, claveMaquina]) => ({
    key,
    etiqueta,
    aplica: procesos.has(key),
    maquina:
      producto.maquinaria_seleccionada?.[claveMaquina]?.nombre ?? null,
  }));
}

export function valorProcesoOrdenPapelPdf(aplica: boolean): "X" | "N/A" {
  return aplica ? "X" : "N/A";
}
