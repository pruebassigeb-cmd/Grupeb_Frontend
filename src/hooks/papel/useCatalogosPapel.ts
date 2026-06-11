import { useState, useEffect, useCallback } from "react";
import type { Catalogs, CatKey } from "../../types/papel/papel.types";
import {
  fetchCatalogosPapel,
  fetchCatalogosInactivos,
  agregarItemCatalogo,
  editarItemCatalogo,
  eliminarItemCatalogo,
  reactivarItemCatalogo,
} from "../../services/papel/papel.service";

const EMPTY: Catalogs = {
  tipo_producto: [], tipo_papel: [], calibre: [], tipo_pegado: [],
  pegamento: [], tipo_asa: [], laminado: [], refuerzo_medidas: [],
  refuerzo_material: [], empaque: [], sacabocados: [], perforado: [],
  hojeado_guillotina: [], impresora: [], hs_ar: [], suaje_maquina: [],
  uv: [], textura: [], empalme: [], armado: [], asas_maquina: [], desbarbe: [],
  matrix: [],
  cortes: [],
  dobles: [],
  puntos: [],
};

export function useCatalogosPapel() {
  const [catalogs,          setCatalogs]          = useState<Catalogs>(EMPTY);
  const [catalogsInactivos, setCatalogsInactivos] = useState<Catalogs>(EMPTY);
  const [loading,           setLoading]           = useState(true);
  const [loadingInactivos,  setLoadingInactivos]  = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCatalogosPapel();
      setCatalogs(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadInactivos = useCallback(async () => {
    try {
      setLoadingInactivos(true);
      setError(null);
      const data = await fetchCatalogosInactivos();
      setCatalogsInactivos(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingInactivos(false);
    }
  }, []);

  const names = (key: CatKey) => (catalogs[key] ?? []).map(i => i.nombre);

  // ── addItem: ahora recibe altura para cortes/dobles ───────────────────
  const addItem = async (
    key: CatKey,
    nombre: string,
    medida?: string,
    numeroMaquina?: string,
    altura?: string,          // ← nuevo
  ) => {
    const tempId = Date.now();
    setCatalogs(prev => ({
      ...prev,
      [key]: [...(prev[key] ?? []), { id: tempId, nombre, medida, numero_maquina: numeroMaquina, altura }],
    }));
    try {
      const created = await agregarItemCatalogo(key, nombre, medida, numeroMaquina, altura);
      setCatalogs(prev => ({
        ...prev,
        [key]: (prev[key] ?? []).map(i => i.id === tempId ? created : i),
      }));
    } catch {
      setCatalogs(prev => ({
        ...prev,
        [key]: (prev[key] ?? []).filter(i => i.id !== tempId),
      }));
    }
  };

  // ── editItem: ahora recibe altura para cortes/dobles ──────────────────
  const editItem = async (
    key: CatKey,
    id: number,
    nombre: string,
    medida?: string,
    numeroMaquina?: string,
    altura?: string,          // ← nuevo
  ) => {
    const backup = (catalogs[key] ?? []).find(i => i.id === id);
    setCatalogs(prev => ({
      ...prev,
      [key]: (prev[key] ?? []).map(i =>
        i.id === id ? { ...i, nombre, medida, numero_maquina: numeroMaquina, altura } : i
      ),
    }));
    try {
      await editarItemCatalogo(key, id, nombre, medida, numeroMaquina, altura);
    } catch {
      if (backup) {
        setCatalogs(prev => ({
          ...prev,
          [key]: (prev[key] ?? []).map(i => i.id === id ? backup : i),
        }));
      }
    }
  };

  const deleteItem = async (key: CatKey, id: number) => {
    const item   = (catalogs[key] ?? []).find(i => i.id === id);
    const backup = catalogs[key] ?? [];
    setCatalogs(prev => ({
      ...prev,
      [key]: (prev[key] ?? []).filter(i => i.id !== id),
    }));
    if (item) {
      setCatalogsInactivos(prev => ({
        ...prev,
        [key]: [...(prev[key] ?? []), item],
      }));
    }
    try {
      await eliminarItemCatalogo(key, id);
    } catch {
      setCatalogs(prev => ({ ...prev, [key]: backup }));
      if (item) {
        setCatalogsInactivos(prev => ({
          ...prev,
          [key]: (prev[key] ?? []).filter(i => i.id !== id),
        }));
      }
    }
  };

  const reactivarItem = async (key: CatKey, id: number) => {
    const item            = (catalogsInactivos[key] ?? []).find(i => i.id === id);
    const backupInactivos = catalogsInactivos[key] ?? [];
    setCatalogsInactivos(prev => ({
      ...prev,
      [key]: (prev[key] ?? []).filter(i => i.id !== id),
    }));
    if (item) {
      setCatalogs(prev => ({
        ...prev,
        [key]: [...(prev[key] ?? []), item],
      }));
    }
    try {
      await reactivarItemCatalogo(key, id);
    } catch {
      setCatalogsInactivos(prev => ({ ...prev, [key]: backupInactivos }));
      if (item) {
        setCatalogs(prev => ({
          ...prev,
          [key]: (prev[key] ?? []).filter(i => i.id !== id),
        }));
      }
    }
  };

  return {
    catalogs, catalogsInactivos,
    loading, loadingInactivos, error,
    names,
    addItem, editItem, deleteItem, reactivarItem,
    reload: load, loadInactivos,
  };
}