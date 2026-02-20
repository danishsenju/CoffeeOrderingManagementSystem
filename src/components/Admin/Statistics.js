// src/components/Admin/Statistics.js
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CalendarDays } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import './Statistics.css';

function Statistics() {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('day'); // day, week, month, year
  const [totalStats, setTotalStats] = useState({
    revenue: 0,
    orders: 0,
    avgOrderValue: 0
  });
  const [topItems, setTopItems] = useState([]);
  const [paymentMethodStats, setPaymentMethodStats] = useState({ cash: 0, qr: 0, unknown: 0 });
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);

  useEffect(() => {
    fetchSalesData();
  }, [timeRange]);

  // Helper function to normalize payment methods
  const normalizePaymentMethod = (method) => {
    if (!method) return 'unknown';
    
    const normalizedMethod = String(method).toLowerCase().trim();
    if (normalizedMethod === 'cash') return 'cash';
    if (normalizedMethod === 'qr') return 'qr';
    return 'unknown';
  };

  async function fetchSalesData() {
    setLoading(true);
    try {
      // Get current date
      const now = new Date();
      let startDate = new Date();
      
      // Calculate start date based on selected time range
      switch (timeRange) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setHours(0, 0, 0, 0);
      }
      
      // Create query to get orders within the time range
      const ordersQuery = query(
        collection(db, 'orders'),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc')
      );
      
      // Get orders
      const ordersSnapshot = await getDocs(ordersQuery);
      
      // Log raw data from Firestore
      console.log("Raw order data from Firestore:");
      ordersSnapshot.docs.forEach((doc, index) => {
        if (index < 3) { // Just log first 3 for brevity
          console.log(`Order ${index + 1}:`, doc.id, doc.data());
          console.log(`  - Payment method:`, doc.data().paymentMethod, typeof doc.data().paymentMethod);
        }
      });
      
      // Only include orders where payment has been completed (paymentMethod is set)
      const orders = ordersSnapshot.docs
        .filter(doc => doc.data().paymentMethod === 'cash' || doc.data().paymentMethod === 'qr')
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            paymentMethod: processPaymentMethod(data.paymentMethod),
            timestamp: data.timestamp?.toDate()
          };
        });
      
      // Log processed data
      console.log("Processed order data (first 3):");
      orders.slice(0, 3).forEach((order, index) => {
        console.log(`Order ${index + 1}:`, order.id, "Payment method:", order.paymentMethod);
      });
      
      setSalesData(orders);
      
      // Calculate basic statistics
      const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const avgOrderValue = orders.length > 0 ? revenue / orders.length : 0;
      
      setTotalStats({
        revenue,
        orders: orders.length,
        avgOrderValue
      });
      
      // Calculate payment method statistics
      const paymentStats = { cash: 0, qr: 0, unknown: 0 };
      const cashTotal = { value: 0 };
      const qrTotal = { value: 0 };
      const unknownTotal = { value: 0 };
      
      // Log distribution of payment methods
      const paymentDistribution = {};
      orders.forEach(order => {
        const method = order.paymentMethod || "null";
        if (!paymentDistribution[method]) paymentDistribution[method] = 0;
        paymentDistribution[method]++;
      });
      console.log("Payment method distribution:", paymentDistribution);
      
      orders.forEach(order => {
        // Force proper string handling here
        const rawMethod = order.paymentMethod;
        console.log(`Processing order ${order.id.substring(0, 8)}, raw payment method: "${rawMethod}"`);
        
        // Always normalize to lowercase string and handle null
        let method = 'unknown';
        if (rawMethod) {
          if (typeof rawMethod === 'string') {
            const normalizedMethod = rawMethod.toLowerCase().trim();
            if (normalizedMethod === 'cash') method = 'cash';
            else if (normalizedMethod === 'qr') method = 'qr';
          }
        }
        
        console.log(`  - Normalized to: "${method}"`);
        
        // Count the order in appropriate category
        paymentStats[method] = (paymentStats[method] || 0) + 1;
        
        // Add to payment method totals
        if (method === 'cash') {
          cashTotal.value += order.totalAmount || 0;
        } else if (method === 'qr') {
          qrTotal.value += order.totalAmount || 0;
        } else {
          unknownTotal.value += order.totalAmount || 0;
        }
      });
      
      console.log("Final payment stats:", paymentStats);
      
      // Save the stats
      setPaymentMethodStats({
        ...paymentStats,
        cashTotal: cashTotal.value,
        qrTotal: qrTotal.value,
        unknownTotal: unknownTotal.value
      });
      
      // Calculate top selling items with improved category handling
      const itemCounts = {};
      const categoryMap = {
        'coffee': 'Coffee',
        'noncoffee': 'Non-Coffee',
        // Fallback for any other categories
        'tea': 'Non-Coffee',
        'food': 'Non-Coffee',
        'dessert': 'Non-Coffee',
        'beverage': 'Non-Coffee'
      };
      
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (!item) return; // Skip if item is undefined
            
            const itemName = item.name || 'Unknown Item';
            const quantity = item.quantity || 1;
            const price = item.price || 0;
            
            // Improve category handling with normalization and fallbacks
            let category = 'Unknown';
            if (item.category && typeof item.category === 'string') {
              // Normalize category name (lowercase and trim)
              const normalizedCategory = item.category.toLowerCase().trim();
              
              // Use the mapping to get a standardized category name
              category = categoryMap[normalizedCategory] || 
                        (item.category.charAt(0).toUpperCase() + item.category.slice(1));
            } else {
              // Try to infer category from the item name if not provided
              const itemNameLower = itemName.toLowerCase();
if (itemNameLower.includes('coffee') || itemNameLower.includes('latte') || 
    itemNameLower.includes('espresso') || itemNameLower.includes('cappuccino')) {
  category = 'Coffee';
} else {
  category = 'Non-Coffee';
}
            }
            
            if (itemCounts[itemName]) {
              itemCounts[itemName].count += quantity;
              itemCounts[itemName].revenue += price * quantity;
              itemCounts[itemName].category = category;
            } else {
              itemCounts[itemName] = {
                name: itemName,
                count: quantity,
                revenue: price * quantity,
                category: category
              };
            }
          });
        }
      });
      
      // Convert to array and sort by count
      const topItemsArray = Object.values(itemCounts).sort((a, b) => b.count - a.count);
      setTopItems(topItemsArray.slice(0, 10)); // Top 10 items
      
      // Calculate category breakdown
      const categorySales = {};
      topItemsArray.forEach(item => {
        const category = item.category || 'Unknown';
        if (categorySales[category]) {
          categorySales[category] += item.revenue;
        } else {
          categorySales[category] = item.revenue;
        }
      });
      
      const categoryData = Object.keys(categorySales).map(category => ({
        name: category,
        value: categorySales[category]
      }));
      
      setCategoryBreakdown(categoryData);
      
      // Calculate hourly data
      if (timeRange === 'day') {
        const hours = Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          sales: 0,
          orders: 0
        }));
        
        orders.forEach(order => {
          if (order.timestamp) {
            const hour = order.timestamp.getHours();
            hours[hour].sales += order.totalAmount || 0;
            hours[hour].orders += 1;
          }
        });
        
        setHourlyData(hours.filter(h => h.sales > 0));
      }
      
      // Calculate daily revenue data
      const dailyData = [];
      if (timeRange === 'week' || timeRange === 'month') {
        const dateMap = new Map();
        
        orders.forEach(order => {
          if (order.timestamp) {
            const dateStr = order.timestamp.toISOString().split('T')[0];
            if (dateMap.has(dateStr)) {
              dateMap.get(dateStr).sales += order.totalAmount || 0;
              dateMap.get(dateStr).orders += 1;
            } else {
              dateMap.set(dateStr, {
                date: order.timestamp,
                sales: order.totalAmount || 0,
                orders: 1
              });
            }
          }
        });
        
        const sortedDates = Array.from(dateMap.values())
          .sort((a, b) => a.date - b.date);
        
        sortedDates.forEach(entry => {
          dailyData.push({
            date: entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales: entry.sales,
            orders: entry.orders
          });
        });
      }
      
      setDailyRevenue(dailyData);
      
    } catch (err) {
      console.error("Error fetching sales data:", err);
      setError('Failed to fetch sales data: ' + err.message);
    }
    setLoading(false);
  }
  
  // Helper function to process payment method consistently
  function processPaymentMethod(method) {
    if (!method) return 'unknown';
    const normalized = String(method).toLowerCase().trim();
    if (normalized === 'cash') return 'cash';
    if (normalized === 'qr') return 'qr';
    return 'unknown';
  }

  // Format timestamp safely
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return timestamp.toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Format currency consistently
  const formatCurrency = (amount) => {
    return `RM${(amount || 0).toFixed(2)}`;
  };

  // Count items safely
  const countItems = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  };

  // Generate colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Custom tooltip formatter for currency values
  const currencyFormatter = (value) => `RM${value.toFixed(2)}`;

  // Helper function to get display text for payment method
  const getPaymentMethodDisplay = (method) => {
    if (method === 'cash') return 'Cash';
    if (method === 'qr') return 'QR Payment';
    return 'Unknown';
  };

  return (
    <div className="statistics">
      <div className="statistics-header">
        <div className="time-range-selector">
          <button 
            className={`time-range-btn ${timeRange === 'day' ? 'active' : ''}`} 
            onClick={() => setTimeRange('day')}
          >
            Today
          </button>
          <button 
            className={`time-range-btn ${timeRange === 'week' ? 'active' : ''}`} 
            onClick={() => setTimeRange('week')}
          >
            Last 7 Days
          </button>
          <button 
            className={`time-range-btn ${timeRange === 'month' ? 'active' : ''}`} 
            onClick={() => setTimeRange('month')}
          >
            Last 30 Days
          </button>
          <button 
            className={`time-range-btn ${timeRange === 'year' ? 'active' : ''}`} 
            onClick={() => setTimeRange('year')}
          >
            Last Year
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading sales data...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="stats-summary">
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <p className="stat-value">{formatCurrency(totalStats.revenue)}</p>
              <p className="stat-label">
                {timeRange === 'day' ? 'Today' :
                 timeRange === 'week' ? 'Last 7 days' :
                 timeRange === 'month' ? 'Last 30 days' : 'Last Year'
                }
              </p>
            </div>
            <div className="stat-card">
              <h3>Total Orders</h3>
              <p className="stat-value">{totalStats.orders}</p>
              <p className="stat-label">Completed transactions</p>
            </div>
            <div className="stat-card">
              <h3>Average Order</h3>
              <p className="stat-value">{formatCurrency(totalStats.avgOrderValue)}</p>
              <p className="stat-label">Per transaction</p>
            </div>
            <div className="stat-card">
              <h3>Payment Methods</h3>
              <div className="payment-summary">
                <div className="payment-stat">
                  <span className="payment-label">Cash:</span>
                  <span className="payment-count">{paymentMethodStats.cash}</span>
                  <span className="payment-total">{formatCurrency(paymentMethodStats.cashTotal)}</span>
                </div>
                <div className="payment-stat">
                  <span className="payment-label">QR:</span>
                  <span className="payment-count">{paymentMethodStats.qr}</span>
                  <span className="payment-total">{formatCurrency(paymentMethodStats.qrTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar banner */}
          <Link to="/admin/calendar" className="stats-calendar-banner">
            <div className="stats-calendar-banner-left">
              <CalendarDays size={22} />
              <div>
                <p className="stats-calendar-banner-title">Sales Calendar</p>
                <p className="stats-calendar-banner-sub">View daily sales totals in a full calendar layout</p>
              </div>
            </div>
            <span className="stats-calendar-banner-cta">Open Calendar →</span>
          </Link>

          {/* Main Dashboard Charts */}
          <div className="charts-section">
            <div className="chart-row">
              {/* Revenue Trend Chart */}
              <div className="chart-card large">
                <h3>Revenue Trend</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    {timeRange === 'day' ? (
                      <AreaChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="hour" 
                          tickFormatter={(hour) => `${hour}:00`}
                        />
                        <YAxis tickFormatter={currencyFormatter} />
                        <Tooltip 
                          formatter={(value) => [currencyFormatter(value), "Revenue"]}
                          labelFormatter={(hour) => `${hour}:00 - ${hour+1}:00`}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          name="Revenue" 
                          fill="#8884d8" 
                          stroke="#8884d8" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={dailyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={currencyFormatter} />
                        <Tooltip 
                          formatter={(value) => [currencyFormatter(value), "Revenue"]}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="sales" 
                          name="Revenue" 
                          stroke="#8884d8" 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="chart-row">
              {/* Top Selling Items */}
              <div className="chart-card">
                <h3>Top Selling Items</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topItems.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip 
                        formatter={(value) => [`${value} units`, "Quantity"]}
                      />
                      <Legend />
                      <Bar dataKey="count" name="Units Sold" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Methods Chart */}
              <div className="chart-card">
                <h3>Payment Methods</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Cash', value: paymentMethodStats.cash || 0 },
                          { name: 'QR Payment', value: paymentMethodStats.qr || 0 },
                          { name: 'Unknown', value: paymentMethodStats.unknown || 0 }
                        ].filter(item => item.value > 0)} // Only show methods with values > 0
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Cash', value: paymentMethodStats.cash || 0 },
                          { name: 'QR Payment', value: paymentMethodStats.qr || 0 },
                          { name: 'Unknown', value: paymentMethodStats.unknown || 0 }
                        ].filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} orders`, "Count"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="chart-card">
                <h3>Sales by Category</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [currencyFormatter(value), "Sales"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Items Table */}
          <div className="data-section">
            <div className="data-card">
              <h3>Top Selling Products</h3>
              {topItems.length === 0 ? (
                <p className="no-data">No sales data available</p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Quantity Sold</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>
                            <span className={`category-badge ${(item.category || 'Unknown').toLowerCase()}`}>
                              {item.category || 'Unknown'}
                            </span>
                          </td>
                          <td>{item.count}</td>
                          <td>{formatCurrency(item.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          
          {/* Recent Orders Table */}
          <div className="data-section">
            <div className="data-card">
              <h3>Recent Orders</h3>
              {salesData.length === 0 ? (
                <p className="no-data">No orders in the selected time period</p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date & Time</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Payment Method</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.slice(0, 15).map(order => (
                        <tr key={order.id}>
                          <td>{order.id.substring(0, 8)}...</td>
                          <td>{formatDate(order.timestamp)}</td>
                          <td>{order.customerName || 'Unknown'}</td>
                          <td>{countItems(order.items)} items</td>
                          <td>
  <span className={`payment-badge ${order.paymentMethod || 'unknown'}`}>
    {order.paymentMethod === 'cash' ? 'Cash' : 
     order.paymentMethod === 'qr' ? 'QR Payment' : 'Unknown'}
  </span>
</td>
                          <td>{formatCurrency(order.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Statistics;