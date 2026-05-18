param(
  [string]$Message = "Actualizar recetas"
)

Write-Host "Preparando cambios de recetas e imagenes..."
git add assets/data/recipes.json assets/img/recetas

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No hay cambios de recetas o imagenes para publicar."
  exit 0
}

git commit -m $Message
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

git push
