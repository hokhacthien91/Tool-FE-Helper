function getHTMLHead(date, pageName) {
  return `<!DOCTYPE html>\n<html lang="vi">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Design Review Report - ${date}</title>`;
}

module.exports = getHTMLHead;

