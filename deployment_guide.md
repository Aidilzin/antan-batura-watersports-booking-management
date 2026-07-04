# Deployment and Local Running Guide

This guide details how to run the Antan Batura Watersports booking application locally on your computer and how to deploy it online from scratch so others can access it.

---

## Part 1: How to Run the Project Locally

### 1. Backend Local Setup (Laragon)
1. Open the **Laragon** control panel.
2. Click **Start All** to launch Apache and MySQL.
3. Open **HeidiSQL** (or your preferred database manager), connect to Laragon's MySQL server, and create a new database named `antan_batura` (or check the database name defined in your `backend/.env`).
4. Open your command terminal (Powershell or Laragon Terminal) and navigate to the backend folder:
   ```powershell
   cd "C:\Users\aidil\Downloads\assignment\Sem 6\ISP550\backend"
   ```
5. Ensure dependencies are installed and the application key is generated:
   ```bash
   composer install
   php artisan key:generate
   ```
6. Run the database migrations and seeders to create your tables and populate the list of watercrafts and default admin accounts:
   ```bash
   php artisan migrate:fresh --seed
   ```
7. Start the local server:
   ```bash
   php artisan serve
   ```
   *The backend API will now be running locally at `http://127.0.0.1:8000`.*

---

### 2. Frontend Local Setup (Vite React)
1. Open a new terminal window and navigate to the frontend directory:
   ```powershell
   cd "C:\Users\aidil\Downloads\assignment\Sem 6\ISP550\frontend"
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Verify your `.env` configuration file exists (`frontend/.env`) and points to your local Laravel server:
   ```ini
   VITE_API_URL=http://127.0.0.1:8000
   ```
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```
5. Open your web browser and navigate to **`http://localhost:5173`** to access the system.

---
---

## Part 2: How to Deploy the Project Online (From Scratch)

Follow these steps sequentially to publish your database, backend, and frontend.

### Step 1: Push Your Code to GitHub
1. Open a terminal in the root project folder:
   ```powershell
   cd "C:\Users\aidil\Downloads\assignment\Sem 6\ISP550"
   ```
2. Initialize Git, stage all files, and commit locally:
   ```bash
   git init
   git add .
   git commit -m "Initialize project deployment setup"
   ```
3. Go to [GitHub](https://github.com/) and create a new **Private** or **Public** repository.
4. Link the repository and push your commits:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Create a Cloud MySQL Database (Aiven.io)
Since local Laragon databases cannot be accessed directly by Render, you must host your database online.
1. Go to [Aiven.io](https://aiven.io/) and create a free account.
2. Click **Create Service** and configure the setup:
   * **Service Type:** MySQL
   * **Service Plan:** Free Tier
   * **Region:** Choose a region close to Malaysia (e.g., Singapore/Southeast Asia)
3. Once the database status changes to **Running**, copy the connection details displayed on the screen:
   * **Host** (e.g., `mysql-xxx.aivencloud.com`)
   * **Port** (e.g., `25060`)
   * **Database Name** (default is `defaultdb`)
   * **Username** (default is `avnadmin`)
   * **Password**

---

### Step 3: Deploy the Laravel Backend (Render.com)
1. Go to [Render.com](https://render.com/) and log in (sign up using your GitHub account for easy access).
2. Click **New +** and select **Web Service**.
3. Link your GitHub repository.
4. Configure the Web Service settings:
   * **Name:** `antan-batura-backend`
   * **Root Directory:** `backend` *(Critical: This tells Render to compile the Laravel folder, not the frontend)*
   * **Runtime:** `PHP`
   * **Build Command:**
     ```bash
     composer install --no-dev --optimize-autoloader
     ```
   * **Start Command:**
     ```bash
     php artisan migrate --force && php artisan serve --host 0.0.0.0 --port $PORT
     ```
5. Click **Advanced** and add the following **Environment Variables**:
   * `APP_ENV` = `production`
   * `APP_KEY` = `base64:xxx...` *(Generate this by running `php artisan key:generate --show` locally and copying the value)*
   * `DB_CONNECTION` = `mysql`
   * `DB_HOST` = *Your Aiven Host URL*
   * `DB_PORT` = *Your Aiven Port*
   * `DB_DATABASE` = `defaultdb`
   * `DB_USERNAME` = `avnadmin`
   * `DB_PASSWORD` = *Your Aiven Password*
6. Click **Create Web Service**. Wait 5-7 minutes for Render to build the project. Copy the provided backend URL (e.g., `https://antan-batura-backend.onrender.com`).

---

### Step 4: Deploy the React Frontend (Vercel)
1. Go to [Vercel](https://vercel.com/) and sign up/log in using your GitHub account.
2. Click **Add New > Project**.
3. Import your GitHub repository.
4. Configure the project settings:
   * **Name:** `antan-batura-watersports`
   * **Framework Preset:** `Vite`
   * **Root Directory:** `frontend` *(Critical: This tells Vercel to compile the React folder)*
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. Expand the **Environment Variables** section and add:
   * **Key:** `VITE_API_URL`
   * **Value:** *Your Render backend URL (e.g., `https://antan-batura-backend.onrender.com`)*
6. Click **Deploy**. Vercel will build your static assets and publish the app. It will give you a public URL (e.g. `https://antan-batura-watersports.vercel.app`).

---

### Step 5: Seed Data and Run the App
To access the admin panels, you need to set up the default database values (like the watercraft listings) on the cloud database.
1. In your local backend project directory (`C:\Users\aidil\Downloads\assignment\Sem 6\ISP550\backend`), open [backend/.env](file:///c:/Users/aidil/Downloads/assignment/Sem%206/ISP550/backend/.env).
2. Temporarily replace your local database config with your **Aiven Cloud database credentials**.
3. Open your terminal in the backend directory and run:
   ```bash
   php artisan db:seed
   ```
   *This seeds the online database with the default admin credentials and watercraft entries.*
4. Change your local `.env` database details back to `localhost` / `127.0.0.1` so your local development is unaffected.

**Congratulations! Your application is now live. Visitors can book watercrafts on your Vercel URL, and staff can access the dashboard by navigating directly to `https://your-vercel-url.vercel.app/login`.**
