import {
  LayoutDashboard,
  FolderKanban,
  Brain,
  ClipboardList,
  LogOut,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    navigate("/login");
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Workspaces",
      path: "/workspaces",
      icon: FolderKanban,
    },
    {
      name: "Mastery",
      path: "/mastery",
      icon: Brain,
    },
    {
      name: "Audit Log",
      path: "/auditlog",
      icon: ClipboardList,
    },

  ];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50
          flex h-screen w-64 flex-col
          border-r border-gray-200
          bg-white
          transition-transform duration-300
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <h1 className="text-xl font-bold text-violet-950">
            Smart Study
          </h1>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `
                  flex items-center gap-3 rounded-xl px-4 py-3
                  text-sm font-medium
                  transition
                  ${
                    isActive
                      ? "bg-violet-100 text-violet-800"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                  `
                }
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="
              flex w-full items-center gap-3 rounded-xl
              px-4 py-3
              text-sm font-medium text-gray-600
              transition
              hover:bg-red-50 hover:text-red-600
            "
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}