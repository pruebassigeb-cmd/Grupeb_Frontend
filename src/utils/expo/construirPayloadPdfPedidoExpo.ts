import { getClienteById } from "../../services/clientesService";
import { getVentaByPedido } from "../../services/ventasservice";
import { folioAPedido } from "../../types/expo/expo.types";

// Extraído de ListaCotizaciones.tsx (antes vivía como función local en
// confirmarCorreoYAprobar) para poder reutilizarlo tanto en el flujo online
// normal como en el manejador del outbox que aprueba + arma el PDF de
// pedido + manda el correo en segundo plano una vez que la aprobación
// encolada offline ya tiene folio de pedido real.
export const construirPayloadPdfPedidoDesdeBackData = async (
  backData: any,
  folioCotizacion: string,
  fechaCotizacion: string
) => {
  const folioPedido = backData.no_pedido || folioAPedido(folioCotizacion);

  const [venta, clienteCompleto] = await Promise.all([
    getVentaByPedido(folioPedido),
    backData.cliente_id ? getClienteById(backData.cliente_id).catch(() => null) : Promise.resolve(null),
  ]);

  const productos = (backData.productos || []).map((p: any) => {
    const esPapel = p.tipo_material === "papel";
    const foilNombre = p.foil_nombre || null;
    const asaNombre = p.asa_nombre || null;
    if (esPapel) {
      return {
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
        asa_suaje: asaNombre || null,
        asa_nombre: asaNombre || null,
        uvBr: p.uv ? true : null,
        alto_relieve: p.alto_relieve === true,
        metodo_hojeado: p.metodo_hojeado ?? null,
        lleva_armado: p.lleva_armado ?? true,
        maquinaria_seleccionada: p.maquinaria_seleccionada ?? {},
        textura_nombre: p.textura_nombre || null,
        pigmentos: null,
        pantones: p.pantones || null,
        pantonesDentro: null,
        observacion: p.observacion || null,
        descripcion: p.descripcion || null,
        perforacion: false,
        por_kilo: null,
        herramental_descripcion: null,
        herramental_precio: null,
        herramental_aprobado: null,
        detalles: (p.detalles || [])
          .filter((d: any) => d.aprobado === true)
          .map((d: any) => ({
            cantidad: Number(d.cantidad),
            precio_total: Number(d.precio_total),
            kilogramos: null,
            modo_cantidad: "unidad",
          })),
      };
    }
    return {
      nombre: p.nombre,
      material: p.material || "",
      calibre: p.calibre || "",
      tintas: p.tintas ?? 0,
      caras: p.caras ?? 0,
      medidasFormateadas: p.medida || "",
      medidas: {},
      bk: null, foil: null, laminado: null, uvBr: null,
      pigmentos: p.pigmentos || null,
      pantones: p.pantones || null,
      asa_suaje: p.suaje_tipo || null,
      observacion: p.observacion || null,
      descripcion: p.descripcion || null,
      perforacion: false,
      por_kilo: null,
      herramental_descripcion: null,
      herramental_precio: null,
      herramental_aprobado: null,
      detalles: (p.detalles || [])
        .filter((d: any) => d.aprobado === true)
        .map((d: any) => ({
          cantidad: Number(d.cantidad),
          precio_total: Number(d.precio_total),
          kilogramos: null,
          modo_cantidad: "unidad",
        })),
    };
  });

  return {
    no_pedido: folioPedido,
    no_cotizacion: folioCotizacion,
    fecha: fechaCotizacion,
    cliente: backData.cliente || "",
    empresa: backData.impresion || "",
    telefono: backData.celular || "",
    correo: backData.correo || "",
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
    subtotal: Number(venta.subtotal),
    iva: Number(venta.iva),
    total: Number(venta.total),
    anticipo: Number(venta.anticipo),
    saldo: Number(venta.saldo),
    productos,
    _correoCliente: clienteCompleto?.correo || backData.correo || "",
  };
};
