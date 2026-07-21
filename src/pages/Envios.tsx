import { useState, useEffect, useCallback, useRef } from "react";
import Dashboard from "../layouts/Sidebar";
import RequiereConexion from "../components/RequiereConexion";
import Modal from "../components/Modal";
import { getCarrito, getPaqueterias } from "../services/enviosService";
import type { CarritoPedido, Paqueteria } from "../types/envios.types";
import TabEnvios from "../components/envio/TabEnvios";
import TabBitacora from "../components/envio/TabBitacora";
import TabUnidades from "../components/envio/TabUnidades";
import TabPaqueterias from "../components/envio/TabPaqueterias";
import TabHistorialReportes from "../components/envio/TabHistorialReportes";
import VistaCarrito from "../components/envio/VistaCarrito";
import FormularioProcesarCarrito from "../components/envio/FormularioProcesarCarrito";
import FormularioNotaRemisionMulti from "../components/envio/FormularioNotaRemisionMulti";

type Tab = "envios" | "bitacora" | "unidades" | "paqueterias" | "historial";

const TABS: { key: Tab; label: string }[] = [
  { key: "envios", label: "Envíos" },
  { key: "bitacora", label: "Bitácora de Reparto" },
  { key: "unidades", label: "Unidades" },
  { key: "paqueterias", label: "Paqueterías" },
  { key: "historial", label: "Historial / Reportes" },
];

export default function Envios() {
  const [tabActual, setTabActual] = useState<Tab>("envios");
  const [carrito, setCarrito] = useState<CarritoPedido[]>([]);
  const [paqueterias, setPaqueterias] = useState<Paqueteria[]>([]);
  const [modalCarrito, setModalCarrito] = useState(false);
  const [modalProcesar, setModalProcesar] = useState(false);
  const [modalNotaRemision, setModalNotaRemision] = useState(false);
  const [animarCarrito, setAnimarCarrito] = useState(false);
  const [refreshEnviosKey, setRefreshEnviosKey] = useState(0);

  const totalBultosCarrito = carrito.reduce(
    (sum, p) => sum + p.bultos.length,
    0
  );

  const totalAnteriorRef = useRef(0);
  const primeraCargaRef = useRef(true);

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

  const refrescarModuloEnvios = useCallback(async () => {
    await recargarCarrito();
    setRefreshEnviosKey((prev) => prev + 1);
  }, [recargarCarrito]);

  useEffect(() => {
    recargarCarrito();
    recargarPaqueterias();
  }, [recargarCarrito, recargarPaqueterias]);

  useEffect(() => {
    if (primeraCargaRef.current) {
      primeraCargaRef.current = false;
      totalAnteriorRef.current = totalBultosCarrito;
      return;
    }

    if (totalBultosCarrito > totalAnteriorRef.current) {
      setAnimarCarrito(true);

      const timeout = setTimeout(() => {
        setAnimarCarrito(false);
      }, 700);

      totalAnteriorRef.current = totalBultosCarrito;
      return () => clearTimeout(timeout);
    }

    totalAnteriorRef.current = totalBultosCarrito;
  }, [totalBultosCarrito]);

  return (
    <Dashboard>
      <RequiereConexion>
      <div className="mb-2">
        <h1 className="text-2xl font-bold">Envíos</h1>
      </div>

      <p className="text-slate-400 mb-6">
        Gestiona los envíos, bitácora, unidades y paqueterías.
      </p>

      <button
        onClick={() => setModalCarrito(true)}
        className={`
          fixed top-6 right-6 z-50
          flex items-center gap-2
          px-5 py-3
          bg-blue-600 text-white
          rounded-full shadow-lg
          hover:bg-blue-700 active:scale-95
          transition-all duration-200
          ${animarCarrito ? "animate-bounce ring-4 ring-blue-200" : ""}
        `}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>

        <span className="hidden sm:inline text-sm font-semibold">
          Carrito de envío
        </span>

        {totalBultosCarrito > 0 && (
          <span
            className={`
              absolute -top-2 -right-2
              bg-red-500 text-white text-xs font-bold
              rounded-full min-w-[24px] h-6 px-1
              flex items-center justify-center
              border-2 border-white
              ${animarCarrito ? "scale-125" : "scale-100"}
              transition-transform duration-200
            `}
          >
            {totalBultosCarrito}
          </span>
        )}
      </button>

      <div className="flex border-b border-gray-200 mb-6 gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTabActual(t.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tabActual === t.key
                ? "bg-white border border-b-white border-gray-200 text-blue-600 -mb-px"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabActual === "envios" && (
        <TabEnvios
          carrito={carrito}
          onCarritoChange={recargarCarrito}
          refreshKey={refreshEnviosKey}
        />
      )}

      {tabActual === "bitacora" && <TabBitacora />}
      {tabActual === "unidades" && <TabUnidades />}
      {tabActual === "paqueterias" && <TabPaqueterias />}
      {tabActual === "historial" && <TabHistorialReportes />}

      {modalCarrito && (
        <Modal
          isOpen={modalCarrito}
          onClose={() => setModalCarrito(false)}
          title="Carrito de Envío"
        >
          <VistaCarrito
            carrito={carrito}
            paqueterias={paqueterias}
            onCarritoChange={refrescarModuloEnvios}
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

      {modalProcesar && (
        <Modal
          isOpen={modalProcesar}
          onClose={() => setModalProcesar(false)}
          title="Procesar Envío"
        >
          <FormularioProcesarCarrito
            carrito={carrito}
            onSuccess={async () => {
              setModalProcesar(false);
              await refrescarModuloEnvios();
            }}
            onCancel={() => setModalProcesar(false)}
          />
        </Modal>
      )}

      {modalNotaRemision && (
        <Modal
          isOpen={modalNotaRemision}
          onClose={() => setModalNotaRemision(false)}
          title="Nota de Remisión conjunta"
        >
          <FormularioNotaRemisionMulti
            carrito={carrito}
            onSuccess={async () => {
              setModalNotaRemision(false);
              await refrescarModuloEnvios();
            }}
            onCancel={() => setModalNotaRemision(false)}
          />
        </Modal>
      )}
    </RequiereConexion>
    </Dashboard>
  );
}