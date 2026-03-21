import { useState } from "react";

interface Producto {
  nombre: string;
  cantidades: [number, number, number];
  precios: [number, number, number];
  calibre: string;
  tintas: number;
  caras: number;
}

interface Pedido {
  id: number;
  numeroPedido: string;
  fecha: string;
  cliente: string;
  empresa: string;
  telefono: string;
  correo: string;
  productos: Producto[];
  total: number;
  observaciones: string;
  disenoAprobado: boolean;
  anticipoAprobado: boolean;
}

interface FormularioPedidoProps {
  pedido: Pedido;
  onSave: (pedido: Pedido) => void;
  onCancel: () => void;
}

export default function FormularioPedido({
  pedido,
  onSave,
  onCancel,
}: FormularioPedidoProps) {
  const [form, setForm] = useState<Pedido>(pedido);

  // Texto intermedio para los inputs (evita perder el punto mientras se escribe)
  const [cantidadesTexto, setCantidadesTexto] = useState<string[][]>(
    pedido.productos.map((p) =>
      p.cantidades.map((c) => (c === 0 ? "" : String(c)))
    )
  );
  const [preciosTexto, setPreciosTexto] = useState<string[][]>(
    pedido.productos.map((p) =>
      p.precios.map((pr) => (pr === 0 ? "" : String(pr)))
    )
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCantidadChange = (
    indexProd: number,
    indexCant: number,
    value: string
  ) => {
    // Permite enteros o decimales con hasta 4 decimales
    if (!/^\d*\.?\d{0,4}$/.test(value)) return;

    // Actualizar texto intermedio
    const nuevosTextos = cantidadesTexto.map((row) => [...row]);
    nuevosTextos[indexProd][indexCant] = value;
    setCantidadesTexto(nuevosTextos);

    // Actualizar valores numéricos en form
    const nuevosProductos = [...form.productos];
    const nuevasCantidades = [...nuevosProductos[indexProd].cantidades] as [number, number, number];
    nuevasCantidades[indexCant] = value === "" ? 0 : Number(value);
    nuevosProductos[indexProd] = {
      ...nuevosProductos[indexProd],
      cantidades: nuevasCantidades,
    };
    setForm({ ...form, productos: nuevosProductos });
  };

  const handlePrecioChange = (
    indexProd: number,
    indexPrecio: number,
    value: string
  ) => {
    // Permite enteros o decimales con hasta 4 decimales
    if (!/^\d*\.?\d{0,4}$/.test(value)) return;

    // Actualizar texto intermedio
    const nuevosTextos = preciosTexto.map((row) => [...row]);
    nuevosTextos[indexProd][indexPrecio] = value;
    setPreciosTexto(nuevosTextos);

    // Actualizar valores numéricos en form
    const nuevosProductos = [...form.productos];
    const nuevosPrecios = [...nuevosProductos[indexProd].precios] as [number, number, number];
    nuevosPrecios[indexPrecio] = value === "" ? 0 : Number(value);
    nuevosProductos[indexProd] = {
      ...nuevosProductos[indexProd],
      precios: nuevosPrecios,
    };
    setForm({ ...form, productos: nuevosProductos });
  };

  const handleGuardar = () => {
    const totalActualizado = calcularTotalPedido();
    onSave({ ...form, total: totalActualizado });
  };

  const calcularSubtotalPorCantidad = (producto: Producto, index: number) => {
    const cantidad = Number(producto.cantidades[index]) || 0;
    const precio = Number(producto.precios[index]) || 0;
    return cantidad * precio;
  };

  const calcularTotalPedido = () => {
    return form.productos.reduce((total, prod) => {
      const subtotal = prod.cantidades.reduce((sum, cant, idx) => {
        const precio = Number(prod.precios[idx]) || 0;
        return sum + cant * precio;
      }, 0);
      return total + subtotal;
    }, 0);
  };

  return (
    <div className="space-y-5">
      {/* Información del Cliente */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">
          Información del Cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input
              type="text"
              name="cliente"
              value={form.cliente}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <input
              type="text"
              name="empresa"
              value={form.empresa}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="text"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input
              type="email"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Productos con Edición */}
      <div className="bg-white border-2 border-purple-200 rounded-lg">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 border-b border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Productos del Pedido
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Edita las cantidades y precios de los productos
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Productos</div>
              <div className="text-lg font-bold text-purple-600">
                {form.productos.length}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-4">
            {form.productos.map((producto, indexProd) => (
              <div
                key={indexProd}
                className="bg-white p-4 rounded-lg border-2 border-gray-200"
              >
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-900 text-lg">{producto.nombre}</h4>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Calibre:</span>
                      <span className="ml-1 font-medium text-gray-900">{producto.calibre}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tintas:</span>
                      <span className="ml-1 font-medium text-gray-900">{producto.tintas}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Caras:</span>
                      <span className="ml-1 font-medium text-gray-900">{producto.caras}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Cantidades y Precios
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {producto.cantidades.map((_, indexCant) => {
                      const subtotal = calcularSubtotalPorCantidad(producto, indexCant);
                      return (
                        <div
                          key={indexCant}
                          className="p-3 rounded-lg border-2 bg-white border-gray-300"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-600">
                              Opción {indexCant + 1}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Cantidad:</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={cantidadesTexto[indexProd]?.[indexCant] ?? ""}
                                onChange={(e) =>
                                  handleCantidadChange(indexProd, indexCant, e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Precio c/u:</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={preciosTexto[indexProd]?.[indexCant] ?? ""}
                                onChange={(e) =>
                                  handlePrecioChange(indexProd, indexCant, e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="0.0000"
                              />
                            </div>
                            <div className="pt-2 border-t border-gray-200 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                                <span className="text-lg font-bold text-green-700">
                                  ${subtotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Estado del Pedido */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">
          Estado del Pedido
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center bg-white p-3 rounded-lg border-2 border-gray-200">
            <input
              type="checkbox"
              id="disenoAprobado"
              checked={form.disenoAprobado}
              onChange={(e) => setForm({ ...form, disenoAprobado: e.target.checked })}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="disenoAprobado" className="ml-3 block text-sm font-medium text-gray-900">
              Diseño Aprobado
            </label>
          </div>
          <div className="flex items-center bg-white p-3 rounded-lg border-2 border-gray-200">
            <input
              type="checkbox"
              id="anticipoAprobado"
              checked={form.anticipoAprobado}
              onChange={(e) => setForm({ ...form, anticipoAprobado: e.target.checked })}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="anticipoAprobado" className="ml-3 block text-sm font-medium text-gray-900">
              Anticipo Pagado
            </label>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
        <textarea
          name="observaciones"
          value={form.observaciones}
          onChange={handleChange}
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Agrega notas o comentarios adicionales..."
        />
      </div>

      {/* Resumen de Totales */}
      <div className="bg-gray-50 p-5 rounded-lg border-2 border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
          Resumen de Totales
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center pt-2">
            <span className="text-gray-900 font-semibold text-lg">Total del Pedido:</span>
            <span className="text-2xl font-bold text-gray-900">
              ${calcularTotalPedido().toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex flex-col gap-3 pt-4 border-t-2 border-gray-200">
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}