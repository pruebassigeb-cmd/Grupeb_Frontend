import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Usuarios from "./pages/Usuarios";
import Plastico from "./pages/Plastico";
import Cotizar from "./pages/Cotizar";
import Clientes from "./pages/Clientes";
import PrecioPlastico from "./pages/PrecioPlastico";
import Diseno from "./pages/Diseno";
import AnticipoLiquidacion from "./pages/AnticipoLiquidacion";
import Seguimiento from "./pages/Seguimiento";
import Pedido from "./pages/Pedido";
import EstadoCuenta from "./components/EstadoCuenta.tsx";
import SinAcceso from "./pages/SinAcceso";
import EditarPedido from "./components/EditarPedido.tsx";
import Envios from "./pages/Envios";
import GestorArchivos from "./components/GestorArchivos";
import GestorBackups from "./components/GestorBackups.tsx";
import ProveedoresPage from "./pages/ProveedoresPage";
import Papel from "./pages/papel/Papel";
import Catalogos from "./pages/papel/catalogos.tsx";
// import Expo from "./pages/expo/expo.tsx";
import EditarPedidoPapel from "./pages/EditarPedidoPapel";

const PERMISOS = {
  usuarios: "Crear/Editar/Eliminar Usuarios",
  clientes: "Crear/Editar/Eliminar Clientes",
  plastico: "Dar de alta productos",
  cotizar: "Crear/Editar/Aprobar/Rechazar Cotizaciones",
  pedido: "Crear/Editar/Eliminar Pedidos",
  diseno: "Editar Diseño",
  anticipo: "Editar Anticipo y Liquidacion",
  precios: "Modificar Catalogo de precios",
  estadoCuenta: "Editar Anticipo y Liquidacion",
} as const;

const PERMISOS_SEGUIMIENTO = [
  "Ver Seguimiento",
  "Acceso Planta",
  "Operar Extrusión",
  "Operar Impresión",
  "Operar Bolseo",
  "Operar Asa Flexible",
];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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

          {/* Cotizaciones */}
          <Route
            path="/cotizar"
            element={
              <ProtectedRoute permiso={PERMISOS.cotizar}>
                <Cotizar />
              </ProtectedRoute>
            }
          />

          {/* Pedidos — lista */}
          <Route
            path="/pedido"
            element={
              <ProtectedRoute permiso={PERMISOS.pedido}>
                <Pedido />
              </ProtectedRoute>
            }
          />

          {/* Pedidos — editar */}
          <Route
            path="/pedido/:noPedido/editar"
            element={
              <ProtectedRoute permiso={PERMISOS.pedido}>
                <EditarPedido />
              </ProtectedRoute>
            }
          />

          {/* Pedidos de papel — editar */}
          <Route
            path="/pedido/:noPedido/editar-papel"
            element={
              <ProtectedRoute permiso={PERMISOS.pedido}>
                <EditarPedidoPapel />
              </ProtectedRoute>
            }
          />

          {/* Diseño */}
          <Route
            path="/diseno"
            element={
              <ProtectedRoute permisoOr={["Editar Diseño", "Orden de Diseño"]}>
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

          {/* Catálogo de precios */}
          <Route
            path="/precioplastico"
            element={
              <ProtectedRoute permiso={PERMISOS.precios}>
                <PrecioPlastico />
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
              <ProtectedRoute permiso="Gestionar Envios">
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
              <ProtectedRoute>
                <Papel />
              </ProtectedRoute>
            }
          />

          {/* <Route
            path="/expo"
            element={
              <ProtectedRoute>
                <Expo />
              </ProtectedRoute>
            }
          /> */}

          <Route
            path="/catalogos"
            element={
              <ProtectedRoute permiso={PERMISOS.plastico}>
                <Catalogos />
              </ProtectedRoute>
            }
          />

          {/* Proveedores */}
          <Route
            path="/proveedores"
            element={
              <ProtectedRoute permiso="Gestionar Proveedores">
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
