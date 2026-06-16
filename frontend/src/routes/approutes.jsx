import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import AdminDashboard from '../pages/AdminDashboard';
import AdminUsers from '../pages/AdminUsers';
import AdminUserForm from '../pages/AdminUserForm';
import AdminClients from '../pages/AdminClients';
import AdminClientForm from '../pages/AdminClientForm';
import AdminClientHistory from '../pages/AdminClientHistory';
import AdminOrders from '../pages/AdminOrders';
import AdminOrderForm from '../pages/AdminOrderForm';
import AdminOrderDetail from '../pages/AdminOrderDetail';
import GlobalSearch from '../pages/AdminReports';
import UserDashboard from '../pages/UserDashboard';
import OrderTrash from '../pages/OrderTrash';
import Profile from '../pages/Profile';
import ImportUpload from '../pages/ImportUpload';
import ImportReview from '../pages/ImportReview';
import ImportHistory from '../pages/ImportHistory';
import SampleList from '../pages/SampleList';
import SampleForm from '../pages/SampleForm';
import SampleDetail from '../pages/SampleDetail';
import Notifications from '../pages/Notifications';
import NotificationPreferences from '../pages/NotificationPreferences';

const getRoleRedirect = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'user') return '/user';
  return '/';
};

const PrivateRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/" />;
  if (role && role !== userRole) return <Navigate to={getRoleRedirect(userRole)} />;

  return children;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (token) return <Navigate to={getRoleRedirect(userRole)} />;
  return children;
};

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />

        {/* Admin - gestao do sistema */}
        <Route path="/admin" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute role="admin"><AdminUsers /></PrivateRoute>} />
        <Route path="/admin/users/new" element={<PrivateRoute role="admin"><AdminUserForm /></PrivateRoute>} />
        <Route path="/admin/users/:id/edit" element={<PrivateRoute role="admin"><AdminUserForm /></PrivateRoute>} />
        <Route path="/admin/clients" element={<PrivateRoute role="admin"><AdminClients /></PrivateRoute>} />
        <Route path="/admin/clients/new" element={<PrivateRoute role="admin"><AdminClientForm /></PrivateRoute>} />
        <Route path="/admin/clients/:id/edit" element={<PrivateRoute role="admin"><AdminClientForm /></PrivateRoute>} />
        <Route path="/admin/clients/:id/history" element={<PrivateRoute role="admin"><AdminClientHistory /></PrivateRoute>} />
        <Route path="/admin/orders" element={<PrivateRoute role="admin"><AdminOrders /></PrivateRoute>} />
        <Route path="/admin/orders/new" element={<PrivateRoute role="admin"><AdminOrderForm /></PrivateRoute>} />
        <Route path="/admin/orders/trash" element={<PrivateRoute role="admin"><OrderTrash /></PrivateRoute>} />
        <Route path="/admin/orders/:id" element={<PrivateRoute role="admin"><AdminOrderDetail /></PrivateRoute>} />
        <Route path="/admin/search" element={<PrivateRoute role="admin"><GlobalSearch /></PrivateRoute>} />
        <Route path="/admin/imports" element={<PrivateRoute role="admin"><ImportHistory /></PrivateRoute>} />
        <Route path="/admin/imports/new" element={<PrivateRoute role="admin"><ImportUpload /></PrivateRoute>} />
        <Route path="/admin/imports/:id/review" element={<PrivateRoute role="admin"><ImportReview /></PrivateRoute>} />
        <Route path="/admin/samples" element={<PrivateRoute role="admin"><SampleList /></PrivateRoute>} />
        <Route path="/admin/samples/new" element={<PrivateRoute role="admin"><SampleForm /></PrivateRoute>} />
        <Route path="/admin/samples/:id" element={<PrivateRoute role="admin"><SampleDetail /></PrivateRoute>} />
        <Route path="/admin/notifications" element={<PrivateRoute role="admin"><Notifications /></PrivateRoute>} />
        <Route path="/admin/notifications/preferences" element={<PrivateRoute role="admin"><NotificationPreferences /></PrivateRoute>} />

        {/* User - gestao do negocio */}
        <Route path="/user" element={<PrivateRoute role="user"><UserDashboard /></PrivateRoute>} />
        <Route path="/user/clients" element={<PrivateRoute role="user"><AdminClients /></PrivateRoute>} />
        <Route path="/user/clients/new" element={<PrivateRoute role="user"><AdminClientForm /></PrivateRoute>} />
        <Route path="/user/clients/:id/edit" element={<PrivateRoute role="user"><AdminClientForm /></PrivateRoute>} />
        <Route path="/user/clients/:id/history" element={<PrivateRoute role="user"><AdminClientHistory /></PrivateRoute>} />
        <Route path="/user/orders" element={<PrivateRoute role="user"><AdminOrders /></PrivateRoute>} />
        <Route path="/user/orders/new" element={<PrivateRoute role="user"><AdminOrderForm /></PrivateRoute>} />
        <Route path="/user/orders/trash" element={<PrivateRoute role="user"><OrderTrash /></PrivateRoute>} />
        <Route path="/user/orders/:id" element={<PrivateRoute role="user"><AdminOrderDetail /></PrivateRoute>} />
        <Route path="/user/search" element={<PrivateRoute role="user"><GlobalSearch /></PrivateRoute>} />
        <Route path="/user/users/new" element={<PrivateRoute role="user"><AdminUserForm /></PrivateRoute>} />
        <Route path="/user/imports" element={<PrivateRoute role="user"><ImportHistory /></PrivateRoute>} />
        <Route path="/user/imports/new" element={<PrivateRoute role="user"><ImportUpload /></PrivateRoute>} />
        <Route path="/user/imports/:id/review" element={<PrivateRoute role="user"><ImportReview /></PrivateRoute>} />
        <Route path="/user/samples" element={<PrivateRoute role="user"><SampleList /></PrivateRoute>} />
        <Route path="/user/samples/new" element={<PrivateRoute role="user"><SampleForm /></PrivateRoute>} />
        <Route path="/user/samples/:id" element={<PrivateRoute role="user"><SampleDetail /></PrivateRoute>} />
        <Route path="/user/notifications" element={<PrivateRoute role="user"><Notifications /></PrivateRoute>} />
        <Route path="/user/notifications/preferences" element={<PrivateRoute role="user"><NotificationPreferences /></PrivateRoute>} />

        {/* Shared */}
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
