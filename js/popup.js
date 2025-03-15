document.addEventListener('DOMContentLoaded', async function() {
  const generateEmailBtn = document.getElementById('generateEmail');
  const fillFormBtn = document.getElementById('fillForm');
  const emailDisplay = document.getElementById('email-display');
  const copyEmailBtn = document.getElementById('copyEmail');
  const settingsIcon = document.getElementById('settingsIcon');
  const nextMessageBtn = document.getElementById('nextMessage');
  const prevMessageBtn = document.getElementById('prevMessage');
  let currentEmail = '';
  let currentPassword = '';
  let currentToken = '';
  let refreshInterval;
  let currentMessageIndex = 0;
  let allMessages = [];

  // Copy email functionality
  copyEmailBtn.addEventListener('click', async () => {
    if (currentEmail) {
      try {
        await navigator.clipboard.writeText(currentEmail);
        // Visual feedback
        copyEmailBtn.style.color = '#10B981';
        setTimeout(() => {
          copyEmailBtn.style.color = 'currentColor';
        }, 1000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  });

  // Open settings page
  settingsIcon.addEventListener('click', () => {
    chrome.tabs.create({ url: 'pages/settings.html' });
  });

  // Load saved email when popup opens
  try {
    const result = await chrome.storage.local.get(['savedEmail', 'savedPassword', 'savedToken']);
    if (result.savedEmail) {
      currentEmail = result.savedEmail;
      currentPassword = result.savedPassword;
      currentToken = result.savedToken;
      emailDisplay.textContent = currentEmail;
      if (currentToken) {
        checkMessages(currentToken);
        // Start auto-refresh when popup opens
        startAutoRefresh(currentToken);
      }
    }
  } catch (error) {
    console.error('Error loading saved email:', error);
  }

  // Function to start auto-refresh
  function startAutoRefresh(token) {
    // Clear any existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    // Set new interval for 5 seconds
    refreshInterval = setInterval(() => {
      checkMessages(token);
    }, 5000);
  }

  // Stop refresh when popup closes
  window.addEventListener('unload', () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  generateEmailBtn.addEventListener('click', async () => {
    try {
      emailDisplay.textContent = 'Generating email...';
      const response = await fetch('https://api.mail.tm/domains');
      const domains = await response.json();
      
      if (!domains || !domains['hydra:member'] || domains['hydra:member'].length === 0) {
        throw new Error('No domains available');
      }

      const domain = domains['hydra:member'][0].domain;
      const username = Math.random().toString(36).substring(2, 12);
      const password = Math.random().toString(36).substring(2, 12);
      const email = `${username}@${domain}`;

      // Create account
      const accountResponse = await fetch('https://api.mail.tm/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: email,
          password: password
        })
      });

      if (!accountResponse.ok) {
        throw new Error('Failed to create account');
      }

      // Get token
      const tokenResponse = await fetch('https://api.mail.tm/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: email,
          password: password
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get token');
      }

      const tokenData = await tokenResponse.json();
      currentEmail = email;
      currentPassword = password;
      currentToken = tokenData.token;
      emailDisplay.textContent = email;
      
      // Save email and credentials to storage
      await chrome.storage.local.set({ 
        savedEmail: email,
        savedPassword: password,
        savedToken: tokenData.token
      });

      // Start checking messages
      checkMessages(tokenData.token);
      // Start auto-refresh with new token
      startAutoRefresh(tokenData.token);
    } catch (error) {
      emailDisplay.textContent = 'Error: Could not generate email';
      console.error('Error:', error);
    }
  });

  // Auto fill form button click handler
  fillFormBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Get settings including email
      const settings = await chrome.storage.local.get(['formSettings']);
      const savedEmail = settings.formSettings?.email || currentEmail;

      const data = {
        email: savedEmail,
        firstName: settings.formSettings?.firstName || getRandomName(),
        lastName: settings.formSettings?.lastName || getRandomName(),
        username: getRandomUsername(),
        password: generatePassword(),
        phone: settings.formSettings?.phoneNumber || getRandomPhone(),
        company: getRandomCompany(),
        country: getRandomCountry(),
        postalCode: settings.formSettings?.zipCode || getRandomPostalCode()
      };

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data) => {
          // Function to randomly select an option from a select element
          const fillSelectElement = (select) => {
            // Get all valid options (skip first if it's a placeholder)
            const options = Array.from(select.options);
            const validOptions = options.length > 1 ? options.slice(1) : options;
            
            if (validOptions.length > 0) {
              // Select random option
              const randomIndex = Math.floor(Math.random() * validOptions.length);
              select.selectedIndex = options.length > 1 ? randomIndex + 1 : randomIndex;
              
              // Trigger events
              select.dispatchEvent(new Event('change', { bubbles: true }));
              select.dispatchEvent(new Event('input', { bubbles: true }));
            }
          };

          const selectors = {
            email: [
              'input[type="email"]',
              'input[name*="email"]',
              'input[placeholder*="email" i]',
              'input[placeholder*="@" i]',
              'input[placeholder*="Email address" i]',
              'input[placeholder*="Your Email" i]',
              'input[aria-label*="email" i]'
            ],
            firstName: [
              'input[name*="first"]',
              'input[name*="fname"]',
              'input[name*="user[name]"]',
              'input[name*="name"]',
              'input[placeholder*="first name" i]',
              'input[placeholder*="enter your name" i]',
              'input[placeholder*="Enter your name" i]',
              'input[placeholder*="your name" i]',
              'input[placeholder*="name" i]',
              'input[aria-label*="first name" i]',
              'input[aria-label*="First Name" i]',
              'input[aria-label*="your name" i]'
            ],
            lastName: [
              'input[name*="last"]',
              'input[name*="lname"]',
              'input[placeholder*="last name" i]',
              'input[placeholder*="surname" i]',
              'input[aria-label*="last name" i]',
              'input[aria-label*="surname" i]'
            ],
            username: [
              'input[name="username"]',
              'input[name="user[username]"]',
              'input[name*="username"]',
              'input[name="user_name"]',
              'input[name="userName"]',
              'input[id*="username" i]',
              'input[placeholder*="username" i]',
              'input[placeholder*="user name" i]',
              'input[aria-label*="username" i]',
              'input[data-testid*="username" i]'
            ],
            password: [
              'input[type="password"]'
            ],
            country: [
              'input[name*="country"]',
              'select[name*="country"]',
              'input[placeholder*="country" i]',
              'select[placeholder*="country" i]',
              'input[aria-label*="country" i]',
              'select[aria-label*="country" i]'
            ],
            phone: [
              'input[type="tel"]',
              'input[name*="phone"]',
              'input[name*="mobile"]',
              'input[placeholder*="phone" i]',
              'input[placeholder*="mobile" i]',
              'input[placeholder*="telephone" i]',
              'input[placeholder*="contact number" i]',
              'input[placeholder*="cell" i]',
              'input[aria-label*="phone" i]',
              'input[aria-label*="mobile" i]',
              'input[aria-label*="telephone" i]'
            ],
            company: [
              'input[name*="company"]',
              'input[name*="organization"]',
              'input[name*="business"]',
              'input[name*="employer"]',
              'input[placeholder*="company" i]',
              'input[placeholder*="organization" i]',
              'input[placeholder*="business" i]',
              'input[placeholder*="employer" i]',
              'input[placeholder*="firm" i]',
              'input[aria-label*="company" i]',
              'input[aria-label*="organization" i]',
              'input[aria-label*="business" i]',
              'input[aria-label*="employer" i]'
            ],
            postalCode: [
              'input[name*="zip"]',
              'input[name*="postal"]',
              'input[name*="postcode"]',
              'input[id*="zip"]',
              'input[id*="postal"]',
              'input[id*="postcode"]',
              'input[placeholder*="zip" i]',
              'input[placeholder*="postal" i]',
              'input[placeholder*="post code" i]',
              'input[aria-label*="zip" i]',
              'input[aria-label*="postal" i]',
              'input[aria-label*="post code" i]',
              'input[autocomplete="postal-code"]'
            ]
          };

          // Helper function to find first matching element from selector array
          const findElement = (selectorArray, field) => {
            // First try direct selectors
            for (const selector of selectorArray) {
              const elements = document.querySelectorAll(selector);
              for (const element of elements) {
                // Skip hidden elements
                if (element.offsetParent === null) continue;
                // For password fields, don't skip confirm/verify fields
                if (element.type === 'password') {
                  return element;
                }
                // For other fields, skip elements with "confirm" or "verify"
                const attributes = element.getAttributeNames();
                const hasConfirmOrVerify = attributes.some(attr => {
                  const value = element.getAttribute(attr).toLowerCase();
                  return value.includes('confirm') || value.includes('verify');
                });
                if (!hasConfirmOrVerify) {
                  return element;
                }
              }
            }

            // If no element found and field is not email or password, try finding by label
            if (field !== 'email' && field !== 'password') {
              // Get all input elements
              const inputs = document.querySelectorAll('input:not([type="email"]):not([type="password"])');
              
              for (const input of inputs) {
                if (input.offsetParent === null) continue; // Skip hidden elements

                // Check for label with 'for' attribute
                const labelFor = document.querySelector(`label[for="${input.id}"]`);
                if (labelFor) {
                  const labelText = labelFor.textContent.toLowerCase();
                  if (field === 'firstName' && (
                      labelText.includes('first name') || 
                      labelText.includes('your name') ||
                      labelText === 'name' ||
                      labelText.includes('enter name')
                    )) {
                    return input;
                  }
                  if (field === 'lastName' && (
                      labelText.includes('last name') || 
                      labelText.includes('surname')
                    )) {
                    return input;
                  }
                  if (field === 'username' && (
                      labelText.includes('username') || 
                      labelText.includes('user name')
                    )) {
                    return input;
                  }
                  if (field === 'country' && labelText.includes('country')) {
                    return input;
                  }
                  if (field === 'phone' && (
                      labelText.includes('phone') || 
                      labelText.includes('mobile') ||
                      labelText.includes('telephone') ||
                      labelText.includes('contact number') ||
                      labelText.includes('cell')
                    )) {
                    return input;
                  }
                  if (field === 'company' && (
                      labelText.includes('company') || 
                      labelText.includes('organization') ||
                      labelText.includes('business') ||
                      labelText.includes('employer') ||
                      labelText.includes('firm')
                    )) {
                    return input;
                  }
                  if (field === 'postalCode' && (
                      labelText.includes('zip') || 
                      labelText.includes('postal') ||
                      labelText.includes('post code')
                    )) {
                    return input;
                  }
                }

                // Check for wrapping label
                const parentLabel = input.closest('label');
                if (parentLabel) {
                  const labelText = parentLabel.textContent.toLowerCase();
                  if (field === 'firstName' && (
                      labelText.includes('first name') || 
                      labelText.includes('your name') ||
                      labelText === 'name' ||
                      labelText.includes('enter name')
                    )) {
                    return input;
                  }
                  if (field === 'lastName' && (
                      labelText.includes('last name') || 
                      labelText.includes('surname')
                    )) {
                    return input;
                  }
                  if (field === 'username' && (
                      labelText.includes('username') || 
                      labelText.includes('user name')
                    )) {
                    return input;
                  }
                  if (field === 'country' && labelText.includes('country')) {
                    return input;
                  }
                  if (field === 'phone' && (
                      labelText.includes('phone') || 
                      labelText.includes('mobile') ||
                      labelText.includes('telephone') ||
                      labelText.includes('contact number') ||
                      labelText.includes('cell')
                    )) {
                    return input;
                  }
                  if (field === 'company' && (
                      labelText.includes('company') || 
                      labelText.includes('organization') ||
                      labelText.includes('business') ||
                      labelText.includes('employer') ||
                      labelText.includes('firm')
                    )) {
                    return input;
                  }
                  if (field === 'postalCode' && (
                      labelText.includes('zip') || 
                      labelText.includes('postal') ||
                      labelText.includes('post code')
                    )) {
                    return input;
                  }
                }

                // Check for aria-labelledby
                if (input.getAttribute('aria-labelledby')) {
                  const labelId = input.getAttribute('aria-labelledby');
                  const ariaLabel = document.getElementById(labelId);
                  if (ariaLabel) {
                    const labelText = ariaLabel.textContent.toLowerCase();
                    if (field === 'firstName' && (
                        labelText.includes('first name') || 
                        labelText.includes('your name') ||
                        labelText === 'name' ||
                        labelText.includes('enter name')
                      )) {
                      return input;
                    }
                    if (field === 'lastName' && (
                        labelText.includes('last name') || 
                        labelText.includes('surname')
                      )) {
                      return input;
                    }
                    if (field === 'username' && (
                        labelText.includes('username') || 
                        labelText.includes('user name')
                      )) {
                      return input;
                    }
                    if (field === 'country' && labelText.includes('country')) {
                      return input;
                    }
                    if (field === 'phone' && (
                        labelText.includes('phone') || 
                        labelText.includes('mobile') ||
                        labelText.includes('telephone') ||
                        labelText.includes('contact number') ||
                        labelText.includes('cell')
                      )) {
                      return input;
                    }
                    if (field === 'company' && (
                        labelText.includes('company') || 
                        labelText.includes('organization') ||
                        labelText.includes('business') ||
                        labelText.includes('employer') ||
                        labelText.includes('firm')
                      )) {
                      return input;
                    }
                    if (field === 'postalCode' && (
                        labelText.includes('zip') || 
                        labelText.includes('postal') ||
                        labelText.includes('post code')
                      )) {
                      return input;
                    }
                  }
                }
              }
            }

            return null;
          };

          // Helper function to check if a field already has a value
          const hasValue = (element) => {
            if (!element) return false;
            const value = element.value.trim();
            return value !== '' && 
                   value !== 'null' && 
                   value !== 'undefined' && 
                   value !== 'select' &&
                   !value.includes('choose') &&
                   !value.includes('select');
          };

          // First find and fill all email fields
          const emailSelectors = [
            'input[type="email"]',
            'input[name*="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="@" i]',
            'input[placeholder*="Email address" i]',
            'input[placeholder*="Your Email" i]',
            'input[aria-label*="email" i]'
          ];

          // Find all potential email fields
          emailSelectors.forEach(selector => {
            const emailFields = document.querySelectorAll(selector);
            emailFields.forEach(field => {
              // Skip if field is hidden or already has a value
              if (field.offsetParent === null || hasValue(field)) return;
              
              field.value = data.email;
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              field.dispatchEvent(new Event('blur', { bubbles: true }));
            });
          });

          // Small delay before filling other fields
          setTimeout(() => {
            // Then fill all other fields
            for (const [field, value] of Object.entries(data)) {
              if (field === 'email') continue; // Skip email as it's already handled
              
              const element = findElement(selectors[field], field);
              // Skip if element not found or already has a value
              if (!element || hasValue(element)) continue;

              // Handle select elements
              if (element.tagName.toLowerCase() === 'select') {
                fillSelectElement(element);
              } else {
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('blur', { bubbles: true }));
              }
            }

            // Handle all select elements that don't have values
            const allSelectElements = document.querySelectorAll('select');
            allSelectElements.forEach(select => {
              if (!hasValue(select)) {
                fillSelectElement(select);
              }
            });

            // Handle all unchecked checkboxes
            const findCheckboxes = () => {
              const checkboxes = document.querySelectorAll('input[type="checkbox"]');
              
              checkboxes.forEach(checkbox => {
                // Skip if already checked
                if (checkbox.checked) return;
                
                // Check the checkbox
                checkbox.checked = true;
                
                // Trigger events
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                checkbox.dispatchEvent(new Event('click', { bubbles: true }));
              });
            };

            // Execute checkbox checking
            findCheckboxes();
          }, 100); // 100ms delay

          // Find all password fields and fill them
          const allPasswordFields = document.querySelectorAll('input[type="password"]');
          allPasswordFields.forEach(element => {
            element.value = data.password;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
          });

          // Find and handle all select elements on the page
          const allSelectElements = document.querySelectorAll('select');
          allSelectElements.forEach(fillSelectElement);

          // Find and check all checkboxes
          findCheckboxes();
        },
        args: [data]
      });
    } catch (error) {
      console.error('Error filling form:', error);
    }
  });

  // Add keyboard shortcut listener
  document.addEventListener('keydown', async (e) => {
    // Get custom shortcut from storage
    const settings = await chrome.storage.local.get(['shortcutKey']);
    const shortcut = settings.shortcutKey || { ctrl: true, shift: true, key: 'ArrowDown' };

    // Check if pressed keys match the shortcut
    if (
      (shortcut.ctrl === e.ctrlKey) &&
      (shortcut.shift === e.shiftKey) &&
      (shortcut.alt === e.altKey) &&
      (e.key === shortcut.key)
    ) {
      e.preventDefault(); // Prevent default browser behavior
      // Trigger the fill form functionality
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Get settings including email
      const settings = await chrome.storage.local.get(['formSettings']);
      const savedEmail = settings.formSettings?.email || currentEmail;

      const data = {
        email: savedEmail,
        firstName: settings.formSettings?.firstName || getRandomName(),
        lastName: settings.formSettings?.lastName || getRandomName(),
        username: getRandomUsername(),
        password: generatePassword(),
        phone: settings.formSettings?.phoneNumber || getRandomPhone(),
        company: getRandomCompany(),
        country: getRandomCountry(),
        postalCode: settings.formSettings?.zipCode || getRandomPostalCode()
      };

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data) => {
          // Function to randomly select an option from a select element
          const fillSelectElement = (select) => {
            const options = Array.from(select.options);
            const validOptions = options.length > 1 ? options.slice(1) : options;
            
            if (validOptions.length > 0) {
              const randomIndex = Math.floor(Math.random() * validOptions.length);
              select.selectedIndex = options.length > 1 ? randomIndex + 1 : randomIndex;
              
              select.dispatchEvent(new Event('change', { bubbles: true }));
              select.dispatchEvent(new Event('input', { bubbles: true }));
            }
          };

          const selectors = {
            email: [
              'input[type="email"]',
              'input[name*="email"]',
              'input[placeholder*="email" i]',
              'input[placeholder*="@" i]',
              'input[placeholder*="Email address" i]',
              'input[placeholder*="Your Email" i]',
              'input[aria-label*="email" i]'
            ],
            firstName: [
              'input[name*="first"]',
              'input[name*="fname"]',
              'input[name*="user[name]"]',
              'input[name*="name"]',
              'input[placeholder*="first name" i]',
              'input[placeholder*="enter your name" i]',
              'input[placeholder*="Enter your name" i]',
              'input[placeholder*="your name" i]',
              'input[placeholder*="name" i]',
              'input[aria-label*="first name" i]',
              'input[aria-label*="First Name" i]',
              'input[aria-label*="your name" i]'
            ],
            lastName: [
              'input[name*="last"]',
              'input[name*="lname"]',
              'input[placeholder*="last name" i]',
              'input[placeholder*="surname" i]',
              'input[aria-label*="last name" i]',
              'input[aria-label*="surname" i]'
            ],
            username: [
              'input[name="username"]',
              'input[name="user[username]"]',
              'input[name*="username"]',
              'input[name="user_name"]',
              'input[name="userName"]',
              'input[id*="username" i]',
              'input[placeholder*="username" i]',
              'input[placeholder*="user name" i]',
              'input[aria-label*="username" i]',
              'input[data-testid*="username" i]'
            ],
            password: [
              'input[type="password"]'
            ],
            country: [
              'input[name*="country"]',
              'select[name*="country"]',
              'input[placeholder*="country" i]',
              'select[placeholder*="country" i]',
              'input[aria-label*="country" i]',
              'select[aria-label*="country" i]'
            ],
            phone: [
              'input[type="tel"]',
              'input[name*="phone"]',
              'input[name*="mobile"]',
              'input[placeholder*="phone" i]',
              'input[placeholder*="mobile" i]',
              'input[placeholder*="telephone" i]',
              'input[placeholder*="contact number" i]',
              'input[placeholder*="cell" i]',
              'input[aria-label*="phone" i]',
              'input[aria-label*="mobile" i]',
              'input[aria-label*="telephone" i]'
            ],
            company: [
              'input[name*="company"]',
              'input[name*="organization"]',
              'input[name*="business"]',
              'input[name*="employer"]',
              'input[placeholder*="company" i]',
              'input[placeholder*="organization" i]',
              'input[placeholder*="business" i]',
              'input[placeholder*="employer" i]',
              'input[placeholder*="firm" i]',
              'input[aria-label*="company" i]',
              'input[aria-label*="organization" i]',
              'input[aria-label*="business" i]',
              'input[aria-label*="employer" i]'
            ],
            postalCode: [
              'input[name*="zip"]',
              'input[name*="postal"]',
              'input[name*="postcode"]',
              'input[id*="zip"]',
              'input[id*="postal"]',
              'input[id*="postcode"]',
              'input[placeholder*="zip" i]',
              'input[placeholder*="postal" i]',
              'input[placeholder*="post code" i]',
              'input[aria-label*="zip" i]',
              'input[aria-label*="postal" i]',
              'input[aria-label*="post code" i]',
              'input[autocomplete="postal-code"]'
            ]
          };

          // Helper function to find first matching element from selector array
          const findElement = (selectorArray, field) => {
            // First try direct selectors
            for (const selector of selectorArray) {
              const elements = document.querySelectorAll(selector);
              for (const element of elements) {
                // Skip hidden elements
                if (element.offsetParent === null) continue;
                // For password fields, don't skip confirm/verify fields
                if (element.type === 'password') {
                  return element;
                }
                // For other fields, skip elements with "confirm" or "verify"
                const attributes = element.getAttributeNames();
                const hasConfirmOrVerify = attributes.some(attr => {
                  const value = element.getAttribute(attr).toLowerCase();
                  return value.includes('confirm') || value.includes('verify');
                });
                if (!hasConfirmOrVerify) {
                  return element;
                }
              }
            }

            // If no element found and field is not email or password, try finding by label
            if (field !== 'email' && field !== 'password') {
              // Get all input elements
              const inputs = document.querySelectorAll('input:not([type="email"]):not([type="password"])');
              
              for (const input of inputs) {
                if (input.offsetParent === null) continue; // Skip hidden elements

                // Check for label with 'for' attribute
                const labelFor = document.querySelector(`label[for="${input.id}"]`);
                if (labelFor) {
                  const labelText = labelFor.textContent.toLowerCase();
                  if (field === 'firstName' && (
                      labelText.includes('first name') || 
                      labelText.includes('your name') ||
                      labelText === 'name' ||
                      labelText.includes('enter name')
                    )) {
                    return input;
                  }
                  if (field === 'lastName' && (
                      labelText.includes('last name') || 
                      labelText.includes('surname')
                    )) {
                    return input;
                  }
                  if (field === 'username' && (
                      labelText.includes('username') || 
                      labelText.includes('user name')
                    )) {
                    return input;
                  }
                  if (field === 'country' && labelText.includes('country')) {
                    return input;
                  }
                  if (field === 'phone' && (
                      labelText.includes('phone') || 
                      labelText.includes('mobile') ||
                      labelText.includes('telephone') ||
                      labelText.includes('contact number') ||
                      labelText.includes('cell')
                    )) {
                    return input;
                  }
                  if (field === 'company' && (
                      labelText.includes('company') || 
                      labelText.includes('organization') ||
                      labelText.includes('business') ||
                      labelText.includes('employer') ||
                      labelText.includes('firm')
                    )) {
                    return input;
                  }
                  if (field === 'postalCode' && (
                      labelText.includes('zip') || 
                      labelText.includes('postal') ||
                      labelText.includes('post code')
                    )) {
                    return input;
                  }
                }

                // Check for wrapping label
                const parentLabel = input.closest('label');
                if (parentLabel) {
                  const labelText = parentLabel.textContent.toLowerCase();
                  if (field === 'firstName' && (
                      labelText.includes('first name') || 
                      labelText.includes('your name') ||
                      labelText === 'name' ||
                      labelText.includes('enter name')
                    )) {
                    return input;
                  }
                  if (field === 'lastName' && (
                      labelText.includes('last name') || 
                      labelText.includes('surname')
                    )) {
                    return input;
                  }
                  if (field === 'username' && (
                      labelText.includes('username') || 
                      labelText.includes('user name')
                    )) {
                    return input;
                  }
                  if (field === 'country' && labelText.includes('country')) {
                    return input;
                  }
                  if (field === 'phone' && (
                      labelText.includes('phone') || 
                      labelText.includes('mobile') ||
                      labelText.includes('telephone') ||
                      labelText.includes('contact number') ||
                      labelText.includes('cell')
                    )) {
                    return input;
                  }
                  if (field === 'company' && (
                      labelText.includes('company') || 
                      labelText.includes('organization') ||
                      labelText.includes('business') ||
                      labelText.includes('employer') ||
                      labelText.includes('firm')
                    )) {
                    return input;
                  }
                  if (field === 'postalCode' && (
                      labelText.includes('zip') || 
                      labelText.includes('postal') ||
                      labelText.includes('post code')
                    )) {
                    return input;
                  }
                }

                // Check for aria-labelledby
                if (input.getAttribute('aria-labelledby')) {
                  const labelId = input.getAttribute('aria-labelledby');
                  const ariaLabel = document.getElementById(labelId);
                  if (ariaLabel) {
                    const labelText = ariaLabel.textContent.toLowerCase();
                    if (field === 'firstName' && (
                        labelText.includes('first name') || 
                        labelText.includes('your name') ||
                        labelText === 'name' ||
                        labelText.includes('enter name')
                      )) {
                      return input;
                    }
                    if (field === 'lastName' && (
                        labelText.includes('last name') || 
                        labelText.includes('surname')
                      )) {
                      return input;
                    }
                    if (field === 'username' && (
                        labelText.includes('username') || 
                        labelText.includes('user name')
                      )) {
                      return input;
                    }
                    if (field === 'country' && labelText.includes('country')) {
                      return input;
                    }
                    if (field === 'phone' && (
                        labelText.includes('phone') || 
                        labelText.includes('mobile') ||
                        labelText.includes('telephone') ||
                        labelText.includes('contact number') ||
                        labelText.includes('cell')
                      )) {
                      return input;
                    }
                    if (field === 'company' && (
                        labelText.includes('company') || 
                        labelText.includes('organization') ||
                        labelText.includes('business') ||
                        labelText.includes('employer') ||
                        labelText.includes('firm')
                      )) {
                      return input;
                    }
                    if (field === 'postalCode' && (
                        labelText.includes('zip') || 
                        labelText.includes('postal') ||
                        labelText.includes('post code')
                      )) {
                      return input;
                    }
                  }
                }
              }
            }

            return null;
          };

          // Helper function to check if a field already has a value
          const hasValue = (element) => {
            if (!element) return false;
            const value = element.value.trim();
            return value !== '' && 
                   value !== 'null' && 
                   value !== 'undefined' && 
                   value !== 'select' &&
                   !value.includes('choose') &&
                   !value.includes('select');
          };

          // First find and fill all email fields
          const emailSelectors = [
            'input[type="email"]',
            'input[name*="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="@" i]',
            'input[placeholder*="Email address" i]',
            'input[placeholder*="Your Email" i]',
            'input[aria-label*="email" i]'
          ];

          // Find all potential email fields
          emailSelectors.forEach(selector => {
            const emailFields = document.querySelectorAll(selector);
            emailFields.forEach(field => {
              // Skip if field is hidden or already has a value
              if (field.offsetParent === null || hasValue(field)) return;
              
              field.value = data.email;
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              field.dispatchEvent(new Event('blur', { bubbles: true }));
            });
          });

          // Small delay before filling other fields
          setTimeout(() => {
            // Then fill all other fields
            for (const [field, value] of Object.entries(data)) {
              if (field === 'email') continue; // Skip email as it's already handled
              
              const element = findElement(selectors[field], field);
              // Skip if element not found or already has a value
              if (!element || hasValue(element)) continue;

              // Handle select elements
              if (element.tagName.toLowerCase() === 'select') {
                fillSelectElement(element);
              } else {
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('blur', { bubbles: true }));
              }
            }

            // Handle all select elements that don't have values
            const allSelectElements = document.querySelectorAll('select');
            allSelectElements.forEach(select => {
              if (!hasValue(select)) {
                fillSelectElement(select);
              }
            });

            // Handle all unchecked checkboxes
            const findCheckboxes = () => {
              const checkboxes = document.querySelectorAll('input[type="checkbox"]');
              
              checkboxes.forEach(checkbox => {
                // Skip if already checked
                if (checkbox.checked) return;
                
                // Check the checkbox
                checkbox.checked = true;
                
                // Trigger events
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                checkbox.dispatchEvent(new Event('click', { bubbles: true }));
              });
            };

            // Execute checkbox checking
            findCheckboxes();
          }, 100); // 100ms delay

          // Find all password fields and fill them
          const allPasswordFields = document.querySelectorAll('input[type="password"]');
          allPasswordFields.forEach(element => {
            element.value = data.password;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
          });

          // Find and handle all select elements on the page
          const allSelectElements = document.querySelectorAll('select');
          allSelectElements.forEach(fillSelectElement);

          // Find and check all checkboxes
          findCheckboxes();
        },
        args: [data]
      });
    }
  });

  async function checkMessages(token) {
    try {
      const response = await fetch('https://api.mail.tm/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      allMessages = data['hydra:member'];
      const messagesList = document.getElementById('messages-list');
      
      if (!messagesList) {
        const newMessagesList = document.createElement('div');
        newMessagesList.id = 'messages-list';
        emailDisplay.insertAdjacentElement('afterend', newMessagesList);
      }

      const messagesList2 = document.getElementById('messages-list');
      
      if (allMessages.length > 0) {
        // Update navigation buttons state
        nextMessageBtn.disabled = currentMessageIndex >= allMessages.length - 1;
        prevMessageBtn.disabled = currentMessageIndex <= 0;

        // Get full message content for the current message
        const currentMessage = allMessages[currentMessageIndex];
        const messageResponse = await fetch(`https://api.mail.tm/messages/${currentMessage.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (messageResponse.ok) {
          const fullMessage = await messageResponse.json();
          
          // Extract links from the message content
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = fullMessage.html || fullMessage.text;
          const links = Array.from(tempDiv.getElementsByTagName('a')).map(a => ({
            text: a.textContent,
            href: a.href
          }));

          // Extract any verification codes (common patterns)
          const messageText = fullMessage.text || tempDiv.textContent;
          const codeMatch = messageText.match(/(?:verification code|code|pin|password)[\s:]+([A-Z0-9]{4,8})/i);
          const verificationCode = codeMatch ? codeMatch[1] : null;

          messagesList2.innerHTML = `
            <div class="message">
              <div class="message-header">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <strong>From:</strong> ${fullMessage.from.address}<br>
                    <strong>To:</strong> ${fullMessage.to[0].address}<br>
                    <strong>Subject:</strong> ${fullMessage.subject}
                    <div class="message-date">${new Date(fullMessage.createdAt).toLocaleString()}</div>
                  </div>
                  <button class="delete-message" data-message-id="${fullMessage.id}">Delete</button>
                </div>
              </div>
              <div class="message-content">
                ${fullMessage.html || fullMessage.text}
              </div>
            </div>
          `;

          // Add event listeners for buttons
          const copyButtons = messagesList2.getElementsByClassName('copy-code');
          Array.from(copyButtons).forEach(button => {
            button.addEventListener('click', () => {
              const code = button.getAttribute('data-code');
              navigator.clipboard.writeText(code);
              button.textContent = 'Copied!';
              setTimeout(() => {
                button.textContent = 'Copy Code';
              }, 2000);
            });
          });

          // Add delete button event listener
          const deleteButton = messagesList2.querySelector('.delete-message');
          if (deleteButton) {
            deleteButton.addEventListener('click', async () => {
              const messageId = deleteButton.getAttribute('data-message-id');
              try {
                const deleteResponse = await fetch(`https://api.mail.tm/messages/${messageId}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });

                if (deleteResponse.ok) {
                  messagesList2.innerHTML = '<div class="message">Message deleted. Refreshing...</div>';
                  // Refresh messages after a short delay
                  setTimeout(() => checkMessages(token), 1000);
                } else {
                  throw new Error('Failed to delete message');
                }
              } catch (error) {
                console.error('Error deleting message:', error);
                messagesList2.innerHTML = '<div class="message">Error deleting message</div>';
              }
            });
          }

          // Make all links in the message content clickable
          const messageLinks = messagesList2.getElementsByTagName('a');
          Array.from(messageLinks).forEach(link => {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              chrome.tabs.create({ url: link.href });
            });
          });
        }
      } else {
        messagesList2.innerHTML = '<div class="message">No messages yet</div>';
      }
    } catch (error) {
      console.error('Error checking messages:', error);
    }
  }

  // Add navigation button event listeners
  nextMessageBtn.addEventListener('click', async () => {
    if (currentMessageIndex < allMessages.length - 1) {
      currentMessageIndex++;
      await checkMessages(currentToken);
    }
  });

  prevMessageBtn.addEventListener('click', async () => {
    if (currentMessageIndex > 0) {
      currentMessageIndex--;
      await checkMessages(currentToken);
    }
  });

  function getRandomName() {
    const names = [
      'John', 'Emma', 'Michael', 'Sarah', 'David', 'Lisa', 'James', 'Emily',
      'William', 'Olivia', 'Daniel', 'Sophia', 'Alex', 'Isabella', 'Ryan', 'Mia'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  function getRandomUsername() {
    // Get a random first name
    const firstName = getRandomName().toLowerCase().replace(/[^a-z]/g, '');
    
    // Generate random numbers (100-999)
    const randomNum = Math.floor(Math.random() * 900) + 100;
    
    // Remove spaces and special characters, then combine
    return `${firstName}${randomNum}`;
  }

  function generatePassword() {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '!@#$%^&*';
    
    // Function to get random characters from a string
    const getRandomChars = (chars, count) => {
      let result = '';
      for (let i = 0; i < count; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Get required characters
    const twoUppercase = getRandomChars(uppercaseChars, 2);
    const twoLowercase = getRandomChars(lowercaseChars, 2);
    const threeNumbers = getRandomChars(numberChars, 3);
    const threeSpecial = getRandomChars(specialChars, 3);

    // Calculate remaining length needed to reach minimum 16 characters
    const currentLength = twoUppercase.length + twoLowercase.length + 
                         threeNumbers.length + threeSpecial.length;
    const remainingLength = 16 - currentLength;

    // Get additional random characters for remaining length
    const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
    const additionalChars = getRandomChars(allChars, remainingLength);

    // Combine all parts and shuffle
    const password = twoUppercase + twoLowercase + threeNumbers + 
                    threeSpecial + additionalChars;

    // Shuffle the password
    return password.split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  function getRandomPhone() {
    // Generate US format phone number (XXX) XXX-XXXX
    const areaCode = Math.floor(Math.random() * 900) + 100;  // 100-999
    const prefix = Math.floor(Math.random() * 900) + 100;    // 100-999
    const lineNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    return `+1${areaCode}${prefix}${lineNum}`;
  }

  function getRandomCompany() {
    const companies = [
      'Tech Solutions Inc',
      'Global Innovations Ltd',
      'Digital Dynamics Corp',
      'Future Systems LLC',
      'Smart Technologies Co',
      'Innovative Solutions Group',
      'Modern Tech Enterprise',
      'Digital Solutions Pro',
      'Advanced Systems Inc',
      'Next Gen Technologies'
    ];
    return companies[Math.floor(Math.random() * companies.length)];
  }

  function getRandomCountry() {
    const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France'];
    return countries[Math.floor(Math.random() * countries.length)];
  }

  function getRandomPostalCode() {
    // Generate US format ZIP code (5 digits or ZIP+4)
    const zip5 = Math.floor(Math.random() * 90000) + 10000;  // 10000-99999
    const zip4 = Math.floor(Math.random() * 9000) + 1000;    // 1000-9999
    return `${zip5}`;  // or `${zip5}-${zip4}` for ZIP+4 format
  }
});
