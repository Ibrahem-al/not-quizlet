---
name: form-design
description: Creates accessible, user-friendly forms with validation, error handling, multi-step flows, and polished UX. Use whenever the user mentions forms, inputs, validation, sign-up, login, checkout, surveys, contact forms, or any data collection interface.
disable-model-invocation: false
user-invocable: true
---

# Form Design — Accessible & User-Friendly Forms

Build forms that are easy to use, accessible, and handle errors gracefully.

## Form Structure

```html
<form novalidate>
  <div class="form-group">
    <label for="email">Email address</label>
    <input type="email" id="email" name="email" required autocomplete="email"
           aria-describedby="email-help email-error">
    <p id="email-help" class="form-help">We'll never share your email.</p>
    <p id="email-error" class="form-error" role="alert" hidden></p>
  </div>
</form>
```

## Rules

1. **Every input MUST have a `<label>`** — Use `for` attribute. Never use placeholder as label.
2. **Use native validation types** — `type="email"`, `type="url"`, `type="tel"`, `inputmode="numeric"`
3. **Use `autocomplete`** — `name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number`, etc.
4. **Group related fields** — `<fieldset>` + `<legend>` for groups like address, payment
5. **Show errors inline** — Next to the input, not in an alert box
6. **Validate on blur, not on input** — Don't show errors while typing
7. **Use `novalidate`** on `<form>` — Handle validation in JS for custom UX
8. **Button text should describe the action** — "Create account", not "Submit"

## Validation Pattern

```javascript
function validateField(input) {
  const error = input.closest('.form-group').querySelector('.form-error');
  let message = '';

  if (input.validity.valueMissing) message = `${input.labels[0].textContent} is required`;
  else if (input.validity.typeMismatch) message = `Please enter a valid ${input.type}`;
  else if (input.validity.tooShort) message = `Must be at least ${input.minLength} characters`;

  if (message) {
    error.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  } else {
    error.hidden = true;
    input.removeAttribute('aria-invalid');
  }
  return !message;
}

// Validate on blur
document.querySelectorAll('input, select, textarea').forEach(input => {
  input.addEventListener('blur', () => validateField(input));
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid')) validateField(input);
  });
});
```

## Styling

```css
.form-group { margin-bottom: 1.5rem; }
.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.375rem;
  font-size: var(--text-sm);
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: var(--text-base);
  transition: border-color 150ms ease;
}
.form-group input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.15);
}
.form-group input[aria-invalid="true"] {
  border-color: var(--color-error);
}
.form-error {
  color: var(--color-error);
  font-size: var(--text-sm);
  margin-top: 0.375rem;
}
.form-help {
  color: var(--text-muted);
  font-size: var(--text-xs);
  margin-top: 0.25rem;
}
```

## Multi-Step Form Pattern

```html
<form>
  <div class="step" data-step="1"><!-- Step 1 fields --></div>
  <div class="step" data-step="2" hidden><!-- Step 2 fields --></div>
  <div class="step" data-step="3" hidden><!-- Step 3 fields --></div>

  <div class="form-nav">
    <button type="button" class="btn--secondary" onclick="prevStep()">Back</button>
    <button type="button" class="btn" onclick="nextStep()">Continue</button>
    <button type="submit" class="btn" hidden>Submit</button>
  </div>

  <div class="step-indicator" role="progressbar" aria-valuenow="1" aria-valuemin="1" aria-valuemax="3">
    Step 1 of 3
  </div>
</form>
```

## Skills & Tools Referenced

- **frontend-design** (Anthropic Official Skill)
- **accessibility** (this project — Skill 08)
- **component-library** (this project — Skill 07)
- **Constraint Validation API** (native browser API)
