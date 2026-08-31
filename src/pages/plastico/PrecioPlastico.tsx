import { Fragment, useState, useEffect, useRef } from "react";
import Dashboard from "../../layouts/Sidebar";
import { getTarifas, updateTarifasBatch } from "../../services/plastico/tarifas.service";
import type { Tarifa } from "../../types/plastico/tarifas.types";
import {
  getEscalasAsaFlexible,
  updateEscalasAsaFlexibleBatch,
  getEscalasCintaSeguridad,
  updateEscalasCintaSeguridadBatch,
} from "../../services/plastico/escalasIncrementoPlastico.service";
import type {
  EscalaAsaFlexible,
  CintaSeguridadConEscalas,
  RangoIncrementoInput,
  RangoIncrementoCintaInput,
} from "../../types/plastico/escalas-incremento.types";
import { showAlert } from '../../components/CustomAlert';
import BotonAuditoria from "../../components/auditoria/BotonAuditoria";
import { leerBorrador, useAutoguardarBorrador, limpiarBorrador } from "../../hooks/useBorradorFormulario";


interface PrecioRow {
  kilos: number;
  idkilogramos: number;
  tarifas: {
    [key: number]: {
      id: number;
      precio: number;
      merma: number;
    };
  };
}

// Buffer local de edición para las escalas de asa flexible / cinta de
// seguridad — todo es texto mientras se edita (igual que TextoMap de la
// tabla de costos), se convierte a número solo al armar el payload final.
interface FilaEscalaEdit {
  id: number | null; // null = fila nueva, todavía no existe en BD
  rango_min: string;
  rango_max: string; // "" = "en adelante"
  incremento_por_pieza: string;
  eliminar: boolean; // true = se va a borrar al guardar (solo aplica si id != null)
}

interface FilaEscalaCintaEdit extends FilaEscalaEdit {
  cinta_seguridad_id: number;
}

// Texto intermedio por celda: clave = `${kilos}-${tintas}-precio` | `${kilos}-${tintas}-merma`
type TextoMap = Record<string, string>;

