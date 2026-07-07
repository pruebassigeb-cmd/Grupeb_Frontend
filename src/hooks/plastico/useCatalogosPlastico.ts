import { useState, useEffect, useCallback } from "react";
import type {
  TipoProductoAdminItem,
  MaterialAdminItem,
  CalibreAdminItem,
} from "../../types/productos-plastico.types";
import {
  getTiposProductoAdmin,
  crearTipoProductoAdmin,
  editarTipoProductoAdmin,
  desactivarTipoProductoAdmin,
  reactivarTipoProductoAdmin,
  getMaterialesAdmin,
  crearMaterialAdmin,
  editarMaterialAdmin,
  desactivarMaterialAdmin,
  reactivarMaterialAdmin,
  getCalibresAdmin,
  crearCalibreAdmin,
  editarCalibreAdmin,
  desactivarCalibreAdmin,
  reactivarCalibreAdmin,
} from "../../services/plastico/catalogosPlasticoAdminService";

/**
 * Hook centralizado para los 3 catálogos de plástico (tipo de producto,
 * material, calibre). Métodos explícitos por catálogo (a diferencia de los
 * cat_* de papel, estos tres tienen formas distintas entre sí).
 */
export function useCatalogosPlastico() {
  const [tiposProducto, setTiposProducto] = useState<TipoProductoAdminItem[]>([]);
  const [materiales, setMateriales] = useState<MaterialAdminItem[]>([]);
  const [calibres, setCalibres] = useState<CalibreAdminItem[]>([]);

  const [tiposProductoInactivos, setTiposProductoInactivos] = useState<TipoProductoAdminItem[]>([]);
  const [materialesInactivos, setMaterialesInactivos] = useState<MaterialAdminItem[]>([]);
  const [calibresInactivos, setCalibresInactivos] = useState<CalibreAdminItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingInactivos, setLoadingInactivos] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [tp, mat, cal] = await Promise.all([
        getTiposProductoAdmin(true),
        getMaterialesAdmin(true),
        getCalibresAdmin(true),
      ]);
      setTiposProducto(tp);
      setMateriales(mat);
      setCalibres(cal);
    } catch (e) {
      console.error("❌ Error al cargar catálogos de plástico:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInactivos = useCallback(async () => {
    setLoadingInactivos(true);
    try {
      const [tp, mat, cal] = await Promise.all([
        getTiposProductoAdmin(false),
        getMaterialesAdmin(false),
        getCalibresAdmin(false),
      ]);
      setTiposProductoInactivos(tp);
      setMaterialesInactivos(mat);
      setCalibresInactivos(cal);
    } catch (e) {
      console.error("❌ Error al cargar catálogos inactivos de plástico:", e);
    } finally {
      setLoadingInactivos(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ── Tipo de producto ─────────────────────────────────────────────────────
  const agregarTipoProducto = async (nombre: string) => {
    const nuevo = await crearTipoProductoAdmin(nombre);
    setTiposProducto((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return nuevo;
  };
  const editarTipoProducto = async (id: number, nombre: string) => {
    const actualizado = await editarTipoProductoAdmin(id, nombre);
    setTiposProducto((prev) => prev.map((t) => (t.id === id ? actualizado : t)));
    return actualizado;
  };
  const desactivarTipoProducto = async (id: number) => {
    await desactivarTipoProductoAdmin(id);
    setTiposProducto((prev) => prev.filter((t) => t.id !== id));
  };
  const reactivarTipoProducto = async (id: number) => {
    await reactivarTipoProductoAdmin(id);
    setTiposProductoInactivos((prev) => prev.filter((t) => t.id !== id));
    await cargar();
  };

  // ── Material ──────────────────────────────────────────────────────────────
  const agregarMaterial = async (nombre: string, valor: number) => {
    const nuevo = await crearMaterialAdmin(nombre, valor);
    setMateriales((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return nuevo;
  };
  const editarMaterial = async (id: number, nombre: string, valor: number) => {
    const actualizado = await editarMaterialAdmin(id, nombre, valor);
    setMateriales((prev) => prev.map((m) => (m.id === id ? actualizado : m)));
    return actualizado;
  };
  const desactivarMaterial = async (id: number) => {
    await desactivarMaterialAdmin(id);
    setMateriales((prev) => prev.filter((m) => m.id !== id));
  };
  const reactivarMaterial = async (id: number) => {
    await reactivarMaterialAdmin(id);
    setMaterialesInactivos((prev) => prev.filter((m) => m.id !== id));
    await cargar();
  };

  // ── Calibre ───────────────────────────────────────────────────────────────
  const agregarCalibre = async (calibre: number, calibre_bopp?: number | null, gramos?: number | null) => {
    const nuevo = await crearCalibreAdmin(calibre, calibre_bopp, gramos);
    setCalibres((prev) => [...prev, nuevo].sort((a, b) => a.calibre - b.calibre));
    return nuevo;
  };
  const editarCalibre = async (id: number, calibre: number, calibre_bopp?: number | null, gramos?: number | null) => {
    const actualizado = await editarCalibreAdmin(id, calibre, calibre_bopp, gramos);
    setCalibres((prev) => prev.map((c) => (c.id === id ? actualizado : c)));
    return actualizado;
  };
  const desactivarCalibre = async (id: number) => {
    await desactivarCalibreAdmin(id);
    setCalibres((prev) => prev.filter((c) => c.id !== id));
  };
  const reactivarCalibre = async (id: number) => {
    await reactivarCalibreAdmin(id);
    setCalibresInactivos((prev) => prev.filter((c) => c.id !== id));
    await cargar();
  };

  return {
    tiposProducto, materiales, calibres,
    tiposProductoInactivos, materialesInactivos, calibresInactivos,
    loadInactivos,
    loading, loadingInactivos,
    recargar: cargar,
    agregarTipoProducto, editarTipoProducto, desactivarTipoProducto, reactivarTipoProducto,
    agregarMaterial, editarMaterial, desactivarMaterial, reactivarMaterial,
    agregarCalibre, editarCalibre, desactivarCalibre, reactivarCalibre,
  };
}