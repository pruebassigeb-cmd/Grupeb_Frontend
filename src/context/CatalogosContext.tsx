import { createContext, useContext, useState } from "react";
import type {ReactNode} from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface CatItem {
  id: number;
  nombre: string;
  medida?: string;
}

export type CatKey =
  | "tipoProducto"
  | "tipoPapel"
  | "calibre"
  | "tipoPegado"
  | "pegamento"
  | "tipoAsa"
  | "laminado"
  | "refuerzoMedidas"
  | "refuerzoMaterial"
  | "empaque"
  | "sacabocados"
  | "perforado"
  | "hojeadoGuillotina"
  | "impresora"
  | "hsAR"
  | "suajeMaquina"
  | "uv"
  | "textura"
  | "empalme"
  | "armado"
  | "asasMaquina"
  | "desbarbe";

export interface Catalogs {
  tipoProducto:      CatItem[];
  tipoPapel:         CatItem[];
  calibre:           CatItem[];
  tipoPegado:        CatItem[];
  pegamento:         CatItem[];
  tipoAsa:           CatItem[];
  laminado:          CatItem[];
  refuerzoMedidas:   CatItem[];
  refuerzoMaterial:  CatItem[];
  empaque:           CatItem[];
  sacabocados:       CatItem[];
  perforado:         CatItem[];
  hojeadoGuillotina: CatItem[];
  impresora:         CatItem[];
  hsAR:              CatItem[];
  suajeMaquina:      CatItem[];
  uv:                CatItem[];
  textura:           CatItem[];
  empalme:           CatItem[];
  armado:            CatItem[];
  asasMaquina:       CatItem[];
  desbarbe:          CatItem[];
}

// ═══════════════════════════════════════════════════════════════════════════
// DATOS INICIALES
// ═══════════════════════════════════════════════════════════════════════════
const seed = (names: string[]): CatItem[] =>
  names.map((nombre, i) => ({ id: i + 1, nombre }));

const seedMedida = (items: [string, string][]): CatItem[] =>
  items.map(([nombre, medida], i) => ({ id: i + 1, nombre, medida }));

export const initialData: Catalogs = {
  calibre: seed([
    "10pts","12pts","14pts","16pts","18pts","20pts","22pts","24pts",
    "150gms","200gms","250gms","300gms",
  ]),
  tipoProducto: seed([
    "Etiquetas","Bolsas","Cajas","Sobres",
    "Carpetas","Folders","Formas continuas","Papelería",
  ]),
  tipoPapel: seed([
    "Multicapa","Bond","Couché","Kraft","Cartulina",
    "Duplex","Triplex","Opalina","Periódico","Manila",
  ]),
  tipoPegado: seed([
    "Fuelle","Esquina","AA","Lineal",
    "Fondo automático","4 Esquinas","6 Esquinas","Manual","Empalmadora",
  ]),
  pegamento: seed([
    "Blanco 393","Blanco 262","Blanco 200",
    "Hot Melt","Cinta DC","Dextrina","PVA",
  ]),
  tipoAsa: seed([
    "Cordel","Listón satinado","Listón popotillo",
    "Entorchado","Cordel AA","Especial",
  ]),
  laminado: seed([
    "Mate","Brillante","Soft touch","Holográfico","Anti-scratch",
  ]),
  refuerzoMedidas: seed([
    "5x5 cm","8x8 cm","10x10 cm","12x12 cm","15x15 cm",
  ]),
  refuerzoMaterial: seed([
    "10pts","12pts","14pts","16pts","18pts","20pts",
    "150gms","200gms","250gms","300gms",
  ]),
  empaque: seed([
    "Caja 15x15x15","Caja EB 61x40x60","Tarima","Paquetes","Otro",
  ]),
  sacabocados: seedMedida([
    ["Sacabocado","3 mm"],
    ["Sacabocado","4 mm"],
    ["Sacabocado","5 mm"],
  ]),
  perforado: seedMedida([
    ["Perforado","6.35x6.35 mm"],
    ["Perforado","10x10 mm"],
  ]),
  hojeadoGuillotina: seed([
    "Hojeadora 1400","Guillotina Seybold","Guillotina KBA",
  ]),
  impresora: seed([
    "Heidelberg MO","Heidelberg SM","KBA",
  ]),
  hsAR: seed([
    "Cilíndrica 45x67.5","Cilíndrica 70x90","Cilíndrica 58x62",
    "Thomson 90x125","Thomson 100x140","CH 125x150",
    "Blueline","HS 97x130",
  ]),
  suajeMaquina: seed([
    "Cilíndrica 45x67.5","Cilíndrica 70x90","Cilíndrica 58x62",
    "Thomson 90x125","Thomson 100x140","CH 125x150",
    "Blueline","HS 97x130",
  ]),
  uv: seed(["UV 145x150"]),
  textura: seed(["Piel cocodrilo","Lino","Cuadros","Rombos"]),
  empalme: seed(["EBP 1450","Caja rígida"]),
  armado: seed(["AA","Pegadora 1300","Manual","Maquila"]),
  asasMaquina: seed([
    "Entorchadora 1","Entorchadora 2","Entorchadora 3",
    "Cordel ch","Cordel Rius",
  ]),
  desbarbe: seed(["Automático","Manual"]),
};

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════
interface CatalogosContextValue {
  data: Catalogs;
  // Reemplaza toda una categoría (usado en Catalogos.tsx)
  updateCat: (key: CatKey, items: CatItem[]) => void;
  // Agrega un item a una categoría (usado desde Papel.tsx al vuelo)
  addItem: (key: CatKey, nombre: string) => CatItem;
  // Nombres de una categoría (helper)
  names: (key: CatKey) => string[];
}

const CatalogosContext = createContext<CatalogosContextValue | null>(null);

export function CatalogosProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Catalogs>(initialData);

  const updateCat = (key: CatKey, items: CatItem[]) =>
    setData((prev) => ({ ...prev, [key]: items }));

  const addItem = (key: CatKey, nombre: string): CatItem => {
    const trimmed = nombre.trim();
    const newItem: CatItem = {
      id: Math.max(0, ...data[key].map((i) => i.id)) + 1,
      nombre: trimmed,
    };
    setData((prev) => ({ ...prev, [key]: [...prev[key], newItem] }));
    return newItem;
  };

  const names = (key: CatKey) => data[key].map((i) => i.nombre);

  return (
    <CatalogosContext.Provider value={{ data, updateCat, addItem, names }}>
      {children}
    </CatalogosContext.Provider>
  );
}

export function useCatalogos() {
  const ctx = useContext(CatalogosContext);
  if (!ctx) throw new Error("useCatalogos debe usarse dentro de <CatalogosProvider>");
  return ctx;
}