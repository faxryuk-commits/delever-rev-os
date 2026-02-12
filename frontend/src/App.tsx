import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadList from './pages/LeadList';
import LeadCard from './pages/LeadCard';
import LeadNew from './pages/LeadNew';
import DealList from './pages/DealList';
import DealCard from './pages/DealCard';
import CompanyList from './pages/CompanyList';
import CompanyCard from './pages/CompanyCard';
import ContactCard from './pages/ContactCard';
import TaskList from './pages/TaskList';
import ContractList from './pages/ContractList';
import ContractCard from './pages/ContractCard';
import SubscriptionList from './pages/SubscriptionList';
import SubscriptionCard from './pages/SubscriptionCard';
import InvoiceList from './pages/InvoiceList';
import InvoiceCard from './pages/InvoiceCard';
import Analytics from './pages/Analytics';
import Commissions from './pages/Commissions';
import Settings from './pages/Settings';

export default function App() {
  const { token, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* CRM core */}
        <Route path="/leads" element={<LeadList />} />
        <Route path="/leads/new" element={<LeadNew />} />
        <Route path="/leads/:id" element={<LeadCard />} />
        <Route path="/deals" element={<DealList />} />
        <Route path="/deals/:id" element={<DealCard />} />
        <Route path="/companies" element={<CompanyList />} />
        <Route path="/companies/:id" element={<CompanyCard />} />
        <Route path="/contacts/:id" element={<ContactCard />} />
        <Route path="/tasks" element={<TaskList />} />
        {/* Revenue & Billing */}
        <Route path="/contracts" element={<ContractList />} />
        <Route path="/contracts/:id" element={<ContractCard />} />
        <Route path="/subscriptions" element={<SubscriptionList />} />
        <Route path="/subscriptions/:id" element={<SubscriptionCard />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/:id" element={<InvoiceCard />} />
        {/* Analytics & Commissions */}
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/commissions" element={<Commissions />} />
        {/* Settings */}
        <Route path="/settings/*" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
