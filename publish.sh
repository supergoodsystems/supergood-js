source .env
VERSION_TYPE=${1:-patch};
curl -C - -0 https://raw.githubusercontent.com/supergoodsystems/docs/312ce3cd836606105def68ebe19d0b9cfc6c5452/integrate-with-clients/node.js/README.md > README.md;
git add README.md;
git commit -m "Update README.md";

npm version $VERSION_TYPE;
npm publish;
