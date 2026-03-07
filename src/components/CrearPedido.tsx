// import { useState } from "react";
// import SelectorProducto, { type DatosProducto, type MedidaKey } from "./ConfigurarProducto";

// interface Cliente {
//   id: string;
//   nombre: string;
//   telefono: string;
//   correo: string;
//   empresa: string;
// }

// interface FormularioPedidoProps {
//   onSubmit: (datos: DatosPedido) => void;
//   onCancel: () => void;
// }

// // Datos precargados de clientes existentes
// const CLIENTES_EXISTENTES: Cliente[] = [
//   {
//     id: "1",
//     nombre: "María González García",
//     telefono: "33-1234-5678",
//     correo: "maria.gonzalez@empresa.com",
//     empresa: "Distribuidora González"
//   },
//   {
//     id: "2",
//     nombre: "Carlos Hernández López",
//     telefono: "33-8765-4321",
//     correo: "carlos.hdez@comercial.mx",
//     empresa: "Comercial Hernández"
//   },
//   {
//     id: "3",
//     nombre: "Ana Patricia Ruiz",
//     telefono: "33-5555-6666",
//     correo: "ana.ruiz@tienda.com",
//     empresa: "Tienda La Esperanza"
//   },
//   {
//     id: "4",
//     nombre: "Roberto Martínez",
//     telefono: "33-9999-1111",
//     correo: "roberto.m@supermercado.mx",
//     empresa: "Supermercado El Ahorro"
//   },
//   {
//     id: "5",
//     nombre: "Laura Sánchez Díaz",
//     telefono: "33-7777-8888",
//     correo: "laura.sanchez@boutique.com",
//     empresa: "Boutique Elegancia"
//   },
//   {
//     id: "6",
//     nombre: "José Luis Ramírez",
//     telefono: "33-3333-4444",
//     correo: "jl.ramirez@farmacia.mx",
//     empresa: "Farmacia San José"
//   }
// ];

// interface Producto {
//   nombre: string;
//   cantidades: [number, number, number];
//   precios: [number, number, number];
//   calibre: string;
//   tintas: number;
//   caras: number;
//   material: string;
//   medidas: Record<MedidaKey, string>;
//   medidasFormateadas: string;
// }

// interface DatosPedido {
//   cliente: string;
//   telefono: string;
//   correo: string;
//   empresa: string;
//   productos: Producto[];
//   observaciones: string;
// }

// // Productos registrados precargados
// interface ProductoRegistrado {
//   id: string;
//   nombreCompleto: string;
//   tipoProducto: string;
//   material: string;
//   calibre: string;
//   medidas: Record<MedidaKey, string>;
//   medidasFormateadas: string;
//   bolsasPorKilo: string;
// }

// const PRODUCTOS_REGISTRADOS: ProductoRegistrado[] = [
//   {
//     id: "1",
//     nombreCompleto: "Bolsa plana 30x40 baja densidad",
//     tipoProducto: "Bolsa plana",
//     material: "Baja densidad",
//     calibre: "200",
//     medidas: {
//       altura: "30",
//       ancho: "40",
//       fuelleFondo: "",
//       fuelleLateral1: "",
//       fuelleLateral2: "",
//       refuerzo: "",
//       solapa: "",
//     },
//     medidasFormateadas: "30x40",
//     bolsasPorKilo: "88.652"
//   },
//   {
//     id: "2",
//     nombreCompleto: "Bolsa plana 40x50 baja densidad",
//     tipoProducto: "Bolsa plana",
//     material: "Baja densidad",
//     calibre: "200",
//     medidas: {
//       altura: "40",
//       ancho: "50",
//       fuelleFondo: "",
//       fuelleLateral1: "",
//       fuelleLateral2: "",
//       refuerzo: "",
//       solapa: "",
//     },
//     medidasFormateadas: "40x50",
//     bolsasPorKilo: "66.489"
//   },
//   {
//     id: "3",
//     nombreCompleto: "Bolsa troquelada 30+10+5x40+8+8 alta densidad",
//     tipoProducto: "Bolsa troquelada",
//     material: "Alta densidad",
//     calibre: "225",
//     medidas: {
//       altura: "30",
//       ancho: "40",
//       fuelleFondo: "10",
//       fuelleLateral1: "8",
//       fuelleLateral2: "8",
//       refuerzo: "5",
//       solapa: "",
//     },
//     medidasFormateadas: "30+10+5x40+8+8",
//     bolsasPorKilo: "55.320"
//   },
//   {
//     id: "4",
//     nombreCompleto: "Bolsa envíos 30+10+5x40 alta densidad",
//     tipoProducto: "Bolsa envíos",
//     material: "Alta densidad",
//     calibre: "250",
//     medidas: {
//       altura: "30",
//       ancho: "40",
//       fuelleFondo: "10",
//       fuelleLateral1: "",
//       fuelleLateral2: "",
//       refuerzo: "",
//       solapa: "5",
//     },
//     medidasFormateadas: "30+10+5x40",
//     bolsasPorKilo: "47.234"
//   },
// ];

