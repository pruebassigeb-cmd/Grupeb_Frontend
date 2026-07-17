import type {
  MaterialSistemaPapelExpo,
  ProductoSistemaPapelExpo,
  ProductoSistemaPlasticoExpo,
} from "../../types/expo/expo.types";

export const normalizarTextoExpo = (valor?: string | null): string =>
  (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-MX");

export const valorFormulario = (valor: unknown): string => {
  if (valor === null || valor === undefined || valor === "") return "";
  const numero = Number(valor);
  return Number.isFinite(numero) ? String(numero) : String(valor);
};

export const precioFormulario = (valor: unknown): string => {
  if (valor === null || valor === undefined || valor === "") return "";
  const numero = Number(valor);
  return Number.isFinite(numero) ? String(numero) : "";
};

export const productosPapelCompatibles = (
  productos: ProductoSistemaPapelExpo[],
  tipo: string,
  papel: string,
): ProductoSistemaPapelExpo[] => {
  const tipoNormalizado = normalizarTextoExpo(tipo);
  const papelNormalizado = normalizarTextoExpo(papel);

  if (!tipoNormalizado || !papelNormalizado) return [];

  return productos.filter(producto => {
    const coincideTipo =
      normalizarTextoExpo(producto.tipo_producto) === tipoNormalizado;

    const coincidePapel = (producto.materiales || []).some(
      material => normalizarTextoExpo(material.tipo_papel) === papelNormalizado,
    );

    return coincideTipo && coincidePapel;
  });
};

export const materialesPapelCompatibles = (
  producto: ProductoSistemaPapelExpo | null,
  papel: string,
): MaterialSistemaPapelExpo[] => {
  if (!producto) return [];
  const papelNormalizado = normalizarTextoExpo(papel);

  return (producto.materiales || []).filter(
    material => normalizarTextoExpo(material.tipo_papel) === papelNormalizado,
  );
};

export const calibresPapelCompatibles = (
  producto: ProductoSistemaPapelExpo | null,
  papel: string,
): string[] => {
  const unicos = new Set<string>();
  materialesPapelCompatibles(producto, papel).forEach(material => {
    if (material.calibre?.trim()) unicos.add(material.calibre.trim());
  });
  return [...unicos];
};

export const grupoPapelPorCalibre = (
  producto: ProductoSistemaPapelExpo | null,
  papel: string,
  calibre: string,
): MaterialSistemaPapelExpo | null => {
  const calibreNormalizado = normalizarTextoExpo(calibre);
  return (
    materialesPapelCompatibles(producto, papel).find(
      material => normalizarTextoExpo(material.calibre) === calibreNormalizado,
    ) || null
  );
};

export const productosPlasticoCompatibles = (
  productos: ProductoSistemaPlasticoExpo[],
  tipo: string,
  material: string,
): ProductoSistemaPlasticoExpo[] => {
  const tipoNormalizado = normalizarTextoExpo(tipo);
  const materialNormalizado = normalizarTextoExpo(material);

  if (!tipoNormalizado || !materialNormalizado) return [];

  return productos.filter(
    producto =>
      normalizarTextoExpo(producto.tipo_producto) === tipoNormalizado &&
      normalizarTextoExpo(producto.material) === materialNormalizado,
  );
};