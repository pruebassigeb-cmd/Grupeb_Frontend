export type MaquinaPedidoPapel = {
  id: number;
  nombre: string;
  numero_maquina?: string | null;
  tipo_maquina?: "hojeadora" | "guillotina" | string | null;
};

export type MaquinariaSeleccionadaPedidoPapel = Record<
  string,
  MaquinaPedidoPapel | null
>;

// NUEVO: ya no hay un paso manual donde el usuario confirme/elija maquinaria
// o método de Hojeado/Guillotina al convertir la cotización a pedido. Estos
// datos ya son fijos desde el producto: la maquinaria por proceso viene de
// su alta (FormularioProductoPapelAlta, una sola máquina por proceso) y
// lleva_armado viene de la cotización (specs.lleva_armado en
// FormularioProductoPapel). El backend los copia directamente al crear el
// pedido — este tipo queda solo como forma de LEER esa información ya
// fijada (p. ej. para mostrarla en un resumen), no para enviarla.
export type MaquinariaProductoPedidoPapel = {
  idsolicitud_producto: number;
  lleva_armado: boolean;
  maquinaria_seleccionada: MaquinariaSeleccionadaPedidoPapel;
};