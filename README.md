# Antan Batura Watersports Booking Management System

A premium, modern web application designed for Tasik Shah Alam Lake Gardens to streamline boat rentals, operations tracking, and administrative reports.

---

## 🚀 One-Click Setup & Launch (For Groupmates)

Even with **no technical skills**, you can follow these simple steps to download and run the project locally.

### 📋 Prerequisites
Before launching, make sure you have installed:
1. **Laragon** (WAMP Development Environment) - [Download here](https://laragon.org/download/)
2. **Node.js** (LTS version) - [Download here](https://nodejs.org/)

---

### 🛠️ Setup Instructions (Easy Setup)

1. Open **Laragon** and click **Start All** (this starts the Apache and MySQL servers).
2. Double-click the **`setup_and_run.bat`** script at the root directory of this project.
3. The script will automatically configure your database, install dependencies, and launch:
   * **Customer Landing Page:** Opens automatically at **`http://localhost:5173`**.
   * **Staff/Admin Login Page:** Manually navigate to **`http://localhost:5173/login`** in your browser.

*Keep the two terminal windows open while using the website.*

---

## 🔑 Default Login Credentials

Access the Login Page at **`http://localhost:5173/login`** and use the following:

### 👤 Administrator Account
* **Email:** `admin@antanbatura.com`
* **Password:** `password`
* *Provides access to: Front Desk Operations, All Bookings, Fleet Inventory CRUD, and Business Utilization Reports.*

### 👤 Staff / Operator Account
* **Email:** `staff@antanbatura.com`
* **Password:** `password`
* *Provides access to: Front Desk Operations, All Bookings list, and Fleet Inventory status check.*

---

## 🗄️ How to View the Database & Tables

To inspect the database tables (e.g. `bookings`, `equipment`, `users`, `payments`) and view all data entries:

1. Open **Laragon**.
2. Click the **Database** button on Laragon's bottom dashboard.
3. This opens **HeidiSQL** (the database viewer tool included inside Laragon).
4. Click **Open** on the connection settings popup (defaults to Session: MySQL on host `127.0.0.1`, user `root`, no password).
5. In the left-hand directory list, click on the **`antan_batura`** database.
6. Click on any table (e.g., `bookings`) and switch to the **Data** tab in the top-right menu to view all entries and records!

---

## 🛠️ Troubleshooting Setup Issues

### What if `composer install` fails?
If the setup script outputs a warning or error during Composer packages installation:
* **Option A (Automatic Fallback):** The setup script is designed to automatically try running `composer install --ignore-platform-reqs` if a standard install fails. If it successfully finishes after the warning, you can ignore the error.
* **Option B (Enable PHP Extensions in Laragon):** If it still fails, it means your PHP cli has disabled extension modules. You can enable them easily:
  1. Right-click anywhere in the **Laragon** dashboard.
  2. Hover over **PHP** ➔ **Extensions**.
  3. Ensure the following extensions have checkmarks next to them:
     * `openssl`
     * `pdo_mysql`
     * `mbstring`
     * `curl`
     * `zip`
  4. Run `setup_and_run.bat` again.

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