// export default function CrearPedido({
//   onSubmit,
//   onCancel,
// }: FormularioPedidoProps) {
//   const [paso, setPaso] = useState(1);
//   const [datos, setDatos] = useState<DatosPedido>({
//     cliente: "",
//     telefono: "",
//     correo: "",
//     empresa: "",
//     productos: [],
//     observaciones: "",
//   });

//   const [mostrarModalClientes, setMostrarModalClientes] = useState(false);
//   const [busquedaCliente, setBusquedaCliente] = useState("");

//   // Estados para el modo y producto actual
//   const [modoProducto, setModoProducto] = useState<"registrado" | "nuevo">("registrado");
//   const [productoRegistradoSeleccionado, setProductoRegistradoSeleccionado] = useState("");
//   const [mostrarDropdownProductosRegistrados, setMostrarDropdownProductosRegistrados] = useState(false);

//   const [productoActual, setProductoActual] = useState<Producto>({
//     nombre: "",
//     cantidades: [0, 0, 0],
//     precios: [0, 0, 0],
//     calibre: "200",
//     tintas: 1,
//     caras: 1,
//     material: "",
//     medidas: {
//       altura: "",
//       ancho: "",
//       fuelleFondo: "",
//       fuelleLateral1: "",
//       fuelleLateral2: "",
//       refuerzo: "",
//       solapa: "",
//     },
//     medidasFormateadas: "",
//   });

//   // Datos del producto nuevo (desde SelectorProducto)
//   const [datosProductoNuevo, setDatosProductoNuevo] = useState<DatosProducto>({
//     tipoProducto: "",
//     material: "",
//     calibre: "",
//     medidas: {
//       altura: "",
//       ancho: "",
//       fuelleFondo: "",
//       fuelleLateral1: "",
//       fuelleLateral2: "",
//       refuerzo: "",
//       solapa: "",
//     },
//     medidasFormateadas: "",
//     nombreCompleto: "",
//   });

//   const [mostrarDropdownCaras, setMostrarDropdownCaras] = useState(false);

//   /* FUNCIÓN PARA NORMALIZAR TEXTO (QUITAR ACENTOS) */
//   const normalizarTexto = (texto: string) => {
//     return texto
//       .toLowerCase()
//       .normalize("NFD")
//       .replace(/[\u0300-\u036f]/g, "");
//   };

//   // Función para seleccionar un cliente existente
//   const seleccionarCliente = (cliente: Cliente) => {
//     setDatos({
//       ...datos,
//       cliente: cliente.nombre,
//       telefono: cliente.telefono,
//       correo: cliente.correo,
//       empresa: cliente.empresa
//     });
//     setMostrarModalClientes(false);
//     setBusquedaCliente("");
//   };

//   // Filtrar clientes según búsqueda
//   const clientesFiltrados = CLIENTES_EXISTENTES.filter((cliente) => {
//     const busqueda = normalizarTexto(busquedaCliente);
//     return (
//       normalizarTexto(cliente.nombre).includes(busqueda) ||
//       normalizarTexto(cliente.empresa).includes(busqueda) ||
//       cliente.telefono.includes(busquedaCliente) ||
//       cliente.correo.toLowerCase().includes(busquedaCliente.toLowerCase())
//     );
//   });

