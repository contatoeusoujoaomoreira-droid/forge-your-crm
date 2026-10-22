import { useState } from "react";
import Analytics from "./Analytics";
import OperationsPanel from "./OperationsPanel";
import CommercialDashboard from "./CommercialDashboard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DashboardAnalytics = () => {
  const [tab, setTab] = useState("sales");
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="sales">Comercial</TabsTrigger>
        <TabsTrigger value="overview">CRM</TabsTrigger>
        <TabsTrigger value="ops">Operacional</TabsTrigger>
      </TabsList>
      <TabsContent value="sales"><CommercialDashboard /></TabsContent>
      <TabsContent value="overview"><Analytics /></TabsContent>
      <TabsContent value="ops"><OperationsPanel /></TabsContent>
    </Tabs>
  );
}

export default DashboardAnalytics;
