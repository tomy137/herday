#!/usr/bin/env bash
# Build l'app iOS (Capacitor) et l'envoie sur App Store Connect / TestFlight.
#
# Usage : TEAM_ID=XXXXXXXXXX ./scripts/ios-testflight.sh
#
# Authentification, au choix :
#   - compte Apple connecté dans Xcode (Réglages > Comptes) : rien à faire ;
#   - clé API App Store Connect : ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH (.p8).
#
# Le numéro de build est horodaté (AAAAMMJJHHMM) pour être toujours croissant ;
# la version marketing reste celle du projet (MARKETING_VERSION).
set -euo pipefail

cd "$(dirname "$0")/.."

: "${TEAM_ID:?TEAM_ID requis (Team ID du compte Apple Developer payant)}"
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M)}"
OUT_DIR="ios/App/build"
ARCHIVE="$OUT_DIR/HerDay.xcarchive"

if ! grep -q '^VITE_API_URL_NATIVE=https://' .env 2>/dev/null; then
  echo "frontend/.env doit définir VITE_API_URL_NATIVE=https://… (sinon l'app vise localhost)" >&2
  exit 1
fi

AUTH_ARGS=(-allowProvisioningUpdates)
if [[ -n "${ASC_KEY_ID:-}" ]]; then
  AUTH_ARGS+=(
    -authenticationKeyID "$ASC_KEY_ID"
    -authenticationKeyIssuerID "${ASC_ISSUER_ID:?ASC_ISSUER_ID requis avec ASC_KEY_ID}"
    -authenticationKeyPath "${ASC_KEY_PATH:?ASC_KEY_PATH requis avec ASC_KEY_ID}"
  )
fi

echo "==> Build web + sync Capacitor"
npm run build
npx cap sync ios

echo "==> Archive (build $BUILD_NUMBER, team $TEAM_ID)"
rm -rf "$ARCHIVE"
xcodebuild archive \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  "${AUTH_ARGS[@]}" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER"

cat > "$OUT_DIR/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>upload</string>
	<key>teamID</key>
	<string>$TEAM_ID</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
</dict>
</plist>
EOF

echo "==> Export + upload App Store Connect"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$OUT_DIR/ExportOptions.plist" \
  -exportPath "$OUT_DIR/export" \
  "${AUTH_ARGS[@]}"

echo "==> Build $BUILD_NUMBER envoyé. Traitement Apple ~10-30 min, puis visible dans TestFlight."
