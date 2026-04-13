# Library-membership-and-book-management-system
Library membership and book management system
LibManager is a simple and user-friendly library management system that allows users to manage inventory, issue books, and return items efficiently. The application caters to both administrators and standard users, providing an intuitive interface for keeping track of various items in a library.

## Features
- User Authentication: Admin and user logins to access different functionalities.
- Inventory Management:
    View, add, edit, and delete books and media.
    Search functionality for easy access to items based on title, author, or serial number.
- Issuing and Returning Items:
    Issue available books and media.
    Manage the return process, including fine calculations for overdue items.

## Getting Started

**Installation**
1. Clone the repository.

2. Open the __index.html__ file in your web browser to access the application.

## Usage
1. Login: Use the following credentials to log in:
- Admin
    Username: admin  
    Password: admin123  

- User
    Username: user  
    Password: user123  

2. Dashboard: Once logged in, you can access different features from the dashboard:
- Inventory: View all available items.
- Issue Item: Select an available book or media item to issue.
- Return Item: Select an issued item to return and check for fines.
- Add New Item: Admins can add new books, movies, or journals to the inventory.
- Membership: Admins can add new Membership.

**Features**
- Inventory: Displays a list of items, their status (available/issued), and action buttons for admins to edit or delete.
- Issue Process: Select an item, specify a due date, and confirm the issue.
- Return Process: Select an issued item, check the fine status, and confirm the return.
- Membership Process: Select all member, check the ID, Name, Plan.

## DataBase
- supabase

if want to use your own database:
1. login your supabase account. https://supabase.com/
2. create your table, then insert your data
3. change the SUPABASE_URL and SUPABASE_ANON_KEY on 'scripts.js'.