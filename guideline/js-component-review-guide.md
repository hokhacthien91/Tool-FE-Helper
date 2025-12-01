# JavaScript/TypeScript Verification Rules

## 📋 VERIFICATION CHECKLIST

### 🏗️ **1. FOLDER STRUCTURE COMPLIANCE**

#### Required Files (Component Folder)
- ✅ **index.ts** - Entry point (MANDATORY)
- ✅ **types.ts** - Type definitions (MANDATORY for TS)
- ✅ **constants.ts** - Constants and selectors (RECOMMENDED)

#### Optional Files
- ⚪ **childFunc.ts** - Helper/child functions
- ⚪ **eventHandlers.ts** - Event handling functions
- ⚪ **utils.ts** - Utility functions
- ⚪ **[component].test.ts** - Unit tests
- ⚪ **[component].mock.ts** - Mock data

#### Validation Commands
```bash
# Check required files exist
find . -name "index.ts" -o -name "types.ts" | wc -l

# Check folder structure compliance
ls -la component-folder/
```

---

### 📁 **2. FILE & FOLDER NAMING CONVENTION**

#### **A. Folder Naming Rules (JS/TS)**

| Type | Convention | Example | Notes |
|------|------------|---------|-------|
| **Components** | camelCase | `fundsFileListing/`, `categorySearch/` | for components |
| **Utilities** | camelCase | `formAnimation/`, `browserDetection/` | for utility functions |
| **Assets** | kebab-case | `static-resources/`, `apis-mock/` | for static files |

#### **B. File Naming Matrix (JS/TS)**

| File Type | Convention | Extension | Example |
|-----------|------------|-----------|---------|
| **React Components** | PascalCase | `.tsx` | `SearchResults.tsx` |
| **TypeScript Classes** | camelCase | `.ts` | `browserDetection.ts` |
| **Utility Functions** | camelCase | `.ts` | `scrollHelpers.ts` |
| **Type Definitions** | camelCase | `.d.ts` | `authoringData.d.ts` |
| **Constants** | camelCase | `.ts` | `constants.ts` |

#### **C. Validation Commands**

```bash
# Check folder naming compliance
find . -type d -name "*[A-Z]*" ! -path "./node_modules/*" | grep -E "^[A-Z]"

# Check React component naming (should be PascalCase)
find . -name "*.tsx" ! -path "./node_modules/*" | grep -vE "/[A-Z][a-zA-Z]*\.tsx$"

# Check TypeScript file naming (should be camelCase)
find . -name "*.ts" ! -name "*.d.ts" ! -path "./node_modules/*" | grep -vE "/[a-z][a-zA-Z]*\.ts$"

# Check type definition naming
find . -name "*.d.ts" ! -path "./node_modules/*" | grep -vE "/[a-z][a-zA-Z]*\.d\.ts$"
```

#### **D. Naming Convention Rules**

**✅ CORRECT Examples:**
```bash
# Folders
src/components/fundsFileListing/
src/utils/browserDetection/
src/assets/static-resources/

# Files
SearchResults.tsx          # React component (PascalCase)
browserDetection.ts        # TypeScript class (camelCase)
scrollHelpers.ts          # Utility functions (camelCase)
authoringData.d.ts        # Type definitions (camelCase)
constants.ts              # Constants (camelCase)
```

**❌ VIOLATION Examples:**
```bash
# Folders
src/components/FundsFileListing/    # Should be camelCase
src/utils/browser_detection/        # Should be camelCase
src/assets/StaticResources/         # Should be kebab-case

# Files
searchResults.tsx                   # Should be PascalCase
BrowserDetection.ts                 # Should be camelCase
scroll_helpers.ts                   # Should be camelCase
AuthoringData.d.ts                 # Should be camelCase
```

---

### 🔍 **3. CODE QUALITY VERIFICATION**

#### **A. Unused Code Detection**

```bash
# Find unused functions
grep -r "function\s\+\w\+" . --include="*.ts" --include="*.js"

# Find unused variables
grep -r "(?:let|const|var)\s+\w+" . --include="*.ts" --include="*.js"

# Find unused imports
grep -r "^import.*from" . --include="*.ts" --include="*.js"

# Find empty functions
grep -r "function.*{\s*}" . --include="*.ts" --include="*.js"
grep -r "=>\s*{\s*}" . --include="*.ts" --include="*.js"

# Find unused classes
grep -r "^class\s\+\w\+" . --include="*.ts" --include="*.js"

# Find empty/unused files (files with only imports/exports, no actual code)
find . -name "*.ts" -o -name "*.js" | xargs wc -l | awk '$1 <= 5 {print $2}'
```

**Manual Check:**
- ❌ **VIOLATION**: Functions declared but never called - **MUST specify file and line number**
- ❌ **VIOLATION**: Variables declared but never used - **MUST specify file and line number**
- ❌ **VIOLATION**: Imports that are not referenced - **MUST specify file and line number**
- ❌ **VIOLATION**: Empty functions with no implementation - **MUST specify file and line number**
- ❌ **VIOLATION**: Classes declared but never instantiated - **MUST specify file and line number**
- ❌ **VIOLATION**: Empty files or files with minimal content - **MUST specify file path**

#### **B. Hardcoded Text Detection**

```bash
# Find hardcoded strings (exclude console.log, test files, mock files)
grep -r "['\"]\w\{3,\}['\"]\s*[^)]" . --include="*.ts" --include="*.js" | grep -v console | grep -v "\.test\." | grep -v "\.mock\."

# Find hardcoded URLs (exclude test files, mock files)
grep -r "https\?://" . --include="*.ts" --include="*.js" | grep -v "\.test\." | grep -v "\.mock\."

# Find hardcoded UI text (user-facing strings) (exclude test files, mock files)
grep -r "['\"]\s*[A-Z][a-zA-Z ]{4,}['\"]\s*[^)]" . --include="*.ts" --include="*.js" | grep -v console | grep -v "\.test\." | grep -v "\.mock\."

# Find hardcoded accessibility text (exclude test files, mock files)
grep -r "aria-label=\"[^\"]*\"\|alt=\"[^\"]*\"" . --include="*.ts" --include="*.js" --include="*.html" | grep -v "\.test\." | grep -v "\.mock\."

# Find potential i18n violations (English text patterns) (exclude test files, mock files)
grep -r "['\"]\s*[A-Z][a-z]* [a-z]*['\"]\|['\"]\s*[A-Z][a-z]*['\"]\s*[^.]" . --include="*.ts" --include="*.js" | grep -v "\.test\." | grep -v "\.mock\."
```

