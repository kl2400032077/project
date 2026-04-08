# NutriTrack: two separate Git repositories

Your assignment asks for **one repository for the backend** and **one for the frontend**. In this workspace they already live as **two folders with their own `.git`**:

| Repository | Folder on disk | Stack |
|------------|----------------|--------|
| **Backend** | `backend/` | Spring Boot 3, Swagger, DTOs, ModelMapper, JWT, `@ControllerAdvice` |
| **Frontend** | `frontend/` | React + Vite, calls Spring API on port **8080** |

The **parent folder** (`project-1/`) is a convenience workspace; it may also contain an older Node demo (`server/`, `src/` at root). **For submission, treat `backend/` and `frontend/` as the two repos**, not the parent.

---

## 1. Publish the backend repo (`backend/`)

1. Open a terminal **inside** `backend/`.
2. Confirm Git: `git status`
3. Add your remote (create an **empty** repo on GitHub/GitLab first), for example:
   ```bash
   git remote add origin https://github.com/YOUR_USER/nutritrack-backend.git
   git branch -M main
   git push -u origin main
   ```
4. Run the API (Eclipse, IntelliJ, or CLI):
   ```bat
   .\mvnw.cmd spring-boot:run
   ```
5. Verify **Swagger**: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)  
6. Verify **OpenAPI JSON**: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

---

## 2. Publish the frontend repo (`frontend/`)

1. Open a terminal **inside** `frontend/` (not the parent folder).
2. Confirm Git: `git status`
3. Add remote, for example:
   ```bash
   git remote add origin https://github.com/YOUR_USER/nutritrack-frontend.git
   git branch -M main
   git push -u origin main
   ```
4. Install and run:
   ```bash
   npm install
   npm run dev
   ```
5. With the **backend running on 8080**, open [http://localhost:5173](http://localhost:5173).  
   Dev server proxies `/api` → `http://localhost:8080` (see `vite.config.js`).

---

## 3. Rubric / requirement checklist (backend)

| Requirement | Where to look | Quick check |
|-------------|----------------|-------------|
| **Swagger** | `springdoc-openapi-starter-webmvc-ui`, `OpenApiConfig` | Open Swagger UI on **8080** |
| **DTOs** | `backend/src/main/java/com/nutritrack/dto/` | Controllers use `*Request` / `*Response` records or classes |
| **ModelMapper** | `pom.xml`, `FoodService`, etc. | `modelMapper.map(...)` |
| **Exception handling** | `GlobalExceptionHandler.java` | `@ControllerAdvice` returns consistent errors |
| **JWT** | `JwtService`, `JwtAuthFilter`, `SecurityConfig` | Login returns `accessToken`; protected routes need `Bearer` |
| **OAuth** | Optional | Not required unless you add it |

---

## 4. IDE workflow (your question)

- **Backend:** Open **`backend/`** in **Eclipse** (Import → Existing Maven Projects), **Spring Tool Suite**, or **IntelliJ**. Run `NutriTrackApplication`. Swagger appears at **8080** — **Cursor does not need to be open**.
- **Frontend:** Open **`frontend/`** in **VS Code** or **Cursor**. Run `npm run dev`.  
- **CI:** Closing Cursor does not stop a running app; CI typically runs `mvn test` / `npm run build` on the server. You can add GitHub Actions per repo later.

---

## 5. Environment variables (frontend)

Copy `frontend/.env.example` to `frontend/.env` and adjust if your API is not on `localhost:8080`.

---

## 6. Starting fresh (if you have no remotes yet)

- **Backend only:** Zip or clone only `backend/` → that folder is the backend repo root (contains `pom.xml`).
- **Frontend only:** Same for `frontend/` → must contain `package.json` at root.

Do **not** commit nested `node_modules/`, `target/`, or local H2 database files (see each folder’s `.gitignore`).
