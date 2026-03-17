import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LogOut, LayoutDashboard, Users, Calendar, BarChart3,
  Globe, FileQuestion, CalendarCog, ChevronLeft, ChevronRight,
} from "lucide-react";
import CRMKanban from "@/components/dashboard/CRMKanban";
import Analytics from "@/components/dashboard/Analytics";
import BookingsList from "@/components/dashboard/BookingsList";
import LeadsList from "@/components/dashboard/LeadsList";

const tabs = [
  { id: "kanban", label: "Pipeline", icon: LayoutDashboard, group: "crm" },
  { id: "leads", label: "Leads", icon: Users, group: "crm" },
  { id: "bookings", label: "Reservas", icon: Calendar, group: "crm" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "crm" },
] as const;

type Tab = (typeof tabs)[number]["id"];

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("kanban");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const crmTabs = tabs.filter((t) => t.group === "crm");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border bg-sidebar"
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
          {!sidebarCollapsed && (
            <a href="/" className="text-lg font-bold tracking-tight">
              <span className="text-gradient-lime">Forge</span>{" "}
              <span className="text-sidebar-accent-foreground">AI</span>
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 text-sidebar-foreground hover:text-sidebar-accent-foreground"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          <p className={`text-[10px] uppercase tracking-wider text-sidebar-foreground mb-2 ${sidebarCollapsed ? "text-center" : "px-2"}`}>
            {sidebarCollapsed ? "—" : "CRM"}
          </p>
          {crmTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-lime"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User/Logout */}
        <div className="border-t border-sidebar-border p-3">
          {!sidebarCollapsed && (
            <p className="text-xs text-sidebar-foreground truncate mb-2 px-1">
              {user?.email}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={`text-sidebar-foreground hover:text-destructive w-full ${sidebarCollapsed ? "px-2" : ""}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-200"
        style={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-foreground">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
        </header>

        {/* Content */}
        <div className="p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "kanban" && <CRMKanban />}
            {activeTab === "leads" && <LeadsList />}
            {activeTab === "bookings" && <BookingsList />}
            {activeTab === "analytics" && <Analytics />}
          </motion.div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-3 text-[10px] ${
                activeTab === tab.id ? "text-lime" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
