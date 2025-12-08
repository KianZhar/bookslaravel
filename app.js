// =======================
// Config & Auth Utilities
// =======================
// Use global CONFIG from config.js
const API = window.CONFIG ? window.CONFIG.API_URL : 'http://localhost:8000/api';

function saveToken(token) { if (token) localStorage.setItem('token', token); }
function getToken() { return localStorage.getItem('token'); }
function clearToken() { localStorage.removeItem('token'); }
function isAuthed() { return !!getToken(); }

function setAuthUI(isLoggedIn) {
  document.querySelectorAll('.guest-only').forEach(el => el.style.display = isLoggedIn ? 'none' : '');
  document.querySelectorAll('.auth-only').forEach(el => el.style.display = isLoggedIn ? '' : 'none');
  
  // Update navigation by role if logged in
  if (isLoggedIn) {
    try {
      api('/users/me').then(user => {
        updateNavigationByRole(user.role || 'user');
      }).catch(() => {
        updateNavigationByRole('user');
      });
    } catch (e) {
      updateNavigationByRole('user');
    }
  }
}

// Redirect to login if not authenticated
async function requireAuth(redirectTo = 'login.html') {
  try {
    if (!isAuthed()) throw new Error('no token');
    await api('/users/me'); // verify with server
    setAuthUI(true);
    return true;
  } catch {
    clearToken();
    setAuthUI(false);
    // Don't redirect if on public pages
    const publicPages = ['login.html', 'register.html', 'index.html', 'verify-email.html', 'forgot-password.html', 'reset-password.html'];
    const isPublicPage = publicPages.some(page => location.pathname.endsWith(page)) || location.pathname === '/' || location.pathname.endsWith('/');
    if (!isPublicPage && !location.pathname.endsWith(redirectTo)) {
      location.href = redirectTo;
    }
    return false;
  }
}

// jQuery AJAX wrapper
async function api(path, { method = 'GET', data, multipart } = {}) {
  const token = getToken();
  const url = API + path;
  
  const ajaxConfig = {
    method: method,
    url: url,
    xhrFields: {
      withCredentials: true
    },
    headers: {}
  };

  if (token) {
    ajaxConfig.headers['Authorization'] = 'Bearer ' + token;
  }

  if (multipart) {
    ajaxConfig.data = data;
    ajaxConfig.processData = false;
    ajaxConfig.contentType = false;
  } else if (data) {
    ajaxConfig.data = JSON.stringify(data);
    ajaxConfig.contentType = 'application/json';
    ajaxConfig.dataType = 'json';
  }

  return new Promise((resolve, reject) => {
    $.ajax(ajaxConfig)
      .done(function(response) {
        resolve(response);
      })
      .fail(function(xhr) {
        // If token is invalid (401), automatically logout and clear token
        if (xhr.status === 401) {
          // Try to logout on server to delete token
          const logoutUrl = window.CONFIG ? window.CONFIG.API_URL + '/auth/logout' : API + '/auth/logout';
          $.ajax({
            method: 'POST',
            url: logoutUrl,
            headers: token ? { 'Authorization': 'Bearer ' + token } : {},
            xhrFields: {
              withCredentials: true
            }
          }).fail(function() {
            // Ignore logout errors
          });
          
          // Clear token from localStorage
          clearToken();
          setAuthUI(false);
          // Redirect to login if not already on public pages (login, register, index)
          const publicPages = ['login.html', 'register.html', 'index.html', 'verify-email.html', 'forgot-password.html', 'reset-password.html'];
          const isPublicPage = publicPages.some(page => location.pathname.endsWith(page)) || location.pathname === '/' || location.pathname.endsWith('/');
          if (!isPublicPage) {
            location.href = 'login.html';
          }
        }
        
        // Extract error data
        let errorData;
        try {
          errorData = xhr.responseJSON || JSON.parse(xhr.responseText);
        } catch (e) {
          errorData = { message: xhr.responseText || 'Request failed' };
        }
        reject(errorData);
      });
  });
}

setAuthUI(isAuthed());

// ==================
// Monitor localStorage token changes and auto-logout
// ==================
let lastToken = getToken();
function checkTokenChange() {
  const currentToken = getToken();
  // If token was manually changed in localStorage (and we were previously authenticated)
  if (lastToken && currentToken !== lastToken) {
    console.warn('Token changed in localStorage. Logging out for security.');
    // Clear the new invalid token
    clearToken();
    setAuthUI(false);
    // Try to logout on server to delete old token
    if (lastToken) {
      const logoutUrl = window.CONFIG ? window.CONFIG.API_URL + '/auth/logout' : API + '/auth/logout';
      $.ajax({
        method: 'POST',
        url: logoutUrl,
        headers: { 'Authorization': 'Bearer ' + lastToken },
        xhrFields: {
          withCredentials: true
        }
      }).fail(() => {}); // Ignore errors
    }
    // Redirect to login if not on public pages
    const publicPages = ['login.html', 'register.html', 'index.html', 'verify-email.html', 'forgot-password.html', 'reset-password.html'];
    const isPublicPage = publicPages.some(page => location.pathname.endsWith(page)) || location.pathname === '/' || location.pathname.endsWith('/');
    if (!isPublicPage) {
      location.href = 'login.html';
    }
    lastToken = null;
    return;
  }
  // Update lastToken if it changed to null or new value
  if (currentToken !== lastToken) {
    lastToken = currentToken;
  }
}

