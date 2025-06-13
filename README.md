# Panou Comenzi Livrări

Aceasta este o aplicație web pentru gestionarea comenzilor de livrare și ridicare, cu interfață modernă și ușor de folosit.

## Funcționalități principale
- **Adăugare comandă nouă** cu nume eveniment, adresă și dată/ora livrării
- **Timer automat** pentru fiecare livrare și, dacă este cazul, pentru ridicare
- **Confirmare livrare** cu sau fără retur (ridicare)
- **Programare și finalizare ridicare** cu timer dedicat
- **Editare și ștergere comenzi**
- **Status vizual** pentru fiecare comandă (Livrare, Ridicare, Finalizată)
- **Iconițe moderne** pentru o experiență plăcută
- **Toate datele sunt salvate local** (nu ai nevoie de cont sau server)

## Cum folosești aplicația
1. Apasă pe butonul ➕ pentru a adăuga o comandă nouă.
2. Completează detaliile și salvează.
3. Poți edita sau șterge orice comandă folosind butoanele dedicate.
4. Când o comandă este gata de livrare, apasă pe „Confirmare livrare”.
   - Dacă este nevoie de ridicare, vei putea programa data/ora returului.
   - Dacă nu, comanda va fi marcată ca finalizată.
5. Poți finaliza și ridicarea, iar toate timerele și datele vor fi tăiate pentru claritate.

## Tehnologii folosite
- HTML, CSS, JavaScript (fără backend)
- [Font Awesome](https://fontawesome.com/) pentru iconițe

---

**Aplicația funcționează complet local, direct din browser!**

Dacă ai sugestii sau vrei să adaugi funcționalități noi, poți modifica liber codul. 

## Cum faci aplicația portabilă (EXE pentru Windows)

1. Asigură-te că ai Node.js instalat pe calculatorul unde faci build-ul (doar pentru generare, nu și pentru rulare).
2. Deschide un terminal în folderul aplicației.
3. Instalează electron-packager (doar prima dată):
   ```sh
   npm install --save-dev electron-packager
   ```
4. Rulează comanda de build:
   ```sh
   npx electron-packager . PanouComenziLivrari --platform=win32 --arch=x64 --overwrite
   ```
5. Vei găsi un folder nou numit `PanouComenziLivrari-win32-x64` cu fișierul `PanouComenziLivrari.exe` în el.
6. Copiază acest folder pe un stick USB.
7. Pe orice PC cu Windows, rulează direct `PanouComenziLivrari.exe` (nu ai nevoie de VS Code, Node.js sau alte instalări).

**Atenție:**
- Poți rula aplicația pe orice Windows 10/11 (64-bit).
- Toate datele (inclusiv istoricul) vor fi salvate în același folder cu aplicația, deci poți muta folderul oriunde. 