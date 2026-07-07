import { useState, useEffect, useCallback } from "react";
import type {
  ProductoPlastico,
  ProductoPlasticoCreate,
} from "../../types/productos-plastico.types";
import {
  getProductosPlastico,
  createProductoPlastico,
  updateProductoPlastico,
  deleteProductoPlastico,
  reactivarProductoPlastico,
} from "../../services/productosPlasticoService";
import { showAlert } from "../../components/CustomAlert";

export function useProductosPlastico() {
  const [productos, setProductos] = useState<ProductoPlastico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProductosPlastico();
      setProductos(data);
    } catch (e) {
      console.error("❌ Error al cargar productos plástico:", e);
      showAlert("❌ Error al cargar los productos de plástico");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /**
   * @returns id del producto creado, o null si falló por un error genérico
   * (ya mostrado vía showAlert). Si el fallo es un 409 de duplicado, el error
   * se re-lanza SIN alert para que el formulario lo muestre inline (igual que
   * hacía la pantalla original de plástico).
   */
  const crear = async (payload: ProductoPlasticoCreate): Promise<number | null> => {
    setSaving(true);
    try {
      const res = await createProductoPlastico(payload);
      await cargar();
      return res.producto.id;
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 409 && data?.detalle) {
        throw error;
      }
      const msg = data?.error || data?.details?.join(", ") || "Error al guardar el producto";
      showAlert(`❌ ${msg}`);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const actualizar = async (id: number, payload: ProductoPlasticoCreate): Promise<boolean> => {
    setSaving(true);
    try {
      await updateProductoPlastico(id, payload);
      await cargar();
      return true;
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 409 && data?.detalle) {
        throw error;
      }
      const msg = data?.error || data?.details?.join(", ") || "Error al actualizar el producto";
      showAlert(`❌ ${msg}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id: number) => {
    try {
      await deleteProductoPlastico(id);
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      console.error("❌ Error al eliminar producto plástico:", e);
      showAlert("❌ Error al eliminar el producto");
    }
  };

  const reactivar = async (id: number) => {
    try {
      await reactivarProductoPlastico(id);
      await cargar();
    } catch (e: any) {
      console.error("❌ Error al reactivar producto plástico:", e);
      showAlert("❌ Error al reactivar el producto");
    }
  };

  return { productos, loading, saving, crear, actualizar, eliminar, reactivar, recargar: cargar };
}