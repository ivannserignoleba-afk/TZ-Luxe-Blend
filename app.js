const WHATSAPP_NUMBER = "2250757432898";

const products = [
  {id:1,name:"TZ Luxe Instant Cleanse",desc:"Brush Cleaner Spray",price:24,category:"nettoyage",image:"assets/products/tz-luxe-instant-cleanse.jpg"},
  {id:2,name:"Complexion Perfection Set",desc:"Foundation · Concealer · Powder",price:49,category:"pinceaux",image:"assets/products/complexion-perfection-set.jpg"},
  {id:3,name:"Soft Glam Eye Set",desc:"Set de pinceaux yeux",price:45,category:"pinceaux",image:"assets/products/soft-glam-eye-set.jpg"},
  {id:4,name:"Contour & Sculpt Set",desc:"Pinceaux contouring",price:49,category:"pinceaux",image:"assets/products/contour-sculpt-set.jpg"},
  {id:5,name:"Silicone Brush Drying Mat",desc:"Tapis de séchage",price:18,category:"nettoyage",image:"assets/products/silicone-brush-drying-mat.jpg"},
  {id:6,name:"Brush Protector Sleeves",desc:"Protection des pinceaux",price:12,category:"accessoires",image:"assets/products/brush-protector-sleeves.jpg"},
  {id:7,name:"Antibacterial Brush Storage Pouch",desc:"Pochette de rangement",price:22,category:"rangement",image:"assets/products/antibacterial-brush-storage-pouch.jpg"},
  {id:8,name:"Replaceable Brush Head",desc:"Tête remplaçable",price:15,category:"accessoires",image:"assets/products/replaceable-brush-head.jpg"},
  {id:9,name:"Luxury Makeup Sponge & Case",desc:"Éponge + étui",price:16,category:"accessoires",image:"assets/products/luxury-makeup-sponge-case.jpg"},
  {id:10,name:"Sponge & Mini Cleanser Bundle",desc:"Éponge + mini nettoyant",price:22,category:"nettoyage",image:"assets/products/sponge-mini-cleanser-bundle.jpg"}
];

let cart = JSON.parse(localStorage.getItem("tz_cart") || "[]");

const money = value => `${new Intl.NumberFormat("fr-FR").format(value)} €`;

function saveCart(){
  localStorage.setItem("tz_cart", JSON.stringify(cart));
}

function toast(message){
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.classList.remove("show"), 1800);
}

function renderProducts(filter="all"){
  const list = filter === "all" ? products : products.filter(p => p.category === filter);
  document.getElementById("products").innerHTML = list.map(p => `
    <article class="product">
      <div class="product-image">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <div class="product-desc">${p.desc}</div>
        <div class="product-bottom">
          <span class="product-price">${money(p.price)}</span>
          <button class="add-btn" data-add="${p.id}" aria-label="Ajouter ${p.name}">+</button>
        </div>
      </div>
    </article>
  `).join("");
}

function addToCart(id){
  const product = products.find(p => p.id === id);
  const existing = cart.find(item => item.id === id);
  if(existing) existing.qty += 1;
  else cart.push({...product, qty:1});
  saveCart();
  renderCart();
  toast(`${product.name} ajouté au panier`);
}

function removeFromCart(id){
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
}

function changeQty(id, delta){
  const item = cart.find(p => p.id === id);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0) removeFromCart(id);
  else {
    saveCart();
    renderCart();
  }
}

function renderCart(){
  const count = cart.reduce((sum,p) => sum + p.qty, 0);
  document.getElementById("cartCount").textContent = count;

  const items = document.getElementById("cartItems");
  if(!cart.length){
    items.innerHTML = `<p class="empty">Votre panier est vide.</p>`;
  }else{
    items.innerHTML = cart.map(item => `
      <div class="cart-row">
        <img src="${item.image}" alt="${item.name}">
        <div>
          <div class="cart-row-name">${item.name}</div>
          <div class="cart-row-meta">${money(item.price)} · quantité ${item.qty}</div>
          <div style="display:flex;gap:6px;margin-top:7px">
            <button class="remove" data-minus="${item.id}" aria-label="Retirer une unité">−</button>
            <button class="remove" data-plus="${item.id}" aria-label="Ajouter une unité">+</button>
          </div>
        </div>
        <button class="remove" data-remove="${item.id}" aria-label="Supprimer">×</button>
      </div>
    `).join("");
  }

  const total = cart.reduce((sum,p) => sum + p.price * p.qty, 0);
  document.getElementById("cartTotal").textContent = money(total);
}

function openCart(){
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden","false");
}
function closeCart(){
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden","true");
}

function checkoutWhatsApp(){
  if(!cart.length){
    toast("Votre panier est vide.");
    return;
  }

  const lines = cart.map(item =>
    `• ${item.name} × ${item.qty} — ${money(item.price * item.qty)}`
  ).join("\n");

  const total = cart.reduce((sum,p) => sum + p.price * p.qty, 0);

  const message =
`Bonjour TZ Luxe Blend 👋

Je souhaite passer une commande :

${lines}

💰 Total : ${money(total)}

Merci de me confirmer la disponibilité et les modalités de livraison.

Commande envoyée depuis la boutique TZ Luxe Blend.`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.location.href = url;
}

document.addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  if(add) addToCart(Number(add.dataset.add));

  const remove = event.target.closest("[data-remove]");
  if(remove) removeFromCart(Number(remove.dataset.remove));

  const plus = event.target.closest("[data-plus]");
  if(plus) changeQty(Number(plus.dataset.plus), 1);

  const minus = event.target.closest("[data-minus]");
  if(minus) changeQty(Number(minus.dataset.minus), -1);
});

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    renderProducts(button.dataset.filter);
  });
});

document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
document.getElementById("cartDrawer").addEventListener("click", event => {
  if(event.target.id === "cartDrawer") closeCart();
});
document.getElementById("checkout").addEventListener("click", checkoutWhatsApp);

document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("mobileNav").classList.toggle("open");
});
document.querySelectorAll(".mobile-nav a").forEach(a => {
  a.addEventListener("click", () => document.getElementById("mobileNav").classList.remove("open"));
});

document.getElementById("searchBtn").addEventListener("click", () => {
  const query = prompt("Quel produit recherchez-vous ?");
  if(!query) return;
  const match = products.find(p => p.name.toLowerCase().includes(query.toLowerCase()));
  if(match) toast(`${match.name} est disponible dans la boutique.`);
  else toast("Produit non trouvé.");
});

renderProducts();
renderCart();
