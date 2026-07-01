import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardFiltersProvider } from "@/contexts/DashboardFiltersContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import AdminUsersPage from "@/pages/admin/UsersPage";
import AdminRolesPage from "@/pages/admin/RolesPage";
import AdminPermissionsPage from "@/pages/admin/PermissionsPage";
import InviteUsersPage from "@/pages/admin/InviteUsersPage";
import BackupPage from "@/pages/admin/BackupPage";
import FundInflowsPage from "@/pages/FundInflowsPage";
import ExpendituresPage from "@/pages/ExpendituresPage";
import AIERecordsPage from "@/pages/AIERecordsPage";
import DistributionsPage from "@/pages/DistributionsPage";
import ProposalsPage from "@/pages/ProposalsPage";
import BudgetReferencePage from "@/pages/BudgetReferencePage";
import ReportsPage from "@/pages/ReportsPage";
import AuditTrailPage from "@/pages/AuditTrailPage";
import ProfileSettingsPage from "@/pages/ProfileSettingsPage";
import ComparisonsPage from "@/pages/ComparisonsPage";
import CapitalBudgetPage from "@/pages/CapitalBudgetPage";
import NotFound from "@/pages/NotFound";
import LandingPage from "@/pages/LandingPage";
import HelpVideosPage from "@/pages/help/HelpVideosPage";
import HelpManualPage from "@/pages/help/HelpManualPage";
import HelpGlossaryPage from "@/pages/help/HelpGlossaryPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DashboardFiltersProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/help/videos" element={<HelpVideosPage />} />
            <Route path="/help/manual" element={<HelpManualPage />} />
            <Route path="/help/glossary" element={<HelpGlossaryPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/fund-inflows" element={<FundInflowsPage />} />
                <Route path="/aie" element={<AIERecordsPage />} />
                <Route path="/distributions" element={<DistributionsPage />} />
                <Route path="/expenditures" element={<ExpendituresPage />} />
                <Route path="/capital-budget" element={<CapitalBudgetPage />} />
                <Route path="/reference/budget-codes" element={<BudgetReferencePage />} />
                <Route path="/proposals" element={<ProposalsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit-trail" element={<AuditTrailPage />} />
                <Route element={<ProtectedRoute requireRoles={["SYSADMIN"]} />}>
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/roles" element={<AdminRolesPage />} />
                  <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
                  <Route path="/admin/invite" element={<InviteUsersPage />} />
                  <Route path="/admin/backup" element={<BackupPage />} />
                </Route>
                <Route path="/settings/profile" element={<ProfileSettingsPage />} />
                <Route path="/reports/compare" element={<ComparisonsPage />} />
                <Route path="/reports/variance" element={<ComparisonsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </DashboardFiltersProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
