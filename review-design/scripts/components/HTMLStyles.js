function getHTMLStyles() {
  return `<style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n      line-height: 1.6;\n      color: #1d1d1f;\n      background: #f5f5f7;\n      padding: 40px 20px;\n    }\n    .container { ...full CSS... }`;
}

module.exports = getHTMLStyles;

