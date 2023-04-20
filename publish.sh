VERSION_TYPE=${1:-patch};
curl -C - -0 https://raw.githubusercontent.com/supergoodsystems/docs/main/installing-clients/node.js.md > README.md;
git add README.md;
git commit -m "Update README.md";
yarn run clean;
npx tsc;
npm version $VERSION_TYPE;
npm publish --access public;
git add .;
git commit -m "Published latest version";
git push origin master;
