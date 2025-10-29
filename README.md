# ⚠️ Project Status  
**This project is still under active development.**  
I’m continuing to make progress, although development is moving at a slower pace due to academic commitments.

---

# 📝 MiniDoc  

**MiniDoc** is a collaborative text editor inspired by Google Docs, designed to be lightweight, responsive, and fully custom-built.  
The goal of this project is to explore the architecture and challenges behind real-time collaborative editing, from CRDTs to efficient backend communication, while ensuring the entire system is **scalable across multiple servers**.

---

## 🚀 Features  

- **Real-time collaboration** powered by a custom **LSEQ CRDT** implementation  
- **WebSocket-based synchronization** for low-latency updates  
- **AI-powered backend (planned)** for grammar and style correction  
- **Persistent and temporary storage** using **PostgreSQL** and **Redis**  
- **Modular Docker architecture** including:
  - Frontend  
  - Main backend (Go + Gin)  
  - Reverse proxy (Traefik)  
  - Databases (PostgreSQL & Redis)  
  - Future AI backend (FastAPI + PyTorch)

---

## ⚙️ Tech Stack  

- **Frontend:** Custom rich-text editor (Angular + TypeScript planned)  
- **Backend:** Go (Gin, GORM, WebSockets)  
- **Database:** PostgreSQL & Redis  
- **Infrastructure:** Docker, Traefik  
- **AI Backend (planned):** Python (FastAPI, PyTorch)

---

## 📈 Current Progress  

- ✅ WebSocket layer implemented  
- ✅ LSEQ CRDT working prototype (frontend)  
- ⚙️ Backend CRDT logic and persistence (in progress)  
- 🔜 Rich-text formatting (bold, italic, underline, etc.)  
- 🔜 AI grammar and style correction service  

---

## 🎯 Objectives  

- Achieve a **response time under 50 ms** for most operations  
- Ensure **conflict-free real-time editing** through CRDTs  
- Provide a **self-hostable, privacy-friendly** alternative to Google Docs  
- Integrate **AI-assisted writing features** in future iterations  

---

## 🧠 Motivation  

The goal behind MiniDoc is both educational and practical: understanding the underlying mechanisms of collaborative editors and building a performant, scalable system from the ground up.  
The project also serves as a technical exploration of distributed systems, CRDTs, and real-time synchronization.

---

## 📄 License  

Released under the **MIT License**.  
Contributions, feedback, and suggestions are welcome.
