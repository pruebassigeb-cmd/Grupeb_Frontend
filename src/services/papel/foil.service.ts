import type { Foil, FoilForm } from "../../types/papel/foil.types";

const BASE = import.meta.env.VITE_API_URL;

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

// GET todos los foils (global, desde proveedor 0 o endpoint propio)
export const fetchFoils = async (): Promise<Foil[]> => {
  const res = await fetch(`${BASE}/foil`, { headers: headers() });
  if (!res.ok) throw new Error("Error al cargar foils");
  return res.json();
};

export const fetchFoilById = async (idFoil: number): Promise<Foil> => {
  const res = await fetch(`${BASE}/foil/${idFoil}`, { headers: headers() });
  if (!res.ok) throw new Error("Error al cargar el foil");
  return res.json();
};

export const crearFoil = async (idProveedor: number, data: FoilForm): Promise<{ idfoil: number; clavefoil: string }> => {
  const res = await fetch(`${BASE}/proveedores/${idProveedor}/foil`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      colorfoil:            data.colorfoil,
      codigofoil:           data.codigofoil || null,
      precio:               data.precio ? Number(data.precio) : null,
      notas:                data.notas || null,
      minimo_compra:        data.minimo_compra ? Number(data.minimo_compra) : null,
      unidad:               data.unidad || null,
      presentaciones:       data.presentaciones,
    }),
  });
  if (!res.ok) throw new Error("Error al crear foil");
  return res.json();
};

export const actualizarFoil = async (idProveedor: number, idFoil: number, data: FoilForm): Promise<void> => {
  const res = await fetch(`${BASE}/proveedores/${idProveedor}/foil/${idFoil}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      colorfoil:      data.colorfoil,
      codigofoil:     data.codigofoil || null,
      precio:         data.precio ? Number(data.precio) : null,
      notas:          data.notas || null,
      minimo_compra:  data.minimo_compra ? Number(data.minimo_compra) : null,
      unidad:         data.unidad || null,
      presentaciones: data.presentaciones,
    }),
  });
  if (!res.ok) throw new Error("Error al actualizar foil");
};

export const eliminarFoil = async (idProveedor: number, idFoil: number): Promise<void> => {
  const res = await fetch(`${BASE}/proveedores/${idProveedor}/foil/${idFoil}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Error al eliminar foil");
};