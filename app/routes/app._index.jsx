import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query GetShopSettings {
      shop {
        id
        metafield(namespace: "nextclick_tracker", key: "settings") {
          value
        }
      }
    }`
  );
  const responseJson = await response.json();
  const shop = responseJson.data?.shop;

  let settings = {
    threshold: 50,
    text_away: "You are only [amount] away from Free Shipping!",
    text_qualified: "🎉 You qualify for Free Shipping!",
    tracker_bg: "#ffffff",
    text_color: "#2c3e50",
    bar_background: "#eef2f5",
    use_gradient: true,
    bar_color: "#4facfe",
    bar_color_end: "#00f2fe",
    font_family: "system",
    border_radius: "Rounded",
    shadow_style: "Soft",
    glassmorphism: false,
    bar_thickness: "Standard",
    text_alignment: "center",
    layout_style: "inline"
  };

  if (shop?.metafield?.value) {
    try {
      settings = { ...settings, ...JSON.parse(shop.metafield.value) };
    } catch (e) {
      console.error("Failed to parse settings JSON:", e);
    }
  }

  // Retrieve storefront analytics for the active shop
  const shopDomain = session.shop;
  const impressions = await db.analyticsEvent.count({
    where: { shop: shopDomain, event: "impression" }
  });
  const conversions = await db.analyticsEvent.count({
    where: { shop: shopDomain, event: "threshold_reached" }
  });
  const revenueSum = await db.analyticsEvent.aggregate({
    _sum: { cartTotal: true },
    where: { shop: shopDomain, event: "threshold_reached" }
  });

  const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0.0;
  const convertedRevenue = (revenueSum._sum.cartTotal || 0) / 100;

  const analytics = {
    impressions,
    conversions,
    conversionRate,
    convertedRevenue
  };

  return { shopId: shop?.id, settings, analytics };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const threshold = parseInt(formData.get("threshold"), 10) || 50;
  const text_away = formData.get("text_away") || "You are only [amount] away from Free Shipping!";
  const text_qualified = formData.get("text_qualified") || "🎉 You qualify for Free Shipping!";
  const tracker_bg = formData.get("tracker_bg") || "#ffffff";
  const text_color = formData.get("text_color") || "#2c3e50";
  const bar_background = formData.get("bar_background") || "#eef2f5";
  const use_gradient = formData.get("use_gradient") === "true";
  const bar_color = formData.get("bar_color") || "#4facfe";
  const bar_color_end = formData.get("bar_color_end") || "#00f2fe";
  const font_family = formData.get("font_family") || "system";
  const border_radius = formData.get("border_radius") || "Rounded";
  const shadow_style = formData.get("shadow_style") || "Soft";
  const glassmorphism = formData.get("glassmorphism") === "true";
  const bar_thickness = formData.get("bar_thickness") || "Standard";
  const text_alignment = formData.get("text_alignment") || "center";
  const layout_style = formData.get("layout_style") || "inline";
  const shopId = formData.get("shopId");

  const settingsJson = JSON.stringify({
    threshold,
    text_away,
    text_qualified,
    tracker_bg,
    text_color,
    bar_background,
    use_gradient,
    bar_color,
    bar_color_end,
    font_family,
    border_radius,
    shadow_style,
    glassmorphism,
    bar_thickness,
    text_alignment,
    layout_style
  });

  try {
    await admin.graphql(
      `#graphql
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
          }
          userErrors {
            message
          }
        }
      }`,
      {
        variables: {
          definition: {
            name: "NextClick Tracker Settings",
            namespace: "nextclick_tracker",
            key: "settings",
            ownerType: "SHOP",
            type: "json",
            access: {
              storefront: "PUBLIC_READ"
            }
          }
        }
      }
    );
  } catch (e) {
    console.log("Metafield definition creation bypassed or already exists");
  }

  const setResponse = await admin.graphql(
    `#graphql
    mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
        }
        userErrors {
          message
        }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            namespace: "nextclick_tracker",
            key: "settings",
            ownerId: shopId,
            type: "json",
            value: settingsJson
          }
        ]
      }
    }
  );

  const setResponseJson = await setResponse.json();
  const errors = setResponseJson.data?.metafieldsSet?.userErrors;
  if (errors && errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, settings: JSON.parse(settingsJson) };
};

