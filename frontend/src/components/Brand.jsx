export default function Brand({ className = '', variant = 'default' }) {
  const soloLogo = variant === 'mark';
  const logoCompleto = variant === 'full';
  const source = soloLogo ? '/brand/solologo.svg' : '/brand/crowdstarter.svg';
  const classes = `brand brand-${variant} ${className}`.trim();

  return (
    <span className={classes}>
      <img
        className="brand-logo"
        src={source}
        alt={logoCompleto ? 'CrowdStarter' : ''}
        aria-hidden={logoCompleto ? undefined : 'true'}
      />
      {!soloLogo && !logoCompleto && <span className="brand-name">CrowdStarter</span>}
    </span>
  );
}
