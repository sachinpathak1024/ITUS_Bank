import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Transfer from './pages/Transfer';
import Transactions from './pages/Transactions';
import Beneficiaries from './pages/Beneficiaries';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Bills from './pages/Bills';
import Scheduled from './pages/Scheduled';
import Insights from './pages/Insights';
import Accounts from './pages/Accounts';
import Cards from './pages/Cards';
import Loans from './pages/Loans';
import FixedDeposits from './pages/FixedDeposits';
import Goals from './pages/Goals';
import Budgets from './pages/Budgets';
import LoginHistory from './pages/LoginHistory';
import QrTransfer from './pages/QrTransfer';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './components/Theme';
import { ProfileProvider } from './components/ProfileContext';
import { ConfirmProvider } from './components/ConfirmAction';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ProfileProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/cards" element={<Cards />} />
                <Route path="/loans" element={<Loans />} />
                <Route path="/fds" element={<FixedDeposits />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/transfer" element={<Transfer />} />
                <Route path="/qr" element={<QrTransfer />} />
                <Route path="/deposit" element={<Deposit />} />
                <Route path="/withdraw" element={<Withdraw />} />
                <Route path="/beneficiaries" element={<Beneficiaries />} />
                <Route path="/bills" element={<Bills />} />
                <Route path="/scheduled" element={<Scheduled />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/login-history" element={<LoginHistory />} />
                <Route path="/chat" element={<Chat />} />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ConfirmProvider>
        </ProfileProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
