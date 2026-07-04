# Antan Batura Watersports Booking Management System

A premium, modern web application designed for Tasik Shah Alam Lake Gardens to streamline boat rentals, operations tracking, and administrative reports.

---

## 🚀 One-Click Setup & Launch (For Groupmates)

If you have **no technical skills**, follow these simple steps to download and run the project locally.

### 📋 Prerequisites
Before launching, make sure you have installed:
1. **Laragon** (WAMP Development Environment) - [Download here](https://laragon.org/download/)
2. **Node.js** (LTS version) - [Download here](https://nodejs.org/)

---

### 🛠️ Setup Instructions (Easy Setup)

1. Open **Laragon** and click **Start All** (this starts the Apache and MySQL servers).
2. Double-click the **`setup_and_run.bat`** script at the root directory of this project.
3. The script will automatically:
   * Setup your `.env` configuration keys.
   * Connect to MySQL and create the database (`antan_batura`) automatically.
   * Install all backend PHP packages (`composer install`).
   * Migrate the database tables and populate it with initial mock seeds.
   * Install all frontend React packages (`npm install`).
   * Launch both the PHP backend and React frontend development servers.
   * Open your web browser to the customer landing page at **`http://localhost:5173`**.

*Keep the two command line windows open while using the website.*

---

## 🔑 Default Login Credentials

Use the following accounts to access staff and admin capabilities:

### 👤 Administrator Account
* **Email:** `admin@antanbatura.com`
* **Password:** `password`
* *Provides access to: Front Desk Operations, All Bookings, Fleet Inventory CRUD, and Business Utilization Reports.*

### 👤 Staff / Operator Account
* **Email:** `staff@antanbatura.com`
* **Password:** `password`
* *Provides access to: Front Desk Operations, All Bookings list, and Fleet Inventory status check.*

---

## 🌟 Key Features

* **Landing Page:** Interactive customer showcase featuring watercraft lists, price listings, connection handles, dynamic video players, and a live social feed from Facebook/Instagram.
* **Guest Booking Checkout:** An HCI-optimized 3-step stepper checkout that guides customers to check availability, choose equipment, select timeslots, and secure reference bookings instantly.
* **Front Desk Operations:** Live operation board showing today's bookings, time allocations, active usage counters, safety handovers, return logs, payments entry, and cancellations.
* **Fleet CRUD (Admin only):** Complete administration dashboard to register new watercraft, modify hourly rates, update maintenance notes, and remove old fleet stock.
* **Reports Dashboard (Admin only):** Clean, aggregated utilization bar charts showing bookings by category groups and a detailed list of individual boat usage records.

---

## ⏹️ How to Stop the App
Simply close the terminal windows that were opened by the script. To run it again in the future, you only need to run the regular **`start_project.bat`** file.
