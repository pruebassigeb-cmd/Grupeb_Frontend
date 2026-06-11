import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/grupeblanco.png";

interface DashboardProps {
  children: ReactNode;
}

interface MenuItem {
  name: string;
  icon: string;
  path?: string;
  permiso?: string;
  permisoOr?: string[];
  accesoTotal?: boolean;
  subItems: { name: string; path: string; permiso?: string }[];
}

interface FlyoutState {
  name: string;
  top: number;
}

export default function Dashboard({ children }: DashboardProps) {
  const [open, setOpen]             = useState(false);
  const [isMobile, setIsMobile]     = useState(false);
  const [collapsed, setCollapsed]   = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [flyout, setFlyout]         = useState<FlyoutState | null>(null);
  const flyoutRef                   = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
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

  // Cerrar flyout al click fuera
  useEffect(() => {
    if (!flyout) return;
    const handler = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyout(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [flyout]);

  // Cerrar flyout al navegar
  useEffect(() => { setFlyout(null); }, [location.pathname]);

  const menuItems: MenuItem[] = [
    {
      name: "Usuarios",
      icon: "👥",
      path: "/usuarios",
      permiso: "Crear/Editar/Eliminar Usuarios",
      subItems: [],
    },
    {
      name: "Clientes",
      icon: "🏢",
      path: "/clientes",
      permiso: "Crear/Editar/Eliminar Clientes",
      subItems: [],
    },
    {
      name: "Dar alta productos",
      icon: "📦",
      permiso: "Dar de alta productos",
      subItems: [
        { name: "Plástico", path: "/plastico", permiso: "Dar de alta productos" },
        { name: "Papel",    path: "/papel",    permiso: "Dar de alta productos" },
      ],
    },
    {
      name: "Cotización",
      icon: "📋",
      path: "/cotizar",
      permiso: "Crear/Editar/Aprobar/Rechazar Cotizaciones",
      subItems: [],
    },
    {
      name: "Pedido",
      icon: "🛒",
      path: "/pedido",
      permiso: "Crear/Editar/Eliminar Pedidos",
      subItems: [],
    },
    {
      name: "Diseño",
      icon: "🎨",
      path: "/diseno",
      permisoOr: ["Editar Diseño", "Orden de Diseño"],
      subItems: [],
    },
    {
      name: "Seguimiento",
      icon: "📊",
      path: "/seguimiento",
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
      name: "Envíos / Entregas",
      icon: "🚚",
      path: "/envios",
      permiso: "Gestionar Envios",
      subItems: [],
    },
    {
      name: "Anticipo / Liquidación",
      icon: "💰",
      path: "/anticipolicacion",
      permiso: "Editar Anticipo y Liquidación",
      subItems: [],
    },
    {
      name: "Precios productos",
      icon: "🏷️",
      permiso: "Modificar Catalogo de precios",
      subItems: [
        { name: "Plástico", path: "/precioplastico", permiso: "Modificar Catalogo de precios" },
      ],
    },
    {
      name: "Catálogos",
      icon: "📚",
      permiso: "Dar de alta productos",
      subItems: [
        { name: "Gestión de catálogos", path: "/catalogos", permiso: "Dar de alta productos" },
      ],
    },
    {
      name: "Archivos",
      icon: "🗂️",
      path: "/archivos",
      accesoTotal: true,
      subItems: [],
    },
    {
      name: "Backups BD",
      icon: "💾",
      path: "/backups",
      accesoTotal: true,
      subItems: [],
    },
    {
      name: "Gestor proveedores",
      icon: "🤝",
      path: "/proveedores",
      permiso: "Gestionar Proveedores",
      subItems: [],
    },
  ];

  const menuFiltrado = menuItems.filter((item) => {
    if (item.accesoTotal) return user?.acceso_total === true;
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
    const hasSub       = item.subItems.length > 0;
    const expanded     = expandedMenus.includes(item.name);
    const activeParent =
      (item.path && isActive(item.path)) ||
      item.subItems.some((s) => isActive(s.path));

    const subItemsFiltrados = item.subItems.filter((sub) => {
      if (!sub.permiso) return true;
      return tienePermiso(sub.permiso);
    });

    // ── COLAPSADO ────────────────────────────────────────────────────────────
    if (collapsed) {
      const isFlyoutActive = flyout?.name === item.name;

      return (
        <div key={item.name}>
          <button
            title={!hasSub ? item.name : undefined}
            onClick={(e) => {
              if (hasSub) {
                if (isFlyoutActive) {
                  setFlyout(null);
                } else {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setFlyout({ name: item.name, top: rect.top });
                }
              } else if (item.path) {
                navigate(item.path);
                setFlyout(null);
              }
            }}
            className={`
              w-full flex items-center justify-center py-2 rounded transition-colors
              ${activeParent || isFlyoutActive
                ? "bg-slate-700 text-white"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }
            `}
          >
            <span className="text-lg leading-none">{item.icon}</span>
          </button>
        </div>
      );
    }

    // ── EXPANDIDO: igual al diseño original ──────────────────────────────────
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

  const UserAvatar = ({ size = "md" }: { size?: "sm" | "md" }) => {
    const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm";
    return (
      <div className={`${dim} rounded-full overflow-hidden bg-slate-600 border border-slate-500
        flex items-center justify-center flex-shrink-0`}>
        {user?.foto_url ? (
          <img
            src={user.foto_url}
            alt={user.nombre}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span className="font-semibold text-white">
            {user?.nombre?.[0]?.toUpperCase()}{user?.apellido?.[0]?.toUpperCase()}
          </span>
        )}
      </div>
    );
  };

  const UserFooter = () => (
    <div className="border-t border-slate-700 p-4 mt-auto space-y-2">
      {!collapsed ? (
        <>
          <div className="flex items-center gap-2 bg-slate-700 px-3 py-2 rounded text-white text-sm">
            <UserAvatar size="md" />
            <div className="min-w-0">
              <p className="font-medium truncate">{user?.nombre} {user?.apellido}</p>
              <p className="text-slate-400 text-xs truncate">{user?.rol}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition"
          >
            Cerrar sesión
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div title={`${user?.nombre} ${user?.apellido}`}>
            <UserAvatar size="md" />
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="w-8 h-8 rounded bg-red-600/80 hover:bg-red-600 text-white text-sm transition flex items-center justify-center"
          >
            ⏻
          </button>
        </div>
      )}
    </div>
  );

  // Flyout activo — busca el item correspondiente
  const flyoutItem = flyout
    ? menuFiltrado.find((i) => i.name === flyout.name)
    : null;
  const flyoutSubs = flyoutItem
    ? flyoutItem.subItems.filter((sub) => !sub.permiso || tienePermiso(sub.permiso))
    : [];

  const sidebarWidthPx = collapsed ? "56px" : "256px";

  return (
    <div className="min-h-screen flex">

      {/* ── Overlay mobile ── */}
      {isMobile && (
        <div
          onClick={() => setOpen(false)}
          className={`fixed inset-0 bg-black/50 transition-opacity duration-300
            ${open ? "opacity-100 z-40" : "opacity-0 pointer-events-none"}`}
        />
      )}

      {/* ── Flyout portal — fixed, fuera del sidebar ── */}
      {collapsed && flyout && flyoutItem && flyoutSubs.length > 0 && (
        <div
          ref={flyoutRef}
          style={{ top: flyout.top, left: "64px" }}
          className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-1 min-w-max"
        >
          <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
            {flyoutItem.name}
          </p>
          {flyoutSubs.map((sub) => (
            <button
              key={sub.name}
              onClick={() => {
                navigate(sub.path);
                setFlyout(null);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors
                ${isActive(sub.path)
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
            >
              • {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Sidebar mobile ── */}
      {isMobile && (
        <aside
          className={`fixed inset-y-0 left-0 w-64 bg-slate-800 z-50
            transform transition-transform duration-300 ease-in-out
            ${open ? "translate-x-0" : "-translate-x-full"}
            flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <img
              src={logo}
              alt="GrupoEB"
              className="h-10 cursor-pointer"
              onClick={() => { navigate("/home"); setOpen(false); }}
            />
            <button onClick={() => setOpen(false)} className="text-white text-2xl leading-none">✕</button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {menuFiltrado.map(renderMenuItem)}
          </nav>
          <UserFooter />
        </aside>
      )}

      {/* ── Sidebar desktop ── */}
      {!isMobile && (
        <aside
          style={{ width: sidebarWidthPx, minWidth: sidebarWidthPx }}
          className="sticky top-0 h-screen bg-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
        >
          {/* Header */}
          <div
            className={`border-b border-slate-700 flex items-center flex-shrink-0 transition-all duration-300
              ${collapsed ? "flex-col justify-center gap-2 py-3 px-1" : "justify-between p-4"}`}
          >
            {/* Logo — grande expandido, pequeño colapsado */}
            <img
              src={logo}
              alt="GrupoEB"
              onClick={() => navigate("/home")}
              className={`cursor-pointer object-contain transition-all duration-300
                ${collapsed ? "h-6 w-auto" : "h-10 w-auto"}`}
            />

            {/* Botón colapsar / expandir */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Expandir menú" : "Colapsar menú"}
              className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
            >
              {collapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>

          {/* Nav */}
          <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden ${collapsed ? "px-1" : "px-2"}`}>
            {menuFiltrado.map(renderMenuItem)}
          </nav>

          <UserFooter />
        </aside>
      )}

      {/* ── Contenido principal ── */}
      <main className="flex-1 min-w-0 overflow-auto">
        {isMobile && (
          <header className="sticky top-0 z-20 bg-white shadow">
            <div className="flex justify-between items-center px-4 py-3">
              <button onClick={() => setOpen(true)} className="text-xl">☰</button>
              <h1 onClick={() => navigate("/home")} className="font-bold cursor-pointer">GRUPEB</h1>
              <div className="flex items-center gap-2 bg-slate-200 px-3 py-2 rounded text-sm">
                <UserAvatar size="sm" />
                <span>{user?.nombre}</span>
              </div>
            </div>
          </header>
        )}
        <div className="p-4 md:p-6">{children}</div>
      </main>

    </div>
  );
}