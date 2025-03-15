// Function to generate random data
function getRandomName() {
  const names = [
    'John', 'Emma', 'Michael', 'Sarah', 'David', 'Lisa', 'James', 'Emily',
    'William', 'Olivia', 'Daniel', 'Sophia', 'Joseph', 'Isabella', 'Thomas', 'Mia'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function getRandomUsername() {
  const prefix = ['user', 'cool', 'super', 'awesome', 'mega', 'ultra', 'hyper', 'power'];
  const suffix = ['123', '777', '999', '888', '555', '333', '222', '111'];
  return prefix[Math.floor(Math.random() * prefix.length)] + 
         suffix[Math.floor(Math.random() * suffix.length)];
}

function getRandomPhone() {
  return '+1' + Array(10).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
}

function generatePassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  return Array(length).fill(0).map(() => charset[Math.floor(Math.random() * charset.length)]).join('');
}

// Function to fill forms
async function fillForms() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // Get settings
    const settings = await chrome.storage.local.get(['formSettings']);
    const formSettings = settings.formSettings || {};

    // Prepare data with fallbacks to random values
    const data = {
      email: formSettings.email || '',
      firstName: formSettings.firstName || getRandomName(),
      lastName: formSettings.lastName || getRandomName(),
      username: getRandomUsername(),
      password: generatePassword(),
      phoneNumber: formSettings.phoneNumber || getRandomPhone(),
      zipCode: formSettings.zipCode || ''
    };

    // Execute form filling script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (formData) => {
        // Helper function to fill select elements
        function fillSelectElement(select) {
          const options = Array.from(select.options);
          if (options.length > 0) {
            const randomIndex = Math.floor(Math.random() * options.length);
            select.selectedIndex = randomIndex;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        // Define field selectors
        const selectors = {
          email: [
            'input[type="email"]',
            'input[name*="email" i]',
            'input[id*="email" i]',
            'input[placeholder*="email" i]',
            'input[placeholder*="@" i]'
          ],
          firstName: [
            'input[name*="first" i]',
            'input[id*="first" i]',
            'input[name*="fname" i]',
            'input[id*="fname" i]',
            'input[placeholder*="first name" i]',
            'input[name="name" i]'
          ],
          lastName: [
            'input[name*="last" i]',
            'input[id*="last" i]',
            'input[name*="lname" i]',
            'input[id*="lname" i]',
            'input[placeholder*="last name" i]'
          ],
          phoneNumber: [
            'input[type="tel"]',
            'input[name*="phone" i]',
            'input[id*="phone" i]',
            'input[name*="mobile" i]',
            'input[id*="mobile" i]',
            'input[placeholder*="phone" i]'
          ],
          zipCode: [
            'input[name*="zip" i]',
            'input[id*="zip" i]',
            'input[name*="postal" i]',
            'input[id*="postal" i]',
            'input[placeholder*="zip" i]',
            'input[placeholder*="postal" i]'
          ]
        };

        // Fill form fields
        Object.entries(selectors).forEach(([field, fieldSelectors]) => {
          const value = formData[field];
          if (value) {
            const selector = fieldSelectors.join(',');
            document.querySelectorAll(selector).forEach(element => {
              if (element.tagName.toLowerCase() === 'select') {
                fillSelectElement(element);
              } else {
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          }
        });

        // Handle any remaining select elements
        document.querySelectorAll('select').forEach(select => {
          if (!select.value || select.value === '') {
            fillSelectElement(select);
          }
        });
      },
      args: [data]
    });
  } catch (error) {
    console.error('Error filling forms:', error);
  }
}

// Listen for keyboard command
chrome.commands.onCommand.addListener((command) => {
  if (command === '_execute_action') {
    fillForms();
  }
});
