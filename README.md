# Island Hopper

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/khususcrypto0000-coder/flight-game-makefun/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/khususcrypto0000-coder/flight-game-makefun/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Island Hopper** adalah game terbang 2D original yang berjalan sepenuhnya offline di browser desktop. Dari pandangan chase di belakang pesawat, kamu terbang di atas kepulauan tropis — langit biru, laut berkilau, pulau-pulau hijau dengan landasan, awan, dan ring target bercahaya.

Setiap misi: lepas landas dari runway Pulau Start, terbang melewati **5 ring bernomor** yang tersusun di rute berbeda tiap misi, lalu mendarat mulus di runway Pulau Tujuan. Bahan bakar berkurang selama terbang — mendarat mengisi ulang tangki. Tabrak bukit atau jatuh ke laut berarti crash. Ada 3 misi dengan rute seeded yang deterministik, skor, timer, dan layar hasil.

## Cara main

| Kontrol | Fungsi |
| --- | --- |
| W / S | Throttle naik / turun |
| A / D atau ← / → | Belok (banking) |
| ↑ / ↓ | Pitch naik / turun |
| SPACE | Rem udara / flare saat mendarat |
| Mouse (tahan) | Mengarahkan pesawat |
| ENTER | Mulai / misi berikutnya |
| P | Jeda |
| R | Ulang misi |
| M | Bisukan suara |

Aturan terbang: di bawah kecepatan minimum sayap kehilangan lift (stall) — jaga throttle. Mendarat butuh kecepatan rendah, arah sejajar runway, dan semua ring sudah dilewati. Pendaratan mulus dapat bonus poin.

## Run it

Tidak butuh build step, tidak butuh internet, tidak ada library eksternal.

```bash
# dari folder game/
python3 -m http.server 8080
# lalu buka http://localhost:8080 di Chrome desktop
```

Atau serve folder `game/` dengan static server apa pun dan buka `index.html`. Game berjalan dari file statis lokal saja — semua script, gaya, dan suara dibuat di dalam repo ini.

## Struktur source

- `game/index.html` — halaman game + tombol START/PAUSE/RESTART/SOUND
- `game/src/config.js` — semua konstanta (kecepatan, bahan bakar, skor, warna)
- `game/src/input.js` — keyboard dan mouse
- `game/src/physics.js` — model terbang arcade (throttle, lift, stall, banking)
- `game/src/world.js` — kepulauan, runway, dan rute ring (seeded, deterministik)
- `game/src/render.js` — gambar canvas: langit, laut, pulau, ring, pesawat, HUD
- `game/src/audio.js` — bunyi WebAudio oscillator (mesin, angin, ring, mendarat)
- `game/src/main.js` — loop game, state, misi, skor, mode screenshot `?shot=`
- `main.ts` — entrypoint Node 22: menyalin `game/` + `screenshots/` ke output dan menulis `dossier.json`
- `vendor/makefun-game.ts` — library dossier dari kit make.fun (tidak diubah)

## Screenshots

Screenshot deterministik via query param: `?shot=takeoff`, `?shot=rings`, `?shot=landing`, `?shot=results`.

<sub>Entered on [make.fun](https://make.fun/?ref=452ydmv8&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
