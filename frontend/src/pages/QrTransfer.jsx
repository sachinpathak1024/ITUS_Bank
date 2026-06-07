import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency } from '../utils';

const QrTransfer = () => {
  const [my, setMy] = useState(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState('');
  const toast = useToast();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/bank/profile').then(({ data }) => setMy(data));
  }, []);

  const myQrPayload = my && JSON.stringify({
    v: 1,
    type: 'itus-pay',
    to: my.username,
    name: my.fullName,
    amount: requestAmount ? Number(requestAmount) : undefined,
    note: requestNote || undefined,
  });

  const tryParse = (text) => {
    try {
      const obj = JSON.parse(text);
      if (obj.type !== 'itus-pay' || !obj.to) throw new Error('Not an ITUS Pay code');
      setParsed(obj);
      setParseError('');
    } catch (e) {
      setParsed(null);
      setParseError('Not a valid ITUS Pay code');
    }
  };

  const pay = () => {
    confirm({
      title: 'Send via QR',
      summary: [
        { label: 'To', value: parsed.name ? `${parsed.name} (@${parsed.to})` : `@${parsed.to}` },
        { label: 'Amount', value: formatCurrency(parsed.amount || 0) },
        ...(parsed.note ? [{ label: 'Note', value: parsed.note }] : []),
      ],
      confirmLabel: 'Send',
      onConfirm: async (pin) => {
        const { data } = await api.post('/bank/transfer', {
          recipientUsername: parsed.to,
          amount: parseFloat(parsed.amount),
          description: parsed.note || 'QR transfer',
          pin,
        });
        if (!data.success) throw new Error(data.message);
        toast.success('Sent');
        refreshProfile();
        navigate('/dashboard');
      },
    });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">QR Transfer</div>
        <div className="page-subtitle">Show a QR to receive, paste a QR's text to pay</div>
      </div>

      <div className="qr-grid">
        <div className="card">
          <div className="card-title">My QR</div>
          <div className="card-subtitle">Share this code to receive money</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (optional)</label>
              <input type="number" min="0" step="0.01" className="form-control"
                     value={requestAmount}
                     onChange={(e) => setRequestAmount(e.target.value)}
                     placeholder="Any amount" />
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="form-control" value={requestNote}
                     onChange={(e) => setRequestNote(e.target.value)}
                     placeholder="e.g. Lunch" />
            </div>
          </div>
          {myQrPayload && (
            <div className="qr-display">
              <QRCodeSVG value={myQrPayload} size={220} level="M" includeMargin={true} />
              <div className="qr-tag">@{my.username}</div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Pay via QR</div>
          <div className="card-subtitle">
            Paste the QR data shared with you (long-press a QR image in any app and copy text, or scan to text)
          </div>
          <div className="form-group">
            <label className="form-label">QR payload</label>
            <textarea className="form-control" rows={5}
                      placeholder='{"type":"itus-pay","to":"alice","amount":500}'
                      value={scanInput}
                      onChange={(e) => { setScanInput(e.target.value); tryParse(e.target.value); }}></textarea>
            {parseError && <div className="form-help text-danger" style={{ marginTop: 6 }}>{parseError}</div>}
          </div>
          {parsed && (
            <div className="alert alert-success">
              <strong>To:</strong> {parsed.name || parsed.to} (@{parsed.to})<br />
              {parsed.amount && <><strong>Amount:</strong> {formatCurrency(parsed.amount)}<br /></>}
              {parsed.note && <><strong>Note:</strong> {parsed.note}</>}
            </div>
          )}
          <button className="btn btn-primary btn-block" disabled={!parsed || !parsed.amount}
                  onClick={pay}>
            {parsed && parsed.amount ? `Pay ${formatCurrency(parsed.amount)}` : 'Pay'}
          </button>
          {parsed && !parsed.amount && (
            <div className="form-help" style={{ marginTop: 6 }}>The QR has no amount — ask the sender to include one.</div>
          )}
        </div>
      </div>

      <style>{`
        .qr-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        @media (max-width: 900px) { .qr-grid { grid-template-columns: 1fr; } }
        .qr-display {
          text-align: center;
          padding: 18px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid var(--itus-border);
        }
        .qr-tag {
          margin-top: 12px;
          font-weight: 700;
          color: var(--itus-primary);
        }
      `}</style>
    </>
  );
};

export default QrTransfer;
