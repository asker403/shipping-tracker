import { useState } from "react";
import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();
  
  // Interactive demo states
  const [cartTotal, setCartTotal] = useState(60);
  const threshold = 100;
  const percent = Math.min((cartTotal / threshold) * 100, 100);

  const handleAddCart = () => {
    if (cartTotal < threshold) {
      setCartTotal(prev => Math.min(prev + 20, threshold));
    } else {
      setCartTotal(40); // Reset demo to 40
    }
  };

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        
        {/* Header Section */}
        <header className={styles.header}>
          <div className={styles.badge}>Shopify App</div>
          <h1 className={styles.heading}>Free Shipping Tracker</h1>
          <p className={styles.text}>
            Boost your Average Order Value (AOV) and delight customers with a sleek, 
            lightning-fast free shipping progress bar customized for your brand.
          </p>
        </header>

        {/* Installation Form */}
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <div className={styles.inputGroup}>
              <input 
                className={styles.input} 
                type="text" 
                name="shop" 
                placeholder="example.myshopify.com" 
                required 
              />
              <button className={styles.button} type="submit">
                Install App
              </button>
            </div>
            <span className={styles.hint}>
              Enter your Shopify development shop domain to begin testing
            </span>
          </Form>
        )}

        {/* Live Interactive Simulation Widget */}
        <div className={styles.demoContainer}>
          <h3 className={styles.demoTitle}>Live Widget Simulator</h3>
          
          <div className={styles.demoBanner}>
            <p className={styles.demoText}>
              {cartTotal < threshold ? (
                <>Only <span style={{ color: '#818cf8' }}>${threshold - cartTotal}</span> away from FREE SHIPPING!</>
              ) : (
                <>🎉 Congratulations! You have unlocked <span style={{ color: '#34d399' }}>FREE SHIPPING</span>!</>
              )}
            </p>
            <div className={styles.progressBarContainer}>
              <div 
                className={styles.progressBarFill} 
                style={{ width: `${percent}%` }}
              ></div>
            </div>
          </div>

          <div className={styles.demoControls}>
            <button 
              type="button" 
              className={styles.demoBtn} 
              onClick={handleAddCart}
            >
              {cartTotal < threshold ? "Add $20 Item to Cart" : "Reset Cart"}
            </button>
            <span className={styles.demoStatus}>
              Cart Total: ${cartTotal} / ${threshold}
            </span>
          </div>
        </div>

        {/* Feature Grid */}
        <ul className={styles.list}>
          <li className={styles.featureCard}>
            <span className={styles.featureIcon}>⚡</span>
            <h4 className={styles.featureTitle}>Zero Speed Impact</h4>
            <p className={styles.featureDesc}>
              Served via Shopify's global CDN with deferred scripts. Keeps your storefront speed at 100%.
            </p>
          </li>
          <li className={styles.featureCard}>
            <span className={styles.featureIcon}>🎨</span>
            <h4 className={styles.featureTitle}>Fully Customizable</h4>
            <p className={styles.featureDesc}>
              Modify gradients, fonts, margins, and goals to seamlessly match your storefront design.
            </p>
          </li>
          <li className={styles.featureCard}>
            <span className={styles.featureIcon}>📈</span>
            <h4 className={styles.featureTitle}>Real-time Analytics</h4>
            <p className={styles.featureDesc}>
              Track impressions, goals reached, and conversion rates straight from your admin dashboard.
            </p>
          </li>
        </ul>

      </div>
    </div>
  );
}
