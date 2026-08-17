import { useEffect, useMemo, useState } from 'react';

const defaultProducts = [
  { id: 'instant-cleanse', name: 'TZ LUXE Instant Cleanse', price: 12000, tag: 'Spray', description: 'Nettoyage rapide sans rinçage', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80' },
  { id: 'beginner-bundle', name: 'Beginner Starter Kit', price: 24000, tag: 'Beginner', description: 'Essential Brush Set + Simple Case + Mini Cleaner', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80' },
  { id: 'pro-bundle', name: 'Pro Artist Starter Kit', price: 49000, tag: 'Pro', description: 'Full Brush Set + Brush Cleaner Machine + Extra Face Brushes', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80' },
  { id: 'travel-kit', name: 'Travel Glam Kit', price: 36000, tag: 'Travel', description: 'Compact Brush Set + LED mirror case', image: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=900&q=80' },
  { id: 'complexion-set', name: 'Complexion Perfection Set', price: 18000, tag: 'Mini Set', description: 'Foundation + Concealer + Powder + Blending Brush', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80' },
  { id: 'eye-set', name: 'Soft Glam Eye Set', price: 16000, tag: 'Mini Set', description: 'À utiliser pour les yeux et les finitions', image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80' },
];

const currency = (value) => `${Number(value).toLocaleString('fr-FR')} FCFA`;

function App() {
  const [products, setProducts] = useState(defaultProducts);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem('tzluxe_token')));
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'TZLUXE2026' });
  const [loginError, setLoginError] = useState('');
  const [checkoutForm, setCheckoutForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    delivery: 'Livraison locale',
  });
  const [orderMessage, setOrderMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.ok ? res.json() : defaultProducts)
      .then((data) => setProducts(data.length ? data : defaultProducts))
      .catch(() => setProducts(defaultProducts));
  }, []);

  useEffect(() => {
    if (loggedIn) {
      const token = localStorage.getItem('tzluxe_token');
      fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setOrders(data))
        .catch(() => setOrders([]));
    }
  }, [loggedIn]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [cart]
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateQty = (productId, delta) => {
    setCart((current) =>
      current
        .map((item) => (item.id === productId ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur');
      localStorage.setItem('tzluxe_token', data.token);
      setLoggedIn(true);
      setLoginError('');
    } catch (error) {
      setLoginError(error.message || 'Connexion impossible');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tzluxe_token');
    setLoggedIn(false);
    setOrders([]);
  };

  const handleOrderSubmit = async (event) => {
    event.preventDefault();
    if (!cart.length) {
      setOrderMessage('Votre panier est vide.');
      return;
    }

    const payload = {
      customer: checkoutForm,
      items: cart.map((item) => ({ id: item.id, name: item.name, qty: item.quantity, price: item.price })),
      total,
    };

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setOrderMessage(data.message || 'Erreur de commande');
      return;
    }

    setOrderMessage(`Commande enregistrée. Référence : ${data.orderId}`);
    setCart([]);
    setCartOpen(false);
    setCheckoutForm({
      fullName: '',
      phone: '',
      email: '',
      city: '',
      address: '',
      delivery: 'Livraison locale',
    });
  };

  const updateOrderStatus = async (orderId, status) => {
    const token = localStorage.getItem('tzluxe_token');
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (response.ok) {
      setStatusMessage('Statut modifié avec succès');
      const refreshed = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      setOrders(await refreshed.json());
    }
  };

  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-box">
          <h1>TZ LUXE</h1>
          <p>Accès réservé au propriétaire</p>
          <form onSubmit={handleLogin} className="login-form">
            <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} placeholder="Nom d’utilisateur" />
            <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Mot de passe" />
            <button type="submit">Connexion</button>
          </form>
          {loginError && <div className="error-box">{loginError}</div>}
          <small>Compte par défaut : admin / TZLUXE2026</small>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">TZ LUXE</div>
          <nav className="nav">
            <a href="#product">Produit</a>
            <a href="#market">Marché</a>
            <a href="#bundles">Bundles</a>
            <a href="#ideas">Idées</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="top-actions">
            <button className="cart-button" onClick={() => setCartOpen((prev) => !prev)} type="button">Panier ({cartCount})</button>
            <button className="logout-button" onClick={handleLogout} type="button">Déconnexion</button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="product">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">Innovation beauté & hygiène</span>
              <h1>Le spray qui nettoie sans effort.</h1>
              <p>TZ LUXE Instant Cleanse répond à une vraie lacune du marché : des pinceaux et outils de beauté nettoyés en quelques secondes, sans rinçage et sans complication.</p>
              <div className="cta-row">
                <a href="#bundles" className="primary-btn">Découvrir les bundles</a>
                <a href="#market" className="secondary-btn">Voir le marché</a>
              </div>
              <div className="meta-row">
                <span>⚡ Nettoyage rapide</span>
                <span>🌿 Sans rinçage</span>
                <span>💼 Usage pro & daily</span>
              </div>
            </div>
            <div className="product-card">
              <div className="product-visual">
                <div className="product-badge">£15 / 12 000 FCFA</div>
                <div className="spray-bottle">
                  <div className="bottle-label">
                    <strong>TZ LUXE</strong>
                    <span>Instant Cleanse</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Pourquoi ce produit marque vraiment le marché</h2>
              <p>Les nettoyants pour pinceaux existants sont souvent salissants, lents, peu pratiques et peu élégants.</p>
            </div>
            <div className="features-grid">
              <article className="info-card">
                <div className="icon">🧴</div>
                <h3>Nettoyage immédiat</h3>
                <p>Les pinceaux sont nettoyés en quelques secondes sans rinçage.</p>
              </article>
              <article className="info-card">
                <div className="icon">✨</div>
                <h3>Design premium</h3>
                <p>Une expérience visuelle premium pensée pour les clients exigeants.</p>
              </article>
              <article className="info-card">
                <div className="icon">🎯</div>
                <h3>Usage facile</h3>
                <p>Parfait entre deux clientes et dans les routines quotidiennes.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="market">
          <div className="container market-box">
            <div className="market-grid">
              <div>
                <span className="eyebrow dark">Analyse du marché</span>
                <h2>Le vrai gap dans le marché beauté</h2>
                <p>La plupart des nettoyants pour pinceaux sont complexes, salissants, peu adaptés au voyage et souvent limités à un usage centralisé.</p>
                <ul>
                  <li>Nettoyage lent et peu pratique.</li>
                  <li>Solutions peu adaptées aux professionnels.</li>
                  <li>Peu de marques intègrent hygiène, luxe et simplicité.</li>
                </ul>
              </div>
              <div className="score-panel">
                <h3>Positionnement</h3>
                <div className="score-row"><span>Urgence d’usage</span><strong>92%</strong></div>
                <div className="bar"><span style={{ width: '92%' }} /></div>
                <div className="score-row"><span>Appel premium</span><strong>88%</strong></div>
                <div className="bar"><span style={{ width: '88%' }} /></div>
                <div className="score-row"><span>Accessibilité</span><strong>81%</strong></div>
                <div className="bar"><span style={{ width: '81%' }} /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="bundles">
          <div className="container">
            <div className="section-head">
              <h2>Stratégie de bundles</h2>
              <p>Les bundles augmentent la valeur moyenne des commandes et renforcent le sentiment de luxe.</p>
            </div>
            <div className="bundle-grid">
              <article className="bundle-card">
                <span className="bundle-tag">Beginner</span>
                <h3>Beginner Starter Kit</h3>
                <div className="bundle-price">{currency(24000)}</div>
                <ul>
                  <li>Essential Brush Set</li>
                  <li>Simple Case</li>
                  <li>Mini Brush Cleaner</li>
                </ul>
                <button className="primary-btn w-full" onClick={() => addToCart(products.find((item) => item.id === 'beginner-bundle'))}>Choisir</button>
              </article>
              <article className="bundle-card highlight">
                <span className="bundle-tag">Most Loved</span>
                <h3>Pro Artist Starter Kit</h3>
                <div className="bundle-price">{currency(49000)}</div>
                <ul>
                  <li>Full Brush Set</li>
                  <li>Brush Cleaner Machine</li>
                  <li>Extra Face Brushes</li>
                </ul>
                <button className="primary-btn w-full" onClick={() => addToCart(products.find((item) => item.id === 'pro-bundle'))}>Choisir</button>
              </article>
              <article className="bundle-card">
                <span className="bundle-tag">Travel</span>
                <h3>Travel Glam Kit</h3>
                <div className="bundle-price">{currency(36000)}</div>
                <ul>
                  <li>Compact Brush Set</li>
                  <li>Built-in Mirror Case with LED Light</li>
                </ul>
                <button className="primary-btn w-full" onClick={() => addToCart(products.find((item) => item.id === 'travel-kit'))}>Choisir</button>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="ideas">
          <div className="container">
            <div className="section-head">
              <h2>Idées produit qui répondent à des vrais gaps</h2>
            </div>
            <div className="idea-grid">
              <article className="idea-card">
                <div className="idea-number">1</div>
                <small>Quick Dry Brush Cleaner Spray</small>
                <h3>TZ LUXE Instant Cleanse</h3>
                <p>Le marché manque de solution rapide, portable et premium pour nettoyer les pinceaux sans rinçage ni saleté.</p>
                <ul>
                  <li>Nettoie en quelques secondes</li>
                  <li>Sans rinçage</li>
                  <li>Parfait pour les MUAs</li>
                </ul>
              </article>
              <article className="idea-card">
                <div className="idea-number">2</div>
                <small>Face-specific sets</small>
                <h3>Mini sets ciblés</h3>
                <p>Des kits de petite taille permettent d’entrer plus facilement dans le marché tout en favorisant l’achat multiple.</p>
                <ul>
                  <li>Complexion Perfection Set</li>
                  <li>Soft Glam Eye Set</li>
                  <li>Contour & Sculpt Set</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="shop">
          <div className="container">
            <div className="section-head">
              <h2>Boutique & commande</h2>
              <p>Ajoutez un produit ou un bundle au panier pour passer votre commande.</p>
            </div>
            <div className="shop-grid">
              {products.map((product) => (
                <article className="shop-card" key={product.id}>
                  <span className="shop-tag">{product.tag}</span>
                  <h3>{product.name}</h3>
                  <img src={product.image} alt={product.name} />
                  <p>{product.description}</p>
                  <div className="shop-price">{currency(product.price)}</div>
                  <button className="primary-btn w-full" onClick={() => addToCart(product)}>Ajouter au panier</button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="container">
            <div className="section-head">
              <h2>Questions fréquentes</h2>
            </div>
            <div className="faq-grid">
              <article className="faq-item">
                <h4>Le spray convient-il à tous les pinceaux ?</h4>
                <p>Oui, il est conçu pour les pinceaux et outils de beauté courants.</p>
              </article>
              <article className="faq-item">
                <h4>Peut-on l’utiliser tous les jours ?</h4>
                <p>Oui, c’est pensé pour un usage quotidien, pro ou personnel.</p>
              </article>
            </div>
          </div>
        </section>

        <aside className={`cart-panel ${cartOpen ? 'open' : ''}`}>
          <div className="cart-header">
            <h3>Panier</h3>
            <button onClick={() => setCartOpen(false)} type="button">×</button>
          </div>
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">Votre panier est vide.</div>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div>
                    <h4>{item.name}</h4>
                    <div className="cart-meta">{currency(item.price)} / unité</div>
                    <div className="qty-row">
                      <button type="button" onClick={() => updateQty(item.id, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                  <div className="cart-total-item">{currency(item.price * item.quantity)}</div>
                </div>
              ))
            )}
          </div>
          <div className="cart-footer">
            <div className="total-row"><span>Total</span><strong>{currency(total)}</strong></div>
            <form onSubmit={handleOrderSubmit} className="checkout-form">
              <input value={checkoutForm.fullName} onChange={(e) => setCheckoutForm({ ...checkoutForm, fullName: e.target.value })} placeholder="Nom complet" required />
              <div className="two-fields">
                <input value={checkoutForm.phone} onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })} placeholder="Téléphone" required />
                <input value={checkoutForm.email} onChange={(e) => setCheckoutForm({ ...checkoutForm, email: e.target.value })} placeholder="Email" required />
              </div>
              <input value={checkoutForm.city} onChange={(e) => setCheckoutForm({ ...checkoutForm, city: e.target.value })} placeholder="Ville" required />
              <textarea value={checkoutForm.address} onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })} placeholder="Adresse complète" required />
              <select value={checkoutForm.delivery} onChange={(e) => setCheckoutForm({ ...checkoutForm, delivery: e.target.value })}>
                <option value="Livraison locale">Livraison locale</option>
                <option value="Livraison express">Livraison express</option>
                <option value="Retrait">Retrait</option>
              </select>
              <button type="submit" className="primary-btn w-full">Valider la commande</button>
              {orderMessage && <div className="success-box">{orderMessage}</div>}
            </form>
          </div>
        </aside>

        <section className="section admin-section">
          <div className="container admin-box">
            <div className="section-head">
              <h2>Commandes reçues</h2>
            </div>
            {statusMessage && <div className="success-box">{statusMessage}</div>}
            <div className="orders-list">
              {orders.length === 0 ? (
                <p>Aucune commande pour le moment.</p>
              ) : (
                orders.map((order) => (
                  <div className="order-item" key={order.id}>
                    <div>
                      <h4>{order.customer_name || 'Client'}</h4>
                      <p>{order.customer_phone} · {order.customer_email}</p>
                      <small>{order.city} — {order.address}</small>
                    </div>
                    <div>
                      <p>{order.items.map((item) => `${item.name} x${item.qty}`).join(', ')}</p>
                      <strong>{currency(order.total)}</strong>
                    </div>
                    <div className="order-actions">
                      <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                        <option value="Nouveau">Nouveau</option>
                        <option value="Confirmée">Confirmée</option>
                        <option value="Expédiée">Expédiée</option>
                        <option value="Livrée">Livrée</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="brand">TZ LUXE</div>
          <div>Designed in London — Beauty tools made simple.</div>
          <div>© {new Date().getFullYear()} TZ LUXE</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
