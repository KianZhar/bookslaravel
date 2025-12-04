# E-Commerce Book Store - Frontend

This is the frontend application for the E-Commerce Book Store system. It connects to a Laravel backend API running on localhost.

## Features

- User Authentication (Register, Login, Email Verification)
- Book Browsing and Search
- Shopping Cart Management
- Order Placement (Cash on Delivery)
- User Profile Management
- Role-based Access Control (Admin, Seller, User)

## Project Structure

```
frontend/
├── index.html              # Landing page
├── login.html             # Login page
├── register.html          # Registration page
├── verify-email.html      # Email verification page
├── forgot-password.html   # Password reset request
├── reset-password.html    # Password reset form
├── books.html             # Book listing and management
├── edit.html              # Book editing page
├── profile.html           # User profile management
├── config.js              # API configuration
├── css/                   # Stylesheets
│   ├── style.css
│   ├── index.css
│   └── mobile-responsive.css
├── js/                    # JavaScript files
│   ├── app.js             # Main application logic
│   └── error-handler.js   # Error handling utilities
└── assets/                # Static assets
    └── favicon.ico
```

## Setup Instructions

### 1. Configure Backend URL

Edit `config.js` to point to your backend server:

```javascript
const SERVER_IP = 'localhost';  // Change if backend is on different host
const SERVER_PORT = '8000';      // Change if backend uses different port
```

### 2. Serve the Frontend

You can serve this frontend in several ways:

#### Option A: Using a Simple HTTP Server (Python)

```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

Then open `http://localhost:3000` in your browser.

#### Option B: Using Node.js http-server

```bash
# Install http-server globally
npm install -g http-server

# Run server
http-server -p 3000
```

#### Option C: Using PHP Built-in Server

```bash
php -S localhost:3000
```

#### Option D: Deploy to GitHub Pages

1. Push this folder to a GitHub repository named `bookslaravel`
2. Go to repository Settings > Pages
3. Select source branch and folder
4. Your site will be available at `https://kianzhar.github.io/bookslaravel/`

**Note:** The backend CORS has been configured to allow requests from `https://kianzhar.github.io`

### 3. Update CORS Settings

The backend CORS configuration in `config/cors.php` has been updated to allow requests from:
- `https://kianzhar.github.io` (GitHub Pages)
- All localhost variations for local development

## API Endpoints

The frontend communicates with the following backend endpoints:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Books
- `GET /api/books` - List all books
- `GET /api/books/{id}` - Get book details
- `POST /api/books` - Create book (Seller/Admin only)
- `PUT /api/books/{id}` - Update book (Seller/Admin only)
- `DELETE /api/books/{id}` - Delete book (Seller/Admin only)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/{id}` - Update cart item quantity
- `DELETE /api/cart/{id}` - Remove item from cart
- `DELETE /api/cart` - Clear entire cart

### Orders
- `GET /api/orders` - List orders (filtered by role)
- `POST /api/orders` - Create order from cart
- `GET /api/orders/{id}` - Get order details
- `POST /api/orders/{id}/cancel` - Cancel order
- `PUT /api/orders/{id}/status` - Update order status (Seller/Admin only)

### User Management (Admin only)
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{id}` - Get user details
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user

## User Roles

### Admin
- Full access to all features
- User management
- All book operations
- All order management

### Seller
- Create, edit, and delete their own books
- View their sales/orders
- Update order status for their books
- Cannot manage users

### User
- Browse and search books
- Add books to cart
- Place orders (Cash on Delivery)
- View own orders
- Cancel pending orders
- Manage own profile

## Technologies Used

- **HTML5** - Structure
- **CSS3** - Styling
- **Vanilla JavaScript** - Application logic
- **Axios** - HTTP client for API calls
- **SweetAlert2** - Beautiful alert dialogs

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Notes

- All API calls use Bearer token authentication
- Tokens are stored in localStorage
- Automatic token validation and logout on 401 errors
- Responsive design for mobile and desktop

## License

This project is for educational purposes.