// Monitor localStorage changes (storage event fires when localStorage is modified from another tab/window)
window.addEventListener('storage', (e) => {
  if (e.key === 'token') {
    checkTokenChange();
  }
});

// Monitor localStorage changes in the same tab (polling method)
// This catches manual changes in dev tools
setInterval(checkTokenChange, 1000); // Check every second

// ==================
// Global: Logout btn (support multiple IDs used across pages)
// ==================
function attachLogoutHandler(el) {
  if (!el) return;
  el.addEventListener('click', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    clearToken();
    // After logout send the user to the public index/home page
    location.href = 'index.html';
  });
}

// Support several common IDs and data attributes used in templates
['btnLogout', 'logoutBtn', 'mobileLogoutBtn'].forEach(id => attachLogoutHandler(document.getElementById(id)));
document.querySelectorAll('[data-logout]').forEach(el => attachLogoutHandler(el));

// ======================
// Home page (optional UI)
/////////////////////////
const statusDiv = document.getElementById('status');
if (statusDiv) {
  api('/users/me')
    .then(me => { statusDiv.textContent = `Logged in as ${me.name} (@${me.username})`; })
    .catch(() => { statusDiv.textContent = 'Not logged in'; });
}

// ===================
// Register page logic
// ===================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    const data = Object.fromEntries(fd.entries());

    try {
      await api('/auth/register', { method: 'POST', data: fd, multipart: true });
      document.getElementById('registerMsg').textContent = 'Registration successful!\n\nRedirecting to email verification...';
      registerForm.reset();
      // Redirect to verify-email.html with email parameter
      setTimeout(() => {
        window.location.href = `verify-email.html?email=${encodeURIComponent(data.email)}`;
      }, 2000);
    } catch (err) {
      document.getElementById('registerMsg').textContent = JSON.stringify(err, null, 2);
    }
  });
}

// ================
// Login page logic
// ================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    const payload = Object.fromEntries(fd.entries());
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', data: payload });
      saveToken(token);
      document.getElementById('loginMsg').textContent = 'Welcome, ' + user.name + '\n\nRedirecting to books page...';
      // Immediate redirect after successful login
      location.href = 'books.html';
    } catch (err) {
      document.getElementById('loginMsg').textContent = JSON.stringify(err, null, 2);
    }
  });
}

// =================
// Profile page logic
// =================
const infoForm = document.getElementById('infoForm');
const photoForm = document.getElementById('photoForm');

async function loadProfile() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const profileContainer = document.querySelector('.profile-container');
  
  // Show loading indicator BEFORE starting fetch
  if (loadingIndicator) loadingIndicator.style.display = 'flex';
  if (profileContainer) profileContainer.style.opacity = '0.5';
  
  try {
    const me = await api('/users/me');
    document.getElementById('name').value = me.name;
    document.getElementById('username').value = me.username;

  // backend historically returned different keys for the avatar path
  const avatarPath = me.avatar_path || me.profilePic || me.profile_pic || me.avatar || '';
  const uploadsUrl = window.CONFIG ? window.CONFIG.UPLOADS_URL : 'http://localhost:8000/uploads/';
  const baseUrl = window.CONFIG ? window.CONFIG.BASE_URL : 'http://localhost:8000/';
  
  const img = document.getElementById('avatar');
  if (img) {
    if (avatarPath) {
      // Process avatar path similar to book images
      let imagePath = String(avatarPath);
      imagePath = imagePath.replace(/^uploads\//, ''); // Remove uploads/ prefix
      imagePath = imagePath.replace(/^\//, ''); // Remove leading slash
      
      // Build URL using UPLOADS_URL
      const fullUrl = uploadsUrl + imagePath;
      const separator = fullUrl.includes('?') ? '&' : '?';
      img.src = `${fullUrl}${separator}t=${Date.now()}`; // Cache-busting
      console.log('Profile avatar URL:', img.src);
      
      // Set up error handler
      img.onerror = function() {
        console.error('Profile avatar failed to load:', this.src);
        const defaultAvatar = uploadsUrl + 'profile.png';
        if (this.src !== defaultAvatar) {
          this.src = defaultAvatar;
        }
      };
      
      img.onload = function() {
        console.log('Profile avatar loaded successfully');
      };
    } else {
      // No avatar, use default
      img.src = uploadsUrl + 'profile.png';
    }
  }
  } catch {
    const box = document.getElementById('profileMsg');
    if (box) box.textContent = 'Please login first.';
  } finally {
    // Hide loading indicator
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (profileContainer) profileContainer.style.opacity = '1';
  }
}

if (infoForm) {
  loadProfile();
  infoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(infoForm);
    const payload = Object.fromEntries(fd.entries());
    try {
      const me = await api('/users/me', { method: 'PUT', data: payload });
      document.getElementById('username').value = me.username;
      document.getElementById('name').value = me.name;
      // SweetAlert2 success (fallback to inline message if Swal not available)
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile updated successfully', timer: 1500, showConfirmButton: false });
      } else {
        const box = document.getElementById('profileMsg');
        if (box) box.textContent = 'Saved!';
      }
    } catch (err) {
      // Show error via SweetAlert if available
      if (window.Swal && typeof Swal.fire === 'function') {
        const msg = (err && err.message) ? err.message : JSON.stringify(err, null, 2);
        Swal.fire({ icon: 'error', title: 'Failed', text: msg });
      } else {
        document.getElementById('profileMsg').textContent = JSON.stringify(err, null, 2);
      }
    }
  });
}