//   // Seleccionar producto registrado
//   const seleccionarProductoRegistrado = (productoReg: ProductoRegistrado) => {
//     setProductoRegistradoSeleccionado(productoReg.nombreCompleto);
    
//     setProductoActual({
//       nombre: productoReg.nombreCompleto,
//       cantidades: [0, 0, 0],
//       precios: [0, 0, 0],
//       calibre: productoReg.calibre,
//       tintas: 1,
//       caras: 1,
//       material: productoReg.material,
//       medidas: { ...productoReg.medidas },
//       medidasFormateadas: productoReg.medidasFormateadas,
//     });
    
//     setMostrarDropdownProductosRegistrados(false);
//   };

//   // Manejar cambios del producto nuevo desde SelectorProducto
//   const handleProductoNuevoChange = (datos: DatosProducto) => {
//     setDatosProductoNuevo(datos);
    
//     // Actualizar productoActual con los datos del nuevo producto
//     setProductoActual((prev) => ({
//       ...prev,
//       nombre: datos.nombreCompleto,
//       material: datos.material,
//       calibre: datos.calibre,
//       medidas: { ...datos.medidas },
//       medidasFormateadas: datos.medidasFormateadas,
//     }));
//   };

//   // Función para calcular precio por bolsa según cantidad
//   const calcularPrecioPorBolsa = (cantidad: number): number => {
//     if (cantidad === 0) return 0;
    
//     const BOLSAS_POR_KG = 88.652;
//     const kilos = cantidad / BOLSAS_POR_KG;
    
//     let precioKg: number;
//     if (kilos >= 1000) precioKg = 90;
//     else if (kilos >= 500) precioKg = 90;
//     else if (kilos >= 300) precioKg = 95;
//     else if (kilos >= 200) precioKg = 120;
//     else if (kilos >= 100) precioKg = 150;
//     else if (kilos >= 75) precioKg = 180;
//     else if (kilos >= 50) precioKg = 200;
//     else if (kilos >= 30) precioKg = 250;
//     else precioKg = 250;
    
//     const precioPorBolsa = precioKg / BOLSAS_POR_KG;
//     return Number(precioPorBolsa.toFixed(4));
//   };

//   const handleCantidadChange = (index: number, value: string) => {
//     const nuevasCantidades = [...productoActual.cantidades];
//     const nuevosPrecios = [...productoActual.precios];
    
//     const cantidad = value === "" ? 0 : Number(value);
//     nuevasCantidades[index] = cantidad;
//     nuevosPrecios[index] = calcularPrecioPorBolsa(cantidad);

//     setProductoActual({
//       ...productoActual,
//       cantidades: nuevasCantidades as [number, number, number],
//       precios: nuevosPrecios as [number, number, number],
//     });
//   };

//   const handlePrecioChange = (index: number, value: string) => {
//     const nuevosPrecios = [...productoActual.precios];
//     nuevosPrecios[index] = value === "" ? 0 : Number(value);

//     setProductoActual({
//       ...productoActual,
//       precios: nuevosPrecios as [number, number, number],
//     });
//   };

//   const handleAgregarProducto = () => {
//     const tieneValoresValidos = productoActual.cantidades.some(
//       (cant, i) => cant > 0 && productoActual.precios[i] > 0
//     );

//     if (productoActual.nombre && tieneValoresValidos) {
//       setDatos({
//         ...datos,
//         productos: [...datos.productos, productoActual],
//       });

//       // Resetear formulario
//       setModoProducto("registrado");
//       setProductoRegistradoSeleccionado("");
      
//       setProductoActual({
//         nombre: "",
//         cantidades: [0, 0, 0],
//         precios: [0, 0, 0],
//         calibre: "200",
//         tintas: 1,
//         caras: 1,
//         material: "",
//         medidas: {
//           altura: "",
//           ancho: "",
//           fuelleFondo: "",
//           fuelleLateral1: "",
//           fuelleLateral2: "",
//           refuerzo: "",
//           solapa: "",
//         },
//         medidasFormateadas: "",
//       });

