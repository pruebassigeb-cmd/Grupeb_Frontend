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
// ✅ NUEVO — puente hacia el sistema de Proveedores/Insumos. Dar de alta
// estos 6 catálogos desde CUALQUIER lado (Catálogos o el formulario de
// producto de papel) debe terminar siempre en el mismo `insumo`, para no
// generar registros "huérfanos" en cat_* sin proveedor/precio/código y sin
// aparecer en el panel unificado de Catálogos.
import {
  crearCatalogoInsumo,
  type CatKeySincronizado,
} from "../../services/papel/catalogoPapelInsumoService";

const CAT_KEYS: CatKey[] = [
  "tipo_producto",
  "tipo_papel",
  "calibre",
  "tipo_pegado",
  "pegamento",
  "tipo_asa",
  "laminado",
  "laminado_maquina",
  "rollo_lam",
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

// ✅ NUEVO — los 6 catálogos unificados con Proveedores/Insumos. El resto de
// CAT_KEYS sigue exactamente igual que antes, sin tocarse.
// NOTA: "rollo_lam" NO entra aquí — es un catálogo simple, propio de este
// formulario, sin relación con Proveedores/Insumos.
const CATKEYS_UNIFICADOS: CatKey[] = [
  "tipo_papel",
  "pegamento",
  "laminado",
  "sacabocados",
  "perforado",
  "matrix",
];

const esCatalogoUnificado = (catalogo: CatKey): catalogo is CatKeySincronizado =>
  CATKEYS_UNIFICADOS.includes(catalogo);

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
      // ✅ NUEVO — para los 6 catálogos unificados, pasa por el puente hacia
      // `insumo` (mismo endpoint que ya usa InsumoCatalogoPanel) en vez de
      // escribir directo en cat_*. La medida (si aplica, sacabocados/perforado)
      // se manda por separado y el backend la combina en el nombre, igual
      // que ya hace el panel de Catálogos.
      if (esCatalogoUnificado(catalogo)) {
        const resultado = await crearCatalogoInsumo(catalogo, nombre, medida);
        const item = {
          id: resultado.id,
          nombre: resultado.nombre,
          activo: resultado.activo,
        } as CatItem;

        setCatalogs(prev => ({
          ...prev,
          [catalogo]: ordenar([...(prev[catalogo] ?? []), item]),
        }));
        return item;
      }

      // "rollo_lam" (y el resto de catálogos simples) pasan por el flujo
      // normal de agregarItemCatalogo. Ahí, el usuario escribe solo el
      // número (ej. "38.5") y el backend arma el nombre final ("38.5 cm")
      // — ver catalogos_papel.controller.ts, rama esRolloLam.
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
      // NOTA: la edición (renombrar) de los 6 catálogos unificados NO pasa
      // por aquí actualmente — este formulario (FormularioProductoPapelAlta)
      // solo expone alta (onAdd) para esos catKeys, no edición. Si en algún
      // punto se necesita editar desde este hook, avisa para agregarle el
      // mismo enrutamiento al puente.
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