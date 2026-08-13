import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Usuarios from "./pages/Usuarios";
import Roles from "./pages/Roles";
import Plastico from "./pages/plastico/Plastico";
import Cotizar from "./pages/Cotizar";
import Clientes from "./pages/Clientes";
import PrecioPlastico from "./pages/plastico/PrecioPlastico";
import TipoCambio from "./pages/TipoCambio";
import Diseno from "./pages/diseno/Diseno";
import AnticipoLiquidacion from "./pages/anticipoLiquidacion/AnticipoLiquidacion";
import Seguimiento from "./pages/produccion/Seguimiento";
import Pedido from "./pages/Pedido";
import EstadoCuenta from "./pages/anticipoLiquidacion/EstadoCuenta";
import SinAcceso from "./pages/SinAcceso";
import EditarPedido from "./pages/plastico/EditarPedido";
import Envios from "./pages/envio/Envios";
import GestorArchivos from "./pages/archivos/GestorArchivos";
import GestorBackups from "./pages/archivos/GestorBackups";
import ProveedoresPage from "./pages/proveedores/ProveedoresPage";
import Papel from "./pages/papel/Papel";
import Catalogos from "./pages/papel/catalogos.tsx";
import PreciosAcabadosPapel from "./pages/papel/PreciosAcabadosPapel";
import MermaPapel from "./pages/papel/MermaPapel";
import Expo from "./pages/expo/expo.tsx";
import EditarPedidoPapel from "./pages/papel/EditarPedidoPapel";
import EditarCotizacionCompleta from "./pages/plastico/EditarCotizacionCompleta.tsx";
import EditarCotizacionPapelCompleta from "./pages/papel/EditarCotizacionPapelCompleta";
import PWAUpdatePrompt from "./components/pwa/PWAUpdatePrompt";
import OfflineBanner from "./components/pwa/OfflineBanner";
import SyncStatusIndicator from "./components/pwa/SyncStatusIndicator";
import ConnectivityToast from "./components/pwa/ConnectivityToast";
import "./offline/expoOutboxHandlers";
import ReportesCorreo from "./pages/ReportesCorreo";
import CotizadorLibre from "./pages/cotizadorLibre/CotizadorLibre";


// Fase 6: valores clave, no el texto visible del privilegio — así
// renombrar la etiqueta desde la pantalla de Roles no rompe ninguna ruta.
const PERMISOS = {
  usuarios: "seguridad.usuarios.gestionar",
  clientes: "clientes.gestionar",
  plastico: "productos.plastico.gestionar",
  // Split en la fase 0: crear/editar y aprobar/rechazar quedaron separados.
  // El acceso a la pantalla se conserva para cualquiera de los dos.
  cotizar: "cotizacion.crear_editar",
  cotizarAprobar: "cotizacion.aprobar",
  pedido: "pedido.crear_editar",
  pedidoEliminar: "pedido.eliminar",
  diseno: "diseno.editar",
  anticipo: "cobranza.anticipo_liquidacion.gestionar",
  precios: "precios.gestionar",
  estadoCuenta: "cobranza.anticipo_liquidacion.gestionar",
  papel: "productos.papel.gestionar",
  catalogos: "catalogos.gestionar",
} as const;

const PERMISOS_SEGUIMIENTO = [
  "produccion.seguimiento.ver",
  "produccion.acceso_planta",
  "produccion.plastico.extrusion.operar",
  "produccion.plastico.impresion.operar",
  "produccion.plastico.bolseo.operar",
  "produccion.plastico.asa_flexible.operar",
];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PWAUpdatePrompt />
        <OfflineBanner />
        <SyncStatusIndicator />
        <ConnectivityToast />
        <Routes>
          {/* Pública */}
          <Route path="/" element={<Login />} />

          {/* Sin acceso */}
          <Route path="/sin-acceso" element={<SinAcceso />} />

          {/* Home */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Seguimiento */}
          <Route
            path="/seguimiento"
            element={
              <ProtectedRoute permisoOr={PERMISOS_SEGUIMIENTO}>
                <Seguimiento />
              </ProtectedRoute>
            }
          />

          {/* Usuarios */}
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute permiso={PERMISOS.usuarios}>
                <Usuarios />
              </ProtectedRoute>
            }
          />

          {/* Roles y Privilegios */}
          <Route
            path="/roles"
            element={
              <ProtectedRoute permisoOr={["seguridad.roles.ver", "seguridad.roles.gestionar", "seguridad.privilegios.gestionar"]}>
                <Roles />
              </ProtectedRoute>
            }
          />

           {/* dentro de <Routes>, junto a la ruta de /usuarios: */}
<Route
  path="/reportes-correo"
  element={
    <ProtectedRoute permiso={PERMISOS.usuarios}>
      <ReportesCorreo />
    </ProtectedRoute>
  }
