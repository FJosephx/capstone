#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Setup Android - Avatar Gamer                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Reiniciar Docker
echo "📦 [1/3] Reiniciando Docker..."
docker compose restart backend
echo "✓ Backend reiniciado"
echo ""

# 2. Build del frontend
echo "🔨 [2/3] Building frontend para Android..."
cd frontend/avatargamer-app
npx ionic build --prod
npx cap sync android
cd ../..
echo "✓ Frontend sincronizado"
echo ""

# 3. Información final
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✓ TODO LISTO                                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📱 SIGUIENTE PASO:"
echo "   → Abre Android Studio"
echo "   → Click en el botón Play ▶️"
echo ""
echo "🌐 CONFIGURACIÓN:"
echo "   → Backend: http://192.168.1.20:8000"
echo "   → Usuario: admin"
echo "   → Password: admin"
echo ""
echo "📊 VERIFICAR LOGS:"
echo "   → Backend: docker compose logs -f backend"
echo ""
