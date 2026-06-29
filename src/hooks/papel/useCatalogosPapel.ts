import { useCallback, useEffect, useMemo, useState } from "react";
import type { Catalogs, CatItem, CatKey } from "../../types/papel/papel.types";
import {
  agregarItemCatalogo,
  editarItemCatalogo,
  eliminarItemCatalogo,
  fetchCatalogosInactivos,
  fetchCatalogosPapel,
  reactivarItemCatalogo,
} from "../../services/papel/papel.service";

const CAT_KEYS: CatKey[] = [
  "tipo_producto",
  "tipo_papel",
  "calibre",
  "tipo_pegado",
  "pegamento",
  "tipo_asa",
  "laminado",
  "laminado_maquina",
  "textura",
  "refuerzo_medidas",
  "refuerzo_material",
  "empaque",
  "sacabocados",
  "perforado",
  "hojeado_guillotina",
  "impresora",
  "hs_ar",
  "suaje_maquina",
  "uv",
  "texturizadora",
  "empaque_maquina",
  "empalme",
  "armado",
  "asas_maquina",
  "desbarbe",
  "matrix",
  "cortes",
  "dobles",
  "puntos",
];

const emptyCatalogs = (): Catalogs => {
  const acc = {} as Catalogs;
  for (const key of CAT_KEYS) acc[key] = [];
  return acc;
};

const ordenar = (items: CatItem[]) =>
  [...items].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));

export function useCatalogosPapel() {
  const [catalogs, setCatalogs] = useState<Catalogs>(emptyCatalogs);
  const [catalogsInactivos, setCatalogsInactivos] = useState<Catalogs>(emptyCatalogs);
  const [loading, setLoading] = useState(true);
  const [loadingInactivos, setLoadingInactivos] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCatalogs({ ...emptyCatalogs(), ...(await fetchCatalogosPapel()) });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInactivos = useCallback(async () => {
    setLoadingInactivos(true);
    try {
      setCatalogsInactivos({ ...emptyCatalogs(), ...(await fetchCatalogosInactivos()) });
    } finally {
      setLoadingInactivos(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const names = useMemo(() => {
    const acc = {} as Record<CatKey, string[]>;
    for (const key of CAT_KEYS) acc[key] = (catalogs[key] ?? []).map(item => item.nombre);
    return acc;
  }, [catalogs]);

  const addItem = useCallback(
    async (
      catalogo: CatKey,
      nombre: string,
      medida?: string,
      numeroMaquina?: string,
      altura?: string,
      idcatPunto?: number | null,
      tipoMaquina?: string | null
    ) => {
      const item = await agregarItemCatalogo(
        catalogo,
        nombre,
        medida,
        numeroMaquina,
        altura,
        idcatPunto,
        tipoMaquina
      );
      setCatalogs(prev => ({
        ...prev,
        [catalogo]: ordenar([...(prev[catalogo] ?? []), item]),
      }));
      return item;
    },
    []
  );

  const editItem = useCallback(
    async (
      catalogo: CatKey,
      id: number,
      nombre: string,
      medida?: string,
      numeroMaquina?: string,
      altura?: string,
      idcatPunto?: number | null,
      tipoMaquina?: string | null
    ) => {
      await editarItemCatalogo(
        catalogo,
        id,
        nombre,
        medida,
        numeroMaquina,
        altura,
        idcatPunto,
        tipoMaquina
      );
      setCatalogs(prev => ({
        ...prev,
        [catalogo]: ordenar(
          (prev[catalogo] ?? []).map(item =>
            item.id === id
              ? {
                  ...item,
                  nombre,
                  medida: medida ?? item.medida,
                  numero_maquina: numeroMaquina ?? item.numero_maquina,
                  tipo_maquina: tipoMaquina ?? item.tipo_maquina,
                }
              : item
          )
        ),
      }));
    },
    []
  );

  const deleteItem = useCallback(async (catalogo: CatKey, id: number) => {
    await eliminarItemCatalogo(catalogo, id);
    setCatalogs(prev => ({
      ...prev,
      [catalogo]: (prev[catalogo] ?? []).filter(item => item.id !== id),
    }));
  }, []);

  const reactivarItem = useCallback(async (catalogo: CatKey, id: number) => {
    await reactivarItemCatalogo(catalogo, id);
    await load();
    await loadInactivos();
  }, [load, loadInactivos]);

  return {
    catalogs,
    catalogsInactivos,
    names,
    loading,
    loadingInactivos,
    addItem,
    editItem,
    deleteItem,
    reactivarItem,
    load,
    loadInactivos,
  };
}