if (photoForm) {
  photoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(photoForm);
    const fileInput = photoForm.querySelector('input[name="avatar"]');
    
    // Validate file selection
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      const msgBox = document.getElementById('profileMsg');
      if (msgBox) msgBox.textContent = 'Please select an image file.';
      return;
    }
    
    try {
      // Use POST with /update endpoint
      const res = await api('/users/me/photo/update', { method: 'POST', data: fd, multipart: true });
      const avatarPath = res.profilePic || res.avatar_path || res.profile_pic || res.profilepic || res.avatar || '';

      if (avatarPath) {
        const uploadsUrl = window.CONFIG ? window.CONFIG.UPLOADS_URL : 'http://localhost:8000/uploads/';
        
        // Process avatar path
        let imagePath = String(avatarPath);
        imagePath = imagePath.replace(/^uploads\//, ''); // Remove uploads/ prefix
        imagePath = imagePath.replace(/^\//, ''); // Remove leading slash
        
        // Build URL using UPLOADS_URL
        const fullUrl = uploadsUrl + imagePath;
        const img = document.getElementById('avatar');
        if (img) {
          img.src = `${fullUrl}?t=${Date.now()}`; // Cache-busting
          console.log('Updated profile avatar URL:', img.src);
          loadProfile(); // Refresh profile data
        }
        const msgBox = document.getElementById('profileMsg');
        if (msgBox) msgBox.textContent = 'Photo updated successfully!';
      } else {
        // If backend didn't return a path, show raw response for debugging
        document.getElementById('profileMsg').textContent = JSON.stringify(res, null, 2);
      }
      photoForm.reset();
    } catch (err) {
      const msg = (err && err.message) ? err.message : JSON.stringify(err, null, 2);
      const msgBox = document.getElementById('profileMsg');
      if (msgBox) msgBox.textContent = msg;
    }
  });
}

// ===== Change password =====
const passwordForm = document.getElementById('passwordForm');
if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(passwordForm);
    const payload = Object.fromEntries(fd.entries());
    const box = document.getElementById('profileMsg');

    try {
      const res = await api('/users/me/password', { method: 'PUT', data: payload });
      // Use SweetAlert for confirmation when available
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({
          icon: 'success',
          title: 'Password Changed',
          text: res.message || 'Your password was changed. Please log in again.'
        }).then(() => {
          clearToken();
          location.href = 'login.html';
        });
      } else {
        if (box) box.textContent = res.message || 'Password changed. Please log in again.';
        clearToken();
        setTimeout(() => location.href = 'login.html', 800);
      }
    } catch (err) {
      const message = (err && err.message) ? err.message : JSON.stringify(err, null, 2);
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'error', title: 'Error', text: message });
      } else {
        if (box) box.textContent = message;
      }
    }
  });
}

// ===================================
// Books list page (create/list/delete)
// ===================================
const addForm = document.getElementById('addForm');
const booksGrid = document.getElementById('booksGrid');
const booksGridContainer = document.getElementById('booksGridContainer');
const msg = document.getElementById('booksMsg');
const search = document.getElementById('search');
const bookModal = document.getElementById('bookModal');
const bookModalClose = document.getElementById('bookModalClose');
let currentBookData = null; // Store current book data for modal

// Store current user role
let currentUserRole = 'user';

