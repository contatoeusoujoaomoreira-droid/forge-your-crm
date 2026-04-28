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
  MessageCircle, Zap, Upload, ListChecks, CheckCircle2, Menu,
} from "lucide-react";
import { useUserPlan, PLAN_DEFINITIONS } from "@/hooks/useUserPlan";
import { Badge } from "@/components/ui/badge";
import LeadImporter from "@/components/dashboard/automation/LeadImporter";
import ImportedListsViewer from "@/components/dashboard/automation/ImportedListsViewer";
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
import RequestCreditsModal from "@/components/dashboard/RequestCreditsModal";

const allTabs = [
  { id: "analytics", label: "Dashboard", icon: BarChart3, group: "crm" },
  { id: "crm", label: "CRM", icon: LayoutDashboard, group: "crm" },
  { id: "clients", label: "Clientes", icon: Users, group: "crm" },
  { id: "import", label: "Importar", icon: Upload, group: "crm" },
  { id: "imported", label: "Importados", icon: CheckCircle2, group: "crm" },
  { id: "pages", label: "Pages", icon: Globe, group: "tools" },
  { id: "forms", label: "Forms", icon: FileText, group: "tools" },
  { id: "quiz", label: "Quiz", icon: FileQuestion, group: "tools" },
  { id: "schedules", label: "Agenda", icon: Calendar, group: "tools" },
  { id: "checkout", label: "Checkout", icon: ShoppingCart, group: "tools" },
  { id: "automation", label: "Automação", icon: Zap, group: "tools" },
  { id: "chat", label: "Chat", icon: MessageCircle, group: "comms" },
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
  const planInfo = useUserPlan();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRequestCredits, setShowRequestCredits] = useState(false);
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
    // Plan-based gating (super admin always passes above)
    if (!planInfo.hasModule(tab.id)) return false;
    if (!userPermissions) return true;
    return userPermissions[tab.id] !== false;
  });

  const crmTabs = tabs.filter((t) => t.group === "crm");
  const toolsTabs = tabs.filter((t) => t.group === "tools");
  const commsTabs = tabs.filter((t) => t.group === "comms");
  const systemTabs = tabs.filter((t) => t.group === "system");
  const mobileTabs = ["analytics", "crm", "chat", "automation", "settings"]
    .map((id) => tabs.find((t) => t.id === id))
    .filter(Boolean) as typeof tabs;
  const visibleMobileTabs = mobileTabs.length >= 4 ? mobileTabs : tabs.slice(0, 5);

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
        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileSidebarOpen(false); }}
          className={`flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-lime" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"} ${sidebarCollapsed ? "justify-center px-2" : ""}`}>
          <Icon className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>{tab.label}</span>}
        </button>
      );
    });

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {mobileSidebarOpen && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <motion.aside animate={{ width: sidebarCollapsed ? 64 : 240 }} transition={{ duration: 0.2 }}
        className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border bg-sidebar transition-transform duration-200 md:translate-x-0 pb-20 md:pb-0 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
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

          {commsTabs.length > 0 && (
            <>
              <p className={`text-[10px] uppercase tracking-wider text-sidebar-foreground mb-2 mt-6 ${sidebarCollapsed ? "text-center" : "px-2"}`}>
                {sidebarCollapsed ? "—" : "Comunicação"}
              </p>
              {renderTabGroup(commsTabs)}
            </>
          )}

          <p className={`text-[10px] uppercase tracking-wider text-sidebar-foreground mb-2 mt-6 ${sidebarCollapsed ? "text-center" : "px-2"}`}>
            {sidebarCollapsed ? "—" : "Sistema"}
          </p>
          {renderTabGroup(systemTabs)}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {!sidebarCollapsed && (
            <div className="mb-2 px-1 space-y-1">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{planInfo.fullName || user?.email}</p>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/40 text-primary">
                  {PLAN_DEFINITIONS[planInfo.plan].label}
                </Badge>
                <span className="text-[10px] text-sidebar-foreground">⚡ {planInfo.creditsBalance}</span>
              </div>
            </div>
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

      <main className={`flex-1 min-w-0 transition-all duration-200 ${sidebarCollapsed ? "md:ml-16" : "md:ml-60"}`}>
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-2 px-3 sm:px-6 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)} className="h-9 w-9 shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowRequestCredits(true)}
              title="Solicitar mais créditos"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-mono">{planInfo.creditsBalance}</span>
              <span className="text-[10px] text-muted-foreground">/ {planInfo.creditsMonthly}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/40 text-primary ml-1">
                {PLAN_DEFINITIONS[planInfo.plan].label}
              </Badge>
              <span className="text-[10px] text-primary font-semibold ml-1">+</span>
            </button>
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
                  className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] sm:w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-background shadow-2xl z-50">
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
          </div>
        </header>

        <div className="max-w-full overflow-x-hidden p-3 pb-24 sm:p-6 sm:pb-24 md:pb-6">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {activeTab === "crm" && <CRMKanban />}
            {activeTab === "clients" && <CRMClients />}
            {activeTab === "import" && <LeadImporter onShowImported={() => setActiveTab("imported")} />}
            {activeTab === "imported" && <ImportedListsViewer />}
            {activeTab === "chat" && <InboxPage />}
            {activeTab === "analytics" && <Analytics />}
            {activeTab === "pages" && <LandingPagesList />}
            {activeTab === "forms" && <FormsList />}
            {activeTab === "quiz" && <QuizList />}
            {activeTab === "schedules" && <SchedulesList />}
            {activeTab === "checkout" && <CheckoutsList />}
            {activeTab === "automation" && <AutomationHub />}
            {activeTab === "settings" && <SettingsPage />}
            {activeTab === "admin" && <SuperAdminPanel />}
          </motion.div>
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border grid grid-cols-5">
        {visibleMobileTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-0 flex flex-col items-center py-2.5 text-[10px] ${activeTab === tab.id ? "text-lime" : "text-muted-foreground"}`}>
              <Icon className="h-5 w-5 mb-1" />
              <span className="w-full px-1 truncate text-center">{tab.label}</span>
            </button>
          );
        })}
      </div>
      <RequestCreditsModal open={showRequestCredits} onOpenChange={setShowRequestCredits} />
    </div>
  );
};

export default Dashboard;
