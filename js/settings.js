document.addEventListener('DOMContentLoaded', function() {
  // Get form elements
  const emailInput = document.getElementById('email');
  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');
  const phoneNumberInput = document.getElementById('phoneNumber');
  const zipCodeInput = document.getElementById('zipCode');
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');

  // Load saved settings
  chrome.storage.local.get(['formSettings'], function(result) {
    if (result.formSettings) {
      emailInput.value = result.formSettings.email || '';
      firstNameInput.value = result.formSettings.firstName || '';
      lastNameInput.value = result.formSettings.lastName || '';
      phoneNumberInput.value = result.formSettings.phoneNumber || '';
      zipCodeInput.value = result.formSettings.zipCode || '';
    }
  });

  // Save settings
  saveButton.addEventListener('click', function() {
    const settings = {
      email: emailInput.value,
      firstName: firstNameInput.value,
      lastName: lastNameInput.value,
      phoneNumber: phoneNumberInput.value,
      zipCode: zipCodeInput.value
    };

    chrome.storage.local.set({
      formSettings: settings
    }, function() {
      // Show success message
      const notification = document.createElement('div');
      notification.className = 'success';
      notification.textContent = 'Settings saved successfully!';
      document.body.appendChild(notification);
      
      // Force reflow to trigger animation
      notification.offsetHeight;
      notification.style.display = 'block';

      // Remove notification after 3 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    });
  });

  // Reset settings
  resetButton.addEventListener('click', function() {
    emailInput.value = '';
    firstNameInput.value = '';
    lastNameInput.value = '';
    phoneNumberInput.value = '';
    zipCodeInput.value = '';

    chrome.storage.local.set({
      formSettings: {}
    }, function() {
      // Show success message
      const notification = document.createElement('div');
      notification.className = 'success';
      notification.textContent = 'Settings reset successfully!';
      document.body.appendChild(notification);
      
      // Force reflow to trigger animation
      notification.offsetHeight;
      notification.style.display = 'block';

      // Remove notification after 3 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    });
  });
});
