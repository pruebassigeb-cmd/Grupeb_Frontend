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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública - Login */}
          <Route path="/" element={<Login />} />

          {/* Rutas protegidas - Requieren autenticación */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute>
                <Usuarios />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/plastico"
            element={
              <ProtectedRoute>
                <Plastico />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/cotizar"
            element={
              <ProtectedRoute>
                <Cotizar />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/clientes"
            element={
              <ProtectedRoute>
                <Clientes />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/precioplastico"
            element={
              <ProtectedRoute>
                <PrecioPlastico />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/diseno"
            element={
              <ProtectedRoute>
                <Diseno />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/anticipolicacion"
            element={
              <ProtectedRoute>
                <AnticipoLiquidacion />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/seguimiento"
            element={
              <ProtectedRoute>
                <Seguimiento />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/pedido"
            element={
              <ProtectedRoute>
                <Pedido />
              </ProtectedRoute>
            }
          />

          <Route
           path="/estadocuenta" 
           element={
            <ProtectedRoute>
              <EstadoCuenta />
            </ProtectedRoute>
} />

          {/* Redirigir cualquier ruta no encontrada al login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;