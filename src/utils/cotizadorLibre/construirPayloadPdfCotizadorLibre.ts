// src/utils/cotizadorLibre/construirPayloadPdfCotizadorLibre.ts
import type { ItemCarrito, ClienteCompletoCotizadorLibre } from "../../types/cotizadorLibre/cotizadorLibreCotizaciones.types";

// Construye el arreglo de "productos" con la misma forma que ya usa
// generarPdfCotizacion/generarPdfPedido (ver construirPayloadPdfCotizacionExpo.ts
// como referencia de forma) — a partir de lo que ya tenemos en el carrito,
// sin volver a consultar nada.
function construirProductosPdf(carrito: ItemCarrito[]) {
  return carrito.map((item) => {
    const esPapel = item.payload.categoria === "papel";

    if (esPapel && item.payload.categoria === "papel") {
      return {
        tipo_material: "papel",
        tipoCotizacion: "papel",
        nombre: item.descripcion,
        grupo_descripcion: item.materialNombre ?? "",
        material: item.materialNombre ?? "",
        calibre: "",
        tintas: item.payload.acabados.tintas_frente ?? 0,
        tintasDentro: item.payload.acabados.tintas_dentro ?? 0,
        caras: 0,
        medidasFormateadas: item.descripcion,
        medidas: {},
        bk: null,
        foil: item.foilNombre ? true : null,
        foil_nombre: item.foilNombre ?? null,
        laminado: item.laminadoNombre ? true : null,
        laminado_nombre: item.laminadoNombre ?? null,
        asa_suaje: item.asaNombre ?? null,
        asa_nombre: item.asaNombre ?? null,
        uvBr: item.payload.acabados.uv ? true : null,
        alto_relieve: item.payload.acabados.alto_relieve === true,
        metodo_hojeado: null,
        lleva_armado: true,
        maquinaria_seleccionada: {},
        textura_nombre: item.texturaNombre ?? null,
        pigmentos: null,
        pantones: null,
        pantonesDentro: null,
        observacion: null,
        descripcion: null,
        perforacion: false,
        por_kilo: null,
        herramental_descripcion: null,
        herramental_precio: null,
        herramental_aprobado: null,
        detalles: [
          {
            cantidad: item.cantidad,
            precio_unitario: item.precioUnitario,
            precio_total: item.cantidad * item.precioUnitario,
            kilogramos: null,
            modo_cantidad: "unidad",
          },
        ],
      };
    }

    // Plástico
    return {
      tipo_material: "plastico",
      tipoCotizacion: "plastico",
      nombre: item.descripcion,
      material: item.materialNombre ?? "",
      calibre: "",
      tintas: item.tintasCantidad ?? 0,
      tintasDentro: 0,
      caras: 0,
      medidasFormateadas: item.descripcion,
      medidas: {},
      bk: null,
      pigmentos: null,
      pantones: null,
      asa_suaje: null,
      asa_nombre: null,
      observacion: null,
      descripcion: null,
      perforacion: false,
      por_kilo: null,
      herramental_descripcion: null,
      herramental_precio: null,
      herramental_aprobado: null,
      detalles: [
        {
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
          precio_total: item.cantidad * item.precioUnitario,
          kilogramos: null,
          modo_cantidad: "unidad",
        },
      ],
    };
  });
}

export function construirPayloadPdfCotizadorLibreCotizacion(
  carrito: ItemCarrito[],
  folio: string,
  fecha: string,
  cliente: ClienteCompletoCotizadorLibre | null
) {
  const productos = construirProductosPdf(carrito);
  const total = carrito.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);

  return {
    no_cotizacion: folio,
    fecha,
    cliente: cliente?.atencion || cliente?.empresa || "Cliente",
    empresa: cliente?.empresa || "",
    telefono: cliente?.telefono || cliente?.celular || "",
    correo: cliente?.correo || "",
    estado: "Pendiente",
    impresion: cliente?.impresion ?? null,
    celular: cliente?.celular ?? null,
    razon_social: cliente?.razon_social ?? null,
    rfc: cliente?.rfc ?? null,
    domicilio: cliente?.domicilio ?? null,
    numero: cliente?.numero ?? null,
    colonia: cliente?.colonia ?? null,
    codigo_postal: cliente?.codigo_postal ?? null,
    poblacion: cliente?.poblacion ?? null,
    estado_cliente: cliente?.estado_cliente ?? null,
    identificar: cliente?.identificar ?? null,
    productos,
    total,
    sin_iva: false,
    moneda: "MXN" as const,
  };
}

export function construirPayloadPdfCotizadorLibrePedido(
  carrito: ItemCarrito[],
  folioPedido: string,
  folioCotizacion: string | null,
  fecha: string,
  cliente: ClienteCompletoCotizadorLibre | null
) {
  const productos = construirProductosPdf(carrito).map((p) => ({ ...p }));
  const subtotal = carrito.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  const iva = Math.round(subtotal * 0.16 * 100) / 100;
  const total = Math.round((subtotal + iva) * 100) / 100;
  const anticipo = Math.round(total * 0.5 * 100) / 100;

  return {
    no_pedido: folioPedido,
    no_cotizacion: folioCotizacion,
    fecha,
    cliente: cliente?.atencion || cliente?.empresa || "Cliente",
    empresa: cliente?.empresa || "",
    telefono: cliente?.telefono || cliente?.celular || "",
    correo: cliente?.correo || "",
    impresion: cliente?.impresion ?? null,
    celular: cliente?.celular ?? null,
    razon_social: cliente?.razon_social ?? null,
    rfc: cliente?.rfc ?? null,
    domicilio: cliente?.domicilio ?? null,
    numero: cliente?.numero ?? null,
    colonia: cliente?.colonia ?? null,
    codigo_postal: cliente?.codigo_postal ?? null,
    poblacion: cliente?.poblacion ?? null,
    estado_cliente: cliente?.estado_cliente ?? null,
    identificar: cliente?.identificar ?? null,
    subtotal,
    iva,
    total,
    anticipo,
    saldo: total - anticipo,
    productos,
  };
}