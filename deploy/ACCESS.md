# Akses administrasi Niskala melalui Tailscale

Perangkat pribadi mengakses VPS menggunakan **OpenSSH biasa melalui jaringan
Tailscale**. Setiap perangkat memakai SSH key sendiri untuk akun Linux `ubuntu`.
File aplikasi tetap berada di VPS; isi `.env` tidak perlu disalin ke perangkat.

## Batas akses

- VPS Niskala: `100.64.182.105` (IPv6: `fd7a:115c:a1e0::4729:b66a`).
- Identitas Tailscale administrator: `mdanyprayudhaa@gmail.com`.
- Grant administrator mengizinkan `tcp:22` ke VPS Niskala. Identitas pengguna
  mencakup perangkat yang terdaftar sebagai milik pengguna tersebut dalam tailnet
  yang sama; perangkat bertag menggunakan identitas tag tersendiri.
- Sumber Windows lama (`100.95.43.55` dan
  `fd7a:115c:a1e0::2229:2b38`) tetap dipertahankan sebagai izin tambahan.
- Key Windows di `/home/ubuntu/.ssh/authorized_keys` tetap dipertahankan. Login
  Tailscale saja belum memberikan akses SSH: perangkat baru harus mempunyai key
  yang public key-nya sudah ditambahkan ke akun `ubuntu`.
- GitHub Actions memakai `tag:niskala-ci`, akun Linux `deploy`, dan key tersendiri
  yang dibatasi dengan `command="bash /srv/niskala-udara/deploy/deploy.sh",restrict`.
- Tailscale SSH tetap nonaktif (`RunSSH=false`, bagian policy `ssh` kosong).

Policy yang disimpan pada 19 Oktober 2026 menambahkan email administrator pada
`src` grant SSH Niskala yang sudah ada:

```json
{
  "src": [
    "100.95.43.55",
    "fd7a:115c:a1e0::2229:2b38",
    "mdanyprayudhaa@gmail.com"
  ],
  "dst": [
    "100.64.182.105",
    "fd7a:115c:a1e0::4729:b66a"
  ],
  "ip": ["tcp:22"]
}
```

Penyimpanan policy belum disertai pengujian koneksi dari perangkat baru atau
pengujian deployment. Pendaftaran public key perangkat baru tetap diperlukan.

## Menambahkan Mac atau perangkat pribadi baru

1. Pasang Tailscale dan masuk ke tailnet yang sama sebagai
   `mdanyprayudhaa@gmail.com`. Jika device approval digunakan, perangkat harus
   disetujui terlebih dahulu. Pertahankan perangkat pribadi sebagai perangkat
   milik pengguna, bukan perangkat bertag CI.
2. Buat SSH key di perangkat baru. Contoh di Mac:

   ```bash
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_niskala -C "niskala-mac"
   cat ~/.ssh/id_ed25519_niskala.pub
   ```

   Pilih nama file lain jika key dengan nama tersebut sudah ada. Simpan private
   key di Mac; hanya isi file `.pub` yang diperlukan untuk pendaftaran.
3. Dari Windows yang sudah mempunyai akses, tambahkan public key Mac ke akun
   `ubuntu`. Di PowerShell, ganti contoh di bawah dengan **satu baris public key
   Mac yang lengkap**:

   ```powershell
   $macPublicKey = 'ssh-ed25519 GANTI_DENGAN_PUBLIC_KEY_MAC niskala-mac'
   $macPublicKey | ssh -o BatchMode=yes -o StrictHostKeyChecking=yes ubuntu@100.64.182.105 'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys'
   ```

   Perintah ini menambahkan baris pada daftar key administrator yang sudah ada.
   Key deploy GitHub Actions berada di akun berbeda dan tidak perlu diubah.
4. Gunakan key Mac tersebut untuk masuk ke server:

   ```bash
   ssh -i ~/.ssh/id_ed25519_niskala ubuntu@100.64.182.105
   ```

   Pada koneksi pertama, cocokkan host key dengan catatan VPS yang tepercaya.
   Setelah masuk, edit file sebagai pemiliknya:

   ```bash
   sudoedit -u deploy /srv/niskala-udara/.env
   ```

   File `.env` dimiliki `deploy` dengan mode `600`. Pertahankan izin ini.
   Mengedit file tidak menjalankan deployment atau restart aplikasi.

Windows tetap dapat memakai perintah yang sudah tersedia:

```powershell
ssh ubuntu@100.64.182.105
```

## Membatalkan izin jaringan untuk semua perangkat pengguna

Hapus hanya `mdanyprayudhaa@gmail.com` dari `src` grant SSH Niskala di konsol
Tailscale. Pertahankan dua alamat Windows, tujuan Niskala, dan `tcp:22`.
Grant `tag:niskala-ci` dan `tag:bbreezy-ci` tidak perlu diubah.

Untuk mencabut satu perangkat, cabut perangkat itu dari tailnet dan hapus hanya
baris public key perangkat tersebut dari `/home/ubuntu/.ssh/authorized_keys`.

## Rujukan

- [Tailscale grants](https://tailscale.com/docs/reference/syntax/grants)
- [Identitas perangkat bertag](https://tailscale.com/docs/features/tags)
- [OpenSSH biasa di atas Tailscale](https://tailscale.com/docs/features/tailscale-ssh#os-user-authentication-on-the-client)
