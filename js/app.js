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
    if (!location.pathname.endsWith(redirectTo)) location.href = redirectTo;
    return false;
  }
}

// Axios wrapper
async function api(path, { method = 'GET', data, multipart } = {}) {
  const config = {
    method,
    url: API + path,
    withCredentials: true,
    headers: {}
  };

  const token = getToken();
  if (token) config.headers['Authorization'] = 'Bearer ' + token;

  if (multipart) {
    config.data = data;
    // Don't set Content-Type for FormData - let browser set it with boundary
    // config.headers['Content-Type'] = 'multipart/form-data';
  } else if (data) {
    config.data = data;
    config.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    // If token is invalid (401), automatically logout and clear token
    if (error.response && error.response.status === 401) {
      // Try to logout on server to delete token
      try {
        const logoutUrl = window.CONFIG ? window.CONFIG.API_URL + '/auth/logout' : API + '/auth/logout';
        await axios({
          method: 'POST',
          url: logoutUrl,
          headers: token ? { 'Authorization': 'Bearer ' + token } : {},
          withCredentials: true
        });
      } catch (e) {
        // Ignore logout errors
      }
      // Clear token from localStorage
      clearToken();
      setAuthUI(false);
      // Redirect to login if not already there
      if (!location.pathname.endsWith('login.html') && !location.pathname.endsWith('index.html')) {
        location.href = 'login.html';
      }
    }
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
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
      axios({
        method: 'POST',
        url: logoutUrl,
        headers: { 'Authorization': 'Bearer ' + lastToken },
        withCredentials: true
      }).catch(() => {}); // Ignore errors
    }
    // Redirect to login
    if (!location.pathname.endsWith('login.html') && !location.pathname.endsWith('index.html')) {
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
const tblBody = document.querySelector('#tbl tbody');
const msg = document.getElementById('booksMsg');
const search = document.getElementById('search');

// Render table row for a book
function renderRow(row) {
  const baseUrl = window.CONFIG ? window.CONFIG.BASE_URL : 'http://localhost:8000/';
  const uploadsUrl = window.CONFIG ? window.CONFIG.UPLOADS_URL : 'http://localhost:8000/uploads/';
  
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
  
  const price = parseFloat(row.price || 0).toFixed(2);
  const stock = row.stock_quantity || 0;
  const isInStock = stock > 0;
  
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td data-label="ID"><span class="cell-value">${row.id}</span></td>
    <td data-label="ISBN"><span class="cell-value">${row.ISBN}</span></td>
    <td data-label="Name"><span class="cell-value">${row.name}</span></td>
    <td data-label="Description"><span class="cell-value">${row.description}</span></td>
    <td data-label="Price"><span class="cell-value">$${price}</span></td>
    <td data-label="Stock"><span class="cell-value" style="color: ${isInStock ? '#4ecdc4' : '#ff6b6b'}">${stock}</span></td>
    <td data-label="Image">
      <img src="${imgUrl}" alt="book image" width="32" height="32" class="book-image"
           onerror="if(!this.dataset.retry) { this.dataset.retry='1'; console.warn('Image load error for book ${row.id}, retrying:', this.src); setTimeout(() => { const baseUrl = this.src.split('?')[0]; this.src = baseUrl + '?retry=' + Date.now(); }, 1000); } else { console.error('Image failed after retry for book ${row.id}:', this.src); this.onerror=null; if(this.src !== '${defaultImg}') this.src='${defaultImg}'; }"
           loading="lazy"
           onload="this.dataset.loaded='true'; console.log('Book ${row.id} image loaded:', this.src);">
    </td>
    <td data-label="Actions">
      ${isInStock ? `<button class="action-btn btn-add-cart" data-action="add-cart" data-id="${row.id}" style="background: linear-gradient(90deg, rgba(78,205,196,0.95), rgba(69,183,209,0.95)); margin-right: 0.35rem;">Add to Cart</button>` : '<span style="color: rgba(255,255,255,0.5);">Out of Stock</span>'}
      <button class="action-btn btn-edit" data-action="edit" data-id="${row.id}">Edit</button>
      <button class="action-btn btn-delete" data-action="delete" data-id="${row.id}">Delete</button>
    </td>
  `;
  tblBody.appendChild(tr);
}

async function loadBooks(q = '') {
  try {
    const response = await api('/books' + (q ? `?q=${encodeURIComponent(q)}` : ''));
    const rows = response.books || response || [];
    if (tblBody) {
      tblBody.innerHTML = '';
      rows.forEach(renderRow);
    }
  } catch (e) {
    if (msg) msg.textContent = 'Please login first.';
  }
}

if (addForm && tblBody) {
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

  // Row actions
  tblBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.action === 'add-cart') {
      try {
        await api('/cart', { method: 'POST', data: { book_id: parseInt(id), quantity: 1 } });
        if (window.Swal && typeof Swal.fire === 'function') {
          Swal.fire({ icon: 'success', title: 'Added to Cart', text: 'Book added to cart successfully!', timer: 1500, showConfirmButton: false });
        } else if (msg) {
          msg.textContent = 'Book added to cart!';
          setTimeout(() => msg.textContent = '', 3000);
        }
        updateCartBadge();
      } catch (err) {
        const message = (err && err.message) ? err.message : JSON.stringify(err, null, 2);
        if (window.Swal && typeof Swal.fire === 'function') {
          Swal.fire({ icon: 'error', title: 'Failed to Add', text: message });
        } else if (msg) {
          msg.textContent = message;
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
  const priceInput = document.getElementById('price');
  const stockInput = document.getElementById('stock_quantity');
  const preview = document.getElementById('preview');

  try {
    const book = await api('/books/' + id);
    console.log('Loaded book data:', book);
    
    isbnInput.value = book.ISBN;
    nameInput.value = book.name;
    descInput.value = book.description;
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
      if (priceInput) data.price = parseFloat(priceInput.value);
      if (stockInput) data.stock_quantity = parseInt(stockInput.value);
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
if (typeof requireAuth === 'function') {
  requireAuth().then(() => updateCartBadge());
} else {
  updateCartBadge();
}

window.requireAuth = requireAuth;
window.loadProfile = loadProfile;
window.initEdit = initEdit;
window.updateCartBadge = updateCartBadge;
