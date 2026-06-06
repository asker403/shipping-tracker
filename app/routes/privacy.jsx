import styles from "./_index/styles.module.css";

export default function Privacy() {
  return (
    <div className={styles.index} style={{ padding: '4rem 1.5rem', textAlign: 'left', display: 'block' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <header style={{ marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
          <h1 className={styles.heading} style={{ fontSize: '2.5rem', textAlign: 'left' }}>Privacy Policy</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Last updated: June 6, 2026</p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', color: '#94a3b8', lineHeight: '1.6' }}>
          
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', marginBottom: '0.75rem' }}>1. Introduction</h2>
            <p>
              Welcome to <strong>ShipGoal: Free Shipping Bar</strong>. We are committed to protecting your privacy. This Privacy Policy describes how we collect, use, and share information when you install and use our application on your Shopify store.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', marginBottom: '0.75rem' }}>2. Information We Collect</h2>
            <p>
              Our application is designed with privacy in mind. We collect minimal information necessary to deliver the free shipping progress bar functionality:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Merchant Session Tokens:</strong> We collect shop credentials and access tokens to authenticate and render the settings control panel inside your Shopify admin dashboard.</li>
              <li><strong>Anonymous Storefront Event Data:</strong> To display analytics in your dashboard, we log pageviews (impressions), milestones achieved (when a cart reaches the shipping threshold), and anonymous cart totals. <strong>We do not collect any buyer names, email addresses, phone numbers, or shipping addresses.</strong></li>
            </ul>
          </div>

          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', marginBottom: '0.75rem' }}>3. How We Use Your Information</h2>
            <p>
              We use the collected information to:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Configure and display the progress bar widget on your online store templates.</li>
              <li>Provide conversion rate metrics, impression counts, and qualified cart values in your settings dashboard.</li>
              <li>Ensure secure session authentication.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', marginBottom: '0.75rem' }}>4. Data Sharing and Third Parties</h2>
            <p>
              We do not sell, rent, or share any merchant or buyer data with third parties. Your data is used exclusively to run the ShipGoal application on your store.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', marginBottom: '0.75rem' }}>5. Security and Data Retention</h2>
            <p>
              We implement industry-standard security measures to protect your access credentials and analytics logs on our secure cloud database (Supabase). We retain data for as long as the application remains installed on your store. You can request data deletion at any time by contacting our support channel.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', marginBottom: '0.75rem' }}>6. Contact Us</h2>
            <p>
              If you have any questions or concerns regarding this privacy policy, please contact us at: <a href="mailto:umit206403@gmail.com" style={{ color: '#818cf8', textDecoration: 'none' }}>umit206403@gmail.com</a>.
            </p>
          </div>

        </section>

      </div>
    </div>
  );
}
