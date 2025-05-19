
# 🔐 SecureGen - Password Generator Website

SecureGen is a sleek, fast, and customizable password generator web app built using **Next.js 13+**, **Tailwind CSS**, and **TypeScript**. It allows users to generate strong passwords with options like length, symbols, numbers, and case toggles.

---

## 🚀 Features

- ✅ Modern UI built with Tailwind CSS and Next.js App Router
- 🔢 Customize password length
- 🔠 Include/exclude uppercase, lowercase, numbers, and symbols
- 📋 One-click "copy to clipboard"
- 💡 Live password strength indicator
- ⚡ Lightning-fast with responsive design
- ☁️ Frontend hosted on **Vercel**
- 🐍 Backend API (optional) powered by **Python (FastAPI/Flask)** *(host separately if needed)*

---

## 📁 Folder Structure (Key)

```bash
.
├── app/                 # App directory (pages/routes)
├── components/          # Reusable UI components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions (e.g., password generation)
├── public/              # Static assets (favicon, images)
├── styles/              # Global styles and Tailwind configs
├── next.config.mjs      # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS custom config
```

---

## 🧪 Local Development

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/securegen.git
cd securegen
```

### 2. Install Dependencies

```bash
pnpm install  # or use yarn/npm
```

### 3. Run Locally

```bash
pnpm dev
```

App will run at `http://localhost:3000`.

---

## 🧠 Password Generation Logic

The logic is in:
```
lib/generatePassword.ts
```

This file handles:
- Random character generation
- Settings for custom length and allowed character sets
- API-ready or inline usage with React

---

## 🌐 Deployment

### 🖥️ Frontend

- Push this repo to [GitHub](https://github.com/)
- Connect it to [Vercel](https://vercel.com) for automatic deployment

### 🔙 Optional Backend (Python)

Use [Render](https://render.com), [Railway](https://railway.app), or [Replit](https://replit.com) for Python-based password logic.

---

## 📎 Live Website

🔗 **Visit it here**: [https://securegen.vercel.app](https://securegen.vercel.app) *(replace with your actual deployed link)*

---

## 👨‍💻 Credits

> Built with ❤️ by **[Your Name]**  
> Special thanks to Next.js, Tailwind CSS, and OpenAI for development inspiration.

---

## 📃 License

This project is licensed under the MIT License.  
Feel free to fork, modify, and share it!
