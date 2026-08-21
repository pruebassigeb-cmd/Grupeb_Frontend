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
import Tickets from "./pages/tickets/Tickets";

// Las rutas ya no listan privilegio por privilegio: usan `permisoPantalla`
// con el prefijo de la pantalla, así que CUALQUIER privilegio de esa pantalla
// la abre y no hay que actualizar nada al agregar uno nuevo. Las listas que
// vivían aquí se quedaban cortas — p. ej. Seguimiento solo nombraba los 4
// procesos de plástico, así que un operador de papel no podía entrar.
//
// Única excepción: Reportes de Correo, que a propósito sigue pidiendo el
// privilegio de administrar usuarios (decisión de Jose, 2026-08-14).
const PERMISO_REPORTES_CORREO = "seguridad.usuarios.gestionar";

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

          <Route
  path="/tickets"
  element={
    <ProtectedRoute permisoPantalla="tickets.">
      <Tickets />
    </ProtectedRoute>
  }
/>

          {/* Seguimiento */}
          <Route
            path="/seguimiento"
            element={
              <ProtectedRoute permisoPantalla="produccion.">
                <Seguimiento />
              </ProtectedRoute>
            }
          />

          {/* Usuarios */}
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute permisoPantalla="seguridad.usuarios.">
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
    <ProtectedRoute permiso={PERMISO_REPORTES_CORREO}>
      <ReportesCorreo />
    </ProtectedRoute>
  }
/>

          {/* Clientes */}
          <Route
            path="/clientes"
            element={
              <ProtectedRoute permisoPantalla="clientes.">
                <Clientes />
              </ProtectedRoute>
            }
          />

          {/* Productos plástico */}
          <Route
            path="/plastico"
            element={
              <ProtectedRoute permisoPantalla="productos.plastico.">
                <Plastico />
              </ProtectedRoute>
            }
          />

          {/* Cotizaciones — editar (antes de aprobar) */}
          <Route
            path="/cotizar/:noCotizacion/editar"
            element={
              <ProtectedRoute permisoPantalla="cotizacion.">
                <EditarCotizacionCompleta />
              </ProtectedRoute>
            }
          />

          {/* Cotizaciones de papel — editar (antes de aprobar) */}
          <Route
            path="/cotizar/:noCotizacion/editar-papel"
            element={
              <ProtectedRoute permisoPantalla="cotizacion.">
                <EditarCotizacionPapelCompleta />
              </ProtectedRoute>
            }
          />

          {/* Cotizaciones */}
          <Route
            path="/cotizar"
            element={
              <ProtectedRoute permisoPantalla="cotizacion.">
                <Cotizar />
              </ProtectedRoute>
            }
          />

          {/* Pedidos — lista */}
          <Route
            path="/pedido"
            element={
              <ProtectedRoute permisoPantalla="pedido.">
                <Pedido />
              </ProtectedRoute>
            }
          />

          {/* Pedidos — editar */}
          <Route
            path="/pedido/:noPedido/editar"
            element={
              <ProtectedRoute permisoPantalla="pedido.">
                <EditarPedido />
              </ProtectedRoute>
            }
          />

          {/* Pedidos de papel — editar */}
          <Route
            path="/pedido/:noPedido/editar-papel"
            element={
              <ProtectedRoute permisoPantalla="pedido.">
                <EditarPedidoPapel />
              </ProtectedRoute>
            }
          />

          {/* Diseño */}
          <Route
            path="/diseno"
            element={
              <ProtectedRoute permisoPantalla="diseno.">
                <Diseno />
              </ProtectedRoute>
            }
          />

          {/* Anticipo y Liquidación */}
          <Route
            path="/anticipoliquidacion"
            element={
              <ProtectedRoute permisoPantalla="cobranza.">
                <AnticipoLiquidacion />
              </ProtectedRoute>
            }
          />

          {/* Catálogo de precios plástico */}
          <Route
            path="/precioplastico"
            element={
              <ProtectedRoute permisoPantalla="precios.">
                <PrecioPlastico />
              </ProtectedRoute>
            }
          />

          {/* Catálogo de precios de acabados de papel */}
          <Route
            path="/precios-acabados-papel"
            element={
              <ProtectedRoute permisoPantalla="precios.">
                <PreciosAcabadosPapel />
              </ProtectedRoute>
            }
          />

          {/* Merma de producción — papel */}
          <Route
            path="/merma-papel"
            element={
              <ProtectedRoute permisoPantalla="precios.">
                <MermaPapel />
              </ProtectedRoute>
            }
          />

          {/* Tipo de cambio USD/MXN */}
          <Route
            path="/tipo-cambio"
            element={
              <ProtectedRoute permisoPantalla="precios.">
                <TipoCambio />
              </ProtectedRoute>
            }
          />

          {/* Estado de cuenta */}
          <Route
            path="/estadocuenta"
            element={
              <ProtectedRoute permisoPantalla="cobranza.">
                <EstadoCuenta />
              </ProtectedRoute>
            }
          />

          {/* Envíos */}
          <Route
            path="/envios"
            element={
              <ProtectedRoute permisoPantalla="envios.">
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
              <ProtectedRoute permisoPantalla="productos.papel.">
                <Papel />
              </ProtectedRoute>
            }
          />

          {/* Cotizador Expo — igual que /cotizador-libre: la ruta no pedía
              ningún permiso, así que cualquiera con sesión entraba por URL.
              Ahora exige el privilegio de la pantalla, en línea con el menú. */}
          <Route
            path="/expo"
            element={
              <ProtectedRoute permisoPantalla="externos.expo.">
                <Expo />
              </ProtectedRoute>
            }
          />

          {/* Cotizador Interactivo — página pública/cliente, sin Dashboard/sidebar
              (mismo patrón que /expo: la decisión de layout vive dentro del
              componente de página, no aquí).

              CORREGIDO (2026-08-14): la ruta no pedía NINGÚN permiso, así que
              cualquiera con sesión entraba escribiendo la URL — solo el menú
              la escondía. Ahora exige privilegio de la pantalla, igual que el
              Sidebar, para que menú y acceso digan lo mismo. La cuenta
              compartida del kiosco pasa por sus 5 privilegios de base. */}
          <Route
            path="/cotizador-libre"
            element={
              <ProtectedRoute permisoPantalla="externos.cotizador_libre.">
                <CotizadorLibre />
              </ProtectedRoute>
            }
          />

          <Route
            path="/catalogos"
            element={
              <ProtectedRoute permisoPantalla="catalogos.">
                <Catalogos />
              </ProtectedRoute>
            }
          />

          {/* Proveedores */}
          <Route
            path="/proveedores"
            element={
              <ProtectedRoute permisoPantalla="proveedores.">
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