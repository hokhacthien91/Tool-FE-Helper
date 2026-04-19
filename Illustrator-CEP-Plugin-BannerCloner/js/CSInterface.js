/* Minimal CSInterface bridge for CEP panels.
   Exposes evalScript + a few helpers for Banner Cloner. */
(function (global) {
  function CSInterface() {}

  CSInterface.prototype.evalScript = function (script, callback) {
    if (global.__adobe_cep__ && typeof global.__adobe_cep__.evalScript === "function") {
      global.__adobe_cep__.evalScript(script, callback || function () {});
    } else {
      if (typeof callback === "function") callback("");
    }
  };

  CSInterface.prototype.getHostEnvironment = function () {
    if (global.__adobe_cep__ && typeof global.__adobe_cep__.getHostEnvironment === "function") {
      try { return JSON.parse(global.__adobe_cep__.getHostEnvironment()); } catch (e) { return {}; }
    }
    return {};
  };

  CSInterface.prototype.openURLInDefaultBrowser = function (url) {
    if (global.__adobe_cep__ && typeof global.__adobe_cep__.openURLInDefaultBrowser === "function") {
      global.__adobe_cep__.openURLInDefaultBrowser(url);
    }
  };

  CSInterface.prototype.getSystemPath = function (name) {
    if (global.__adobe_cep__ && typeof global.__adobe_cep__.getSystemPath === "function") {
      return global.__adobe_cep__.getSystemPath(name);
    }
    return "";
  };

  global.CSInterface = CSInterface;
  global.SystemPath = { USER_DATA: "userData", EXTENSION: "extension" };
})(window);