export default function PrecioPlastico() {
  const [editando, setEditando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [precios, setPrecios] = useState<PrecioRow[]>([]);
  const [preciosBackup, setPreciosBackup] = useState<PrecioRow[]>([]);

  // ── Escalas de incremento (asa flexible / cinta de seguridad) ───────────
  // Mismo patrón que la tabla de costos: "Modificar" → editar en un buffer
  // local → "Guardar cambios" → modal de confirmación → batch al backend.
  // Los rangos son dinámicos: se pueden agregar/quitar filas mientras se
  // edita, no son una cantidad fija.
  const [asaFlexible, setAsaFlexible] = useState<EscalaAsaFlexible[]>([]);
  const [cargandoAsa, setCargandoAsa] = useState(true);
  const [editandoAsa, setEditandoAsa] = useState(false);
  const [filasAsaEdit, setFilasAsaEdit] = useState<FilaEscalaEdit[]>([]);
  const [mostrarConfirmacionAsa, setMostrarConfirmacionAsa] = useState(false);
  const [guardandoAsa, setGuardandoAsa] = useState(false);

  const [cintaSeguridad, setCintaSeguridad] = useState<CintaSeguridadConEscalas[]>([]);
  const [cargandoCinta, setCargandoCinta] = useState(true);
  const [editandoCinta, setEditandoCinta] = useState(false);
  const [filasCintaEdit, setFilasCintaEdit] = useState<FilaEscalaCintaEdit[]>([]);
  const [mostrarConfirmacionCinta, setMostrarConfirmacionCinta] = useState(false);
  const [guardandoCinta, setGuardandoCinta] = useState(false);

  const [textos, setTextos] = useState<TextoMap>({});
  const [textosBackup, setTextosBackup] = useState<TextoMap>({});

  const CLAVE_BORRADOR = "precios-plastico";
  const borradorAplicado = useRef(false);
  useAutoguardarBorrador(CLAVE_BORRADOR, { precios, textos }, editando);

  useEffect(() => {
    cargarTarifas();
    cargarAsaFlexible();
    cargarCintaSeguridad();
  }, []);

  // ── Asa flexible ─────────────────────────────────────────────────────────
  const cargarAsaFlexible = async () => {
    try {
      setCargandoAsa(true);
      const escalas = await getEscalasAsaFlexible();
      setAsaFlexible(escalas);
    } catch (error) {
      console.error("Error al cargar escalas de asa flexible:", error);
      showAlert("Error al cargar escalas de asa flexible");
    } finally {
      setCargandoAsa(false);
    }
  };

  const iniciarEdicionAsa = () => {
    setFilasAsaEdit(
      asaFlexible.map((e) => ({
        id: e.id,
        rango_min: String(e.rango_min),
        rango_max: e.rango_max === null ? "" : String(e.rango_max),
        incremento_por_pieza: e.incremento_por_pieza === 0 ? "" : String(e.incremento_por_pieza),
        eliminar: false,
      }))
    );
    setEditandoAsa(true);
  };

  const cancelarEdicionAsa = () => {
    setEditandoAsa(false);
    setFilasAsaEdit([]);
  };

  const agregarFilaAsa = () => {
    setFilasAsaEdit((prev) => [
      ...prev,
      { id: null, rango_min: "", rango_max: "", incremento_por_pieza: "", eliminar: false },
    ]);
  };

  const quitarFilaAsa = (index: number) => {
    setFilasAsaEdit((prev) => {
      const fila = prev[index];
      // Fila nueva (sin id) todavía no existe en BD — se quita de plano.
      // Fila existente — se marca para eliminar y se manda así en el batch.
      if (fila.id === null) return prev.filter((_, i) => i !== index);
      return prev.map((f, i) => (i === index ? { ...f, eliminar: true } : f));
    });
  };

  const actualizarFilaAsa = (index: number, campo: keyof FilaEscalaEdit, valor: string) => {
    setFilasAsaEdit((prev) => prev.map((f, i) => (i === index ? { ...f, [campo]: valor } : f)));
  };

  const validarFilasParaGuardar = (filas: { rango_min: string; rango_max: string; incremento_por_pieza: string; eliminar: boolean }[]): string | null => {
    const activas = filas.filter((f) => !f.eliminar);
    if (activas.length === 0) return "Debe quedar al menos un rango activo.";
    for (const f of activas) {
      if (f.rango_min.trim() === "" || !Number.isInteger(Number(f.rango_min)) || Number(f.rango_min) < 0) {
        return "Todos los rangos deben tener un mínimo de piezas válido.";
      }
      if (f.rango_max.trim() !== "" && Number(f.rango_max) <= Number(f.rango_min)) {
        return "El máximo de un rango debe ser mayor a su mínimo (déjalo vacío para \"en adelante\").";
      }
      if (f.incremento_por_pieza.trim() !== "" && (!Number.isFinite(Number(f.incremento_por_pieza)) || Number(f.incremento_por_pieza) < 0)) {
        return "El incremento por pieza no puede ser negativo.";
      }
    }
    return null;
  };

  const solicitarConfirmacionAsa = () => {
    const error = validarFilasParaGuardar(filasAsaEdit);
    if (error) {
      showAlert(error);
      return;
    }
    setMostrarConfirmacionAsa(true);
  };

  const confirmarGuardarAsa = async () => {
    try {
      setGuardandoAsa(true);
      const payload: RangoIncrementoInput[] = filasAsaEdit.map((f) => ({
        id: f.id,
        rango_min: Number(f.rango_min),
        rango_max: f.rango_max.trim() === "" ? null : Number(f.rango_max),
        incremento_por_pieza: f.incremento_por_pieza.trim() === "" ? 0 : Number(f.incremento_por_pieza),
        eliminar: f.eliminar,
      }));
      const actualizado = await updateEscalasAsaFlexibleBatch(payload);
      setAsaFlexible(actualizado);
      setEditandoAsa(false);
      setMostrarConfirmacionAsa(false);
      showAlert("Escalas de asa flexible actualizadas");
    } catch (error: any) {
      console.error("Error al guardar escalas de asa flexible:", error);
      showAlert(error.response?.data?.error || "Error al guardar las escalas");
    } finally {
      setGuardandoAsa(false);
    }
  };

  // ── Cinta de seguridad ───────────────────────────────────────────────────
  const cargarCintaSeguridad = async () => {
    try {
      setCargandoCinta(true);
      const datos = await getEscalasCintaSeguridad();
      setCintaSeguridad(datos);
    } catch (error) {
      console.error("Error al cargar escalas de cinta de seguridad:", error);
      showAlert("Error al cargar escalas de cinta de seguridad");
    } finally {
      setCargandoCinta(false);
    }
  };

  const iniciarEdicionCinta = () => {
    const filas: FilaEscalaCintaEdit[] = [];
    cintaSeguridad.forEach((cinta) => {
      cinta.escalas.forEach((e) => {
        filas.push({
          id: e.id,
          cinta_seguridad_id: cinta.cinta_seguridad_id,
          rango_min: String(e.rango_min),
          rango_max: e.rango_max === null ? "" : String(e.rango_max),
          incremento_por_pieza: e.incremento_por_pieza === 0 ? "" : String(e.incremento_por_pieza),
          eliminar: false,
        });
      });
    });
    setFilasCintaEdit(filas);
    setEditandoCinta(true);
  };

  const cancelarEdicionCinta = () => {
    setEditandoCinta(false);
    setFilasCintaEdit([]);
  };

  const agregarFilaCinta = (cintaSeguridadId: number) => {
    setFilasCintaEdit((prev) => [
      ...prev,
      {
        id: null,
        cinta_seguridad_id: cintaSeguridadId,
        rango_min: "",
        rango_max: "",
        incremento_por_pieza: "",
        eliminar: false,
      },
    ]);
  };

  const quitarFilaCinta = (index: number) => {
    setFilasCintaEdit((prev) => {
      const fila = prev[index];
      if (fila.id === null) return prev.filter((_, i) => i !== index);
      return prev.map((f, i) => (i === index ? { ...f, eliminar: true } : f));
    });
  };

  const actualizarFilaCinta = (index: number, campo: keyof FilaEscalaCintaEdit, valor: string) => {
    setFilasCintaEdit((prev) => prev.map((f, i) => (i === index ? { ...f, [campo]: valor } : f)));
  };

  const solicitarConfirmacionCinta = () => {
    // Se valida por cinta — cada una es un grupo de rangos independiente.
    const porCinta = new Map<number, typeof filasCintaEdit>();
    filasCintaEdit.forEach((f) => {
      const lista = porCinta.get(f.cinta_seguridad_id) ?? [];
      lista.push(f);
      porCinta.set(f.cinta_seguridad_id, lista);
    });
    for (const filas of porCinta.values()) {
      const activas = filas.filter((f) => !f.eliminar);
      if (activas.length === 0) continue; // una cinta puede quedar sin rangos, es válido
      for (const f of activas) {
        if (f.rango_min.trim() === "" || !Number.isInteger(Number(f.rango_min)) || Number(f.rango_min) < 0) {
          showAlert("Todos los rangos deben tener un mínimo de piezas válido.");
          return;
        }
        if (f.rango_max.trim() !== "" && Number(f.rango_max) <= Number(f.rango_min)) {
          showAlert("El máximo de un rango debe ser mayor a su mínimo (déjalo vacío para \"en adelante\").");
          return;
        }
        if (f.incremento_por_pieza.trim() !== "" && (!Number.isFinite(Number(f.incremento_por_pieza)) || Number(f.incremento_por_pieza) < 0)) {
          showAlert("El incremento por pieza no puede ser negativo.");
          return;
        }
      }
    }
    setMostrarConfirmacionCinta(true);
  };

  const confirmarGuardarCinta = async () => {
    try {
      setGuardandoCinta(true);
      const payload: RangoIncrementoCintaInput[] = filasCintaEdit.map((f) => ({
        id: f.id,
        cinta_seguridad_id: f.cinta_seguridad_id,
        rango_min: Number(f.rango_min),
        rango_max: f.rango_max.trim() === "" ? null : Number(f.rango_max),
        incremento_por_pieza: f.incremento_por_pieza.trim() === "" ? 0 : Number(f.incremento_por_pieza),
        eliminar: f.eliminar,
      }));
      const actualizado = await updateEscalasCintaSeguridadBatch(payload);
      setCintaSeguridad(actualizado);
      setEditandoCinta(false);
      setMostrarConfirmacionCinta(false);
      showAlert("Escalas de cinta de seguridad actualizadas");
    } catch (error: any) {
      console.error("Error al guardar escalas de cinta de seguridad:", error);
      showAlert(error.response?.data?.error || "Error al guardar las escalas");
    } finally {
      setGuardandoCinta(false);
    }
  };

  const buildTextos = (rows: PrecioRow[]): TextoMap => {
    const map: TextoMap = {};
    rows.forEach((row) => {
      [1, 2, 3, 4].forEach((t) => {
        const tarifa = row.tarifas[t];
        if (!tarifa) return;
        map[`${row.kilos}-${t}-precio`] = tarifa.precio === 0 ? "" : String(tarifa.precio);
        map[`${row.kilos}-${t}-merma`]  = tarifa.merma  === 0 ? "" : String(tarifa.merma);
      });
    });
    return map;
  };

  const cargarTarifas = async () => {
    try {
      setLoading(true);
      const tarifas = await getTarifas();

      const preciosMap = new Map<number, PrecioRow>();

      tarifas.forEach((tarifa: Tarifa) => {
        if (!preciosMap.has(tarifa.kilogramos)) {
          preciosMap.set(tarifa.kilogramos, {
            kilos: tarifa.kilogramos,
            idkilogramos: tarifa.kilogramos_idkilogramos,
            tarifas: {},
          });
        }
        const row = preciosMap.get(tarifa.kilogramos)!;
        row.tarifas[tarifa.cantidad_tintas] = {
          id: tarifa.idtarifas_produccion,
          precio: tarifa.precio,
          merma: tarifa.merma_porcentaje,
        };
      });

      const preciosArray = Array.from(preciosMap.values()).sort((a, b) => a.kilos - b.kilos);

      if (!borradorAplicado.current) {
        borradorAplicado.current = true;
        const borrador = leerBorrador<{ precios: PrecioRow[]; textos: TextoMap }>(CLAVE_BORRADOR);
        if (borrador) {
          setPreciosBackup(preciosArray);
          setTextosBackup(buildTextos(preciosArray));
          setPrecios(borrador.precios);
          setTextos(borrador.textos);
          setEditando(true);
          return;
        }
      }

      setPrecios(preciosArray);
      setTextos(buildTextos(preciosArray));
    } catch (error) {
      console.error("Error al cargar tarifas:", error);
      showAlert("Error al cargar tarifas");
    } finally {
      setLoading(false);
    }
  };

  const actualizarTexto = (
    kilos: number,
    cantidadTintas: number,
    campo: "precio" | "merma",
    valor: string
  ) => {
    // Precio: hasta 4 decimales | Merma: hasta 2 decimales
    const regex = campo === "precio" ? /^\d*\.?\d{0,4}$/ : /^\d*\.?\d{0,2}$/;
    if (!regex.test(valor)) return;

    const clave = `${kilos}-${cantidadTintas}-${campo}`;
    setTextos((prev) => ({ ...prev, [clave]: valor }));

    // Actualizar valor numérico en precios
    setPrecios((prev) =>
      prev.map((p) => {
        if (p.kilos !== kilos) return p;
        return {
          ...p,
          tarifas: {
            ...p.tarifas,
            [cantidadTintas]: {
              ...p.tarifas[cantidadTintas],
              [campo]: valor === "" ? 0 : Number(valor),
            },
          },
        };
      })
    );
  };

  const iniciarEdicion = () => {
    setPreciosBackup(JSON.parse(JSON.stringify(precios)));
    setTextosBackup({ ...textos });
    setEditando(true);
  };

  const solicitarConfirmacion = () => {
    setMostrarConfirmacion(true);
  };

  const cancelarCambios = () => {
    setPrecios(preciosBackup);
    setTextos(textosBackup);
    setEditando(false);
    setMostrarConfirmacion(false);
    limpiarBorrador(CLAVE_BORRADOR);
  };

  const confirmarCambios = async () => {
    try {
      setGuardando(true);

      const tarifasParaActualizar = precios.flatMap((row) =>
        Object.values(row.tarifas).map((tarifa) => ({
          id: tarifa.id,
          precio: tarifa.precio,
          merma_porcentaje: tarifa.merma,
        }))
      );

      await updateTarifasBatch(tarifasParaActualizar);

      setEditando(false);
      setMostrarConfirmacion(false);
      limpiarBorrador(CLAVE_BORRADOR);
      showAlert("Tarifas actualizadas exitosamente");
    } catch (error: any) {
      console.error("Error al guardar tarifas:", error);
      const mensaje = error.response?.data?.error || "Error al guardar tarifas";
      showAlert(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && editando) {
      solicitarConfirmacion();
    }
  };

  if (loading) {
    return (
      <Dashboard>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Cargando tarifas...</p>
        </div>
      </Dashboard>
    );
  }

  return (
    <Dashboard>
      {/* ══════════════════════════════════════════════════════════════════
          HEADER — banner oscuro con badges, mismo lenguaje visual que
          "Precios de acabados" (papel).
      ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0b0e13] to-[#1a1f28] p-6 sm:p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
            🧾
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold tracking-widest uppercase bg-amber-400/15 text-amber-300 px-2.5 py-1 rounded-full">
                Catálogo de precios
              </span>
              <span className="text-[10px] font-extrabold tracking-widest uppercase bg-white/10 text-white/70 px-2.5 py-1 rounded-full">
                Plástico
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Costos de producción</h1>
            <p className="text-sm text-white/60 mt-1">
              Tarifas por kilo y tintas, más los incrementos por pieza de asa flexible y cinta de seguridad.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon="⚖️" label="Rangos de Kg" value={precios.length} />
        <StatCard icon="🎨" label="Niveles de tinta" value={4} />
        <StatCard icon="🎒" label="Escalas — asa flexible" value={asaFlexible.length} />
        <StatCard icon="🎗️" label="Cintas configuradas" value={cintaSeguridad.length} />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-base flex-shrink-0">
              📊
            </span>
            <h2 className="text-base font-bold text-gray-900">Catálogo de costos</h2>
          </div>

          <button
            onClick={() => (editando ? solicitarConfirmacion() : iniciarEdicion())}
            disabled={guardando}
            className={`px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-sm transition-colors ${
              editando
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-[#1a1f28] hover:bg-[#252b37]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {guardando ? "Guardando..." : editando ? "✓ Guardar cambios" : "Modificar precios"}
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#1a1f28] to-[#2a3140] text-white">
                <th className="border border-white/10 px-3 py-2.5" rowSpan={2}>
                  Kg
                </th>
                <th className="border border-white/10 px-3 py-2.5" colSpan={2}>1 tinta</th>
                <th className="border border-white/10 px-3 py-2.5" colSpan={2}>2 tintas</th>
                <th className="border border-white/10 px-3 py-2.5" colSpan={2}>3 tintas</th>
                <th className="border border-white/10 px-3 py-2.5" colSpan={2}>4 tintas</th>
              </tr>
              <tr className="bg-[#2a3140] text-white/80">
                <th className="border border-white/10 px-2 py-1.5 text-xs font-semibold">Precio</th>
                <th className="border border-white/10 px-2 py-1.5 text-xs font-semibold">Merma %</th>
                <th className="border border-white/10 px-2 py-1.5 text-xs font-semibold">Precio</th>
                <th className="border border-white/10 px-2 py-1.5 text-xs font-semibold">Merma %</th>
                <th className="border border-white/10 px-2 py-1.5 text-xs font-semibold">Precio</th>
                <th className="border border-white/10 px-2 py-1.5 text-xs font-semibold">Merma %</th>
                <th className="border border-white/10 px-2 py-1.5 text-xs font-semibold">Precio</th>
                <th className="border border-white/10 px-2 py-1.5 text-xs font-semibold">Merma %</th>
              </tr>
            </thead>

            <tbody>
              {precios.map((row) => (
                <tr key={row.kilos} className="even:bg-gray-50">
                  <td className="border px-3 py-2 text-center font-medium bg-gray-100">
                    {row.kilos}k
                  </td>

                  {[1, 2, 3, 4].map((cantidadTintas) => {
                    const tarifa = row.tarifas[cantidadTintas];
                    if (!tarifa) return null;

                    const clavePrecio = `${row.kilos}-${cantidadTintas}-precio`;
                    const claveMerma  = `${row.kilos}-${cantidadTintas}-merma`;

                    return (
                      <Fragment key={`${row.kilos}-${cantidadTintas}`}>
                        <td className="border px-3 py-2 text-center">
                          {editando ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={textos[clavePrecio] ?? ""}
                              onChange={(e) =>
                                actualizarTexto(row.kilos, cantidadTintas, "precio", e.target.value)
                              }
                              onKeyDown={handleKeyDown}
                              className="w-20 text-center border rounded-lg px-2 py-1 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
                              placeholder="0.0000"
                            />
                          ) : (
                            <span className="font-semibold text-gray-700">${tarifa.precio}</span>
                          )}
                        </td>
                        <td className="border px-3 py-2 text-center bg-amber-50">
                          <div className="flex items-center justify-center gap-2">
                            {editando ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={textos[claveMerma] ?? ""}
                                onChange={(e) =>
                                  actualizarTexto(row.kilos, cantidadTintas, "merma", e.target.value)
                                }
                                onKeyDown={handleKeyDown}
                                className="w-16 text-center border rounded-lg px-2 py-1 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="font-semibold text-amber-700">{tarifa.merma}%</span>
                            )}
                            <BotonAuditoria
                              tabla="tarifas_produccion"
                              id={tarifa.id}
                              etiqueta={`Historial de la tarifa de ${row.kilos} kg y ${cantidadTintas} tinta${cantidadTintas === 1 ? "" : "s"}`}
                            />
                          </div>
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editando && (
          <p className="mt-4 text-sm text-gray-500">
            Presiona <strong>Enter</strong> o <strong>Guardar cambios</strong> para confirmar.
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          INCREMENTO — ASA FLEXIBLE
          Rangos dinámicos: se pueden editar los límites, agregar rangos
          nuevos y quitar los que sobren. Aplica automático a las bolsas
          detectadas como "asa flexible" por su tipo de producto.
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-base flex-shrink-0">
              🎒
            </span>
            <h2 className="text-base font-bold text-gray-900">Incremento — Asa flexible</h2>
          </div>
          <button
            onClick={() => (editandoAsa ? solicitarConfirmacionAsa() : iniciarEdicionAsa())}
            disabled={guardandoAsa || cargandoAsa}
            className={`px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-sm transition-colors ${
              editandoAsa ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#1a1f28] hover:bg-[#252b37]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {guardandoAsa ? "Guardando..." : editandoAsa ? "✓ Guardar cambios" : "Modificar precios"}
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4 ml-[42px]">
          Se suma automático por pieza en bolsas de asa flexible, según la cantidad cotizada.
        </p>

        {cargandoAsa ? (
          <p className="text-gray-500 text-sm ml-[42px]">Cargando...</p>
        ) : (
          <div className="ml-[42px]">
            <div className="overflow-x-auto rounded-xl border border-gray-200 max-w-lg">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1a1f28] to-[#2a3140] text-white">
                    <th className="border border-white/10 px-3 py-2.5">Desde</th>
                    <th className="border border-white/10 px-3 py-2.5">Hasta</th>
                    <th className="border border-white/10 px-3 py-2.5">Incremento por pieza</th>
                    {editandoAsa && <th className="border border-white/10 px-3 py-2.5 w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {!editandoAsa
                    ? asaFlexible.map((escala) => (
                        <tr key={escala.id} className="even:bg-gray-50">
                          <td className="border px-3 py-2 text-center font-medium bg-gray-50 text-gray-700">
                            {escala.rango_min.toLocaleString()}
                          </td>
                          <td className="border px-3 py-2 text-center font-medium bg-gray-50 text-gray-700">
                            {escala.rango_max === null ? "en adelante" : escala.rango_max.toLocaleString()}
                          </td>
                          <td className="border px-3 py-2 text-center font-semibold text-gray-700">
                            ${escala.incremento_por_pieza}
                          </td>
                        </tr>
                      ))
                    : filasAsaEdit.map((fila, index) =>
                        fila.eliminar ? null : (
                          <tr key={fila.id ?? `nueva-${index}`} className="even:bg-gray-50">
                            <td className="border px-2 py-1.5 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={fila.rango_min}
                                onChange={(e) => actualizarFilaAsa(index, "rango_min", e.target.value)}
                                className="w-24 text-center border rounded-lg px-2 py-1.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
                                placeholder="0"
                              />
                            </td>
                            <td className="border px-2 py-1.5 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={fila.rango_max}
                                onChange={(e) => actualizarFilaAsa(index, "rango_max", e.target.value)}
                                className="w-28 text-center border rounded-lg px-2 py-1.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
                                placeholder="en adelante"
                              />
                            </td>
                            <td className="border px-2 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-gray-400 font-medium">$</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={fila.incremento_por_pieza}
                                  onChange={(e) =>
                                    actualizarFilaAsa(index, "incremento_por_pieza", e.target.value)
                                  }
                                  className="w-20 text-center border rounded-lg px-2 py-1.5 font-semibold text-gray-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
                                  placeholder="0.0000"
                                />
                              </div>
                            </td>
                            <td className="border px-2 py-1.5 text-center">
                              <button
                                onClick={() => quitarFilaAsa(index)}
                                title="Quitar este rango"
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                </tbody>
              </table>
            </div>
            {editandoAsa && (
              <button
                onClick={agregarFilaAsa}
                className="mt-3 text-sm font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1.5"
              >
                ➕ Agregar rango
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          INCREMENTO — CINTA DE SEGURIDAD
          Cada cinta tiene su propio set de rangos, 100% independiente de
          las demás — dinámico igual que asa flexible.
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-base flex-shrink-0">
              🎗️
            </span>
            <h2 className="text-base font-bold text-gray-900">Incremento — Cinta de seguridad</h2>
          </div>
          <button
            onClick={() => (editandoCinta ? solicitarConfirmacionCinta() : iniciarEdicionCinta())}
            disabled={guardandoCinta || cargandoCinta || cintaSeguridad.length === 0}
            className={`px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-sm transition-colors ${
              editandoCinta ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#1a1f28] hover:bg-[#252b37]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {guardandoCinta ? "Guardando..." : editandoCinta ? "✓ Guardar cambios" : "Modificar precios"}
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4 ml-[42px]">
          Obligatoria en bolsas de envíos — cada cinta tiene su propia escala de rangos.
        </p>

        {cargandoCinta ? (
          <p className="text-gray-500 text-sm ml-[42px]">Cargando...</p>
        ) : cintaSeguridad.length === 0 ? (
          <p className="text-gray-500 text-sm ml-[42px]">
            No hay cintas de seguridad activas en el catálogo todavía.
          </p>
        ) : (
          <div className="ml-[42px] flex flex-col gap-6">
            {cintaSeguridad.map((cinta) => {
              const filasDeCinta = editandoCinta
                ? filasCintaEdit
                    .map((f, index) => ({ ...f, index }))
                    .filter((f) => f.cinta_seguridad_id === cinta.cinta_seguridad_id)
                : [];

              return (
                <div key={cinta.cinta_seguridad_id}>
                  <p className="text-sm font-bold text-gray-800 mb-2">
                    {cinta.nombre}
                    {cinta.medida && <span className="text-gray-400 font-normal"> · {cinta.medida}</span>}
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-gray-200 max-w-lg">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-[#1a1f28] to-[#2a3140] text-white">
                          <th className="border border-white/10 px-3 py-2.5">Desde</th>
                          <th className="border border-white/10 px-3 py-2.5">Hasta</th>
                          <th className="border border-white/10 px-3 py-2.5">Incremento por pieza</th>
                          {editandoCinta && <th className="border border-white/10 px-3 py-2.5 w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {!editandoCinta &&
                          cinta.escalas.map((escala) => (
                            <tr key={escala.id} className="even:bg-gray-50">
                              <td className="border px-3 py-2 text-center font-medium bg-gray-50 text-gray-700">
                                {escala.rango_min.toLocaleString()}
                              </td>
                              <td className="border px-3 py-2 text-center font-medium bg-gray-50 text-gray-700">
                                {escala.rango_max === null ? "en adelante" : escala.rango_max.toLocaleString()}
                              </td>
                              <td className="border px-3 py-2 text-center font-semibold text-gray-700">
                                ${escala.incremento_por_pieza}
                              </td>
                            </tr>
                          ))}
                        {!editandoCinta && cinta.escalas.length === 0 && (
                          <tr>
                            <td colSpan={3} className="border px-3 py-3 text-center text-gray-400 text-sm">
                              Sin rangos configurados todavía.
                            </td>
                          </tr>
                        )}
                        {editandoCinta &&
                          filasDeCinta.map((fila) =>
                            fila.eliminar ? null : (
                              <tr key={fila.id ?? `nueva-${fila.index}`} className="even:bg-gray-50">
                                <td className="border px-2 py-1.5 text-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={fila.rango_min}
                                    onChange={(e) => actualizarFilaCinta(fila.index, "rango_min", e.target.value)}
                                    className="w-24 text-center border rounded-lg px-2 py-1.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="border px-2 py-1.5 text-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={fila.rango_max}
                                    onChange={(e) => actualizarFilaCinta(fila.index, "rango_max", e.target.value)}
                                    className="w-28 text-center border rounded-lg px-2 py-1.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
                                    placeholder="en adelante"
                                  />
                                </td>
                                <td className="border px-2 py-1.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-gray-400 font-medium">$</span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={fila.incremento_por_pieza}
                                      onChange={(e) =>
                                        actualizarFilaCinta(fila.index, "incremento_por_pieza", e.target.value)
                                      }
                                      className="w-20 text-center border rounded-lg px-2 py-1.5 font-semibold text-gray-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
                                      placeholder="0.0000"
                                    />
                                  </div>
                                </td>
                                <td className="border px-2 py-1.5 text-center">
                                  <button
                                    onClick={() => quitarFilaCinta(fila.index)}
                                    title="Quitar este rango"
                                    className="text-red-500 hover:text-red-700 font-bold"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            )
                          )}
                        {editandoCinta && filasDeCinta.every((f) => f.eliminar) && (
                          <tr>
                            <td colSpan={4} className="border px-3 py-3 text-center text-gray-400 text-sm">
                              Sin rangos — agrega uno abajo.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {editandoCinta && (
                    <button
                      onClick={() => agregarFilaCinta(cinta.cinta_seguridad_id)}
                      className="mt-2 text-sm font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1.5"
                    >
                      ➕ Agregar rango
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editandoAsa && (
        <div className="flex justify-end mt-3">
          <button
            onClick={cancelarEdicionAsa}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Cancelar edición de asa flexible
          </button>
        </div>
      )}
      {editandoCinta && (
        <div className="flex justify-end mt-3">
          <button
            onClick={cancelarEdicionCinta}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Cancelar edición de cinta de seguridad
          </button>
        </div>
      )}

      {/* MODAL — confirmación asa flexible */}
      {mostrarConfirmacionAsa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[380px]">
            <h3 className="text-lg font-bold text-red-600 mb-2">Confirmar cambios</h3>
            <p className="text-sm text-gray-700 mb-4">
              Estás a punto de modificar las escalas de incremento de asa flexible.
              <br />
              <strong>¿Deseas continuar?</strong>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMostrarConfirmacionAsa(false)}
                disabled={guardandoAsa}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarGuardarAsa}
                disabled={guardandoAsa}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {guardandoAsa ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — confirmación cinta de seguridad */}
      {mostrarConfirmacionCinta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[380px]">
            <h3 className="text-lg font-bold text-red-600 mb-2">Confirmar cambios</h3>
            <p className="text-sm text-gray-700 mb-4">
              Estás a punto de modificar las escalas de incremento de cinta de seguridad.
              <br />
              <strong>¿Deseas continuar?</strong>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMostrarConfirmacionCinta(false)}
                disabled={guardandoCinta}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarGuardarCinta}
                disabled={guardandoCinta}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {guardandoCinta ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — confirmación catálogo de costos (tarifas_produccion) */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[380px]">
            <h3 className="text-lg font-bold text-red-600 mb-2">Confirmar cambios</h3>
            <p className="text-sm text-gray-700 mb-4">
              Estás a punto de modificar los costos y mermas.
              <br />
              <strong>¿Deseas continuar?</strong>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelarCambios}
                disabled={guardando}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambios}
                disabled={guardando}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Card pequeña de estadística — mismo lenguaje visual del banner oscuro de
// arriba, usada en la franja de 4 indicadores.
// ══════════════════════════════════════════════════════════════════════════
function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-extrabold text-gray-900 leading-tight">{value}</p>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
      </div>
    </div>
  );
}