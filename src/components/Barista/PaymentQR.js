// src/components/Barista/PaymentQR.js
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';

function PaymentQR({ orderId, onPaymentComplete }) {
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderAndQR();
    }
  }, [orderId]);

  async function fetchOrderAndQR() {
    setLoading(true);
    try {
      // Fetch order data
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        setOrderData(orderSnap.data());
        
        // Get QR code image URL
        // For simplicity, we'll use a static QR code from storage
        // In a real app, you'd generate a unique QR for each order
        try {
          const qrRef = ref(storage, 'payment-qr/qr-code.png');
          const url = await getDownloadURL(qrRef);
          setQrUrl(url);
        } catch (storageErr) {
          console.error('Failed to load QR image:', storageErr);
          // Use a fallback placeholder if image loading fails
          setQrUrl('/placeholder-qr.png');
        }
      } else {
        setError('Order not found');
      }
    } catch (err) {
      setError('Failed to fetch order: ' + err.message);
    }
    setLoading(false);
  }

  async function handlePaymentComplete() {
    try {
      // Update order status in Firestore
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'paid',
        paidAt: new Date()
      });
      
      // Notify parent component
      if (onPaymentComplete) {
        onPaymentComplete();
      }
    } catch (err) {
      setError('Failed to update payment status: ' + err.message);
    }
  }

  if (loading) {
    return <div className="loading">Loading payment information...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!orderData) {
    return <div className="not-found">Order information not found</div>;
  }

  return (
    <div className="payment-qr">
      <div className="qr-header">
        <h3>Payment QR Code</h3>
        <p>Order #{orderId.substring(0, 8)}</p>
      </div>
      
      <div className="order-summary">
        <p><strong>Customer:</strong> {orderData.customerName}</p>
        <p><strong>Total Amount:</strong> ${orderData.totalAmount.toFixed(2)}</p>
        <p><strong>Date:</strong> {orderData.timestamp.toDate().toLocaleString()}</p>
      </div>
      
      <div className="qr-container">
        {qrUrl ? (
          <img src={qrUrl} alt="Payment QR Code" className="qr-image" />
        ) : (
          <div className="qr-placeholder">QR Code not available</div>
        )}
      </div>
      
      <div className="payment-instructions">
        <p>Please scan this QR code with your mobile payment app to complete your payment.</p>
        <p>Show this screen to the barista after payment is complete.</p>
      </div>
      
      <button onClick={handlePaymentComplete} className="payment-complete-button">
        Mark Payment Complete
      </button>
    </div>
  );
}

export default PaymentQR;