//       setDatosProductoNuevo({
//         tipoProducto: "",
//         material: "",
//         calibre: "",
//         medidas: {
//           altura: "",
//           ancho: "",
//           fuelleFondo: "",
//           fuelleLateral1: "",
//           fuelleLateral2: "",
//           refuerzo: "",
//           solapa: "",
//         },
//         medidasFormateadas: "",
//         nombreCompleto: "",
//       });
//     }
//   };

//   const handleEliminarProducto = (index: number) => {
//     setDatos({
//       ...datos,
//       productos: datos.productos.filter((_, i) => i !== index),
//     });
//   };

//   const handleSiguiente = () => {
//     if (datos.cliente && datos.telefono && datos.correo) {
//       setPaso(2);
//     }
//   };

//   const handleAtras = () => setPaso(1);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (datos.productos.length > 0) {
//       onSubmit(datos);
//     }
//   };

//   const calcularTotal = () => {
//     return datos.productos.reduce((total, prod) => {
//       const subtotal = prod.cantidades.reduce(
//         (sum, cant, i) => sum + cant * prod.precios[i],
//         0
//       );
//       return total + subtotal;
//     }, 0);
//   };

//   // Inputs de observaciones
//   const handleInputChange = (
//     e: React.ChangeEvent<HTMLTextAreaElement>
//   ) => {
//     const { name, value } = e.target;
//     setDatos({ ...datos, [name]: value });
//   };

//   return (
//     <div className="relative">
//       {/* Modal de búsqueda de clientes */}
//       {mostrarModalClientes && (
//         <div className="fixed inset-0 flex items-center justify-center z-50 bg-opacity-50">
//           <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
//             <div className="p-6 border-b border-gray-200">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-xl font-semibold text-gray-900">
//                   Buscar Cliente
//                 </h3>
//                 <button
//                   onClick={() => {
//                     setMostrarModalClientes(false);
//                     setBusquedaCliente("");
//                   }}
//                   className="text-gray-400 hover:text-gray-600"
//                 >
//                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                   </svg>
//                 </button>
//               </div>
              
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={busquedaCliente}
//                   onChange={(e) => setBusquedaCliente(e.target.value)}
//                   placeholder="Buscar por nombre, empresa, teléfono o correo..."
//                   className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
//                   autoFocus
//                 />
//                 <svg 
//                   className="w-5 h-5 text-gray-400 absolute left-3 top-4" 
//                   fill="none" 
//                   stroke="currentColor" 
//                   viewBox="0 0 24 24"
//                 >
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//                 </svg>
//               </div>
//             </div>

//             <div className="overflow-y-auto max-h-96">
//               {clientesFiltrados.length > 0 ? (
//                 <div className="divide-y divide-gray-200">
//                   {clientesFiltrados.map((cliente) => (
//                     <div
//                       key={cliente.id}
//                       onClick={() => seleccionarCliente(cliente)}
//                       className="p-4 hover:bg-purple-50 cursor-pointer transition-colors"
//                     >
//                       <div className="flex items-start justify-between">
//                         <div className="flex-1">
//                           <h4 className="font-semibold text-gray-900">{cliente.nombre}</h4>
//                           <p className="text-sm text-gray-600 mt-1">{cliente.empresa}</p>
//                           <div className="flex gap-4 mt-2 text-sm text-gray-500">
//                             <span className="flex items-center gap-1">
//                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
//                               </svg>
//                               {cliente.telefono}
//                             </span>
//                             <span className="flex items-center gap-1">
//                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//                               </svg>
//                               {cliente.correo}
//                             </span>
//                           </div>
//                         </div>
//                         <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                         </svg>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="p-8 text-center text-gray-500">
//                   <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                   <p className="text-lg font-medium">No se encontraron clientes</p>
//                   <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Indicador de pasos */}
//       <div className="flex items-center justify-center mb-8">
//         <div className="flex items-center">
//           <div
//             className={`flex items-center justify-center w-10 h-10 rounded-full ${
//               paso === 1 ? "bg-blue-600 text-white" : "bg-green-600 text-white"
//             }`}
//           >
//             {paso === 1 ? "1" : "✓"}
//           </div>
//           <div
//             className={`w-24 h-1 ${
//               paso === 2 ? "bg-blue-600" : "bg-gray-300"
//             }`}
//           ></div>
//           <div
//             className={`flex items-center justify-center w-10 h-10 rounded-full ${
//               paso === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
//             }`}
//           >
//             2
//           </div>
//         </div>
//       </div>

