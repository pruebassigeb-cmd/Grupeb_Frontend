const BASE = import.meta.env.VITE_API_URL;

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

export interface ImagenCatalogo {
  id_archivo: number;
  catalogo_key: string;
  catalogo_id: number | null;
  url: string;
}

export const getImagenesCatalogo = async (): Promise<ImagenCatalogo[]> => {
  const res = await fetch(`${BASE}/catalogos-papel/imagenes`, { headers: headers() });
  if (!res.ok) throw new Error("Error al cargar las imágenes de catálogo");
  return res.json();
};

export const subirImagenCatalogo = async (
  catalogoKey: string,
  catalogoId: number | null,
  file: File
): Promise<ImagenCatalogo> => {
  const fd = new FormData();
  fd.append("archivo", file);
  fd.append("catalogo_key", catalogoKey);
  if (catalogoId != null) fd.append("catalogo_id", String(catalogoId));

  const res = await fetch(`${BASE}/catalogos-papel/imagenes`, {
    method: "POST",
    headers: headers(),
    body: fd,
  });
  if (!res.ok) throw new Error("Error al subir la imagen");
  return res.json();
};

export const eliminarImagenCatalogo = async (idArchivo: number): Promise<void> => {
  const res = await fetch(`${BASE}/catalogos-papel/imagenes/${idArchivo}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Error al eliminar la imagen");
};
