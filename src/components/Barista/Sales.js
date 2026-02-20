// src/components/Barista/Sales.js
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Sales.css';

function Sales() {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSourceLoading, setDataSourceLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalSales, setTotalSales] = useState(0);
  const [dailySales, setDailySales] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'week', 'month'
  const [averageOrderValue, setAverageOrderValue] = useState(0);
  const [topSellingItems, setTopSellingItems] = useState([]);
  const [paymentMethodStats, setPaymentMethodStats] = useState({ cash: 0, qr: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState('');
  const [itemsPerPage] = useState(10);
  const [unsubscribe, setUnsubscribe] = useState(null);

  // Define getFilteredOrders function at component level
  const getFilteredOrders = () => {
    if (!filterText) return salesData;
    
    return salesData.filter(order => 
      (order.customerName?.toLowerCase() || '').includes(filterText.toLowerCase()) ||
      order.id.toLowerCase().includes(filterText.toLowerCase()) ||
      (order.items || []).some(item => (item.name || '').toLowerCase().includes(filterText.toLowerCase()))
    );
  };

  // Define handlePageChange function at component level
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calculate filtered and paginated data
  const filteredOrders = getFilteredOrders();
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const indexOfLastOrder = currentPage * itemsPerPage;
  const indexOfFirstOrder = indexOfLastOrder - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText]);

  // Get time period based on active tab
  const getTimeRange = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate;
    if (activeTab === 'today') {
      startDate = today;
    } else if (activeTab === 'week') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (activeTab === 'month') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    }
    
    return { startDate, now };
  }, [activeTab]);

  // Clean up previous listener when tab changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeTab]);

  // Setup data fetching when tab changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setDataSourceLoading(true);
    setLoading(true);
    
    // Clean up previous listener
    if (unsubscribe) {
      unsubscribe();
    }
    
    // Configure time range
    const { startDate } = getTimeRange();
    
    // Create a real-time listener with appropriate limits
    let queryLimit = 50; // Default
    
    if (activeTab === 'week') {
      queryLimit = 100;
    } else if (activeTab === 'month') {
      queryLimit = 200;
    }
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc'),
      limit(queryLimit)
    );
    
    // Set up the listener
    const listener = onSnapshot(ordersQuery, (snapshot) => {
      // Only include orders where payment has been completed
      const updatedOrders = snapshot.docs
        .filter(doc => doc.data().paymentMethod === 'cash' || doc.data().paymentMethod === 'qr')
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));
      
      setSalesData(updatedOrders);
      processSalesData(updatedOrders);
      setDataSourceLoading(false);
      setLoading(false);
    }, (error) => {
      console.error("Error in real-time orders listener:", error);
      setError('Failed to update sales data: ' + error.message);
      setDataSourceLoading(false);
      setLoading(false);
    });
    
    setUnsubscribe(() => listener);
  }, [activeTab]);
  
  // Process all sales data at once
  const processSalesData = (orders) => {
    if (!orders || orders.length === 0) {
      setDailySales(0);
      setOrderCount(0);
      setAverageOrderValue(0);
      setPaymentMethodStats({ cash: 0, qr: 0, unknown: 0 });
      setTopSellingItems([]);
      return;
    }
    
    // Process basic stats in a single pass
    let periodRevenue = 0;
    let paymentStats = { cash: 0, qr: 0, unknown: 0 };
    const itemCountMap = new Map();
    
    orders.forEach(order => {
      // Calculate revenue
      periodRevenue += order.totalAmount || 0;
      
      // Count payment methods
      const method = order.paymentMethod || 'unknown';
      paymentStats[method] = (paymentStats[method] || 0) + 1;
      
      // Count items
      (order.items || []).forEach(item => {
        const itemName = item.name || 'Unknown Item';
        const quantity = item.quantity || 1;
        itemCountMap.set(itemName, (itemCountMap.get(itemName) || 0) + quantity);
      });
    });
    
    // Set basic stats
    setDailySales(periodRevenue);
    setOrderCount(orders.length);
    setAverageOrderValue(orders.length > 0 ? periodRevenue / orders.length : 0);
    setPaymentMethodStats(paymentStats);
    
    // Set top items
    const topItems = Array.from(itemCountMap, ([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    setTopSellingItems(topItems);
    
  };

  // Get all-time sales total
  useEffect(() => {
    fetchTotalSales();
  }, []);

  // Separate function for fetching total sales
  async function fetchTotalSales() {
    try {
      // Query to get just enough data for total sales calculation
      const totalQuery = query(
        collection(db, 'orders'),
        orderBy('timestamp', 'desc'),
        limit(500) // Reasonable limit for total calculation
      );
      
      const totalSnapshot = await getDocs(totalQuery);
      const totalRevenue = totalSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        // Only count paid orders
        if (data.paymentMethod !== 'cash' && data.paymentMethod !== 'qr') return sum;
        return sum + (data.totalAmount || 0);
      }, 0);
      
      setTotalSales(totalRevenue);
    } catch (err) {
      console.error("Error fetching total sales:", err);
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return timestamp.toLocaleString();
  }

  // Prepare payment method data for pie chart
  const paymentMethodData = [
    { name: 'Cash', value: paymentMethodStats.cash },
    { name: 'QR Payment', value: paymentMethodStats.qr },
  ];
  
  // Add unknown payments if any
  if (paymentMethodStats.unknown && paymentMethodStats.unknown > 0) {
    paymentMethodData.push({ name: 'Unknown', value: paymentMethodStats.unknown });
  }

  return (
    <div className="sales-container">
      <div className="sales-header">
        <h2>Sales Analytics</h2>
        <div className="time-filter">
          <button 
            className={`time-filter-btn ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => setActiveTab('today')}
            disabled={dataSourceLoading}
          >
            Today
          </button>
          <button 
            className={`time-filter-btn ${activeTab === 'week' ? 'active' : ''}`}
            onClick={() => setActiveTab('week')}
            disabled={dataSourceLoading}
          >
            Last 7 Days
          </button>
          <button 
            className={`time-filter-btn ${activeTab === 'month' ? 'active' : ''}`}
            onClick={() => setActiveTab('month')}
            disabled={dataSourceLoading}
          >
            Last 30 Days
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading {activeTab === 'today' ? "today's" : activeTab === 'week' ? "weekly" : "monthly"} sales data...</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="sales-summary">
            <div className="summary-card">
              <h3>Revenue</h3>
              <p className="summary-value">RM{dailySales.toFixed(2)}</p>
              <p className="summary-label">
                {activeTab === 'today' ? "Today's revenue" : 
                 activeTab === 'week' ? "Last 7 days" : "Last 30 days"}
              </p>
            </div>
            <div className="summary-card">
              <h3>Orders</h3>
              <p className="summary-value">{orderCount}</p>
              <p className="summary-label">
                {activeTab === 'today' ? "Today's orders" : 
                 activeTab === 'week' ? "Last 7 days" : "Last 30 days"}
              </p>
            </div>
            <div className="summary-card">
              <h3>Average Order</h3>
              <p className="summary-value">RM{averageOrderValue.toFixed(2)}</p>
              <p className="summary-label">Per order average</p>
            </div>
            <div className="summary-card">
              <h3>All-Time Revenue</h3>
              <p className="summary-value">RM{totalSales.toFixed(2)}</p>
              <p className="summary-label">Since opening</p>
            </div>
          </div>

          {/* Top selling items */}
          <div className="chart-card">
            <h3>Top Selling Items</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSellingItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip formatter={(value) => [value, 'Quantity Sold']} />
                  <Legend />
                  <Bar dataKey="quantity" name="Quantity Sold" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Recent orders */}
          <div className="recent-orders-card">
            <div className="orders-header">
              <h3>
                {activeTab === 'today' ? "Today's Orders" : 
                 activeTab === 'week' ? "Recent Orders (Last 7 Days)" : "Recent Orders (Last 30 Days)"}
              </h3>
              
              {/* Add filter input */}
              <div className="filter-container">
                <input 
                  type="text" 
                  placeholder="Filter orders..." 
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>
            
            {filteredOrders.length === 0 ? (
              <p className="no-data">No orders match your search.</p>
            ) : (
              <>
                <div className="table-container">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Time</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Payment</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentOrders.map(order => (
                        <tr key={order.id}>
                          <td>{order.id.substring(0, 8)}...</td>
                          <td>{formatTimestamp(order.timestamp)}</td>
                          <td>{order.customerName}</td>
                          <td className="items-cell">
                            {(order.items || []).map((item, index) => (
                              <div key={`${order.id}-${item.id || index}`} className="order-item-detail">
                                {item.quantity}x {item.name}
                              </div>
                            ))}
                          </td>
                          <td>
                            {order.paymentMethod ? (
                              <span className={`payment-badge ${order.paymentMethod}`}>
                                {order.paymentMethod === 'cash' ? 'Cash' : 'QR'}
                              </span>
                            ) : (
                              <span className="payment-badge unknown">Unknown</span>
                            )}
                          </td>
                          <td>RM{(order.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Add pagination */}
                <div className="pagination">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="page-button"
                  >
                    &laquo; Prev
                  </button>
                  
                  <div className="page-info">
                    Page {currentPage} of {totalPages || 1}
                  </div>
                  
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="page-button"
                  >
                    Next &raquo;
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Sales;