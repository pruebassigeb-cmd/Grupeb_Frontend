import { useCallback, useEffect, useState } from "react";
import {
  getImagenesCatalogo,
  subirImagenCatalogo,
  eliminarImagenCatalogo,
  type ImagenCatalogo,
} from "../../services/papel/catalogoImagenService";

// ✅ NUEVO — carga UNA sola vez todas las imágenes de catálogo (sin importar
// a qué pestaña pertenecen) y las comparte entre CatPanel, InsumoCatalogoPanel,
// FoilPanel y los banners globales de HS/AR y UV. `catalogoId = null` es la
// imagen GLOBAL de ese catálogo.
export function useImagenesCatalogo() {
  const [imagenes, setImagenes] = useState<ImagenCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [subiendoKey, setSubiendoKey] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setImagenes(await getImagenesCatalogo());
    } catch {
      // sin imágenes cargadas no rompe el catálogo — solo no se muestran miniaturas
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const claveDe = (catalogoKey: string, catalogoId: number | null) => `${catalogoKey}:${catalogoId ?? "global"}`;

  const buscar = useCallback(
    (catalogoKey: string, catalogoId: number | null): ImagenCatalogo | null =>
      imagenes.find((i) => i.catalogo_key === catalogoKey && i.catalogo_id === catalogoId) ?? null,
    [imagenes]
  );

  const subir = useCallback(async (catalogoKey: string, catalogoId: number | null, file: File) => {
    const clave = claveDe(catalogoKey, catalogoId);
    setSubiendoKey(clave);
    try {
      const nueva = await subirImagenCatalogo(catalogoKey, catalogoId, file);
      setImagenes((prev) => [
        ...prev.filter((i) => !(i.catalogo_key === catalogoKey && i.catalogo_id === catalogoId)),
        nueva,
      ]);
    } finally {
      setSubiendoKey((k) => (k === clave ? null : k));
    }
  }, []);

  const eliminar = useCallback(async (idArchivo: number) => {
    await eliminarImagenCatalogo(idArchivo);
    setImagenes((prev) => prev.filter((i) => i.id_archivo !== idArchivo));
  }, []);

  return { loading, buscar, subir, eliminar, subiendoKey, claveDe, recargar: cargar };
}

export type UseImagenesCatalogo = ReturnType<typeof useImagenesCatalogo>;