**Rules:**
- ❌ **VIOLATION**: Hardcoded text strings (should use constants) *(exclude test/mock files)* - **MUST specify file and line number**
- ❌ **VIOLATION**: Hardcoded URLs or API endpoints *(exclude test/mock files)* - **MUST specify file and line number**
- ❌ **VIOLATION**: UI text strings hardcoded in JavaScript (should use CMS/i18n system) *(exclude test/mock files)* - **MUST specify file and line number**
- ❌ **VIOLATION**: Accessibility text (aria-label, alt text) hardcoded (should be from CMS/i18n) *(exclude test/mock files)* - **MUST specify file and line number**
- ❌ **VIOLATION**: User-facing messages hardcoded regardless of usage frequency *(exclude test/mock files)* - **MUST specify file and line number**
- ✅ **CORRECT**: Text stored in constants or config files
- ✅ **CORRECT**: UI text loaded from CMS or i18n system (e.g., `i18n.t('menu.open')`)
- ✅ **CORRECT**: Technical strings (event names, CSS classes) can be hardcoded
- ✅ **CORRECT**: Fallback text with CMS/i18n priority (e.g., `dataset.text || 'fallback'`) - **ALWAYS ALLOWED** when CMS/i18n is primary source
- ✅ **EXCEPTION**: Hardcoded text in test files (*.test.ts) and mock files (*.mock.ts) is **ALWAYS ALLOWED** - these files are for testing purposes only and do not affect production UI
- ✅ **EXCEPTION**: Hardcoded accessibility text in test files (*.test.ts) and mock files (*.mock.ts) is **ALWAYS ALLOWED** - these files are for testing purposes only

**Examples:**
```typescript
// ❌ VIOLATION: Hardcoded UI text
export const MENU_TEXT = {
  OPEN_MENU: 'Open menu',
  CLOSE_MENU: 'Close menu',
};

// ❌ VIOLATION: Hardcoded accessibility text
button.setAttribute('aria-label', 'Close dropdown');

// ❌ VIOLATION: Hardcoded user message
throw new Error('Invalid email address');

// ✅ CORRECT: Use CMS/i18n system
export const MENU_TEXT = {
  OPEN_MENU: i18n.t('menu.open'),
  CLOSE_MENU: i18n.t('menu.close'),
};

// ✅ CORRECT: Accessibility text from i18n
button.setAttribute('aria-label', i18n.t('dropdown.close'));

// ✅ CORRECT: Technical strings are OK
document.addEventListener('DOMContentLoaded', handler);
element.classList.add('is-open');

// ✅ CORRECT: Fallback text with CMS/i18n priority (ALWAYS ALLOWED)
OPEN_MENU: sanitizeText(hamburgerElement.dataset.openMenuText) || 'Open menu',
CLOSE_MENU: sanitizeText(hamburgerElement.dataset.closeMenuText) || 'Close menu',

// ✅ CORRECT: Hardcoded text in test files (ALWAYS ALLOWED)
// In *.test.ts files:
describe('Component', () => {
  it('should display correct text', () => {
    expect(element.textContent).toBe('Open menu');
  });
});

// ✅ CORRECT: Hardcoded text in mock files (ALWAYS ALLOWED)
// In *.mock.ts files:
export const mockHTML = `
  <button aria-label="Close dropdown">Close</button>
`;
```

#### **C. Console Statement Detection**

```bash
# Find console statements
grep -r "console\." . --include="*.ts" --include="*.js"

# Find debug statements
grep -r "debugger" . --include="*.ts" --include="*.js"
```

**Rules:**
- ❌ **VIOLATION**: `console.log()`, `console.warn()`, `console.error()` in production code - **MUST specify file and line number**
- ❌ **VIOLATION**: `debugger` statements - **MUST specify file and line number**
- ✅ **ACCEPTABLE**: Console statements in development/test files only

#### **D. Vietnamese Comments Detection**

```bash
# Find Vietnamese text in comments
grep -r "//.*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]" . --include="*.ts" --include="*.js"

# Find Vietnamese in multiline comments
grep -r "/\*.*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]" . --include="*.ts" --include="*.js"
```

**Rules:**
- ❌ **VIOLATION**: Comments in Vietnamese language - **MUST specify file and line number**
- ✅ **CORRECT**: All comments in English only

#### **E. Repeated Text Variables**

```bash
# Find string literals used multiple times
grep -roh "['\"]\w\{3,\}['\"]\s*" . --include="*.ts" --include="*.js" | sort | uniq -c | sort -nr | head -20
```

**Rules:**
- ❌ **VIOLATION**: Same text string used 3+ times without constant - **MUST specify file and line numbers**
- ✅ **CORRECT**: Repeated text stored in constants

#### **F. Keycode Constants Usage**

```bash
# Find hardcoded keycodes (should use constants from _keyCodes.ts)
grep -r "keyCode.*[0-9]" . --include="*.ts" --include="*.js"
grep -r "which.*[0-9]" . --include="*.ts" --include="*.js"
grep -r "event\.key.*==.*['\"][0-9]" . --include="*.ts" --include="*.js"

# Check if _keyCodes.ts is being imported where needed
grep -r "addEventListener.*keydown\|addEventListener.*keyup" . --include="*.ts" --include="*.js" | xargs grep -L "_keyCodes"

# Find unsafe type assertions
grep -r ") as HTMLElement\|) as HTMLVideoElement\|) as Element" . --include="*.ts" --include="*.js"

# Find force casting in querySelector/closest
grep -r "querySelector.*) as \|closest.*) as " . --include="*.ts" --include="*.js"
```

**Rules:**
- ❌ **VIOLATION**: Hardcoded keycode numbers (9, 13, 27, 32, etc.) - **MUST specify file and line number**
- ❌ **VIOLATION**: Direct keyCode or which property usage without constants - **MUST specify file and line number**
- ❌ **VIOLATION**: Unsafe type assertions without null checks (`element.closest() as HTMLElement`) - **MUST specify file and line number**
- ❌ **VIOLATION**: Force casting DOM queries (`querySelector() as HTMLVideoElement`) - **MUST specify file and line number**
- ✅ **CORRECT**: Use constants from `_keyCodes.ts` (keyCodes.TAB, keyCodesString.ENTER, etc.)
- ✅ **CORRECT**: Import keyCodes from `'../1-settings/_keyCodes'` when handling keyboard events
- ✅ **CORRECT**: Use `instanceof` and proper null checks instead of type assertions
- ✅ **CORRECT**: Use generic type parameters for `querySelector<HTMLElement>()` when safe

**Examples:**
```typescript
// ❌ VIOLATION: Hardcoded keycodes
if (event.keyCode === 13) { }
if (event.which === 27) { }
if (event.key === '9') { }

// ✅ CORRECT: Use constants
import { keyCodes, keyCodesString } from '../1-settings/_keyCodes';
if (event.keyCode === keyCodes.ENTER) { }
if (event.key === keyCodesString.ESC) { }
```

---

### 🎯 **4. TYPE SAFETY VERIFICATION**

#### **A. Type Definitions**

```typescript
// ✅ CORRECT: Explicit interfaces
interface ComponentProps {
  readonly element: HTMLElement;
  readonly config?: ComponentConfig;
}

// ❌ VIOLATION: Using 'any'
function process(data: any): any { }

// ✅ CORRECT: Use unknown with type guards
function process(data: unknown): ProcessedData {
  if (isValidData(data)) {
    return processValidData(data);
  }
  throw new Error('Invalid data');
}
```

