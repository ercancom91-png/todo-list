export type Locale = "tr" | "en";

export const LOCALES: Locale[] = ["tr", "en"];

export const STRINGS = {
  // Common
  "common.appName": { tr: "Bahçem", en: "My Garden" },
  "common.cancel": { tr: "Vazgeç", en: "Cancel" },
  "common.delete": { tr: "Sil", en: "Delete" },
  "common.back": { tr: "Geri", en: "Back" },
  "common.please_wait": { tr: "Lütfen bekle…", en: "Please wait…" },

  // Auth — titles / subtitles
  "auth.signIn.title": { tr: "Bahçene Gir", en: "Welcome back" },
  "auth.signIn.subtitle": { tr: "Niyetlerini kaydet ve takip et.", en: "Save and track your intentions." },
  "auth.signUp.title": { tr: "Bahçeni Oluştur", en: "Create your garden" },
  "auth.signUp.subtitle": { tr: "Kendi niyet koleksiyonunu kurmaya başla.", en: "Start your own collection of intentions." },
  "auth.recover.title": { tr: "Şifreni Sıfırla", en: "Reset your password" },
  "auth.recover.subtitle": { tr: "E-posta adresini gir; sıfırlama bağlantısı gönderelim.", en: "Enter your email and we'll send you a reset link." },

  // Auth — fields
  "auth.emailLabel": { tr: "E-POSTA", en: "EMAIL" },
  "auth.emailPlaceholder": { tr: "ornek@mail.com", en: "you@mail.com" },
  "auth.passwordLabel": { tr: "ŞİFRE", en: "PASSWORD" },
  "auth.passwordPlaceholder": { tr: "En az 6 karakter", en: "At least 6 characters" },

  // Auth — actions
  "auth.submit.signIn": { tr: "Giriş Yap", en: "Sign in" },
  "auth.submit.signUp": { tr: "Hesap Oluştur", en: "Create account" },
  "auth.submit.recover": { tr: "Sıfırlama Bağlantısı Gönder", en: "Send reset link" },
  "auth.switch.toSignUp.q": { tr: "Henüz hesabın yok mu?", en: "No account yet?" },
  "auth.switch.toSignUp.a": { tr: "Hesap oluştur", en: "Create one" },
  "auth.switch.toSignIn.q": { tr: "Zaten hesabın var mı?", en: "Already have an account?" },
  "auth.switch.toSignIn.a": { tr: "Giriş yap", en: "Sign in" },
  "auth.forgot": { tr: "Şifremi unuttum", en: "Forgot password?" },
  "auth.backToSignIn": { tr: "Girişe dön", en: "Back to sign in" },

  // Auth — messages
  "auth.error.emptyFields": { tr: "E-posta ve şifre gerekli.", en: "Email and password are required." },
  "auth.error.emptyEmail": { tr: "E-posta gerekli.", en: "Email is required." },
  "auth.success.signUp": {
    tr: "{email} adresine bir onay e-postası gönderildi. Gelen kutunu kontrol et; bağlantıya tıkla, sonra buradan giriş yap.",
    en: "A confirmation email has been sent to {email}. Check your inbox, click the link, then come back to sign in.",
  },
  "auth.success.recover": {
    tr: "{email} adresine bir sıfırlama bağlantısı gönderildi. Gelen kutunu kontrol et.",
    en: "A reset link has been sent to {email}. Check your inbox.",
  },
  "auth.error.emailNotConfirmed": { tr: "E-postan henüz onaylanmadı. Gelen kutunu kontrol et.", en: "Email not confirmed yet. Check your inbox." },
  "auth.error.invalidCredentials": { tr: "E-posta veya şifre hatalı.", en: "Incorrect email or password." },
  "auth.error.alreadyRegistered": { tr: "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.", en: "This email is already registered. Try signing in." },
  "auth.error.passwordTooShort": { tr: "Şifre en az 6 karakter olmalı.", en: "Password must be at least 6 characters." },
  "auth.error.rateLimit": { tr: "Kısa sürede çok fazla istek gönderildi. Bir süre bekleyip tekrar dene.", en: "Too many requests. Please wait a moment and try again." },

  "auth.footer": { tr: "Bahçem · Niyet yönetim uygulaması", en: "My Garden · Intention tracker" },

  // App — header
  "app.defaultSubtitle": { tr: "Niyetlerini kaydet ve takip et.", en: "Save and track your intentions." },
  "app.signOut": { tr: "Çıkış", en: "Sign out" },
  "app.signOutConfirm.title": { tr: "Çıkış", en: "Sign out" },
  "app.signOutConfirm.body": { tr: "Hesaptan çıkmak istediğine emin misin?", en: "Are you sure you want to sign out?" },
  "app.signOutConfirm.yes": { tr: "Çıkış yap", en: "Sign out" },

  // App — add
  "app.addPlaceholder": { tr: "Yeni bir niyet ekle...", en: "Add a new intention..." },
  "app.addAction": { tr: "Görev ekle", en: "Add task" },

  // App — filters
  "app.filter.all": { tr: "Tümü", en: "All" },
  "app.filter.active": { tr: "Filizlenenler", en: "Growing" },
  "app.filter.completed": { tr: "Çiçeklenenler", en: "Blooming" },

  // App — errors
  "app.error.loadFailed": { tr: "Görevler yüklenemedi.", en: "Couldn't load tasks." },
  "app.error.addFailed": { tr: "Görev eklenemedi.", en: "Couldn't add task." },
  "app.error.updateFailed": { tr: "Güncellenemedi.", en: "Couldn't update." },
  "app.error.deleteFailed": { tr: "Silinemedi.", en: "Couldn't delete." },
  "app.error.clearFailed": { tr: "Temizlenemedi.", en: "Couldn't clear." },

  // App — empty states
  "app.empty.noTasks.title": { tr: "Henüz bir niyet yok.", en: "No intentions yet." },
  "app.empty.noTasks.hint": { tr: "İlk niyetini ekleyerek başla.", en: "Add your first intention to begin." },
  "app.empty.noMatch.title": { tr: "Bu filtrede görev yok.", en: "Nothing in this filter." },
  "app.empty.noMatch.hint": { tr: "Başka bir sekmeyi dene.", en: "Try another tab." },

  // App — footer counters
  "app.footer.allDone": { tr: "Tüm niyetlerin tamamlandı.", en: "All intentions complete." },
  "app.footer.onlyGrowing": { tr: "{remaining} filizleniyor", en: "{remaining} growing" },
  "app.footer.mixed": { tr: "{remaining} filiz · {bloomed} çiçek", en: "{remaining} growing · {bloomed} blooming" },
  "app.footer.clearCompleted": { tr: "Tamamlananları temizle", en: "Clear completed" },
  "app.clearConfirm.title": { tr: "Tamamlananları temizle", en: "Clear completed" },
  "app.clearConfirm.body": { tr: "{count} tamamlanan görev silinecek.", en: "{count} completed tasks will be deleted." },
  "app.clearConfirm.yes": { tr: "Temizle", en: "Clear" },

  // App — edit
  "app.editEmpty.title": { tr: "Boş metin", en: "Empty text" },
  "app.editEmpty.body": { tr: "Görevi silmek ister misin?", en: "Do you want to delete this task?" },

  // Task item
  "task.deleteConfirm.title": { tr: "Niyeti sil", en: "Delete intention" },
  "task.deleteConfirm.body": { tr: "Bu niyeti silmek istediğine emin misin?", en: "Are you sure you want to delete this?" },
  "task.a11y.markDone": { tr: "Çiçeklendir", en: "Mark as bloomed" },
  "task.a11y.markUndone": { tr: "Tohuma geri döndür", en: "Revert to seed" },
  "task.a11y.edit": { tr: "Düzenle", en: "Edit" },
  "task.a11y.delete": { tr: "Sil", en: "Delete" },
} as const satisfies Record<string, Record<Locale, string>>;

export type StringKey = keyof typeof STRINGS;
