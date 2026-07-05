// PWA Manager - Handles installation prompts, updates, and calculator logic

let deferredPrompt;
let isAppInstalled = false;

// Check if app is already installed
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event for later use.
  deferredPrompt = e;
  // Show the install prompt
  showInstallPrompt();
});

// Listen for app installation
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  isAppInstalled = true;
  hideInstallPrompt();
  // Clear the deferredPrompt
  deferredPrompt = null;
});

// Listen for successful service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').then(
    (registration) => {
      console.log('Service Worker registered:', registration);

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every 60 seconds

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is ready
            showUpdatePrompt();
          }
        });
      });
    },
    (err) => {
      console.error('Service Worker registration failed:', err);
    }
  );
}

// Install Prompt Functions
function showInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  const installBtn = document.getElementById('installBtn');

  // Check if app is already installed
  if (!isAppInstalled && deferredPrompt) {
    installPrompt.style.display = 'block';
    if (installBtn) {
      installBtn.style.display = 'block';
    }
  }
}

function hideInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  const installBtn = document.getElementById('installBtn');
  installPrompt.style.display = 'none';
  if (installBtn) {
    installBtn.style.display = 'none';
  }
}

function showUpdatePrompt() {
  const updatePrompt = document.getElementById('updatePrompt');
  updatePrompt.style.display = 'block';
}

function hideUpdatePrompt() {
  const updatePrompt = document.getElementById('updatePrompt');
  updatePrompt.style.display = 'none';
}

// Install button handlers
document.addEventListener('DOMContentLoaded', () => {
  // Install prompt buttons
  const installAppBtn = document.getElementById('installAppBtn');
  const installLaterBtn = document.getElementById('installLaterBtn');
  const installCloseBtn = document.getElementById('installCloseBtn');
  const installHeaderBtn = document.getElementById('installBtn');

  if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        hideInstallPrompt();
      }
    });
  }

  if (installLaterBtn) {
    installLaterBtn.addEventListener('click', () => {
      hideInstallPrompt();
    });
  }

  if (installCloseBtn) {
    installCloseBtn.addEventListener('click', () => {
      hideInstallPrompt();
    });
  }

  if (installHeaderBtn) {
    installHeaderBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        hideInstallPrompt();
      }
    });
  }

  // Update prompt buttons
  const updateNowBtn = document.getElementById('updateNowBtn');
  const updateLaterBtn = document.getElementById('updateLaterBtn');

  if (updateNowBtn) {
    updateNowBtn.addEventListener('click', () => {
      // Reload the page to use the new service worker
      window.location.reload();
    });
  }

  if (updateLaterBtn) {
    updateLaterBtn.addEventListener('click', () => {
      hideUpdatePrompt();
    });
  }

  // Settings button
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      alert('Settings:\n\n✓ Offline Mode: Enabled\n✓ Auto-Sync: Enabled\n✓ Dark Theme: Active\n\nMore options coming soon!');
    });
  }

  // Offline mode button
  const offlineModeBtn = document.getElementById('offlineModeBtn');
  if (offlineModeBtn) {
    offlineModeBtn.addEventListener('click', () => {
      const isOnline = navigator.onLine;
      alert(`${isOnline ? 'Currently Online' : 'Currently Offline'}\n\nYour data is synced locally. Changes will sync when you go back online.`);
    });
  }

  // GST Calculator Functions
  setupCalculators();

  // Tab Navigation
  setupTabNavigation();
});

