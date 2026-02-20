// src/context/OrderContext.js
import { createContext, useState, useContext, useEffect } from 'react';

// Create the context
const OrderContext = createContext();

// Create a provider component
export function OrderProvider({ children }) {
  // All the shared states that need to persist between navigation
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [displayedOrders, setDisplayedOrders] = useState([]);

  // Load any saved orders from localStorage on initialization
  useEffect(() => {
    const savedActiveOrders = localStorage.getItem('activeOrders');
    if (savedActiveOrders) {
      try {
        const parsedOrders = JSON.parse(savedActiveOrders);
        
        // Process date objects
        const processedOrders = parsedOrders.map(order => ({
          ...order,
          createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
          completedAt: order.completedAt ? new Date(order.completedAt) : null
        }));
        
        setActiveOrders(processedOrders);
        console.log('Loaded active orders from localStorage:', processedOrders);
      } catch (err) {
        console.error('Error loading saved orders:', err);
      }
    }
    
    const savedCompletedOrders = localStorage.getItem('completedOrders');
    if (savedCompletedOrders) {
      try {
        const parsedOrders = JSON.parse(savedCompletedOrders);
        
        // Process date objects
        const processedOrders = parsedOrders.map(order => ({
          ...order,
          createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
          completedAt: order.completedAt ? new Date(order.completedAt) : new Date()
        }));
        
        setCompletedOrders(processedOrders);
      } catch (err) {
        console.error('Error loading saved completed orders:', err);
      }
    }
  }, []);

  // Save active orders to localStorage whenever they change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeOrders.length > 0) {
      localStorage.setItem('activeOrders', JSON.stringify(activeOrders));
      console.log('Saved active orders to localStorage:', activeOrders);
      
      // Update displayed orders
      updateDisplayedOrders();
    }
  }, [activeOrders]);

  // Save completed orders to localStorage
  useEffect(() => {
    if (completedOrders.length > 0) {
      localStorage.setItem('completedOrders', JSON.stringify(completedOrders));
    }
  }, [completedOrders]);

  // Function to update displayed orders
  const updateDisplayedOrders = () => {
    // Filter orders for display - prioritize pending orders
    const pendingOrders = activeOrders.filter(order => 
      order.items && order.items.some(item => item.status === 'pending' || item.status === 'preparing')
    );
    
    // Set displayed orders (limited to show maximum 3 orders at a time)
    setDisplayedOrders(pendingOrders.slice(0, 3));
  };

  // Function to add a new order
  const addOrder = (newOrder) => {
    setActiveOrders(prev => [...prev, newOrder]);
  };

  // Function to update an order
  const updateOrder = (orderId, updatedOrder) => {
    setActiveOrders(prev => 
      prev.map(order => order.id === orderId ? updatedOrder : order)
    );
  };

  // Function to update an item status within an order
  const updateItemStatus = (orderId, itemId, newStatus) => {
    setActiveOrders(prev => 
      prev.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            items: order.items.map(item => {
              if (item.id === itemId) {
                return { ...item, status: newStatus };
              }
              return item;
            })
          };
        }
        return order;
      })
    );
  };

  // Function to mark an order as served/completed
  const completeOrder = (orderId) => {
    // Find the order to be completed
    const orderToComplete = activeOrders.find(order => order.id === orderId);
    
    if (orderToComplete) {
      // Update the order status to completed
      const completedOrder = {
        ...orderToComplete,
        status: 'completed',
        completedAt: new Date()
      };
      
      // Move to completed orders list
      setCompletedOrders(prev => [completedOrder, ...prev].slice(0, 5));
      
      // Remove from active orders
      setActiveOrders(prev => prev.filter(order => order.id !== orderId));
    }
  };

  // Function to update payment method
  const updatePaymentMethod = (orderId, paymentMethod) => {
    setActiveOrders(prev => 
      prev.map(order => {
        if (order.id === orderId) {
          return { ...order, paymentMethod };
        }
        return order;
      })
    );
  };

  // Check if all items in an order are completed
  const areAllItemsCompleted = (orderId) => {
    const order = activeOrders.find(order => order.id === orderId);
    if (!order || !order.items) return false;
    
    return order.items.length > 0 && 
      order.items.every(item => item.status === 'completed');
  };

  // Context value
  const value = {
    activeOrders,
    setActiveOrders,
    completedOrders, 
    setCompletedOrders,
    displayedOrders,
    updateDisplayedOrders,
    addOrder,
    updateOrder,
    updateItemStatus,
    completeOrder,
    updatePaymentMethod,
    areAllItemsCompleted
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

// Custom hook to use the order context
export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}