#### **B. Type Assertions & DOM Queries**

```typescript
// ❌ VIOLATION: Unsafe type assertions
const element = document.querySelector('.selector') as HTMLElement;
const parent = element.closest('.parent') as HTMLElement;
const video = document.querySelector('.video') as HTMLVideoElement;

// ❌ VIOLATION: Force casting without null checks
heroBannerElements.forEach((element) => {
  const heroBannerElement = element.closest(SELECTORS.CONTAINER) as HTMLElement;
  // This can throw runtime error if closest() returns null
});

// ✅ CORRECT: Proper type guards with instanceof
const element = document.querySelector('.selector');
if (element instanceof HTMLElement) {
  // Safe to use element as HTMLElement
  element.classList.add('active');
}

// ✅ CORRECT: Proper null checks with type narrowing
const video = document.querySelector('.video');
if (video && video instanceof HTMLVideoElement) {
  video.play();
}

// ✅ CORRECT: Safe closest() usage
heroBannerElements.forEach((element) => {
  const heroBannerElement = element.closest(SELECTORS.CONTAINER);
  if (heroBannerElement instanceof HTMLElement) {
    new HeroBanner(heroBannerElement).init();
  }
});

// ✅ CORRECT: Generic querySelector with type parameter (when you're sure)
const elements = document.querySelectorAll<HTMLElement>('.selector');
// This is safer than 'as HTMLElement' because querySelectorAll with generic
// still returns a collection that can be iterated safely
```

#### **C. Class Structure Requirements**

```typescript
// ✅ CORRECT: Well-typed class
export default class Component {
  // Public constants
  public static readonly SELECTOR = '.component';

  // Private properties with types
  private readonly element: HTMLElement;
  private readonly config: ComponentConfig;
  private isInitialized: boolean = false;

  constructor(element: HTMLElement, config: Partial<ComponentConfig> = {}) {
    if (!element) {
      throw new Error('Element is required');
    }
    this.element = element;
    this.config = { ...defaultConfig, ...config };
  }

  public init(): void {
    if (this.isInitialized) return;
    this.setupEventListeners();
    this.isInitialized = true;
  }

  private setupEventListeners(): void {
    // Implementation
  }

  public static initialize(): Component[] {
    const elements = document.querySelectorAll<HTMLElement>(Component.SELECTOR);
    return Array.from(elements).map(el => new Component(el));
  }
}
```

---

### 🔧 **5. AUTOMATED VERIFICATION SCRIPT**

