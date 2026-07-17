// src/pages/papel/PreciosAcabadosPapel.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import Dashboard from "../../layouts/Sidebar";
import type {
  AcabadoCostoCatalogo,
  EscalaCostoCatalogo,
  MatrizPreciosAcabadoResponse,
} from "../../types/papel/precios-acabados.types";
import {
  createEscalaCosto,
  getCatalogosPreciosAcabados,
  getCostoMetroLaminado,
  getMatrizPreciosAcabado,
  toggleAcabadoCosto,
  toggleEscalaCosto,
  updateCostoMetroLaminado,
  updateEscalaCosto,
  updateMatrizPreciosAcabado,
} from "../../services/papel/preciosAcabadosPapel.service";
import {
  formatearCantidad,
  formatearPrecioInput,
  normalizarPrecioInput,
} from "../../utils/papel/preciosAcabadosPapel.utils";

type EstadoPrecios = Record<string, string>;

export default function PreciosAcabadosPapel() {
  const [acabados, setAcabados] = useState<AcabadoCostoCatalogo[]>([]);
  const [idAcabado, setIdAcabado] = useState<number | null>(null);
  const [matriz, setMatriz] = useState<MatrizPreciosAcabadoResponse | null>(
    null,
  );
  const [precios, setPrecios] = useState<EstadoPrecios>({});
  const [loading, setLoading] = useState(true);
  const [loadingMatriz, setLoadingMatriz] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [costoMetro, setCostoMetro] = useState("");
  const [guardandoCostoMetro, setGuardandoCostoMetro] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const acabadoSeleccionado = useMemo(
    () => acabados.find((item) => item.id === idAcabado) ?? null,
    [acabados, idAcabado],
  );

  const resumen = useMemo(() => {
    const escalasActivas =
      matriz?.escalas.filter((escala) => escala.activo).length ?? 0;
    const tamanosActivos =
      matriz?.filas.filter((fila) => fila.activo).length ?? 0;
    const celdasConfiguradas = Object.values(precios).filter(
      (precio) => precio.trim() !== "",
    ).length;

    return {
      escalasActivas,
      tamanosActivos,
      celdasConfiguradas,
    };
  }, [matriz, precios]);

  const cargarCatalogos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [data, costoMetroData] = await Promise.all([
        getCatalogosPreciosAcabados(),
        getCostoMetroLaminado(),
      ]);

      setAcabados(data.acabados);
      setCostoMetro(Number(costoMetroData.costo).toFixed(2));

      setIdAcabado((actual) => {
        if (actual && data.acabados.some((item) => item.id === actual)) {
          return actual;
        }

        return (
          data.acabados.find((item) => item.activo)?.id ??
          data.acabados[0]?.id ??
          null
        );
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "No se pudieron cargar los catálogos",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarMatriz = useCallback(async (acabadoId: number) => {
    setLoadingMatriz(true);
    setError("");
    setMensaje("");

    try {
      const data = await getMatrizPreciosAcabado(acabadoId);
      setMatriz(data);

      const siguiente: EstadoPrecios = {};

      for (const fila of data.filas) {
        for (const escala of data.escalas) {
          const celda = fila.precios[String(escala.id)];
          siguiente[`${fila.idTamano}:${escala.id}`] = formatearPrecioInput(
            celda?.precio ?? null,
          );
        }
      }

      setPrecios(siguiente);
    } catch (err: any) {
      setError(err?.response?.data?.error || "No se pudo cargar la matriz");
    } finally {
      setLoadingMatriz(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  useEffect(() => {
    if (idAcabado) cargarMatriz(idAcabado);
  }, [idAcabado, cargarMatriz]);

  const guardar = async () => {
    if (!matriz || !idAcabado) return;

    setGuardando(true);
    setMensaje("");
    setError("");

    try {
      const celdas = matriz.filas.flatMap((fila) =>
        matriz.escalas.map((escala) => ({
          idTamano: fila.idTamano,
          idEscala: escala.id,
          precio: normalizarPrecioInput(
            precios[`${fila.idTamano}:${escala.id}`] ?? "",
          ),
        })),
      );

      const resultado = await updateMatrizPreciosAcabado(idAcabado, {
        celdas,
      });

      setMensaje(
        `${resultado.message}. Celdas procesadas: ${resultado.actualizadas}.`,
      );
      await cargarMatriz(idAcabado);
    } catch (err: any) {
      setError(err?.response?.data?.error || "No se pudo guardar la matriz");
    } finally {
      setGuardando(false);
    }
  };

  const pedirCantidad = (titulo: string, inicial = ""): number | null => {
    const valor = window.prompt(titulo, inicial);
    if (valor === null) return null;

    const cantidad = Number(valor.replace(/,/g, "").trim());

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      window.alert("La cantidad debe ser un entero mayor que cero.");
      return null;
    }

    return cantidad;
  };

  const agregarEscala = async () => {
    const cantidad = pedirCantidad("Nueva cantidad de piezas:");
    if (!cantidad) return;

    try {
      await createEscalaCosto(cantidad);
      await cargarCatalogos();
      if (idAcabado) await cargarMatriz(idAcabado);
    } catch (err: any) {
      window.alert(err?.response?.data?.error || "No se pudo crear la escala");
    }
  };

  const editarEscala = async (escala: EscalaCostoCatalogo) => {
    const cantidad = pedirCantidad("Nueva cantidad:", String(escala.cantidad));
    if (!cantidad) return;

    try {
      await updateEscalaCosto(escala.id, cantidad);
      await cargarCatalogos();
      if (idAcabado) await cargarMatriz(idAcabado);
    } catch (err: any) {
      window.alert(
        err?.response?.data?.error || "No se pudo actualizar la escala",
      );
    }
  };

  const cambiarEstadoEscala = async (escala: EscalaCostoCatalogo) => {
    try {
      await toggleEscalaCosto(escala.id, !escala.activo);
      await cargarCatalogos();
      if (idAcabado) await cargarMatriz(idAcabado);
    } catch (err: any) {
      window.alert(
        err?.response?.data?.error || "No se pudo cambiar el estado",
      );
    }
  };

  const guardarCostoMetro = async () => {
    const costo = Number(costoMetro);

    if (!Number.isFinite(costo) || costo < 0 || costo > 99.99) {
      setError("El costo por m² debe estar entre 0.00 y 99.99");
      return;
    }

    setGuardandoCostoMetro(true);
    setMensaje("");
    setError("");

    try {
      const resultado = await updateCostoMetroLaminado(costo);
      setCostoMetro(Number(resultado.costoMetro.costo).toFixed(2));
      setMensaje(resultado.message);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "No se pudo guardar el costo por m²",
      );
    } finally {
      setGuardandoCostoMetro(false);
    }
  };

  const cambiarEstadoAcabado = async () => {
    if (!acabadoSeleccionado) return;

    try {
      const { acabado } = await toggleAcabadoCosto(
        acabadoSeleccionado.id,
        !acabadoSeleccionado.activo,
      );

      setAcabados((prev) =>
        prev.map((item) => (item.id === acabado.id ? acabado : item)),
      );

      setMatriz((prev) => (prev ? { ...prev, acabado } : prev));
    } catch (err: any) {
      window.alert(
        err?.response?.data?.error || "No se pudo cambiar el estado",
      );
    }
  };

  const handlePrecioChange = (key: string, valor: string) => {
    let limpio = valor.replace(/[^0-9.]/g, "");
    const partes = limpio.split(".");

    if (partes.length > 2) {
      limpio = `${partes[0]}.${partes.slice(1).join("")}`;
    }

    setPrecios((prev) => ({
      ...prev,
      [key]: limpio,
    }));
  };

  return (
    <Dashboard>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* Encabezado */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-6 shadow-lg sm:px-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-400/10 text-amber-300 shadow-inner">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.7}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                    Catálogo de precios
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                    Papel
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Precios de acabados
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Configura el incremento unitario por pieza para cada acabado,
                  tamaño y escala de producción.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={agregarEscala}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Agregar escala
              </button>

              <button
                type="button"
                onClick={guardar}
                disabled={guardando || loadingMatriz || !matriz}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Resumen */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResumenCard
            titulo="Acabado seleccionado"
            valor={acabadoSeleccionado?.nombre || "Sin seleccionar"}
            detalle={
              acabadoSeleccionado
                ? acabadoSeleccionado.activo
                  ? "Disponible para cotizar"
                  : "Actualmente inactivo"
                : "Selecciona un acabado"
            }
            icono="acabado"
            destacado
          />
          <ResumenCard
            titulo="Escalas activas"
            valor={String(resumen.escalasActivas)}
            detalle={`${matriz?.escalas.length ?? 0} escalas totales`}
            icono="escala"
          />
          <ResumenCard
            titulo="Tamaños activos"
            valor={String(resumen.tamanosActivos)}
            detalle={`${matriz?.filas.length ?? 0} tamaños totales`}
            icono="tamano"
          />
          <ResumenCard
            titulo="Precios configurados"
            valor={String(resumen.celdasConfiguradas)}
            detalle="Celdas con un valor definido"
            icono="precio"
          />
        </section>

        {/* Configuración principal */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4v2m0-6V4m12 14a2 2 0 100-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Configuración general
                </h2>
                <p className="text-xs text-slate-500">
                  Elige el acabado y administra sus parámetros generales.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(240px,1.2fr)_minmax(170px,.7fr)_minmax(280px,1fr)]">
            <div>
              <label
                htmlFor="acabado-precio"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                Acabado
              </label>
              <select
                id="acabado-precio"
                value={idAcabado ?? ""}
                onChange={(event) => setIdAcabado(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {acabados.map((acabado) => (
                  <option key={acabado.id} value={acabado.id}>
                    {acabado.nombre}
                    {acabado.activo ? "" : " (inactivo)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Estado
              </span>
              {acabadoSeleccionado ? (
                <button
                  type="button"
                  onClick={cambiarEstadoAcabado}
                  className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition focus:outline-none focus:ring-4 ${
                    acabadoSeleccionado.activo
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-100"
                      : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 focus:ring-slate-100"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      acabadoSeleccionado.activo
                        ? "bg-emerald-500"
                        : "bg-slate-400"
                    }`}
                  />
                  {acabadoSeleccionado.activo ? "Activo" : "Inactivo"}
                  <span className="text-xs font-medium opacity-70">
                    · Clic para cambiar
                  </span>
                </button>
              ) : (
                <div className="flex h-11 items-center rounded-xl border border-dashed border-slate-300 px-3 text-sm text-slate-400">
                  Sin acabado
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="costo-metro-laminado"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                Costo por m² de laminado
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    $
                  </span>
                  <input
                    id="costo-metro-laminado"
                    type="text"
                    inputMode="decimal"
                    value={costoMetro}
                    onChange={(event) => {
                      let value = event.target.value.replace(/[^0-9.]/g, "");
                      const partes = value.split(".");

                      if (partes.length > 2) {
                        value = `${partes[0]}.${partes.slice(1).join("")}`;
                      }

                      if (partes[1]?.length > 2) {
                        value = `${partes[0]}.${partes[1].slice(0, 2)}`;
                      }

                      setCostoMetro(value);
                    }}
                    onBlur={() => {
                      const value = Number(costoMetro);
                      if (Number.isFinite(value)) {
                        setCostoMetro(value.toFixed(2));
                      }
                    }}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={guardarCostoMetro}
                  disabled={guardandoCostoMetro}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoCostoMetro ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Mensajes */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <div>
              <p className="font-bold">No se pudo completar la acción</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {mensaje && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-bold">Cambios guardados</p>
              <p className="mt-0.5">{mensaje}</p>
            </div>
          </div>
        )}

        {/* Matriz */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Matriz de incrementos unitarios
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Cada valor se suma al precio base por pieza. Una celda vacía
                significa “no configurado” y un valor de 0 significa “sin
                cargo”.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Activo
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                Inactivo
              </span>
              <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-700">
                Importes por pieza
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center px-6 py-16">
              <EstadoCarga texto="Cargando precios de acabados..." />
            </div>
          ) : loadingMatriz || !matriz ? (
            <div className="flex min-h-[320px] items-center justify-center px-6 py-16">
              <EstadoCarga texto="Cargando matriz de precios..." />
            </div>
          ) : matriz.filas.length === 0 || matriz.escalas.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.7}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 font-bold text-slate-700">
                La matriz todavía no tiene información
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Agrega una escala o revisa que existan tamaños de producto
                activos para comenzar a configurar precios.
              </p>
            </div>
          ) : (
            <div className="max-h-[68vh] overflow-auto">
              <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 min-w-[180px] border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600 shadow-[2px_0_0_0_rgba(226,232,240,1)]">
                      Tamaño
                    </th>

                    {matriz.escalas.map((escala) => (
                      <th
                        key={escala.id}
                        className={`sticky top-0 z-20 min-w-[128px] border-b border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-center transition ${
                          escala.activo ? "opacity-100" : "opacity-45"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              escala.activo ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          <span className="font-extrabold text-slate-700">
                            {formatearCantidad(escala.cantidad)}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-center gap-1.5">
                          <button
                            type="button"
                            title="Editar escala"
                            aria-label={`Editar escala ${formatearCantidad(
                              escala.cantidad,
                            )}`}
                            onClick={() => editarEscala(escala)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 13H9v-2.828l6.586-6.586z"
                              />
                            </svg>
                          </button>

                          <button
                            type="button"
                            title={escala.activo ? "Desactivar" : "Activar"}
                            aria-label={
                              escala.activo
                                ? "Desactivar escala"
                                : "Activar escala"
                            }
                            onClick={() => cambiarEstadoEscala(escala)}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg border bg-white shadow-sm transition ${
                              escala.activo
                                ? "border-red-200 text-red-500 hover:bg-red-50"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {escala.activo ? (
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 12H4"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {matriz.filas.map((fila, filaIndex) => (
                    <tr key={fila.idTamano}>
                      <th
                        className={`sticky left-0 z-10 min-w-[180px] border-b border-r border-slate-200 px-4 py-3 text-left shadow-[2px_0_0_0_rgba(226,232,240,1)] ${
                          filaIndex % 2 === 0 ? "bg-white" : "bg-slate-50"
                        } ${fila.activo ? "opacity-100" : "opacity-45"}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              fila.activo ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          <div>
                            <div className="font-bold text-slate-700">
                              {fila.tamano}
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-slate-400">
                              {fila.activo
                                ? "Tamaño activo"
                                : "Tamaño inactivo"}
                            </div>
                          </div>
                        </div>
                      </th>

                      {matriz.escalas.map((escala) => {
                        const key = `${fila.idTamano}:${escala.id}`;
                        const habilitada = escala.activo && fila.activo;

                        return (
                          <td
                            key={escala.id}
                            className={`border-b border-r border-slate-200 p-2.5 ${
                              filaIndex % 2 === 0
                                ? "bg-white"
                                : "bg-slate-50/60"
                            } ${habilitada ? "opacity-100" : "opacity-45"}`}
                          >
                            <div className="relative mx-auto w-[104px]">
                              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                $
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={precios[key] ?? ""}
                                disabled={!habilitada}
                                onChange={(event) =>
                                  handlePrecioChange(key, event.target.value)
                                }
                                placeholder="—"
                                aria-label={`Precio de ${fila.tamano} para ${formatearCantidad(
                                  escala.cantidad,
                                )} piezas`}
                                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-6 pr-2 text-right text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              Los cambios de la matriz se aplican hasta presionar
              <strong className="ml-1 text-slate-700">Guardar cambios</strong>.
            </span>
            <span className="font-medium text-slate-600">
              Vacío = no configurado · 0 = sin cargo
            </span>
          </div>
        </section>
      </div>
    </Dashboard>
  );
}

interface ResumenCardProps {
  titulo: string;
  valor: string;
  detalle: string;
  icono: "acabado" | "escala" | "tamano" | "precio";
  destacado?: boolean;
}

function ResumenCard({
  titulo,
  valor,
  detalle,
  icono,
  destacado = false,
}: ResumenCardProps) {
  const iconos = {
    acabado: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M19.428 15.428a4 4 0 00-5.656-5.656l-1.414 1.414-1.414-1.414a4 4 0 00-5.656 5.656l1.414 1.414a2 2 0 002.828 0l1.414-1.414 1.414 1.414a2 2 0 002.828 0l2.242-2.242zM12 4v4m-2-2h4"
      />
    ),
    escala: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 6h18M7 12h10M10 18h4"
      />
    ),
    tamano: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 7V4h3m10 0h3v3m0 10v3h-3M7 20H4v-3M8 8h8v8H8z"
      />
    ),
    precio: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v2m9-6a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  };

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        destacado
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {titulo}
          </p>
          <p
            className={`mt-2 truncate text-xl font-extrabold ${
              destacado ? "text-amber-700" : "text-slate-800"
            }`}
            title={valor}
          >
            {valor}
          </p>
          <p className="mt-1 text-xs text-slate-500">{detalle}</p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            destacado
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {iconos[icono]}
          </svg>
        </div>
      </div>
    </article>
  );
}

function EstadoCarga({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
      <div>
        <p className="text-sm font-bold text-slate-700">{texto}</p>
        <p className="mt-1 text-xs text-slate-400">Espera un momento</p>
      </div>
    </div>
  );
}