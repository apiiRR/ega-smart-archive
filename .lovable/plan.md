

# 🏛️ MyEGA – My Enterprise Governance Archive
### Aplikasi Manajemen Surat Menyurat Digital PT Berdikari

**Status**: Fase 1 - Fondasi (Login, RBAC, Layout, Dashboard) ✅ SELESAI

---

## Fase 1: Fondasi — Autentikasi & RBAC

### 1.1 Login & Autentikasi
- Halaman login dengan email & password
- Session management & redirect berdasarkan role
- Desain clean & professional dengan branding PT Berdikari

### 1.2 Sistem RBAC (Role Based Access Control)
- Tabel roles, permissions, dan menu akses di Supabase
- Admin dapat membuat role baru dan mengatur:
  - Menu yang bisa diakses per role
  - Aksi per menu (create, read, update, delete, approve, dispose)
  - Scope data (misal: hanya data divisi sendiri)
- Sidebar navigasi dinamis sesuai role user yang login

### 1.3 Layout Utama & Dashboard
- Sidebar navigasi responsif
- Header dengan info user & logout
- Dashboard ringkasan (jumlah surat masuk/keluar, pending disposisi)

---

## Fase 2: Master Data

### 2.1 Master Direktorat
- CRUD Direktorat (Nama Direktorat, Nama Direktur)
- Tabel dengan pencarian & pagination

### 2.2 Master Divisi
- CRUD Divisi (Nama Divisi, General Manager, relasi ke Direktorat)
- Dropdown relasi ke Direktorat & User

### 2.3 Master User
- CRUD User (Nama, Email, NIP, Divisi, Role)
- Password terenkripsi via Supabase Auth
- User hanya melihat data sesuai hak akses (RLS)

---

## Fase 3: Surat Masuk & Surat Keluar

### 3.1 Surat Masuk (Eksternal)
- Form input: Nama surat, Nomor surat, Asal surat, Catatan
- Upload scan surat (Supabase Storage)
- Disposisi ke satu atau lebih divisi
- Status workflow: Baru → Didisposisikan → Dibalas → Selesai → Arsip
- Histori disposisi lengkap

### 3.2 Surat Keluar (Internal/Outgoing)
- Pilih template → Isi data → Draft → Kirim
- Status workflow: Draft → Dikirim → Direvisi → Disetujui/Ditolak → Arsip
- Aksi revisi, pengembalian, dan persetujuan

### 3.3 Disposisi Dua Arah (Threaded)
- Disposisi dari A ke B dan balasan dari B ke A
- Tampilan threaded mirip chat berbasis surat
- Setiap disposisi: pengirim, penerima, catatan, timestamp
- Riwayat disposisi tidak bisa dihapus (immutable)

---

## Fase 4: Template Surat & WYSIWYG Editor

### 4.1 Template Surat dengan Live Preview
- Layout split view:
  - **Kiri**: Form input (nama template, field dinamis, konten WYSIWYG)
  - **Kanan**: Live preview format A4 dengan kop surat PT Berdikari
- Field dinamis (bisa ditambah/dikurangi)
- WYSIWYG editor untuk konten surat
- Template dapat digunakan ulang saat membuat surat keluar

---

## Fase 5: Audit Trail & Logging

### 5.1 Logging Komprehensif
- Pencatatan otomatis semua aktivitas:
  - Login/Logout
  - CRUD data master
  - Perubahan surat & status
  - Disposisi & approval
- Log mencatat: siapa, apa, kapan, dari state mana ke state mana
- Log bersifat immutable (tidak bisa diubah/dihapus)

### 5.2 Halaman Audit Trail (Admin)
- Tabel log dengan filter: tanggal, user, modul
- Detail setiap entry audit
- Export data audit

---

## Desain & UX
- **Gaya**: Clean & Professional — warna netral, tipografi jelas, whitespace yang cukup
- **Branding**: Logo & kop surat PT Berdikari akan diintegrasikan ke template surat dan header aplikasi
- **Responsif**: Optimal di desktop, fungsional di tablet
- **Navigasi**: Sidebar dengan menu dinamis sesuai RBAC

## Teknologi
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage, RLS, Edge Functions)
- **State Management**: TanStack React Query
- **WYSIWYG**: Rich text editor library (TipTap atau serupa)

