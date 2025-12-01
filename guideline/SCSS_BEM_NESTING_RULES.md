# SCSS BEM Nesting Rules

## Overview
This document defines the coding standards for SCSS component structure using BEM (Block Element Modifier) methodology with Sass parent selector nesting.

## Rules

### 1. Use Sass Parent Selector (&) for BEM Elements and Modifiers

**✅ DO: Use nested BEM structure with `&`**
```scss
.component-name {
  // Block styles
  property: value;

  // Elements nested with &
  &__element {
    property: value;
  }

  &__another-element {
    property: value;

    // Sub-elements or pseudo-classes
    &:hover {
      property: value;
    }
  }

  // Modifiers nested with &
  &--modifier {
    property: value;
  }
}
```

**❌ DON'T: Use separate, unnested selectors**
```scss
.component-name {
  property: value;
}
.component-name__element {
  property: value;
}
.component-name__another-element {
  property: value;
}
```

### 2. Benefits of BEM Nesting

1. **Better Code Organization**: All related styles are grouped together under the parent block
2. **Easier Maintenance**: Finding and updating component styles is simpler
3. **Reduced Redundancy**: Parent selector name is written only once
4. **Clear Hierarchy**: Visual structure matches the component hierarchy
5. **Refactoring Safety**: Renaming the block class only requires one change

### 3. Nesting Structure Guidelines

```scss
.block {
  // 1. Block-level properties first
  display: flex;
  padding: 1rem;

  // 2. Pseudo-classes for the block
  &:hover {
    background-color: gray;
  }

  // 3. State classes
  &.is-active {
    color: blue;
  }

  // 4. Context selectors (when block appears in specific context)
  &:has(~ .header-fixed) {
    position: fixed;
  }

  // 5. Child element selectors (non-BEM, like AEM components)
  .cmp-text {
    margin: 0;
  }

  // 6. BEM elements
  &__element {
    property: value;

    // Element modifiers
    &--modifier {
      property: value;
    }

    // Element pseudo-classes
    &:hover {
      property: value;
    }
  }

  // 7. BEM modifiers for the block
  &--modifier {
    property: value;
  }
}
```

### 4. Real-World Example

**Before (Non-nested):**
```scss
.text-error-message {
  padding: 1rem 0;
  background-color: red;
}
.text-error-message__wrapper {
  position: relative;
}
.text-error-message__content {
  padding-right: 2rem;
}
.text-error-message__close {
  position: absolute;
  right: 0;
}
```

**After (Nested BEM):**
```scss
.text-error-message {
  padding: 1rem 0;
  background-color: red;

  &__wrapper {
    position: relative;
  }

  &__content {
    padding-right: 2rem;
  }

  &__close {
    position: absolute;
    right: 0;
  }
}
```

### 5. When NOT to Use Parent Selector

- **Child component selectors**: When targeting AEM components or other independent components
  ```scss
  .block {
    // ✅ DO: Use descendant selector for child components
    .cmp-text {
      margin: 0;
    }

    // ❌ DON'T: This would create .block.cmp-text
    &.cmp-text {
      margin: 0;
    }
  }
  ```

- **Combining with other blocks**: When the element needs to work with other blocks
  ```scss
  // ✅ DO: Separate selector for multi-class scenario
  .block.is-active {
    color: blue;
  }

  // But for simple state, nesting is preferred:
  .block {
    &.is-active {
      color: blue;
    }
  }
  ```

### 6. Migration Checklist

When refactoring existing SCSS to use BEM nesting:

- [ ] Identify the main block selector
- [ ] Find all related `block__element` selectors
- [ ] Move element selectors inside the block using `&__element`
- [ ] Find all related `block--modifier` selectors
- [ ] Move modifier selectors inside the block using `&--modifier`
- [ ] Maintain the same nesting level for similar elements
- [ ] Test that compiled CSS output is identical (use `sass --watch` to verify)
- [ ] Remove any duplicate selectors

## Additional Resources

- [BEM Methodology](https://en.bem.info/methodology/)
- [Sass Parent Selector Documentation](https://sass-lang.com/documentation/style-rules/parent-selector)

## Enforcement

All new SCSS component files MUST follow these BEM nesting rules. Code reviews should verify compliance with these standards.

