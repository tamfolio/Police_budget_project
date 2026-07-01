import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpendituresOverviewTab from "@/components/expenditures/ExpendituresOverviewTab";
import ExpendituresTransactionsTab from "@/components/expenditures/ExpendituresTransactionsTab";
import ExpendituresQueueTab from "@/components/expenditures/ExpendituresQueueTab";
import ExpendituresRollupTab from "@/components/expenditures/ExpendituresRollupTab";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "transactions", label: "Transactions" },
  { value: "queue", label: "My Queue" },
  { value: "rollup", label: "Rollup" },
] as const;

export default function ExpendituresPage() {
  const [tab, setTab] = useState<string>("overview");

  useEffect(() => { document.title = "Expenditures – NPF BMS"; }, []);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Expenditures</h1>
        <p className="text-[12px] text-muted-foreground">
          Budget actuals — voucher transactions, approval workflow, and rollup by sub-item.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="mt-3">
          {tab === "overview" && <ExpendituresOverviewTab />}
        </TabsContent>
        <TabsContent value="transactions" className="mt-3">
          {tab === "transactions" && <ExpendituresTransactionsTab />}
        </TabsContent>
        <TabsContent value="queue" className="mt-3">
          {tab === "queue" && <ExpendituresQueueTab />}
        </TabsContent>
        <TabsContent value="rollup" className="mt-3">
          {tab === "rollup" && <ExpendituresRollupTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}