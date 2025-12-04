# Cart and Orders Frontend Implementation

## New Pages Created

### 1. cart.html
- View all items in shopping cart
- Update item quantities (+/- buttons)
- Remove items from cart
- View cart total
- Proceed to checkout button
- Empty cart message with link to browse books

### 2. orders.html
- View order history (filtered by user role)
- Display order details:
  - Order number
  - Order date
  - Order status (pending, confirmed, shipped, delivered, cancelled)
  - Order items with images
  - Total amount
  - Shipping address
  - Payment method (Cash on Delivery)
- Cancel pending orders
- Empty orders message

### 3. checkout.html
- Shipping address form
- Contact number input
- Order summary with items
- Total amount display
- Payment method info (Cash on Delivery only)
- Place order button
- Redirects to orders page after successful order

## Updated Pages

### books.html
- Added Price and Stock columns to table
- Added "Add to Cart" button for each book (when in stock)
- Shows "Out of Stock" when stock is 0
- Added price and stock fields to add book form
- Updated navigation to include Cart and Orders links
- Cart badge in navbar

### edit.html
- Added price and stock fields to edit form
- Updated JavaScript to handle price and stock updates

### index.html
- Updated navigation to include Cart and Orders links
- Cart badge in navbar

### profile.html
- Updated navigation to include Cart and Orders links
- Cart badge in navbar

## JavaScript Functions Added (app.js)

### Cart Functions
- `updateCartBadge()` - Updates cart item count badge in navbar
- Add to cart functionality in books page
- Cart management (update quantity, remove items)

### Order Functions
- Load and display orders
- Cancel order functionality
- Order status display with color coding

## Features

### Cart Features
- Real-time cart updates
- Quantity management
- Stock validation before adding to cart
- Cart total calculation
- Empty cart handling

### Order Features
- Order history display
- Order status tracking
- Order cancellation (pending orders only)
- Order details view
- Payment method display (Cash on Delivery)

### Navigation
- Cart badge shows item count
- Consistent navigation across all pages
- Mobile-responsive navigation

## API Integration

All pages are fully integrated with backend APIs:
- `/api/cart` - Cart operations
- `/api/orders` - Order operations
- `/api/books` - Book listing with price and stock

## User Experience

- Smooth animations and transitions
- Responsive design for mobile and desktop
- Error handling with user-friendly messages
- Loading states
- Success notifications
- Empty state messages

## Payment Method

All orders use **Cash on Delivery** only:
- Displayed in checkout page
- Shown in order details
- Enforced at backend level

