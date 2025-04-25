# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/c38d24e4-3be2-467b-9d0b-85b3a51117cd

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c38d24e4-3be2-467b-9d0b-85b3a51117cd) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

---

## Безопасность интеграций

- **Никогда не храните токены и секреты в коде или репозитории.** Используйте переменные окружения и секреты CI/CD (GitHub/GitLab Secrets, HashiCorp Vault и др.).
- **.env и другие файлы с секретами должны быть в .gitignore.**
- **Используйте только HTTPS** для всех API-запросов, включая внутренние интеграции.
- **Передавайте токены только через заголовки** (например, Authorization: Bearer ...), не используйте URL-параметры для передачи токенов.
- **Минимизируйте права токенов.** Для каждой интеграции используйте только необходимые разрешения.
- **Регулярно проводите аудит зависимостей** (`npm audit`) и обновляйте пакеты.
- **При удалении интеграций — отзывайте их токены.**
- **Не логируйте чувствительные данные** (токены, пароли, сессионные идентификаторы).
- **Проводите аудит и тестирование интеграций** на регулярной основе.


This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c38d24e4-3be2-467b-9d0b-85b3a51117cd) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
