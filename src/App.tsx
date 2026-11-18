import { StoreProvider, useStore } from "./store";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/Login";
import { SetupPage } from "./pages/Setup";
import { UserManagementPage } from "./pages/UserManagement";
import { CustomerDetailPage } from "./pages/CustomerDetail";
import { TemplateWizard } from "./pages/flows/TemplateWizard";
import { AssignWizard } from "./pages/flows/AssignWizard";

function Router() {
  const { route } = useStore();
  switch (route.name) {
    case "setup":
      return <SetupPage />;
    case "users":
      return <UserManagementPage />;
    case "customer":
      return (
        <CustomerDetailPage key={route.id} id={route.id} tab={route.tab} logId={route.logId} />
      );
    case "template":
      return (
        <TemplateWizard
          key={`${route.customerId}-${route.templateId}`}
          customerId={route.customerId}
          templateId={route.templateId}
        />
      );
    case "assign":
      return (
        <AssignWizard
          key={`${route.customerId}-${route.templateId ?? "new"}`}
          customerId={route.customerId}
          templateId={route.templateId}
        />
      );
  }
}

function Gate() {
  const { agent, connected, route } = useStore();
  if (!agent) return <LoginPage />;
  if (route.name !== "setup" && !connected) {
    return <Shell><Router /></Shell>;
  }
  return (
    <Shell>
      <Router />
    </Shell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Gate />
    </StoreProvider>
  );
}
