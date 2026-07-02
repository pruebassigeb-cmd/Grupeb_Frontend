import type { Foil, FoilForm } from "../../types/papel/foil.types";

const BASE = import.meta.env.VITE_API_URL;

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

// GET todos los foils (global)
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

// Ahora acepta varios proveedores. Usa el primero seleccionado como el
// proveedor "de ruta" (la API sigue siendo /proveedores/:id/foil), y manda
// la lista completa en el body para que el backend los ligue a todos.
export const crearFoil = async (data: FoilForm): Promise<{ idfoil: number; clavefoil: string }> => {
  if (!data.proveedores_ids.length) {
    throw new Error("Selecciona al menos un proveedor");
  }
  const idProveedorRuta = data.proveedores_ids[0];

  const res = await fetch(`${BASE}/proveedores/${idProveedorRuta}/foil`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      colorfoil:      data.colorfoil,
      codigofoil:     data.codigofoil || null,
      precio:         data.precio ? Number(data.precio) : null,
      notas:          data.notas || null,
      minimo_compra:  data.minimo_compra ? Number(data.minimo_compra) : null,
      unidad:         data.unidad || null,
      presentaciones: data.presentaciones,
      proveedores_ids: data.proveedores_ids,
    }),
  });
  if (!res.ok) throw new Error("Error al crear foil");
  return res.json();
};

// idProveedorRuta: el proveedor "desde" el que editas (requerido por la
// ruta). data.proveedores_ids reemplaza el conjunto completo de proveedores
// ligados a este foil.
export const actualizarFoil = async (
  idProveedorRuta: number,
  idFoil: number,
  data: FoilForm
): Promise<void> => {
  const res = await fetch(`${BASE}/proveedores/${idProveedorRuta}/foil/${idFoil}`, {
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
      proveedores_ids: data.proveedores_ids,
    }),
  });
  if (!res.ok) throw new Error("Error al actualizar foil");
};

// Desvincula SOLO a idProveedor de este foil (no borra el foil si tiene
// otros proveedores).
export const eliminarFoil = async (idProveedor: number, idFoil: number): Promise<void> => {
  const res = await fetch(`${BASE}/proveedores/${idProveedor}/foil/${idFoil}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Error al eliminar foil");
};