const COLOR_PRESETS = [
  {
    name: "Midnight Sleek",
    tracker_bg: "#1a1a1a",
    text_color: "#ffffff",
    bar_background: "#333333",
    use_gradient: true,
    bar_color: "#ff007f",
    bar_color_end: "#7f00ff"
  },
  {
    name: "Ocean Breeze",
    tracker_bg: "#ffffff",
    text_color: "#1e293b",
    bar_background: "#f1f5f9",
    use_gradient: true,
    bar_color: "#06b6d4",
    bar_color_end: "#3b82f6"
  },
  {
    name: "Sunset Warmth",
    tracker_bg: "#ffffff",
    text_color: "#1e293b",
    bar_background: "#f8fafc",
    use_gradient: true,
    bar_color: "#f97316",
    bar_color_end: "#ec4899"
  },
  {
    name: "Minimalist Light",
    tracker_bg: "#ffffff",
    text_color: "#1a1a1a",
    bar_background: "#e2e8f0",
    use_gradient: false,
    bar_color: "#0f172a",
    bar_color_end: "#0f172a"
  },
  {
    name: "Forest Mint",
    tracker_bg: "#ffffff",
    text_color: "#14532d",
    bar_background: "#f0fdf4",
    use_gradient: true,
    bar_color: "#10b981",
    bar_color_end: "#059669"
  }
];

