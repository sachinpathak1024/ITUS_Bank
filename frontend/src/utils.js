export const formatCurrency = (amount) => {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n);
};

export const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateShort = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const transactionMeta = (type) => {
  switch (type) {
    case 'DEPOSIT':
      return { sign: '+', color: 'tx-positive', label: 'Deposit', icon: '↓' };
    case 'WITHDRAWAL':
      return { sign: '-', color: 'tx-negative', label: 'Withdrawal', icon: '↑' };
    case 'TRANSFER_SENT':
      return { sign: '-', color: 'tx-negative', label: 'Transfer Sent', icon: '→' };
    case 'TRANSFER_RECEIVED':
      return { sign: '+', color: 'tx-positive', label: 'Transfer Received', icon: '←' };
    default:
      return { sign: '', color: '', label: type, icon: '•' };
  }
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const initials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
};