// Update navigation based on user role
function updateNavigationByRole(role) {
  // Hide/show cart for admin and seller
  document.querySelectorAll('.cart-badge, .user-only').forEach(el => {
    if (role === 'admin' || role === 'seller') {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });
  
  // Hide Home link for all users (always hide)
  document.querySelectorAll('a.nav-link').forEach(el => {
    const text = el.textContent.trim().toLowerCase();
    const href = el.href || el.getAttribute('href') || '';
    // Hide if it's a Home link
    if (text === 'home' || (href.includes('index.html') && text === 'home')) {
      el.style.display = 'none';
    }
  });
  
  // On index.html, also hide Books and Orders links
  const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname === '/' || 
                      window.location.pathname.endsWith('/') ||
                      (!window.location.pathname.includes('.html') && window.location.pathname !== '/');
  
  if (isHomePage) {
    // Hide Books and Orders links on home page
    document.querySelectorAll('a.nav-link[href*="books.html"], a.nav-link[href*="orders.html"], .hide-on-home').forEach(el => {
      if (el.classList.contains('nav-link')) {
        const href = el.href || el.getAttribute('href') || '';
        if (href.includes('books.html') || href.includes('orders.html')) {
          el.style.display = 'none';
        }
      }
    });
  } else {
    // Show hide-on-home links when not on home page (but respect role-based visibility)
    document.querySelectorAll('.hide-on-home').forEach(el => {
      if (el.classList.contains('admin-only')) {
        // Admin-only links handled separately
        return;
      }
      // Show if it's not admin-only or if user is admin
      if (!el.classList.contains('admin-only') || role === 'admin') {
        el.style.display = '';
      }
    });
  }
  
  // Show admin-only links
  document.querySelectorAll('.admin-only').forEach(el => {
    if (role === 'admin') {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
  
  // Show/hide seller-only links (like Books management navigation)
  // Note: Books page itself is accessible to all, but management features are role-based
  document.querySelectorAll('.seller-only').forEach(el => {
    // If it's a Books link, show for all (admin, seller, user can browse)
    if (el.href && el.href.includes('books.html')) {
      el.style.display = '';
    } else if (role === 'seller') {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

// Render table row for a book
function renderBookCard(book) {
  const baseUrl = window.CONFIG ? window.CONFIG.BASE_URL : 'http://localhost:8000/';
  const uploadsUrl = window.CONFIG ? window.CONFIG.UPLOADS_URL : 'http://localhost:8000/uploads/';
  
  // Construct image URL properly
  let imagePath = String(book.image_path || 'default.png');
  imagePath = imagePath.replace(/^uploads\//, '');
  imagePath = imagePath.replace(/^\//, '');
  
  const baseImgUrl = uploadsUrl + imagePath;
  const separator = baseImgUrl.includes('?') ? '&' : '?';
  const timestamp = book.updated_at ? new Date(book.updated_at).getTime() : (book.created_at ? new Date(book.created_at).getTime() : Date.now());
  const imgUrl = baseImgUrl + separator + 'id=' + book.id + '&v=' + timestamp;
  const defaultImg = uploadsUrl + 'default.png';
  
  const isInStock = (book.stock_quantity || 0) > 0;
  const price = parseFloat(book.price || 0).toFixed(2);
  
  const card = document.createElement('div');
  card.className = 'book-card';
  card.dataset.bookId = book.id;
  // Store full book data for modal
  card.dataset.bookData = JSON.stringify(book);
  
  card.innerHTML = `
    <img src="${imgUrl}" alt="${book.name || 'Book'}" class="book-card-image"
         onerror="if(!this.dataset.retry) { this.dataset.retry='1'; setTimeout(() => { const baseUrl = this.src.split('?')[0]; this.src = baseUrl + '?retry=' + Date.now(); }, 1000); } else { this.onerror=null; if(this.src !== '${defaultImg}') this.src='${defaultImg}'; }"
         loading="lazy">
    <div class="book-card-price">₱${price}</div>
    <div class="book-card-stock ${isInStock ? 'in-stock' : 'out-of-stock'}">
      ${isInStock ? `${book.stock_quantity || 0} in stock` : 'Out of stock'}
    </div>
  `;
  
  // Make card clickable
  card.addEventListener('click', () => {
    openBookModal(book);
  });
  
  if (booksGrid) {
    booksGrid.appendChild(card);
  }
}

function openBookModal(book) {
  if (!bookModal) return;
  
  currentBookData = book;
  
  const baseUrl = window.CONFIG ? window.CONFIG.BASE_URL : 'http://localhost:8000/';
  const uploadsUrl = window.CONFIG ? window.CONFIG.UPLOADS_URL : 'http://localhost:8000/uploads/';
  
  // Construct image URL
  let imagePath = String(book.image_path || 'default.png');
  imagePath = imagePath.replace(/^uploads\//, '');
  imagePath = imagePath.replace(/^\//, '');
  const baseImgUrl = uploadsUrl + imagePath;
  const separator = baseImgUrl.includes('?') ? '&' : '?';
  const timestamp = book.updated_at ? new Date(book.updated_at).getTime() : (book.created_at ? new Date(book.created_at).getTime() : Date.now());
  const imgUrl = baseImgUrl + separator + 'id=' + book.id + '&v=' + timestamp;
  
  // Update modal content
  document.getElementById('bookModalImage').src = imgUrl;
  document.getElementById('bookModalTitle').textContent = book.name || 'Untitled Book';
  document.getElementById('bookModalISBN').textContent = book.ISBN || 'N/A';
  document.getElementById('bookModalDescription').textContent = book.description || 'No description available';
  document.getElementById('bookModalStock').textContent = `${book.stock_quantity || 0} available`;
  document.getElementById('bookModalPrice').textContent = `₱${parseFloat(book.price || 0).toFixed(2)}`;
  
  // Set up actions based on user role
  const isSeller = currentUserRole === 'seller';
  const isAdmin = currentUserRole === 'admin';
  const isInStock = (book.stock_quantity || 0) > 0;
  const actionsContainer = document.getElementById('bookModalActions');
  
  if (actionsContainer) {
    actionsContainer.innerHTML = '';
    
    if (isSeller) {
      // Seller can edit/delete
      const editBtn = document.createElement('button');
      editBtn.className = 'book-modal-btn book-modal-btn-primary';
      editBtn.textContent = 'Edit Book';
      editBtn.onclick = () => {
        closeBookModal();
        location.href = `edit.html?id=${book.id}`;
      };
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'book-modal-btn book-modal-btn-secondary';
      deleteBtn.textContent = 'Delete Book';
      deleteBtn.onclick = () => {
        closeBookModal();
        deleteBook(book.id);
      };
      
      actionsContainer.appendChild(editBtn);
      actionsContainer.appendChild(deleteBtn);
    } else if (isAdmin) {
      // Admin view only
      const viewOnly = document.createElement('div');
      viewOnly.style.color = 'rgba(255,255,255,0.5)';
      viewOnly.style.textAlign = 'center';
      viewOnly.style.padding = '1rem';
      viewOnly.textContent = 'View Only';
      actionsContainer.appendChild(viewOnly);
    } else {
      // Regular users can add to cart
      const addToCartBtn = document.createElement('button');
      addToCartBtn.className = 'book-modal-btn book-modal-btn-primary';
      addToCartBtn.textContent = isInStock ? 'Add to Cart' : 'Out of Stock';
      addToCartBtn.disabled = !isInStock;
      addToCartBtn.onclick = () => {
        if (isInStock) {
          addToCartFromModal(book);
        }
      };
      actionsContainer.appendChild(addToCartBtn);
    }
  }
  
  bookModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBookModal() {
  if (bookModal) {
    bookModal.classList.remove('active');
    document.body.style.overflow = '';
    currentBookData = null;
  }
}

// Modal close handlers
if (bookModalClose) {
  bookModalClose.addEventListener('click', closeBookModal);
}

if (bookModal) {
  bookModal.addEventListener('click', (e) => {
    if (e.target === bookModal) {
      closeBookModal();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookModal.classList.contains('active')) {
      closeBookModal();
    }
  });
}

async function addToCartFromModal(book) {
  try {
    if (!isAuthed()) {
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'warning', title: 'Login Required', text: 'Please login to add items to cart.' });
      } else {
        alert('Please login to add items to cart.');
      }
      closeBookModal();
      location.href = 'login.html';
      return;
    }
    
    // Check user role
    try {
      const user = await api('/users/me');
      if (user.role === 'admin' || user.role === 'seller') {
        if (window.Swal && typeof Swal.fire === 'function') {
          Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Admin and Seller accounts cannot add items to cart.' });
        } else {
          alert('Admin and Seller accounts cannot add items to cart.');
        }
        return;
      }
    } catch (e) {
      // Continue if we can't get user info
    }
    
    const maxQuantity = parseInt(book.stock_quantity || 0);
    
    if (maxQuantity <= 0) {
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'error', title: 'Out of Stock', text: 'This book is currently out of stock.' });
      } else {
        alert('This book is currently out of stock.');
      }
      return;
    }
    
    let quantity = 1;
    
    if (window.Swal && typeof Swal.fire === 'function') {
      const result = await Swal.fire({
        title: 'Add to Cart',
        html: `
          <p style="margin-bottom: 1rem; color: rgba(255,255,255,0.9); font-size: 1rem; font-weight: 500;">${book.name || 'Book'}</p>
          <p style="margin-bottom: 1.5rem; color: rgba(255,255,255,0.7); font-size: 0.9rem;">Available Stock: <strong style="color: var(--accent-b);">${maxQuantity}</strong></p>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <button type="button" id="decreaseBtn" style="width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: #fff; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">−</button>
            <input type="number" id="quantityInput" class="swal2-input" 
                   value="1" min="1" max="${maxQuantity}" step="1"
                   style="flex: 1; color: #fff !important; background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.2) !important; border-radius: 8px !important; padding: 0.75rem !important; font-size: 1rem !important; text-align: center !important; -moz-appearance: textfield !important;"
                   placeholder="Enter quantity">
            <button type="button" id="increaseBtn" style="width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: #fff; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">+</button>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Add to Cart',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ff6b6b',
        cancelButtonColor: '#6c757d',
        allowOutsideClick: false,
        allowEscapeKey: true,
        customClass: {
          popup: 'swal2-dark-theme',
          title: 'swal2-title-dark',
          htmlContainer: 'swal2-html-dark',
          input: 'swal2-input-dark'
        },
        didOpen: () => {
          const input = document.getElementById('quantityInput');
          const increaseBtn = document.getElementById('increaseBtn');
          const decreaseBtn = document.getElementById('decreaseBtn');
          
          if (input) {
            // Ensure input is visible and functional
            input.style.color = '#ffffff';
            input.style.background = 'rgba(255,255,255,0.1)';
            input.type = 'number';
            input.min = '1';
            input.max = maxQuantity.toString();
            input.step = '1';
            
            // Update quantity function
            const updateQuantity = (delta) => {
              const currentVal = parseInt(input.value) || 1;
              const newVal = currentVal + delta;
              if (newVal >= 1 && newVal <= maxQuantity) {
                input.value = newVal.toString();
                // Update button states
                if (decreaseBtn) {
                  decreaseBtn.style.opacity = newVal <= 1 ? '0.5' : '1';
                  decreaseBtn.style.cursor = newVal <= 1 ? 'not-allowed' : 'pointer';
                }
                if (increaseBtn) {
                  increaseBtn.style.opacity = newVal >= maxQuantity ? '0.5' : '1';
                  increaseBtn.style.cursor = newVal >= maxQuantity ? 'not-allowed' : 'pointer';
                }
              }
            };
            
            // Increase button
            if (increaseBtn) {
              increaseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                updateQuantity(1);
              });
              increaseBtn.addEventListener('mouseenter', () => {
                if (parseInt(input.value || 1) < maxQuantity) {
                  increaseBtn.style.background = 'rgba(78,205,196,0.3)';
                }
              });
              increaseBtn.addEventListener('mouseleave', () => {
                increaseBtn.style.background = 'rgba(255,255,255,0.1)';
              });
            }
            
            // Decrease button
            if (decreaseBtn) {
              decreaseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                updateQuantity(-1);
              });
              decreaseBtn.addEventListener('mouseenter', () => {
                if (parseInt(input.value || 1) > 1) {
                  decreaseBtn.style.background = 'rgba(78,205,196,0.3)';
                }
              });
              decreaseBtn.addEventListener('mouseleave', () => {
                decreaseBtn.style.background = 'rgba(255,255,255,0.1)';
              });
            }
            
            // Input change handler
            input.addEventListener('input', () => {
              const val = parseInt(input.value) || 1;
              if (val < 1) input.value = '1';
              if (val > maxQuantity) input.value = maxQuantity.toString();
              
              // Update button states
              if (decreaseBtn) {
                decreaseBtn.style.opacity = val <= 1 ? '0.5' : '1';
                decreaseBtn.style.cursor = val <= 1 ? 'not-allowed' : 'pointer';
              }
              if (increaseBtn) {
                increaseBtn.style.opacity = val >= maxQuantity ? '0.5' : '1';
                increaseBtn.style.cursor = val >= maxQuantity ? 'not-allowed' : 'pointer';
              }
            });
            
            // Keyboard arrows
            input.addEventListener('keydown', (e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                updateQuantity(1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                updateQuantity(-1);
              }
            });
            
            // Initial button states
            if (decreaseBtn) {
              decreaseBtn.style.opacity = '0.5';
              decreaseBtn.style.cursor = 'not-allowed';
            }
            
            input.focus();
            input.select();
          }
        },
        preConfirm: () => {
          const input = document.getElementById('quantityInput');
          const val = parseInt(input?.value || 1);
          if (!val || isNaN(val) || val < 1) {
            Swal.showValidationMessage('Quantity must be at least 1');
            return false;
          }
          if (val > maxQuantity) {
            Swal.showValidationMessage(`Quantity cannot exceed available stock (${maxQuantity})`);
            return false;
          }
          return val;
        }
      });
      
      if (result.isConfirmed && result.value) {
        quantity = parseInt(result.value);
      } else {
        return;
      }
    } else {
      // Fallback if SweetAlert2 is not available
      const qtyInput = prompt(`Enter quantity for "${book.name || 'Book'}"\nAvailable Stock: ${maxQuantity}`, '1');
      if (!qtyInput) return;
      quantity = parseInt(qtyInput);
      if (!quantity || isNaN(quantity) || quantity < 1 || quantity > maxQuantity) {
        alert(`Please enter a quantity between 1 and ${maxQuantity}`);
        return;
      }
    }
    
    // Ensure book.id exists and is a number
    if (!book.id) {
      console.error('Book ID is missing:', book);
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Book information is incomplete. Please try again.' });
      } else {
        alert('Book information is incomplete. Please try again.');
      }
      return;
    }
    
    // Add to cart
    try {
      const response = await api('/cart', {
        method: 'POST',
        data: {
          book_id: parseInt(book.id),
          quantity: quantity
        }
      });
      
      console.log('Add to cart response:', response);
    
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({
          icon: 'success',
          title: 'Added to Cart',
          text: `${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart successfully!`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        alert(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart successfully!`);
      }
      
      closeBookModal();
      
      // Update cart badge
      if (typeof updateCartBadge === 'function') {
        updateCartBadge();
      }
    } catch (apiError) {
      console.error('Add to cart API error:', apiError);
      throw apiError; // Re-throw to be caught by outer catch
    }
  } catch (err) {
    console.error('Add to cart error:', err);
    let message = 'Failed to add to cart';
    
    if (err && err.message) {
      message = err.message;
    } else if (err && typeof err === 'string') {
      message = err;
    } else if (err && err.errors) {
      // Handle validation errors
      const errorMessages = Object.values(err.errors).flat();
      message = errorMessages.join(', ') || message;
    }
    
    if (window.Swal && typeof Swal.fire === 'function') {
      Swal.fire({ 
        icon: 'error', 
        title: 'Error', 
        text: message 
      });
    } else {
      alert(message);
    }
  }
}

async function deleteBook(bookId) {
  if (!window.Swal || typeof Swal.fire !== 'function') {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        await api(`/books/${bookId}`, { method: 'DELETE' });
        loadBooks(search?.value || '');
      } catch (err) {
        alert(err.message || 'Failed to delete book');
      }
    }
    return;
  }
  
  const result = await Swal.fire({
    title: 'Delete Book?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff6b6b',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete it',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      await api(`/books/${bookId}`, { method: 'DELETE' });
      Swal.fire({ icon: 'success', title: 'Deleted', text: 'Book deleted successfully.', timer: 2000 });
      loadBooks(search?.value || '');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Failed to delete book' });
    }
  }
}

async function loadBooks(q = '') {
  const loadingIndicator = document.getElementById('loadingIndicator');
  
  // Show loading indicator BEFORE starting fetch
  if (loadingIndicator) loadingIndicator.style.display = 'flex';
  if (booksGridContainer) booksGridContainer.style.display = 'none';
  
  try {
    // Get user role to determine UI
    try {
      const user = await api('/users/me');
      currentUserRole = user.role || 'user';
      
      // Show/hide add form based on role (only sellers, not admin)
      if (addForm) {
        if (currentUserRole === 'seller') {
          addForm.style.display = 'flex';
        } else {
          addForm.style.display = 'none';
        }
      }
      
      // Update navigation based on role
      updateNavigationByRole(currentUserRole);
    } catch (e) {
      // User not logged in or error
      if (addForm) addForm.style.display = 'none';
      updateNavigationByRole('user');
    }
    
    const response = await api('/books' + (q ? `?q=${encodeURIComponent(q)}` : ''));
    const rows = response.books || response; // Handle both response formats
    if (booksGrid) {
      booksGrid.innerHTML = '';
      if (Array.isArray(rows) && rows.length > 0) {
        rows.forEach(renderBookCard);
      } else {
        // Show empty state message
        booksGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: rgba(255,255,255,0.6);">
            <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">No books found</p>
            <p style="font-size: 0.9rem;">${q ? 'Try a different search term.' : 'Be the first to add a book!'}</p>
          </div>
        `;
      }
    }
  } catch (e) {
    console.error('Error loading books:', e);
    const errorMessage = e.message || 'Please login first.';
    if (msg) msg.textContent = errorMessage;
    if (booksGrid) {
      booksGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: rgba(255,255,255,0.6);">
          <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Error loading books</p>
          <p style="font-size: 0.9rem;">${errorMessage}</p>
          <p style="font-size: 0.85rem; margin-top: 0.5rem; color: rgba(255,255,255,0.4);">Please check your connection and try again.</p>
        </div>
      `;
    }
  } finally {
    // Always hide loading indicator and show grid container
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (booksGridContainer) {
      booksGridContainer.style.display = 'block';
    }
  }
}

if (addForm && booksGrid) {
  // CREATE with optional image
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(addForm); // includes ISBN, name, description, image?

    try {
      await api('/books', { method: 'POST', data: fd, multipart: true });
      addForm.reset();
      loadBooks(search?.value || '');
      // SweetAlert2 success notification (fallback to inline message)
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'success', title: 'Book Added', text: 'The book was added successfully.' });
      } else if (msg) {
        msg.textContent = 'The book was added successfully.';
      }
    } catch (err) {
      const message = (err && err.message) ? err.message : JSON.stringify(err, null, 2);
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'error', title: 'Failed to add', text: message });
      } else if (msg) {
        msg.textContent = message;
      }
    }
  });

  // Note: Grid card actions are handled in renderBookCard and modal
  // Edit and delete actions are handled in the modal for sellers
}

