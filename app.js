// =======================
// Config & Auth Utilities
// =======================
// Use global CONFIG from config.js
if (!window.CONFIG || !window.CONFIG.API_URL) {
  console.error('ERROR: config.js not loaded! Make sure config.js is loaded before app.js');
  alert('Configuration Error: config.js not loaded properly. Please refresh the page.');
  throw new Error('window.CONFIG is not defined. config.js must be loaded first.');
}
const API = window.CONFIG.API_URL;

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
  
  // Debug logging
  console.log(`API Request: ${method} ${url}`);
  
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
        // Debug logging for errors
        console.error('API Request Failed:', {
          status: xhr.status,
          statusText: xhr.statusText,
          url: url,
          method: method,
          responseText: xhr.responseText
        });
        
        // If token is invalid (401), automatically logout and clear token
        if (xhr.status === 401) {
          // Try to logout on server to delete token
          const logoutUrl = window.CONFIG.API_URL + '/auth/logout';
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
      const logoutUrl = window.CONFIG.API_URL + '/auth/logout';
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
  const uploadsUrl = window.CONFIG.UPLOADS_URL;
  const baseUrl = window.CONFIG.BASE_URL;
  
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
        const uploadsUrl = window.CONFIG.UPLOADS_URL;
        
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
const tblBody = document.querySelector('#tbl tbody');
const booksGrid = document.getElementById('booksGrid');
const msg = document.getElementById('booksMsg');
const search = document.getElementById('search');

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

// Render book card for grid layout
function renderBookCard(row) {
  const baseUrl = window.CONFIG.BASE_URL;
  const uploadsUrl = window.CONFIG.UPLOADS_URL;
  
  // Construct image URL properly
  let imagePath = String(row.image_path || 'default.png');
  // Remove 'uploads/' prefix if present (UPLOADS_URL already includes it)
  imagePath = imagePath.replace(/^uploads\//, '');
  // Remove leading slash if present
  imagePath = imagePath.replace(/^\//, '');
  
  // Build image URL using UPLOADS_URL (which already ends with /uploads/)
  const baseImgUrl = uploadsUrl + imagePath;
  const separator = baseImgUrl.includes('?') ? '&' : '?';
  const timestamp = row.updated_at ? new Date(row.updated_at).getTime() : (row.created_at ? new Date(row.created_at).getTime() : Date.now());
  const imgUrl = baseImgUrl + separator + 'id=' + row.id + '&v=' + timestamp;
  const defaultImg = uploadsUrl + 'default.png';
  
  const stockQuantity = parseInt(row.stock_quantity || 0);
  const isInStock = stockQuantity > 0;
  const stockClass = isInStock ? 'in-stock' : 'out-of-stock';
  const stockText = isInStock ? `${stockQuantity} in stock` : 'Out of stock';
  
  const card = document.createElement('div');
  card.className = 'book-card';
  card.dataset.bookId = row.id;
  card.dataset.stockQuantity = stockQuantity;
  card.dataset.bookName = row.name || '';
  
  // Make card clickable to navigate to detail page
  card.addEventListener('click', (e) => {
    // Don't navigate if clicking on action buttons (for sellers/admins)
    if (e.target.closest('.action-btn')) return;
    window.location.href = `book-detail.html?id=${row.id}`;
  });
  
  card.innerHTML = `
    <img src="${imgUrl}" alt="${row.name || 'Book'}" class="book-card-image"
         onerror="if(!this.dataset.retry) { this.dataset.retry='1'; setTimeout(() => { const baseUrl = this.src.split('?')[0]; this.src = baseUrl + '?retry=' + Date.now(); }, 1000); } else { this.onerror=null; if(this.src !== '${defaultImg}') this.src='${defaultImg}'; }"
         loading="lazy">
    <h3 class="book-card-title">${row.name || 'Untitled'}</h3>
    <div class="book-card-price">₱${parseFloat(row.price || 0).toFixed(2)}</div>
    <div class="book-card-stock ${stockClass}">${stockText}</div>
  `;
  
  // For sellers/admins, add action buttons (but they won't interfere with card click)
  const isSeller = currentUserRole === 'seller';
  const isAdmin = currentUserRole === 'admin';
  
  if (isSeller || isAdmin) {
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 0.5rem;';
    
    if (isSeller) {
      actionsDiv.innerHTML = `
        <button class="action-btn btn-edit" data-action="edit" data-id="${row.id}" style="flex: 1;">Edit</button>
        <button class="action-btn btn-delete" data-action="delete" data-id="${row.id}" style="flex: 1;">Delete</button>
      `;
    } else if (isAdmin) {
      actionsDiv.innerHTML = `<span style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">View Only</span>`;
    }
    
    card.appendChild(actionsDiv);
  }
  
  if (booksGrid) {
    booksGrid.appendChild(card);
  }
}

// Render table row for a book (kept for backward compatibility if table exists)
function renderRow(row) {
  if (!tblBody) return; // If table doesn't exist, skip
  
  const baseUrl = window.CONFIG.BASE_URL;
  const uploadsUrl = window.CONFIG.UPLOADS_URL;
  
  // Construct image URL properly
  let imagePath = String(row.image_path || 'default.png');
  // Remove 'uploads/' prefix if present (UPLOADS_URL already includes it)
  imagePath = imagePath.replace(/^uploads\//, '');
  // Remove leading slash if present
  imagePath = imagePath.replace(/^\//, '');
  
  // Build image URL using UPLOADS_URL (which already ends with /uploads/)
  const baseImgUrl = uploadsUrl + imagePath;
  const separator = baseImgUrl.includes('?') ? '&' : '?';
  const timestamp = row.updated_at ? new Date(row.updated_at).getTime() : (row.created_at ? new Date(row.created_at).getTime() : Date.now());
  const imgUrl = baseImgUrl + separator + 'id=' + row.id + '&v=' + timestamp;
  const defaultImg = uploadsUrl + 'default.png';
  
  // Determine actions based on user role
  const isSeller = currentUserRole === 'seller';
  const isAdmin = currentUserRole === 'admin';
  const isInStock = (row.stock_quantity || 0) > 0;
  
  let actionsHtml = '';
  if (isSeller) {
    // Seller can edit/delete their own books
    actionsHtml = `
      <button class="action-btn btn-edit" data-action="edit" data-id="${row.id}">Edit</button>
      <button class="action-btn btn-delete" data-action="delete" data-id="${row.id}">Delete</button>
    `;
  } else if (isAdmin) {
    // Admin can only view books (no actions)
    actionsHtml = `<span style="color: rgba(255,255,255,0.5);">View Only</span>`;
  } else {
    // Regular users can add to cart
    actionsHtml = `
      <button class="action-btn btn-add-cart" data-action="add-cart" data-id="${row.id}" ${!isInStock ? 'disabled' : ''}>
        ${isInStock ? 'Add to Cart' : 'Out of Stock'}
      </button>
    `;
  }
  
  const tr = document.createElement('tr');
  // Store book data in the row element for easy access
  tr.dataset.bookId = row.id;
  tr.dataset.stockQuantity = row.stock_quantity || 0;
  tr.dataset.bookName = row.name || '';
  tr.innerHTML = `
    <td data-label="ID"><span class="cell-value">${row.id}</span></td>
    <td data-label="ISBN"><span class="cell-value">${row.ISBN}</span></td>
    <td data-label="Name"><span class="cell-value">${row.name}</span></td>
    <td data-label="Description"><span class="cell-value">${row.description}</span></td>
    <td data-label="Price"><span class="cell-value">₱${parseFloat(row.price || 0).toFixed(2)}</span></td>
    <td data-label="Stock"><span class="cell-value">${row.stock_quantity || 0}</span></td>
    <td data-label="Image">
      <img src="${imgUrl}" alt="book image" width="32" height="32" class="book-image"
           onerror="if(!this.dataset.retry) { this.dataset.retry='1'; console.warn('Image load error for book ${row.id}, retrying:', this.src); setTimeout(() => { const baseUrl = this.src.split('?')[0]; this.src = baseUrl + '?retry=' + Date.now(); }, 1000); } else { console.error('Image failed after retry for book ${row.id}:', this.src); this.onerror=null; if(this.src !== '${defaultImg}') this.src='${defaultImg}'; }"
           loading="lazy"
           onload="this.dataset.loaded='true'; console.log('Book ${row.id} image loaded:', this.src);">
    </td>
    <td data-label="Actions">${actionsHtml}</td>
  `;
  tblBody.appendChild(tr);
}

async function loadBooks(q = '') {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const tableContainer = document.querySelector('.table-container');
  const gridContainer = document.querySelector('.books-grid-container');
  
  // Show loading indicator BEFORE starting fetch
  if (loadingIndicator) loadingIndicator.style.display = 'flex';
  if (tableContainer) tableContainer.style.display = 'none';
  if (gridContainer) gridContainer.style.display = 'none';
  
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
    
    // Clear existing content
    if (booksGrid) {
      booksGrid.innerHTML = '';
    }
    if (tblBody) {
      tblBody.innerHTML = '';
    }
    
    // Render books in grid or table format
    if (Array.isArray(rows)) {
      if (booksGrid) {
        // Use grid layout
        rows.forEach(renderBookCard);
      } else if (tblBody) {
        // Fallback to table layout
        rows.forEach(renderRow);
      }
    }
  } catch (e) {
    if (msg) msg.textContent = 'Please login first.';
  } finally {
    // Hide loading indicator and show grid/table
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
    if (gridContainer) gridContainer.style.display = 'block';
  }
}

if (addForm && (tblBody || booksGrid)) {
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

  // Grid/Table actions - handle clicks on action buttons
  const container = booksGrid || tblBody;
  if (container) {
    container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.action === 'add-cart') {
      try {
        // Check if user is logged in and is a regular user (not admin/seller)
        if (!isAuthed()) {
          if (window.Swal && typeof Swal.fire === 'function') {
            Swal.fire({ icon: 'warning', title: 'Login Required', text: 'Please login to add items to cart.' });
          } else {
            alert('Please login to add items to cart.');
          }
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
          // If we can't get user info, still try to add to cart (backend will handle it)
        }
        
        // Get book data from the row
        const row = btn.closest('tr');
        const stockQuantity = parseInt(row.dataset.stockQuantity || 0);
        const bookName = row.dataset.bookName || 'Book';
        const maxQuantity = stockQuantity;
        
        // Show quantity input dialog
        let quantity = 1;
        if (window.Swal && typeof Swal.fire === 'function') {
          const result = await Swal.fire({
            title: 'Add to Cart',
            html: `
              <p style="margin-bottom: 1rem; color: rgba(255,255,255,0.8);">${bookName}</p>
              <p style="margin-bottom: 1rem; color: rgba(255,255,255,0.7); font-size: 0.9rem;">Available Stock: ${maxQuantity}</p>
              <input type="number" id="quantityInput" class="swal2-input" 
                     value="1" min="1" max="${maxQuantity}" 
                     inputmode="numeric"
                     style="color: #fff; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);"
                     placeholder="Enter quantity">
            `,
            showCancelButton: true,
            confirmButtonText: 'Add to Cart',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ff6b6b',
            cancelButtonColor: '#6c757d',
            didOpen: () => {
              const input = document.getElementById('quantityInput');
              if (input) {
                input.focus();
                input.select();
                // Add numeric-only validation
                input.addEventListener('keypress', function(e) {
                  if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                      (e.keyCode === 65 && e.ctrlKey === true) ||
                      (e.keyCode === 67 && e.ctrlKey === true) ||
                      (e.keyCode === 86 && e.ctrlKey === true) ||
                      (e.keyCode === 88 && e.ctrlKey === true) ||
                      (e.keyCode >= 35 && e.keyCode <= 39)) {
                    return;
                  }
                  if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                    e.preventDefault();
                    Swal.fire({ icon: 'warning', title: 'Numbers Only', text: 'Please enter only numbers for quantity.', timer: 2000, showConfirmButton: false });
                  }
                });
                input.addEventListener('input', function(e) {
                  const value = this.value;
                  const numericValue = value.replace(/[^0-9]/g, '');
                  if (value !== numericValue) {
                    this.value = numericValue;
                    Swal.fire({ icon: 'warning', title: 'Numbers Only', text: 'Only numbers are allowed. Letters have been removed.', timer: 2000, showConfirmButton: false });
                  }
                });
              }
            },
            preConfirm: () => {
              const input = document.getElementById('quantityInput');
              const qty = parseInt(input.value);
              if (!qty || qty < 1) {
                Swal.showValidationMessage('Quantity must be at least 1');
                return false;
              }
              if (qty > maxQuantity) {
                Swal.showValidationMessage(`Quantity cannot exceed available stock (${maxQuantity})`);
                return false;
              }
              return qty;
            }
          });
          
          if (result.isConfirmed && result.value) {
            quantity = result.value;
          } else {
            return; // User cancelled
          }
        } else {
          // Fallback to prompt if SweetAlert2 is not available
          const qtyInput = prompt(`Enter quantity for "${bookName}"\nAvailable Stock: ${maxQuantity}`, '1');
          if (!qtyInput) return; // User cancelled
          quantity = parseInt(qtyInput);
          if (!quantity || quantity < 1) {
            alert('Quantity must be at least 1');
            return;
          }
          if (quantity > maxQuantity) {
            alert(`Quantity cannot exceed available stock (${maxQuantity})`);
            return;
          }
        }
        
        // Add to cart with selected quantity
        const response = await api('/cart', { method: 'POST', data: { book_id: id, quantity: quantity } });
        console.log('Add to cart response:', response);
        
        if (window.Swal && typeof Swal.fire === 'function') {
          Swal.fire({ 
            icon: 'success', 
            title: 'Added to Cart', 
            text: `${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart successfully!` 
          });
        }
        if (typeof updateCartBadge === 'function') {
          await updateCartBadge();
        }
      } catch (err) {
        console.error('Add to cart error:', err);
        const message = (err && err.message) ? err.message : JSON.stringify(err, null, 2);
        if (window.Swal && typeof Swal.fire === 'function') {
          Swal.fire({ icon: 'error', title: 'Add to Cart Failed', text: message });
        } else if (msg) {
          msg.textContent = message;
        } else {
          alert('Failed to add to cart: ' + message);
        }
      }
      return;
    }

    if (btn.dataset.action === 'edit') {
      location.href = `edit.html?id=${encodeURIComponent(id)}`;
      return;
    }

    if (btn.dataset.action === 'delete') {
      // Use SweetAlert2 for confirmation if available, otherwise fallback to confirm()
      const doDelete = async () => {
        try {
          await api('/books/' + id, { method: 'DELETE' });
          loadBooks(search?.value || '');
        } catch (err) {
          if (window.Swal && typeof Swal.fire === 'function') {
            Swal.fire({ icon: 'error', title: 'Delete failed', text: (err && err.message) ? err.message : JSON.stringify(err, null, 2) });
          } else if (msg) {
            msg.textContent = JSON.stringify(err, null, 2);
          }
        }
      };

      if (window.Swal && typeof Swal.fire === 'function') {
        Swal.fire({
          title: `Delete book #${id}?`,
          text: 'This action cannot be undone.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Delete',
          confirmButtonColor: '#e3342f',
          cancelButtonText: 'Cancel'
        }).then(res => { if (res.isConfirmed) doDelete(); });
      } else {
        if (!confirm('Delete book #' + id + '?')) return;
        await doDelete();
      }
      return;
    }
    });
  }

  if (search) search.addEventListener('input', () => loadBooks(search.value));
  loadBooks();
}

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

  // Show loading overlay
  if (typeof showLoading === 'function') {
    showLoading(true);
  }

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
    const baseUrl = window.CONFIG.BASE_URL;
    const uploadsUrl = window.CONFIG.UPLOADS_URL;
    
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
      
      // Hide loading overlay after data is loaded
      if (typeof showLoading === 'function') {
        showLoading(false);
      }
      
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
    // Hide loading overlay on error
    if (typeof showLoading === 'function') {
      showLoading(false);
    }
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
      const priceInput = document.getElementById('price');
      const stockInput = document.getElementById('stock_quantity');
      data = {
        ISBN: isbnInput.value,
        name: nameInput.value,
        description: descInput.value,
        price: priceInput ? parseFloat(priceInput.value) || 0 : 0,
        stock_quantity: stockInput ? parseInt(stockInput.value) || 0 : 0
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
