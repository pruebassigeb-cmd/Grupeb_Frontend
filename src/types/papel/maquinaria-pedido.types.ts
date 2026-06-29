export type MetodoHojeadoPedidoPapel = "hojeado" | "guillotina";

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

export type MaquinariaProductoPedidoPapel = {
  idsolicitud_producto: number;
  metodo_hojeado: MetodoHojeadoPedidoPapel;
  lleva_armado: boolean;
  maquinaria_seleccionada: MaquinariaSeleccionadaPedidoPapel;
};
