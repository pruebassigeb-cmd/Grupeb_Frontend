import { useState } from "react";
import type {
  ProductoCotizacion,
  ProductoPapelCotizacionLeido,
} from "../../types/cotizaciones.types";
import { guardarMaquinariaPedidoPapel } from "../../services/pedidosService";
import ModalMaquinariaPedidoPapel from "./ModalMaquinariaPedidoPapel";
import type { MaquinariaProductoPedidoPapel } from "../../types/papel/maquinaria-pedido.types";

type Props = {
  noPedido: string;
  productos: ProductoCotizacion[];
  onSaved?: () => void;
};

const esProductoPapel = (
  producto: ProductoCotizacion
): producto is ProductoPapelCotizacionLeido => {
  const valor = producto as unknown as Record<string, unknown>;

  return (
    valor.tipo_material === "papel" ||
    valor.tipoCotizacion === "papel" ||
    valor.idproducto_papel != null ||
    valor.producto_papel_idproducto_papel != null
  );
};

const contienePapel = (productos: ProductoCotizacion[]) =>
  productos.some(esProductoPapel);

export default function ConfigurarMaquinariaPedidoPapel({
  noPedido,
  productos,
  onSaved,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!contienePapel(productos)) return null;

  const guardar = async (
    selecciones: MaquinariaProductoPedidoPapel[]
  ) => {
    setGuardando(true);
    setError(null);
    try {
      await guardarMaquinariaPedidoPapel(noPedido, selecciones);
      setAbierto(false);
      onSaved?.();
    } catch (err: any) {
      setError(
        err?.response?.data?.error ??
          "No se pudo guardar la maquinaria del pedido."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
      >
        Configurar maquinaria
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {abierto && (
        <ModalMaquinariaPedidoPapel
          productos={productos}
          onCancel={() => !guardando && setAbierto(false)}
          onConfirm={guardar}
        />
      )}
    </>
  );
}
