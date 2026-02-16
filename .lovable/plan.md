
# Rencana: Restrukturisasi Menu & Fitur Surat Internal Perusahaan

## Ringkasan Perubahan

Proyek ini akan direstrukturisasi menjadi 3 perubahan besar:
1. Hapus kolom "kategori" dari Template Surat
2. Reorganisasi menu sidebar menjadi grup "Buat Surat" dan "Kotak Masuk"
3. Buat fitur baru "Surat Internal Perusahaan" dengan mode manual/template, multi-tujuan, dan tebusan

---

## 1. Hapus Kategori dari Template Surat

- Hapus kolom `category` dari tabel `letter_templates` via migrasi database
- Hapus dropdown kategori dan badge kategori dari halaman `TemplateSurat.tsx`
- Hapus array `CATEGORIES` dari kode

---

## 2. Reorganisasi Menu Sidebar

### Struktur Menu Baru:

```text
BUAT SURAT
  - Surat Masuk (eksternal, catat surat dari luar)
  - Surat Keluar (eksternal, buat surat keluar)  
  - Surat Internal (buat surat antar divisi/direktorat)

KOTAK MASUK
  - Surat Masuk Internal (surat internal yang ditujukan ke divisi user)
  - Tebusan Surat (surat di mana divisi user ada di daftar tebusan)
  - Disposisi (disposisi yang ditujukan ke divisi user)

MASTER DATA (tetap)
PENGATURAN (tetap)
```

### Perubahan Database (tabel `menus`):
- Update menu yang ada dan tambah menu baru: `surat_internal`, `inbox_internal`, `inbox_tebusan`
- Tambah permission untuk menu baru
- Tambah role_permissions untuk super_admin

### Perubahan Sidebar (`AppSidebar.tsx`):
- Sesuaikan logika pengelompokan menu berdasarkan path prefix baru

---

## 3. Tabel Baru: `surat_internal`

### Skema Database:

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | uuid | Primary key |
| nomor_surat | text | Nomor surat |
| nama_surat | text | Judul surat |
| perihal | text | Perihal |
| isi_surat | text | Konten HTML (manual atau dari template) |
| template_id | uuid, nullable | Referensi ke template yang digunakan |
| tujuan | jsonb | Array ID divisi/direktorat tujuan |
| tebusan | jsonb | Array ID divisi/direktorat tebusan (CC) |
| file_url | text, nullable | Lampiran |
| created_by | uuid | Pembuat |
| status | document_status | draft / confirm |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### RLS Policies:
- **SELECT**: Admin lihat semua. Pegawai lihat jika: pembuat, divisi sama, divisi ada di tujuan, atau divisi ada di tebusan
- **INSERT**: `auth.uid() = created_by`
- **UPDATE/DELETE**: Hanya jika `status = 'draft'` dan (pembuat atau admin)

---

## 4. Halaman Baru: Surat Internal (`SuratInternal.tsx`)

### Alur Pembuatan:
1. User klik "Buat Surat Internal"
2. Dialog muncul dengan pilihan: **Manual** atau **Dari Template**
3. **Mode Manual**: Form seperti Surat Keluar (nomor, nama, perihal, isi teks/editor, tujuan, tebusan, lampiran)
4. **Mode Template**: 
   - Pilih template dari dropdown
   - Form field dinamis otomatis muncul berdasarkan placeholder `{{...}}` di template
   - User mengisi field, lalu konten template di-replace otomatis
5. **Tujuan**: Multi-select dropdown gabungan Divisi + Direktorat
6. **Tebusan**: Multi-select dropdown gabungan Divisi + Direktorat
7. Simpan sebagai draft

### Halaman Detail:
- Tampilkan detail surat internal + status badge
- Tombol Konfirmasi jika masih draft
- Thread disposisi (reuse `DispositionThread` component dengan prop baru `suratInternalId`)

---

## 5. Halaman Baru: Kotak Masuk Internal (`InboxInternal.tsx`)

- Menampilkan surat internal di mana divisi user ada di array `tujuan`
- Super admin melihat semua
- Tampilan daftar dengan detail view

## 6. Halaman Baru: Tebusan Surat (`InboxTebusan.tsx`)

- Menampilkan surat internal di mana divisi user ada di array `tebusan`
- Super admin melihat semua
- Read-only view (tidak bisa edit/hapus)

---

## 7. Update DispositionThread

- Tambah prop `suratInternalId` agar disposisi bisa dilampirkan ke surat internal
- Tambah kolom `surat_internal_id` ke tabel `dispositions`

---

## Detail Teknis

### Migrasi Database (1 migrasi):
1. Hapus kolom `category` dari `letter_templates`
2. Buat tabel `surat_internal` dengan RLS policies
3. Tambah kolom `surat_internal_id` ke `dispositions`
4. Update menus dan permissions

### File Baru:
- `src/pages/SuratInternal.tsx` - Halaman buat & kelola surat internal
- `src/pages/InboxInternal.tsx` - Kotak masuk surat internal
- `src/pages/InboxTebusan.tsx` - Daftar tebusan/CC surat

### File Diubah:
- `src/pages/TemplateSurat.tsx` - Hapus kategori
- `src/components/AppSidebar.tsx` - Reorganisasi grup menu
- `src/components/DispositionThread.tsx` - Tambah support surat internal
- `src/App.tsx` - Tambah route baru
- `src/hooks/useMenuPermissions.ts` - Sesuaikan jika perlu

### Data Menu Baru (INSERT ke tabel menus):
- `surat_internal` | "Surat Internal" | `/surat-internal` | icon: FileText | sort: 5
- `inbox_internal` | "Surat Masuk Internal" | `/inbox/internal` | icon: Inbox | sort: 6  
- `inbox_tebusan` | "Tebusan Surat" | `/inbox/tebusan` | icon: ArrowRightLeft | sort: 7
- Disposisi dipindah ke sort: 8, path tetap `/disposisi`