export default function Index() {
  const { shopId, settings: initialSettings, analytics } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [threshold, setThreshold] = useState(initialSettings.threshold);
  const [textAway, setTextAway] = useState(initialSettings.text_away);
  const [textQualified, setTextQualified] = useState(initialSettings.text_qualified);
  const [trackerBg, setTrackerBg] = useState(initialSettings.tracker_bg);
  const [textColor, setTextColor] = useState(initialSettings.text_color);
  const [barBackground, setBarBackground] = useState(initialSettings.bar_background);
  const [useGradient, setUseGradient] = useState(initialSettings.use_gradient);
  const [barColor, setBarColor] = useState(initialSettings.bar_color);
  const [barColorEnd, setBarColorEnd] = useState(initialSettings.bar_color_end);
  const [fontFamily, setFontFamily] = useState(initialSettings.font_family || "system");
  const [borderRadius, setBorderRadius] = useState(initialSettings.border_radius || "Rounded");
  const [shadowStyle, setShadowStyle] = useState(initialSettings.shadow_style || "Soft");
  const [glassmorphism, setGlassmorphism] = useState(initialSettings.glassmorphism || false);
  const [barThickness, setBarThickness] = useState(initialSettings.bar_thickness || "Standard");
  const [textAlignment, setTextAlignment] = useState(initialSettings.text_alignment || "center");
  const [layoutStyle, setLayoutStyle] = useState(initialSettings.layout_style || "inline");

  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved successfully!");
    } else if (fetcher.data?.errors) {
      shopify.toast.show("Error saving settings.");
    }
  }, [fetcher.data, shopify]);

  const handleSave = () => {
    fetcher.submit(
      {
        shopId,
        threshold: threshold.toString(),
        text_away: textAway,
        text_qualified: textQualified,
        tracker_bg: trackerBg,
        text_color: textColor,
        bar_background: barBackground,
        use_gradient: useGradient.toString(),
        bar_color: barColor,
        bar_color_end: barColorEnd,
        font_family: fontFamily,
        border_radius: borderRadius,
        shadow_style: shadowStyle,
        glassmorphism: glassmorphism.toString(),
        bar_thickness: barThickness,
        text_alignment: textAlignment,
        layout_style: layoutStyle
      },
      { method: "POST" }
    );
  };

  const applyPreset = (preset) => {
    setTrackerBg(preset.tracker_bg);
    setTextColor(preset.text_color);
    setBarBackground(preset.bar_background);
    setUseGradient(preset.use_gradient);
    setBarColor(preset.bar_color);
    setBarColorEnd(preset.bar_color_end);
  };

  return (
    <s-page heading="NextClick: Free Shipping Tracker Settings">
      <s-button slot="primary-action" onClick={handleSave} {...(isSaving ? { loading: true } : {})}>
        Save settings
      </s-button>

      <s-section heading="Configuration Dashboard">
        <s-paragraph>
          Manage the global default settings for your Free Shipping Tracker block.
          Merchants can place this block anywhere via the Theme Customize panel.
        </s-paragraph>

        <s-stack direction="block" gap="large">
          {/* Performance Analytics Dashboard */}
          <s-card padding="base">
            <s-heading>Storefront Performance Analytics</s-heading>
            <s-box paddingBlockStart="base" paddingBlockEnd="base">
              <s-stack direction="inline" gap="base" wrap="true" style={{ marginTop: '8px' }}>
                <s-box style={{ flex: 1, minWidth: '160px', background: '#f6f6f7', padding: '16px', borderRadius: '8px', border: '1px solid #e1e3e5' }}>
                  <s-heading size="small">Total Impressions</s-heading>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: '#2c3e50', fontFamily: 'monospace' }}>
                    {analytics.impressions.toLocaleString()}
                  </div>
                  <p style={{ fontSize: '11px', color: '#6d7175', marginTop: '4px', marginBlockEnd: 0 }}>Views of the shipping bar</p>
                </s-box>
                
                <s-box style={{ flex: 1, minWidth: '160px', background: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #b7e1cd' }}>
                  <s-heading size="small">Thresholds Achieved</s-heading>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: '#14532d', fontFamily: 'monospace' }}>
                    {analytics.conversions.toLocaleString()}
                  </div>
                  <p style={{ fontSize: '11px', color: '#14532d', opacity: 0.8, marginTop: '4px', marginBlockEnd: 0 }}>Free shipping unlocked</p>
                </s-box>

                <s-box style={{ flex: 1, minWidth: '160px', background: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <s-heading size="small">Conversion Rate</s-heading>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: '#1e40af', fontFamily: 'monospace' }}>
                    {analytics.conversionRate.toFixed(2)}%
                  </div>
                  <p style={{ fontSize: '11px', color: '#1e40af', opacity: 0.8, marginTop: '4px', marginBlockEnd: 0 }}>Impression to unlock ratio</p>
                </s-box>

                <s-box style={{ flex: 1, minWidth: '160px', background: '#fdf2f8', padding: '16px', borderRadius: '8px', border: '1px solid #fbcfe8' }}>
                  <s-heading size="small">Total Qualified Cart Value</s-heading>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: '#9d174d', fontFamily: 'monospace' }}>
                    ${analytics.convertedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p style={{ fontSize: '11px', color: '#9d174d', opacity: 0.8, marginTop: '4px', marginBlockEnd: 0 }}>Accumulated qualified total</p>
                </s-box>
              </s-stack>
            </s-box>
          </s-card>

          <s-card padding="base">
            <s-heading>General settings</s-heading>
            <s-box paddingBlockStart="base">
              <s-stack direction="block" gap="base">
                <s-text-field
                  type="number"
                  label="Free Shipping Threshold ($)"
                  name="threshold"
                  value={threshold.toString()}
                  onInput={(e) => setThreshold(parseInt(e.target.value, 10) || 0)}
                  helpText="Target cart total in dollars to qualify for free shipping."
                ></s-text-field>

                <s-text-field
                  label="Message: Away from Threshold"
                  name="text_away"
                  value={textAway}
                  onInput={(e) => setTextAway(e.target.value)}
                  helpText="Use [amount] to dynamically show the remaining money."
                ></s-text-field>

                <s-text-field
                  label="Message: Qualified"
                  name="text_qualified"
                  value={textQualified}
                  onInput={(e) => setTextQualified(e.target.value)}
                ></s-text-field>
              </s-stack>
            </s-box>
          </s-card>

          <s-card padding="base">
            <s-heading>Style & Colors</s-heading>
            <s-box paddingBlockStart="base">
              <style>{`
                .nc-preset-btn {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  padding: 6px 12px;
                  border: 1px solid #c9cccf;
                  border-radius: 20px;
                  background: #ffffff;
                  cursor: pointer;
                  font-size: 0.85rem;
                  font-weight: 500;
                  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                  transition: all 0.15s ease;
                }
                .nc-preset-btn:hover {
                  border-color: #8c9196;
                  background: #f6f6f7;
                }
                .nc-color-input-swatch {
                  -webkit-appearance: none;
                  -moz-appearance: none;
                  appearance: none;
                  border: 1px solid #c9cccf;
                  border-radius: 8px;
                  width: 36px;
                  height: 36px;
                  cursor: pointer;
                  padding: 0;
                  overflow: hidden;
                  background: none;
                  flex-shrink: 0;
                  margin-bottom: 2px;
                }
                .nc-color-input-swatch::-webkit-color-swatch-wrapper {
                  padding: 0;
                }
                .nc-color-input-swatch::-webkit-color-swatch {
                  border: none;
                  border-radius: 6px;
                }
                .nc-color-input-swatch::-moz-color-swatch {
                  border: none;
                  border-radius: 6px;
                }
              `}</style>
              
              <s-stack direction="block" gap="base">
                
                {/* One-click design templates */}
                <s-box paddingBlockEnd="base" style={{ borderBottom: '1px solid #f1f1f1' }}>
                  <s-heading size="small">One-Click Design Templates</s-heading>
                  <s-paragraph>Instantly configure all tracker colors with high-converting presets:</s-paragraph>
                  <s-stack direction="inline" gap="small" wrap="true" style={{ marginTop: '8px' }}>
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        className="nc-preset-btn"
                        onClick={() => applyPreset(preset)}
                      >
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: preset.use_gradient 
                              ? `linear-gradient(135deg, ${preset.bar_color}, ${preset.bar_color_end})`
                              : preset.bar_color,
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        />
                        {preset.name}
                      </button>
                    ))}
                  </s-stack>
                </s-box>
                
                {/* Premium Typography & Alignment */}
                <s-stack direction="inline" gap="base">
                  <s-select
                    label="Font Family"
                    name="font_family"
                    value={fontFamily}
                    onInput={(e) => setFontFamily(e.target.value)}
                  >
                    <s-option value="system">System Default</s-option>
                    <s-option value="Inter">Inter (Clean Sans)</s-option>
                    <s-option value="Outfit">Outfit (Modern Sans)</s-option>
                    <s-option value="Playfair Display">Playfair Display (Elegant Serif)</s-option>
                  </s-select>

                  <s-select
                    label="Text Alignment"
                    name="text_alignment"
                    value={textAlignment}
                    onInput={(e) => setTextAlignment(e.target.value)}
                  >
                    <s-option value="left">Left</s-option>
                    <s-option value="center">Center</s-option>
                    <s-option value="right">Right</s-option>
                  </s-select>
                </s-stack>

                {/* Premium Thickness & Corner Radius */}
                <s-stack direction="inline" gap="base">
                  <s-select
                    label="Bar Thickness"
                    name="bar_thickness"
                    value={barThickness}
                    onInput={(e) => setBarThickness(e.target.value)}
                  >
                    <s-option value="Thin">Thin (6px)</s-option>
                    <s-option value="Standard">Standard (10px)</s-option>
                    <s-option value="Chunky">Chunky (16px)</s-option>
                  </s-select>

                  <s-select
                    label="Border Radius"
                    name="border_radius"
                    value={borderRadius}
                    onInput={(e) => setBorderRadius(e.target.value)}
                  >
                    <s-option value="Sharp">Sharp (0px)</s-option>
                    <s-option value="Rounded">Rounded (12px)</s-option>
                    <s-option value="Pill">Pill (999px)</s-option>
                  </s-select>
                </s-stack>

                {/* Layout Position & Shadow Style */}
                <s-stack direction="inline" gap="base">
                  <s-select
                    label="Layout Position"
                    name="layout_style"
                    value={layoutStyle}
                    onInput={(e) => setLayoutStyle(e.target.value)}
                  >
                    <s-option value="inline">Inline (Standard)</s-option>
                    <s-option value="floating-bottom-right">Floating Bottom-Right</s-option>
                    <s-option value="floating-bottom-left">Floating Bottom-Left</s-option>
                    <s-option value="sticky-top">Sticky Top Banner</s-option>
                    <s-option value="sticky-bottom">Sticky Bottom Banner</s-option>
                  </s-select>

                  <s-select
                    label="Shadow Style"
                    name="shadow_style"
                    value={shadowStyle}
                    onInput={(e) => setShadowStyle(e.target.value)}
                  >
                    <s-option value="None">None</s-option>
                    <s-option value="Soft">Soft</s-option>
                    <s-option value="Deep">Deep</s-option>
                    <s-option value="Glow">Glow</s-option>
                  </s-select>
                </s-stack>

                {/* Glassmorphism Effect */}
                <s-choice-list
                  label="Glassmorphism Effect"
                  value={glassmorphism ? "true" : "false"}
                  onInput={(e) => setGlassmorphism(e.target.value === "true")}
                >
                  <s-choice value="true">Enabled (Frosted look)</s-choice>
                  <s-choice value="false">Disabled (Solid look)</s-choice>
                </s-choice-list>

                {/* Progress Bar Style */}
                <s-choice-list
                  label="Progress Bar Fill Style"
                  value={useGradient ? "true" : "false"}
                  onInput={(e) => setUseGradient(e.target.value === "true")}
                >
                  <s-choice value="true">Gradient Fill</s-choice>
                  <s-choice value="false">Solid Fill</s-choice>
                </s-choice-list>

                <s-stack direction="inline" gap="base">
                  <s-stack direction="inline" gap="small" style={{ alignItems: 'end', flex: 1 }}>
                    <s-text-field
                      label={useGradient ? "Bar Color (Start)" : "Bar Color"}
                      name="bar_color"
                      value={barColor}
                      onInput={(e) => setBarColor(e.target.value)}
                      style={{ flex: 1 }}
                    ></s-text-field>
                    <input
                      type="color"
                      value={barColor}
                      onInput={(e) => setBarColor(e.target.value)}
                      className="nc-color-input-swatch"
                    />
                  </s-stack>

                  {useGradient && (
                    <s-stack direction="inline" gap="small" style={{ alignItems: 'end', flex: 1 }}>
                      <s-text-field
                        label="Bar Color (End)"
                        name="bar_color_end"
                        value={barColorEnd}
                        onInput={(e) => setBarColorEnd(e.target.value)}
                        style={{ flex: 1 }}
                      ></s-text-field>
                      <input
                        type="color"
                        value={barColorEnd}
                        onInput={(e) => setBarColorEnd(e.target.value)}
                        className="nc-color-input-swatch"
                      />
                    </s-stack>
                  )}
                </s-stack>

                <s-stack direction="inline" gap="base">
                  <s-stack direction="inline" gap="small" style={{ alignItems: 'end', flex: 1 }}>
                    <s-text-field
                      label="Progress Track Background"
                      name="bar_background"
                      value={barBackground}
                      onInput={(e) => setBarBackground(e.target.value)}
                      style={{ flex: 1 }}
                    ></s-text-field>
                    <input
                      type="color"
                      value={barBackground}
                      onInput={(e) => setBarBackground(e.target.value)}
                      className="nc-color-input-swatch"
                    />
                  </s-stack>

                  <s-stack direction="inline" gap="small" style={{ alignItems: 'end', flex: 1 }}>
                    <s-text-field
                      label="Box Background"
                      name="tracker_bg"
                      value={trackerBg}
                      onInput={(e) => setTrackerBg(e.target.value)}
                      style={{ flex: 1 }}
                    ></s-text-field>
                    <input
                      type="color"
                      value={trackerBg}
                      onInput={(e) => setTrackerBg(e.target.value)}
                      className="nc-color-input-swatch"
                    />
                  </s-stack>

                  <s-stack direction="inline" gap="small" style={{ alignItems: 'end', flex: 1 }}>
                    <s-text-field
                      label="Text Color"
                      name="text_color"
                      value={textColor}
                      onInput={(e) => setTextColor(e.target.value)}
                      style={{ flex: 1 }}
                    ></s-text-field>
                    <input
                      type="color"
                      value={textColor}
                      onInput={(e) => setTextColor(e.target.value)}
                      className="nc-color-input-swatch"
                    />
                  </s-stack>
                </s-stack>
              </s-stack>
            </s-box>
          </s-card>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Theme Extension Integration">
        <s-paragraph>
          To display this tracker on your storefront, add it to your theme inside the Shopify Theme Editor:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            Open <strong>Online Store &rarr; Themes &rarr; Customize</strong>.
          </s-list-item>
          <s-list-item>
            Navigate to the Product page or Cart page templates.
          </s-list-item>
          <s-list-item>
            Click <strong>Add Block / Add Section</strong>, select <strong>Apps</strong>, and select <strong>Free Shipping Tracker</strong>.
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