```bash
#!/bin/bash
# js-verification.sh

echo "🔍 JavaScript/TypeScript Code Verification"
echo "=========================================="

# 1. Check unused functions
echo "1. Checking for unused functions..."
grep -r "function\s\+\w\+" . --include="*.ts" --include="*.js" | wc -l

# 2. Check console statements
echo "2. Checking for console statements..."
CONSOLE_COUNT=$(grep -r "console\." . --include="*.ts" --include="*.js" | wc -l)
if [ $CONSOLE_COUNT -gt 0 ]; then
  echo "❌ Found $CONSOLE_COUNT console statements"
  grep -r "console\." . --include="*.ts" --include="*.js"
else
  echo "✅ No console statements found"
fi

# 3. Check hardcoded text (exclude test/mock files)
echo "3. Checking for hardcoded text..."
HARDCODED_COUNT=$(grep -r "['\"]\w\{5,\}['\"]\s*[^)]" . --include="*.ts" --include="*.js" | grep -v console | grep -v "\.test\." | grep -v "\.mock\." | wc -l)
if [ $HARDCODED_COUNT -gt 0 ]; then
  echo "❌ Found $HARDCODED_COUNT potential hardcoded strings"
else
  echo "✅ No hardcoded strings found"
fi

# 3.1. Check hardcoded UI text (CMS/i18n violations) (exclude test/mock files)
echo "3.1. Checking for hardcoded UI text..."
UI_TEXT_COUNT=$(grep -r "['\"]\s*[A-Z][a-zA-Z ]{4,}['\"]\s*[^)]" . --include="*.ts" --include="*.js" | grep -v console | grep -v "\.test\." | grep -v "\.mock\." | wc -l)
if [ $UI_TEXT_COUNT -gt 0 ]; then
  echo "❌ Found $UI_TEXT_COUNT hardcoded UI text strings (should use CMS/i18n)"
  echo "ℹ️  Note: Hardcoded text in test files (*.test.ts) and mock files (*.mock.ts) is ALLOWED"
  grep -r "['\"]\s*[A-Z][a-zA-Z ]{4,}['\"]\s*[^)]" . --include="*.ts" --include="*.js" | grep -v console | grep -v "\.test\." | grep -v "\.mock\."
else
  echo "✅ No hardcoded UI text found"
fi

# 3.2. Check hardcoded accessibility text (exclude test/mock files)
echo "3.2. Checking for hardcoded accessibility text..."
A11Y_TEXT_COUNT=$(grep -r "aria-label=\"[^\"]*\"\|alt=\"[^\"]*\"" . --include="*.ts" --include="*.js" | grep -v "\.test\." | grep -v "\.mock\." | wc -l)
if [ $A11Y_TEXT_COUNT -gt 0 ]; then
  echo "❌ Found $A11Y_TEXT_COUNT hardcoded accessibility text (should be from CMS/i18n)"
  echo "ℹ️  Note: Hardcoded text in test files (*.test.ts) and mock files (*.mock.ts) is ALLOWED"
  grep -r "aria-label=\"[^\"]*\"\|alt=\"[^\"]*\"" . --include="*.ts" --include="*.js" | grep -v "\.test\." | grep -v "\.mock\."
else
  echo "✅ No hardcoded accessibility text found"
fi

# 4. Check Vietnamese comments
echo "4. Checking for Vietnamese comments..."
VIETNAMESE_COUNT=$(grep -r "//.*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]" . --include="*.ts" --include="*.js" | wc -l)
if [ $VIETNAMESE_COUNT -gt 0 ]; then
  echo "❌ Found $VIETNAMESE_COUNT Vietnamese comments"
  grep -r "//.*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]" . --include="*.ts" --include="*.js"
else
  echo "✅ No Vietnamese comments found"
fi

# 5. Check repeated strings
echo "5. Checking for repeated strings..."
echo "Top repeated strings:"
grep -roh "['\"]\w\{3,\}['\"]\s*" . --include="*.ts" --include="*.js" | sort | uniq -c | sort -nr | head -10

# 6. Check naming conventions
echo "6. Checking naming conventions..."

# Check React component naming (PascalCase)
REACT_NAMING=$(find . -name "*.tsx" ! -path "./node_modules/*" | grep -vE "/[A-Z][a-zA-Z]*\.tsx$" | wc -l)
if [ $REACT_NAMING -gt 0 ]; then
  echo "❌ Found $REACT_NAMING React components with incorrect naming (should be PascalCase)"
  find . -name "*.tsx" ! -path "./node_modules/*" | grep -vE "/[A-Z][a-zA-Z]*\.tsx$"
else
  echo "✅ All React components follow PascalCase naming"
fi

# Check TypeScript file naming (camelCase)
TS_NAMING=$(find . -name "*.ts" ! -name "*.d.ts" ! -path "./node_modules/*" | grep -vE "/[a-z][a-zA-Z]*\.ts$" | wc -l)
if [ $TS_NAMING -gt 0 ]; then
  echo "❌ Found $TS_NAMING TypeScript files with incorrect naming (should be camelCase)"
  find . -name "*.ts" ! -name "*.d.ts" ! -path "./node_modules/*" | grep -vE "/[a-z][a-zA-Z]*\.ts$"
else
  echo "✅ All TypeScript files follow camelCase naming"
fi

# 7. Check empty functions and unused classes
echo "7. Checking for empty functions and unused classes..."

# Check empty functions
EMPTY_FUNCTIONS=$(grep -r "function.*{\s*}" . --include="*.ts" --include="*.js" | wc -l)
EMPTY_ARROW_FUNCTIONS=$(grep -r "=>\s*{\s*}" . --include="*.ts" --include="*.js" | wc -l)
TOTAL_EMPTY=$((EMPTY_FUNCTIONS + EMPTY_ARROW_FUNCTIONS))
if [ $TOTAL_EMPTY -gt 0 ]; then
  echo "❌ Found $TOTAL_EMPTY empty functions"
else
  echo "✅ No empty functions found"
fi

# Check for small/potentially unused files
SMALL_FILES=$(find . -name "*.ts" -o -name "*.js" | grep -v node_modules | xargs wc -l | awk '$1 <= 5 && $1 > 0 {print $2}' | wc -l)
if [ $SMALL_FILES -gt 0 ]; then
  echo "⚠️  Found $SMALL_FILES potentially empty/minimal files to review"
  find . -name "*.ts" -o -name "*.js" | grep -v node_modules | xargs wc -l | awk '$1 <= 5 && $1 > 0 {print $2}'
else
  echo "✅ No minimal files found"
fi

# 8. Check keycode constants usage
echo "8. Checking keycode constants usage..."

# Check hardcoded keycodes
HARDCODED_KEYCODES=$(grep -r "keyCode.*[0-9]\|which.*[0-9]" . --include="*.ts" --include="*.js" | wc -l)
if [ $HARDCODED_KEYCODES -gt 0 ]; then
  echo "❌ Found $HARDCODED_KEYCODES hardcoded keycodes (should use constants from _keyCodes.ts)"
  grep -r "keyCode.*[0-9]\|which.*[0-9]" . --include="*.ts" --include="*.js"
else
  echo "✅ No hardcoded keycodes found"
fi

# 8.1. Check unsafe type assertions
echo "8.1. Checking unsafe type assertions..."

# Check type assertions
TYPE_ASSERTIONS=$(grep -r ") as HTMLElement\|) as HTMLVideoElement\|) as Element" . --include="*.ts" --include="*.js" | wc -l)
if [ $TYPE_ASSERTIONS -gt 0 ]; then
  echo "❌ Found $TYPE_ASSERTIONS unsafe type assertions (should use instanceof checks)"
  grep -r ") as HTMLElement\|) as HTMLVideoElement\|) as Element" . --include="*.ts" --include="*.js"
else
  echo "✅ No unsafe type assertions found"
fi

# Check force casting in DOM queries
DOM_FORCE_CASTING=$(grep -r "querySelector.*) as \|closest.*) as " . --include="*.ts" --include="*.js" | wc -l)
if [ $DOM_FORCE_CASTING -gt 0 ]; then
  echo "❌ Found $DOM_FORCE_CASTING force casting in DOM queries (should use proper null checks)"
  grep -r "querySelector.*) as \|closest.*) as " . --include="*.ts" --include="*.js"
else
  echo "✅ No force casting in DOM queries found"
fi

# 9. Advanced Security Check
echo "9. Checking security vulnerabilities..."

# Check XSS vulnerabilities
XSS_RISKS=$(grep -r "innerHTML\s*=" . --include="*.ts" --include="*.js" | wc -l)
if [ $XSS_RISKS -gt 0 ]; then
  echo "❌ Found $XSS_RISKS potential XSS risks (innerHTML usage)"
  grep -r "innerHTML\s*=" . --include="*.ts" --include="*.js"
else
  echo "✅ No innerHTML XSS risks found"
fi

# Check setAttribute style (CSP violations)
CSP_STYLE_RISKS=$(grep -r "setAttribute.*['\"]style['\"]" . --include="*.ts" --include="*.js" | wc -l)
if [ $CSP_STYLE_RISKS -gt 0 ]; then
  echo "❌ Found $CSP_STYLE_RISKS potential CSP violations (setAttribute style)"
  grep -r "setAttribute.*['\"]style['\"]" . --include="*.ts" --include="*.js"
else
  echo "✅ No setAttribute style violations found"
fi

# Check CSS selector injection vulnerabilities
CSS_SELECTOR_INJECTION=$(grep -r "querySelector.*\`.*\$\{\|querySelectorAll.*\`.*\$\{" . --include="*.ts" --include="*.js" | wc -l)
if [ $CSS_SELECTOR_INJECTION -gt 0 ]; then
  echo "❌ Found $CSS_SELECTOR_INJECTION potential CSS selector injection vulnerabilities"
  grep -r "querySelector.*\`.*\$\{\|querySelectorAll.*\`.*\$\{" . --include="*.ts" --include="*.js"
else
  echo "✅ No CSS selector injection vulnerabilities found"
fi

# Check inline style injections
INLINE_STYLE_INJECTIONS=$(grep -r "setAttribute.*style.*\${" . --include="*.ts" --include="*.js" | wc -l)
if [ $INLINE_STYLE_INJECTIONS -gt 0 ]; then
  echo "❌ Found $INLINE_STYLE_INJECTIONS potential inline style injections"
  grep -r "setAttribute.*style.*\${" . --include="*.ts" --include="*.js"
else
  echo "✅ No inline style injections found"
fi

# 10. Performance Issues Check
echo "10. Checking performance issues..."

# Check multiple DOM queries
DOM_QUERIES=$(grep -r "querySelectorAll.*\\..*querySelectorAll" . --include="*.ts" --include="*.js" | wc -l)
if [ $DOM_QUERIES -gt 0 ]; then
  echo "⚠️  Found $DOM_QUERIES potential inefficient DOM queries"
else
  echo "✅ No inefficient DOM queries found"
fi

# 11. Memory Management Check
echo "11. Checking memory management..."

# Check event listener cleanup (Skip for multi-page applications)
echo "ℹ️  Note: Event listener cleanup check skipped for multi-page applications"
echo "   Browser automatically destroys JS context on page navigation"
# ADD_LISTENERS=$(grep -r "addEventListener" . --include="*.ts" --include="*.js" | wc -l)
# REMOVE_LISTENERS=$(grep -r "removeEventListener" . --include="*.ts" --include="*.js" | wc -l)
# if [ $ADD_LISTENERS -gt $REMOVE_LISTENERS ]; then
#   echo "⚠️  Potential memory leaks: $ADD_LISTENERS addEventListener vs $REMOVE_LISTENERS removeEventListener"
# else
#   echo "✅ Event listeners appear balanced"
# fi

# 12. Architecture Check
echo "12. Checking architecture compliance..."

# Check file sizes (SRP violation)
LARGE_FILES=$(find . -name "*.ts" -exec wc -l {} \; | awk '$1 > 300 {print $2}' | wc -l)
if [ $LARGE_FILES -gt 0 ]; then
  echo "⚠️  Found $LARGE_FILES files longer than 300 lines (consider refactoring)"
else
  echo "✅ All files are reasonably sized"
fi

echo "=========================================="
echo "✅ Advanced verification completed"
```

