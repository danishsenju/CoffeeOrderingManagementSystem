// src/components/Admin/MenuManager.js
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import './MenuManager.css';

// Detect which temperature mode an existing item uses
function detectServes(item) {
  if (item.hotPrice && item.coldPrice) return 'both';
  if (item.coldPrice) return 'cold';
  if (item.hotPrice) return 'hot';
  return 'both';
}

// Build Firestore payload from form state
function buildItemData(form) {
  const base = {
    name:      form.name.trim(),
    category:  form.category,
    available: form.available,
  };
  if (form.serves === 'both') {
    return { ...base, hotPrice: parseFloat(form.hotPrice), coldPrice: parseFloat(form.coldPrice) };
  }
  if (form.serves === 'cold') {
    const p = parseFloat(form.coldPrice);
    return { ...base, coldPrice: p, price: p };
  }
  // hot only
  const p = parseFloat(form.hotPrice);
  return { ...base, hotPrice: p, price: p };
}

// Validate prices based on serves mode
function validatePrices(form) {
  const needsHot  = form.serves === 'both' || form.serves === 'hot';
  const needsCold = form.serves === 'both' || form.serves === 'cold';
  if (needsHot  && (isNaN(parseFloat(form.hotPrice))  || parseFloat(form.hotPrice)  <= 0)) return false;
  if (needsCold && (isNaN(parseFloat(form.coldPrice)) || parseFloat(form.coldPrice) <= 0)) return false;
  return true;
}

const EMPTY_ITEM = { name: '', category: 'coffee', serves: 'both', coldPrice: '', hotPrice: '', available: true };

