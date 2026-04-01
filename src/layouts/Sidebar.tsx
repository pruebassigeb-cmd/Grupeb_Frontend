import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/grupeblanco.png";

interface DashboardProps {
  children: ReactNode;
}

interface MenuItem {
  name:      string;
  path?:     string;
  permiso?:  string;
  permisoOr?: string[]; // visible si tiene CUALQUIERA de estos permisos
  subItems:  { name: string; path: string; permiso?: string }[];
}

export default function Dashboard({ children }: DashboardProps) {
  const [open,          setOpen]          = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const navigate        = useNavigate();
  const location        = useLocation();
  const { user, logout, tienePermiso } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const menuItems: MenuItem[] = [
    {
      name:    "Usuarios",
      path:    "/usuarios",
      permiso: "Crear/Editar/Eliminar Usuarios",
      subItems: [],
    },
    {
      name:    "Clientes",
      path:    "/clientes",
      permiso: "Crear/Editar/Eliminar Clientes",
      subItems: [],
    },
    {
      name:    "Dar alta productos",
      permiso: "Dar de alta productos",
      subItems: [
        { name: "Plástico", path: "/plastico", permiso: "Dar de alta productos" },
      ],
    },
    {
      name:    "Cotización",
      path:    "/cotizar",
      permiso: "Crear/Editar/Aprobar/Rechazar Cotizaciones",
      subItems: [],
    },
    {
      name:    "Pedido",
      path:    "/pedido",
      permiso: "Crear/Editar/Eliminar Pedidos",
      subItems: [],
    },
    {
      name:    "Diseño",
      path:    "/diseno",
      permiso: "Editar Diseño",
      subItems: [],
    },
    {
      // Seguimiento — visible para acceso_total, operadores de planta,
      // o quien tenga el privilegio "Ver Seguimiento"
      name:      "Seguimiento",
      path:      "/seguimiento",
      permisoOr: [
        "Ver Seguimiento",
        "Acceso Planta",
        "Operar Extrusión",
        "Operar Impresión",
        "Operar Bolseo",
        "Operar Asa Flexible",
      ],
      subItems: [],
    },
    {
      name:    "Anticipo / Liquidación",
      path:    "/anticipolicacion",
      permiso: "Editar Anticipo y Liquidacion",
      subItems: [],
    },
    {
      name:    "Precios productos",
      permiso: "Modificar Catalogo de precios",
      subItems: [
        { name: "Plástico", path: "/precioplastico", permiso: "Modificar Catalogo de precios" },
      ],
    },
  ];

  // Filtrar items según permisos del usuario
  const menuFiltrado = menuItems.filter((item) => {
    if (!item.permiso && !item.permisoOr) return true;
    if (user?.acceso_total) return true;
    if (item.permiso && tienePermiso(item.permiso)) return true;
    if (item.permisoOr) return item.permisoOr.some((p) => tienePermiso(p));
    return false;
  });

  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subItems.some((sub) => location.pathname.startsWith(sub.path))) {
        setExpandedMenus((prev) =>
          prev.includes(item.name) ? prev : [...prev, item.name]
        );
      }
    });
  }, [location.pathname]);

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuName)
        ? prev.filter((n) => n !== menuName)
        : [...prev, menuName]
    );
  };

  const isActive = (path?: string) =>
    path && location.pathname.startsWith(path);

  const renderMenuItem = (item: MenuItem) => {
    const hasSub      = item.subItems.length > 0;
    const expanded    = expandedMenus.includes(item.name);
    const activeParent =
      (item.path && isActive(item.path)) ||
      item.subItems.some((s) => isActive(s.path));

    const subItemsFiltrados = item.subItems.filter((sub) => {
      if (!sub.permiso) return true;
      return tienePermiso(sub.permiso);
    });

    return (
      <div key={item.name}>
        <button
          onClick={() => {
            if (hasSub) toggleMenu(item.name);
            else if (item.path) {
              navigate(item.path);
              if (isMobile) setOpen(false);
            }
          }}
          className={`w-full text-left px-3 py-2 rounded transition flex justify-between
            ${activeParent
              ? "bg-slate-700 text-white font-semibold"
              : "text-slate-300 hover:bg-slate-700"
            }`}
        >
          <span>{item.name}</span>
          {hasSub && (
            <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
          )}
        </button>

        {hasSub && expanded && (
          <div className="ml-4 mt-1 space-y-1">
            {subItemsFiltrados.map((sub) => (
              <button
                key={sub.name}
                onClick={() => {
                  navigate(sub.path);
                  if (isMobile) setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition
                  ${isActive(sub.path)
                    ? "bg-slate-600 text-white"
                    : "text-slate-300 hover:bg-slate-600"
                  }`}
              >
                • {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const UserFooter = () => (
    <div className="border-t border-slate-700 p-4 mt-auto space-y-2">
      <div className="flex items-center gap-2 bg-slate-700 px-3 py-2 rounded text-white text-sm">
        👤{" "}
        <div>
          <p className="font-medium">{user?.nombre} {user?.apellido}</p>
          <p className="text-slate-400 text-xs">{user?.rol}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="w-full px-3 py-2 rounded bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition"
      >
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {isMobile && (
        <div
          onClick={() => setOpen(false)}
          className={`fixed inset-0 bg-black/50 transition-opacity duration-300
            ${open ? "opacity-100 z-40" : "opacity-0 pointer-events-none"}`}
        />
      )}

      {isMobile && (
        <aside
          className={`fixed inset-y-0 left-0 w-64 bg-slate-800 z-50
            transform transition-transform duration-300 ease-in-out
            ${open ? "translate-x-0" : "-translate-x-full"}
            flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-slate-700 flex justify-between">
            <img src={logo} alt="Grupeb" className="h-10 cursor-pointer"
              onClick={() => { navigate("/home"); setOpen(false); }} />
            <button onClick={() => setOpen(false)} className="text-white text-2xl">✕</button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {menuFiltrado.map(renderMenuItem)}
          </nav>
          <UserFooter />
        </aside>
      )}

      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 w-64 bg-slate-800 z-30 flex flex-col h-screen">
          <div className="p-4 border-b border-slate-700 cursor-pointer" onClick={() => navigate("/home")}>
            <img src={logo} className="h-10 mx-auto" />
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {menuFiltrado.map(renderMenuItem)}
          </nav>
          <UserFooter />
        </aside>
      )}

      <main className="flex-1 overflow-auto ml-0 md:ml-64">
        {isMobile && (
          <header className="sticky top-0 z-20 bg-white shadow">
            <div className="flex justify-between px-4 py-3">
              <button onClick={() => setOpen(true)} className="text-xl">☰</button>
              <h1 onClick={() => navigate("/home")} className="font-bold cursor-pointer">GRUPEB</h1>
              <div className="flex gap-2 bg-slate-200 px-3 py-2 rounded text-sm">
                👤 {user?.nombre}
              </div>
            </div>
          </header>
        )}
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}