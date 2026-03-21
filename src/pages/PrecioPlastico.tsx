import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import { getTarifas, updateTarifasBatch } from "../services/tarifas.service";
import type { Tarifa } from "../types/tarifas.types";

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

// Texto intermedio por celda: clave = `${kilos}-${tintas}-precio` | `${kilos}-${tintas}-merma`
type TextoMap = Record<string, string>;

export default function PrecioPlastico() {
  const [editando, setEditando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [precios, setPrecios] = useState<PrecioRow[]>([]);
  const [preciosBackup, setPreciosBackup] = useState<PrecioRow[]>([]);
  const [textos, setTextos] = useState<TextoMap>({});
  const [textosBackup, setTextosBackup] = useState<TextoMap>({});

  useEffect(() => {
    cargarTarifas();
  }, []);

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
      setPrecios(preciosArray);
      setTextos(buildTextos(preciosArray));
    } catch (error) {
      console.error("Error al cargar tarifas:", error);
      alert("Error al cargar tarifas");
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
      alert("Tarifas actualizadas exitosamente");
    } catch (error: any) {
      console.error("Error al guardar tarifas:", error);
      const mensaje = error.response?.data?.error || "Error al guardar tarifas";
      alert(mensaje);
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
      <h1 className="text-2xl font-bold mb-6">Costos de Producción - Plástico</h1>

      <div className="bg-white p-6 rounded-xl shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Catálogo de costos</h2>

          <button
            onClick={() => (editando ? solicitarConfirmacion() : iniciarEdicion())}
            disabled={guardando}
            className={`px-4 py-2 rounded-lg text-white font-medium ${
              editando
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Modificar precios"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border px-3 py-2" rowSpan={2}>
                  Kg
                </th>
                <th className="border px-3 py-2" colSpan={2}>1 tinta</th>
                <th className="border px-3 py-2" colSpan={2}>2 tintas</th>
                <th className="border px-3 py-2" colSpan={2}>3 tintas</th>
                <th className="border px-3 py-2" colSpan={2}>4 tintas</th>
              </tr>
              <tr className="bg-blue-500 text-white">
                <th className="border px-2 py-1 text-xs">Precio</th>
                <th className="border px-2 py-1 text-xs">Merma %</th>
                <th className="border px-2 py-1 text-xs">Precio</th>
                <th className="border px-2 py-1 text-xs">Merma %</th>
                <th className="border px-2 py-1 text-xs">Precio</th>
                <th className="border px-2 py-1 text-xs">Merma %</th>
                <th className="border px-2 py-1 text-xs">Precio</th>
                <th className="border px-2 py-1 text-xs">Merma %</th>
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
                      <>
                        <td key={`precio-${cantidadTintas}`} className="border px-3 py-2 text-center">
                          {editando ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={textos[clavePrecio] ?? ""}
                              onChange={(e) =>
                                actualizarTexto(row.kilos, cantidadTintas, "precio", e.target.value)
                              }
                              onKeyDown={handleKeyDown}
                              className="w-20 text-center border rounded-lg px-2 py-1 focus:border-blue-500 focus:outline-none"
                              placeholder="0.0000"
                            />
                          ) : (
                            <span className="font-semibold text-gray-700">${tarifa.precio}</span>
                          )}
                        </td>
                        <td key={`merma-${cantidadTintas}`} className="border px-3 py-2 text-center bg-amber-50">
                          {editando ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={textos[claveMerma] ?? ""}
                              onChange={(e) =>
                                actualizarTexto(row.kilos, cantidadTintas, "merma", e.target.value)
                              }
                              onKeyDown={handleKeyDown}
                              className="w-16 text-center border rounded-lg px-2 py-1 focus:border-blue-500 focus:outline-none"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="font-semibold text-amber-700">{tarifa.merma}%</span>
                          )}
                        </td>
                      </>
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

      {/* MODAL */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[380px]">
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