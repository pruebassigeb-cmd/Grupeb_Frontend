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

// ==========================
// PERMISOS POR PÁGINA
// Deben coincidir exactamente con los nombres en la tabla privilegios
// ==========================
const PERMISOS = {
  usuarios:     "Crear/Editar/Eliminar Usuarios",
  clientes:     "Crear/Editar/Eliminar Clientes",
  plastico:     "Dar de alta productos",
  cotizar:      "Crear/Editar/Aprobar/Rechazar Cotizaciones",
  pedido:       "Crear/Editar/Eliminar Pedidos",
  diseno:       "Editar Diseño",
  anticipo:     "Editar Anticipo y Liquidacion",
  precios:      "Modificar Catalogo de precios",
  estadoCuenta: "Editar Anticipo y Liquidacion",
} as const;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública */}
          <Route path="/" element={<Login />} />

          {/* Sin acceso — página amigable cuando no tiene permiso */}
          <Route path="/sin-acceso" element={<SinAcceso />} />

          {/* Home — cualquier usuario autenticado */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Seguimiento — cualquier usuario autenticado */}
          <Route
            path="/seguimiento"
            element={
              <ProtectedRoute>
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

          {/* Pedidos */}
          <Route
            path="/pedido"
            element={
              <ProtectedRoute permiso={PERMISOS.pedido}>
                <Pedido />
              </ProtectedRoute>
            }
          />

          {/* Diseño */}
          <Route
            path="/diseno"
            element={
              <ProtectedRoute permiso={PERMISOS.diseno}>
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

          {/* Ruta no encontrada */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;