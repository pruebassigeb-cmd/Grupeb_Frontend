import { useState } from "react";
import ListaProveedores from "../components/ListaPorveedores";
import FormularioProveedor from "../components/FormularioProveedor";
import ProductosProveedor from "../components/ProductosProveedor";
import type { Proveedor } from "../services/proveedoresService";
import Dashboard from "../layouts/Sidebar";

type Vista = "lista" | "formulario" | "productos";

export default function ProveedoresPage() {
  const [vista, setVista] = useState<Vista>("lista");
  const [proveedorActual, setProveedor] = useState<Proveedor | null>(null);
  const [listaKey, setListaKey] = useState(0);

  const irALista = () => { setVista("lista"); setProveedor(null); };

  const handleGuardado = (p: Proveedor) => {
    setListaKey(k => k + 1);
      irALista();
  };

  return (
    <Dashboard>
      <div className="p-6 max-w-6xl mx-auto">
        {vista === "lista" && (
          <ListaProveedores
            key={listaKey}
            onNuevo={() => { setProveedor(null); setVista("formulario"); }}
            onEditar={p => { setProveedor(p); setVista("formulario"); }}
            onVerProductos={p => { setProveedor(p); setVista("productos"); }}
          />
        )}

        {vista === "formulario" && (
          <FormularioProveedor
            proveedor={proveedorActual}
            onGuardado={handleGuardado}
            onCancel={irALista}
          />
        )}

        {vista === "productos" && proveedorActual && (
          <ProductosProveedor
            proveedor={proveedorActual}
            onVolver={irALista}
          />
        )}
      </div>
    </Dashboard>
  );
}