---

### 📝 **6. MANUAL REVIEW CHECKLIST**

#### **Code Structure**
- [ ] ✅ Entry point (index.ts) exists and properly exports
- [ ] ✅ Type definitions are comprehensive and explicit
- [ ] ✅ Constants are properly defined and used
- [ ] ✅ Class access modifiers are appropriate (public/private/readonly)

#### **Naming Conventions**
- [ ] ✅ Folders follow naming rules (Components/Utilities: camelCase, Assets: kebab-case)
- [ ] ✅ React components use PascalCase (.tsx files)
- [ ] ✅ TypeScript classes use camelCase (.ts files)
- [ ] ✅ Utility functions use camelCase (.ts files)
- [ ] ✅ Type definitions use camelCase (.d.ts files)
- [ ] ✅ Constants use camelCase (.ts files)

#### **Code Quality**
- [ ] ❌ No unused functions or variables - **MUST specify file and line number**
- [ ] ❌ No empty functions (functions with no implementation) - **MUST specify file and line number**
- [ ] ❌ No unused classes - **MUST specify file and line number**
- [ ] ❌ No unused/empty files (minimal content files to review) - **MUST specify file path**
- [ ] ❌ No console.log statements in production code - **MUST specify file and line number**
- [ ] ❌ No hardcoded text strings (use constants) *(exclude test/mock files)* - **MUST specify file and line number**
- [ ] ❌ No hardcoded UI text (should use CMS/i18n system) *(exclude test/mock files)* - **MUST specify file and line number**
- [ ] ❌ No hardcoded accessibility text (aria-label, alt text) *(exclude test/mock files)* - **MUST specify file and line number**
- [ ] ✅ **CORRECT**: Fallback text with CMS/i18n priority is **ALWAYS ALLOWED** (e.g., `dataset.text || 'fallback'`)
- [ ] ✅ **EXCEPTION**: Hardcoded text in test files (*.test.ts) and mock files (*.mock.ts) is **ALWAYS ALLOWED**
- [ ] ✅ **EXCEPTION**: Hardcoded accessibility text in test files (*.test.ts) and mock files (*.mock.ts) is **ALWAYS ALLOWED**
- [ ] ❌ No Vietnamese comments - **MUST specify file and line number**
- [ ] ❌ No debugger statements - **MUST specify file and line number**
- [ ] ❌ No hardcoded keycodes (use constants from _keyCodes.ts) - **MUST specify file and line number**
- [ ] ✅ Proper error handling
- [ ] ✅ Consistent naming conventions
- [ ] ✅ Keycode constants imported and used correctly

#### **TypeScript Specific**
- [ ] ❌ No usage of 'any' type - **MUST specify file and line number**
- [ ] ❌ No unsafe type assertions (as HTMLElement without null checks) - **MUST specify file and line number**
- [ ] ❌ No force casting without type guards (element.closest() as HTMLElement) - **MUST specify file and line number**
- [ ] ✅ Use instanceof or proper null checks instead of 'as' casting
- [ ] ✅ Proper interface definitions
- [ ] ✅ Type guards for unknown data
- [ ] ✅ Readonly properties where appropriate
- [ ] ✅ Optional parameters properly typed

#### **Performance**
- [ ] ✅ Repeated text moved to constants
- [ ] ✅ Event listeners properly cleaned up
- [ ] ✅ Memory leaks prevented
- [ ] ❌ No multiple DOM queries for same elements - **MUST specify file and line number**
- [ ] ❌ No DOM queries inside loops - **MUST specify file and line number**
- [ ] ❌ No string concatenation in loops - **MUST specify file and line number**
- [ ] ✅ DocumentFragment used for bulk DOM operations

#### **Security**
- [ ] ❌ No innerHTML with user content (XSS risk) - **MUST specify file and line number**
- [ ] ❌ No outerHTML for content insertion - **MUST specify file and line number**
- [ ] ❌ No eval() or Function() constructor usage - **MUST specify file and line number**
- [ ] ❌ No javascript: URLs - **MUST specify file and line number**
- [ ] ❌ No setAttribute('style', ...) with user content (CSP violation) - **MUST specify file and line number**
- [ ] ❌ No inline style injections via template literals - **MUST specify file and line number**
- [ ] ❌ No direct style property assignments with template literals (XSS risk) - **MUST specify file and line number**
- [ ] ❌ No dynamic CSS values without type validation - **MUST specify file and line number**
- [ ] ❌ No CSS selector injection via template literals in querySelector methods - **MUST specify file and line number**
- [ ] ❌ No user-controlled data in CSS selectors - **MUST specify file and line number**
- [ ] ✅ User input properly sanitized
- [ ] ✅ Safe DOM methods used (textContent, createElement)
- [ ] ✅ CSS classes and custom properties used instead of inline styles
- [ ] ✅ Type validation before CSS value injection (Number.isFinite)
- [ ] ✅ Use setProperty() for dynamic CSS assignments

#### **Memory Management**
- [ ] ✅ All event listeners have cleanup *(Skip for multi-page applications - browser auto-cleanup on navigation)*
- [ ] ✅ Timers cleared properly (setInterval/setTimeout) - **MUST specify file and line number if violations found**
- [ ] ❌ No circular references between objects - **MUST specify file and line number**
- [ ] ✅ WeakMap/WeakSet used for object references where appropriate
- [ ] ✅ Proper cleanup/destroy methods implemented *(Skip for multi-page applications)*

#### **Error Handling**
- [ ] ✅ All promises have .catch() or try/catch
- [ ] ✅ Custom error classes with meaningful messages
- [ ] ✅ Async functions wrapped in try/catch
- [ ] ❌ No silent failures (empty catch blocks) - **MUST specify file and line number**
- [ ] ✅ Error logging and recovery strategies

#### **DOM Manipulation**
- [ ] ✅ DocumentFragment used for multiple insertions
- [ ] ✅ CSS classes used instead of direct style manipulation
- [ ] ❌ No forced reflows (offsetWidth/Height readings) - **MUST specify file and line number**
- [ ] ✅ Template elements used for complex HTML

