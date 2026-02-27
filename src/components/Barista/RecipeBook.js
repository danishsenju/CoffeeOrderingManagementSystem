// src/components/Barista/RecipeBook.js
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Search, BookOpen } from 'lucide-react';
import './RecipeBook.css';

function RecipeBook() {
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch]       = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Served from Firestore offline cache — instant on repeat visits
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'menu'), (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const categories = ['all', ...new Set(menuItems.map(i => i.category).filter(Boolean))];

  const filtered = menuItems.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = activeCategory === 'all' || item.category === activeCategory;
    return matchSearch && matchCat;
  });

  // Group by category for display
  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="recipe-book">

      {/* Search bar */}
      <div className="rb-search-wrap">
        <Search size={16} className="rb-search-icon" />
        <input
          className="rb-search"
          type="text"
          placeholder="Search drink name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="rb-search-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {/* Category pills */}
      <div className="rb-cats">
        {categories.map(cat => (
          <button
            key={cat}
            className={`rb-cat-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Recipe cards */}
      {Object.keys(grouped).length === 0 ? (
        <div className="rb-empty">
          <BookOpen size={36} />
          <p>{search ? `No drinks matching "${search}"` : 'No items in menu yet'}</p>
        </div>
      ) : (
        Object.keys(grouped).map(category => (
          <div key={category} className="rb-category-section">
            <h3 className="rb-category-title">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>
            <div className="rb-cards">
              {grouped[category].map(item => (
                <div key={item.id} className={`rb-card ${!item.available ? 'rb-card-unavailable' : ''}`}>
                  <div className="rb-card-header">
                    <span className="rb-item-name">{item.name}</span>
                    {!item.available && (
                      <span className="rb-tag-unavailable">Unavailable</span>
                    )}
                  </div>
                  {item.recipe ? (
                    <ul className="rb-ingredients">
                      {item.recipe.split('\n').filter(Boolean).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rb-no-recipe">No recipe added yet</p>
                  )}
                  {(item.hotPrice || item.coldPrice || item.price) && (
                    <div className="rb-price-row">
                      {item.hotPrice > 0  && <span className="rb-price hot">🔥 RM{item.hotPrice.toFixed(2)}</span>}
                      {item.coldPrice > 0 && <span className="rb-price cold">🧊 RM{item.coldPrice.toFixed(2)}</span>}
                      {item.price > 0 && !item.hotPrice && !item.coldPrice && (
                        <span className="rb-price">RM{item.price.toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default RecipeBook;
