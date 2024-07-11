export const environment = {
  debug: false,
  positionAPI: "",
  webAPI: "",
  assetsURLPrefix: "",
  railLine: "malente-luetjenburg",
};

declare var _runtime_environment: any;
if (_runtime_environment) { // Set by runtime-environment.js
  Object.assign(environment, _runtime_environment);
  if (environment.debug) {
    console.log("Adjusted angular's runtime environment. ", environment);
  }
}