#### **Architecture & Design**
- [ ] ✅ Single Responsibility Principle (files < 300 lines) - **MUST specify file path if violation**
- [ ] ✅ Separation of concerns (business logic vs DOM)
- [ ] ❌ No God objects (classes with > 20 methods) - **MUST specify file and line number**
- [ ] ✅ Proper abstractions and interfaces
- [ ] ✅ Loose coupling between modules

---

### 🚀 **7. QUICK VERIFICATION COMMANDS**

```bash
# Full verification in one command
./js-verification.sh

# Quick console check
grep -r "console\." . --include="*.ts" --include="*.js" | wc -l

# Quick hardcoded text check (exclude test/mock files)
grep -r "['\"]\w\{5,\}['\"]\s*[^)]" . --include="*.ts" --include="*.js" | grep -v console | grep -v "\.test\." | grep -v "\.mock\."

# Quick UI text hardcode check (CMS/i18n violations) (exclude test/mock files)
grep -r "['\"]\s*[A-Z][a-zA-Z ]{4,}['\"]\s*[^)]" . --include="*.ts" --include="*.js" | grep -v console | grep -v "\.test\." | grep -v "\.mock\."
echo "ℹ️  Note: Hardcoded text in test files (*.test.ts) and mock files (*.mock.ts) is ALLOWED"
echo "ℹ️  Note: Fallback text with CMS/i18n priority (e.g., dataset.text || 'fallback') is ALWAYS ALLOWED"

# Quick accessibility text check (exclude test/mock files)
grep -r "aria-label=\"[^\"]*\"\|alt=\"[^\"]*\"" . --include="*.ts" --include="*.js" | grep -v "\.test\." | grep -v "\.mock\."
echo "ℹ️  Note: Hardcoded text in test files (*.test.ts) and mock files (*.mock.ts) is ALLOWED"

# Quick Vietnamese comment check
grep -r "//.*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]" . --include="*.ts" --include="*.js"

# Check TypeScript errors
npx tsc --noEmit

# Run linting
npx eslint . --ext .ts,.js

# Quick naming convention checks
find . -name "*.tsx" ! -path "./node_modules/*" | grep -vE "/[A-Z][a-zA-Z]*\.tsx$"
find . -name "*.ts" ! -name "*.d.ts" ! -path "./node_modules/*" | grep -vE "/[a-z][a-zA-Z]*\.ts$"

# Quick empty functions check
grep -r "function.*{\s*}" . --include="*.ts" --include="*.js"
grep -r "=>\s*{\s*}" . --include="*.ts" --include="*.js"

# Quick keycode constants check
grep -r "keyCode.*[0-9]\|which.*[0-9]" . --include="*.ts" --include="*.js"

# Quick type assertion checks
grep -r ") as HTMLElement\|) as HTMLVideoElement\|) as Element" . --include="*.ts" --include="*.js"
grep -r "querySelector.*) as \|closest.*) as " . --include="*.ts" --include="*.js"

# Quick unused files check
find . -name "*.ts" -o -name "*.js" | grep -v node_modules | xargs wc -l | awk '$1 <= 5 && $1 > 0 {print $2}'

# Advanced security checks
grep -r "innerHTML\s*=" . --include="*.ts" --include="*.js"
grep -r "outerHTML" . --include="*.ts" --include="*.js"
grep -r "\beval\b" . --include="*.ts" --include="*.js"

# CSS selector injection checks
grep -r "querySelector.*\`.*\$\{" . --include="*.ts" --include="*.js"
grep -r "querySelectorAll.*\`.*\$\{" . --include="*.ts" --include="*.js"

# CSP violation checks
grep -r "setAttribute.*['\"]style['\"]" . --include="*.ts" --include="*.js"
grep -r "setAttribute.*style.*\${" . --include="*.ts" --include="*.js"

# CSS injection via template literals in style properties
grep -r "\.style\.[^=]*=.*\`.*\$\{" . --include="*.ts" --include="*.js"

# Performance checks
grep -r "querySelectorAll.*\\..*querySelectorAll" . --include="*.ts" --include="*.js"
grep -r "\.forEach.*querySelector" . --include="*.ts" --include="*.js"

# Memory management checks (Skip event listener checks for multi-page apps)
# grep -r "addEventListener" . --include="*.ts" --include="*.js" | wc -l
# grep -r "removeEventListener" . --include="*.ts" --include="*.js" | wc -l
grep -r "setInterval\|setTimeout" . --include="*.ts" --include="*.js"

# Architecture checks
wc -l **/*.ts | awk '$1 > 300 {print $2 " has " $1 " lines (too long)"}'
find . -name "*.ts" -exec grep -L "interface\|abstract" {} \;
```

---

### ⚡ **8. AUTOMATED FIXES**

```bash
# Remove console statements (be careful!)
sed -i '/console\./d' **/*.ts **/*.js

# Remove debugger statements
sed -i '/debugger/d' **/*.ts **/*.js

# Format code
npx prettier --write "**/*.{ts,js}"
```

---

## 🏗️ **9. ADVANCED CODE REVIEW VERIFICATION**

### **A. Security Verification**

```bash
# Find XSS vulnerabilities - innerHTML usage
grep -r "innerHTML\s*=" . --include="*.ts" --include="*.js"

# Find DOM XSS risks - outerHTML usage
grep -r "outerHTML" . --include="*.ts" --include="*.js"

# Find unsafe DOM insertions
grep -r "insertAdjacentHTML\|appendChild.*innerHTML" . --include="*.ts" --include="*.js"

# Find eval usage (code injection risk)
grep -r "\beval\b" . --include="*.ts" --include="*.js"

# Find dangerous URL patterns
grep -r "javascript:" . --include="*.ts" --include="*.js"

# Find setAttribute style (CSP violation risk)
grep -r "setAttribute.*['\"]style['\"]" . --include="*.ts" --include="*.js"

# Find inline style injections with template literals
grep -r "setAttribute.*style.*\${" . --include="*.ts" --include="*.js"

# Find style attribute assignments (CSP unsafe-inline)
grep -r "\.setAttribute.*style.*=" . --include="*.ts" --include="*.js"

# Find CSS selector injection vulnerabilities
grep -r "querySelector.*\`.*\$\{" . --include="*.ts" --include="*.js"
grep -r "querySelectorAll.*\`.*\$\{" . --include="*.ts" --include="*.js"
```

