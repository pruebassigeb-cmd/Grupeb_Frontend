import { useState } from "react";

interface Producto {
  nombre: string;
  cantidades: [number, number, number];
  precios: [number, number, number];
  calibre: string;
  tintas: number;
  caras: number;
  disenoAprobado: boolean;
  observacionesDiseno?: string;
}

interface Cotizacion {
  id: number;
  cliente: string;
  telefono: string;
  correo: string;
  empresa: string;
  productos: Producto[];
  observaciones: string;
  total: number;
  fecha: string;
  estado: "Pendiente" | "Aprobada" | "Rechazada";
  anticipoAprobado: boolean;
}

interface EditarDisenoProps {
  cotizacion: Cotizacion;
  onSave: (cotizacionActualizada: Cotizacion) => void;
  onCancel: () => void;
}

export default function EditarDiseno({ cotizacion, onSave, onCancel }: EditarDisenoProps) {
  const [form, setForm] = useState<Cotizacion>({
    ...cotizacion,
    productos: cotizacion.productos.map(p => ({
      ...p,
      observacionesDiseno: p.observacionesDiseno || "",
    })),
  });

  const handleToggleDiseno = (index: number) => {
    const nuevosProductos = [...form.productos];
    nuevosProductos[index] = {
      ...nuevosProductos[index],
      disenoAprobado: !nuevosProductos[index].disenoAprobado,
    };
    setForm({ ...form, productos: nuevosProductos });
  };

  const handleObservacionChange = (index: number, value: string) => {
    const nuevosProductos = [...form.productos];
    nuevosProductos[index] = { ...nuevosProductos[index], observacionesDiseno: value };
    setForm({ ...form, productos: nuevosProductos });
  };

  const handleGuardar = () => { onSave({ ...form }); };

  const productosAprobados = form.productos.filter(p => p.disenoAprobado).length;
  const todosDisenos       = form.productos.every(p => p.disenoAprobado);

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
            <div className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
              {form.cliente}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <div className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
              {form.empresa}
            </div>
          </div>
        </div>
      </div>

      {/* Productos y Diseños */}
      <div className="bg-white border-2 border-purple-200 rounded-lg">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 border-b border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                🎨 Diseños de Productos
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Gestiona la aprobación de diseños y agrega observaciones específicas
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Diseños Aprobados</div>
              <div className={`text-lg font-bold ${todosDisenos ? "text-green-600" : "text-blue-600"}`}>
                {productosAprobados}/{form.productos.length}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {form.productos.map((producto, index) => (
            <div key={index}
              className={`bg-white p-4 rounded-lg border-2 transition-all ${
                producto.disenoAprobado ? "border-blue-500 shadow-md" : "border-gray-200"
              }`}>

              {/* Encabezado */}
              <div className="mb-3">
                <h4 className="font-semibold text-gray-900 text-lg">{producto.nombre}</h4>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
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

              {/* Toggle aprobación */}
              <div onClick={() => handleToggleDiseno(index)}
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all mb-3 ${
                  producto.disenoAprobado
                    ? "bg-blue-50 border-blue-400 shadow-sm"
                    : "bg-gray-50 border-gray-300 hover:border-blue-300"
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                    producto.disenoAprobado ? "bg-blue-600 border-blue-600" : "border-gray-400"
                  }`}>
                    {producto.disenoAprobado && (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Estado del Diseño</div>
                    <div className="text-xs text-gray-500">
                      {producto.disenoAprobado
                        ? "Diseño aprobado y listo para producción"
                        : "Pendiente de aprobación"}
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                  producto.disenoAprobado ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
                }`}>
                  {producto.disenoAprobado ? "APROBADO" : "PENDIENTE"}
                </div>
              </div>

              {/* Observaciones */}
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                {/* ← etiqueta sin SVG inline para evitar el error de ts */}
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  ✏️ Observaciones de Diseño
                </label>
                <textarea
                  value={producto.observacionesDiseno || ""}
                  onChange={e => handleObservacionChange(index, e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-yellow-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="Agrega comentarios sobre el diseño: colores, modificaciones solicitadas, ajustes pendientes..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-gray-50 p-5 rounded-lg border-2 border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
          Resumen de Diseños
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total de Productos:</span>
            <span className="font-bold text-lg text-gray-900">{form.productos.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Diseños Aprobados:</span>
            <span className={`font-bold text-lg ${todosDisenos ? "text-green-600" : "text-orange-600"}`}>
              {productosAprobados}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-300">
            <span className="text-gray-600">Progreso:</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${todosDisenos ? "bg-green-600" : "bg-blue-600"}`}
                  style={{ width: `${(productosAprobados / form.productos.length) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {Math.round((productosAprobados / form.productos.length) * 100)}%
              </span>
            </div>
          </div>
          {!todosDisenos && (
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ Aún hay {form.productos.length - productosAprobados} diseño(s) pendiente(s) de aprobación
            </p>
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
        <button onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
          Cancelar
        </button>
        <button onClick={handleGuardar}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md transition-colors">
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}