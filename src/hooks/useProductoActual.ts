// src/hooks/useProductoActual.ts
import { useState } from "react";
import type { Producto } from "../types/formulario-solicitud.types";
import { ESTADO_INICIAL_PRODUCTO_MEDIDAS } from "../constants/formulario-solicitud.constants";
import type { Cara, Tinta } from "../types/catalogos-produccion.types";

export function useProductoActual(tintas: Tinta[], caras: Cara[]) {

  const estadoInicial: Producto = {
    nombre: "",
    cantidades: [0, 0, 0],
    kilogramos: [0, 0, 0],
    precios: [0, 0, 0],
    calibre: "200",
    tintas: 1,
    tintasId: 1,
    caras: 2,
    carasId: 2,
    material: "",
    medidas: { ...ESTADO_INICIAL_PRODUCTO_MEDIDAS },
    medidasFormateadas: "",
    idsuaje: null,
    suajeTipo: null,
    colorAsaId: null,
    colorAsaNombre: null,
    idMedidaTroquel: null,
    medidaTroquelTexto: null,
    observacion: "",
    pantones: null,
    pigmentos: null,
    modoCantidad: "unidad",
    herramental_descripcion: null,
    herramental_precio: null,
  };

  const [productoActual, setProductoActual] = useState<Producto>(estadoInicial);

  const resetearProducto = () => {
    setProductoActual({
      ...estadoInicial,
      tintas:   tintas[0]?.cantidad || 1,
      tintasId: tintas[0]?.id       || 1,
      caras:    caras.find(c => c.id === 2)?.cantidad || 2,
      carasId:  2,
    });
  };

  return {
    productoActual,
    setProductoActual,
    resetearProducto,
    estadoInicial,
  };
}