**Security Rules:**
- ❌ **VIOLATION**: Using `innerHTML` with user content (XSS risk) - **MUST specify file and line number**
- ❌ **VIOLATION**: Using `outerHTML` for content insertion - **MUST specify file and line number**
- ❌ **VIOLATION**: `eval()` or `Function()` constructor usage - **MUST specify file and line number**
- ❌ **VIOLATION**: `javascript:` URLs in href/src attributes - **MUST specify file and line number**
- ❌ **VIOLATION**: `setAttribute('style', ...)` with user content (CSP violation) - **MUST specify file and line number**
- ❌ **VIOLATION**: Inline style injection via template literals - **MUST specify file and line number**
- ❌ **VIOLATION**: Direct style property assignments with template literals (XSS risk) - **MUST specify file and line number**
- ❌ **VIOLATION**: Style attribute assignments without CSP compliance - **MUST specify file and line number**
- ❌ **VIOLATION**: Dynamic CSS values without type validation - **MUST specify file and line number**
- ❌ **VIOLATION**: CSS selector injection via template literals in querySelector methods - **MUST specify file and line number**
- ❌ **VIOLATION**: Using user-controlled data in CSS selectors (selector injection) - **MUST specify file and line number**
- ✅ **CORRECT**: Use `textContent`, `createElement`, `createTextNode`
- ✅ **CORRECT**: Sanitize user input before DOM insertion
- ✅ **CORRECT**: Use CSP headers and safe DOM methods
- ✅ **CORRECT**: Use CSS custom properties or classes instead of inline styles
- ✅ **CORRECT**: Type validation before CSS value injection (Number.isFinite)
- ✅ **CORRECT**: Use setProperty() for dynamic CSS assignments

**Examples:**
```typescript
// ❌ VIOLATION: CSP unsafe-inline violation
element.setAttribute('style', `background-image: url('${userUrl}')`);

// ❌ VIOLATION: Template literal injection risk
element.setAttribute('style', `color: ${userColor}; width: ${userWidth}px;`);

// ❌ VIOLATION: Direct style property with template literal (XSS risk)
element.style.transform = `translateY(${dynamicValue}px)`;

// ✅ CORRECT: Use CSS classes and custom properties
element.style.setProperty('--bg-image', `url('${validatedUrl}')`);
element.classList.add('background-image-container');

// ✅ CORRECT: Type validation before CSS injection
const safeValue = Number.isFinite(dynamicValue) ? Math.floor(dynamicValue) : 0;
element.style.setProperty('transform', `translateY(${safeValue}px)`);

// ✅ CORRECT: Use data attributes with CSS
element.dataset.bgImage = validatedUrl;
element.classList.add('lazy-bg-loaded');

// ❌ VIOLATION: CSS selector injection vulnerability
const userClass = getUserInput(); // Could be malicious
const elements = document.querySelectorAll(`${SELECTORS.CONTAINER}.${userClass}`);

// ❌ VIOLATION: Template literal selector with dynamic data
const dynamicSelector = `${SELECTORS.BASE}[data-id="${userId}"]`; // XSS if userId is malicious
document.querySelectorAll(dynamicSelector);

// ✅ CORRECT: Use static selectors with safe attribute access
const elements = document.querySelectorAll(SELECTORS.CONTAINER);
const filteredElements = Array.from(elements).filter(el => el.dataset.userId === sanitizedUserId);

// ✅ CORRECT: Use parameterized attribute selection
const elements = document.querySelectorAll(`${SELECTORS.CONTAINER}[data-id]`);
const targetElement = Array.from(elements).find(el => el.getAttribute('data-id') === sanitizedId);
```

### **B. Performance Verification**

```bash
# Find inefficient DOM queries (multiple querySelectorAll)
grep -rn "querySelectorAll.*\\..*querySelectorAll" . --include="*.ts" --include="*.js"

# Find DOM queries in loops (performance killer)
grep -r "\.forEach.*querySelector\|\.map.*querySelector" . --include="*.ts" --include="*.js"

# Find string concatenation in loops
grep -r "\.forEach.*+=" . --include="*.ts" --include="*.js"

# Find synchronous operations in async contexts
grep -r "\.forEach.*await\|\.map.*await" . --include="*.ts" --include="*.js"

# Find inefficient array operations
grep -r "\.push\.apply\|new Array.*length" . --include="*.ts" --include="*.js"
```

**Performance Rules:**
- ❌ **VIOLATION**: Multiple DOM queries for same elements - **MUST specify file and line number**
- ❌ **VIOLATION**: DOM queries inside loops or frequent operations - **MUST specify file and line number**
- ❌ **VIOLATION**: String concatenation in loops (use array.join()) - **MUST specify file and line number**
- ❌ **VIOLATION**: Blocking synchronous operations - **MUST specify file and line number**
- ❌ **VIOLATION**: Creating arrays with constructor + length - **MUST specify file and line number**
- ✅ **CORRECT**: Cache DOM query results
- ✅ **CORRECT**: Use DocumentFragment for bulk DOM operations
- ✅ **CORRECT**: Use async/await with Promise.all() for concurrent operations
- ✅ **CORRECT**: Use efficient array methods and spread operator

### **C. Memory Management Verification**

```bash
# Find potential memory leaks - event listeners without cleanup (Skip for multi-page apps)
# grep -r "addEventListener" . --include="*.ts" --include="*.js" | head -10
# grep -r "removeEventListener" . --include="*.ts" --include="*.js" | head -10

# Find closures that might retain references
grep -r "setInterval\|setTimeout" . --include="*.ts" --include="*.js"

# Find circular references
grep -r "\.parent.*=.*this\|\.child.*=.*this" . --include="*.ts" --include="*.js"

# Find large object creations without cleanup
grep -r "new.*Map\|new.*Set\|new.*WeakMap\|new.*WeakSet" . --include="*.ts" --include="*.js"
```

**Memory Management Rules:**

**⚠️ MULTI-PAGE APPLICATION EXCEPTION:**
For traditional multi-page applications (non-SPA), event listener cleanup is **NOT REQUIRED** as:
- Browser automatically destroys JS context on page navigation
- Components don't have re-render or dynamic lifecycle
- Memory leak concerns don't apply to this architecture

- ❌ **VIOLATION**: Event listeners added without corresponding cleanup *(Skip for multi-page apps)* - **MUST specify file and line number**
- ❌ **VIOLATION**: Timers (setInterval/setTimeout) without clearInterval/clearTimeout - **MUST specify file and line number**
- ❌ **VIOLATION**: Circular references between objects - **MUST specify file and line number**
- ❌ **VIOLATION**: Large Maps/Sets without proper cleanup *(Skip for multi-page apps)* - **MUST specify file and line number**
- ❌ **VIOLATION**: Closures retaining large objects unnecessarily *(Skip for multi-page apps)* - **MUST specify file and line number**
- ✅ **CORRECT**: Implement proper cleanup/destroy methods *(Skip for multi-page apps)*
- ✅ **CORRECT**: Use WeakMap/WeakSet for object references
- ✅ **CORRECT**: Clear timers in component destruction
- ✅ **CORRECT**: Break circular references explicitly

### **D. Error Handling Verification**

```bash
# Find missing error handling - naked promises
grep -r "\.then(" . --include="*.ts" --include="*.js" | grep -v "\.catch"

# Find throw statements without proper error types
grep -r "throw new Error\|throw " . --include="*.ts" --include="*.js"

# Find async functions without error boundaries
grep -r "async.*function\|async.*=>" . --include="*.ts" --include="*.js"

# Find unhandled promise rejections
grep -r "Promise\.reject\|reject(" . --include="*.ts" --include="*.js"
```

