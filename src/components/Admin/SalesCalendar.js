// src/components/Admin/SalesCalendar.js
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ChevronLeft, ChevronRight, TrendingUp, ShoppingBag, X, Banknote, Smartphone } from 'lucide-react';
import './SalesCalendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function SalesCalendar() {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(false);
  const [monthTotal, setMonthTotal] = useState(0);
  const [monthOrders, setMonthOrders] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayOrders, setDayOrders] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);

  const fetchMonthData = useCallback(async (monthDate) => {
    setLoading(true);
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const snap = await getDocs(
        query(
          collection(db, 'orders'),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end),
          orderBy('timestamp', 'asc')
        )
      );

      const dayMap = {};
      let total = 0;
      let orderCount = 0;

      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.paymentMethod !== 'cash' && data.paymentMethod !== 'qr') return;
        const ts = data.timestamp?.toDate();
        if (!ts) return;
        const key = toDateKey(ts);
        if (!dayMap[key]) dayMap[key] = { total: 0, count: 0, cash: 0, qr: 0 };
        const amount = data.totalAmount || 0;
        dayMap[key].total += amount;
        dayMap[key].count += 1;
        if (data.paymentMethod === 'cash') dayMap[key].cash += amount;
        else dayMap[key].qr += amount;
        total += amount;
        orderCount += 1;
      });

      setCalendarData(dayMap);
      setMonthTotal(total);
      setMonthOrders(orderCount);
    } catch (err) {
      console.error('Calendar month fetch error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMonthData(calendarMonth);
    setSelectedDay(null);
    setDayOrders([]);
  }, [calendarMonth, fetchMonthData]);

  const fetchDayOrders = useCallback(async (dateStr) => {
    setDayLoading(true);
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);

      const snap = await getDocs(
        query(
          collection(db, 'orders'),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end),
          orderBy('timestamp', 'asc')
        )
      );

      const orders = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }))
        .filter(o => o.paymentMethod === 'cash' || o.paymentMethod === 'qr');

      setDayOrders(orders);
    } catch (err) {
      console.error('Day orders fetch error:', err);
    }
    setDayLoading(false);
  }, []);

  function handleDayClick(dateStr) {
    if (selectedDay === dateStr) {
      setSelectedDay(null);
      setDayOrders([]);
    } else {
      setSelectedDay(dateStr);
      fetchDayOrders(dateStr);
    }
  }

  function renderDays() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDOW = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = toDateKey(new Date());

    const maxTotal = Math.max(...Object.values(calendarData).map(d => d.total), 0.01);

    const cells = [];

    // Leading empty cells
    for (let i = 0; i < firstDOW; i++) {
      cells.push(<div key={`e${i}`} className="sca-cell sca-cell-empty" />);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = calendarData[dateStr];
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDay;
      const intensity = data ? Math.max(0.15, data.total / maxTotal) : 0;

      cells.push(
        <div
          key={dateStr}
          className={[
            'sca-cell',
            data ? 'sca-cell-sales' : 'sca-cell-empty-day',
            isToday ? 'sca-cell-today' : '',
            isSelected ? 'sca-cell-selected' : '',
          ].filter(Boolean).join(' ')}
          style={data && !isSelected ? { '--intensity': intensity } : undefined}
          onClick={() => handleDayClick(dateStr)}
          title={data ? `RM${data.total.toFixed(2)} · ${data.count} order${data.count !== 1 ? 's' : ''}` : undefined}
        >
          <span className="sca-cell-num">{d}</span>
          {data && (
            <div className="sca-cell-body">
              <span className="sca-cell-amount">RM{data.total.toFixed(2)}</span>
              <span className="sca-cell-count">{data.count} order{data.count !== 1 ? 's' : ''}</span>
            </div>
          )}
          {isToday && <span className="sca-today-dot" />}
        </div>
      );
    }

    return cells;
  }

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const monthLabel = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const goToPrev = () => setCalendarMonth(new Date(year, month - 1, 1));
  const goToNext = () => setCalendarMonth(new Date(year, month + 1, 1));
  const goToToday = () => setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const dayTotal = selectedDay && calendarData[selectedDay] ? calendarData[selectedDay].total : 0;
  const dayCount = selectedDay && calendarData[selectedDay] ? calendarData[selectedDay].count : 0;

  return (
    <div className="sca-page">

      {/* ── Calendar card ── */}
      <div className="sca-card">

        {/* Month navigation */}
        <div className="sca-nav">
          <button className="sca-nav-btn" onClick={goToPrev} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <div className="sca-nav-center">
            <h3 className="sca-month-label">{monthLabel}</h3>
            <button className="sca-today-btn" onClick={goToToday}>Today</button>
          </div>
          <button className="sca-nav-btn" onClick={goToNext} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Month summary chips */}
        {!loading && (
          <div className="sca-month-stats">
            <div className="sca-stat-chip">
              <TrendingUp size={13} />
              <span>RM{monthTotal.toFixed(2)}</span>
            </div>
            <div className="sca-stat-chip sca-stat-chip-alt">
              <ShoppingBag size={13} />
              <span>{monthOrders} orders</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="sca-loading">
            <div className="loading-spinner" />
            <p>Loading sales data…</p>
          </div>
        ) : (
          <>
            {/* Weekday headers */}
            <div className="sca-weekdays">
              {WEEKDAYS.map(d => (
                <div key={d} className="sca-weekday">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="sca-grid">
              {renderDays()}
            </div>

            {/* Legend */}
            <div className="sca-legend">
              <span className="sca-legend-item">
                <span className="sca-legend-swatch sca-swatch-empty" /> No sales
              </span>
              <span className="sca-legend-item">
                <span className="sca-legend-swatch sca-swatch-low" /> Low
              </span>
              <span className="sca-legend-item">
                <span className="sca-legend-swatch sca-swatch-high" /> High
              </span>
              <span className="sca-legend-item">
                <span className="sca-legend-swatch sca-swatch-today" /> Today
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Day detail panel ── */}
      {selectedDay && (
        <div className="sca-detail">
          <div className="sca-detail-header">
            <div className="sca-detail-date">
              <ShoppingBag size={16} />
              <span>
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-MY', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            </div>
            <button className="sca-detail-close" onClick={() => { setSelectedDay(null); setDayOrders([]); }}>
              <X size={15} />
            </button>
          </div>

          {/* Summary chips */}
          <div className="sca-detail-stats">
            <div className="sca-detail-stat">
              <span className="sca-detail-stat-label">Total Sales</span>
              <span className="sca-detail-stat-value">RM{dayTotal.toFixed(2)}</span>
            </div>
            <div className="sca-detail-stat">
              <span className="sca-detail-stat-label">Orders</span>
              <span className="sca-detail-stat-value">{dayCount}</span>
            </div>
            <div className="sca-detail-stat">
              <span className="sca-detail-stat-label">Avg. Order</span>
              <span className="sca-detail-stat-value">
                {dayCount > 0 ? `RM${(dayTotal / dayCount).toFixed(2)}` : '—'}
              </span>
            </div>
          </div>

          {/* Order rows */}
          {dayLoading ? (
            <div className="sca-detail-loading"><div className="loading-spinner" /></div>
          ) : dayOrders.length === 0 ? (
            <p className="sca-detail-empty">No completed orders on this day.</p>
          ) : (
            <div className="sca-order-list">
              {dayOrders.map(order => (
                <div key={order.id} className="sca-order-row">
                  <span className="sca-order-time">
                    {order.timestamp?.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) || '--:--'}
                  </span>
                  <span className="sca-order-name">{order.customerName || 'Customer'}</span>
                  <span className={`sca-order-method sca-method-${order.paymentMethod}`}>
                    {order.paymentMethod === 'cash'
                      ? <><Banknote size={12} /> Cash</>
                      : <><Smartphone size={12} /> QR</>}
                  </span>
                  <span className="sca-order-amount">RM{(order.totalAmount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SalesCalendar;