/>

          {/* Clientes */}
          <Route
            path="/clientes"
            element={
              <ProtectedRoute permiso={PERMISOS.clientes}>
                <Clientes />
              </ProtectedRoute>
            }
          />

          {/* Productos plástico */}
          <Route
            path="/plastico"
            element={
              <ProtectedRoute permiso={PERMISOS.plastico}>
                <Plastico />
              </ProtectedRoute>
            }
          />

          {/* Cotizaciones — editar (antes de aprobar) */}
          <Route
            path="/cotizar/:noCotizacion/editar"
            element={
              <ProtectedRoute permisoOr={[PERMISOS.cotizar, PERMISOS.cotizarAprobar]}>
                <EditarCotizacionCompleta />
              </ProtectedRoute>
            }
          />

          {/* Cotizaciones de papel — editar (antes de aprobar) */}
          <Route
            path="/cotizar/:noCotizacion/editar-papel"
            element={
              <ProtectedRoute permisoOr={[PERMISOS.cotizar, PERMISOS.cotizarAprobar]}>
                <EditarCotizacionPapelCompleta />
              </ProtectedRoute>
            }
          />

          {/* Cotizaciones */}
          <Route
            path="/cotizar"
            element={
              <ProtectedRoute permisoOr={[PERMISOS.cotizar, PERMISOS.cotizarAprobar]}>
                <Cotizar />
              </ProtectedRoute>
            }
          />

          {/* Pedidos — lista */}
          <Route
            path="/pedido"
            element={
              <ProtectedRoute permisoOr={[PERMISOS.pedido, PERMISOS.pedidoEliminar]}>
                <Pedido />
              </ProtectedRoute>
            }
          />

          {/* Pedidos — editar */}
          <Route
            path="/pedido/:noPedido/editar"
            element={
              <ProtectedRoute permisoOr={[PERMISOS.pedido, PERMISOS.pedidoEliminar]}>
                <EditarPedido />
              </ProtectedRoute>
            }
          />

          {/* Pedidos de papel — editar */}
          <Route
            path="/pedido/:noPedido/editar-papel"
            element={
              <ProtectedRoute permisoOr={[PERMISOS.pedido, PERMISOS.pedidoEliminar]}>
                <EditarPedidoPapel />
              </ProtectedRoute>
            }
          />

          {/* Diseño */}
          <Route
            path="/diseno"
            element={
              <ProtectedRoute permisoOr={["diseno.editar", "diseno.orden"]}>
                <Diseno />
              </ProtectedRoute>
            }
          />

          {/* Anticipo y Liquidación */}
          <Route
            path="/anticipolicacion"
            element={
              <ProtectedRoute permiso={PERMISOS.anticipo}>
                <AnticipoLiquidacion />
              </ProtectedRoute>
            }
          />

          {/* Catálogo de precios plástico */}
          <Route
            path="/precioplastico"
            element={
              <ProtectedRoute permiso={PERMISOS.precios}>
                <PrecioPlastico />
              </ProtectedRoute>
            }
          />

          {/* Catálogo de precios de acabados de papel */}
          <Route
            path="/precios-acabados-papel"
            element={
              <ProtectedRoute permiso={PERMISOS.precios}>
                <PreciosAcabadosPapel />
              </ProtectedRoute>
            }
          />

          {/* Merma de producción — papel */}
          <Route
            path="/merma-papel"
            element={
              <ProtectedRoute permiso={PERMISOS.precios}>
                <MermaPapel />
              </ProtectedRoute>
            }
          />

          {/* Tipo de cambio USD/MXN */}
          <Route
            path="/tipo-cambio"
            element={
              <ProtectedRoute permiso={PERMISOS.precios}>
                <TipoCambio />
              </ProtectedRoute>
            }
          />

          {/* Estado de cuenta */}
          <Route
            path="/estadocuenta"
            element={
              <ProtectedRoute permiso={PERMISOS.estadoCuenta}>
                <EstadoCuenta />
              </ProtectedRoute>
            }
          />

          {/* Envíos */}
          <Route
            path="/envios"
            element={
              <ProtectedRoute permiso="envios.gestionar">
                <Envios />
              </ProtectedRoute>
            }
          />

          {/* Archivos */}
          <Route
            path="/archivos"
            element={
              <ProtectedRoute>
                <GestorArchivos />
              </ProtectedRoute>
            }
          />
          

          {/* Backups BD — solo admins (accesoTotal), protección extra por código dentro del componente */}
          <Route
            path="/backups"
            element={
              <ProtectedRoute>
                <GestorBackups />
              </ProtectedRoute>
            }
          />

          <Route
            path="/papel"
            element={
              <ProtectedRoute permiso={PERMISOS.papel}>
                <Papel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/expo"
            element={
              <ProtectedRoute>
                <Expo />
              </ProtectedRoute>
            }
          />

          {/* Cotizador Interactivo — página pública/cliente, sin Dashboard/sidebar
              (mismo patrón que /expo: la decisión de layout vive dentro del
              componente de página, no aquí). Usa el rol dedicado
              "CotizadorLibre" o el acceso de staff normal. */}
          <Route
            path="/cotizador-libre"
            element={
              <ProtectedRoute>
                <CotizadorLibre />
              </ProtectedRoute>
            }
          />

          <Route
            path="/catalogos"
            element={
              <ProtectedRoute permiso={PERMISOS.catalogos}>
                <Catalogos />
              </ProtectedRoute>
            }
          />

          {/* Proveedores */}
          <Route
            path="/proveedores"
            element={
              <ProtectedRoute permiso="proveedores.gestionar">
                <ProveedoresPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;