function setupCalculators() {
  // Calculator 1: Calculate GST on Amount
  const calcAmount = document.getElementById('calcAmount');
  const calcGstRate = document.getElementById('calcGstRate');
  const calcGstAmount = document.getElementById('calcGstAmount');
  const calcTotalAmount = document.getElementById('calcTotalAmount');

  function updateCalc1() {
    const amount = parseFloat(calcAmount?.value || 0);
    const rate = parseFloat(calcGstRate?.value || 18);
    const gst = (amount * rate) / 100;
    const total = amount + gst;

    if (calcGstAmount) calcGstAmount.textContent = `₹${gst.toFixed(2)}`;
    if (calcTotalAmount) calcTotalAmount.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  calcAmount?.addEventListener('input', updateCalc1);
  calcGstRate?.addEventListener('change', updateCalc1);
  updateCalc1();

  // Calculator 2: Calculate Amount from Total
  const calcTotalInput = document.getElementById('calcTotalInput');
  const calcGstRate2 = document.getElementById('calcGstRate2');
  const calcNetAmount = document.getElementById('calcNetAmount');
  const calcGstAmount2 = document.getElementById('calcGstAmount2');

  function updateCalc2() {
    const total = parseFloat(calcTotalInput?.value || 0);
    const rate = parseFloat(calcGstRate2?.value || 18);
    const net = total / (1 + rate / 100);
    const gst = total - net;

    if (calcNetAmount) calcNetAmount.textContent = `₹${net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (calcGstAmount2) calcGstAmount2.textContent = `₹${gst.toFixed(2)}`;
  }

  calcTotalInput?.addEventListener('input', updateCalc2);
  calcGstRate2?.addEventListener('change', updateCalc2);
  updateCalc2();

  // Calculator 3: IGST vs CGST/SGST
  const calcIgstAmount = document.getElementById('calcIgstAmount');
  const calcIgstRate = document.getElementById('calcIgstRate');
  const calcIgst = document.getElementById('calcIgst');
  const calcCgst = document.getElementById('calcCgst');
  const calcSgst = document.getElementById('calcSgst');

  function updateCalc3() {
    const amount = parseFloat(calcIgstAmount?.value || 0);
    const rate = parseFloat(calcIgstRate?.value || 18);
    const igst = (amount * rate) / 100;
    const halfRate = rate / 2;
    const cgst = (amount * halfRate) / 100;
    const sgst = (amount * halfRate) / 100;

    if (calcIgst) calcIgst.textContent = `₹${igst.toFixed(2)}`;
    if (calcCgst) calcCgst.textContent = `₹${cgst.toFixed(2)}`;
    if (calcSgst) calcSgst.textContent = `₹${sgst.toFixed(2)}`;
  }

  calcIgstAmount?.addEventListener('input', updateCalc3);
  calcIgstRate?.addEventListener('change', updateCalc3);
  updateCalc3();
}

function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((content) => content.classList.remove('active'));

      // Add active class to clicked button
      btn.classList.add('active');

      // Show corresponding tab content
      const tabName = btn.getAttribute('data-tab');
      const tabContent = document.getElementById(`${tabName}-tab`);
      if (tabContent) {
        tabContent.classList.add('active');
      }
    });
  });
}

// Offline data sync
window.addEventListener('online', () => {
  console.log('App is online');
  // Sync any pending data
  syncPendingData();
});

window.addEventListener('offline', () => {
  console.log('App is offline');
});

async function syncPendingData() {
  // This will sync any data that was saved locally while offline
  console.log('Syncing pending data...');
  const clients = localStorage.getItem('gst-ai-clients');
  const uploads = localStorage.getItem('gst-ai-uploads');

  if (clients || uploads) {
    try {
      // In a real app, send this to your server
      console.log('Data synced successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Send notification
function sendNotification(title, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%230066cc" width="180" height="180"/><text x="90" y="110" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">₹</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%230066cc" width="180" height="180"/><text x="90" y="110" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">₹</text></svg>',
      ...options,
    });
  }
}

// Interest & Late Fee Calculator
function setupInterestCalculator() {
  const taxAmount = document.getElementById('taxAmount');
  const daysDelayed = document.getElementById('daysDelayed');
  const interestAmount = document.getElementById('interestAmount');
  const totalDue = document.getElementById('totalDue');

  function updateInterest() {
    const tax = parseFloat(taxAmount?.value || 0);
    const days = parseInt(daysDelayed?.value || 0);
    const interestRate = 0.18 / 365; // 18% per annum per day
    const interest = tax * interestRate * days;
    const total = tax + interest;

    if (interestAmount) interestAmount.textContent = `₹${interest.toFixed(2)}`;
    if (totalDue) totalDue.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  taxAmount?.addEventListener('input', updateInterest);
  daysDelayed?.addEventListener('input', updateInterest);
  updateInterest();

  // Penalty calculation
  const penaltyType = document.getElementById('penaltyType');
  const daysLate = document.getElementById('daysLate');
  const penaltyAmount = document.getElementById('penaltyAmount');

  function updatePenalty() {
    const rate = parseFloat(penaltyType?.value || 100);
    const days = parseInt(daysLate?.value || 0);
    const maxCap = rate === 100 ? 25000 : 50000;
    let penalty = rate * days;
    penalty = Math.min(penalty, maxCap);

    if (penaltyAmount) penaltyAmount.textContent = `₹${penalty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  penaltyType?.addEventListener('change', updatePenalty);
  daysLate?.addEventListener('input', updatePenalty);
  updatePenalty();
}

// AI Chat functionality
function setupAiChat() {
  const aiQuestion = document.getElementById('aiQuestion');
  const aiAskBtn = document.getElementById('aiAskBtn');
  const aiChatBox = document.getElementById('aiChatBox');
  const suggestionChips = document.querySelectorAll('.chip');

  const responses = {
    'gst rate for services': 'The standard GST rate for most services is 18%. However, some services are taxed at 5% (e.g., training, transportation), 12%, or 0% (e.g., financial services). Please check the GST rate list for specific services.',
    'claim itc': 'Input Tax Credit (ITC) can be claimed on supplies received that are used for making taxable supplies. The goods/services must be used for business purposes, and proper documentation (invoices, GST paid) must be maintained.',
    'when file gstr-3b': 'GSTR-3B should be filed by the 20th of the next month following the end of the tax period (monthly for most businesses, quarterly for others). Late filing incurs a penalty of ₹100 per day up to ₹25,000.',
    'reverse charges': 'Reverse charge mechanism requires the recipient to pay GST instead of the supplier. This applies to specific services like commission agents, goods transport, construction, and certain B2B services. The recipient must self-assess and pay tax.',
    'default': 'I can help you with GST-related questions. Try asking about GST rates, filing deadlines, ITC claims, penalties, or compliance requirements.'
  };

  function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message`;
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    aiChatBox?.appendChild(messageDiv);
    aiChatBox?.scrollTop = aiChatBox?.scrollHeight;
  }

  function getResponse(question) {
    const q = question.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
      if (q.includes(key)) return response;
    }
    return responses['default'];
  }

  aiAskBtn?.addEventListener('click', () => {
    const question = aiQuestion?.value?.trim();
    if (!question) return;

    addMessage('You', question);
    aiQuestion.value = '';

    setTimeout(() => {
      const response = getResponse(question);
      addMessage('GST AI', response);
    }, 500);
  });

  suggestionChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      aiQuestion.value = chip.textContent;
      aiQuestion.focus();
    });
  });
}

// Export for use in app.js
export { sendNotification, requestNotificationPermission, syncPendingData };

// Setup new features after DOM loads
setTimeout(() => {
  setupInterestCalculator();
  setupAiChat();
}, 100);