**Error Handling Rules:**
- ❌ **VIOLATION**: Promise chains without `.catch()` or try/catch - **MUST specify file and line number**
- ❌ **VIOLATION**: Generic `Error` objects without specific error types - **MUST specify file and line number**
- ❌ **VIOLATION**: Async functions without proper error boundaries - **MUST specify file and line number**
- ❌ **VIOLATION**: Silent failures (empty catch blocks) - **MUST specify file and line number**
- ✅ **CORRECT**: All promises have error handling
- ✅ **CORRECT**: Custom error classes with meaningful messages
- ✅ **CORRECT**: Async/await wrapped in try/catch blocks
- ✅ **CORRECT**: Error logging and recovery strategies

### **E. DOM Manipulation Best Practices**

```bash
# Find inefficient DOM operations
grep -r "appendChild.*appendChild\|insertBefore.*insertBefore" . --include="*.ts" --include="*.js"

# Find direct style manipulations (should use CSS classes)
grep -r "\.style\." . --include="*.ts" --include="*.js"

# Find CSS injection via template literals in style properties
grep -r "\.style\.[^=]*=.*\`.*\$\{" . --include="*.ts" --include="*.js"

# Find CSS selector injection via template literals in querySelector methods
grep -r "querySelector.*\`.*\$\{" . --include="*.ts" --include="*.js"

# Find CSS selector injection in querySelectorAll
grep -r "querySelectorAll.*\`.*\$\{" . --include="*.ts" --include="*.js"

# Find setAttribute style manipulations (CSP violation)
grep -r "setAttribute.*['\"]style['\"]" . --include="*.ts" --include="*.js"

# Find forced layout/reflow operations
grep -r "offsetWidth\|offsetHeight\|getComputedStyle" . --include="*.ts" --include="*.js"

# Find innerHTML in performance-critical code
grep -r "innerHTML.*=.*\+" . --include="*.ts" --include="*.js"
```

**DOM Manipulation Rules:**
- ❌ **VIOLATION**: Multiple individual DOM insertions (use DocumentFragment) - **MUST specify file and line number**
- ❌ **VIOLATION**: Direct style.property assignments (use CSS classes) - **MUST specify file and line number**
- ❌ **VIOLATION**: CSS injection via template literals in style properties - **MUST specify file and line number**
- ❌ **VIOLATION**: setAttribute('style', ...) assignments (CSP violation risk) - **MUST specify file and line number**
- ❌ **VIOLATION**: Reading layout properties that trigger reflow - **MUST specify file and line number**
- ❌ **VIOLATION**: String concatenation for HTML building - **MUST specify file and line number**
- ✅ **CORRECT**: Batch DOM operations using DocumentFragment
- ✅ **CORRECT**: Use CSS classes for styling changes
- ✅ **CORRECT**: Type validation before CSS value injection
- ✅ **CORRECT**: Use setProperty() for dynamic CSS values
- ✅ **CORRECT**: Minimize forced reflows/layouts
- ✅ **CORRECT**: Use template elements for complex HTML

### **F. Architecture & Design Patterns**

```bash
# Find violation of Single Responsibility Principle
wc -l **/*.ts | awk '$1 > 300 {print $2 " has " $1 " lines (too long)"}'

# Find tight coupling - direct DOM manipulation in business logic
grep -r "querySelector\|getElementById" . --include="*.ts" --include="*.js" | grep -v "component\|view\|dom"

# Find God objects/classes with too many methods
grep -r "class.*{" . --include="*.ts" -A 200 | grep -c "public\|private"

# Find missing interfaces/abstractions
find . -name "*.ts" -exec grep -L "interface\|abstract" {} \;
```

**Architecture Rules:**
- ❌ **VIOLATION**: Files longer than 300 lines (refactor into smaller modules) - **MUST specify file path**
- ❌ **VIOLATION**: Business logic mixed with DOM manipulation - **MUST specify file and line number**
- ❌ **VIOLATION**: Classes with > 20 methods (God object anti-pattern) - **MUST specify file and line number**
- ❌ **VIOLATION**: Tight coupling between modules - **MUST specify file and line number**
- ❌ **VIOLATION**: Missing abstractions/interfaces - **MUST specify file path**
- ✅ **CORRECT**: Single Responsibility Principle (SRP)
- ✅ **CORRECT**: Separation of concerns (business logic vs presentation)
- ✅ **CORRECT**: Dependency injection and interfaces
- ✅ **CORRECT**: Modular architecture with clear boundaries

---

## 📊 **10. COMPLIANCE SCORING**

**Score calculation:**
- ✅ **GREEN (90-100%)**: All rules followed, production ready
- 🟡 **YELLOW (70-89%)**: Minor violations, needs cleanup
- 🔴 **RED (<70%)**: Major violations, requires refactoring

**⚠️ IMPORTANT: All violations MUST include specific file and line number references for actionable feedback.**

**Weighted scoring:**
- Console statements: -10 points each
- Hardcoded text: -5 points each *(exclude test/mock files)*
- Hardcoded UI text (CMS/i18n violations): -15 points each *(exclude test/mock files)*
- Hardcoded accessibility text: -12 points each *(exclude test/mock files)*
- **EXCEPTION**: Hardcoded text in test files (*.test.ts) and mock files (*.mock.ts) = **0 points** (always allowed)
- **EXCEPTION**: Hardcoded accessibility text in test files (*.test.ts) and mock files (*.mock.ts) = **0 points** (always allowed)
- **EXCEPTION**: Fallback text with CMS/i18n priority = **0 points** (e.g., `dataset.text || 'fallback'`) - **ALWAYS ALLOWED**
- Vietnamese comments: -3 points each
- Unused code: -2 points each
- Empty functions: -5 points each
- Unused classes: -8 points each
- Unused/empty files: -3 points each
- Hardcoded keycodes: -7 points each
- Type safety violations: -15 points each
- Naming convention violations: -8 points each

**Advanced scoring:**
- XSS vulnerabilities (innerHTML): -20 points each (CRITICAL)
- CSS selector injection vulnerabilities: -18 points each (HIGH)
- CSS injection via template literals: -18 points each (HIGH)
- CSP violations (setAttribute style): -15 points each (HIGH)
- Inline style injections: -12 points each (HIGH)
- Dynamic CSS without validation: -10 points each (MEDIUM)
- Unsafe type assertions (as HTMLElement): -15 points each (HIGH)
- Force casting DOM queries without null checks: -15 points each (HIGH)
- Memory leaks (event listeners): -15 points each *(Skip for multi-page applications)*
- Performance issues (multiple DOM queries): -10 points each
- Missing error handling: -12 points each
- Architecture violations (God objects): -15 points each
- Unsafe DOM manipulation: -10 points each
- Security risks (eval, outerHTML): -25 points each (CRITICAL)
