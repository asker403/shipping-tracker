(function() {
  // Define Custom Element for encapsulating tracker behaviors
  class NextClickShippingTracker extends HTMLElement {
    constructor() {
      super();
      this.initialized = false;
    }

    connectedCallback() {
      // Defer to guarantee child elements are fully parsed in the DOM
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        setTimeout(() => this.init(), 0);
      }
    }

    init() {
      if (this.initialized) return;

      this.progressBarFill = this.querySelector('.nc-progress-bar-fill');
      this.messageContainer = this.querySelector('.nc-message-container');
      
      // Retry in the next animation frame if children are not parsed yet
      if (!this.progressBarFill || !this.messageContainer) {
        requestAnimationFrame(() => this.init());
        return;
      }

      this.initialized = true;
      this.thresholdCents = parseInt(this.getAttribute('data-threshold-cents'), 10) || 0;
      this.textAwayTemplate = this.getAttribute('data-text-away') || 'You are only [amount] away from Free Shipping!';
      this.textQualified = this.getAttribute('data-text-qualified') || '🎉 You qualify for Free Shipping!';
      
      // Tracking flags to prevent duplicate logging during a page session
      this.impressionLogged = false;
      this.thresholdReachedLogged = false;

      // Close button dismiss logic
      this.closeButton = this.querySelector('.nc-close-button');
      if (this.closeButton) {
        this.closeButton.addEventListener('click', () => {
          this.classList.add('nc-dismissed');
        });
      }
      this.lastCartTotal = null;

      this.update(parseInt(this.getAttribute('data-cart-total'), 10) || 0);
    }

    update(cartTotal) {
      if (!this.initialized) return;

      // Reveal the tracker again on cart updates if it was dismissed
      if (this.lastCartTotal !== null && this.lastCartTotal !== cartTotal) {
        this.classList.remove('nc-dismissed');
      }
      this.lastCartTotal = cartTotal;

      // Read live active currency exchange rate from Shopify (defensively parsed)
      let rate = 1.0;
      if (window.Shopify && window.Shopify.currency && window.Shopify.currency.rate) {
        const parsedRate = parseFloat(window.Shopify.currency.rate);
        if (!isNaN(parsedRate) && parsedRate > 0) {
          rate = parsedRate;
        }
      }

      // Converted threshold in the customer's active presentment currency
      const activeThresholdCents = Math.round(this.thresholdCents * rate);
      const remainingCents = activeThresholdCents - cartTotal;
      
      let percentage = 0;
      if (activeThresholdCents > 0) {
        percentage = Math.min(100, Math.max(0, (cartTotal / activeThresholdCents) * 100));
      }

      console.log('[NextClick Tracker] update:', {
        cartTotal,
        thresholdCents: this.thresholdCents,
        rate,
        activeThresholdCents,
        remainingCents,
        percentage
      });

      // Resolve active currency code and format money using browser Intl API
      const activeCurrencyCode = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) 
        ? window.Shopify.currency.active 
        : 'USD';
      
      let formattedAmount;
      try {
        formattedAmount = new Intl.NumberFormat(navigator.language || 'en-US', {
          style: 'currency',
          currency: activeCurrencyCode
        }).format(remainingCents / 100);
      } catch (e) {
        // Fallback to basic symbol formatting
        const symbol = this.getAttribute('data-currency-symbol') || '$';
        formattedAmount = symbol + (remainingCents / 100).toFixed(2);
      }

      // Update progress fill width using transitions
      this.progressBarFill.style.width = percentage + '%';

      // Log impression event once per page render
      if (!this.impressionLogged) {
        this.logAnalyticsEvent('impression', cartTotal);
        this.impressionLogged = true;
      }

      // Update message text
      if (remainingCents <= 0) {
        this.messageContainer.innerHTML = this.textQualified;

        // Log threshold reached event once
        if (!this.thresholdReachedLogged) {
          this.logAnalyticsEvent('threshold_reached', cartTotal);
          this.thresholdReachedLogged = true;
        }
      } else {
        // Reset the flag if they go back below the threshold
        this.thresholdReachedLogged = false;

        let message = this.textAwayTemplate;
        
        // Replace placeholders: [amount], {{ amount }}, amount
        if (message.includes('[amount]')) {
          message = message.replace('[amount]', formattedAmount);
        } else if (message.includes('{{ amount }}')) {
          message = message.replace('{{ amount }}', formattedAmount);
        } else if (message.includes('{{amount}}')) {
          message = message.replace('{{amount}}', formattedAmount);
        } else {
          message = message.replace('amount', formattedAmount);
        }
        
        this.messageContainer.innerHTML = message;
      }
    }

    logAnalyticsEvent(event, cartTotal) {
      // App Proxy subpath configured in shopify.app.toml maps this dynamically to Remix backend
      const proxyUrl = '/apps/shipping-tracker';
      
      fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: event,
          cartTotal: cartTotal
        })
      }).catch(function(err) {
        console.warn('[NextClick Tracker] Failed to send storefront analytics:', event, err);
      });
    }
  }

  // Define the custom element if not already registered
  if (!customElements.get('nextclick-shipping-tracker')) {
    customElements.define('nextclick-shipping-tracker', NextClickShippingTracker);
  }

  // --- Helper to update all tracker instances ---
  function updateAllTrackers(cartTotal) {
    const trackers = document.querySelectorAll('nextclick-shipping-tracker');
    trackers.forEach(function(tracker) {
      if (typeof tracker.update === 'function') {
        tracker.update(cartTotal);
      }
    });
  }

  /**
   * Fetches latest cart data from Shopify AJAX API and updates all trackers
   */
  function refreshTrackers() {
    let cartUrl = '/cart.js';
    if (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) {
      const root = window.Shopify.routes.root;
      cartUrl = (root.endsWith('/') ? root : root + '/') + 'cart.js';
    }

    fetch(cartUrl)
      .then(function(response) {
        if (!response.ok) throw new Error('Cart fetch failed');
        return response.json();
      })
      .then(function(cart) {
        updateAllTrackers(cart.total_price);
      })
      .catch(function(err) {
        console.warn('[NextClick Tracker] Could not retrieve cart data:', err);
      });
  }

  // --- Intercept Fetch API requests ---
  const originalFetch = window.fetch;
  window.fetch = function() {
    const args = arguments;
    const input = args[0];
    const url = typeof input === 'string' ? input : (input && input.url) ? input.url : '';

    const isCartUrl = url.includes('/cart/add') || 
                      url.includes('/cart/change') || 
                      url.includes('/cart/update') || 
                      url.includes('/cart/clear') || 
                      url.includes('/cart.js');

    return originalFetch.apply(this, args).then(function(response) {
      if (isCartUrl && response.ok) {
        const clone = response.clone();
        clone.json().then(function(data) {
          if (data && typeof data.total_price !== 'undefined') {
            updateAllTrackers(data.total_price);
          } else {
            refreshTrackers();
          }
        }).catch(function() {
          refreshTrackers();
        });
      }
      return response;
    });
  };

  // --- Intercept XMLHttpRequest requests (compatibility hook) ---
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function() {
    const xhr = this;
    xhr.addEventListener('load', function() {
      if (xhr.responseURL && xhr.responseURL.includes('/cart/')) {
        refreshTrackers();
      }
    });
    return originalSend.apply(this, arguments);
  };
})();
