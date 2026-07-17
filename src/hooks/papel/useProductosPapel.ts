import { useState, useEffect, useCallback } from "react";
import type {
  ProductoPapelListItem,
  ProductoPapelForm,
} from "../../types/papel/papel.types";
import {
  fetchProductosPapel,
  crearProductoPapel,
  actualizarProductoPapel,
  eliminarProductoPapel,
} from "../../services/papel/papel.service";

export function useProductosPapel() {
  const [productos, setProductos] = useState<ProductoPapelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProductosPapel();
      setProductos(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const crear = async (
    form: ProductoPapelForm
  ): Promise<number | null> => {
    try {
      setSaving(true);
      setError(null);

      const creado = await crearProductoPapel(form);
      await load();

      return creado.idproducto_papel;
    } catch (e: any) {
      setError(e.message);
      // Se relanza para que quien llamó a crear() (p. ej. el onSave del
      // formulario) pueda enterarse del error real (como el 409 de
      // "producto duplicado") en vez de solo recibir null. Antes este
      // catch se quedaba con el error aquí adentro y nunca llegaba a
      // mostrarse en pantalla.
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const actualizar = async (
    id: number,
    form: ProductoPapelForm
  ): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);
      await actualizarProductoPapel(id, form);
      await load();
      return true;
    } catch (e: any) {
      setError(e.message);
      // Mismo motivo que en crear(): relanzar para que el error (p. ej.
      // "Ya existe otro producto con esa descripción y medida") llegue
      // hasta el formulario y se le muestre al usuario.
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id: number): Promise<boolean> => {
    try {
      setError(null);
      await eliminarProductoPapel(id);
      setProductos((prev) =>
        prev.filter((p) => p.idproducto_papel !== id)
      );
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  return {
    productos,
    loading,
    saving,
    error,
    crear,
    actualizar,
    eliminar,
    reload: load,
  };
}