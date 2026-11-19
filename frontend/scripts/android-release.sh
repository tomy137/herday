#!/usr/bin/env bash
# Build l'app Android (Capacitor) signée : APK (envoi direct aux testeurs) + AAB (Play Console).
#
# Usage : ./scripts/android-release.sh
#
# Prérequis (une fois) :
#   - JDK 21 : brew install openjdk@21
#   - SDK Android dans ~/Library/Android/sdk (sdkmanager « platforms;android-36 », « build-tools;36.0.0 »)
#   - clé de signature hors dépôt : ~/.herdays/android/keystore.properties (storeFile, storePassword,
#     keyAlias, keyPassword) ou HERDAYS_KEYSTORE_PROPS. À SAUVEGARDER : la perdre empêche toute mise à
#     jour de l'app publiée.
#
# Le versionCode = minutes depuis l'epoch (toujours croissant, < 2^31) ; versionName reste celui du
# projet (android/app/build.gradle).
set -euo pipefail

cd "$(dirname "$0")/.."

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
KEYSTORE_PROPS="${HERDAYS_KEYSTORE_PROPS:-$HOME/.herdays/android/keystore.properties}"
VERSION_CODE="${VERSION_CODE:-$(( $(date +%s) / 60 ))}"
OUT_DIR="android/release"

if ! grep -q '^VITE_API_URL_NATIVE=https://' .env 2>/dev/null; then
  echo "frontend/.env doit définir VITE_API_URL_NATIVE=https://… (sinon l'app vise localhost)" >&2
  exit 1
fi
if [[ ! -f "$KEYSTORE_PROPS" ]]; then
  echo "Clé de signature introuvable : $KEYSTORE_PROPS" >&2
  exit 1
fi
[[ -f android/local.properties ]] || echo "sdk.dir=$ANDROID_HOME" > android/local.properties

echo "==> Build web + sync Capacitor"
npm run build
npx cap sync android

echo "==> Gradle release (versionCode $VERSION_CODE)"
(cd android && ./gradlew --quiet clean assembleRelease bundleRelease -PversionCode="$VERSION_CODE")

mkdir -p "$OUT_DIR"
cp android/app/build/outputs/apk/release/app-release.apk "$OUT_DIR/HerDays-$VERSION_CODE.apk"
cp android/app/build/outputs/bundle/release/app-release.aab "$OUT_DIR/HerDays-$VERSION_CODE.aab"

# Vérifie que l'APK est bien signé avec la clé de release (pas la clé de debug).
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs "$OUT_DIR/HerDays-$VERSION_CODE.apk" \
  | grep -m1 "Signer #1 certificate DN"

echo "==> Prêt :"
echo "    APK (envoi direct) : frontend/$OUT_DIR/HerDays-$VERSION_CODE.apk"
echo "    AAB (Play Console) : frontend/$OUT_DIR/HerDays-$VERSION_CODE.aab"
