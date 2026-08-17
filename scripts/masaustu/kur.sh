#!/bin/bash
# Masaüstü TOTP üretecini kurar.
#
# Betiği ~/.tarpovizyon/ altına kopyalıyor ve Masaüstü'ne çift tıklanabilir bir
# .command dosyası bırakıyor. Depo silinse/taşınsa bile masaüstündeki dosya
# çalışmaya devam etsin diye kopyalıyor, sembolik bağ kurmuyor.
set -euo pipefail

KAYNAK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEDEF="$HOME/.tarpovizyon"
MASAUSTU="$HOME/Desktop"
KOMUT="$MASAUSTU/TarpoVizyon Kod.command"

mkdir -p "$HEDEF"
cp "$KAYNAK/totp.mjs" "$HEDEF/totp.mjs"
chmod 600 "$HEDEF/totp.mjs"

cat > "$KOMUT" <<'BITIS'
#!/bin/bash
# TarpoVizyon yönetici kodu. Çift tıkla, ekrandaki 6 haneyi kullan.
# Asıl betik: ~/.tarpovizyon/totp.mjs   (sır macOS Anahtar Zinciri'nde)

# Terminal'in çift tıkla açılan penceresinde PATH dar olabiliyor; node'u ara.
NODE=""
for aday in \
  "$(command -v node 2>/dev/null)" \
  /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node \
  "$HOME/.volta/bin/node" "$HOME/.nvm/versions/node"/*/bin/node
do
  if [ -x "$aday" ]; then NODE="$aday"; break; fi
done

if [ -z "$NODE" ]; then
  echo "Node bulunamadı. Kurmak için:  brew install node"
  echo "Kapatmak için bu pencereyi kapat."
  read -r _
  exit 1
fi

exec "$NODE" "$HOME/.tarpovizyon/totp.mjs"
BITIS

chmod +x "$KOMUT"

echo "✓ Kuruldu:  $KOMUT"
echo "  Masaüstündeki dosyaya çift tıkla; ilk açılışta sır kurulumunu yapacak."
