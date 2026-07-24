/* @ds-bundle: {"format":4,"namespace":"ZanvieDesignSystem_c2a0a9","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Tag","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Divider","sourcePath":"components/core/Divider.jsx"},{"name":"SectionLabel","sourcePath":"components/core/Divider.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"978ba85082c9","components/core/Button.jsx":"da38161518aa","components/core/Card.jsx":"437d57d850f6","components/core/Divider.jsx":"1a6cf6316b86","components/feedback/Dialog.jsx":"9c0902022b2e","components/forms/Checkbox.jsx":"72fc577e2c8c","components/forms/Input.jsx":"2e8e6d586b8a","components/forms/Radio.jsx":"4348b75b23b1","components/forms/Select.jsx":"d203706cb68f","components/forms/Switch.jsx":"1c9ff399c32d","components/navigation/Tabs.jsx":"9659cae1c488","ui_kits/landing-page/ClosingCTA.jsx":"17c8810249df","ui_kits/landing-page/Hero.jsx":"1754a9216a28","ui_kits/landing-page/MythTruthBlock.jsx":"ea52d9051c1b","ui_kits/landing-page/Proof.jsx":"7a548bb500f7","ui_kits/landing-page/Services.jsx":"6d38c362143f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ZanvieDesignSystem_c2a0a9 = window.ZanvieDesignSystem_c2a0a9 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
/**
 * Small pill status/category label. Solid fill, high-contrast text.
 */
function Badge({
  children,
  tone = "purple"
}) {
  const tones = {
    purple: {
      background: "var(--purple-500)",
      color: "#fff"
    },
    orange: {
      background: "var(--orange-500)",
      color: "#fff"
    },
    dark: {
      background: "var(--black-900)",
      color: "#fff"
    },
    light: {
      background: "var(--stone-200)",
      color: "var(--black-900)"
    }
  };
  return React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontFamily: "var(--font-label)",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "5px 12px",
      borderRadius: "var(--radius-pill)",
      ...tones[tone]
    }
  }, children);
}

/**
 * Outlined tag/chip — used for filters, categories, low-emphasis labels.
 */
function Tag({
  children,
  active = false
}) {
  return React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      fontWeight: 500,
      padding: "7px 14px",
      borderRadius: "var(--radius-pill)",
      border: active ? "1px solid var(--purple-500)" : "1px solid var(--border-on-light)",
      color: active ? "var(--purple-500)" : "var(--text-on-light-secondary)",
      background: active ? "var(--purple-100)" : "transparent"
    }
  }, children);
}
Object.assign(__ds_scope, { Badge, Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  style
}) {
  const sizes = {
    sm: {
      padding: "10px 18px",
      fontSize: 13
    },
    md: {
      padding: "14px 26px",
      fontSize: 15
    },
    lg: {
      padding: "17px 34px",
      fontSize: 16
    }
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    borderRadius: "var(--radius-pill)",
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
    ...sizes[size],
    ...style
  };
  const variants = {
    primary: {
      background: "var(--action-primary-bg)",
      color: "var(--action-primary-text)",
      boxShadow: "var(--shadow-sm)"
    },
    secondary: {
      background: "var(--action-secondary-bg)",
      color: "var(--action-secondary-text)",
      border: "1px solid var(--action-secondary-border)"
    },
    whatsapp: {
      background: "var(--action-whatsapp-bg)",
      color: "var(--action-whatsapp-text)",
      boxShadow: "var(--shadow-md)"
    },
    ghost: {
      background: "transparent",
      color: "var(--purple-500)"
    },
    glass: {
      background: "linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08))",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.55)",
      backdropFilter: "blur(var(--blur-glass)) saturate(160%)",
      WebkitBackdropFilter: "blur(var(--blur-glass)) saturate(160%)",
      boxShadow: "0 8px 24px rgba(10,10,11,0.28), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -6px 12px rgba(255,255,255,0.08)"
    }
  };
  return React.createElement("button", {
    disabled,
    onClick,
    style: {
      ...base,
      ...variants[variant]
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.97)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({
  children,
  surface = "dark",
  style
}) {
  const surfaces = {
    dark: {
      background: "var(--surface-glass-on-dark)",
      border: "1px solid var(--surface-glass-border-dark)",
      color: "var(--text-on-dark-primary)"
    },
    light: {
      background: "var(--surface-glass-on-light)",
      border: "1px solid var(--surface-glass-border-light)",
      color: "var(--text-on-light-primary)"
    }
  };
  return React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-6)",
      backdropFilter: "blur(var(--blur-glass))",
      WebkitBackdropFilter: "blur(var(--blur-glass))",
      boxShadow: "var(--shadow-md)",
      fontFamily: "var(--font-body)",
      boxSizing: "border-box",
      ...surfaces[surface],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Divider.jsx
try { (() => {
/**
 * Thin vertical accent bar beside a text block — the brand's signature layout device.
 */
function Divider({
  tone = "orange",
  children
}) {
  return React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "stretch",
      gap: "var(--space-5)"
    }
  }, React.createElement("div", {
    style: {
      width: "var(--divider-width)",
      borderRadius: 2,
      background: tone === "orange" ? "var(--divider-orange)" : "var(--divider-purple)",
      flexShrink: 0
    }
  }), React.createElement("div", {
    style: {
      flex: 1
    }
  }, children));
}

/**
 * Small tracked uppercase eyebrow/caption label.
 */
function SectionLabel({
  children,
  tone = "secondary"
}) {
  const colors = {
    secondary: "var(--text-on-dark-secondary)",
    purple: "var(--purple-400)",
    orange: "var(--orange-400)"
  };
  return React.createElement("div", {
    style: {
      fontFamily: "var(--font-label)",
      fontSize: "var(--label-size)",
      fontWeight: "var(--label-weight)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "var(--label-transform)",
      color: colors[tone] || colors.secondary
    }
  }, children);
}
Object.assign(__ds_scope, { Divider, SectionLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Divider.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/**
 * Modal dialog — glass card centered over a dimmed backdrop.
 */
function Dialog({
  open,
  onClose,
  title,
  children
}) {
  if (!open) return null;
  return React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(10,10,11,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100
    },
    onClick: onClose
  }, React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 420,
      maxWidth: "90vw",
      background: "rgba(19,19,21,0.85)",
      border: "1px solid var(--surface-glass-border-dark)",
      backdropFilter: "blur(var(--blur-glass))",
      WebkitBackdropFilter: "blur(var(--blur-glass))",
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-6)",
      boxShadow: "var(--shadow-lg)",
      fontFamily: "var(--font-body)",
      color: "#fff"
    }
  }, title && React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontSize: 24,
      marginBottom: 16
    }
  }, title), children));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/**
 * Custom checkbox — square, rounded, purple fill when checked.
 */
function Checkbox({
  checked,
  onChange,
  label
}) {
  return React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      fontSize: "var(--ui-size)",
      color: "var(--text-on-light-primary)"
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked,
    onChange,
    style: {
      display: "none"
    }
  }), React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "var(--radius-sm)",
      border: checked ? "none" : "1px solid var(--border-on-light)",
      background: checked ? "var(--purple-500)" : "transparent",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background var(--duration-fast) var(--ease-standard)",
      flexShrink: 0
    }
  }, checked ? React.createElement("span", {
    style: {
      color: "#fff",
      fontSize: 13,
      lineHeight: 1
    }
  }, "✓") : null), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
/**
 * Text input on light or dark surfaces. Minimal chrome — a border, no heavy fill.
 */
function Input({
  placeholder,
  value,
  onChange,
  surface = "light",
  type = "text"
}) {
  const surfaces = {
    light: {
      background: "#fff",
      border: "1px solid var(--border-on-light)",
      color: "var(--text-on-light-primary)"
    },
    dark: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid var(--border-on-dark)",
      color: "var(--text-on-dark-primary)"
    }
  };
  return React.createElement("input", {
    type,
    placeholder,
    value,
    onChange,
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--ui-size)",
      padding: "13px 16px",
      borderRadius: "var(--radius-md)",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
      ...surfaces[surface]
    }
  });
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
/**
 * Custom radio button — circular, purple dot when selected.
 */
function Radio({
  checked,
  onChange,
  label,
  name
}) {
  return React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      fontSize: "var(--ui-size)",
      color: "var(--text-on-light-primary)"
    }
  }, React.createElement("input", {
    type: "radio",
    name,
    checked,
    onChange,
    style: {
      display: "none"
    }
  }), React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      border: "1px solid " + (checked ? "var(--purple-500)" : "var(--border-on-light)"),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, checked ? React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "var(--purple-500)"
    }
  }) : null), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
/**
 * Native-backed select with brand chrome — matches Input styling.
 */
function Select({
  options = [],
  value,
  onChange,
  surface = "light"
}) {
  const surfaces = {
    light: {
      background: "#fff",
      border: "1px solid var(--border-on-light)",
      color: "var(--text-on-light-primary)"
    },
    dark: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid var(--border-on-dark)",
      color: "var(--text-on-dark-primary)"
    }
  };
  return React.createElement("select", {
    value,
    onChange,
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--ui-size)",
      padding: "13px 16px",
      borderRadius: "var(--radius-md)",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
      ...surfaces[surface]
    }
  }, options.map(o => React.createElement("option", {
    key: o,
    value: o
  }, o)));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/**
 * Toggle switch — pill track, orange when on.
 */
function Switch({
  checked,
  onChange
}) {
  return React.createElement("button", {
    onClick: onChange,
    style: {
      width: 44,
      height: 26,
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--orange-500)" : "var(--stone-400)",
      border: "none",
      position: "relative",
      cursor: "pointer",
      transition: "background var(--duration-fast) var(--ease-standard)",
      padding: 3,
      boxSizing: "border-box"
    }
  }, React.createElement("span", {
    style: {
      display: "block",
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "#fff",
      transform: checked ? "translateX(18px)" : "translateX(0)",
      transition: "transform var(--duration-fast) var(--ease-standard)",
      boxShadow: "var(--shadow-sm)"
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
const {
  useState
} = React;
function Tabs({
  items = [],
  defaultActive = 0,
  onChange,
  surface = "light"
}) {
  const [active, setActive] = useState(defaultActive);
  const select = i => {
    setActive(i);
    onChange && onChange(i);
  };
  const isDark = surface === "dark";
  return React.createElement("div", {
    style: {
      display: "inline-flex",
      gap: 4,
      padding: 4,
      borderRadius: "var(--radius-pill)",
      background: isDark ? "rgba(255,255,255,0.06)" : "var(--stone-100)",
      border: isDark ? "1px solid var(--border-on-dark)" : "1px solid var(--border-on-light)"
    }
  }, items.map((item, i) => React.createElement("button", {
    key: item,
    onClick: () => select(i),
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 14,
      fontWeight: 600,
      padding: "9px 20px",
      borderRadius: "var(--radius-pill)",
      border: "none",
      cursor: "pointer",
      background: active === i ? "var(--purple-500)" : "transparent",
      color: active === i ? "#fff" : isDark ? "var(--text-on-dark-secondary)" : "var(--text-on-light-secondary)",
      transition: "background var(--duration-fast) var(--ease-standard)"
    }
  }, item)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing-page/ClosingCTA.jsx
try { (() => {
const {
  Button,
  Card
} = window.ZanvieDesignSystem_c2a0a9;

/* Estilo 1 — editorial closing CTA, photo tone (coffee/terracotta),
   bookending the page against the Hero. Liquid-glass button variant shown
   here over the photo background. */
function ClosingCTA() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      padding: "clamp(80px, 12vw, 160px) clamp(24px, 6vw, 96px)",
      background: "linear-gradient(rgba(10,8,6,.55), rgba(10,8,6,.75)), linear-gradient(120deg, #8a5a3d 0%, #5c3a26 55%, #2a1a10 100%)",
      color: "#fff",
      fontFamily: "var(--font-body)",
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    surface: "dark",
    style: {
      maxWidth: 560,
      textAlign: "center",
      padding: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--display-lg-weight)",
      fontSize: "var(--display-lg-size)",
      marginBottom: 20
    }
  }, "Vamos conversar sobre", " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--orange-400)"
    }
  }, "estrat\xE9gia"), "?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 16,
      color: "rgba(255,255,255,0.7)",
      marginBottom: 32
    }
  }, "Sem compromisso. Conte um pouco sobre seu neg\xF3cio e a gente te chama no WhatsApp."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "whatsapp",
    size: "lg"
  }, "Falar no WhatsApp"), /*#__PURE__*/React.createElement(Button, {
    variant: "glass",
    size: "lg"
  }, "Ver cases"))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--black-900)",
      color: "rgba(255,255,255,0.5)",
      padding: "40px clamp(24px, 6vw, 96px)",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/zanvie-logo.png",
    alt: "Zanvie",
    style: {
      height: 26,
      opacity: 0.7
    }
  }), /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Zanvie Publicidade e Tr\xE1fego Pago"));
}
window.ClosingCTA = ClosingCTA;
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing-page/ClosingCTA.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing-page/Hero.jsx
try { (() => {
const {
  SectionLabel,
  Button
} = window.ZanvieDesignSystem_c2a0a9;

/* Estilo 1 — editorial photo, opening/hero. Placeholder for real Zanvie
   photography — warm wood/plant/marble toned gradient stands in for a
   full-bleed editorial photo until real brand imagery is supplied. */
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      minHeight: "92vh",
      display: "flex",
      alignItems: "center",
      padding: "0 clamp(24px, 6vw, 96px)",
      boxSizing: "border-box",
      background: "linear-gradient(rgba(10,8,6,.5), rgba(10,8,6,.72)), linear-gradient(120deg, #6b533d 0%, #4a3826 45%, #241a12 100%)",
      color: "#fff",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/zanvie-logo.png",
    alt: "Zanvie",
    style: {
      height: 44,
      marginBottom: 40,
      opacity: 0.95
    }
  }), /*#__PURE__*/React.createElement(SectionLabel, {
    tone: "orange"
  }, "Publicidade & Tr\xE1fego Pago"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--display-xl-weight)",
      fontSize: "var(--display-xl-size)",
      lineHeight: "var(--display-xl-line)",
      margin: "18px 0 28px"
    }
  }, "Presen\xE7a online que vira", " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--orange-400)"
    }
  }, "resultado"), "."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--body-lg-size)",
      lineHeight: "var(--body-lg-line)",
      color: "rgba(255,255,255,0.78)",
      maxWidth: 520,
      marginBottom: 40
    }
  }, "Gest\xE3o de tr\xE1fego pago, landing pages e conte\xFAdo estrat\xE9gico para pequenas e m\xE9dias empresas que querem comunicar com prop\xF3sito \u2014 n\xE3o apenas postar por postar."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "whatsapp"
  }, "Falar no WhatsApp"), /*#__PURE__*/React.createElement(Button, {
    variant: "glass"
  }, "Ver proposta"))));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing-page/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing-page/MythTruthBlock.jsx
