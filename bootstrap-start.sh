#!/usr/bin/env bash
set -e

symbol-bootstrap start -p bootstrap -a full -c bootstrap-preset.yml -d --noPassword

cp target/wallets/wallet-0/network.conf.js public/config/network.conf.js

echo "THESE ARE THE TEST ADDRESSES! YOU CAN IMPORT THEM"
echo ""
cat target/addresses.yml
echo ""
echo ""
echo "NOW RUN:"
echo ""
echo "npm run dev"
