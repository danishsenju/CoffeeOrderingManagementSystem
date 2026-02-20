// src/components/Barista/OrderForm.js
import { useState, useEffect } from 'react';
import { Coffee, Flame, Snowflake, ShoppingCart, Banknote, Smartphone, Lock, Sun, X, ChevronLeft } from 'lucide-react';
import { collection, getDocs, addDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import qrImage from '../../images/qrdanish.jpeg';
import { useOrders } from '../../context/OrderContext'; // Import the orders context
import './OrderForm.css';

function OrderForm() {
  // Get order state and functions from context
  const {
    displayedOrders,
    addOrder,
    updateItemStatus: contextUpdateItemStatus,
    completeOrder,
    updatePaymentMethod,
    areAllItemsCompleted
  } = useOrders();

  // Local component state
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderId, setOrderId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('qr'); // Default payment method is QR
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [qrBrightness, setQrBrightness] = useState(1);
  const [customerGender, setCustomerGender] = useState('');

  useEffect(() => {
    // Fetch menu items from Firestore
    fetchMenuItems();
  }, []);

  // Helper function to normalize payment method values
  function normalizePaymentMethod(method) {
    if (!method) return 'qr'; // Default to qr if no method provided
    
    const normalized = String(method).toLowerCase().trim();
    if (normalized === 'cash') return 'cash';
    if (normalized === 'qr') return 'qr';
    
    // Default to qr for any other value
    return 'qr';
  }

  // Helper function to detect category from item name
  function detectCategory(itemName) {
    if (!itemName) return 'Unknown';
    
    const name = itemName.toLowerCase();
    
    // Simple category detection based on item name
    if (name.includes('coffee') || name.includes('latte') || 
        name.includes('espresso') || name.includes('cappuccino')) {
      return 'Coffee';
    } else if (name.includes('tea')) {
      return 'Tea';
    } else if (name.includes('cake') || name.includes('pastry') || 
              name.includes('cookie') || name.includes('muffin')) {
      return 'Pastry';
    } else if (name.includes('sandwich') || name.includes('salad')) {
      return 'Food';
    } else if (name.includes('juice') || name.includes('soda') || 
              name.includes('water') || name.includes('drink')) {
      return 'Beverage';
    }
    
    return 'Other';
  }

  async function fetchMenuItems() {
    setLoading(true);
    try {
      const menuCollection = collection(db, 'menu');
      const menuSnapshot = await getDocs(menuCollection);
      const items = menuSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Group items by category - we'll keep unavailable items but mark them
      const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {});
      
      setMenuItems(groupedItems);
    } catch (err) {
      setError('Failed to fetch menu items: ' + err.message);
    }
    setLoading(false);
  }

  // Wrapper function to update item status in both context and Firestore
  async function handleUpdateItemStatus(orderId, itemId, newStatus) {
    console.log(`Updating item ${itemId} in order ${orderId} to status: ${newStatus}`);
    
    // Update in context
    contextUpdateItemStatus(orderId, itemId, newStatus);
    
    // If this is the current order being created, update orderItems too
    if (orderItems.some(item => item.id === itemId)) {
      setOrderItems(prevItems => {
        return prevItems.map(item => {
          if (item.id === itemId) {
            return { ...item, status: newStatus };
          }
          return item;
        });
      });
    }
    
    try {
      // Update in Firestore
      const orderDoc = doc(db, 'orders', orderId);
      const orderSnapshot = await getDoc(orderDoc);
      
      if (orderSnapshot.exists()) {
        const orderData = orderSnapshot.data();
        
        // Find and update the matching item in the Firestore data
        const updatedItems = orderData.items.map(item => {
          // This handles both regular items and temperature-specific items
          const itemIdMatches = 
            item.id === itemId || 
            (item.originalId && item.originalId === itemId) || 
            (itemId.includes(item.id));
          
          if (itemIdMatches) {
            console.log(`Found matching item: ${item.name} with id ${item.id}`);
            return { ...item, status: newStatus };
          }
          return item;
        });
        
        // Update the items array in Firestore
        await updateDoc(orderDoc, {
          items: updatedItems
        });
        
        console.log(`Status for item ${itemId} in order ${orderId} updated to ${newStatus} in Firestore`);
      } else {
        console.error(`Order document ${orderId} not found in Firestore`);
      }
    } catch (error) {
      console.error("Error updating item status in Firestore:", error);
      setError(`Failed to update item status: ${error.message}`);
      setTimeout(() => setError(''), 3000);
    }
  }

  function addToOrder(item) {
    // Ensure item has a category
    const itemWithCategory = {
      ...item,
      category: item.category || detectCategory(item.name) || 'Unknown'
    };
    
    // Check if item already exists in order
    const existingItem = orderItems.find(orderItem => orderItem.id === item.id);
    
    if (existingItem) {
      // Update quantity if item already exists
      setOrderItems(orderItems.map(orderItem =>
        orderItem.id === item.id
          ? { ...orderItem, quantity: orderItem.quantity + 1 }
          : orderItem
      ));
    } else {
      // Add new item to order with category
      const newItem = { ...itemWithCategory, quantity: 1, status: 'pending' };
      setOrderItems([...orderItems, newItem]);
    }
    
    // Update order total
    setOrderTotal(prevTotal => prevTotal + item.price);
    
    // Show quick success notification
    setSuccess(`Added ${item.name} to order`);
    setTimeout(() => setSuccess(''), 1500);
  }

  function addItemWithTemperature(item, temperature) {
    // Create a new item with the appropriate temperature and price
    const tempPrice = temperature === 'Hot' ? item.hotPrice : item.coldPrice;
    const itemId = item.id + '-' + temperature.toLowerCase();
    
    // Ensure category is assigned
    const category = item.category || detectCategory(item.name) || 'Unknown';
    
    const itemWithTemp = {
      id: itemId,
      originalId: item.id,
      name: `${item.name} (${temperature})`,
      price: tempPrice,
      temperature: temperature,
      baseItem: item.name,
      category: category,
      status: 'pending'
    };
    
    // Check if this exact item/temperature combination already exists in the order
    const existingItem = orderItems.find(orderItem => orderItem.id === itemId);
    
    if (existingItem) {
      // Update quantity if item already exists
      setOrderItems(orderItems.map(orderItem =>
        orderItem.id === itemId
          ? { ...orderItem, quantity: orderItem.quantity + 1 }
          : orderItem
      ));
    } else {
      // Add new item to order
      setOrderItems([...orderItems, { ...itemWithTemp, quantity: 1 }]);
    }
    
    // Update order total
    setOrderTotal(prevTotal => prevTotal + tempPrice);
    
    // Show quick success notification
    setSuccess(`Added ${item.name} (${temperature}) to order`);
    setTimeout(() => setSuccess(''), 1500);
  }

  function removeFromOrder(itemId) {
    const item = orderItems.find(orderItem => orderItem.id === itemId);
    
    if (item) {
      if (item.quantity > 1) {
        // Decrease quantity if more than 1
        setOrderItems(orderItems.map(orderItem =>
          orderItem.id === itemId
            ? { ...orderItem, quantity: orderItem.quantity - 1 }
            : orderItem
        ));
      } else {
        // Remove item if quantity is 1
        setOrderItems(orderItems.filter(orderItem => orderItem.id !== itemId));
      }
      
      // Update order total
      setOrderTotal(prevTotal => prevTotal - item.price);
    }
  }

  async function handleCompleteOrder() {
    if (orderItems.length === 0) {
      setError('Cannot submit an empty order');
      return;
    }
    
    if (!customerName.trim()) {
      setError('Please enter a customer name');
      return;
    }
    
    try {
      // Create order in Firestore with improved category handling
      const orderRef = await addDoc(collection(db, 'orders'), {
        customerName: customerName.trim(),
        customerGender: customerGender || null,
        items: orderItems.map(item => ({
          id: item.originalId || item.id,
          name: item.name,
          price: item.price,
          temperature: item.temperature || null,
          quantity: item.quantity,
          status: item.status || 'pending',
          category: item.category || detectCategory(item.name) || 'Unknown'
        })),
        totalAmount: orderTotal,
        status: 'pending',
        timestamp: serverTimestamp(),
        paymentMethod: null // Initialize payment method as null - will be set later
      });
      
      // Store the order in active orders list with improved category handling
      const newOrder = {
        id: orderRef.id,
        customer: customerName.trim(),
        gender: customerGender || null,
        items: orderItems.map(item => ({
          id: item.id,
          originalId: item.originalId || item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          status: item.status || 'pending',
          category: item.category || detectCategory(item.name) || 'Unknown'
        })),
        total: orderTotal,
        status: 'pending',
        paymentMethod: null, // Will be set when payment is completed
        createdAt: new Date()
      };
      
      // Add the order to context
      addOrder(newOrder);
      
      setOrderId(orderRef.id);
      setShowPayment(true);
      setError('');
    } catch (err) {
      setError('Failed to create order: ' + err.message);
    }
  }

  function handlePaymentMethodChange(method) {
    setPaymentMethod(normalizePaymentMethod(method));
  }

  async function handlePaymentCompleted() {
    // Log current payment method value for debugging
    console.log("Current payment method before processing:", paymentMethod, typeof paymentMethod);
    
    // Force payment method to be exactly 'cash' or 'qr'
    const validPaymentMethod = paymentMethod === 'cash' ? 'cash' : 'qr';
    
    console.log("Using payment method:", validPaymentMethod);
    
    // Update context
    updatePaymentMethod(orderId, validPaymentMethod);
    
    // CRITICAL: Update the order in Firestore to include payment method
    try {
      const orderDoc = doc(db, 'orders', orderId);
      
      // Let's log the document we're updating
      console.log("Updating document:", orderId, "with payment method:", validPaymentMethod);
      
      // Use updateDoc with explicit field path to update payment method
      await updateDoc(orderDoc, {
        "paymentMethod": validPaymentMethod // Specify exact string literal
      });
      
      console.log(`Payment method updated successfully to "${validPaymentMethod}" for order ${orderId}`);
      
      // Verify after update
      const docRef = doc(db, 'orders', orderId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        console.log("Verification - updated document data:", snap.data());
      }
    } catch (error) {
      console.error("Exception when updating payment method:", error);
    }
    
    // Reset current order form
    setOrderItems([]);
    setCustomerName('');
    setCustomerGender('');
    setOrderTotal(0);
    setShowPayment(false);
    setSuccess(`Order successfully completed with ${validPaymentMethod === 'cash' ? 'Cash' : 'QR'} payment!`);

    setTimeout(() => {
      setSuccess('');
      setOrderId(null);
    }, 3000);
  }

  // Handle serve order (mark as completed)
  async function handleServeOrder(orderId) {
    // Use the context function
    completeOrder(orderId);
    
    // Also update in Firestore
    try {
      const orderDoc = doc(db, 'orders', orderId);
      await updateDoc(orderDoc, {
        status: 'completed',
        completedAt: serverTimestamp()
      });
      console.log(`Order ${orderId} marked as completed in Firestore`);
    } catch (error) {
      console.error("Error updating order status in Firestore:", error);
    }
  }

  // Get all available categories
  const categories = ['all', ...Object.keys(menuItems)];
  
  // Filter menu items by category if not "all"
  const filteredMenuItems = activeCategory === 'all' 
    ? menuItems 
    : { [activeCategory]: menuItems[activeCategory] };

  // Custom menu item card component with temperature options
  function MenuItemCard({ item }) {
    const hasTempOptions = item.hotPrice !== undefined && item.coldPrice !== undefined;
    const isAvailable = item.available !== false; // Consider undefined as available for backward compatibility
    
    // Common styles for unavailable items
    const unavailableStyle = {
      opacity: 0.5,
      position: 'relative'
    };
    
    if (hasTempOptions) {
      return (
        <div 
          className={`menu-item-card ${!isAvailable ? 'unavailable' : ''}`} 
          style={!isAvailable ? unavailableStyle : {}}
        >
          {!isAvailable && (
            <div className="unavailable-overlay">
              <span className="unavailable-icon"><Lock size={20} /></span>
              <span className="unavailable-text">Not Available</span>
            </div>
          )}
          <div className="item-image">
            <span className="coffee-icon"><Coffee size={20} /></span>
          </div>
          <div className="item-info">
            <h5>{item.name}</h5>
          </div>
          <div className="temperature-options">
            <button
              className="temp-button hot"
              onClick={(e) => {
                e.stopPropagation();
                if (isAvailable) addItemWithTemperature(item, 'Hot');
              }}
              disabled={!isAvailable}
            >
              <span className="temp-icon"><Flame size={16} /></span>
            </button>
            <button
              className="temp-button cold"
              onClick={(e) => {
                e.stopPropagation();
                if (isAvailable) addItemWithTemperature(item, 'Cold');
              }}
              disabled={!isAvailable}
            >
              <span className="temp-icon"><Snowflake size={16} /></span>
            </button>
          </div>
        </div>
      );
    } else {
      // Standard menu item without temperature options
      return (
        <div 
          className={`menu-item-card ${!isAvailable ? 'unavailable' : ''}`}
          onClick={() => isAvailable && addToOrder(item)}
          style={!isAvailable ? unavailableStyle : {}}
        >
          {!isAvailable && (
            <div className="unavailable-overlay">
              <span className="unavailable-icon"><Lock size={20} /></span>
              <span className="unavailable-text">Not Available</span>
            </div>
          )}
          <div className="item-image">
            <span className="coffee-icon"><Coffee size={20} /></span>
          </div>
          <div className="item-info">
            <h5>{item.name}</h5>
            <div className="item-price">RM{item.price?.toFixed(2) || '0.00'}</div>
          </div>
          <button className="add-item-button" disabled={!isAvailable}>
            <span>+</span>
          </button>
        </div>
      );
    }
  }

  return (
    <div className="barista-order-form">
      {/* Top Order Summary and Tracking Bar */}
      <div className="top-order-bar">
        <div className="order-info">
          <h3>Current Order: {customerName || 'New Customer'}</h3>
          <div className="order-meta">
            <span className="item-count">{orderItems.reduce((sum, item) => sum + item.quantity, 0)} items</span>
            <span className="order-total">RM{orderTotal.toFixed(2)}</span>
          </div>
        </div>
        
        {/* Order Tracking Section - Always display pending orders regardless of current customer */}
        <div className="order-tracking-container">
          {displayedOrders.length > 0 ? (
            displayedOrders.map(order => (
              <div key={order.id} className={`order-tracking order-gender-${order.gender || 'none'}`}>
                <div className="order-tracking-header">
                  <h4>{order.customer}</h4>
                  {areAllItemsCompleted(order.id) && (
                    <button
                      className="serve-button small"
                      onClick={() => handleServeOrder(order.id)}
                    >
                      Serve
                    </button>
                  )}
                </div>
                <div className="tracking-items">
                  {order.items.map(item => (
                    <div key={`${order.id}-${item.id}`} className="tracking-item">
                      <span className="tracking-name">{item.quantity}× {item.name}</span>
                      <div className="tracking-controls">
                        <select 
                          value={item.status || 'pending'}
                          onChange={(e) => handleUpdateItemStatus(order.id, item.id, e.target.value)}
                          className={`status-select ${item.status || 'pending'}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="preparing">Preparing</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                {order.paymentMethod && (
                  <div className="order-payment-method">
                    Payment: <span className={`payment-badge ${order.paymentMethod}`}>
                      {order.paymentMethod === 'cash' ? 'Cash' : 'QR'}
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-tracking">
              <p>No active orders to track</p>
            </div>
          )}
        </div>
        
        <div className="order-actions">
          <div className="name-gender-row">
            <div className="name-input">
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer name"
                required
              />
            </div>
            <div className="gender-toggle">
              <button
                type="button"
                className={`gender-btn male ${customerGender === 'male' ? 'active' : ''}`}
                onClick={() => setCustomerGender(customerGender === 'male' ? '' : 'male')}
                title="Male"
              >♂</button>
              <button
                type="button"
                className={`gender-btn female ${customerGender === 'female' ? 'active' : ''}`}
                onClick={() => setCustomerGender(customerGender === 'female' ? '' : 'female')}
                title="Female"
              >♀</button>
            </div>
          </div>
          <button
            className="checkout-button"
            onClick={handleCompleteOrder}
            disabled={orderItems.length === 0}
          >
            Complete Order
          </button>
        </div>
      </div>

      {/* Notification Messages */}
      {error && (
        <div className="error-message">
          <span className="message-icon">!</span>
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <span className="message-icon">✓</span>
          {success}
        </div>
      )}
      
      {/* Payment View */}
      {showPayment ? (
        <div className="payment-container">
          <div className="payment-header">
            <h3>Payment for {customerName}</h3>
            <div className="order-id">Order #{orderId && orderId.substring(0, 8)}</div>
          </div>
          
          {/* Payment Method Selection */}
          <div className="payment-method-selection">
            <h4>Select Payment Method</h4>
            <div className="payment-options">
              <button 
                className={`payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange('cash')}
              >
                <span className="payment-icon"><Banknote size={24} /></span>
                <span className="payment-label">Cash</span>
              </button>
              <button 
                className={`payment-option ${paymentMethod === 'qr' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange('qr')}
              >
                <span className="payment-icon"><Smartphone size={24} /></span>
                <span className="payment-label">QR Payment</span>
              </button>
            </div>
          </div>
          
          <div className="payment-columns">
            <div className="payment-details">
              <div className="order-summary-card">
                <h4>Order Summary</h4>
                <div className="order-items">
                  {orderItems.map(item => (
                    <div key={item.id} className="summary-item">
                      <div className="item-quantity">{item.quantity}x</div>
                      <div className="item-name">{item.name}</div>
                      <div className="item-price">RM{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div className="order-total-row">
                  <span>Total</span>
                  <span>RM{orderTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="payment-qr">
              {paymentMethod === 'qr' ? (
                <>
                  <div className="payment-instructions">
                    <p>Please scan the QR code to complete payment</p>
                  </div>
                  <div className="qr-code">
                    <img
                      src={qrImage}
                      alt="Payment QR Code"
                      className="qr-image qr-image-clickable"
                      onClick={() => setQrFullscreen(true)}
                      title="Tap to view full screen"
                    />
                    <p className="qr-tap-hint">Tap image to enlarge</p>
                  </div>
                </>
              ) : (
                <div className="cash-payment">
                  <div className="cash-icon-container">
                    <span className="cash-icon"><Banknote size={40} /></span>
                  </div>
                  <div className="cash-instructions">
                    <p>Please collect RM{orderTotal.toFixed(2)} from the customer</p>
                  </div>
                </div>
              )}
              
              <div className="payment-actions">
                <button onClick={() => setShowPayment(false)} className="back-button">
                  Back to Order
                </button>
                <button onClick={handlePaymentCompleted} className="complete-button">
                  Complete Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="order-main-content">
          {/* Menu Section */}
          <div className="menu-section">
            {/* Category filters */}
            <div className="category-filters">
              {categories.map(category => (
                <button 
                  key={category}
                  className={`category-filter ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category === 'all' ? 'All Items' : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Menu Items */}
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading menu items...</p>
              </div>
            ) : Object.keys(filteredMenuItems).length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Coffee size={32} /></div>
                <p>No menu items available in this category.</p>
              </div>
            ) : (
              <div className="menu-grid">
                {Object.keys(filteredMenuItems).map(category => (
                  <div key={category} className="menu-category">
                    <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                    <div className="items-grid">
                      {filteredMenuItems[category].map(item => (
                        <MenuItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Current order cart */}
          <div className="current-order">
            <div className="current-order-header">
              <h3>Order Details</h3>
            </div>
            
            {orderItems.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon"><ShoppingCart size={32} /></div>
                <p>Your order is empty</p>
                <p className="helper-text">Click on menu items to add them to the order</p>
              </div>
            ) : (
              <>
                <div className="order-items-list">
                  {orderItems.map(item => (
                    <div key={item.id} className="order-item">
                      <div className="order-item-details">
                        <h4>{item.name}</h4>
                        <div className="item-price">RM{item.price.toFixed(2)}</div>
                      </div>
                      <div className="quantity-controls">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          removeFromOrder(item.id);
                        }} className="quantity-btn decrease">
                          −
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          item.temperature 
                            ? addItemWithTemperature(
                                {
                                  id: item.originalId,
                                  name: item.baseItem,
                                  hotPrice: item.temperature === 'Hot' ? item.price : undefined,
                                  coldPrice: item.temperature === 'Cold' ? item.price : undefined,
                                  category: item.category
                                }, 
                                item.temperature
                              )
                            : addToOrder(item);
                        }} className="quantity-btn increase">
                          +
                        </button>
                      </div>
                      <div className="item-total">
                        RM{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* QR Fullscreen Overlay */}
      {qrFullscreen && (
        <div className="qr-fullscreen-overlay">
          <div className="qr-fullscreen-topbar">
            <button
              className="qr-back-btn"
              onClick={() => { setQrFullscreen(false); setQrBrightness(1); }}
            >
              <ChevronLeft size={20} /> Back
            </button>
            <span className="qr-fullscreen-title">QR Payment</span>
            <button
              className="qr-close-btn"
              onClick={() => { setQrFullscreen(false); setQrBrightness(1); }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="qr-fullscreen-body">
            <img
              src={qrImage}
              alt="Payment QR Code"
              className="qr-fullscreen-img"
              style={{ filter: `brightness(${qrBrightness})` }}
            />
          </div>

          <div className="qr-brightness-bar">
            <Sun size={16} className="qr-sun-icon dim" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={qrBrightness}
              onChange={e => setQrBrightness(parseFloat(e.target.value))}
              className="qr-brightness-slider"
              aria-label="Brightness"
            />
            <Sun size={22} className="qr-sun-icon bright" />
            <span className="qr-brightness-label">{Math.round((qrBrightness - 1) / 2 * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderForm;