import PropTypes from "prop-types";

export default function Logo({ size = 32, showText = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <img
        src="/math-chaosLogo.svg"
        alt="Math Chaos logo"
        width={size}
        height={size}
        style={{ display: "block" }}
      />
      {showText && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: `${size * 0.6}px`,
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          Math Chaos
        </span>
      )}
    </div>
  );
}

Logo.propTypes = {
  size: PropTypes.number,
  showText: PropTypes.bool,
};
