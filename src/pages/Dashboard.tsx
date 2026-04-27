import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LogOut, LayoutDashboard, BarChart3,
  Globe, FileQuestion, ChevronLeft, ChevronRight, Settings,
  FileText, Calendar, ShoppingCart, Shield, Users, Bell, X,
  MessageCircle, Zap,
} from "lucide-react";
import CRMKanban from "@/components/dashboard/CRMKanban";
import CRMClients from "@/components/dashboard/CRMClients";
import Analytics from "@/components/dashboard/Analytics";
import LandingPagesList from "@/components/dashboard/LandingPagesList";
import QuizList from "@/components/dashboard/QuizList";
import FormsList from "@/components/dashboard/FormsList";
import SchedulesList from "@/components/dashboard/SchedulesList";
import CheckoutsList from "@/components/dashboard/CheckoutsList";
import SettingsPage from "@/components/dashboard/SettingsPage";
import SuperAdminPanel from "@/components/dashboard/SuperAdminPanel";
import InboxPage from "@/components/dashboard/InboxPage";
import AutomationHub from "@/components/dashboard/AutomationHub";

const allTabs = [
  { id: "crm", label: "CRM", icon: LayoutDashboard, group: "crm" },
  { id: "clients", label: "Clientes", icon: Users, group: "crm" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "crm" },
  { id: "pages", label: "Pages", icon: Globe, group: "tools" },
  { id: "forms", label: "Forms", icon: FileText, group: "tools" },
  { id: "quiz", label: "Quiz", icon: FileQuestion, group: "tools" },
  { id: "schedules", label: "Agenda", icon: Calendar, group: "tools" },
  { id: "checkout", label: "Checkout", icon: ShoppingCart, group: "tools" },
  { id: "settings", label: "Configurações", icon: Settings, group: "system" },
  { id: "admin", label: "Super Admin", icon: Shield, group: "system" },
] as const;

type Tab = (typeof allTabs)[number]["id"];

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  metadata: any;
}

const Dashboard = () => {
  const { user, signOut, isSuperAdmin, userPermissions } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("crm");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setNotifications(data as Notification[]);
    };
    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const tabs = allTabs.filter(tab => {
    if (tab.id === "admin") return isSuperAdmin;
    if (tab.id === "settings") return true;
    if (isSuperAdmin) return true;
    if (!userPermissions) return true;
    return userPermissions[tab.id] !== false;
  });

  const crmTabs = tabs.filter((t) => t.group === "crm");
  const toolsTabs = tabs.filter((t) => t.group === "tools");
  const systemTabs = tabs.filter((t) => t.group === "system");

  const notifIcon = (type: string) => {
    switch (type) {
      case "lead": return "👤";
      case "form_response": return "📝";
      case "quiz_response": return "❓";
      case "appointment": return "📅";
      case "order": return "🛒";
      default: return "🔔";
    }
  };

  const renderTabGroup = (groupTabs: typeof tabs) =>
    groupTabs.map((tab) => {
      const Icon = tab.icon;
      const active = activeTab === tab.id;
      return (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-lime" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"} ${sidebarCollapsed ? "justify-center px-2" : ""}`}>
          <Icon className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>{tab.label}</span>}
        </button>
      );
    });

  return (
    <div className="min-h-screen bg-background flex">
      <motion.aside animate={{ width: sidebarCollapsed ? 64 : 240 }} transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
          {!sidebarCollapsed && (
            <a href="/" className="text-lg font-bold tracking-tight">
              <span className="text-gradient-lime">Omni</span>{" "}
              <span className="text-sidebar-accent-foreground">Builder</span>
            </a>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="h-8 w-8 text-sidebar-foreground hover:text-sidebar-accent-foreground">
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          <p className={`text-[10px] uppercase tracking-wider text-sidebar-foreground mb-2 ${sidebarCollapsed ? "text-center" : "px-2"}`}>
            {sidebarCollapsed ? "—" : "CRM"}
          </p>
          {renderTabGroup(crmTabs)}

          {toolsTabs.length > 0 && (
            <>
              <p className={`text-[10px] uppercase tracking-wider text-sidebar-foreground mb-2 mt-6 ${sidebarCollapsed ? "text-center" : "px-2"}`}>
                {sidebarCollapsed ? "—" : "Ferramentas"}
              </p>
              {renderTabGroup(toolsTabs)}
            </>
          )}

          <p className={`text-[10px] uppercase tracking-wider text-sidebar-foreground mb-2 mt-6 ${sidebarCollapsed ? "text-center" : "px-2"}`}>
            {sidebarCollapsed ? "—" : "Sistema"}
          </p>
          {renderTabGroup(systemTabs)}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {!sidebarCollapsed && (
            <p className="text-xs text-sidebar-foreground truncate mb-2 px-1">{user?.email}</p>
          )}
          <div className="flex items-center gap-1">
            <ThemeToggle className="text-sidebar-foreground" />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className={`text-sidebar-foreground hover:text-destructive flex-1 ${sidebarCollapsed ? "px-2" : ""}`}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span className="ml-2">Sair</span>}
            </Button>
          </div>
        </div>
      </motion.aside>

      <main className="flex-1 transition-all duration-200" style={{ marginLeft: sidebarCollapsed ? 64 : 240 }}>
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-foreground">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-background shadow-2xl z-50">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">Notificações</p>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">Marcar todas como lidas</button>
                      )}
                      <button onClick={() => setShowNotifications(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
                  ) : (
                    notifications.slice(0, 30).map(n => (
                      <button key={n.id} onClick={() => markAsRead(n.id)}
                        className={`w-full text-left p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{notifIcon(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                            {n.message && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                          {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                        </div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="p-6">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {activeTab === "crm" && <CRMKanban />}
            {activeTab === "clients" && <CRMClients />}
            {activeTab === "analytics" && <Analytics />}
            {activeTab === "pages" && <LandingPagesList />}
            {activeTab === "forms" && <FormsList />}
            {activeTab === "quiz" && <QuizList />}
            {activeTab === "schedules" && <SchedulesList />}
            {activeTab === "checkout" && <CheckoutsList />}
            {activeTab === "settings" && <SettingsPage />}
            {activeTab === "admin" && <SuperAdminPanel />}
          </motion.div>
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex">
        {tabs.filter(t => t.group !== "system").map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-3 text-[10px] ${activeTab === tab.id ? "text-lime" : "text-muted-foreground"}`}>
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
