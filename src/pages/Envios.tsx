import { useState, useEffect, useCallback } from "react";
import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import { getCarrito, getPaqueterias } from "../services/enviosService";
import type { CarritoPedido, Paqueteria } from "../types/envios.types";
import TabEnvios           from "../components/TabEnvios";
import TabBitacora         from "../components/TabBitacora";
import TabUnidades         from "../components/TabUnidades";
import TabPaqueterias      from "../components/TabPaqueterias";
import TabHistorialReportes from "../components/TabHistorialReportes";
import VistaCarrito              from "../components/VistaCarrito";
import FormularioProcesarCarrito from "../components/FormularioProcesarCarrito";
import FormularioNotaRemisionMulti from "../components/FormularioNotaRemisionMulti";

type Tab = "envios" | "bitacora" | "unidades" | "paqueterias" | "historial";

const TABS: { key: Tab; label: string }[] = [
  { key: "envios",      label: "Envíos"              },
  { key: "bitacora",    label: "Bitácora de Reparto" },
  { key: "unidades",    label: "Unidades"            },
  { key: "paqueterias", label: "Paqueterías"         },
  { key: "historial",   label: "Historial / Reportes" },
];

export default function Envios() {
  const [tabActual,          setTabActual]          = useState<Tab>("envios");
  const [carrito,            setCarrito]            = useState<CarritoPedido[]>([]);
  const [paqueterias,        setPaqueterias]        = useState<Paqueteria[]>([]);
  const [modalCarrito,       setModalCarrito]       = useState(false);
  const [modalProcesar,      setModalProcesar]      = useState(false);
  const [modalNotaRemision,  setModalNotaRemision]  = useState(false);

  const totalBultosCarrito = carrito.reduce((sum, p) => sum + p.bultos.length, 0);

  const recargarCarrito = useCallback(async () => {
    try {
      setCarrito(await getCarrito());
    } catch {
      /* silencioso */
    }
  }, []);

  const recargarPaqueterias = useCallback(async () => {
    try {
      setPaqueterias(await getPaqueterias());
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    recargarCarrito();
    recargarPaqueterias();
  }, [recargarCarrito, recargarPaqueterias]);

  return (
    <Dashboard>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Envíos</h1>

        {/* Badge carrito */}
        <button
          onClick={() => setModalCarrito(true)}
          className="relative flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Carrito de envío</span>
          {totalBultosCarrito > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {totalBultosCarrito}
            </span>
          )}
        </button>
      </div>

      <p className="text-slate-400 mb-6">Gestiona los envíos, bitácora, unidades y paqueterías.</p>

      {/* TABS */}
      <div className="flex border-b border-gray-200 mb-6 gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTabActual(t.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tabActual === t.key
                ? "bg-white border border-b-white border-gray-200 text-blue-600 -mb-px"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tabActual === "envios"      && <TabEnvios carrito={carrito} onCarritoChange={recargarCarrito} />}
      {tabActual === "bitacora"    && <TabBitacora />}
      {tabActual === "unidades"    && <TabUnidades />}
      {tabActual === "paqueterias" && <TabPaqueterias />}
      {tabActual === "historial"   && <TabHistorialReportes />}

      {/* MODAL CARRITO */}
      {modalCarrito && (
        <Modal isOpen={modalCarrito} onClose={() => setModalCarrito(false)} title="Carrito de Envío">
          <VistaCarrito
            carrito={carrito}
            paqueterias={paqueterias}
            onCarritoChange={recargarCarrito}

            onProcesar={() => {
              setModalCarrito(false);
              setModalProcesar(true);
            }}

            onNotaRemision={() => {
              setModalCarrito(false);
              setModalNotaRemision(true);
            }}

            onClose={() => setModalCarrito(false)}
          />
        </Modal>
      )}

      {/* MODAL PROCESAR */}
      {modalProcesar && (
        <Modal isOpen={modalProcesar} onClose={() => setModalProcesar(false)} title="Procesar Envío">
          <FormularioProcesarCarrito
            carrito={carrito}
            onSuccess={async () => {
              setModalProcesar(false);
              await recargarCarrito();
            }}
            onCancel={() => setModalProcesar(false)}
          />
        </Modal>
      )}

      {/* MODAL NOTA REMISIÓN MULTI */}
      {modalNotaRemision && (
        <Modal
          isOpen={modalNotaRemision}
          onClose={() => setModalNotaRemision(false)}
          title="Nota de Remisión conjunta">

          <FormularioNotaRemisionMulti
            carrito={carrito}
            onSuccess={async () => {
              setModalNotaRemision(false);
              await recargarCarrito();
            }}
            onCancel={() => setModalNotaRemision(false)}
          />
        </Modal>
      )}
    </Dashboard>
  );
}
