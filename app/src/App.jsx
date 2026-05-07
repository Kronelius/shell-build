import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { StoreProvider } from './store';
import { ToastProvider } from './components/Toast';
import RequirePerm from './components/RequirePerm';
import NotFound from './components/NotFound';
import TwilioInboundListener from './components/TwilioInboundListener';
import ReminderScheduler from './components/ReminderScheduler';
import { usePermission } from './hooks/usePermission';

import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import JobDetail from './pages/JobDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import ContactDetail from './pages/ContactDetail';
import Pipeline from './pages/Pipeline';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Messaging from './pages/Messaging';

import SettingsLayout from './pages/settings/SettingsLayout';
import SettingsCompany from './pages/settings/Company';
import SettingsServices from './pages/settings/Services';
import SettingsTags from './pages/settings/Tags';
import SettingsTeam from './pages/settings/Team';
import SettingsTeamDetail from './pages/settings/TeamDetail';
import SettingsRoles from './pages/settings/Roles';
import SettingsNotifications from './pages/settings/Notifications';
import SettingsAccount from './pages/settings/Account';
import SettingsIntegrations from './pages/settings/Integrations';
import SettingsConnectedInboxes from './pages/settings/ConnectedInboxes';

function HomeRoute() {
  const hasDashboard = usePermission('dashboard.view');
  if (!hasDashboard) return <Navigate to="/schedule" replace />;
  return <Dashboard />;
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <TwilioInboundListener />
        <ReminderScheduler />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<HomeRoute />} />

              <Route path="schedule" element={<RequirePerm perm="schedule.view"><Schedule /></RequirePerm>} />
              <Route path="schedule/:jobId" element={<RequirePerm perm="schedule.view"><JobDetail /></RequirePerm>} />

              <Route path="contacts" element={<RequirePerm perm="contacts.view"><Clients /></RequirePerm>} />
              <Route path="contacts/:contactId" element={<RequirePerm perm="contacts.view"><ContactDetail /></RequirePerm>} />

              <Route path="clients" element={<RequirePerm perm="clients.view"><Clients /></RequirePerm>} />
              <Route path="clients/contact/:contactId" element={<RequirePerm perm="contacts.view"><ContactDetail /></RequirePerm>} />
              <Route path="clients/:clientId" element={<RequirePerm perm="clients.view"><ClientDetail /></RequirePerm>} />

              <Route path="pipeline" element={<RequirePerm perm="pipeline.view"><Pipeline /></RequirePerm>} />

              <Route path="invoices" element={<RequirePerm perm="invoices.view"><Invoices /></RequirePerm>} />
              <Route path="invoices/:invoiceId" element={<RequirePerm perm="invoices.view"><InvoiceDetail /></RequirePerm>} />

              <Route path="reminders" element={<Navigate to="/settings/notifications" replace />} />

              <Route path="messaging" element={<RequirePerm perm="messaging.use"><Messaging /></RequirePerm>} />
              <Route path="messaging/:conversationId" element={<RequirePerm perm="messaging.use"><Messaging /></RequirePerm>} />

              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="account" replace />} />
                <Route path="company" element={<RequirePerm perm="settings.company"><SettingsCompany /></RequirePerm>} />
                <Route path="services" element={<RequirePerm perm="settings.services"><SettingsServices /></RequirePerm>} />
                <Route path="tags" element={<RequirePerm perm="tags.manage"><SettingsTags /></RequirePerm>} />
                <Route path="team" element={<RequirePerm perm="settings.team.view"><SettingsTeam /></RequirePerm>} />
                <Route path="team/:userId" element={<RequirePerm perm="settings.team.view"><SettingsTeamDetail /></RequirePerm>} />
                <Route path="roles" element={<RequirePerm perm="settings.roles.edit"><SettingsRoles /></RequirePerm>} />
                <Route path="notifications" element={<RequirePerm perm="reminders.view"><SettingsNotifications /></RequirePerm>} />
                <Route path="account" element={<RequirePerm perm="settings.account"><SettingsAccount /></RequirePerm>} />
                <Route path="integrations" element={<RequirePerm perm="integrations.view"><SettingsIntegrations /></RequirePerm>} />
                <Route path="inboxes" element={<RequirePerm perm="messaging.use"><SettingsConnectedInboxes /></RequirePerm>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
