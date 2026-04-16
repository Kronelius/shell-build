import { Link, useNavigate } from 'react-router-dom';

export default function DetailHeader({ backTo, backLabel = 'Back', title, subtitle, badge, actions }) {
  const navigate = useNavigate();
  return (
    <div className="detail-head">
      <div className="detail-head-top">
        {backTo ? (
          <Link to={backTo} className="detail-back">← {backLabel}</Link>
        ) : (
          <button type="button" className="detail-back" onClick={() => navigate(-1)}>← {backLabel}</button>
        )}
      </div>
      <div className="detail-head-body">
        <div className="detail-head-text">
          <div className="detail-head-title-row">
            <h1 className="detail-head-title">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="detail-head-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="detail-head-actions">{actions}</div>}
      </div>
    </div>
  );
}
