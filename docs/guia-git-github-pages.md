# Guía básica de Git, GitHub y GitHub Pages

Esta guía asume que estás trabajando desde la carpeta del proyecto en Visual Studio Code.

## 1. Comprobar si Git está instalado

Abre una terminal en VS Code:

```bash
git --version
```

Si aparece una versión, Git está instalado. Si no, instala Git desde:

```text
https://git-scm.com/
```

## 2. Configurar tu nombre y email

Solo hace falta hacerlo una vez en tu ordenador:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@example.com"
```

Puedes comprobarlo con:

```bash
git config --global --list
```

## 3. Iniciar el repositorio

Desde la raíz del proyecto:

```bash
git init
```

## 4. Revisar el estado

```bash
git status
```

Git te enseñará archivos nuevos o modificados.

## 5. Añadir archivos

```bash
git add .
```

Esto prepara los archivos para el commit. Los `.docx` originales no deberían añadirse porque están ignorados por `.gitignore`.

## 6. Hacer el primer commit

```bash
git commit -m "Initial commit"
```

Un commit es una foto del estado del proyecto.

## 7. Crear el repositorio en GitHub

En GitHub:

1. Pulsa `New repository`.
2. Pon un nombre, por ejemplo `recetario-familiar`.
3. Elige `Private` o `Public`.
4. No marques crear README si ya tienes este proyecto local.
5. Pulsa `Create repository`.

## 8. Conectar el remoto

GitHub te mostrará una URL. Será parecida a:

```text
https://github.com/TU_USUARIO/recetario-familiar.git
```

Conecta tu proyecto local:

```bash
git remote add origin URL_DEL_REPOSITORIO
```

Ejemplo:

```bash
git remote add origin https://github.com/TU_USUARIO/recetario-familiar.git
```

## 9. Asegurar la rama main

```bash
git branch -M main
```

## 10. Subir cambios a GitHub

```bash
git push -u origin main
```

La primera vez puede pedirte iniciar sesión.

## 11. Activar GitHub Pages

En el repositorio de GitHub:

1. Entra en `Settings`.
2. En el menú lateral, abre `Pages`.
3. En `Build and deployment`, elige `Deploy from a branch`.
4. En `Branch`, elige `main`.
5. En carpeta, elige `/root`.
6. Pulsa `Save`.

GitHub generará una URL parecida a:

```text
https://TU_USUARIO.github.io/recetario-familiar/
```

Puede tardar unos minutos en estar disponible.

## 12. Hacer cambios posteriores

Después de editar recetas, imágenes, CSS o JavaScript:

```bash
git status
git add .
git commit -m "Descripción del cambio"
git push
```

Ejemplos de mensajes:

```bash
git commit -m "Añadir fotos de recetas"
git commit -m "Corregir categorías de recetas"
git commit -m "Actualizar contraseña del recetario"
```

## 13. Comprobar que GitHub Pages se actualizó

Vuelve a abrir la URL de GitHub Pages. Si no ves los cambios:

- espera unos minutos;
- recarga con `Ctrl + F5`;
- revisa la pestaña `Actions` del repositorio por si GitHub está desplegando todavía;
- comprueba que hiciste `git push`.

## 14. Qué archivos deben estar en GitHub

Deben estar:

- `index.html`
- `README.md`
- `robots.txt`
- `.gitignore`
- `assets/`
- `docs/`
- `tools/`

También debe estar:

```text
assets/data/recipes.json
```

Sin ese archivo, la web publicada no podrá mostrar recetas.

## 15. Qué archivos no deben estar en GitHub

No subas los Word originales:

```text
DULCES.docx
RECETAS DE EVERNOTE.docx
source-docs/*.docx
```

Tampoco subas fotos privadas o datos personales sensibles.
