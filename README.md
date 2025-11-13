#  FitoPrice Backend
Este repositorio contiene el **backend de FitoPrice**, encargado de gestionar los datos, la autenticación y las operaciones relacionadas con productos, empresas y precios agrícolas.
Desarrollado sobre **Supabase** (PostgreSQL + Auth + Storage) usando ExpressJs, este backend actúa como fuente de datos central para el **frontend** y para los flujos automáticos de **n8n**.

---

##  Descripción General

El backend de FitoPrice proporciona una API para:

-  Gestionar información de productos agrícolas, empresas y precios.  
-  Autenticar y autorizar usuarios administrativos.  
-  Servir datos históricos para el análisis en el frontend.  
-  Recibir actualizaciones automáticas de scraping desde n8n.  

---

## 🧩 Tecnologías Principales
-  **Express (NodeJs)** — Framework backend ligero para crear y gestionar endpoints RESTful.  
-  **PostgreSQL (Supabase)** — Base de datos relacional con funciones, triggers y roles.  
-  **Supabase Auth** — Sistema de autenticación y permisos.  
-  **Supabase Storage** — Manejo de imágenes (logos de empresas, fotos de productos).  
-  **Supabase Edge Functions / API REST** — Lógica del backend y endpoints personalizados.  
-  **Render** — Entorno de despliegue y automatización.

---