//       {/* PASO 1 - Seleccionar Cliente */}
//       <div className={paso === 1 ? "block" : "hidden"}>
//         <div className="flex items-center justify-between mb-6">
//           <h3 className="text-lg font-semibold text-gray-900">
//             Seleccionar Cliente
//           </h3>
//         </div>

//         {datos.cliente ? (
//           <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
//             <div className="flex items-start justify-between">
//               <div className="flex-1">
//                 <h4 className="text-lg font-semibold text-gray-900 mb-2">{datos.cliente}</h4>
//                 <p className="text-sm text-gray-600 mb-3">{datos.empresa}</p>
//                 <div className="space-y-2">
//                   <div className="flex items-center gap-2 text-sm text-gray-700">
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
//                     </svg>
//                     <span>{datos.telefono}</span>
//                   </div>
//                   <div className="flex items-center gap-2 text-sm text-gray-700">
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//                     </svg>
//                     <span>{datos.correo}</span>
//                   </div>
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => setMostrarModalClientes(true)}
//                 className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
//               >
//                 Cambiar Cliente
//               </button>
//             </div>
//           </div>
//         ) : (
//           <div className="text-center py-12">
//             <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//             </svg>
//             <h3 className="text-xl font-semibold text-gray-700 mb-2">
//               Selecciona un cliente para continuar
//             </h3>
//             <p className="text-gray-500 mb-6">
//               Busca un cliente existente para crear el pedido
//             </p>
//             <button
//               type="button"
//               onClick={() => setMostrarModalClientes(true)}
//               className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
//             >
//               <svg 
//                 className="w-5 h-5" 
//                 fill="none" 
//                 stroke="currentColor" 
//                 viewBox="0 0 24 24"
//               >
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//               </svg>
//               Buscar Cliente
//             </button>
//           </div>
//         )}

//         <div className="flex justify-end gap-3 mt-6">
//           <button
//             type="button"
//             onClick={onCancel}
//             className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
//           >
//             Cancelar
//           </button>
//           <button
//             type="button"
//             onClick={handleSiguiente}
//             disabled={!datos.cliente}
//             className={`px-6 py-2 rounded-lg ${
//               datos.cliente
//                 ? "bg-blue-600 text-white hover:bg-blue-700"
//                 : "bg-gray-400 cursor-not-allowed text-gray-200"
//             }`}
//           >
//             Siguiente
//           </button>
//         </div>
//       </div>

//       {/* PASO 2 - Productos */}
//       <div className={paso === 2 ? "block" : "hidden"}>
//         <h3 className="text-lg font-semibold text-gray-900 mb-6">
//           Agregar Productos
//         </h3>

//         {/* Selector de modo */}
//         <div className="mb-6 flex gap-4 bg-gray-100 p-1 rounded-lg w-fit">
//           <button
//             type="button"
//             onClick={() => setModoProducto("registrado")}
//             className={`px-6 py-2 rounded-md font-medium transition-all ${
//               modoProducto === "registrado"
//                 ? "bg-white text-blue-600 shadow"
//                 : "text-gray-600 hover:text-gray-900"
//             }`}
//           >
//             Producto Registrado
//           </button>
//           <button
//             type="button"
//             onClick={() => setModoProducto("nuevo")}
//             className={`px-6 py-2 rounded-md font-medium transition-all ${
//               modoProducto === "nuevo"
//                 ? "bg-white text-blue-600 shadow"
//                 : "text-gray-600 hover:text-gray-900"
//             }`}
//           >
//             Producto Nuevo
//           </button>
//         </div>