// Initialize books page
if (search) search.addEventListener('input', () => loadBooks(search.value));
loadBooks();

// =====================
// Edit page (edit.html)
// =====================
async function initEdit() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { location.href = 'books.html'; return; }

  const form = document.getElementById('editForm');
  const msgBox = document.getElementById('editMsg');
  const isbnInput = document.getElementById('ISBN');
  const nameInput = document.getElementById('name');
  const descInput = document.getElementById('description');
  const preview = document.getElementById('preview');

  try {
    const book = await api('/books/' + id);
    console.log('Loaded book data:', book);
    
    isbnInput.value = book.ISBN;
    nameInput.value = book.name;
    descInput.value = book.description;
    const priceInput = document.getElementById('price');
    const stockInput = document.getElementById('stock_quantity');
    if (priceInput) priceInput.value = book.price || 0;
    if (stockInput) stockInput.value = book.stock_quantity || 0;

    // Construct image URL properly
    const baseUrl = window.CONFIG ? window.CONFIG.BASE_URL : 'http://localhost:8000/';
    const uploadsUrl = window.CONFIG ? window.CONFIG.UPLOADS_URL : 'http://localhost:8000/uploads/';
    
    // Get image path from book data
    let imagePath = String(book.image_path || 'default.png');
    // Remove 'uploads/' prefix if present (UPLOADS_URL already includes it)
    imagePath = imagePath.replace(/^uploads\//, '');
    // Remove leading slash if present
    imagePath = imagePath.replace(/^\//, '');
    
    // Build image URL using UPLOADS_URL (which already ends with /uploads/)
    const baseImgUrl = uploadsUrl + imagePath;
    const separator = baseImgUrl.includes('?') ? '&' : '?';
    const timestamp = book.updated_at ? new Date(book.updated_at).getTime() : (book.created_at ? new Date(book.created_at).getTime() : Date.now());
    const imgUrl = baseImgUrl + separator + 'id=' + book.id + '&v=' + timestamp;
    const defaultImg = uploadsUrl + 'default.png';
    
    console.log('Book data:', { id: book.id, image_path: book.image_path, updated_at: book.updated_at });
    console.log('Image path from API:', book.image_path);
    console.log('Processed image filename:', imagePath);
    console.log('Constructed image URL:', imgUrl);
    console.log('UPLOADS_URL:', uploadsUrl);
    
    if (preview) {
      // Set up error handler with retry logic
      preview.onerror = function(e) {
        if (!this.dataset.retry) {
          this.dataset.retry = '1';
          console.warn('Preview image failed to load, retrying:', this.src);
          // Retry with new cache-busting parameter
          setTimeout(() => {
            const baseUrl = this.src.split('?')[0];
            this.src = baseUrl + '?retry=' + Date.now();
          }, 1000);
        } else {
          console.error('Preview image failed after retry:', this.src);
          // Only set to default if it's not already the default
          if (this.src !== defaultImg && !this.src.includes('default.png')) {
            console.log('Falling back to default image');
            this.src = defaultImg;
          }
        }
      };
      
      // Set image source
      preview.src = imgUrl;
      console.log('Set preview src to:', imgUrl);
      
      // Also listen for load success
      preview.onload = function() {
        console.log('Preview image loaded successfully:', this.src);
        this.dataset.loaded = 'true';
      };
    }
  } catch (e) {
    console.error('Failed to load book:', e);
    msgBox.textContent = 'Failed to load book: ' + (e.message || JSON.stringify(e));
    return;
  }

  // Live preview for new image
  const fileInput = form.querySelector('input[name="image"]');
  if (fileInput) {
    fileInput.addEventListener('change', (ev) => {
      const f = ev.target.files?.[0];
      if (f && preview) preview.src = URL.createObjectURL(f);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const imageInput = form.querySelector('input[name="image"]');
    const hasImage = imageInput && imageInput.files && imageInput.files.length > 0;
    
    let endpoint, method, data;
    
    if (hasImage) {
      // If image exists: Use POST to /update endpoint with multipart form data
      data = new FormData(form);
      endpoint = `/books/${id}/update`;
      method = 'POST';
    } else {
      // If no image: Use PUT with JSON data
      data = {
        ISBN: isbnInput.value,
        name: nameInput.value,
        description: descInput.value
      };
      endpoint = `/books/${id}`;
      method = 'PUT';
    }

    try {
      const response = await api(endpoint, { method, data, multipart: hasImage });
      
      // Log response for debugging
      if (response && response.book) {
        console.log('Book updated:', response.book);
        console.log('Image path:', response.book.image_path);
      }
      
      // Show SweetAlert success if available, otherwise fallback to inline message
      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'success', title: 'Saved', text: 'Book updated successfully' }).then(() => { 
          // Clear any cached data and reload
          location.href = 'books.html?' + Date.now(); 
        });
      } else {
        msgBox.textContent = 'Saved!';
        setTimeout(() => { location.href = 'books.html?' + Date.now(); }, 500);
      }
    } catch (err) {
      console.error('Update error:', err);
      if (window.Swal && typeof Swal.fire === 'function') {
        const m = (err && err.message) ? err.message : JSON.stringify(err, null, 2);
        Swal.fire({ icon: 'error', title: 'Save failed', text: m });
      } else {
        msgBox.textContent = JSON.stringify(err, null, 2);
      }
    }
  });
}

// ===================
// Cart Badge Update
// ===================
async function updateCartBadge() {
  try {
    if (!isAuthed()) return;
    const response = await api('/cart');
    const itemCount = (response.items || []).length;
    const badge = document.getElementById('cartBadge');
    if (badge) {
      if (itemCount > 0) {
        badge.textContent = itemCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) {
    // Ignore errors (user might not be logged in)
  }
}

// Update cart badge on page load
// Only call requireAuth if not on public pages (to avoid redirects)
const publicPages = ['login.html', 'register.html', 'index.html', 'verify-email.html', 'forgot-password.html', 'reset-password.html'];
const isPublicPage = publicPages.some(page => location.pathname.endsWith(page)) || location.pathname === '/' || location.pathname.endsWith('/');

if (!isPublicPage && typeof requireAuth === 'function') {
  requireAuth().then(() => updateCartBadge());
} else {
  // On public pages, just update UI without requiring auth
  setAuthUI(isAuthed());
  updateCartBadge();
}

window.requireAuth = requireAuth;
window.loadProfile = loadProfile;
window.initEdit = initEdit;
window.updateCartBadge = updateCartBadge;
