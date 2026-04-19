import PropTypes from "prop-types";

/**
 * Shared logo used in every nav bar.
 * Pass an `onClick` to make it navigate home, or omit it on the home screen.
 */
export default function NavLogo({ onClick, className = "nav-logo" }) {
  const content = (
    <>
      <img src="/transparent-logo.png" alt="Math Chaos" />
      <span>Math Chaos</span>
    </>
  );

  if (onClick) {
    return (
      <button
        className={className}
        onClick={onClick}
        aria-label="Go to home page"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          marginLeft: "10px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: "9px", marginLeft: "10px" }}>
      {content}
    </div>
  );
}

NavLogo.propTypes = {
  onClick: PropTypes.func,
  className: PropTypes.string,
};