//         {/* Formulario de producto */}
//         <div className="bg-gray-50 p-6 rounded-lg mb-4 relative">
//           {/* MODO: PRODUCTO REGISTRADO */}
//           {modoProducto === "registrado" && (
//             <div className="space-y-4">
//               <div className="relative">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Seleccionar Producto
//                 </label>
//                 <div className="flex gap-2">
//                   <input
//                     type="text"
//                     value={productoRegistradoSeleccionado}
//                     readOnly
//                     placeholder="Selecciona un producto registrado"
//                     className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white cursor-pointer"
//                     onClick={() => setMostrarDropdownProductosRegistrados(!mostrarDropdownProductosRegistrados)}
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setMostrarDropdownProductosRegistrados(!mostrarDropdownProductosRegistrados)}
//                     className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
//                   >
//                     <svg 
//                       className={`w-5 h-5 transition-transform ${mostrarDropdownProductosRegistrados ? 'rotate-180' : ''}`}
//                       fill="none" 
//                       stroke="currentColor" 
//                       viewBox="0 0 24 24"
//                     >
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                     </svg>
//                   </button>
//                 </div>
                
//                 {mostrarDropdownProductosRegistrados && (
//                   <ul className="absolute w-full bg-white border border-gray-300 mt-1 max-h-60 overflow-auto rounded-lg shadow-lg z-20">
//                     {PRODUCTOS_REGISTRADOS.map((prod) => (
//                       <li
//                         key={prod.id}
//                         onClick={() => seleccionarProductoRegistrado(prod)}
//                         className="px-4 py-3 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
//                       >
//                         <p className="font-medium text-gray-900">{prod.nombreCompleto}</p>
//                         <p className="text-xs text-gray-500 mt-1">
//                           {prod.tipoProducto} • {prod.material} • Calibre {prod.calibre}
//                         </p>
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//               </div>

//               {productoRegistradoSeleccionado && (
//                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                   <p className="text-sm text-gray-700">
//                     <span className="font-semibold">Material:</span> {productoActual.material}
//                   </p>
//                   <p className="text-sm text-gray-700">
//                     <span className="font-semibold">Calibre:</span> {productoActual.calibre}
//                   </p>
//                   <p className="text-sm text-gray-700">
//                     <span className="font-semibold">Medidas:</span> {productoActual.medidasFormateadas}
//                   </p>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* MODO: PRODUCTO NUEVO - Reutiliza SelectorProducto */}
//           {modoProducto === "nuevo" && (
//             <SelectorProducto
//               onProductoChange={handleProductoNuevoChange}
//               mostrarFigura={true}
//             />
//           )}

//           {/* Campos comunes para ambos modos */}
//           {(productoRegistradoSeleccionado || datosProductoNuevo.nombreCompleto) && (
//             <div className="mt-6 space-y-4 border-t pt-4">
//               {/* Tintas y Caras */}
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Tintas
//                   </label>
//                   <input
//                     type="number"
//                     value={productoActual.tintas}
//                     onChange={(e) =>
//                       setProductoActual({
//                         ...productoActual,
//                         tintas: Number(e.target.value),
//                       })
//                     }
//                     min="1"
//                     max="8"
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
//                   />
//                 </div>

//                 <div className="relative">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Caras
//                   </label>
//                   <div className="flex gap-2">
//                     <input
//                       type="text"
//                       value={`${productoActual.caras} cara${productoActual.caras > 1 ? 's' : ''}`}
//                       readOnly
//                       className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white cursor-pointer"
//                       onClick={() => setMostrarDropdownCaras(!mostrarDropdownCaras)}
//                     />
//                     <button
//                       type="button"
//                       onClick={() => setMostrarDropdownCaras(!mostrarDropdownCaras)}
//                       className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//                     >
//                       <svg 
//                         className={`w-5 h-5 transition-transform ${mostrarDropdownCaras ? 'rotate-180' : ''}`}
//                         fill="none" 
//                         stroke="currentColor" 
//                         viewBox="0 0 24 24"
//                       >
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                       </svg>
//                     </button>
//                   </div>
//                   {mostrarDropdownCaras && (
//                     <ul className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg z-20">
//                       <li
//                         onClick={() => {
//                           setProductoActual({ ...productoActual, caras: 1 });
//                           setMostrarDropdownCaras(false);
//                         }}
//                         className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900"
//                       >
//                         1 cara
//                       </li>
//                       <li
//                         onClick={() => {
//                           setProductoActual({ ...productoActual, caras: 2 });
//                           setMostrarDropdownCaras(false);
//                         }}
//                         className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900"
//                       >
//                         2 caras
//                       </li>
//                     </ul>
//                   )}
//                 </div>
//               </div>

