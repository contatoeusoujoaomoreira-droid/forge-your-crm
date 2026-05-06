import { useState } from "react";
import Analytics from "./Analytics";
import OperationsPanel from "./OperationsPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DashboardAnalytics = () => {
  const [tab, setTab] = useState("overview");
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="ops">Operacional</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><Analytics /></TabsContent>
      <TabsContent value="ops"><OperationsPanel /></TabsContent>
    </Tabs>
  );
};

export default DashboardAnalytics;
