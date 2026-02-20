// src/components/Admin/MenuManager.js
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import './MenuManager.css';

function MenuManager() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    name: '', 
    category: 'coffee', 
    coldPrice: '', 
    hotPrice: '', 
    available: true
  });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [priceType, setPriceType] = useState('both');

  useEffect(() => {
    fetchMenuItems();
  }, []);

  async function fetchMenuItems() {
    setLoading(true);
    try {
      const menuCollection = collection(db, 'menu');
      const menuSnapshot = await getDocs(menuCollection);
      const items = menuSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenuItems(items);
    } catch (err) {
      setError('Failed to fetch menu items: ' + err.message);
    }
    setLoading(false);
  }

  async function handleAddItem(e) {
    e.preventDefault();
    
    // Validate input
    if (!newItem.name.trim() || 
        isNaN(parseFloat(newItem.coldPrice)) || 
        parseFloat(newItem.coldPrice) <= 0 ||
        isNaN(parseFloat(newItem.hotPrice)) || 
        parseFloat(newItem.hotPrice) <= 0) {
      setError('Please provide a valid name and prices');
      setSuccess('');
      return;
    }

    try {
      // Add new menu item to Firestore
      await addDoc(collection(db, 'menu'), {
        name: newItem.name.trim(),
        category: newItem.category,
        coldPrice: parseFloat(newItem.coldPrice),
        hotPrice: parseFloat(newItem.hotPrice),
        available: newItem.available
      });
      
      // Reset form and fetch updated menu
      setNewItem({
        name: '', 
        category: 'coffee', 
        coldPrice: '', 
        hotPrice: '', 
        available: true
      });
      fetchMenuItems();
      setError('');
      setSuccess(`${newItem.name} added successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add item: ' + err.message);
      setSuccess('');
    }
  }

  async function handleUpdateItem(e) {
    e.preventDefault();
    
    // Validate input
    if (!editing.name.trim() || 
        isNaN(parseFloat(editing.coldPrice)) || 
        parseFloat(editing.coldPrice) <= 0 ||
        isNaN(parseFloat(editing.hotPrice)) || 
        parseFloat(editing.hotPrice) <= 0) {
      setError('Please provide a valid name and prices');
      setSuccess('');
      return;
    }

    try {
      // Update menu item in Firestore
      await setDoc(doc(db, 'menu', editing.id), {
        name: editing.name.trim(),
        category: editing.category,
        coldPrice: parseFloat(editing.coldPrice),
        hotPrice: parseFloat(editing.hotPrice),
        available: editing.available
      });
      
      // Reset editing state and fetch updated menu
      const updatedName = editing.name;
      setEditing(null);
      fetchMenuItems();
      setError('');
      setSuccess(`${updatedName} updated successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update item: ' + err.message);
      setSuccess('');
    }
  }

  async function handleDeleteItem(id, name) {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        // Delete menu item from Firestore
        await deleteDoc(doc(db, 'menu', id));
        fetchMenuItems();
        setSuccess(`${name} removed from menu.`);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to delete item: ' + err.message);
        setSuccess('');
      }
    }
  }

  function startEditing(item) {
    setEditing({ ...item });
  }

  function cancelEditing() {
    setEditing(null);
  }
  
  // Filter menu items by category
  const filteredItems = activeCategory === 'all' 
  ? menuItems 
  : menuItems.filter(item => item.category.toLowerCase() === activeCategory);

  // Get unique categories
  const categories = ['all', ...new Set(menuItems.map(item => item.category.toLowerCase()))];

  // Determine price display based on price type
  const getPriceDisplay = (item) => {
    switch(priceType) {
      case 'hot':
        return item.hotPrice;
      case 'cold':
        return item.coldPrice;
      default:
        return `Hot: RM${item.hotPrice.toFixed(2)} / Cold: RM${item.coldPrice.toFixed(2)}`;
    }
  };

  return (
    <div className="menu-manager">
      <div className="menu-header">
        <h2>Menu Management</h2>
        <p className="menu-subtitle">Add, update or remove items from your coffee shop menu</p>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {/* Add new menu item form */}
      <div className="add-item-section">
        <div className="section-header">
          <h3>Add New Menu Item</h3>
          <div className="underline"></div>
        </div>
        <form onSubmit={handleAddItem} className="add-item-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="item-name">Item Name</label>
              <input
                type="text"
                id="item-name"
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                placeholder="e.g. Latte"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="item-category">Category</label>
              <select
  id="item-category"
  value={newItem.category}
  onChange={e => setNewItem({...newItem, category: e.target.value})}
>
  <option value="coffee">Coffee</option>
  <option value="non-coffee">Non-Coffee</option>
</select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="item-hot-price">Hot Price (RM)</label>
              <input
                type="number"
                id="item-hot-price"
                value={newItem.hotPrice}
                onChange={e => setNewItem({...newItem, hotPrice: e.target.value})}
                step="0.01"
                min="0"
                placeholder="e.g. 8.00"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="item-cold-price">Cold Price (RM)</label>
              <input
                type="number"
                id="item-cold-price"
                value={newItem.coldPrice}
                onChange={e => setNewItem({...newItem, coldPrice: e.target.value})}
                step="0.01"
                min="0"
                placeholder="e.g. 10.00"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="item-availability">Available</label>
              <select
                id="item-availability"
                value={newItem.available}
                onChange={e => setNewItem({...newItem, available: e.target.value === 'true'})}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <button type="submit" className="add-button">
            <Plus size={16} /> Add to Menu
          </button>
        </form>
      </div>
      
      {/* Menu items list */}
      <div className="menu-list-section">
        <div className="section-header">
          <h3>Current Menu Items</h3>
          <div className="underline"></div>
        </div>
        
        {/* Category and Price Type filters */}
        <div className="filters-container">
          <div className="category-filters">
            {categories.map(category => (
              <button 
                key={category}
                className={`category-button ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
          <div className="price-type-filters">
            <label>Price Display:</label>
            <select 
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
            >
              <option value="both">Both Hot & Cold</option>
              <option value="hot">Hot Only</option>
              <option value="cold">Cold Only</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading menu items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><UtensilsCrossed size={32} /></div>
            <p>No menu items{activeCategory !== 'all' ? ` in ${activeCategory} category` : ''}. Add some above!</p>
          </div>
        ) : (
          <div className="menu-table-container">
            <table className="menu-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id} className={editing && editing.id === item.id ? 'editing-row' : ''}>
                    {editing && editing.id === item.id ? (
                      // Edit form
                      <>
                        <td>
                          <input
                            type="text"
                            value={editing.name}
                            onChange={e => setEditing({...editing, name: e.target.value})}
                            required
                          />
                        </td>
                        <td>
                          <div className="price-edit-group">
                            <label>Hot Price</label>
                            <input
                              type="number"
                              value={editing.hotPrice}
                              onChange={e => setEditing({...editing, hotPrice: e.target.value})}
                              step="0.01"
                              min="0"
                              required
                            />
                            <label>Cold Price</label>
                            <input
                              type="number"
                              value={editing.coldPrice}
                              onChange={e => setEditing({...editing, coldPrice: e.target.value})}
                              step="0.01"
                              min="0"
                              required
                            />
                          </div>
                        </td>
                        <td>
                        <select
  value={editing.category}
  onChange={e => setEditing({...editing, category: e.target.value})}
>
  <option value="coffee">Coffee</option>
  <option value="non-coffee">Non-Coffee</option>
</select>
                        </td>
                        <td>
                          <select
                            value={editing.available}
                            onChange={e => setEditing({...editing, available: e.target.value === 'true'})}
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </td>
                        <td className="action-buttons">
                          <button onClick={handleUpdateItem} className="save-button">
                            <span className="button-text">Save</span>
                          </button>
                          <button onClick={cancelEditing} className="cancel-button">
                            <span className="button-text">Cancel</span>
                          </button>
                        </td>
                      </>
                    ) : (
                      // Display mode
                      <>
                        <td className="item-name">{item.name}</td>
                        <td className="item-price">
                          {getPriceDisplay(item)}
                        </td>
                        <td className="item-category">
  {item.category.toLowerCase() === 'coffee' ? (
    <span className="category-badge coffee">
      Coffee
    </span>
  ) : item.category.toLowerCase() === 'noncoffee' || item.category.toLowerCase() === 'non-coffee' ? (
    <span className="category-badge noncoffee">
      Non-coffee
    </span>
  ) : (
    <span className={`category-badge ${item.category.toLowerCase()}`}>
      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
    </span>
  )}
</td>
                        <td className="item-availability">
                          <span className={`availability-badge ${item.available ? 'available' : 'unavailable'}`}>
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="action-buttons">
                          <button onClick={() => startEditing(item)} className="edit-button">
                            <Pencil size={14} />
                            <span className="button-text">Edit</span>
                          </button>
                          <button onClick={() => handleDeleteItem(item.id, item.name)} className="delete-button">
                            <Trash2 size={14} />
                            <span className="button-text">Delete</span>
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MenuManager;