function MenuManager() {
  const [menuItems,       setMenuItems]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [newItem,         setNewItem]         = useState(EMPTY_ITEM);
  const [editing,         setEditing]         = useState(null);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [activeCategory,  setActiveCategory]  = useState('all');
  const [priceType,       setPriceType]       = useState('both');
  const [seeding,         setSeeding]         = useState(false);

  // Real-time menu listener — serves from cache instantly, auto-updates on changes
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'menu'), (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      setError('Failed to fetch menu items: ' + err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function handleAddItem(e) {
    e.preventDefault();
    if (!newItem.name.trim() || !validatePrices(newItem)) {
      setError('Please provide a valid name and price(s)');
      setSuccess('');
      return;
    }
    try {
      await addDoc(collection(db, 'menu'), buildItemData(newItem));
      const added = newItem.name;
      setNewItem(EMPTY_ITEM);
      setError('');
      setSuccess(`${added} added successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add item: ' + err.message);
      setSuccess('');
    }
  }

  async function handleUpdateItem(e) {
    e.preventDefault();
    if (!editing.name.trim() || !validatePrices(editing)) {
      setError('Please provide a valid name and price(s)');
      setSuccess('');
      return;
    }
    try {
      await setDoc(doc(db, 'menu', editing.id), buildItemData(editing));
      const updatedName = editing.name;
      setEditing(null);
      setError('');
      setSuccess(`${updatedName} updated successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update item: ' + err.message);
      setSuccess('');
    }
  }

  async function handleDeleteItem(id, name) {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'menu', id));
        setSuccess(`${name} removed from menu.`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to delete item: ' + err.message);
        setSuccess('');
      }
    }
  }

  // One-time seed: adds the new Matcha & Refreshing items with price 0 (unavailable until priced)
  const SEED_ITEMS = [
    { name: 'Iced Taro Matcha',        category: 'non-coffee',  coldPrice: 0, available: false },
    { name: 'Iced Strawberry Matcha',  category: 'non-coffee',  coldPrice: 0, available: false },
    { name: 'Sparkling Strawberry',    category: 'refreshing',  coldPrice: 0, available: false },
    { name: 'Sparkling Lemonade',      category: 'refreshing',  coldPrice: 0, available: false },
    { name: 'Sparkling Green Apple',   category: 'refreshing',  coldPrice: 0, available: false },
    { name: 'Sparkling Ribena',        category: 'refreshing',  coldPrice: 0, available: false },
  ];

  const seedNames = new Set(SEED_ITEMS.map(i => i.name));
  const alreadySeeded = menuItems.some(i => seedNames.has(i.name));

  async function handleSeedItems() {
    setSeeding(true);
    try {
      await Promise.all(
        SEED_ITEMS.map(item => addDoc(collection(db, 'menu'), { ...item, price: 0 }))
      );
      setSuccess('6 items added! Set their prices below then mark them Available.');
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError('Seed failed: ' + err.message);
    }
    setSeeding(false);
  }

  function startEditing(item) {
    setEditing({ ...item, serves: detectServes(item) });
  }

  function cancelEditing() {
    setEditing(null);
  }

  // When serves changes, clear the now-irrelevant price field
  function handleNewServes(serves) {
    setNewItem(prev => ({
      ...prev,
      serves,
      hotPrice:  serves === 'cold' ? '' : prev.hotPrice,
      coldPrice: serves === 'hot'  ? '' : prev.coldPrice,
    }));
  }

  function handleEditServes(serves) {
    setEditing(prev => ({
      ...prev,
      serves,
      hotPrice:  serves === 'cold' ? '' : prev.hotPrice,
      coldPrice: serves === 'hot'  ? '' : prev.coldPrice,
    }));
  }

  // Filter menu items by category
  const filteredItems = activeCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category.toLowerCase() === activeCategory);

  const categories = ['all', ...new Set(menuItems.map(item => item.category.toLowerCase()))];

  // Price display in the list
  const getPriceDisplay = (item) => {
    const hasBoth = item.hotPrice && item.coldPrice;
    if (hasBoth) {
      if (priceType === 'hot')  return `RM${item.hotPrice.toFixed(2)}`;
      if (priceType === 'cold') return `RM${item.coldPrice.toFixed(2)}`;
      return `Hot: RM${item.hotPrice.toFixed(2)} / Cold: RM${item.coldPrice.toFixed(2)}`;
    }
    if (item.coldPrice) return `RM${item.coldPrice.toFixed(2)} (Cold only)`;
    if (item.hotPrice)  return `RM${item.hotPrice.toFixed(2)} (Hot only)`;
    return `RM${(item.price || 0).toFixed(2)}`;
  };

  // Reusable price fields for add / edit forms
  function PriceFields({ form, onChange }) {
    const showHot  = form.serves === 'both' || form.serves === 'hot';
    const showCold = form.serves === 'both' || form.serves === 'cold';
    return (
      <>
        {showHot && (
          <div className="form-group">
            <label>Hot Price (RM)</label>
            <input
              type="number"
              value={form.hotPrice}
              onChange={e => onChange({ hotPrice: e.target.value })}
              step="0.01" min="0"
              placeholder="e.g. 8.00"
              required
            />
          </div>
        )}
        {showCold && (
          <div className="form-group">
            <label>Cold Price (RM)</label>
            <input
              type="number"
              value={form.coldPrice}
              onChange={e => onChange({ coldPrice: e.target.value })}
              step="0.01" min="0"
              placeholder="e.g. 10.00"
              required
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="menu-manager">
      <div className="menu-header">
        <h2>Menu Management</h2>
        <p className="menu-subtitle">Add, update or remove items from your coffee shop menu</p>
      </div>

      {error   && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* One-time seed button — hidden once items are already in menu */}
      {!alreadySeeded && (
        <div className="seed-banner">
          <div className="seed-banner-text">
            <strong>New items available to add:</strong> Iced Taro Matcha, Iced Strawberry Matcha &amp; 4 Sparkling drinks.
            They will be added as <em>unavailable</em> — set their prices then mark them Available.
          </div>
          <button
            className="seed-btn"
            onClick={handleSeedItems}
            disabled={seeding}
          >
            {seeding ? 'Adding…' : '+ Add 6 New Items'}
          </button>
        </div>
      )}

      {/* ── Add new item form ── */}
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
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g. Latte"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="item-category">Category</label>
              <select
                id="item-category"
                value={newItem.category}
                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
              >
                <option value="coffee">Coffee</option>
                <option value="non-coffee">Non-Coffee</option>
                <option value="food">Food</option>
                <option value="dessert">Dessert</option>
                <option value="tea">Tea</option>
                <option value="refreshing">Refreshing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="item-serves">Serves</label>
              <select
                id="item-serves"
                value={newItem.serves}
                onChange={e => handleNewServes(e.target.value)}
              >
                <option value="both">Hot &amp; Cold</option>
                <option value="cold">Cold Only</option>
                <option value="hot">Hot Only</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <PriceFields
              form={newItem}
              onChange={patch => setNewItem(prev => ({ ...prev, ...patch }))}
            />
            <div className="form-group">
              <label htmlFor="item-availability">Available</label>
              <select
                id="item-availability"
                value={newItem.available}
                onChange={e => setNewItem({ ...newItem, available: e.target.value === 'true' })}
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

      {/* ── Current menu list ── */}
      <div className="menu-list-section">
        <div className="section-header">
          <h3>Current Menu Items</h3>
          <div className="underline"></div>
        </div>

        <div className="filters-container">
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-button ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <div className="price-type-filters">
            <label>Price Display:</label>
            <select value={priceType} onChange={e => setPriceType(e.target.value)}>
              <option value="both">Both Hot &amp; Cold</option>
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
                      <>
                        {/* ── Edit row ── */}
                        <td>
                          <input
                            type="text"
                            value={editing.name}
                            onChange={e => setEditing({ ...editing, name: e.target.value })}
                            required
                          />
                        </td>
                        <td>
                          <div className="price-edit-group">
                            <label>Serves</label>
                            <select
                              value={editing.serves}
                              onChange={e => handleEditServes(e.target.value)}
                            >
                              <option value="both">Hot &amp; Cold</option>
                              <option value="cold">Cold Only</option>
                              <option value="hot">Hot Only</option>
                            </select>
                            {(editing.serves === 'both' || editing.serves === 'hot') && (
                              <>
                                <label>Hot Price</label>
                                <input
                                  type="number"
                                  value={editing.hotPrice || ''}
                                  onChange={e => setEditing({ ...editing, hotPrice: e.target.value })}
                                  step="0.01" min="0"
                                  required
                                />
                              </>
                            )}
                            {(editing.serves === 'both' || editing.serves === 'cold') && (
                              <>
                                <label>Cold Price</label>
                                <input
                                  type="number"
                                  value={editing.coldPrice || ''}
                                  onChange={e => setEditing({ ...editing, coldPrice: e.target.value })}
                                  step="0.01" min="0"
                                  required
                                />
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <select
                            value={editing.category}
                            onChange={e => setEditing({ ...editing, category: e.target.value })}
                          >
                            <option value="coffee">Coffee</option>
                            <option value="non-coffee">Non-Coffee</option>
                            <option value="food">Food</option>
                            <option value="dessert">Dessert</option>
                            <option value="tea">Tea</option>
                            <option value="other">Other</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={editing.available}
                            onChange={e => setEditing({ ...editing, available: e.target.value === 'true' })}
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
                      <>
                        {/* ── Display row ── */}
                        <td className="item-name">{item.name}</td>
                        <td className="item-price">{getPriceDisplay(item)}</td>
                        <td className="item-category">
                          {item.category.toLowerCase() === 'coffee' ? (
                            <span className="category-badge coffee">Coffee</span>
                          ) : item.category.toLowerCase() === 'noncoffee' || item.category.toLowerCase() === 'non-coffee' ? (
                            <span className="category-badge noncoffee">Non-coffee</span>
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
