import { getClienteById } from "../../services/clientesService";

// Extraído de expo.tsx (antes vivía como función local en guardarConOpciones)
// para poder reutilizarlo tanto en el flujo online normal como en el
// manejador del outbox que arma y manda el correo en segundo plano una vez
// que la cotización encolada offline ya tiene folio real.
export const construirPayloadPdfCotizacionDesdeBackData = async (
  backData: any,
  folio: string,
  fecha: string
) => {
  const clienteCompleto = backData.cliente_id
    ? await getClienteById(backData.cliente_id).catch(() => null)
    : null;

  const productos = (backData.productos || []).map((p: any) => {
    const esPapel = p.tipo_material === "papel";
    const foilNombre = p.foil_nombre || null;
    const asaPapel = p.asa_nombre || null;
    const tipoAsaPlastico = p.suaje_tipo || null;
    const colorAsaPlastico = p.color_asa_nombre || null;
    const asaPlastico = [tipoAsaPlastico, colorAsaPlastico]
      .map((valor) => String(valor || "").trim())
      .filter(Boolean)
      .filter((valor, indice, arreglo) => arreglo.indexOf(valor) === indice)
      .join(" · ") || null;

    const base = esPapel
      ? {
          tipo_material: "papel",
          tipoCotizacion: "papel",
          nombre: p.nombre,
          grupo_descripcion: p.grupo_descripcion ?? "",
          material: p.material || "",
          calibre: p.calibre || "",
          tintas: p.tintas ?? 0,
          tintasDentro: p.tintas_dentro ?? 0,
          caras: p.caras ?? 0,
          medidasFormateadas: p.medida || "",
          medidas: {},
          bk: null,
          foil: foilNombre ? true : null,
          foil_nombre: foilNombre,
          laminado: p.laminado_nombre ? true : null,
          laminado_nombre: p.laminado_nombre || null,
          asa_suaje: asaPapel,
          asa_nombre: asaPapel,
          uvBr: p.uv ? true : null,
          alto_relieve: p.alto_relieve === true,
          metodo_hojeado: p.metodo_hojeado ?? null,
          lleva_armado: p.lleva_armado ?? true,
          maquinaria_seleccionada: p.maquinaria_seleccionada ?? {},
          textura_nombre: p.textura_nombre || null,
          pigmentos: null,
          pantones: p.pantones || null,
          pantonesDentro: p.pantones_dentro || null,
          observacion: p.observacion || null,
          descripcion: p.descripcion || null,
          perforacion: false,
          por_kilo: null,
          herramental_descripcion: null,
          herramental_precio: null,
          herramental_aprobado: null,
        }
      : {
          tipo_material: "plastico",
          tipoCotizacion: "plastico",
          nombre: p.nombre,
          tipo_producto: p.tipo_producto || p.expo_tipo_producto || null,
          material: p.material || "",
          calibre: p.calibre || "",
          tintas: p.tintas ?? 0,
          tintasDentro: 0,
          caras: p.caras ?? 0,
          medidasFormateadas: p.medida || "",
          medidas: {},
          bk: null,
          pigmentos: p.pigmentos || p.pigmento || null,
          pantones: p.pantones || null,
          asa_suaje: tipoAsaPlastico,
          asa_nombre: asaPlastico,
          color_asa_nombre: colorAsaPlastico,
          observacion: p.observacion || null,
          descripcion: p.descripcion || null,
          perforacion: false,
          por_kilo: null,
          herramental_descripcion: null,
          herramental_precio: null,
          herramental_aprobado: null,
        };

    return {
      ...base,
      detalles: (p.detalles || []).map((d: any) => ({
        cantidad: Number(d.cantidad),
        precio_unitario:
          d.precio_unitario !== null && d.precio_unitario !== undefined
            ? Number(d.precio_unitario)
            : null,
        precio_total: Number(d.precio_total),
        kilogramos: null,
        modo_cantidad: "unidad",
      })),
    };
  });

  const total = productos.reduce(
    (sum: number, p: any) => sum + p.detalles.reduce((s: number, d: any) => s + d.precio_total, 0),
    0
  );

  return {
    no_cotizacion: folio,
    fecha,
    cliente: backData.cliente || "",
    empresa: backData.impresion || "",
    telefono: backData.celular || "",
    correo: clienteCompleto?.correo || backData.correo || "",
    estado: "Pendiente",
    impresion: backData.impresion ?? null,
    celular: backData.celular ?? null,
    razon_social: clienteCompleto?.razon_social ?? null,
    rfc: clienteCompleto?.rfc ?? null,
    domicilio: clienteCompleto?.domicilio ?? null,
    numero: clienteCompleto?.numero ?? null,
    colonia: clienteCompleto?.colonia ?? null,
    codigo_postal: clienteCompleto?.codigo_postal ?? null,
    poblacion: clienteCompleto?.poblacion ?? backData.ciudad ?? null,
    estado_cliente: clienteCompleto?.estado ?? backData.estado_cliente ?? null,
    cliente_id: backData.cliente_id ?? null,
    identificar: backData.identificar ?? null,
    total,
    productos,
    _correoCliente: clienteCompleto?.correo || backData.correo || "",
  };
};