try { (() => {
/* Estilo 2 — bold graphic, solid black + subtle grain, myth vs. truth pattern. */
function MythTruthBlock() {
  const pairs = [{
    myth: "postar todo dia gera vendas",
    truth: "estratégia gera vendas"
  }, {
    myth: "mais seguidores é mais lucro",
    truth: "público certo é mais lucro"
  }, {
    myth: "anúncio bonito converte",
    truth: "anúncio certeiro converte"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      background: "var(--black-900)",
      padding: "clamp(64px, 10vw, 140px) clamp(24px, 6vw, 96px)",
      overflow: "hidden",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0.35,
      backgroundImage: "radial-gradient(rgba(255,255,255,.14) 1px, transparent 1px)",
      backgroundSize: "5px 5px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 900
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--shout-xl-weight)",
      fontSize: "var(--shout-xl-size)",
      lineHeight: "var(--shout-xl-line)",
      letterSpacing: "var(--shout-xl-tracking)",
      color: "#fff",
      margin: "0 0 48px"
    }
  }, "PARE DE ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--orange-500)"
    }
  }, "POSTAR"), /*#__PURE__*/React.createElement("br", null), "SEM ESTRAT\xC9GIA."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 28
    }
  }, pairs.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.myth
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 18,
      textDecoration: "line-through",
      color: "rgba(255,255,255,0.4)"
    }
  }, p.myth), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 28,
      color: "#fff",
      marginTop: 4
    }
  }, p.truth))))));
}
window.MythTruthBlock = MythTruthBlock;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing-page/MythTruthBlock.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing-page/Proof.jsx
try { (() => {
/* Estilo 2 — bold graphic, solid black — proof/stats block (inverted from
   white to keep contrast against the Services section before it). */
function Proof() {
  const stats = [{
    value: "3.2x",
    label: "ROAS médio em campanhas ativas"
  }, {
    value: "48h",
    label: "para a primeira landing page no ar"
  }, {
    value: "+120",
    label: "campanhas geridas para PMEs"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "clamp(64px, 10vw, 140px) clamp(24px, 6vw, 96px)",
      background: "var(--black-900)",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--shout-lg-weight)",
      fontSize: "var(--shout-lg-size)",
      letterSpacing: "var(--shout-lg-tracking)",
      lineHeight: "var(--shout-lg-line)",
      color: "#fff",
      margin: "0 0 56px",
      maxWidth: 640
    }
  }, "PROVA ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--orange-500)"
    }
  }, "REAL"), ", N\xC3O PROMESSA."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 40
    }
  }, stats.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 56,
      color: "var(--purple-400)"
    }
  }, s.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 15,
      color: "rgba(255,255,255,0.68)",
      marginTop: 6
    }
  }, s.label)))));
}
window.Proof = Proof;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing-page/Proof.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing-page/Services.jsx
try { (() => {
const {
  Card,
  SectionLabel,
  Divider
} = window.ZanvieDesignSystem_c2a0a9;

/* Estilo 2 — bold graphic, solid white, proof/argument block (converted
   from an earlier photo treatment to raise the bold-graphic share of the
   page, per brand direction). Cards keep the recurring glass/blur recipe
   even on a solid background. */
function Services() {
  const services = [{
    title: "Tráfego Pago",
    copy: "Campanhas de Meta Ads e Google Ads geridas com foco em ROAS, não em vaidade."
  }, {
    title: "Landing Pages",
    copy: "Páginas de conversão pensadas para o objetivo da campanha, não um template genérico."
  }, {
    title: "Conteúdo Estratégico",
    copy: "Redes sociais com propósito — cada post responde a uma estratégia, não a um calendário."
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      padding: "clamp(64px, 10vw, 140px) clamp(24px, 6vw, 96px)",
      background: "#fff",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    tone: "purple"
  }, "O que fazemos"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--shout-lg-weight)",
      fontSize: "var(--shout-lg-size)",
      letterSpacing: "var(--shout-lg-tracking)",
      lineHeight: "var(--shout-lg-line)",
      color: "var(--black-900)",
      margin: "16px 0 56px",
      maxWidth: 680
    }
  }, "TR\xCAS FRENTES, UM OBJETIVO:", " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--purple-500)"
    }
  }, "CRESCIMENTO REAL.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 24
    }
  }, services.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.title,
    surface: "light"
  }, /*#__PURE__*/React.createElement(Divider, {
    tone: "orange"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 20,
      fontWeight: 700,
      marginBottom: 8,
      color: "var(--black-900)"
    }
  }, s.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 15,
      lineHeight: 1.55,
      color: "var(--text-on-light-secondary)"
    }
  }, s.copy))))));
}
window.Services = Services;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing-page/Services.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.SectionLabel = __ds_scope.SectionLabel;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
