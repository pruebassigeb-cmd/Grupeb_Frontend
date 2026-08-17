import { useState, useEffect, useCallback } from "react";
import type {
  TipoProductoAdminItem,
  MaterialAdminItem,
  CalibreAdminItem,
  TroquelAdminItem,
  SuajeAdminItem,
  CintaSeguridadAdminItem,
} from "../../types/plastico/productos-plastico.types";
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
  getTroquelesAdmin,
  crearTroquelAdmin,
  editarTroquelAdmin,
  desactivarTroquelAdmin,
  reactivarTroquelAdmin,
  getSuajesAdmin,
  crearSuajeAdmin,
  editarSuajeAdmin,
  desactivarSuajeAdmin,
  reactivarSuajeAdmin,
  getCintaSeguridadAdmin,
  crearCintaSeguridadAdmin,
  editarCintaSeguridadAdmin,
  desactivarCintaSeguridadAdmin,
  reactivarCintaSeguridadAdmin,
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
  const [troqueles, setTroqueles] = useState<TroquelAdminItem[]>([]);
  const [suajes, setSuajes] = useState<SuajeAdminItem[]>([]);
  const [cintaSeguridad, setCintaSeguridad] = useState<CintaSeguridadAdminItem[]>([]);

  const [tiposProductoInactivos, setTiposProductoInactivos] = useState<TipoProductoAdminItem[]>([]);
  const [materialesInactivos, setMaterialesInactivos] = useState<MaterialAdminItem[]>([]);
  const [calibresInactivos, setCalibresInactivos] = useState<CalibreAdminItem[]>([]);
  const [troquelesInactivos, setTroquelesInactivos] = useState<TroquelAdminItem[]>([]);
  const [suajesInactivos, setSuajesInactivos] = useState<SuajeAdminItem[]>([]);
  const [cintaSeguridadInactivos, setCintaSeguridadInactivos] = useState<CintaSeguridadAdminItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingInactivos, setLoadingInactivos] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [tp, mat, cal, tro, sua, cin] = await Promise.all([
        getTiposProductoAdmin(true),
        getMaterialesAdmin(true),
        getCalibresAdmin(true),
        getTroquelesAdmin(true),
        getSuajesAdmin(true),
        getCintaSeguridadAdmin(true),
      ]);
      setTiposProducto(tp);
      setMateriales(mat);
      setCalibres(cal);
      setTroqueles(tro);
      setSuajes(sua);
      setCintaSeguridad(cin);
    } catch (e) {
      console.error("❌ Error al cargar catálogos de plástico:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInactivos = useCallback(async () => {
    setLoadingInactivos(true);
    try {
      const [tp, mat, cal, tro, sua, cin] = await Promise.all([
        getTiposProductoAdmin(false),
        getMaterialesAdmin(false),
        getCalibresAdmin(false),
        getTroquelesAdmin(false),
        getSuajesAdmin(false),
        getCintaSeguridadAdmin(false),
      ]);
      setTiposProductoInactivos(tp);
      setMaterialesInactivos(mat);
      setCalibresInactivos(cal);
      setTroquelesInactivos(tro);
      setSuajesInactivos(sua);
      setCintaSeguridadInactivos(cin);
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

  // ── Tipo de troquel ───────────────────────────────────────────────────────
  const agregarTroquel = async (nombre: string) => {
    const nuevo = await crearTroquelAdmin(nombre);
    setTroqueles((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return nuevo;
  };
  const editarTroquel = async (id: number, nombre: string) => {
    const actualizado = await editarTroquelAdmin(id, nombre);
    setTroqueles((prev) => prev.map((t) => (t.id === id ? actualizado : t)));
    return actualizado;
  };
  const desactivarTroquel = async (id: number) => {
    await desactivarTroquelAdmin(id);
    setTroqueles((prev) => prev.filter((t) => t.id !== id));
  };
  const reactivarTroquel = async (id: number) => {
    await reactivarTroquelAdmin(id);
    setTroquelesInactivos((prev) => prev.filter((t) => t.id !== id));
    await cargar();
  };

  // ── Asa / Suaje ───────────────────────────────────────────────────────────
  const agregarSuaje = async (nombre: string) => {
    const nuevo = await crearSuajeAdmin(nombre);
    setSuajes((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return nuevo;
  };
  const editarSuaje = async (id: number, nombre: string) => {
    const actualizado = await editarSuajeAdmin(id, nombre);
    setSuajes((prev) => prev.map((s) => (s.id === id ? actualizado : s)));
    return actualizado;
  };
  const desactivarSuaje = async (id: number) => {
    await desactivarSuajeAdmin(id);
    setSuajes((prev) => prev.filter((s) => s.id !== id));
  };
  const reactivarSuaje = async (id: number) => {
    await reactivarSuajeAdmin(id);
    setSuajesInactivos((prev) => prev.filter((s) => s.id !== id));
    await cargar();
  };

  // ── Cinta de seguridad ────────────────────────────────────────────────────
  const agregarCintaSeguridad = async (nombre: string, medida?: string | null) => {
    const nuevo = await crearCintaSeguridadAdmin(nombre, medida);
    setCintaSeguridad((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return nuevo;
  };
  const editarCintaSeguridad = async (id: number, nombre: string, medida?: string | null) => {
    const actualizado = await editarCintaSeguridadAdmin(id, nombre, medida);
    setCintaSeguridad((prev) => prev.map((c) => (c.id === id ? actualizado : c)));
    return actualizado;
  };
  const desactivarCintaSeguridad = async (id: number) => {
    await desactivarCintaSeguridadAdmin(id);
    setCintaSeguridad((prev) => prev.filter((c) => c.id !== id));
  };
  const reactivarCintaSeguridad = async (id: number) => {
    await reactivarCintaSeguridadAdmin(id);
    setCintaSeguridadInactivos((prev) => prev.filter((c) => c.id !== id));
    await cargar();
  };

  return {
    tiposProducto, materiales, calibres, troqueles, suajes, cintaSeguridad,
    tiposProductoInactivos, materialesInactivos, calibresInactivos,
    troquelesInactivos, suajesInactivos, cintaSeguridadInactivos,
    loadInactivos,
    loading, loadingInactivos,
    recargar: cargar,
    agregarTipoProducto, editarTipoProducto, desactivarTipoProducto, reactivarTipoProducto,
    agregarMaterial, editarMaterial, desactivarMaterial, reactivarMaterial,
    agregarCalibre, editarCalibre, desactivarCalibre, reactivarCalibre,
    agregarTroquel, editarTroquel, desactivarTroquel, reactivarTroquel,
    agregarSuaje, editarSuaje, desactivarSuaje, reactivarSuaje,
    agregarCintaSeguridad, editarCintaSeguridad, desactivarCintaSeguridad, reactivarCintaSeguridad,
  };
}