# TODO_BRANCHES_fix_steps

## Goal

منع اختفاء/عدم ظهور الفروع بسبب فشل الاتصال بالـ backend في `getBranches()`.

## Current state

- `GET /api/branches` يفشل مع `ERR_CONNECTION_REFUSED` على `http://localhost:3000`.
- غالبًا `VITE_BACKEND_URL` غير مُحقن في runtime (Electron/Vite).
- لا يمكن قراءة ملف `.env` بواسطة الأدوات (قيود داخلية)، لذلك نعتمد على تعديل كود يجعل fallback أكثر صحة.

## Step 1 (Code fix - will be applied)

### File: `dashboard-electron/src/dataService.js`

- تعديل `getBranches()` بحيث:
  - إذا `VITE_BACKEND_URL` غير موجود:
    - يحاول استخدام نفس origin الخاص بالويب/الإلكترون (location.origin) + `/api/branches`.
    - **ولو location.origin ينتهي بـ 127.0.0.1 أو localhost** يستخدمه مباشرة.
    - هذا يضمن أن التطبيق يهاجم backend على نفس الـ host الذي يعمل عليه Frontend.
  - مع الاحتفاظ بـ fallback واحد أخير إلى `http://127.0.0.1:3000`.
  - إزالة الاعتماد على `localhost:3000` فقط.

## Step 2

بعد التطبيق:

- تشغيل التطبيق.
- التأكد من ظهور كونسول: `getBranches triedUrls` مع أول url صحيح.

## Step 3 (Auth improvement - optional)

- معالجة `Invalid Refresh Token` بتنظيف session عند فشل refresh.