//               {/* Cantidades */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Cantidades
//                 </label>
//                 <div className="grid grid-cols-3 gap-3">
//                   {productoActual.cantidades.map((cantidad, index) => (
//                     <input
//                       key={index}
//                       type="number"
//                       min="0"
//                       value={cantidad === 0 ? "" : cantidad}
//                       onChange={(e) => handleCantidadChange(index, e.target.value)}
//                       className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
//                       placeholder={`Cantidad ${index + 1}`}
//                     />
//                   ))}
//                 </div>
//               </div>

//               {/* Precios */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Precios unitarios (calculados automáticamente)
//                 </label>
//                 <div className="grid grid-cols-3 gap-3">
//                   {productoActual.precios.map((precio, index) => (
//                     <div key={index} className="relative">
//                       <input
//                         type="text"
//                         value={precio === 0 ? "" : `$${precio.toFixed(4)}`}
//                         onChange={(e) => {
//                           const value = e.target.value.replace('$', '');
//                           handlePrecioChange(index, value);
//                         }}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
//                         placeholder="Auto"
//                       />
//                       {productoActual.cantidades[index] > 0 && (
//                         <div className="text-xs text-gray-500 mt-1">
//                           {(productoActual.cantidades[index] / 88.652).toFixed(2)} kg
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <button
//                 type="button"
//                 onClick={handleAgregarProducto}
//                 className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
//               >
//                 + Agregar Producto
//               </button>
//             </div>
//           )}
//         </div>

//         {/* Lista de productos */}
//         {datos.productos.length > 0 && (
//           <div className="mb-4">
//             <h4 className="text-sm font-semibold text-gray-700 mb-2">
//               Productos agregados:
//             </h4>
//             <div className="space-y-2">
//               {datos.productos.map((prod, index) => (
//                 <div
//                   key={index}
//                   className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
//                 >
//                   <div className="flex-1">
//                     <p className="font-medium text-gray-900">{prod.nombre}</p>
//                     <p className="text-sm text-gray-500">
//                       Material: {prod.material} | Calibre: {prod.calibre} | Tintas: {prod.tintas} | Caras: {prod.caras}
//                     </p>
//                     {prod.cantidades.map((cant, i) =>
//                       cant > 0 ? (
//                         <p key={i} className="text-sm text-gray-600">
//                           {cant} x ${prod.precios[i].toFixed(2)} = $
//                           {(cant * prod.precios[i]).toFixed(2)}
//                         </p>
//                       ) : null
//                     )}
//                   </div>
//                   <button
//                     type="button"
//                     onClick={() => handleEliminarProducto(index)}
//                     className="text-red-600 hover:text-red-800 ml-4"
//                   >
//                     ✕
//                   </button>
//                 </div>
//               ))}
//             </div>

//             <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//               <p className="text-lg font-bold text-gray-900">
//                 Total: ${calcularTotal().toFixed(2)}
//               </p>
//             </div>
//           </div>
//         )}

//         {/* Observaciones */}
//         <div className="mb-4">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Observaciones (Opcional)
//           </label>
//           <textarea
//             name="observaciones"
//             value={datos.observaciones}
//             onChange={handleInputChange}
//             rows={3}
//             className="w-full px-4 py-2 border border-gray-300 rounded-lg
//                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
//                       text-gray-900 bg-white placeholder-gray-400"
//             placeholder="Notas adicionales sobre el pedido..."
//           />
//         </div>

//         <div className="flex justify-end gap-3 mt-6">
//           <button
//             type="button"
//             onClick={handleAtras}
//             className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
//           >
//             Atrás
//           </button>
//           <button
//             type="button"
//             onClick={handleSubmit}
//             disabled={datos.productos.length === 0}
//             className={`px-6 py-2 rounded-lg font-semibold ${
//               datos.productos.length === 0
//                 ? "bg-gray-400 cursor-not-allowed text-gray-200"
//                 : "bg-green-600 text-white hover:bg-green-700"
//             }`}
//           >
//             Crear Pedido
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }